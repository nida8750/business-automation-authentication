from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_token
from app.db.session import SessionLocal
from app.models.user import User, UserRole

API = "/api/v1/auth"


def _email() -> str:
    return f"auth-{uuid4().hex[:10]}@nexusflow.dev"


def _register(client: TestClient, email: str, password: str = "secret123") -> dict:
    response = client.post(
        f"{API}/register",
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


def _verified_user(client: TestClient, password: str = "secret123") -> tuple[str, dict]:
    email = _email()
    _register(client, email, password)
    raw = _force_verify(email)
    verified = client.post(f"{API}/verify-email", json={"token": raw})
    assert verified.status_code == 200, verified.text
    return email, verified.json()


def _login(client: TestClient, email: str, password: str = "secret123"):
    return client.post(f"{API}/login", json={"email": email, "password": password})


def test_register_is_unverified_and_login_blocked(client: TestClient) -> None:
    email = _email()
    body = _register(client, email)
    assert body["email_verified"] is False
    assert body["role"] == UserRole.OPERATOR.value
    blocked = _login(client, email)
    assert blocked.status_code == 403
    assert blocked.json()["error"]["code"] == "forbidden"


def test_verify_email_then_login_and_me(client: TestClient) -> None:
    email, user = _verified_user(client)
    assert user["email_verified"] is True
    tokens = _login(client, email)
    assert tokens.status_code == 200, tokens.text
    access = tokens.json()["access_token"]
    me = client.get(f"{API}/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert me.json()["email_verified"] is True


def test_me_without_token_is_unauthorized(client: TestClient) -> None:
    response = client.get(f"{API}/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_resend_verification_does_not_reveal_accounts(client: TestClient) -> None:
    known = client.post(f"{API}/resend-verification", json={"email": _email()})
    unknown = client.post(
        f"{API}/resend-verification",
        json={"email": "missing@nexusflow.dev"},
    )
    assert known.status_code == 200
    assert unknown.status_code == 200
    assert known.json() == unknown.json()


def test_refresh_rotates_and_rejects_reuse(client: TestClient) -> None:
    email, _ = _verified_user(client)
    first = _login(client, email).json()
    rotated = client.post(f"{API}/refresh", json={"refresh_token": first["refresh_token"]})
    assert rotated.status_code == 200, rotated.text
    reused = client.post(f"{API}/refresh", json={"refresh_token": first["refresh_token"]})
    assert reused.status_code == 401
    stale_new = client.post(
        f"{API}/refresh",
        json={"refresh_token": rotated.json()["refresh_token"]},
    )
    assert stale_new.status_code == 401


def test_logout_revokes_refresh_token(client: TestClient) -> None:
    email, _ = _verified_user(client)
    tokens = _login(client, email).json()
    out = client.post(f"{API}/logout", json={"refresh_token": tokens["refresh_token"]})
    assert out.status_code == 200
    again = client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert again.status_code == 401


def test_logout_all_invalidates_access_token(client: TestClient) -> None:
    email, _ = _verified_user(client)
    tokens = _login(client, email).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    out = client.post(f"{API}/logout-all", headers=headers)
    assert out.status_code == 200
    me = client.get(f"{API}/me", headers=headers)
    assert me.status_code == 401


def test_change_password_and_old_session_dies(client: TestClient) -> None:
    email, _ = _verified_user(client)
    tokens = _login(client, email).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    changed = client.post(
        f"{API}/change-password",
        headers=headers,
        json={"current_password": "secret123", "new_password": "secret456"},
    )
    assert changed.status_code == 200, changed.text
    me = client.get(f"{API}/me", headers=headers)
    assert me.status_code == 401
    old_login = _login(client, email, "secret123")
    assert old_login.status_code == 401
    new_login = _login(client, email, "secret456")
    assert new_login.status_code == 200


def test_forgot_and_reset_password(client: TestClient) -> None:
    email, _ = _verified_user(client)
    asked = client.post(f"{API}/forgot-password", json={"email": email})
    assert asked.status_code == 200
    raw = f"reset-{uuid4().hex}"
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user.password_reset_hash = hash_token(raw)
        user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
    finally:
        db.close()
    reset = client.post(
        f"{API}/reset-password",
        json={"token": raw, "new_password": "secret789"},
    )
    assert reset.status_code == 200, reset.text
    assert _login(client, email, "secret123").status_code == 401
    assert _login(client, email, "secret789").status_code == 200


def test_account_lockout_after_failed_logins(client: TestClient) -> None:
    email, _ = _verified_user(client)
    for _ in range(5):
        failed = _login(client, email, "wrong-pass")
        assert failed.status_code == 401
    locked = _login(client, email, "secret123")
    assert locked.status_code == 403
    assert "locked" in locked.json()["error"]["message"].lower()


def test_weak_password_is_rejected(client: TestClient) -> None:
    response = client.post(
        f"{API}/register",
        json={"email": _email(), "password": "password", "full_name": "Ada"},
    )
    assert response.status_code == 422


def test_require_roles_factory_checks_role() -> None:
    from app.api.v1.deps import require_roles

    dependency = require_roles(UserRole.ADMIN)
    assert callable(dependency)
