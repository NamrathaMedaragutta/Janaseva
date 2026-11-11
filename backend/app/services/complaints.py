"""Complaint domain service: references, serialisation, access scope, lifecycle."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status as http_status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Category,
    Complaint,
    ComplaintHistory,
    ComplaintReferenceCounter,
    ComplaintStatus,
    Department,
    Hospital,
    Role,
    SubmissionChannel,
    User,
)
from app.schemas import (
    CategoryOut,
    ComplaintDetail,
    ComplaintListItem,
    DepartmentOut,
    HistoryOut,
    HospitalOut,
    UserBrief,
)
from app.services.categorisation import suggest_category
from app.services.common import aware, hours_since, now_utc
from app.services.notifications import acknowledge_registration, notify_assignment

ACTIVE_STATUSES = (
    ComplaintStatus.SUBMITTED,
    ComplaintStatus.ACKNOWLEDGED,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.NEEDS_REVIEW,
    ComplaintStatus.REOPENED,
)

ALLOWED_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    ComplaintStatus.SUBMITTED: {ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.ASSIGNED, ComplaintStatus.NEEDS_REVIEW},
    ComplaintStatus.ACKNOWLEDGED: {ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.NEEDS_REVIEW},
    ComplaintStatus.ASSIGNED: {ComplaintStatus.IN_PROGRESS, ComplaintStatus.NEEDS_REVIEW},
    ComplaintStatus.IN_PROGRESS: {ComplaintStatus.RESOLVED, ComplaintStatus.NEEDS_REVIEW},
    ComplaintStatus.NEEDS_REVIEW: {
        ComplaintStatus.ACKNOWLEDGED,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.IN_PROGRESS,
    },
    ComplaintStatus.RESOLVED: {ComplaintStatus.CLOSED, ComplaintStatus.REOPENED},
    ComplaintStatus.CLOSED: {ComplaintStatus.REOPENED},
    ComplaintStatus.REOPENED: {ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED},
}

OFFICER_ALLOWED_STATUSES = {
    ComplaintStatus.ACKNOWLEDGED,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.NEEDS_REVIEW,
}


# ------------------------------------------------------------------ serialising
def category_out(category: Category) -> CategoryOut:
    return CategoryOut.model_validate(category)


def department_out(department: Department | None, officer_count: int = 0) -> DepartmentOut | None:
    if department is None:
        return None
    data = DepartmentOut.model_validate(department)
    data.officer_count = officer_count
    return data


def hospital_out(hospital: Hospital) -> HospitalOut:
    return HospitalOut.model_validate(hospital)


def user_brief(user: User | None) -> UserBrief | None:
    if user is None:
        return None
    return UserBrief(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        hospital_id=user.hospital_id,
        hospital_name=user.hospital.name if user.hospital else None,
    )


def is_overdue(complaint: Complaint) -> bool:
    if complaint.status not in ACTIVE_STATUSES:
        return False
    hospital = complaint.hospital
    threshold = hospital.followup_hours if hospital else 48
    return hours_since(complaint.created_at) > threshold


def list_item(complaint: Complaint) -> ComplaintListItem:
    preview = complaint.description_original.strip().replace("\n", " ")
    return ComplaintListItem(
        reference_id=complaint.reference_id,
        status=complaint.status,
        submission_channel=complaint.submission_channel,
        language_code=complaint.language_code,
        created_at=aware(complaint.created_at),
        updated_at=aware(complaint.updated_at),
        category=category_out(complaint.category),
        department=department_out(complaint.department),
        assigned_officer_name=complaint.assigned_officer.full_name if complaint.assigned_officer else None,
        assigned_officer_id=complaint.assigned_officer_id,
        is_overdue=is_overdue(complaint),
        age_hours=hours_since(complaint.created_at),
        description_preview=preview[:180] + ("…" if len(preview) > 180 else ""),
    )


def detail_out(complaint: Complaint) -> ComplaintDetail:
    return ComplaintDetail(
        id=complaint.id,
        reference_id=complaint.reference_id,
        status=complaint.status,
        submission_channel=complaint.submission_channel,
        language_code=complaint.language_code,
        description_original=complaint.description_original,
        description_translated=complaint.description_translated,
        translation_provider=complaint.translation_provider,
        created_at=aware(complaint.created_at),
        updated_at=aware(complaint.updated_at),
        acknowledged_at=aware(complaint.acknowledged_at),
        resolved_at=aware(complaint.resolved_at),
        closed_at=aware(complaint.closed_at),
        hospital=hospital_out(complaint.hospital),
        department=department_out(complaint.department),
        category=category_out(complaint.category),
        complainant_name=complaint.complainant_name,
        contact_number=complaint.contact_number,
        consent_to_contact=complaint.consent_to_contact,
        assigned_officer=user_brief(complaint.assigned_officer),
        created_by_name=complaint.created_by.full_name if complaint.created_by else None,
        resolution_summary=complaint.resolution_summary,
        category_confidence=complaint.category_confidence,
        is_overdue=is_overdue(complaint),
        age_hours=hours_since(complaint.created_at),
        history=[
            HistoryOut(
                id=entry.id,
                old_status=entry.old_status,
                new_status=entry.new_status,
                event_type=entry.event_type,
                action_note=entry.action_note,
                updated_by_name=entry.updated_by_name,
                created_at=aware(entry.created_at),
            )
            for entry in complaint.history
        ],
    )


# ------------------------------------------------------------------ access scope
def scope_query(query, user: User):
    """Restrict a Complaint query to what the signed-in staff member may see."""
    if user.role == Role.ADMIN:
        return query.where(Complaint.hospital_id == user.hospital_id)
    if user.role == Role.OFFICER:
        conditions = [Complaint.assigned_officer_id == user.id]
        if user.department_id:
            conditions.append(Complaint.department_id == user.department_id)
        return query.where(Complaint.hospital_id == user.hospital_id, *[conditions[0] | conditions[1]])
    # Registration operators may only see their own registrations.
    return query.where(Complaint.created_by_id == user.id)


def can_access(complaint: Complaint, user: User) -> bool:
    if user.role == Role.ADMIN:
        return complaint.hospital_id == user.hospital_id
    if user.role == Role.OFFICER:
        if complaint.hospital_id != user.hospital_id:
            return False
        return complaint.assigned_officer_id == user.id or (
            user.department_id is not None and complaint.department_id == user.department_id
        )
    return complaint.created_by_id == user.id


def get_accessible_complaint(db: Session, reference_id: str, user: User) -> Complaint:
    complaint = db.scalar(select(Complaint).where(Complaint.reference_id == reference_id.upper()))
    if complaint is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    if not can_access(complaint, user):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="This complaint is outside your permitted scope.",
        )
    return complaint


# ------------------------------------------------------------------ reference ids
def generate_reference(db: Session, hospital: Hospital) -> str:
    year = now_utc().year
    counter = db.scalar(
        select(ComplaintReferenceCounter)
        .where(ComplaintReferenceCounter.hospital_id == hospital.id, ComplaintReferenceCounter.year == year)
        .with_for_update()
    )
    if counter is None:
        counter = ComplaintReferenceCounter(hospital_id=hospital.id, year=year, last_value=0)
        db.add(counter)
        db.flush()
    counter.last_value += 1
    db.flush()
    return f"JNS-{hospital.code}-{year}-{counter.last_value:05d}"


# ------------------------------------------------------------------ creation
def create_complaint(
    db: Session,
    *,
    hospital_id: str,
    category_id: str,
    description: str,
    language_code: str,
    submission_channel: SubmissionChannel,
    complainant_name: str | None = None,
    contact_number: str | None = None,
    consent_to_contact: bool = False,
    department_id: str | None = None,
    created_by: User | None = None,
    description_translated: str | None = None,
    category_confidence: float | None = None,
    transcript_confidence: float | None = None,
) -> Complaint:
    hospital = db.get(Hospital, hospital_id)
    if hospital is None or not hospital.is_active:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Selected hospital is not available.")

    category = db.get(Category, category_id)
    if category is None or not category.is_active:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Selected category is not available.")

    department = None
    if department_id:
        department = db.get(Department, department_id)
        if department is None or department.hospital_id != hospital.id:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Selected department is invalid.")
    elif category.default_department_id:
        default_department = db.get(Department, category.default_department_id)
        if default_department and default_department.hospital_id == hospital.id and default_department.is_active:
            department = default_department

    suggestion = suggest_category(db, description)
    review_needed = category.slug == "other" or (suggestion.category is not None and suggestion.needs_review)

    def build(reference_id: str) -> Complaint:
        return Complaint(
            reference_id=reference_id,
            hospital_id=hospital.id,
            category_id=category.id,
            department_id=department.id if department else None,
            description_original=description.strip(),
            description_translated=description_translated,
            language_code=language_code,
            submission_channel=submission_channel,
            status=ComplaintStatus.NEEDS_REVIEW if review_needed else ComplaintStatus.SUBMITTED,
            complainant_name=(complainant_name or "").strip() or None,
            contact_number=contact_number,
            consent_to_contact=bool(consent_to_contact and contact_number),
            created_by_id=created_by.id if created_by else None,
            category_confidence=category_confidence if category_confidence is not None else suggestion.confidence,
            suggested_category_id=suggestion.category.id if suggestion.category else None,
            is_flagged=review_needed,
        )

    complaint = build(generate_reference(db, hospital))
    db.add(complaint)
    try:
        db.flush()
    except IntegrityError:
        # Reference collision under concurrent load: fall back to an unguessable suffix.
        db.rollback()
        hospital = db.get(Hospital, hospital_id)
        category = db.get(Category, category_id)
        if department is not None:
            department = db.get(Department, department.id)
        fallback = f"JNS-{hospital.code}-{now_utc().year}-{uuid.uuid4().hex[:6].upper()}"
        complaint = build(fallback)
        db.add(complaint)
        db.flush()

    db.add(
        ComplaintHistory(
            complaint_id=complaint.id,
            old_status=None,
            new_status=complaint.status,
            event_type="created",
            action_note=(
                "Complaint registered"
                + (f" by {created_by.full_name}" if created_by else " by citizen")
                + f" via {submission_channel.value} channel."
            ),
            updated_by_id=created_by.id if created_by else None,
            updated_by_name=created_by.full_name if created_by else "Citizen",
            is_public=True,
        )
    )

    if transcript_confidence is not None:
        db.add(
            ComplaintHistory(
                complaint_id=complaint.id,
                old_status=complaint.status,
                new_status=complaint.status,
                event_type="voice_transcript",
                action_note=f"Voice transcript captured with confidence {transcript_confidence:.2f}.",
                updated_by_name="IVR",
                is_public=False,
            )
        )

    acknowledge_registration(db, complaint, language_code)
    db.commit()
    db.refresh(complaint)
    return complaint


# ------------------------------------------------------------------ lifecycle
def apply_status_change(
    db: Session,
    complaint: Complaint,
    *,
    new_status: ComplaintStatus,
    actor: User,
    note: str | None,
    resolution_summary: str | None,
    is_public: bool = True,
) -> Complaint:
    if actor.role == Role.OPERATOR:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Registration operators cannot change status.")
    if actor.role == Role.OFFICER and new_status not in OFFICER_ALLOWED_STATUSES:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Officers may acknowledge, progress, submit resolution updates or flag for review. Closure is performed by an administrator.",
        )

    allowed = ALLOWED_TRANSITIONS.get(complaint.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot move a complaint from '{complaint.status.value}' to '{new_status.value}'. "
                f"Allowed next states: {', '.join(sorted(s.value for s in allowed)) or 'none'}."
            ),
        )
    if new_status == ComplaintStatus.RESOLVED and not (resolution_summary or note):
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Record the action taken / resolution details before marking a complaint resolved.",
        )
    if new_status in {ComplaintStatus.CLOSED, ComplaintStatus.RESOLVED} and not complaint.department_id:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Assign a responsible department before closing the complaint.",
        )

    old_status = complaint.status
    complaint.status = new_status
    complaint.updated_at = now_utc()
    if new_status == ComplaintStatus.ACKNOWLEDGED and complaint.acknowledged_at is None:
        complaint.acknowledged_at = now_utc()
    if new_status == ComplaintStatus.RESOLVED:
        complaint.resolved_at = now_utc()
        complaint.resolution_summary = resolution_summary or note
    if new_status == ComplaintStatus.CLOSED:
        complaint.closed_at = now_utc()
        if resolution_summary and not complaint.resolution_summary:
            complaint.resolution_summary = resolution_summary
    if new_status == ComplaintStatus.REOPENED:
        complaint.resolved_at = None
        complaint.closed_at = None

    db.add(
        ComplaintHistory(
            complaint_id=complaint.id,
            old_status=old_status,
            new_status=new_status,
            event_type="status_change",
            action_note=note or resolution_summary,
            updated_by_id=actor.id,
            updated_by_name=actor.full_name,
            is_public=is_public,
        )
    )
    db.commit()
    db.refresh(complaint)
    return complaint


def assign_officer(
    db: Session, complaint: Complaint, *, officer: User | None, actor: User, note: str | None = None
) -> Complaint:
    if actor.role != Role.ADMIN:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only administrators can assign complaints.")

    old_officer = complaint.assigned_officer
    old_status = complaint.status

    if officer is None:
        complaint.assigned_officer_id = None
        action = "assignment_removed"
        message = f"Assignment removed by {actor.full_name}." + (f" {note}" if note else "")
    else:
        if officer.role != Role.OFFICER or not officer.is_active:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Select an active department officer.")
        if officer.hospital_id != complaint.hospital_id:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Officer belongs to another hospital.")
        complaint.assigned_officer_id = officer.id
        if officer.department_id:
            complaint.department_id = officer.department_id
        if complaint.status in {ComplaintStatus.SUBMITTED, ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.NEEDS_REVIEW}:
            complaint.status = ComplaintStatus.ASSIGNED
            if complaint.acknowledged_at is None:
                complaint.acknowledged_at = now_utc()
        action = "reassigned" if old_officer else "assigned"
        message = f"Assigned to {officer.full_name} by {actor.full_name}." + (f" {note}" if note else "")
        notify_assignment(db, complaint, officer, actor)

    complaint.updated_at = now_utc()
    db.add(
        ComplaintHistory(
            complaint_id=complaint.id,
            old_status=old_status,
            new_status=complaint.status,
            event_type=action,
            action_note=message,
            updated_by_id=actor.id,
            updated_by_name=actor.full_name,
            is_public=False,
        )
    )
    db.commit()
    db.refresh(complaint)
    return complaint


def add_note(db: Session, complaint: Complaint, *, actor: User, note: str, is_public: bool) -> Complaint:
    db.add(
        ComplaintHistory(
            complaint_id=complaint.id,
            old_status=complaint.status,
            new_status=complaint.status,
            event_type="note",
            action_note=note,
            updated_by_id=actor.id,
            updated_by_name=actor.full_name,
            is_public=is_public,
        )
    )
    complaint.updated_at = now_utc()
    db.commit()
    db.refresh(complaint)
    return complaint


def count_by(db: Session, column, base_filter) -> list[tuple]:
    return db.execute(select(column, func.count(Complaint.id)).where(base_filter).group_by(column)).all()


def utc_day_start(value: datetime) -> datetime:
    aware_value = aware(value) or now_utc()
    return aware_value.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
