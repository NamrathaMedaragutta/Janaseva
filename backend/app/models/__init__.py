import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    ADMIN = "admin"
    OFFICER = "officer"
    OPERATOR = "operator"


class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    NEEDS_REVIEW = "needs_review"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class SubmissionChannel(str, enum.Enum):
    VOICE = "voice"
    ASSISTED = "assisted"
    WEB = "web"


class NotificationChannel(str, enum.Enum):
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationStatus(str, enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    SIMULATED = "simulated"
    FAILED = "failed"


class VoiceSessionStatus(str, enum.Enum):
    ACTIVE = "active"
    TRANSCRIBED = "transcribed"
    SUBMITTED = "submitted"
    FAILED = "failed"
    ABANDONED = "abandoned"


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    code: Mapped[str] = mapped_column(String(12), nullable=False, unique=True)
    district: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(32))
    # Configurable follow-up thresholds (hours). Demo configuration, not a statutory deadline.
    followup_hours: Mapped[int] = mapped_column(Integer, default=48, nullable=False)
    escalation_hours: Mapped[int] = mapped_column(Integer, default=96, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    departments: Mapped[list["Department"]] = relationship(back_populates="hospital")


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("hospital_id", "code", name="uq_department_hospital_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    hospital_id: Mapped[str] = mapped_column(ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(24), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    hospital: Mapped[Hospital] = relationship(back_populates="departments")
    officers: Mapped[list["User"]] = relationship(back_populates="department")


class Category(Base):
    __tablename__ = "complaint_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(48), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_kn: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    default_department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"))
    keywords: Mapped[str | None] = mapped_column(Text, comment="Comma separated keyword hints (en + kn)")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    default_department: Mapped[Department | None] = relationship()


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(190), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False, length=20), nullable=False)
    hospital_id: Mapped[str | None] = mapped_column(ForeignKey("hospitals.id", ondelete="SET NULL"))
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    hospital: Mapped[Hospital | None] = relationship()
    department: Mapped[Department | None] = relationship(back_populates="officers")


class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        Index("ix_complaints_hospital_status", "hospital_id", "status"),
        Index("ix_complaints_department_status", "department_id", "status"),
        Index("ix_complaints_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    reference_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    hospital_id: Mapped[str] = mapped_column(ForeignKey("hospitals.id"), nullable=False)
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"))
    category_id: Mapped[str] = mapped_column(ForeignKey("complaint_categories.id"), nullable=False)

    description_original: Mapped[str] = mapped_column(Text, nullable=False)
    description_translated: Mapped[str | None] = mapped_column(Text)
    translation_provider: Mapped[str | None] = mapped_column(String(60))
    language_code: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    submission_channel: Mapped[SubmissionChannel] = mapped_column(
        Enum(SubmissionChannel, native_enum=False, length=20), nullable=False
    )
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, native_enum=False, length=24), default=ComplaintStatus.SUBMITTED, nullable=False
    )

    complainant_name: Mapped[str | None] = mapped_column(String(150))
    contact_number: Mapped[str | None] = mapped_column(String(20))
    consent_to_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    assigned_officer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    resolution_summary: Mapped[str | None] = mapped_column(Text)
    category_confidence: Mapped[float | None] = mapped_column(Float)
    suggested_category_id: Mapped[str | None] = mapped_column(ForeignKey("complaint_categories.id", ondelete="SET NULL"))
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    hospital: Mapped[Hospital] = relationship()
    department: Mapped[Department | None] = relationship()
    category: Mapped[Category] = relationship(foreign_keys=[category_id])
    assigned_officer: Mapped[User | None] = relationship(foreign_keys=[assigned_officer_id])
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_id])
    history: Mapped[list["ComplaintHistory"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintHistory.created_at"
    )


class ComplaintHistory(Base):
    __tablename__ = "complaint_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[ComplaintStatus | None] = mapped_column(Enum(ComplaintStatus, native_enum=False, length=24))
    new_status: Mapped[ComplaintStatus] = mapped_column(Enum(ComplaintStatus, native_enum=False, length=24), nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), default="status_change", nullable=False)
    action_note: Mapped[str | None] = mapped_column(Text)
    updated_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    updated_by_name: Mapped[str | None] = mapped_column(String(150))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    complaint: Mapped[Complaint] = relationship(back_populates="history")
    updated_by: Mapped[User | None] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    complaint_id: Mapped[str | None] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel, native_enum=False, length=20))
    template: Mapped[str] = mapped_column(String(60), nullable=False)
    recipient: Mapped[str | None] = mapped_column(String(190))
    subject: Mapped[str | None] = mapped_column(String(190))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, native_enum=False, length=20), default=NotificationStatus.QUEUED
    )
    provider_name: Mapped[str | None] = mapped_column(String(60))
    provider_response: Mapped[str | None] = mapped_column(Text)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    complaint: Mapped[Complaint | None] = relationship()
    user: Mapped[User | None] = relationship()


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    trigger: Mapped[str] = mapped_column(String(40), default="overdue", nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    raised_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    target_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    complaint: Mapped[Complaint] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    actor_name: Mapped[str | None] = mapped_column(String(150))
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64))
    detail: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class ComplaintReferenceCounter(Base):
    """Monotonic per-hospital-per-year counter used for human readable IDs."""

    __tablename__ = "complaint_reference_counters"
    __table_args__ = (UniqueConstraint("hospital_id", "year", name="uq_reference_counter_hospital_year"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    hospital_id: Mapped[str] = mapped_column(ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    last_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class VoiceSession(Base):
    """IVR / call session state used by the telephony webhook."""

    __tablename__ = "voice_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    provider_call_id: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(40), default="simulation", nullable=False)
    language_code: Mapped[str] = mapped_column(String(8), default="kn", nullable=False)
    status: Mapped[VoiceSessionStatus] = mapped_column(
        Enum(VoiceSessionStatus, native_enum=False, length=20), default=VoiceSessionStatus.ACTIVE
    )
    step: Mapped[str] = mapped_column(String(30), default="language", nullable=False)
    transcript: Mapped[str | None] = mapped_column(Text)
    transcript_confidence: Mapped[float | None] = mapped_column(Float)
    caller_number: Mapped[str | None] = mapped_column(String(20))
    consent_to_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(String(190))
    complaint_id: Mapped[str | None] = mapped_column(ForeignKey("complaints.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    complaint: Mapped[Complaint | None] = relationship()
