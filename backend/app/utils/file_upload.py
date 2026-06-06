from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import AppException


ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


async def save_uploaded_image(file: UploadFile, category: str) -> str:
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not extension:
        raise AppException("File harus berupa gambar JPG, PNG, atau WEBP", "INVALID_IMAGE_TYPE")

    content = await file.read(MAX_IMAGE_SIZE + 1)
    if len(content) > MAX_IMAGE_SIZE:
        raise AppException("Ukuran gambar maksimal 5 MB", "IMAGE_TOO_LARGE")
    if not content:
        raise AppException("File gambar kosong", "EMPTY_IMAGE")

    upload_root = Path(get_settings().upload_dir).resolve()
    target_dir = upload_root / category
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    (target_dir / filename).write_bytes(content)
    return f"/uploads/{category}/{filename}"
