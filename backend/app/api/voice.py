import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.integrations.telephony import ivr_prompt, telephony_mode, verify_webhook_signature
from app.models import (
    Category,
    Complaint,
    Department,
    SubmissionChannel,
    VoiceSession,
    VoiceSessionStatus,
)
from app.schemas import (
    CategoryOut,
    DepartmentOut,
    VoiceSessionCreate,
    VoiceSessionOut,
    VoiceStatus,
    VoiceSubmitIn,
    VoiceTranscriptIn,
)
from app.services.audit import log_audit
from app.services.categorisation import REVIEW_THRESHOLD, suggest_category
from app.services.complaints import create_complaint

router = APIRouter(prefix="/voice", tags=["Voice & IVR"])

LOW_CONFIDENCE = 0.45


def _session_out(db: Session, session: VoiceSession) -> VoiceSessionOut:
    suggestion = suggest_category(db, session.transcript) if session.transcript else None
    department = suggestion.category.default_department if suggestion and suggestion.category else None
    complaint = db.get(Complaint, session.complaint_id) if session.complaint_id else None
    return VoiceSessionOut(
        id=session.id,
        provider_call_id=session.provider_call_id,
        provider=session.provider,
        language_code=session.language_code,
        status=session.status.value,
        step=session.step,
        transcript=session.transcript,
        transcript_confidence=session.transcript_confidence,
        suggested_category=CategoryOut.model_validate(suggestion.category)
        if suggestion and suggestion.category
        else None,
        suggested_department=DepartmentOut.model_validate(department) if department else None,
        complaint_reference=complaint.reference_id if complaint else None,
        failure_reason=session.failure_reason,
        demo_mode=session.provider != "live",
    )


@router.get("/status", response_model=VoiceStatus)
def voice_status() -> VoiceStatus:
    live = settings.voice_live
    return VoiceStatus(
        live=live,
        provider=settings.telephony_provider or None,
        speech_to_text_provider=settings.speech_to_text_provider or None,
        text_to_speech_provider=settings.text_to_speech_provider or None,
        phone_number=settings.telephony_phone_number or None,
        mode=telephony_mode(),
        message=(
            "Live telephony is configured. Calls to the grievance line create complaints automatically."
            if live
            else "Demo mode: no telephony or speech provider credentials are configured, so the IVR "
            "journey is simulated on this screen. Live calls, Kannada speech-to-text and spoken "
            "acknowledgements require provider credentials in backend/.env."
        ),
    )


