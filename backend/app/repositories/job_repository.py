from uuid import UUID

from app.models.entities import ImportJob, PaymentJob, ReportJob
from app.repositories.base import BaseRepository


class ImportJobRepository(BaseRepository[ImportJob]):
    model = ImportJob


class ReportJobRepository(BaseRepository[ReportJob]):
    model = ReportJob


class PaymentJobRepository(BaseRepository[PaymentJob]):
    model = PaymentJob
