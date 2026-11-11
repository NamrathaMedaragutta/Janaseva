"""Notification service abstraction.

Every attempt is persisted with its delivery status so operational staff can see
whether a channel is live, simulated, or failed. Notifications never contain
medical information - only the complaint reference and next action.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations.sms import send_sms
from app.models import (
    Complaint,
    Notification,
    NotificationChannel,
    NotificationStatus,
    Role,
    User,
)
from app.services.common import now_utc

logger = logging.getLogger(__name__)


def _record(
    db: Session,
    *,
    template: str,
    body: str,
    subject: str | None,
    channel: NotificationChannel,
    complaint: Complaint | None = None,
    user: User | None = None,
    recipient: str | None = None,
    status: NotificationStatus = NotificationStatus.QUEUED,
    provider: str | None = None,
    provider_response: str | None = None,
) -> Notification:
    notification = Notification(
        complaint_id=complaint.id if complaint else None,
        user_id=user.id if user else None,
        channel=channel,
        template=template,
        recipient=recipient,
        subject=subject,
        body=body,
        status=status,
        provider_name=provider,
        provider_response=provider_response,
        sent_at=now_utc() if status in {NotificationStatus.SENT, NotificationStatus.SIMULATED} else None,
    )
    db.add(notification)
    return notification


def send_sms_notification(
    db: Session, *, template: str, body: str, recipient: str | None, complaint: Complaint | None = None
) -> Notification:
    if not recipient:
        return _record(
            db,
            template=template,
            body=body,
            subject=None,
            channel=NotificationChannel.SMS,
            complaint=complaint,
            status=NotificationStatus.FAILED,
            provider_response="No consented contact number available.",
        )

    result = send_sms(recipient, body)
    status = (
        NotificationStatus.SENT
        if result.delivered
        else NotificationStatus.SIMULATED
        if result.simulated
        else NotificationStatus.FAILED
    )
    return _record(
        db,
        template=template,
        body=body,
        subject=None,
        channel=NotificationChannel.SMS,
        complaint=complaint,
        recipient=recipient,
        status=status,
        provider=result.provider,
        provider_response=result.detail,
    )


def acknowledge_registration(db: Session, complaint: Complaint, language_code: str) -> list[Notification]:
    created: list[Notification] = []
    if complaint.consent_to_contact and complaint.contact_number:
        if language_code == "kn":
            body = (
                f"ಜನಸೇವಾ: ನಿಮ್ಮ ದೂರು {complaint.reference_id} ದಾಖಲಾಗಿದೆ. "
                f"ಸ್ಥಿತಿ ತಿಳಿಯಲು ಈ ಸಂಖ್ಯೆಯನ್ನು ಬಳಸಿ."
            )
        else:
            body = (
                f"JANASEVA: Your grievance {complaint.reference_id} has been registered. "
                "Use this ID to track its status."
            )
        created.append(
            send_sms_notification(
                db,
                template="complaint_registered",
                body=body,
                recipient=complaint.contact_number,
                complaint=complaint,
            )
        )

    created.append(
        _record(
            db,
            template="complaint_registered",
            subject="Grievance registered",
            body=f"Grievance {complaint.reference_id} registered via {complaint.submission_channel.value}.",
            channel=NotificationChannel.IN_APP,
            complaint=complaint,
            status=NotificationStatus.SENT,
            provider="in-app",
        )
    )
    return created


def notify_assignment(db: Session, complaint: Complaint, officer: User, assigned_by: User | None) -> Notification:
    return _record(
        db,
        template="complaint_assigned",
        subject=f"Grievance {complaint.reference_id} assigned",
        body=(
            f"{complaint.reference_id} ({complaint.category.name_en}) was assigned to you"
            f" by {assigned_by.full_name if assigned_by else 'the system'}. Open the officer workspace to act on it."
        ),
        channel=NotificationChannel.IN_APP,
        complaint=complaint,
        user=officer,
        recipient=officer.email,
        status=NotificationStatus.SENT,
        provider="in-app",
    )


def notify_status_change(db: Session, complaint: Complaint, actor: User | None, public_note: str | None) -> None:
    if complaint.consent_to_contact and complaint.contact_number and complaint.status.value in {"resolved", "closed", "reopened"}:
        body = (
            f"JANASEVA: Grievance {complaint.reference_id} is now {complaint.status.value.replace('_', ' ')}. "
            "Please contact the hospital help desk if the issue persists."
        )
        send_sms_notification(db, template="status_update", body=body, recipient=complaint.contact_number, complaint=complaint)

    if complaint.assigned_officer_id and actor and complaint.assigned_officer_id != actor.id:
        officer = db.get(User, complaint.assigned_officer_id)
        if officer:
            _record(
                db,
                template="status_update",
                subject=f"Grievance {complaint.reference_id} updated",
                body=(
                    f"{complaint.reference_id} status changed to {complaint.status.value.replace('_', ' ')}"
                    f" by {actor.full_name}."
                ),
                channel=NotificationChannel.IN_APP,
                complaint=complaint,
                user=officer,
                recipient=officer.email,
                status=NotificationStatus.SENT,
                provider="in-app",
            )


def notify_admins(db: Session, *, template: str, subject: str, body: str, complaint: Complaint | None = None) -> None:
    admins = db.scalars(select(User).where(User.role == Role.ADMIN, User.is_active.is_(True))).all()
    for admin in admins:
        _record(
            db,
            template=template,
            subject=subject,
            body=body,
            channel=NotificationChannel.IN_APP,
            complaint=complaint,
            user=admin,
            recipient=admin.email,
            status=NotificationStatus.SENT,
            provider="in-app",
        )
