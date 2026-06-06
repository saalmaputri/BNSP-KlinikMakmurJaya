import time
from pathlib import Path

import psutil
import redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings


class MonitoringService:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        self.settings = get_settings()

    def health(self) -> dict:
        started = time.perf_counter()
        return {
            "application": self.settings.app_name,
            "environment": self.settings.environment,
            "status": "ok",
            "response_time_ms": self._elapsed_ms(started),
        }

    def resources(self) -> dict:
        started = time.perf_counter()
        disk = psutil.disk_usage(str(Path.cwd().anchor or Path.cwd()))
        memory = psutil.virtual_memory()
        return {
            "status": "ok",
            "cpu": {
                "usage_percent": psutil.cpu_percent(interval=0.1),
                "core_count": psutil.cpu_count(logical=True),
            },
            "ram": {
                "total_bytes": memory.total,
                "used_bytes": memory.used,
                "available_bytes": memory.available,
                "usage_percent": memory.percent,
            },
            "storage": {
                "total_bytes": disk.total,
                "used_bytes": disk.used,
                "free_bytes": disk.free,
                "usage_percent": disk.percent,
            },
            "response_time_ms": self._elapsed_ms(started),
        }

    def database(self) -> dict:
        started = time.perf_counter()
        try:
            assert self.db is not None
            self.db.execute(text("SELECT 1"))
            return {
                "status": "ok",
                "connection": "connected",
                "response_time_ms": self._elapsed_ms(started),
            }
        except Exception as exc:
            return {
                "status": "error",
                "connection": "disconnected",
                "error": str(exc),
                "response_time_ms": self._elapsed_ms(started),
            }

    def redis(self) -> dict:
        started = time.perf_counter()
        client = redis.Redis.from_url(self.settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
        try:
            client.ping()
            return {
                "status": "ok",
                "connection": "connected",
                "response_time_ms": self._elapsed_ms(started),
            }
        except Exception as exc:
            return {
                "status": "error",
                "connection": "disconnected",
                "error": str(exc),
                "response_time_ms": self._elapsed_ms(started),
            }
        finally:
            client.close()

    @staticmethod
    def _elapsed_ms(started: float) -> float:
        return round((time.perf_counter() - started) * 1000, 2)
