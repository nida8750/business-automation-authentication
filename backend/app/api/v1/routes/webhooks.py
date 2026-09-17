import hmac

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.v1.deps import auth_abuse_guard
from app.config import settings
from app.core.exceptions import UnauthorizedError
from app.db.session import get_db
from app.schemas.leads import LeadPublic, N8nLeadWebhook
from app.services.lead_service import LeadService

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def get_lead_service(db: Session = Depends(get_db)) -> LeadService:
    return LeadService(db)


def _require_n8n_secret(x_webhook_secret: str | None = Header(default=None)) -> None:
    expected = settings.n8n_webhook_secret
    provided = x_webhook_secret or ""
    if not expected or not hmac.compare_digest(provided, expected):
        raise UnauthorizedError("Invalid webhook secret.")


@router.post(
    "/n8n/leads",
    response_model=LeadPublic,
    dependencies=[Depends(auth_abuse_guard), Depends(_require_n8n_secret)],
)
def ingest_n8n_lead(
    payload: N8nLeadWebhook,
    service: LeadService = Depends(get_lead_service),
) -> LeadPublic:
    lead = service.create_from_webhook(
        email=str(payload.email),
        full_name=payload.full_name,
        company=payload.company,
        title=payload.title,
        website=payload.website,
        phone=payload.phone,
        notes=payload.notes,
        extra=payload.extra,
        external_id=payload.external_id,
        start_run=payload.start_run,
    )
    return LeadPublic.model_validate(lead)
