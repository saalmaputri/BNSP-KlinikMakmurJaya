from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import EmailVerification, Role, User, UserSession
from app.repositories.base import BaseRepository


class AuthRepository(BaseRepository[User]):
    model = User

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def get_role_by_code(self, code: str) -> Role | None:
        return self.db.scalar(select(Role).where(Role.code == code, Role.deleted_at.is_(None)))

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).options(joinedload(User.role)).where(User.email == email.lower()))

    def get_user_with_role(self, user_id: str) -> User | None:
        return self.db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))

    def list_active_users_by_roles(self, role_codes: list[str]) -> list[User]:
        return list(
            self.db.scalars(
                select(User)
                .join(Role, Role.id == User.role_id)
                .where(
                    Role.code.in_(role_codes),
                    User.status == "active",
                    User.deleted_at.is_(None),
                )
            )
        )

    def create_session(self, session: UserSession) -> UserSession:
        return self.add(session)

    def revoke_session_by_hash(self, token_hash: str, reason: str) -> int:
        session = self.db.scalar(select(UserSession).where(UserSession.session_token_hash == token_hash, UserSession.revoked_at.is_(None)))
        if not session:
            return 0
        session.revoked_at = datetime.now(timezone.utc)
        session.revoke_reason = reason
        self.db.flush()
        return 1

    def get_active_session_by_refresh_hash(self, token_hash: str) -> UserSession | None:
        now = datetime.now(timezone.utc)
        return self.db.scalar(
            select(UserSession).where(
                UserSession.refresh_token_hash == token_hash,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
        )

    def create_email_verification(self, verification: EmailVerification) -> EmailVerification:
        return self.add(verification)

    def get_email_verification(self, token_hash: str) -> EmailVerification | None:
        now = datetime.now(timezone.utc)
        return self.db.scalar(
            select(EmailVerification).where(
                EmailVerification.token_hash == token_hash,
                EmailVerification.verified_at.is_(None),
                EmailVerification.expires_at > now,
            )
        )
