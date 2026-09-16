from email.message import EmailMessage
import smtplib

from app.config import settings
from app.core.logging import get_logger

logger = get_logger("email")


def build_verification_url(token: str) -> str:
    """Frontend URL the user opens to confirm their email."""
    base = settings.frontend_origin.rstrip("/")
    return f"{base}/verify-email?token={token}"


def build_password_reset_url(token: str) -> str:
    """Frontend URL the user opens to choose a new password."""
    base = settings.frontend_origin.rstrip("/")
    return f"{base}/reset-password?token={token}"


def send_verification_email(*, to_email: str, token: str) -> None:
    """Send (or log) an email-verification message. Never raises to the caller."""
    verify_url = build_verification_url(token)
    _deliver(
        to_email=to_email,
        subject=f"Verify your {settings.app_name} email",
        body=(
            f"Welcome to {settings.app_name}.\n\n"
            f"Confirm your email by opening this link:\n{verify_url}\n\n"
            "If you did not create an account, ignore this message.\n"
        ),
        event="verification_email",
        extra={"to": to_email, "verify_url": verify_url, "token": token},
    )


def send_password_reset_email(*, to_email: str, token: str) -> None:
    """Send (or log) a password-reset message. Never raises to the caller."""
    reset_url = build_password_reset_url(token)
    _deliver(
        to_email=to_email,
        subject=f"Reset your {settings.app_name} password",
        body=(
            f"A password reset was requested for your {settings.app_name} account.\n\n"
            f"Choose a new password by opening this link:\n{reset_url}\n\n"
            "If you did not request this, ignore this message. The link expires soon.\n"
        ),
        event="password_reset_email",
        extra={"to": to_email, "reset_url": reset_url, "token": token},
    )


def _deliver(*, to_email: str, subject: str, body: str, event: str, extra: dict[str, str]) -> None:
    if settings.is_development:
        logger.info(f"{event}_dev", extra={"extra_data": extra})

    if not settings.smtp_host:
        if not settings.is_development:
            logger.warning("smtp_not_configured_skipping_email")
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        logger.info(f"{event}_sent", extra={"extra_data": {"to": to_email}})
    except OSError:
        logger.exception(f"{event}_failed")
