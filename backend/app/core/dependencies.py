from collections.abc import Callable

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.database import get_db
from app.models.entities import User
from app.repositories.auth_repository import AuthRepository
from app.utils.security import JWTManager

security = HTTPBearer(auto_error=False)


class CurrentUserDependency:
    def __init__(self, required_roles: set[str] | None = None) -> None:
        self.required_roles = required_roles
        self.jwt = JWTManager()

    def __call__(self, credentials: HTTPAuthorizationCredentials | None = Depends(security), db: Session = Depends(get_db)) -> User:
        if not credentials:
            raise UnauthorizedException("Token wajib dikirim")
        payload = self.jwt.decode(credentials.credentials)
        user = AuthRepository(db).get_user_with_role(payload["sub"])
        if not user:
            raise UnauthorizedException("User tidak ditemukan")
        if self.required_roles and user.role.code not in self.required_roles:
            raise ForbiddenException("Role tidak memiliki akses")
        return user


current_user = CurrentUserDependency()


def require_roles(*roles: str) -> CurrentUserDependency:
    return CurrentUserDependency(set(roles))
