from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list


class TimestampSchema(ORMModel):
    id: UUID
    created_at: datetime
    updated_at: datetime


Money = Decimal
