from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.dependencies import current_user, security
from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.repositories.auth_repository import AuthRepository
from app.core.config import get_settings
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, RegisterResponse, TokenResponse, UserResponse, VerifyEmailRequest
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = AuthService(db).register_patient(payload)
    verification_token = getattr(user, "verification_token_for_testing", None) if get_settings().debug else None
    db.commit()
    return RegisterResponse.model_validate(user).model_copy(
        update={"role_code": "PASIEN", "verification_token": verification_token}
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    tokens = AuthService(db).login(payload, request.client.host if request.client else None, request.headers.get("user-agent"))
    db.commit()
    return tokens


@router.post("/logout", response_model=MessageResponse)
def logout(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    AuthService(db).logout(credentials.credentials)
    db.commit()
    return {"message": "Logout berhasil"}


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    AuthService(db).verify_email(payload.token)
    db.commit()
    return {"message": "Email berhasil diverifikasi"}


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    tokens = AuthService(db).refresh(payload.refresh_token)
    db.commit()
    return tokens


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(current_user)):
    return UserResponse.model_validate(user).model_copy(update={"role_code": user.role.code})


@router.get("/users", response_model=list[UserResponse])
def users(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    rows = AuthRepository(db).list_active_users_by_roles(["ADMIN", "APOTEKER", "KASIR", "PASIEN"])
    return [UserResponse.model_validate(row).model_copy(update={"role_code": row.role.code if row.role else None}) for row in rows]
