from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    executor_port: int = Field(default=8010, alias="EXECUTOR_PORT")
    executor_shared_token: str = Field(alias="EXECUTOR_SHARED_TOKEN")
    executor_max_output_bytes: int = Field(default=24_000, alias="EXECUTOR_MAX_OUTPUT_BYTES")
    executor_timeout_seconds: int = Field(default=10, alias="EXECUTOR_TIMEOUT_SECONDS")
    executor_memory_limit: str = Field(default="256m", alias="EXECUTOR_MEMORY_LIMIT")
    executor_cpu_limit: float = Field(default=1.0, alias="EXECUTOR_CPU_LIMIT")
    executor_pids_limit: int = Field(default=64, alias="EXECUTOR_PIDS_LIMIT")
    executor_tmp_root: str = "/tmp/executor"

    @property
    def tmp_root_path(self) -> Path:
        path = Path(self.executor_tmp_root)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()