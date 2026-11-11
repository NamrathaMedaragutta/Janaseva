"""Telephony / IVR adapter.

`verify_webhook_signature` validates the provider signature when
VOICE_WEBHOOK_SECRET is configured. In development the webhook accepts
unsigned events but every such event is recorded with provider="simulation".
"""

import hashlib
import hmac

from app.core.config import settings


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> tuple[bool, str]:
    secret = settings.voice_webhook_secret
    if not secret:
        return True, "unsigned-demo"
    if not signature:
        return False, "missing-signature"
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if hmac.compare_digest(expected, signature.strip()):
        return True, "verified"
    return False, "invalid-signature"


def telephony_mode() -> str:
    return "live" if settings.voice_live else "simulation"


def ivr_prompt(language_code: str, step: str) -> str:
    """IVR prompt text (also used by the Kannada TTS adapter)."""
    prompts = {
        "kn": {
            "welcome": "ನಮಸ್ಕಾರ. ಇದು ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ ಸೇವಾ ದೂರು ಸಾಲು. ತುರ್ತು ಸೇವೆಗೆ ಇದು ಅಲ್ಲ.",
            "language": "ಕನ್ನಡಕ್ಕಾಗಿ ಒಂದನ್ನು ಒತ್ತಿರಿ. ಇಂಗ್ಲಿಷ್‌ಗಾಗಿ ಎರಡನ್ನು ಒತ್ತಿರಿ.",
            "describe": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಹೇಳಿ.",
            "confirm": "ನಿಮ್ಮ ದೂರು ದಾಖಲಾಗಿದೆ. ಧನ್ಯವಾದ.",
            "retry": "ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.",
        },
        "en": {
            "welcome": "Welcome. This is the government hospital service grievance line. This is not an emergency line.",
            "language": "Press one for Kannada. Press two for English.",
            "describe": "Please describe your issue after the beep.",
            "confirm": "Your grievance has been registered. Thank you.",
            "retry": "Sorry, we could not hear you clearly. Please repeat your issue.",
        },
    }
    return prompts.get(language_code, prompts["en"]).get(step, "")
