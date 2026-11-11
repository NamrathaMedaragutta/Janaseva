from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.database.session import get_db
from app.models import Notification, NotificationChannel, User
from app.schemas import NotificationOut, NotificationTestRequest
from app.services.common import now_utc
from app.services.notifications import send_sms_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
def my_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    rows = db.scalars(query.order_by(Notification.created_at.desc()).limit(limit)).all()
    return [NotificationOut.model_validate(row) for row in rows]


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notification.read_at = notification.read_at or now_utc()
    db.commit()
    db.refresh(notification)
    return NotificationOut.model_validate(notification)


@router.post("/test", status_code=201)
def send_test_notification(
    payload: NotificationTestRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only channel test. Never reports simulated delivery as delivered."""
    if payload.channel == "in_app":
        notification = Notification(
            user_id=admin.id,
            channel=NotificationChannel.IN_APP,
            template="channel_test",
            recipient=admin.email,
            subject="JANASEVA channel test",
            body=payload.message or "In-app notifications are working.",
            status="sent",
            provider_name="in-app",
        )
        db.add(notification)
        db.commit()
        return {"channel": "in_app", "status": "sent", "detail": "In-app notification created for your account."}

    notification = send_sms_notification(
        db,
        template="channel_test",
        body=payload.message or "JANASEVA channel test message.",
        recipient=payload.recipient,
    )
    db.commit()
    return {
        "channel": "sms",
        "status": notification.status.value,
        "provider": notification.provider_name,
        "detail": notification.provider_response,
    }
