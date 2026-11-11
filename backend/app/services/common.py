from datetime import datetime, timezone


def aware(value: datetime | None) -> datetime | None:
    """SQLite drops timezone info; normalise everything to UTC-aware."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hours_since(value: datetime | None, reference: datetime | None = None) -> float:
    if value is None:
        return 0.0
    ref = reference or now_utc()
    return round((ref - aware(value)).total_seconds() / 3600, 1)
