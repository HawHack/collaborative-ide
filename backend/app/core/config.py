from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    app_name: str = "Collaborative IDE API"
    app_env: Literal["development", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"

    sqlalchemy_database_uri: str = Field(alias="SQLALCHEMY_DATABASE_URI")
    async_sqlalchemy_database_uri: str = Field(alias="ASYNC_SQLALCHEMY_DATABASE_URI")
    redis_url: str = Field(alias="REDIS_URL")

    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_refresh_secret_key: str = Field(alias="JWT_REFRESH_SECRET_KEY")
    access_token_expire_minutes: int = Field(default=15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    secure_cookies: bool = Field(default=False, alias="SECURE_COOKIES")

    backend_cors_origins: str = Field(default="http://localhost:5173,http://localhost", alias="BACKEND_CORS_ORIGINS")
    executor_url: str = Field(alias="EXECUTOR_URL")
    executor_shared_token: str = Field(alias="EXECUTOR_SHARED_TOKEN")
    collab_url: str = Field(alias="COLLAB_URL")
    collab_internal_url: str = Field(alias="COLLAB_INTERNAL_URL")

    ai_provider: Literal["gemini", "openrouter", "openai_compatible"] = Field(
        default="gemini",
        alias="AI_PROVIDER",
    )
    ai_api_base_url: str = Field(default="", alias="AI_API_BASE_URL")
    ai_api_key: str = Field(default="", alias="AI_API_KEY")
    ai_model: str = Field(default="gemini-2.5-flash", alias="AI_MODEL")
    ai_site_url: str = Field(default="http://localhost", alias="AI_SITE_URL")
    ai_app_name: str = Field(default="Collaborative IDE", alias="AI_APP_NAME")

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()