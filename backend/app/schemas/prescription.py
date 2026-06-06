from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel


class PrescriptionUploadRequest(BaseModel):
    order_id: UUID
    doctor_name: str = Field(min_length=2, max_length=150)
    prescription_number: str = Field(min_length=2, max_length=100)
    file_url: str
    notes: str | None = None

    @field_validator("doctor_name", "prescription_number")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field wajib diisi")
        return value


class PrescriptionVerifyRequest(BaseModel):
    notes: str | None = None


class PrescriptionResponse(ORMModel):
    id: UUID
    order_id: UUID
    patient_id: UUID
    patient_name: str | None = None
    doctor_name: str | None
    prescription_number: str | None
    file_url: str
    status: str
    notes: str | None
    uploaded_at: datetime
