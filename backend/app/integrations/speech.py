"""Speech-to-text and text-to-speech adapters.

No provider credentials are present in the prototype, so these functions raise
`SpeechNotConfigured`. Callers must handle that explicitly and fall back to the
clearly labelled assisted/demo path - a transcription is never invented.
"""

from dataclasses import dataclass

from app.core.config import settings


class SpeechNotConfigured(RuntimeError):
    """Raised when no speech provider credentials are available."""


@dataclass
class TranscriptResult:
    text: str
    confidence: float
    provider: str
    language_code: str


def speech_mode() -> str:
    return "live" if settings.speech_to_text_api_key else "unconfigured"


def transcribe(audio_reference: str, language_code: str) -> TranscriptResult:
    if not settings.speech_to_text_api_key:
        raise SpeechNotConfigured(
            "No speech-to-text provider is configured. Set SPEECH_TO_TEXT_PROVIDER and "
            "SPEECH_TO_TEXT_API_KEY to enable live Kannada transcription."
        )
    raise SpeechNotConfigured(
        "Provider adapter not implemented for {provider}. Implement transcribe() for this provider.".format(
            provider=settings.speech_to_text_provider or "unknown"
        )
    )


def synthesise(text: str, language_code: str) -> bytes:
    if not settings.text_to_speech_api_key:
        raise SpeechNotConfigured(
            "No text-to-speech provider is configured. Set TEXT_TO_SPEECH_PROVIDER and "
            "TEXT_TO_SPEECH_API_KEY to enable spoken acknowledgements."
        )
    raise SpeechNotConfigured("Provider adapter not implemented for this text-to-speech provider.")
