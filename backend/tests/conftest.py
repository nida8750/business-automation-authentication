import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.core.rate_limit import reset_auth_rate_limit
from app.db.base import Base
from app.db.session import SessionLocal
from app.main import app
from app.workers.celery_app import celery_app

settings.celery_task_always_eager = True
settings.auth_auto_verify = False
# Never contact services configured in a developer's local .env while testing.
settings.smtp_host = ""
settings.smtp_user = ""
settings.smtp_password = ""
settings.crm_base_url = ""
settings.crm_api_key = ""
celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True

test_engine = create_engine(
    "sqlite+pysqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(test_engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    dbapi_connection.execute("PRAGMA foreign_keys=ON")


SessionLocal.configure(bind=test_engine)


@pytest.fixture(autouse=True)
def isolated_database() -> None:
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client() -> TestClient:
    reset_auth_rate_limit()
    with TestClient(app) as test_client:
        yield test_client
