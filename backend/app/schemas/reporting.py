from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DateRangeRequest(BaseModel):
    start_date: date
    end_date: date


class SalesReportRow(BaseModel):
    period: str
    total_orders: int
    gross_sales: Decimal
    paid_sales: Decimal


class JobResponse(BaseModel):
    id: UUID
    status: str
    file_url: str | None = None
    error_message: str | None = None

    model_config = ConfigDict(from_attributes=True)
