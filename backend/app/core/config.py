from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / backend/.env."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "JANASEVA Hospital Grievance Monitoring System"
    app_env: str = "development"
    api_prefix: str = "/api"

    # SQLite is used for the local demo when no PostgreSQL URL is configured.
    # PostgreSQL is the production target: postgresql+psycopg://user:pass@host/db
    database_url: str = f"sqlite:///{(BASE_DIR / 'janaseva.db').as_posix()}"

    jwt_secret_key: str = "dev-only-change-me-8f4c1f0a2b9d4c6e8a7b5d3c1e0f9a8b"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 480

    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Voice / IVR integration. When credentials are absent the platform runs in
    # clearly labelled simulation mode (no simulated result is ever presented as live).
    telephony_provider: str = ""
    telephony_account_id: str = ""
    telephony_auth_token: str = ""
    telephony_phone_number: str = ""
    voice_webhook_secret: str = ""

    speech_to_text_provider: str = ""
    speech_to_text_api_key: str = ""
    text_to_speech_provider: str = ""
    text_to_speech_api_key: str = ""

    sms_provider: str = ""
    sms_api_key: str = ""
    sms_sender_id: str = ""

    seed_demo_data: bool = True
    demo_password: str = "Janaseva@123"

    @field_validator("database_url", mode="after")
    @classmethod
    def _normalise_database_url(cls, value: str) -> str:
        """Accept the URL forms hosting platforms emit (postgres://, postgresql://)
        and keep SQLite as the default when the variable is blank."""
        if not value.strip():
            return f"sqlite:///{(BASE_DIR / 'janaseva.db').as_posix()}"
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value[len("postgres://") :]
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value[len("postgresql://") :]
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def voice_live(self) -> bool:
        """True only when a real telephony provider is fully configured."""
        return bool(self.telephony_provider and self.telephony_account_id and self.telephony_auth_token)

    @property
    def sms_live(self) -> bool:
        return bool(self.sms_provider and self.sms_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
