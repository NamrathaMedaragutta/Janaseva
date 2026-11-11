from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Category, Complaint, Department, Hospital
from app.schemas import (
    CategoryOut,
    DepartmentOut,
    HospitalPublic,
    PublicComplaintStatus,
    PublicHistoryOut,
    PublicMeta,
)
from app.services.common import aware

router = APIRouter(prefix="/public", tags=["Public"])


@router.get("/meta", response_model=PublicMeta)
def public_meta(
    hospital_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PublicMeta:
    hospital = (
        db.get(Hospital, hospital_id)
        if hospital_id
        else db.scalar(select(Hospital).where(Hospital.is_active.is_(True)).order_by(Hospital.name.asc()))
    )
    if hospital is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not configured.")

    categories = db.scalars(
        select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order.asc())
    ).all()
    departments = db.scalars(
        select(Department)
        .where(Department.hospital_id == hospital.id, Department.is_active.is_(True))
        .order_by(Department.name.asc())
    ).all()

    return PublicMeta(
        hospital=HospitalPublic.model_validate(hospital),
        categories=[CategoryOut.model_validate(c) for c in categories],
        departments=[DepartmentOut.model_validate(d) for d in departments],
    )


@router.get("/complaints/{reference_id}", response_model=PublicComplaintStatus)
def track_complaint(reference_id: str, db: Session = Depends(get_db)) -> PublicComplaintStatus:
    complaint = db.scalar(select(Complaint).where(Complaint.reference_id == reference_id.strip().upper()))
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No complaint found for this reference ID. Please check the ID printed on your acknowledgement.",
        )

    # Public payload intentionally excludes complainant name, phone number and internal notes.
    timeline = [
        PublicHistoryOut(
            new_status=entry.new_status,
            action_note=entry.action_note,
            created_at=aware(entry.created_at),
        )
        for entry in complaint.history
        if entry.is_public
    ]

    return PublicComplaintStatus(
        reference_id=complaint.reference_id,
        status=complaint.status,
        category_name=complaint.category.name_en,
        category_name_kn=complaint.category.name_kn,
        department_name=complaint.department.name if complaint.department else None,
        submission_channel=complaint.submission_channel,
        created_at=aware(complaint.created_at),
        updated_at=aware(complaint.updated_at),
        resolved_at=aware(complaint.resolved_at),
        closed_at=aware(complaint.closed_at),
        hospital_name=complaint.hospital.name,
        timeline=timeline,
        language_code=complaint.language_code,
    )
