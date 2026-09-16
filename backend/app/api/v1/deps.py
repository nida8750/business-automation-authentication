from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.rate_limit import enforce_auth_rate_limit
from app.core.tokens import TokenError, decode_token
from app.db.session import get_db
from app.models.user import User, UserRole

http_bearer = HTTPBearer(auto_error=False)


def auth_abuse_guard(request: Request) -> None:
    """Rate-limit public auth routes (login, register, verify, reset)."""
    enforce_auth_rate_limit(request)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from an access JWT."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Not authenticated.")
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except TokenError as exc:
        raise UnauthorizedError(str(exc)) from exc

    user = db.get(User, UUID(str(payload["sub"])))
    if user is None or not user.is_active:
        raise UnauthorizedError("Not authenticated.")
    if user.token_version != payload.get("ver"):
        raise UnauthorizedError("Not authenticated.")
    return user


def require_verified_email(user: User = Depends(get_current_user)) -> User:
    """Block users who have not confirmed their email."""
    if not user.email_verified:
        raise ForbiddenError("Email is not verified.")
    return user


def require_roles(*roles: UserRole) -> Callable[..., User]:
    """FastAPI dependency factory: allow only the given roles."""
    allowed = set(roles)

    def dependency(user: User = Depends(require_verified_email)) -> User:
        if user.role not in allowed:
            raise ForbiddenError("You do not have permission to perform this action.")
        return user

    return dependency
