from datetime import datetime, timezone
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, field_validator

from app.models import ComplaintStatus, NotificationStatus, Role, SubmissionChannel


def _to_utc(value: Any) -> Any:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    return value


UTCDateTime = Annotated[datetime, BeforeValidator(_to_utc)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- auth
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserBrief(ORMModel):
    id: str
    full_name: str
    email: EmailStr
    role: Role
    phone: str | None = None
    department_id: str | None = None
    department_name: str | None = None
    hospital_id: str | None = None
    hospital_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserBrief


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ---------------------------------------------------------------- complaints
CategoryRef = "CategoryOut"


class CategoryOut(ORMModel):
    id: str
    slug: str
    name_en: str
    name_kn: str
    description: str | None = None
    default_department_id: str | None = None
    sort_order: int = 0
    is_active: bool = True


class DepartmentOut(ORMModel):
    id: str
    hospital_id: str
    name: str
    code: str
    description: str | None = None
    is_active: bool = True
    officer_count: int = 0


class HospitalOut(ORMModel):
    id: str
    name: str
    code: str
    district: str | None = None
    address: str | None = None
    phone: str | None = None
    followup_hours: int
    escalation_hours: int
    is_active: bool = True


class HospitalPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str
    district: str | None = None
    address: str | None = None
    phone: str | None = None


class PublicMeta(BaseModel):
    hospital: HospitalPublic
    categories: list[CategoryOut]
    departments: list[DepartmentOut] = []


class ComplaintCreate(BaseModel):
    hospital_id: str
    category_id: str
    description: str = Field(min_length=10, max_length=4000)
    language_code: str = Field(default="en", pattern="^(en|kn)$")
    complainant_name: str | None = Field(default=None, max_length=150)
    contact_number: str | None = Field(default=None, max_length=20)
    consent_to_contact: bool = False
    department_id: str | None = None
    emergency_acknowledged: bool = Field(
        default=True, description="Citizen confirmed this is not a medical emergency."
    )

    @field_validator("description")
    @classmethod
    def _strip_description(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise ValueError("Please describe the issue in at least 10 characters.")
        return cleaned

    @field_validator("contact_number")
    @classmethod
    def _validate_contact(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) < 10 or len(digits) > 13:
            raise ValueError("Enter a valid contact number (10-13 digits).")
        return digits

    @field_validator("consent_to_contact")
    @classmethod
    def _consent_requires_number(cls, value: bool, info) -> bool:
        return value


class HistoryOut(ORMModel):
    id: str
    old_status: ComplaintStatus | None = None
    new_status: ComplaintStatus
    event_type: str
    action_note: str | None = None
    updated_by_name: str | None = None
    created_at: UTCDateTime


class PublicHistoryOut(ORMModel):
    new_status: ComplaintStatus
    action_note: str | None = None
    created_at: UTCDateTime


class ComplaintListItem(ORMModel):
    reference_id: str
    status: ComplaintStatus
    submission_channel: SubmissionChannel
    language_code: str
    created_at: UTCDateTime
    updated_at: UTCDateTime
    category: CategoryOut
    department: DepartmentOut | None = None
    assigned_officer_name: str | None = None
    assigned_officer_id: str | None = None
    is_overdue: bool = False
    age_hours: float = 0
    description_preview: str = ""


class ComplaintDetail(BaseModel):
    reference_id: str
    id: str
    status: ComplaintStatus
    submission_channel: SubmissionChannel
    language_code: str
    description_original: str
    description_translated: str | None = None
    translation_provider: str | None = None
    created_at: UTCDateTime
    updated_at: UTCDateTime
    acknowledged_at: UTCDateTime | None = None
    resolved_at: UTCDateTime | None = None
    closed_at: UTCDateTime | None = None
    hospital: HospitalOut
    department: DepartmentOut | None = None
    category: CategoryOut
    complainant_name: str | None = None
    contact_number: str | None = None
    consent_to_contact: bool = False
    assigned_officer: UserBrief | None = None
    created_by_name: str | None = None
    resolution_summary: str | None = None
    category_confidence: float | None = None
    is_overdue: bool = False
    age_hours: float = 0
    history: list[HistoryOut] = []


class ComplaintListResponse(BaseModel):
    items: list[ComplaintListItem]
    total: int
    page: int
    page_size: int
    pages: int


class StatusUpdate(BaseModel):
    status: ComplaintStatus
    note: str | None = Field(default=None, max_length=2000)
    resolution_summary: str | None = Field(default=None, max_length=2000)
    is_public: bool = True

    @field_validator("note", "resolution_summary")
    @classmethod
    def _strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class NoteCreate(BaseModel):
    note: str = Field(min_length=3, max_length=2000)
    is_public: bool = True

    @field_validator("note")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class AssignRequest(BaseModel):
    officer_id: str | None = None
    note: str | None = Field(default=None, max_length=1000)


class PublicComplaintStatus(BaseModel):
    reference_id: str
    status: ComplaintStatus
    category_name: str
    category_name_kn: str
    department_name: str | None
    submission_channel: SubmissionChannel
    created_at: UTCDateTime
    updated_at: UTCDateTime
    resolved_at: UTCDateTime | None
    closed_at: UTCDateTime | None
    hospital_name: str
    timeline: list[PublicHistoryOut]
    language_code: str


class RegistrationResponse(BaseModel):
    reference_id: str
    status: ComplaintStatus
    created_at: UTCDateTime
    category_name: str
    department_name: str | None
    submission_channel: SubmissionChannel
    acknowledgement: str
    notification_status: NotificationStatus | None = None


# ---------------------------------------------------------------- dashboard
class DashboardSummary(BaseModel):
    total: int
    new: int
    in_progress: int
    pending: int
    overdue: int
    resolved: int
    closed: int
    unassigned: int
    escalated: int
    resolved_rate: float
    avg_resolution_hours: float | None
    followup_hours: int
    escalation_hours: int


class TrendPoint(BaseModel):
    date: str
    received: int
    resolved: int


class NamedCount(BaseModel):
    name: str
    name_kn: str | None = None
    value: int


class TrendsResponse(BaseModel):
    range_days: int
    points: list[TrendPoint]
    by_category: list[NamedCount]
    by_department: list[NamedCount]
    by_status: list[NamedCount]


class ActivityItem(BaseModel):
    reference_id: str
    category_name: str
    status: ComplaintStatus
    action: str
    actor: str | None
    created_at: UTCDateTime


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    trends: TrendsResponse
    recent: list[ComplaintListItem]
    pending: list[ComplaintListItem]
    overdue: list[ComplaintListItem]
    activity: list[ActivityItem]


# ---------------------------------------------------------------- follow-ups
class FollowUpItem(BaseModel):
    reference_id: str
    status: ComplaintStatus
    category_name: str
    category_name_kn: str
    department_name: str | None
    assigned_officer_name: str | None
    created_at: UTCDateTime
    updated_at: UTCDateTime
    age_hours: float
    hours_since_update: float
    is_overdue: bool
    escalation_level: int
    escalation_status: str
    last_escalation_at: UTCDateTime | None


class FollowUpResponse(BaseModel):
    followup_hours: int
    escalation_hours: int
    pending: list[FollowUpItem]
    overdue: list[FollowUpItem]
    counts: dict[str, int]


# ---------------------------------------------------------------- admin
class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role
    phone: str | None = Field(default=None, max_length=20)
    hospital_id: str | None = None
    department_id: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    role: Role | None = None
    department_id: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserAdminOut(ORMModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str | None
    role: Role
    department_id: str | None
    department_name: str | None = None
    is_active: bool
    last_login_at: UTCDateTime | None = None
    created_at: UTCDateTime


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=2, max_length=24)
    description: str | None = None


class CategoryUpdate(BaseModel):
    name_en: str | None = Field(default=None, min_length=2, max_length=120)
    name_kn: str | None = Field(default=None, min_length=2, max_length=160)
    default_department_id: str | None = None
    is_active: bool | None = None
    keywords: str | None = None


class ThresholdUpdate(BaseModel):
    followup_hours: int = Field(ge=1, le=720)
    escalation_hours: int = Field(ge=1, le=1440)

    @field_validator("escalation_hours")
    @classmethod
    def _escalation_after_followup(cls, value: int, info) -> int:
        followup = info.data.get("followup_hours")
        if followup is not None and value < followup:
            raise ValueError("Escalation threshold must be greater than or equal to the follow-up threshold.")
        return value


class AuditLogOut(ORMModel):
    id: str
    actor_name: str | None
    action: str
    entity_type: str
    entity_id: str | None
    detail: dict | None
    created_at: UTCDateTime


class NotificationOut(ORMModel):
    id: str
    complaint_id: str | None
    channel: str
    template: str
    subject: str | None
    body: str
    status: NotificationStatus
    provider_name: str | None
    created_at: UTCDateTime
    read_at: UTCDateTime | None


class EscalationOut(ORMModel):
    id: str
    complaint_id: str
    level: int
    trigger: str
    reason: str
    created_at: UTCDateTime
    resolved_at: UTCDateTime | None


class FollowUpAction(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


# ---------------------------------------------------------------- voice
class VoiceSessionCreate(BaseModel):
    language_code: str = Field(default="kn", pattern="^(en|kn)$")
    caller_number: str | None = Field(default=None, max_length=20)
    consent_to_contact: bool = False


class VoiceTranscriptIn(BaseModel):
    transcript: str = Field(min_length=5, max_length=4000)
    confidence: float | None = Field(default=None, ge=0, le=1)


class VoiceSessionOut(BaseModel):
    id: str
    provider_call_id: str
    provider: str
    language_code: str
    status: str
    step: str
    transcript: str | None
    transcript_confidence: float | None
    suggested_category: CategoryOut | None = None
    suggested_department: DepartmentOut | None = None
    complaint_reference: str | None = None
    failure_reason: str | None = None
    demo_mode: bool


class VoiceSubmitIn(BaseModel):
    hospital_id: str
    description: str = Field(min_length=10, max_length=4000)
    category_id: str | None = None
    complainant_name: str | None = Field(default=None, max_length=150)
    consent_to_contact: bool = False


class VoiceStatus(BaseModel):
    live: bool
    provider: str | None
    speech_to_text_provider: str | None
    text_to_speech_provider: str | None
    phone_number: str | None
    mode: str
    message: str


class NotificationTestRequest(BaseModel):
    channel: str = Field(default="sms", pattern="^(sms|email|in_app)$")
    recipient: str | None = None
    message: str | None = Field(default=None, max_length=300)
