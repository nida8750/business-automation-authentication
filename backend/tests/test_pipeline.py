from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import settings
from app.core.security import hash_token
from app.db.session import SessionLocal
from app.models.enums import ApprovalStatus, LeadStatus, OutboxStatus, RunStatus
from app.models.user import User, UserRole

AUTH = "/api/v1/auth"
LEADS = "/api/v1/leads"
RUNS = "/api/v1/runs"
APPROVALS = "/api/v1/approvals"
OUTBOX = "/api/v1/outbox"
DASHBOARD = "/api/v1/dashboard"
WEBHOOKS = "/api/v1/webhooks"


def _email() -> str:
    return f"ops-{uuid4().hex[:10]}@nexusflow.dev"


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


def _verified_admin(client: TestClient, password: str = "secret123") -> tuple[str, dict, dict]:
    email = _email()
    _register(client, email, password)
    raw = _force_verify(email)
    verified = client.post(f"{AUTH}/verify-email", json={"token": raw})
    assert verified.status_code == 200, verified.text
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user.role = UserRole.ADMIN
        db.commit()
        user_id = user.id
    finally:
        db.close()
    tokens = client.post(f"{AUTH}/login", json={"email": email, "password": password})
    assert tokens.status_code == 200, tokens.text
    headers = {"Authorization": f"Bearer {tokens.json()['access_token']}"}
    return email, {"id": str(user_id), **verified.json()}, headers


def test_create_lead_runs_agents_and_waits_for_approval(client: TestClient) -> None:
    _, _, headers = _verified_admin(client)
    created = client.post(
        LEADS,
        headers=headers,
        json={
            "email": "buyer@acme-industries.com",
            "full_name": "Casey Buyer",
            "company": "Acme Industries",
            "title": "VP Operations",
            "website": "https://acme.example",
            "notes": "Inbound from website form",
            "start_run": True,
        },
    )
    assert created.status_code == 201, created.text
    lead = created.json()
    assert lead["status"] == LeadStatus.AWAITING_APPROVAL.value

    inbox = client.get(f"{APPROVALS}?status=pending&lead_id={lead['id']}", headers=headers)
    assert inbox.status_code == 200, inbox.text
    items = inbox.json()["items"]
    assert len(items) == 2

    for approval in items:
        decided = client.post(
            f"{APPROVALS}/{approval['id']}/approve",
            headers=headers,
            json={"reason": "Looks good"},
        )
        assert decided.status_code == 200, decided.text

    lead_id = lead["id"]
    refreshed = client.get(f"{LEADS}/{lead_id}", headers=headers)
    assert refreshed.status_code == 200
    assert refreshed.json()["status"] == LeadStatus.COMPLETED.value

    runs = client.get(f"{RUNS}?lead_id={lead_id}", headers=headers)
    assert runs.status_code == 200
    run = runs.json()["items"][0]
    assert run["status"] == RunStatus.COMPLETED.value
    assert run["qualification"]["decision"] in {"pursue", "nurture"}

    detail = client.get(f"{RUNS}/{run['id']}", headers=headers)
    assert detail.status_code == 200
    agents = [step["agent"] for step in detail.json()["steps"]]
    assert agents == ["supervisor", "research", "qualification", "outreach", "crm", "reporting"]

    outbox = client.get(OUTBOX, headers=headers)
    assert outbox.status_code == 200
    events = outbox.json()["items"]
    assert len(events) == 2
    assert {event["status"] for event in events} == {OutboxStatus.DELIVERED.value}

    summary = client.get(f"{DASHBOARD}/summary", headers=headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["leads_total"] >= 1
    assert body["pending_approvals"] == 0


def test_low_fit_lead_completes_without_approvals(client: TestClient) -> None:
    _, _, headers = _verified_admin(client)
    created = client.post(
        LEADS,
        headers=headers,
        json={
            "email": f"intern-{uuid4().hex[:8]}@gmail.com",
            "full_name": "Sam Student",
            "notes": "student intern assignment, not a buyer",
            "start_run": True,
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["status"] == LeadStatus.COMPLETED.value

    inbox = client.get(
        f"{APPROVALS}?status=pending&lead_id={created.json()['id']}",
        headers=headers,
    )
    assert inbox.json()["total"] == 0

    lead_id = created.json()["id"]
    runs = client.get(f"{RUNS}?lead_id={lead_id}", headers=headers)
    run_id = runs.json()["items"][0]["id"]
    detail = client.get(f"{RUNS}/{run_id}", headers=headers).json()
    assert detail["qualification"]["decision"] == "drop"
    skipped = {step["agent"]: step["status"] for step in detail["steps"]}
    assert skipped["outreach"] == "skipped"
    assert skipped["crm"] == "skipped"


def test_reject_approval_marks_lead_rejected(client: TestClient) -> None:
    _, _, headers = _verified_admin(client)
    created = client.post(
        LEADS,
        headers=headers,
        json={
            "email": "ops@globex.com",
            "full_name": "Pat Ops",
            "company": "Globex",
            "website": "https://globex.example",
            "start_run": True,
        },
    )
    assert created.status_code == 201, created.text
    items = client.get(
        f"{APPROVALS}?status=pending&lead_id={created.json()['id']}",
        headers=headers,
    ).json()["items"]
    assert items
    for approval in items:
        rejected = client.post(
            f"{APPROVALS}/{approval['id']}/reject",
            headers=headers,
            json={"reason": "Wrong segment"},
        )
        assert rejected.status_code == 200, rejected.text
        assert rejected.json()["status"] == ApprovalStatus.REJECTED.value

    lead = client.get(f"{LEADS}/{created.json()['id']}", headers=headers).json()
    assert lead["status"] == LeadStatus.REJECTED.value


def test_n8n_webhook_is_idempotent(client: TestClient) -> None:
    secret = settings.n8n_webhook_secret
    payload = {
        "email": "webhook@acme.com",
        "full_name": "Web Hook",
        "company": "Acme",
        "external_id": f"n8n-{uuid4().hex}",
        "start_run": True,
    }
    first = client.post(
        f"{WEBHOOKS}/n8n/leads",
        json=payload,
        headers={"X-Webhook-Secret": secret},
    )
    second = client.post(
        f"{WEBHOOKS}/n8n/leads",
        json=payload,
        headers={"X-Webhook-Secret": secret},
    )
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json()["id"] == second.json()["id"]


def test_webhook_rejects_bad_secret(client: TestClient) -> None:
    response = client.post(
        f"{WEBHOOKS}/n8n/leads",
        json={"email": "x@y.com", "full_name": "X"},
        headers={"X-Webhook-Secret": "nope"},
    )
    assert response.status_code == 401


def test_leads_require_auth(client: TestClient) -> None:
    response = client.get(LEADS)
    assert response.status_code == 401
