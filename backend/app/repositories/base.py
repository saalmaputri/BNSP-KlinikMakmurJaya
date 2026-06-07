from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, entity_id: UUID) -> ModelT | None:
        return self.db.get(self.model, entity_id)

    def add(self, entity: ModelT) -> ModelT:
        self.db.add(entity)
        self.db.flush()
        self.db.refresh(entity)
        return entity

    def delete_soft(self, entity: ModelT) -> ModelT:
        if hasattr(entity, "deleted_at"):
            from datetime import datetime, timezone

            entity.deleted_at = datetime.now(timezone.utc)
            self.db.flush()
        return entity

    def paginate(self, stmt: Select, page: int = 1, page_size: int = 20) -> tuple[list[ModelT], int]:
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = self.db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).unique().scalars().all()
        return list(items), total
