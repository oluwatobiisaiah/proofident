from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8001
    host: str = "0.0.0.0"
    env: str = "development"
    log_level: str = "info"
    model_dir: str = "src/data/models"
    api_key: str = ""
    allowed_origins: str = "*"

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


settings = Settings()
