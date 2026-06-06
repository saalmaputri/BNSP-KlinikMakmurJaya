import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AppException, UnauthorizedException
from app.models.entities import EmailVerification, User, UserSession
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.utils.security import JWTManager, PasswordHasher, TokenHasher


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AuthRepository(db)
        self.passwords = PasswordHasher()
        self.jwt = JWTManager()
        self.settings = get_settings()

    def register_patient(self, payload: RegisterRequest) -> User:
        if self.repo.get_user_by_email(payload.email):
            raise AppException("Email sudah terdaftar", "EMAIL_EXISTS")
        role = self.repo.get_role_by_code("PASIEN")
        if not role:
            raise AppException("Role PASIEN belum tersedia", "ROLE_NOT_FOUND")
        user = User(
            role_id=role.id,
            full_name=payload.full_name,
            email=payload.email.lower(),
            phone=payload.phone,
            password_hash=self.passwords.hash(payload.password),
            address=payload.address,
            status="pending_verification",
        )
        self.repo.add(user)
        raw_token = secrets.token_urlsafe(32)
        verification = EmailVerification(
            user_id=user.id,
            token_hash=TokenHasher.hash(raw_token),
            email=user.email,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        self.repo.create_email_verification(verification)
        user.verification_token_for_testing = raw_token
        return user

    def login(self, payload: LoginRequest, ip_address: str | None = None, user_agent: str | None = None) -> TokenResponse:
        user = self.repo.get_user_by_email(payload.email)
        if not user or not self.passwords.verify(payload.password, user.password_hash):
            raise UnauthorizedException("Email atau password salah")
        if user.status not in ("active", "pending_verification"):
            raise UnauthorizedException("Akun tidak aktif")
        role_code = user.role.code
        access = self.jwt.create_access_token(str(user.id), role_code)
        refresh = self.jwt.create_refresh_token(str(user.id), role_code)
        expires = datetime.now(timezone.utc) + timedelta(minutes=self.settings.session_timeout_minutes)
        self.repo.create_session(
            UserSession(
                user_id=user.id,
                session_token_hash=TokenHasher.hash(access),
                refresh_token_hash=TokenHasher.hash(refresh),
                ip_address=ip_address,
                user_agent=user_agent,
                expires_at=expires,
            )
        )
        user.last_login_at = datetime.now(timezone.utc)
        return TokenResponse(access_token=access, refresh_token=refresh)

    def verify_email(self, token: str) -> None:
        verification = self.repo.get_email_verification(TokenHasher.hash(token))
        if not verification:
            raise AppException("Token verifikasi tidak valid", "INVALID_VERIFICATION_TOKEN")
        user = self.repo.get(verification.user_id)
        if not user:
            raise AppException("User tidak ditemukan", "USER_NOT_FOUND")
        verification.verified_at = datetime.now(timezone.utc)
        user.email_verified_at = verification.verified_at
        user.status = "active"

    def refresh(self, refresh_token: str) -> TokenResponse:
        payload = self.jwt.decode(refresh_token, expected_type="refresh")
        session = self.repo.get_active_session_by_refresh_hash(TokenHasher.hash(refresh_token))
        if not session:
            raise UnauthorizedException("Refresh token tidak aktif")
        user = self.repo.get_user_with_role(payload["sub"])
        if not user:
            raise UnauthorizedException("User tidak ditemukan")
        access = self.jwt.create_access_token(str(user.id), user.role.code)
        new_refresh = self.jwt.create_refresh_token(str(user.id), user.role.code)
        session.session_token_hash = TokenHasher.hash(access)
        session.refresh_token_hash = TokenHasher.hash(new_refresh)
        session.last_activity_at = datetime.now(timezone.utc)
        return TokenResponse(access_token=access, refresh_token=new_refresh)

    def logout(self, access_token: str) -> None:
        self.repo.revoke_session_by_hash(TokenHasher.hash(access_token), "LOGOUT")
