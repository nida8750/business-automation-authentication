from __future__ import annotations

from typing import Any

import httpx

from app.config import settings
from app.core.email import send_mail
from app.core.logging import get_logger

logger = get_logger("outbox")


def dispatch_send_email(payload: dict[str, Any]) -> dict[str, Any]:
    """Deliver an approved outreach email. SMTP-less environments log and succeed in development."""
    to_email = str(payload.get("to") or "")
    subject = str(payload.get("subject") or f"{settings.app_name} outreach")
    body = str(payload.get("body") or "")
    if not to_email:
        raise ValueError("Outreach payload is missing a recipient.")

    logger.info(
        "outbox_email_dispatch",
        extra={"extra_data": {"to": to_email, "subject": subject}},
    )
    if settings.smtp_ready:
        sent = send_mail(to_email=to_email, subject=subject, text=body, event="outbox_email")
        if not sent:
            raise RuntimeError("SMTP rejected the outreach email.")
        return {"channel": "smtp", "to": to_email}

    if settings.is_development:
        return {"channel": "dev_log", "to": to_email, "subject": subject}
    raise RuntimeError("SMTP is not configured; cannot send outreach email.")


def dispatch_crm_write(payload: dict[str, Any]) -> dict[str, Any]:
    """POST the CRM proposal when a CRM endpoint is configured; otherwise stub in development."""
    if settings.crm_base_url and settings.crm_api_key:
        url = settings.crm_base_url.rstrip("/") + "/contacts"
        response = httpx.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {settings.crm_api_key}"},
            timeout=20,
        )
        response.raise_for_status()
        return {"channel": "crm_http", "status_code": response.status_code}
    logger.info("outbox_crm_stub", extra={"extra_data": payload})
    if settings.is_development:
        return {"channel": "dev_log", "object": payload.get("object")}
    raise RuntimeError("CRM is not configured; cannot write the contact.")
