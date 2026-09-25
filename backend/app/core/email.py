from email.message import EmailMessage
from email.utils import formataddr, make_msgid
import smtplib
from html import escape

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
    """Send a verification message. Never raises to the caller."""
    verify_url = build_verification_url(token)
    name = settings.app_name
    send_mail(
        to_email=to_email,
        subject=f"Verify your {name} email",
        text=(
            f"Welcome to {name}.\n\n"
            "Confirm your email by opening this link. It expires in 24 hours.\n"
            f"{verify_url}\n\n"
            "If you did not create an account, ignore this message.\n"
        ),
        html=_action_html(
            heading="Confirm your email",
            body="Welcome to Nexaflow. This link expires in 24 hours.",
            cta="Verify email",
            url=verify_url,
        ),
        event="verification_email",
    )


def send_password_reset_email(*, to_email: str, token: str) -> None:
    """Send a password-reset message. Never raises to the caller."""
    reset_url = build_password_reset_url(token)
    name = settings.app_name
    send_mail(
        to_email=to_email,
        subject=f"Reset your {name} password",
        text=(
            f"A password reset was requested for your {name} account.\n\n"
            "Choose a new password by opening this link. It expires soon.\n"
            f"{reset_url}\n\n"
            "If you did not request this, ignore this message.\n"
        ),
        html=_action_html(
            heading="Reset your password",
            body="Choose a new password. If you did not request this, you can ignore the email.",
            cta="Choose a new password",
            url=reset_url,
        ),
        event="password_reset_email",
    )


def send_mail(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
    event: str = "outbound_email",
) -> bool:
    """Deliver mail over SMTP. Returns True when the provider accepted the message."""
    if not settings.smtp_ready:
        logger.warning(
            "smtp_not_configured_skipping_email",
            extra={"extra_data": {"event": event, "to": to_email}},
        )
        if settings.is_development:
            logger.info(f"{event}_skipped_no_smtp to={to_email}")
        return False

    message = EmailMessage()
    message["From"] = formataddr((settings.app_name, settings.smtp_from_address))
    message["To"] = to_email
    message["Subject"] = subject
    message["Message-ID"] = make_msgid(domain=_from_domain())
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        with _smtp_client() as smtp:
            smtp.send_message(message)
        logger.info(f"{event}_sent", extra={"extra_data": {"to": to_email}})
        return True
    except (OSError, smtplib.SMTPException):
        logger.exception(f"{event}_failed")
        return False


def _smtp_client() -> smtplib.SMTP:
    host = settings.smtp_host
    port = settings.smtp_port
    timeout = 20
    if port == 465:
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=timeout)
    else:
        smtp = smtplib.SMTP(host, port, timeout=timeout)
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
    if settings.smtp_user:
        smtp.login(settings.smtp_user, settings.smtp_password)
    return smtp


def _from_domain() -> str:
    addr = settings.smtp_from_address
    if "@" in addr:
        return addr.rsplit("@", 1)[1]
    return "localhost"


def _action_html(*, heading: str, body: str, cta: str, url: str) -> str:
    safe_url = escape(url, quote=True)
    return f"""<!doctype html>
<html>
  <body style="margin:0;background:#050914;color:#e8eefc;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050914;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;">
            <tr>
              <td style="padding-bottom:20px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#36d4ff;">
                {escape(settings.app_name)}
              </td>
            </tr>
            <tr>
              <td style="font-size:28px;font-weight:700;padding-bottom:12px;">{escape(heading)}</td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.5;color:#94a3b8;padding-bottom:24px;">{escape(body)}</td>
            </tr>
            <tr>
              <td>
                <a href="{safe_url}" style="display:inline-block;background:#22d7ff;color:#050914;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">
                  {escape(cta)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:28px;font-size:12px;line-height:1.5;color:#64748b;">
                If the button does not work, paste this URL into your browser:<br>
                {escape(url)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
