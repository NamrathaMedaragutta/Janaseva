"""SMS provider adapter.

Only a real provider is used when SMS_PROVIDER and SMS_API_KEY are configured.
Otherwise the message is stored with status `simulated` and is never reported as
delivered. Adding a provider means implementing `_send_via_provider`.
"""

from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class SmsResult:
    delivered: bool
    simulated: bool
    provider: str
    detail: str


def send_sms(recipient: str, message: str) -> SmsResult:
    if not settings.sms_live:
        return SmsResult(
            delivered=False,
            simulated=True,
            provider="simulation",
            detail="SMS provider not configured - message recorded as simulated (demo mode).",
        )

    try:
        response = httpx.post(
            "https://api.exotel.com/v1/Accounts/{account}/Sms/send".format(account=settings.telephony_account_id),
            auth=(settings.telephony_account_id, settings.sms_api_key),
            data={
                "From": settings.sms_sender_id or settings.telephony_phone_number,
                "To": recipient,
                "Body": message,
            },
            timeout=10.0,
        )
        return SmsResult(
            delivered=response.status_code < 300,
            simulated=False,
            provider=settings.sms_provider,
            detail=f"HTTP {response.status_code}",
        )
    except httpx.HTTPError as exc:  # network / provider failure must not fake success
        return SmsResult(delivered=False, simulated=False, provider=settings.sms_provider, detail=str(exc))
