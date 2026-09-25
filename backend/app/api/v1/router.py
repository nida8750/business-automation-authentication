from fastapi import APIRouter

from app.api.v1.routes.approvals import approvals_router, dashboard_router, outbox_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.leads import router as leads_router
from app.api.v1.routes.runs import router as runs_router
from app.api.v1.routes.webhooks import router as webhooks_router
from app.api.v1.routes.workspace import (
    agents_router,
    analytics_router,
    billing_router,
    integrations_router,
    plans_router,
    team_router,
)

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(leads_router)
api_router.include_router(runs_router)
api_router.include_router(approvals_router)
api_router.include_router(outbox_router)
api_router.include_router(dashboard_router)
api_router.include_router(webhooks_router)
api_router.include_router(agents_router)
api_router.include_router(integrations_router)
api_router.include_router(team_router)
api_router.include_router(analytics_router)
api_router.include_router(plans_router)
api_router.include_router(billing_router)
