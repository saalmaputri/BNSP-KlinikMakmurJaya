import html
from pathlib import Path

from app.core.exceptions import AppException


class InputSanitizer:
    @staticmethod
    def clean_text(value: str | None) -> str | None:
        if value is None:
            return None
        return html.escape(value.strip())


class FileValidator:
    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
    DOCUMENT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
    IMPORT_EXTENSIONS = {".csv", ".xlsx", ".xls"}

    @staticmethod
    def validate_extension(filename: str, allowed: set[str]) -> None:
        ext = Path(filename).suffix.lower()
        if ext not in allowed:
            raise AppException("Format file tidak diizinkan", "INVALID_FILE_TYPE")
