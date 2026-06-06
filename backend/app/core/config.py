from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Klinik Makmur Jaya API"
    environment: str = "development"
    debug: bool = True
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/klinik_makmur_jaya"
    jwt_secret_key: str = "change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    session_timeout_minutes: int = 120
    redis_url: str = "redis://localhost:6379/0"
    upload_dir: str = "uploads"
    report_dir: str = "reports"
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://172.20.10.3:5173,https://frontend-domain-deploy.com"
    backend_cors_origin_regex: str | None = r"http://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+):\d+"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.backend_cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
