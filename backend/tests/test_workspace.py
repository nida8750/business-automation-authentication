from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_token
from app.db.session import SessionLocal
from app.models.user import User, UserRole

AUTH = "/api/v1/auth"
AGENTS = "/api/v1/agents"
INTEGRATIONS = "/api/v1/integrations"
TEAM = "/api/v1/team"
BILLING = "/api/v1/billing"
ANALYTICS = "/api/v1/analytics"


def _email() -> str:
    return f"ws-{uuid4().hex[:10]}@nexusflow.dev"


def _register(client: TestClient, email: str, password: str = "secret123") -> dict:
    response = client.post(
        f"{AUTH}/register",
        json={"email": email, "password": password, "full_name": "Ada Lovelace"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _force_verify(email: str) -> str:
    raw = f"verify-{uuid4().hex}"
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user.email_verification_hash = hash_token(raw)
        user.email_verification_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
    finally:
        db.close()
    return raw


def _login_headers(client: TestClient, *, admin: bool = False) -> dict[str, str]:
    email = _email()
    _register(client, email)
    raw = _force_verify(email)
    verified = client.post(f"{AUTH}/verify-email", json={"token": raw})
    assert verified.status_code == 200, verified.text
    if admin:
        db = SessionLocal()
        try:
            user = db.scalar(select(User).where(User.email == email))
            assert user is not None
            user.role = UserRole.ADMIN
            db.commit()
        finally:
            db.close()
    tokens = client.post(f"{AUTH}/login", json={"email": email, "password": "secret123"})
    assert tokens.status_code == 200, tokens.text
    return {"Authorization": f"Bearer {tokens.json()['access_token']}"}


def test_plans_are_public(client: TestClient) -> None:
    response = client.get(f"{BILLING}/plans")
    assert response.status_code == 200, response.text
    codes = {row["code"] for row in response.json()}
    assert codes == {"starter", "growth", "enterprise"}


def test_agents_deploy_and_core_cannot_pause(client: TestClient) -> None:
    headers = _login_headers(client)
    listed = client.get(AGENTS, headers=headers)
    assert listed.status_code == 200, listed.text
    slugs = {row["slug"] for row in listed.json()["items"]}
    assert "supervisor" in slugs
    paused = client.post(f"{AGENTS}/supervisor/pause", headers=headers)
    assert paused.status_code == 400
    extra = client.post(f"{AGENTS}/sales/deploy", headers=headers)
    assert extra.status_code == 200
    assert extra.json()["status"] == "deployed"


def test_integrations_connect(client: TestClient) -> None:
    headers = _login_headers(client)
    listed = client.get(INTEGRATIONS, headers=headers)
    assert listed.status_code == 200, listed.text
    gmail = client.post(f"{INTEGRATIONS}/gmail/connect", headers=headers)
    assert gmail.status_code == 200
    assert gmail.json()["status"] == "connected"


def test_analytics_summary(client: TestClient) -> None:
    headers = _login_headers(client)
    response = client.get(f"{ANALYTICS}/summary", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert "kpis" in body
    assert body["leads_total"] >= 0


def test_team_invite_admin_only(client: TestClient) -> None:
    operator = _login_headers(client)
    blocked = client.post(
        f"{TEAM}/invite",
        headers=operator,
        json={"email": _email(), "full_name": "Omar", "role": "operator"},
    )
    assert blocked.status_code == 403
    admin = _login_headers(client, admin=True)
    invited = client.post(
        f"{TEAM}/invite",
        headers=admin,
        json={"email": _email(), "full_name": "Omar Farid", "role": "reviewer"},
    )
    assert invited.status_code == 200, invited.text
    assert invited.json()["user"]["role"] == "reviewer"
    assert invited.json()["temporary_password"].startswith("Invite")


def test_payment_method_and_subscribe(client: TestClient) -> None:
    headers = _login_headers(client)
    bad = client.post(
        f"{BILLING}/payment-methods",
        headers=headers,
        json={
            "holder_name": "Ada Lovelace",
            "card_number": "4242424242424241",
            "exp_month": 12,
            "exp_year": 2030,
            "cvc": "123",
        },
    )
    assert bad.status_code == 400
    added = client.post(
        f"{BILLING}/payment-methods",
        headers=headers,
        json={
            "holder_name": "Ada Lovelace",
            "card_number": "4242424242424242",
            "exp_month": 12,
            "exp_year": 2030,
            "cvc": "123",
        },
    )
    assert added.status_code == 200, added.text
    assert added.json()["last4"] == "4242"
    assert added.json()["brand"] == "visa"
    paid = client.post(f"{BILLING}/subscribe", headers=headers, json={"plan": "growth"})
    assert paid.status_code == 200, paid.text
    assert paid.json()["billing"]["plan"] == "growth"
    assert paid.json()["billing"]["status"] == "active"
    assert paid.json()["billing"]["invoices"]
    summary = client.get(f"{BILLING}/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["payment_methods"][0]["last4"] == "4242"
