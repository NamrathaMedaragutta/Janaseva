from datetime import date, datetime, time, timezone
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_optional_user
from app.database.session import get_db
from app.models import (
    Category,
    Complaint,
    ComplaintStatus,
    Department,
    Role,
    SubmissionChannel,
    User,
)
from app.schemas import (
    AssignRequest,
    ComplaintCreate,
    ComplaintDetail,
    ComplaintListResponse,
    NoteCreate,
    RegistrationResponse,
    StatusUpdate,
)
from app.services.audit import log_audit
from app.services.common import aware, now_utc
from app.services.complaints import (
    ACTIVE_STATUSES,
    add_note,
    apply_status_change,
    assign_officer,
    create_complaint,
    detail_out,
    get_accessible_complaint,
    list_item,
    scope_query,
)
from app.services.notifications import notify_status_change

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def _parse_date(value: date | None, end_of_day: bool = False) -> datetime | None:
    if value is None:
        return None
    return datetime.combine(value, time.max if end_of_day else time.min, tzinfo=timezone.utc)


@router.post("", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_complaint(
    payload: ComplaintCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> RegistrationResponse:
    """Citizen self-registration (web) or help-desk assisted registration (staff token)."""
    if not payload.emergency_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please confirm this is not a medical emergency. For emergencies contact hospital staff immediately.",
        )

    channel = SubmissionChannel.ASSISTED if current_user else SubmissionChannel.WEB
    complaint = create_complaint(
        db,
        hospital_id=payload.hospital_id,
        category_id=payload.category_id,
        description=payload.description,
        language_code=payload.language_code,
        submission_channel=channel,
        complainant_name=payload.complainant_name,
        contact_number=payload.contact_number,
        consent_to_contact=payload.consent_to_contact,
        department_id=payload.department_id,
        created_by=current_user,
    )

    log_audit(
        db,
        actor=current_user,
        action="complaint_registered",
        entity_type="complaint",
        entity_id=complaint.reference_id,
        detail={"channel": channel.value, "status": complaint.status.value},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(complaint)

    lang = complaint.language_code
    acknowledgement = (
        f"ನಿಮ್ಮ ದೂರು {complaint.reference_id} ದಾಖಲಾಗಿದೆ. ಈ ಸಂಖ್ಯೆಯನ್ನು ಬಳಸಿ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ."
        if lang == "kn"
        else f"Your grievance has been registered with reference {complaint.reference_id}. Keep this ID to track progress."
    )

    return RegistrationResponse(
        reference_id=complaint.reference_id,
        status=complaint.status,
        created_at=aware(complaint.created_at),
        category_name=complaint.category.name_en,
        department_name=complaint.department.name if complaint.department else None,
        submission_channel=complaint.submission_channel,
        acknowledgement=acknowledgement,
    )


@router.get("", response_model=ComplaintListResponse)
def list_complaints(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    search: str | None = Query(default=None, max_length=120),
    status_filter: list[ComplaintStatus] | None = Query(default=None, alias="status"),
    category_id: str | None = None,
    department_id: str | None = None,
    channel: SubmissionChannel | None = None,
    assigned_to_me: bool = False,
    overdue_only: bool = False,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: str = Query(default="newest", pattern="^(newest|oldest|updated|age|status)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> ComplaintListResponse:
    query = scope_query(select(Complaint), user)

    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Complaint.reference_id.ilike(term),
                Complaint.description_original.ilike(term),
            )
        )
    if status_filter:
        query = query.where(Complaint.status.in_(status_filter))
    if category_id:
        query = query.where(Complaint.category_id == category_id)
    if department_id:
        query = query.where(Complaint.department_id == department_id)
    if channel:
        query = query.where(Complaint.submission_channel == channel)
    if assigned_to_me:
        query = query.where(Complaint.assigned_officer_id == user.id)
    if date_from:
        query = query.where(Complaint.created_at >= _parse_date(date_from))
    if date_to:
        query = query.where(Complaint.created_at <= _parse_date(date_to, end_of_day=True))
    if overdue_only:
        from app.models import Hospital

        hospital = db.get(Hospital, user.hospital_id) if user.hospital_id else None
        threshold = hospital.followup_hours if hospital else 48
        cutoff = now_utc().timestamp() - threshold * 3600
        query = query.where(Complaint.status.in_(ACTIVE_STATUSES))
        all_items = db.scalars(query).unique().all()
        filtered = [c for c in all_items if (aware(c.created_at).timestamp() < cutoff)]
        total = len(filtered)
        pages = max(1, ceil(total / page_size))
        start = (page - 1) * page_size
        return ComplaintListResponse(
            items=[list_item(c) for c in filtered[start : start + page_size]],
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    order = {
        "newest": Complaint.created_at.desc(),
        "oldest": Complaint.created_at.asc(),
        "updated": Complaint.updated_at.desc(),
        "age": Complaint.created_at.asc(),
        "status": Complaint.status.asc(),
    }[sort]
    rows = db.scalars(query.order_by(order).offset((page - 1) * page_size).limit(page_size)).unique().all()

    return ComplaintListResponse(
        items=[list_item(c) for c in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, ceil(total / page_size)),
    )


@router.get("/filter-options")
def filter_options(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    categories = db.scalars(select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order)).all()
    departments = db.scalars(
        select(Department).where(Department.hospital_id == user.hospital_id, Department.is_active.is_(True))
    ).all()
    officers = db.scalars(
        select(User).where(
            User.hospital_id == user.hospital_id,
            User.role == Role.OFFICER,
            User.is_active.is_(True),
        )
    ).all()
    return {
        "categories": [{"id": c.id, "name_en": c.name_en, "name_kn": c.name_kn} for c in categories],
        "departments": [{"id": d.id, "name": d.name, "code": d.code} for d in departments],
        "officers": [
            {"id": o.id, "name": o.full_name, "department_id": o.department_id, "email": o.email} for o in officers
        ],
    }


@router.get("/{reference_id}", response_model=ComplaintDetail)
def get_complaint(
    reference_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ComplaintDetail:
    complaint = get_accessible_complaint(db, reference_id, user)
    return detail_out(complaint)


@router.patch("/{reference_id}/status", response_model=ComplaintDetail)
def update_status(
    reference_id: str,
    payload: StatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ComplaintDetail:
    complaint = get_accessible_complaint(db, reference_id, user)
    if payload.note is None and payload.resolution_summary is None and payload.status not in {
        ComplaintStatus.ACKNOWLEDGED,
        ComplaintStatus.IN_PROGRESS,
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add an action-taken note when changing this complaint's status.",
        )
    complaint = apply_status_change(
        db,
        complaint,
        new_status=payload.status,
        actor=user,
        note=payload.note,
        resolution_summary=payload.resolution_summary,
        is_public=payload.is_public,
    )
    notify_status_change(db, complaint, user, payload.note)
    log_audit(
        db,
        actor=user,
        action="status_updated",
        entity_type="complaint",
        entity_id=complaint.reference_id,
        detail={"status": complaint.status.value},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(complaint)
    return detail_out(complaint)


@router.patch("/{reference_id}/assign", response_model=ComplaintDetail)
def assign(
    reference_id: str,
    payload: AssignRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ComplaintDetail:
    complaint = get_accessible_complaint(db, reference_id, user)
    officer = db.get(User, payload.officer_id) if payload.officer_id else None
    if payload.officer_id and officer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer not found.")
    complaint = assign_officer(db, complaint, officer=officer, actor=user, note=payload.note)
    log_audit(
        db,
        actor=user,
        action="complaint_assigned" if officer else "assignment_removed",
        entity_type="complaint",
        entity_id=complaint.reference_id,
        detail={"officer_id": payload.officer_id},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(complaint)
    return detail_out(complaint)


@router.post("/{reference_id}/notes", response_model=ComplaintDetail)
def create_note(
    reference_id: str,
    payload: NoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ComplaintDetail:
    complaint = get_accessible_complaint(db, reference_id, user)
    if user.role == Role.OPERATOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registration operators cannot add case notes.")
    complaint = add_note(db, complaint, actor=user, note=payload.note, is_public=payload.is_public)
    log_audit(
        db,
        actor=user,
        action="note_added",
        entity_type="complaint",
        entity_id=complaint.reference_id,
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(complaint)
    return detail_out(complaint)