@router.post("/sessions", response_model=VoiceSessionOut, status_code=status.HTTP_201_CREATED)
def start_session(payload: VoiceSessionCreate, db: Session = Depends(get_db)) -> VoiceSessionOut:
    """Start an IVR demo session. Clearly a simulation unless a provider is configured."""
    session = VoiceSession(
        provider_call_id=f"SIM-{uuid.uuid4().hex[:10].upper()}",
        provider="live" if settings.voice_live else "simulation",
        language_code=payload.language_code,
        caller_number=payload.caller_number,
        consent_to_contact=payload.consent_to_contact,
        step="describe",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_out(db, session)


@router.get("/sessions/{session_id}", response_model=VoiceSessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)) -> VoiceSessionOut:
    session = db.get(VoiceSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Call session not found.")
    return _session_out(db, session)


@router.post("/sessions/{session_id}/transcript", response_model=VoiceSessionOut)
def submit_transcript(
    session_id: str, payload: VoiceTranscriptIn, db: Session = Depends(get_db)
) -> VoiceSessionOut:
    session = db.get(VoiceSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Call session not found.")
    if session.status == VoiceSessionStatus.SUBMITTED:
        raise HTTPException(status_code=409, detail="This call already created a complaint.")

    session.transcript = payload.transcript.strip()
    session.transcript_confidence = payload.confidence
    if payload.confidence is not None and payload.confidence < LOW_CONFIDENCE:
        session.failure_reason = "low_confidence"
        session.step = "repeat"
    else:
        session.failure_reason = None
        session.status = VoiceSessionStatus.TRANSCRIBED
        session.step = "confirm"
    db.commit()
    db.refresh(session)
    return _session_out(db, session)


@router.post("/sessions/{session_id}/submit", response_model=VoiceSessionOut)
def submit_voice_complaint(
    session_id: str, payload: VoiceSubmitIn, request: Request, db: Session = Depends(get_db)
) -> VoiceSessionOut:
    session = db.get(VoiceSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Call session not found.")
    if session.status == VoiceSessionStatus.SUBMITTED:
        raise HTTPException(status_code=409, detail="This call already created a complaint.")
    if not payload.description.strip():
        raise HTTPException(status_code=422, detail="A confirmed transcript is required before submitting.")

    suggested = suggest_category(db, payload.description)
    category_id = payload.category_id
    if category_id:
        if db.get(Category, category_id) is None:
            raise HTTPException(status_code=404, detail="Category not found.")
    elif suggested.category is not None and not suggested.needs_review:
        category_id = suggested.category.id
    else:
        other = db.scalar(select(Category).where(Category.slug == "other"))
        if other is None:  # pragma: no cover - seed guarantees this category
            raise HTTPException(status_code=503, detail="Complaint categories are not configured.")
        category_id = other.id

    complaint = create_complaint(
        db,
        hospital_id=payload.hospital_id,
        category_id=category_id,
        description=payload.description,
        language_code=session.language_code,
        submission_channel=SubmissionChannel.VOICE,
        complainant_name=payload.complainant_name,
        contact_number=session.caller_number,
        consent_to_contact=payload.consent_to_contact and session.consent_to_contact,
        category_confidence=suggested.confidence,
        transcript_confidence=session.transcript_confidence,
    )

    session.complaint_id = complaint.id
    session.status = VoiceSessionStatus.SUBMITTED
    session.step = "acknowledged"
    session.transcript = payload.description
    db.add(session)
    log_audit(
        db,
        actor=None,
        action="voice_complaint_registered",
        entity_type="complaint",
        entity_id=complaint.reference_id,
        detail={
            "call_id": session.provider_call_id,
            "provider": session.provider,
            "confidence": session.transcript_confidence,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(session)
    return _session_out(db, session)


@router.post("/webhook")
async def telephony_webhook(request: Request, db: Session = Depends(get_db)):
    """Incoming IVR events from the configured telephony provider.

    Verified with VOICE_WEBHOOK_SECRET when set. Unverified development events are
    stored with provider 'simulation' - they never claim a live integration.
    """
    raw = await request.body()
    signature = request.headers.get("x-voice-signature")
    valid, verification = verify_webhook_signature(raw, signature)
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed webhook payload.") from None

    event = payload.get("event")
    call_id = payload.get("call_id")
    if not call_id or not event:
        raise HTTPException(status_code=422, detail="call_id and event are required.")

    provider = "live" if verification == "verified" else "simulation"
    session = db.scalar(select(VoiceSession).where(VoiceSession.provider_call_id == call_id))
    if session is None:
        session = VoiceSession(
            provider_call_id=call_id,
            provider=provider,
            language_code=payload.get("language") or "kn",
            caller_number=payload.get("caller_number"),
            consent_to_contact=bool(payload.get("consent")),
        )
        db.add(session)
        db.flush()

    if event == "call.started":
        session.step = "language"
        session.status = VoiceSessionStatus.ACTIVE
        reply = ivr_prompt(session.language_code, "welcome")
    elif event == "language.selected":
        language = payload.get("language")
        if language not in {"kn", "en"}:
            session.status = VoiceSessionStatus.FAILED
            session.failure_reason = "unsupported_language"
            db.commit()
            raise HTTPException(status_code=422, detail="Unsupported language. Supported: kn, en.")
        session.language_code = language
        session.step = "describe"
        reply = ivr_prompt(language, "describe")
    elif event == "speech.captured":
        transcript = (payload.get("transcript") or "").strip()
        confidence = payload.get("confidence")
        if not transcript:
            session.failure_reason = "no_speech"
            session.step = "repeat"
            reply = ivr_prompt(session.language_code, "retry")
        else:
            session.transcript = transcript
            session.transcript_confidence = confidence
            if confidence is not None and confidence < LOW_CONFIDENCE:
                session.failure_reason = "low_confidence"
                session.step = "repeat"
                reply = ivr_prompt(session.language_code, "retry")
            else:
                session.status = VoiceSessionStatus.TRANSCRIBED
                session.failure_reason = None
                session.step = "confirm"
                reply = ivr_prompt(session.language_code, "describe")
    elif event in {"call.completed", "call.disconnected"}:
        if session.status != VoiceSessionStatus.SUBMITTED:
            session.status = (
                VoiceSessionStatus.TRANSCRIBED if session.transcript else VoiceSessionStatus.ABANDONED
            )
            if not session.transcript:
                session.failure_reason = session.failure_reason or "no_speech"
        reply = ivr_prompt(session.language_code, "confirm")
    elif event == "call.failed":
        session.status = VoiceSessionStatus.FAILED
        session.failure_reason = payload.get("reason") or "provider_error"
        reply = ivr_prompt(session.language_code, "retry")
    else:
        raise HTTPException(status_code=422, detail=f"Unsupported event '{event}'.")

    db.commit()
    return {
        "ok": True,
        "verification": verification,
        "provider": provider,
        "reply_text": reply,
        "session_status": session.status.value,
        "step": session.step,
        "note": (
            "Live provider event processed."
            if provider == "live"
            else "Simulated/unverified event in demo mode - no live call was placed."
        ),
    }
