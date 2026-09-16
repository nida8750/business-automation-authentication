from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import UUID, uuid4

import jwt

from app.config import settings

TokenType = Literal["access", "refresh"]


class TokenError(Exception):
    """Raised when a JWT is missing, expired, or tampered with."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str | UUID, *, token_version: int, jti: str | None = None) -> str:
    """Create a short-lived access token. `subject` is the user id."""
    return _encode_token(
        subject,
        token_type="access",
        expires_delta=_access_delta(),
        token_version=token_version,
        jti=jti or str(uuid4()),
    )


def create_refresh_token(subject: str | UUID, *, token_version: int, jti: str) -> str:
    """Create a long-lived refresh token. `subject` is the user id."""
    return _encode_token(
        subject,
        token_type="refresh",
        expires_delta=_refresh_delta(),
        token_version=token_version,
        jti=jti,
    )


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Decode and validate a JWT. Optionally require access or refresh type."""
    if not token:
        raise TokenError("Token is missing.")
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Token is invalid.") from exc

    subject = payload.get("sub")
    token_type = payload.get("typ")
    jti = payload.get("jti")
    version = payload.get("ver")
    if not subject or token_type not in {"access", "refresh"} or not jti or not isinstance(version, int):
        raise TokenError("Token payload is invalid.")
    if expected_type is not None and token_type != expected_type:
        raise TokenError(f"Expected a {expected_type} token.")
    return payload


def _encode_token(
    subject: str | UUID,
    *,
    token_type: TokenType,
    expires_delta: timedelta,
    token_version: int,
    jti: str,
) -> str:
    issued_at = _now()
    payload = {
        "sub": str(subject),
        "typ": token_type,
        "jti": jti,
        "ver": token_version,
        "iat": issued_at,
        "exp": issued_at + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _access_delta() -> timedelta:
    return timedelta(minutes=settings.access_token_expire_minutes)


def _refresh_delta() -> timedelta:
    return timedelta(days=settings.refresh_token_expire_days)
