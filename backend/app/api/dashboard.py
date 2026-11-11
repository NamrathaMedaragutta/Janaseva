from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models import (
    Complaint,
    ComplaintHistory,
    ComplaintStatus,
    Hospital,
    Role,
    User,
)
from app.schemas import (
    ActivityItem,
    DashboardResponse,
    DashboardSummary,
    NamedCount,
    TrendPoint,
    TrendsResponse,
)
from app.services.common import aware, hours_since, now_utc
from app.services.complaints import ACTIVE_STATUSES, is_overdue, list_item

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

RESOLVED_STATUSES = (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)


def _hospital_for(db: Session, user: User, hospital_id: str | None) -> Hospital:
    from fastapi import HTTPException

    target = hospital_id or user.hospital_id
    hospital = db.get(Hospital, target) if target else None
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not configured for this account.")
    if user.role != Role.ADMIN and hospital.id != user.hospital_id:
        raise HTTPException(status_code=403, detail="You do not have access to this hospital.")
    return hospital


def _scoped_complaints(db: Session, user: User, hospital: Hospital) -> list[Complaint]:
    query = select(Complaint).where(Complaint.hospital_id == hospital.id)
    if user.role == Role.OFFICER:
        conditions = [Complaint.assigned_officer_id == user.id]
        if user.department_id:
            conditions.append(Complaint.department_id == user.department_id)
        query = query.where(conditions[0] | conditions[1])
    elif user.role == Role.OPERATOR:
        query = query.where(Complaint.created_by_id == user.id)
    return list(db.scalars(query).unique().all())


def build_summary(complaints: list[Complaint], hospital: Hospital) -> DashboardSummary:
    total = len(complaints)
    active = [c for c in complaints if c.status in ACTIVE_STATUSES]
    resolved = [c for c in complaints if c.status == ComplaintStatus.RESOLVED]
    closed = [c for c in complaints if c.status == ComplaintStatus.CLOSED]
    overdue = [c for c in active if is_overdue(c)]
    durations = [
        hours_since(c.created_at, aware(c.resolved_at))
        for c in complaints
        if c.resolved_at is not None
    ]
    return DashboardSummary(
        total=total,
        new=sum(1 for c in complaints if c.status == ComplaintStatus.SUBMITTED),
        in_progress=sum(
            1 for c in complaints if c.status in {ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED}
        ),
        pending=max(0, len(active) - len(overdue)),
        overdue=len(overdue),
        resolved=len(resolved),
        closed=len(closed),
        unassigned=sum(1 for c in active if c.assigned_officer_id is None),
        escalated=sum(1 for c in active if c.is_flagged),
        resolved_rate=round((len(resolved) + len(closed)) / total * 100, 1) if total else 0.0,
        avg_resolution_hours=round(sum(durations) / len(durations), 1) if durations else None,
        followup_hours=hospital.followup_hours,
        escalation_hours=hospital.escalation_hours,
    )


def build_trends(complaints: list[Complaint], days: int) -> TrendsResponse:
    today = now_utc().date()
    start = today - timedelta(days=days - 1)
    buckets: dict[str, dict[str, int]] = {}
    for offset in range(days):
        key = (start + timedelta(days=offset)).isoformat()
        buckets[key] = {"received": 0, "resolved": 0}

    for complaint in complaints:
        created = aware(complaint.created_at).date().isoformat()
        if created in buckets:
            buckets[created]["received"] += 1
        if complaint.resolved_at is not None:
            resolved_day = aware(complaint.resolved_at).date().isoformat()
            if resolved_day in buckets:
                buckets[resolved_day]["resolved"] += 1

    by_category: dict[str, NamedCount] = {}
    by_department: dict[str, NamedCount] = {}
    by_status: dict[str, NamedCount] = {}
    for complaint in complaints:
        cat_name = complaint.category.name_en
        existing = by_category.get(cat_name)
        by_category[cat_name] = NamedCount(
            name=cat_name,
            name_kn=complaint.category.name_kn,
            value=(existing.value if existing else 0) + 1,
        )
        dept_name = complaint.department.name if complaint.department else "Unassigned / review"
        dept = by_department.get(dept_name)
        by_department[dept_name] = NamedCount(name=dept_name, value=(dept.value if dept else 0) + 1)
        status_name = complaint.status.value.replace("_", " ").title()
        st = by_status.get(status_name)
        by_status[status_name] = NamedCount(name=status_name, value=(st.value if st else 0) + 1)

    return TrendsResponse(
        range_days=days,
        points=[
            TrendPoint(date=key, received=value["received"], resolved=value["resolved"])
            for key, value in buckets.items()
        ],
        by_category=sorted(by_category.values(), key=lambda item: item.value, reverse=True),
        by_department=sorted(by_department.values(), key=lambda item: item.value, reverse=True),
        by_status=sorted(by_status.values(), key=lambda item: item.value, reverse=True),
    )


@router.get("/summary", response_model=DashboardSummary)
def summary(
    hospital_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardSummary:
    hospital = _hospital_for(db, user, hospital_id)
    return build_summary(_scoped_complaints(db, user, hospital), hospital)


@router.get("/trends", response_model=TrendsResponse)
def trends(
    hospital_id: str | None = Query(default=None),
    days: int = Query(default=30, ge=7, le=180),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TrendsResponse:
    hospital = _hospital_for(db, user, hospital_id)
    return build_trends(_scoped_complaints(db, user, hospital), days)


@router.get("", response_model=DashboardResponse)
def dashboard(
    hospital_id: str | None = Query(default=None),
    days: int = Query(default=30, ge=7, le=180),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardResponse:
    hospital = _hospital_for(db, user, hospital_id)
    complaints = _scoped_complaints(db, user, hospital)

    ordered = sorted(complaints, key=lambda c: aware(c.created_at), reverse=True)
    active = [c for c in complaints if c.status in ACTIVE_STATUSES]
    overdue = sorted([c for c in active if is_overdue(c)], key=lambda c: aware(c.created_at))
    pending = sorted([c for c in active if not is_overdue(c)], key=lambda c: aware(c.created_at))

    allowed_ids = {c.id for c in complaints}
    history_rows = (
        db.scalars(
            select(ComplaintHistory)
            .where(ComplaintHistory.complaint_id.in_(allowed_ids))
            .order_by(ComplaintHistory.created_at.desc())
            .limit(12)
        ).all()
        if allowed_ids
        else []
    )
    by_id = {c.id: c for c in complaints}
    activity = [
        ActivityItem(
            reference_id=by_id[row.complaint_id].reference_id,
            category_name=by_id[row.complaint_id].category.name_en,
            status=by_id[row.complaint_id].status,
            action=row.event_type.replace("_", " "),
            actor=row.updated_by_name,
            created_at=aware(row.created_at),
        )
        for row in history_rows
        if row.complaint_id in by_id
    ]

    return DashboardResponse(
        summary=build_summary(complaints, hospital),
        trends=build_trends(complaints, days),
        recent=[list_item(c) for c in ordered[:8]],
        pending=[list_item(c) for c in pending[:6]],
        overdue=[list_item(c) for c in overdue[:6]],
        activity=activity,
    )
