from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models import Role, User
from app.schemas import EscalationOut, FollowUpAction, FollowUpResponse, NotificationOut
from app.services.audit import log_audit
from app.services.followups import accessible_complaint_or_403, escalate, get_followups, remind

router = APIRouter(prefix="/follow-ups", tags=["Follow-up & escalation"])


@router.get("", response_model=FollowUpResponse)
def follow_up_queue(
    hospital_id: str | None = Query(default=None),
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FollowUpResponse:
    target = hospital_id or user.hospital_id
    if target is None:
        raise HTTPException(status_code=400, detail="No hospital associated with this account.")
    if user.role != Role.ADMIN and target != user.hospital_id:
        raise HTTPException(status_code=403, detail="You do not have access to this hospital.")
    return get_followups(db, user, target, include_overdue_only=overdue_only)


@router.post("/{reference_id}/remind", response_model=NotificationOut)
def send_reminder(
    reference_id: str,
    payload: FollowUpAction,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NotificationOut:
    if user.role == Role.OPERATOR:
        raise HTTPException(status_code=403, detail="Registration operators cannot send follow-up reminders.")
    complaint = accessible_complaint_or_403(db, reference_id, user)
    notification = remind(db, complaint, actor=user, reason=payload.reason)
    log_audit(
        db,
        actor=user,
        action="followup_reminder",
        entity_type="complaint",
        entity_id=complaint.reference_id,
        detail={"reason": payload.reason},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return NotificationOut.model_validate(notification)


@router.post("/{reference_id}/escalate", response_model=EscalationOut, status_code=status.HTTP_201_CREATED)
def escalate_complaint(
    reference_id: str,
    payload: FollowUpAction,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EscalationOut:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Only administrators can escalate complaints.")
    complaint = accessible_complaint_or_403(db, reference_id, user)
    escalation = escalate(db, complaint, actor=user, reason=payload.reason)
    log_audit(
        db,
        actor=user,
        action="complaint_escalated",
        entity_type="complaint",
        entity_id=complaint.reference_id,
        detail={"level": escalation.level, "reason": payload.reason},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return EscalationOut.model_validate(escalation)
