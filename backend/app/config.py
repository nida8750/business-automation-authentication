from functools import lru_cache
from pathlib import Path
from pydantic import Field, computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT_DIR / ".env"
class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env."""
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )
    app_name: str = "NexusFlow"
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_v1_prefix: str = "/api/v1"
    frontend_origin: str = "http://localhost:5173"
    vite_api_base_url: str = "http://localhost:8000/api/v1"
    postgres_user: str = "nexusflow"
    postgres_password: str = "nexusflow_dev_password"
    postgres_db: str = "nexusflow"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url: str = (
        "postgresql+psycopg://nexusflow:nexusflow_dev_password@localhost:5432/nexusflow"
    )
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    celery_task_always_eager: bool = False
    jwt_secret_key: str = "change_me_to_a_long_random_dev_secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: int = 60
    agent_max_research_results: int = 5
    agent_run_timeout_seconds: int = 180
    agent_max_retries: int = 2
    require_approval_for_email: bool = True
    require_approval_for_crm: bool = True
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@example.com"
    crm_base_url: str = ""
    crm_api_key: str = ""
    n8n_webhook_secret: str = "change_me_n8n_webhook_secret"
    cors_origins: str = "http://localhost:5173"
    rate_limit_per_minute: int = Field(default=60, ge=1)
    auth_rate_limit_per_minute: int = Field(default=30, ge=1)
    login_max_failed_attempts: int = Field(default=5, ge=1)
    login_lockout_minutes: int = Field(default=15, ge=1)
    password_reset_ttl_hours: int = Field(default=1, ge=1)
    bootstrap_admin_email: str = ""
    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    @computed_field
    @property
    def is_development(self) -> bool:
        return self.app_env.lower() in {"dev", "development", "local"}
    @computed_field
    @property
    def env_file_path(self) -> str:
        return str(ENV_FILE)
    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env.lower() == "production":
            if self.jwt_secret_key.startswith("change_me") or len(self.jwt_secret_key) < 32:
                raise ValueError("JWT_SECRET_KEY must be a real secret of at least 32 characters in production.")
            if self.n8n_webhook_secret.startswith("change_me"):
                raise ValueError("N8N_WEBHOOK_SECRET must be a real secret in production.")
        return self
@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
settings = get_settings()
