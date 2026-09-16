import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.email import send_password_reset_email, send_verification_email
from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    UnauthorizedError,
)
from app.core.security import hash_password, hash_token, verify_password
from app.core.tokens import TokenError, create_access_token, create_refresh_token, decode_token
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

VERIFICATION_TTL = timedelta(hours=24)

hash_email_token = hash_token


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _is_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < _utcnow()


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(self, payload: RegisterRequest) -> User:
        email = str(payload.email).lower()
        existing = self.db.scalar(select(User).where(User.email == email))
        if existing is not None:
            raise ConflictError("An account with this email already exists.")

        raw_token, token_hash, expires_at = self._new_lookup_token(VERIFICATION_TTL)
        user = User(
            email=email,
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name.strip(),
            role=self._role_for_new_user(email),
            is_active=True,
            email_verified=False,
            email_verification_hash=token_hash,
            email_verification_expires_at=expires_at,
            token_version=1,
            failed_login_count=0,
        )
        self.db.add(user)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("An account with this email already exists.") from exc
        self.db.refresh(user)
        send_verification_email(to_email=user.email, token=raw_token)
        return user

    def login(self, payload: LoginRequest) -> TokenResponse:
        email = str(payload.email).lower()
        user = self.db.scalar(select(User).where(User.email == email))
        if user is not None and self._is_locked(user):
            raise ForbiddenError("This account is temporarily locked. Try again later.")
        if user is None or not verify_password(payload.password, user.hashed_password):
            if user is not None:
                self._record_failed_login(user)
            raise UnauthorizedError("Invalid email or password.")
        if not user.is_active:
            raise ForbiddenError("This account is disabled.")
        if not user.email_verified:
            raise ForbiddenError("Email is not verified.")
        user.failed_login_count = 0
        user.locked_until = None
        return self._issue_tokens(user)

    def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except TokenError as exc:
            raise UnauthorizedError(str(exc)) from exc

        user = self.db.get(User, UUID(str(payload["sub"])))
        if user is None or not user.is_active or user.token_version != payload.get("ver"):
            raise UnauthorizedError("Invalid refresh token.")
        if not user.email_verified:
            raise ForbiddenError("Email is not verified.")

        stored = self.db.scalar(
            select(RefreshToken).where(RefreshToken.jti_hash == hash_token(str(payload["jti"])))
        )
        if stored is None:
            raise UnauthorizedError("Invalid refresh token.")
        if stored.revoked_at is not None:
            self._revoke_all_refresh_tokens(user.id)
            user.token_version += 1
            self.db.commit()
            raise UnauthorizedError("Invalid refresh token.")
        if _is_expired(stored.expires_at):
            stored.revoked_at = _utcnow()
            self.db.commit()
            raise UnauthorizedError("Invalid refresh token.")

        stored.revoked_at = _utcnow()
        return self._issue_tokens(user)

    def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except TokenError:
            return
        stored = self.db.scalar(
            select(RefreshToken).where(RefreshToken.jti_hash == hash_token(str(payload["jti"])))
        )
        if stored is not None and stored.revoked_at is None:
            stored.revoked_at = _utcnow()
            self.db.commit()

    def logout_all(self, user: User) -> None:
        self._revoke_all_refresh_tokens(user.id)
        user.token_version += 1
        self.db.commit()

    def verify_email(self, raw_token: str) -> User:
        user = self.db.scalar(
            select(User).where(User.email_verification_hash == hash_token(raw_token))
        )
        if user is None or _is_expired(user.email_verification_expires_at):
            raise BadRequestError("This verification link is invalid or has expired.")

        user.email_verified = True
        user.email_verified_at = _utcnow()
        user.email_verification_hash = None
        user.email_verification_expires_at = None
        self.db.commit()
        self.db.refresh(user)
        return user

    def resend_verification(self, email: str) -> None:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if user is None or user.email_verified or not user.is_active:
            return
        raw_token, token_hash, expires_at = self._new_lookup_token(VERIFICATION_TTL)
        user.email_verification_hash = token_hash
        user.email_verification_expires_at = expires_at
        self.db.commit()
        send_verification_email(to_email=user.email, token=raw_token)

    def request_password_reset(self, email: str) -> None:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if user is None or not user.is_active:
            return
        ttl = timedelta(hours=settings.password_reset_ttl_hours)
        raw_token, token_hash, expires_at = self._new_lookup_token(ttl)
        user.password_reset_hash = token_hash
        user.password_reset_expires_at = expires_at
        self.db.commit()
        send_password_reset_email(to_email=user.email, token=raw_token)

    def reset_password(self, raw_token: str, new_password: str) -> None:
        user = self.db.scalar(select(User).where(User.password_reset_hash == hash_token(raw_token)))
        if user is None or not user.is_active or _is_expired(user.password_reset_expires_at):
            raise BadRequestError("This reset link is invalid or has expired.")
        user.hashed_password = hash_password(new_password)
        user.password_reset_hash = None
        user.password_reset_expires_at = None
        user.failed_login_count = 0
        user.locked_until = None
        user.token_version += 1
        self._revoke_all_refresh_tokens(user.id)
        self.db.commit()

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedError("Current password is incorrect.")
        if current_password == new_password:
            raise BadRequestError("New password must be different from the current password.")
        user.hashed_password = hash_password(new_password)
        user.token_version += 1
        self._revoke_all_refresh_tokens(user.id)
        self.db.commit()

    def _role_for_new_user(self, email: str) -> UserRole:
        bootstrap = settings.bootstrap_admin_email.strip().lower()
        if bootstrap and email == bootstrap:
            return UserRole.ADMIN
        return UserRole.OPERATOR

    def _is_locked(self, user: User) -> bool:
        if user.locked_until is None:
            return False
        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > _utcnow():
            return True
        user.locked_until = None
        user.failed_login_count = 0
        return False

    def _record_failed_login(self, user: User) -> None:
        user.failed_login_count += 1
        if user.failed_login_count >= settings.login_max_failed_attempts:
            user.locked_until = _utcnow() + timedelta(minutes=settings.login_lockout_minutes)
        self.db.commit()

    def _new_lookup_token(self, ttl: timedelta) -> tuple[str, str, datetime]:
        raw_token = secrets.token_urlsafe(32)
        return raw_token, hash_token(raw_token), _utcnow() + ttl

    def _revoke_all_refresh_tokens(self, user_id: UUID) -> None:
        self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=_utcnow())
        )

    def _issue_tokens(self, user: User) -> TokenResponse:
        now = _utcnow()
        self.db.execute(
            delete(RefreshToken).where(
                RefreshToken.user_id == user.id,
                RefreshToken.expires_at < now,
            )
        )
        refresh_jti = str(uuid4())
        access_token = create_access_token(user.id, token_version=user.token_version)
        refresh_token = create_refresh_token(
            user.id,
            token_version=user.token_version,
            jti=refresh_jti,
        )
        self.db.add(
            RefreshToken(
                user_id=user.id,
                jti_hash=hash_token(refresh_jti),
                expires_at=now + timedelta(days=settings.refresh_token_expire_days),
            )
        )
        self.db.commit()
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)
