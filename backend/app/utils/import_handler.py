from pathlib import Path

import pandas as pd

from app.core.exceptions import AppException


class ExcelImportHandler:
    REQUIRED_MEDICINE_COLUMNS = {"sku", "name", "category_id", "selling_price", "unit"}

    def read(self, file_path: str) -> pd.DataFrame:
        path = Path(file_path)
        if path.suffix.lower() == ".csv":
            return pd.read_csv(path)
        if path.suffix.lower() in {".xls", ".xlsx"}:
            return pd.read_excel(path)
        raise AppException("File import harus CSV atau Excel", "INVALID_IMPORT_FILE")

    def validate_medicines(self, df: pd.DataFrame) -> list[str]:
        missing = self.REQUIRED_MEDICINE_COLUMNS - set(df.columns)
        errors: list[str] = []
        if missing:
            errors.append(f"Kolom wajib tidak ada: {', '.join(sorted(missing))}")
        if "selling_price" in df.columns and (df["selling_price"] < 0).any():
            errors.append("Harga jual tidak boleh negatif")
        return errors
