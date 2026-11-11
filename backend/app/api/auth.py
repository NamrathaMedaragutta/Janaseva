from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import client_ip, get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database.session import get_db
from app.models import User
from app.schemas import ChangePasswordRequest, LoginRequest, TokenResponse
from app.services.audit import log_audit
from app.services.common import now_utc
from app.services.complaints import user_brief

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        # Deliberately generic message - never reveal whether the account exists.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This staff account is inactive. Contact your administrator.",
        )
    if user.hospital_id is None and user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not linked to a hospital.")

    user.last_login_at = now_utc()
    token, expires_in = create_access_token(user.id, {"role": user.role.value, "hospital_id": user.hospital_id})
    log_audit(
        db,
        actor=user,
        action="login",
        entity_type="user",
        entity_id=user.id,
        detail={"role": user.role.value},
        ip_address=client_ip(request),
    )
    db.commit()
    return TokenResponse(access_token=token, expires_in=expires_in, user=user_brief(user))


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_brief(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    user.hashed_password = hash_password(payload.new_password)
    log_audit(
        db,
        actor=user,
        action="password_changed",
        entity_type="user",
        entity_id=user.id,
        ip_address=client_ip(request),
    )
    db.commit()
