import hashlib
import re
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.exceptions import AppException, UnauthorizedException


class PasswordHasher:
    def __init__(self) -> None:
        self.context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

    def hash(self, password: str) -> str:
        PasswordValidator.validate_strength(password)
        return self.context.hash(password)

    def verify(self, plain_password: str, password_hash: str) -> bool:
        return self.context.verify(plain_password, password_hash)


class PasswordValidator:
    @staticmethod
    def validate_strength(password: str) -> None:
        if len(password) < 8:
            raise AppException("Password minimal 8 karakter", "WEAK_PASSWORD")
        if not re.search(r"[A-Z]", password):
            raise AppException("Password harus memiliki huruf besar", "WEAK_PASSWORD")
        if not re.search(r"[a-z]", password):
            raise AppException("Password harus memiliki huruf kecil", "WEAK_PASSWORD")
        if not re.search(r"\d", password):
            raise AppException("Password harus memiliki angka", "WEAK_PASSWORD")


class TokenHasher:
    @staticmethod
    def hash(value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()


class JWTManager:
    def __init__(self) -> None:
        self.settings = get_settings()

    def create_access_token(self, subject: str, role: str) -> str:
        expires = datetime.now(timezone.utc) + timedelta(minutes=self.settings.access_token_expire_minutes)
        payload = {"sub": subject, "role": role, "type": "access", "exp": expires, "jti": str(uuid4())}
        return jwt.encode(payload, self.settings.jwt_secret_key, algorithm=self.settings.jwt_algorithm)

    def create_refresh_token(self, subject: str, role: str) -> str:
        expires = datetime.now(timezone.utc) + timedelta(days=self.settings.refresh_token_expire_days)
        payload = {"sub": subject, "role": role, "type": "refresh", "exp": expires, "jti": str(uuid4())}
        return jwt.encode(payload, self.settings.jwt_secret_key, algorithm=self.settings.jwt_algorithm)

    def decode(self, token: str, expected_type: str = "access") -> dict:
        try:
            payload = jwt.decode(token, self.settings.jwt_secret_key, algorithms=[self.settings.jwt_algorithm])
        except JWTError as exc:
            raise UnauthorizedException("Token tidak valid") from exc
        if payload.get("type") != expected_type:
            raise UnauthorizedException("Jenis token tidak valid")
        return payload
