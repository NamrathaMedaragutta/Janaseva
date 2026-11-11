"""Follow-up and escalation engine.

Thresholds come from the hospital configuration (configurable demo values, not
statutory deadlines). Every reminder and escalation is persisted.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Complaint,
    ComplaintHistory,
    ComplaintStatus,
    Escalation,
    Notification,
    NotificationChannel,
    NotificationStatus,
    Role,
    User,
)
from app.schemas import FollowUpItem, FollowUpResponse
from app.services.common import aware, hours_since, now_utc
from app.services.complaints import ACTIVE_STATUSES, can_access, is_overdue
from app.services.notifications import notify_admins


def _escalation_state(db: Session, complaint: Complaint) -> tuple[int, str, object]:
    escalations = db.scalars(
        select(Escalation).where(Escalation.complaint_id == complaint.id).order_by(Escalation.created_at.desc())
    ).all()
    if not escalations:
        return 0, "none", None
    latest = escalations[0]
    return latest.level, ("resolved" if latest.resolved_at else "open"), aware(latest.created_at)


def build_followup(db: Session, complaint: Complaint) -> FollowUpItem:
    level, state, last_at = _escalation_state(db, complaint)
    return FollowUpItem(
        reference_id=complaint.reference_id,
        status=complaint.status,
        category_name=complaint.category.name_en,
        category_name_kn=complaint.category.name_kn,
        department_name=complaint.department.name if complaint.department else None,
        assigned_officer_name=complaint.assigned_officer.full_name if complaint.assigned_officer else None,
        created_at=aware(complaint.created_at),
        updated_at=aware(complaint.updated_at),
        age_hours=hours_since(complaint.created_at),
        hours_since_update=hours_since(complaint.updated_at),
        is_overdue=is_overdue(complaint),
        escalation_level=level,
        escalation_status=state,
        last_escalation_at=last_at,
    )


def get_followups(db: Session, user: User, hospital_id: str, include_overdue_only: bool = False) -> FollowUpResponse:
    from app.models import Hospital

    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        hospital = db.get(Hospital, user.hospital_id) if user.hospital_id else None
    if hospital is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Hospital not found.")

    query = (
        select(Complaint)
        .where(
            Complaint.hospital_id == hospital.id,
            Complaint.status.in_(ACTIVE_STATUSES),
        )
        .order_by(Complaint.created_at.asc())
    )
    if user.role == Role.OFFICER:
        conditions = [Complaint.assigned_officer_id == user.id]
        if user.department_id:
            conditions.append(Complaint.department_id == user.department_id)
        query = query.where(conditions[0] | conditions[1])
    elif user.role == Role.OPERATOR:
        query = query.where(Complaint.created_by_id == user.id)

    complaints = db.scalars(query).unique().all()
    items = [build_followup(db, complaint) for complaint in complaints]
    overdue = [item for item in items if item.is_overdue]
    pending = [item for item in items if not item.is_overdue]
    if include_overdue_only:
        pending = []

    return FollowUpResponse(
        followup_hours=hospital.followup_hours,
        escalation_hours=hospital.escalation_hours,
        pending=pending,
        overdue=overdue,
        counts={
            "pending": len(pending),
            "overdue": len(overdue),
            "total": len(items),
            "escalated": sum(1 for item in items if item.escalation_status == "open"),
        },
    )


def remind(db: Session, complaint: Complaint, *, actor: User, reason: str) -> Notification:
    recipient = complaint.assigned_officer
    if recipient is None:
        admin = db.scalar(
            select(User).where(User.role == Role.ADMIN, User.hospital_id == complaint.hospital_id, User.is_active.is_(True))
        )
        recipient = admin

    body = (
        f"Follow-up due for grievance {complaint.reference_id}. "
        f"Reason: {reason}. Please review it in JANASEVA."
    )
    notification = Notification(
        complaint_id=complaint.id,
        user_id=recipient.id if recipient else None,
        channel=NotificationChannel.IN_APP,
        template="followup_reminder",
        recipient=recipient.email if recipient else None,
        subject=f"Follow-up due: {complaint.reference_id}",
        body=body,
        status=NotificationStatus.SENT,
        provider_name="in-app",
        sent_at=now_utc(),
    )
    db.add(notification)
    db.add(
        ComplaintHistory(
            complaint_id=complaint.id,
            old_status=complaint.status,
            new_status=complaint.status,
            event_type="reminder",
            action_note=f"Follow-up reminder recorded by {actor.full_name}: {reason}",
            updated_by_id=actor.id,
            updated_by_name=actor.full_name,
            is_public=False,
        )
    )
    db.commit()
    db.refresh(notification)
    return notification


def escalate(db: Session, complaint: Complaint, *, actor: User, reason: str) -> Escalation:
    previous = db.scalar(select(func.max(Escalation.level)).where(Escalation.complaint_id == complaint.id)) or 0
    level = int(previous) + 1
    admin = db.scalar(
        select(User)
        .where(User.role == Role.ADMIN, User.hospital_id == complaint.hospital_id, User.is_active.is_(True))
        .order_by(User.created_at.asc())
    )

    escalation = Escalation(
        complaint_id=complaint.id,
        level=level,
        trigger="overdue" if is_overdue(complaint) else "manual",
        reason=reason,
        raised_by_id=actor.id,
        target_user_id=admin.id if admin else None,
    )
    db.add(escalation)
    db.add(
        ComplaintHistory(
            complaint_id=complaint.id,
            old_status=complaint.status,
            new_status=complaint.status,
            event_type="escalation",
            action_note=f"Escalated to level {level} by {actor.full_name}: {reason}",
            updated_by_id=actor.id,
            updated_by_name=actor.full_name,
            is_public=False,
        )
    )
    notify_admins(
        db,
        template="escalation",
        subject=f"Grievance {complaint.reference_id} escalated to level {level}",
        body=f"Grievance {complaint.reference_id} was escalated by {actor.full_name}. Reason: {reason}",
        complaint=complaint,
    )
    db.commit()
    db.refresh(escalation)
    return escalation


def accessible_complaint_or_403(db: Session, reference_id: str, user: User) -> Complaint:
    from fastapi import HTTPException

    complaint = db.scalar(select(Complaint).where(Complaint.reference_id == reference_id.upper()))
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    if not can_access(complaint, user):
        raise HTTPException(status_code=403, detail="This complaint is outside your permitted scope.")
    return complaint
