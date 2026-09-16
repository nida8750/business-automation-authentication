import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import reset_auth_rate_limit
from app.main import app


@pytest.fixture
def client() -> TestClient:
    reset_auth_rate_limit()
    with TestClient(app) as test_client:
        yield test_client
