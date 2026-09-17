import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.core.rate_limit import reset_auth_rate_limit
from app.main import app
from app.workers.celery_app import celery_app

settings.celery_task_always_eager = True
celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True


@pytest.fixture
def client() -> TestClient:
    reset_auth_rate_limit()
    with TestClient(app) as test_client:
        yield test_client
