from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.core.security import hash_password
from app.database.session import get_db
from app.models import (
    AuditLog,
    Category,
    Department,
    Hospital,
    Role,
    User,
)
from app.schemas import (
    AuditLogOut,
    CategoryOut,
    CategoryUpdate,
    DepartmentCreate,
    DepartmentOut,
    HospitalOut,
    ThresholdUpdate,
    UserAdminOut,
    UserCreate,
    UserUpdate,
)
from app.services.audit import log_audit

router = APIRouter(prefix="/admin", tags=["Administration"])


def _user_admin_out(user: User) -> UserAdminOut:
    data = UserAdminOut.model_validate(user)
    data.department_name = user.department.name if user.department else None
    return data


@router.get("/hospitals", response_model=list[HospitalOut])
def hospitals(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [HospitalOut.model_validate(h) for h in db.scalars(select(Hospital)).all()]


@router.get("/users", response_model=list[UserAdminOut])
def users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    role: Role | None = None,
    include_inactive: bool = True,
):
    query = select(User).where(User.hospital_id == admin.hospital_id)
    if role:
        query = query.where(User.role == role)
    if not include_inactive:
        query = query.where(User.is_active.is_(True))
    return [_user_admin_out(u) for u in db.scalars(query.order_by(User.full_name)).all()]


@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="A staff account already uses this email address.")
    if payload.role == Role.OFFICER and not payload.department_id:
        raise HTTPException(status_code=422, detail="Department officers must be linked to a department.")
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise HTTPException(status_code=404, detail="Department not found.")

    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        hospital_id=payload.hospital_id or admin.hospital_id,
        department_id=payload.department_id,
    )
    db.add(user)
    log_audit(
        db,
        actor=admin,
        action="user_created",
        entity_type="user",
        entity_id=user.id,
        detail={"role": user.role.value, "email": user.email},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(user)
    return _user_admin_out(user)


@router.patch("/users/{user_id}", response_model=UserAdminOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if user is None or user.hospital_id != admin.hospital_id:
        raise HTTPException(status_code=404, detail="Staff account not found.")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=422, detail="You cannot deactivate your own account.")
    if payload.role is not None:
        if user.id == admin.id and payload.role != Role.ADMIN:
            raise HTTPException(status_code=422, detail="You cannot remove your own administrator role.")
        user.role = payload.role
    if payload.department_id is not None:
        if payload.department_id and db.get(Department, payload.department_id) is None:
            raise HTTPException(status_code=404, detail="Department not found.")
        user.department_id = payload.department_id or None
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = hash_password(payload.password)
    if user.role == Role.OFFICER and user.department_id is None:
        raise HTTPException(status_code=422, detail="Department officers must be linked to a department.")

    log_audit(
        db,
        actor=admin,
        action="user_updated",
        entity_type="user",
        entity_id=user.id,
        detail={"role": user.role.value, "is_active": user.is_active},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(user)
    return _user_admin_out(user)


@router.get("/departments", response_model=list[DepartmentOut])
def departments(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = db.scalars(
        select(Department).where(Department.hospital_id == admin.hospital_id).order_by(Department.name)
    ).all()
    counts = dict(
        db.execute(
            select(User.department_id, func.count(User.id))
            .where(User.role == Role.OFFICER, User.is_active.is_(True))
            .group_by(User.department_id)
        ).all()
    )
    result = []
    for row in rows:
        item = DepartmentOut.model_validate(row)
        item.officer_count = counts.get(row.id, 0)
        result.append(item)
    return result


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    code = payload.code.upper().strip()
    existing = db.scalar(
        select(Department).where(Department.hospital_id == admin.hospital_id, Department.code == code)
    )
    if existing:
        raise HTTPException(status_code=409, detail="A department with this code already exists.")
    department = Department(
        hospital_id=admin.hospital_id,
        name=payload.name.strip(),
        code=code,
        description=payload.description,
    )
    db.add(department)
    log_audit(
        db,
        actor=admin,
        action="department_created",
        entity_type="department",
        entity_id=department.id,
        detail={"name": department.name, "code": code},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(department)
    return DepartmentOut.model_validate(department)


@router.get("/categories", response_model=list[CategoryOut])
def categories(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    rows = db.scalars(select(Category).order_by(Category.sort_order)).all()
    return [CategoryOut.model_validate(c) for c in rows]


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")
    if payload.default_department_id is not None:
        if payload.default_department_id:
            department = db.get(Department, payload.default_department_id)
            if department is None or department.hospital_id != admin.hospital_id:
                raise HTTPException(status_code=404, detail="Department not found for this hospital.")
            category.default_department_id = department.id
        else:
            category.default_department_id = None
    for field in ("name_en", "name_kn", "is_active", "keywords"):
        value = getattr(payload, field)
        if value is not None:
            setattr(category, field, value)

    log_audit(
        db,
        actor=admin,
        action="category_updated",
        entity_type="category",
        entity_id=category.id,
        detail={"name": category.name_en, "routing": category.default_department_id},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(category)
    return CategoryOut.model_validate(category)


@router.get("/settings")
def get_settings_(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    hospital = db.get(Hospital, admin.hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return {
        "hospital": HospitalOut.model_validate(hospital),
        "thresholds": {
            "followup_hours": hospital.followup_hours,
            "escalation_hours": hospital.escalation_hours,
        },
        "note": "Thresholds are configurable demo values agreed for this prototype, not statutory deadlines.",
    }


@router.put("/settings")
def update_settings(
    payload: ThresholdUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    hospital = db.get(Hospital, admin.hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    hospital.followup_hours = payload.followup_hours
    hospital.escalation_hours = payload.escalation_hours
    log_audit(
        db,
        actor=admin,
        action="thresholds_updated",
        entity_type="hospital",
        entity_id=hospital.id,
        detail=payload.model_dump(),
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {
        "followup_hours": hospital.followup_hours,
        "escalation_hours": hospital.escalation_hours,
        "note": "Thresholds are configurable demo values agreed for this prototype, not statutory deadlines.",
    }


@router.get("/audit-logs", response_model=list[AuditLogOut])
def audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    action: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if action:
        query = query.where(AuditLog.action == action)
    return [AuditLogOut.model_validate(row) for row in db.scalars(query).all()]
