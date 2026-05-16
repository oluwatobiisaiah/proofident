from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8001
    host: str = "0.0.0.0"
    env: str = "development"
    log_level: str = "info"
    model_dir: str = "src/data/models"
    api_key: str = ""
    allowed_origins: str = "*"
    redis_url: str = "redis://localhost:6379"
    tesseract_binary_path: str = "tesseract"
    ocr_provider_primary: str = "tesseract"
    ocr_provider_fallback: str = "none"
    ocr_http_url: str | None = None
    ocr_http_token: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def model_path(self) -> Path:
        return Path(self.model_dir) / "credit_model.joblib"

    @property
    def auth_enabled(self) -> bool:
        return bool(self.api_key)

    @property
    def cors_origins(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def redis_connection(self) -> dict[str, str | int | None]:
        parsed = urlparse(self.redis_url)
        return {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 6379,
            "password": parsed.password,
            "db": int((parsed.path or "/0").strip("/") or "0"),
        }


settings = Settings()
