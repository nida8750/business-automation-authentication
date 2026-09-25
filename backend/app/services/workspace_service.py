from datetime import datetime, timedelta, timezone
from uuid import UUID
import secrets

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.models.agent_run import AgentRun
from app.models.agent_step import AgentStep
from app.models.approval import Approval
from app.models.enums import (
    AgentDeployStatus,
    ApprovalStatus,
    BillingStatus,
    IntegrationStatus,
    InvoiceStatus,
    OutboxStatus,
    PlanCode,
    RunStatus,
)
from app.models.lead import Lead
from app.models.outbox import OutboxEvent
from app.models.user import User, UserRole
from app.models.workspace import BillingAccount, Invoice, PaymentMethod, WorkspaceAgent, WorkspaceIntegration
from app.schemas.workspace import (
    AnalyticsPoint,
    AnalyticsSummary,
    BillingSummary,
    InvoicePublic,
    PaymentMethodCreate,
    PaymentMethodPublic,
    PlanPublic,
    SubscribeResponse,
    TeamInviteResponse,
    TeamMemberPublic,
    WorkspaceAgentPublic,
    WorkspaceIntegrationPublic,
)

PLANS: list[PlanPublic] = [
    PlanPublic(
        code=PlanCode.STARTER,
        name="Starter",
        price_cents=4900,
        period="/mo",
        blurb="Founders automating the first revenue loop.",
        items=["3 agents", "2,000 tasks / mo", "Gmail, Calendar, Slack", "Human approval inbox", "Email support"],
        featured=False,
        cta="Start automating",
    ),
    PlanPublic(
        code=PlanCode.GROWTH,
        name="Growth",
        price_cents=24900,
        period="/mo",
        blurb="SMEs running sales, support, and ops on one OS.",
        items=["Unlimited agents", "50,000 tasks / mo", "CRM, Shopify, Stripe, WhatsApp", "Workflow versions + test runs", "SSO, audit log"],
        featured=True,
        cta="Subscribe",
    ),
    PlanPublic(
        code=PlanCode.ENTERPRISE,
        name="Enterprise",
        price_cents=0,
        period="",
        blurb="Agencies and multi-brand operators with dedicated controls.",
        items=["Private VPC / region", "Custom SLAs", "SCIM + DLP", "Dedicated success architect", "On-prem connectors"],
        featured=False,
        cta="Book a demo",
    ),
]

CORE_AGENTS = [
    ("supervisor", "Supervisor", "Command", "Routes every lead run through the graph.", ["LangGraph"], True, AgentDeployStatus.DEPLOYED),
    ("research", "Research", "Intelligence", "Firm and contact research for the lead.", ["Web", "LLM"], True, AgentDeployStatus.DEPLOYED),
    ("qualification", "Qualification", "Revenue", "Scores fit: pursue, nurture, or drop.", ["Heuristics", "LLM"], True, AgentDeployStatus.DEPLOYED),
    ("outreach", "Outreach", "Revenue", "Drafts approval-gated email.", ["Gmail"], True, AgentDeployStatus.DEPLOYED),
    ("crm", "CRM", "Ops", "Proposes CRM writes after approval.", ["HubSpot"], True, AgentDeployStatus.DEPLOYED),
    ("reporting", "Reporting", "Intelligence", "Writes the run report and token totals.", ["Dashboard"], True, AgentDeployStatus.DEPLOYED),
]

EXTRA_AGENTS = [
    ("sales", "Sales Agent", "Revenue", "Qualifies inbound and drafts first-touch sequences.", ["HubSpot", "Gmail"], False, AgentDeployStatus.AVAILABLE),
    ("support", "Support Agent", "CX", "Resolves tier-1 tickets with policy match.", ["Slack", "Gmail"], False, AgentDeployStatus.AVAILABLE),
    ("finance", "Finance Agent", "Ops", "Watches payouts and flags anomalies.", ["Stripe"], False, AgentDeployStatus.AVAILABLE),
]

INTEGRATIONS = [
    ("smtp", "Outbound email (SMTP)", False),
    ("crm", "CRM HTTP", False),
    ("gmail", "Gmail", True),
    ("slack", "Slack", True),
    ("hubspot", "HubSpot CRM", True),
    ("stripe", "Stripe", True),
    ("calendar", "Google Calendar", True),
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _luhn_ok(number: str) -> bool:
    digits = [int(ch) for ch in number]
    checksum = 0
    odd = True
    for digit in reversed(digits):
        if odd:
            checksum += digit
        else:
            doubled = digit * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        odd = not odd
    return checksum % 10 == 0


def _brand(number: str) -> str:
    if number.startswith("4"):
        return "visa"
    if number.startswith(("51", "52", "53", "54", "55", "2221", "27")):
        return "mastercard"
    if number.startswith(("34", "37")):
        return "amex"
    return "card"


class WorkspaceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ensure_catalog(self) -> None:
        existing = {row.slug for row in self.db.scalars(select(WorkspaceAgent)).all()}
        for slug, name, category, description, tools, is_core, status in [*CORE_AGENTS, *EXTRA_AGENTS]:
            if slug in existing:
                continue
            self.db.add(
                WorkspaceAgent(
                    slug=slug,
                    name=name,
                    category=category,
                    description=description,
                    tools=tools,
                    is_core=is_core,
                    status=status,
                )
            )
        existing_i = {row.slug for row in self.db.scalars(select(WorkspaceIntegration)).all()}
        for slug, name, _optional in INTEGRATIONS:
            if slug in existing_i:
                continue
            self.db.add(WorkspaceIntegration(slug=slug, name=name, status=IntegrationStatus.AVAILABLE))
        self.db.commit()

    def list_agents(self) -> list[WorkspaceAgentPublic]:
        self.ensure_catalog()
        counts = {
            (name.value if hasattr(name, "value") else str(name)): int(count)
            for name, count in self.db.execute(select(AgentStep.agent, func.count()).group_by(AgentStep.agent))
        }
        rows = list(self.db.scalars(select(WorkspaceAgent).order_by(WorkspaceAgent.is_core.desc(), WorkspaceAgent.name)))
        out: list[WorkspaceAgentPublic] = []
        for row in rows:
            out.append(
                WorkspaceAgentPublic.model_validate(row).model_copy(
                    update={"tasks": counts.get(row.slug, 0), "sla": "live" if row.status == AgentDeployStatus.DEPLOYED else None}
                )
            )
        return out

    def set_agent(self, slug: str, *, deployed: bool) -> WorkspaceAgentPublic:
        self.ensure_catalog()
        row = self.db.scalar(select(WorkspaceAgent).where(WorkspaceAgent.slug == slug))
        if row is None:
            raise NotFoundError("Agent not found.")
        if row.is_core and not deployed:
            raise BadRequestError("Core graph nodes cannot be paused.")
        row.status = AgentDeployStatus.DEPLOYED if deployed else AgentDeployStatus.PAUSED
        self.db.commit()
        self.db.refresh(row)
        return WorkspaceAgentPublic.model_validate(row)

    def list_integrations(self) -> list[WorkspaceIntegrationPublic]:
        self.ensure_catalog()
        env_map = {
            "smtp": bool(settings.smtp_ready),
            "crm": bool(settings.crm_base_url),
            "stripe": bool(settings.stripe_secret_key),
        }
        rows = [
            row
            for row in self.db.scalars(select(WorkspaceIntegration).order_by(WorkspaceIntegration.name))
            if row.slug != "n8n"
        ]
        out: list[WorkspaceIntegrationPublic] = []
        for row in rows:
            env_on = env_map.get(row.slug)
            if env_on is True and row.status != IntegrationStatus.CONNECTED:
                row.status = IntegrationStatus.CONNECTED
                row.last_sync_at = _utcnow()
                row.notes = "Connected from environment"
            item = WorkspaceIntegrationPublic.model_validate(row)
            item.env_backed = row.slug in env_map
            out.append(item)
        self.db.commit()
        return out

    def set_integration(self, slug: str, *, connected: bool) -> WorkspaceIntegrationPublic:
        self.ensure_catalog()
        row = self.db.scalar(select(WorkspaceIntegration).where(WorkspaceIntegration.slug == slug))
        if row is None:
            raise NotFoundError("Integration not found.")
        if slug == "smtp" and connected and not settings.smtp_ready:
            raise BadRequestError("Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env before connecting outbound email.")
        if slug == "crm" and connected and not settings.crm_base_url:
            raise BadRequestError("Set CRM_BASE_URL in .env before connecting CRM.")
        if slug == "n8n":
            raise BadRequestError("n8n is not shown in the desk. Use the webhook API with X-Webhook-Secret.")
        row.status = IntegrationStatus.CONNECTED if connected else IntegrationStatus.AVAILABLE
        row.last_sync_at = _utcnow() if connected else None
        row.notes = "Connected" if connected else None
        self.db.commit()
        self.db.refresh(row)
        return WorkspaceIntegrationPublic.model_validate(row)

    def list_team(self) -> list[TeamMemberPublic]:
        rows = list(self.db.scalars(select(User).order_by(User.created_at.asc())))
        return [TeamMemberPublic.model_validate(row) for row in rows]

    def invite(self, *, actor: User, email: str, full_name: str, role: UserRole) -> TeamInviteResponse:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admin can invite teammates.")
        existing = self.db.scalar(select(User).where(User.email == email.lower()))
        if existing is not None:
            raise ConflictError("An account with this email already exists.")
        password = f"Invite{secrets.randbelow(900000) + 100000}"
        user = User(
            email=email.lower(),
            hashed_password=hash_password(password),
            full_name=full_name.strip(),
            role=role,
            is_active=True,
            email_verified=True,
            email_verified_at=_utcnow(),
            token_version=1,
            failed_login_count=0,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        BillingService(self.db).ensure_account(user)
        return TeamInviteResponse(user=TeamMemberPublic.model_validate(user), temporary_password=password)

    def update_member(self, *, actor: User, user_id: UUID, role: UserRole, is_active: bool | None) -> TeamMemberPublic:
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Only admin can change roles.")
        user = self.db.get(User, user_id)
        if user is None:
            raise NotFoundError("User not found.")
        if user.id == actor.id and role != UserRole.ADMIN:
            raise BadRequestError("You cannot demote yourself.")
        user.role = role
        if is_active is not None:
            user.is_active = is_active
        self.db.commit()
        self.db.refresh(user)
        return TeamMemberPublic.model_validate(user)

    def analytics(self) -> AnalyticsSummary:
        leads_total = int(self.db.scalar(select(func.count()).select_from(Lead)) or 0)
        runs_total = int(self.db.scalar(select(func.count()).select_from(AgentRun)) or 0)
        runs_completed = int(
            self.db.scalar(select(func.count()).select_from(AgentRun).where(AgentRun.status == RunStatus.COMPLETED)) or 0
        )
        pending_approvals = int(
            self.db.scalar(select(func.count()).select_from(Approval).where(Approval.status == ApprovalStatus.PENDING)) or 0
        )
        outbox_delivered = int(
            self.db.scalar(select(func.count()).select_from(OutboxEvent).where(OutboxEvent.status == OutboxStatus.DELIVERED))
            or 0
        )
        prompt_tokens = int(self.db.scalar(select(func.coalesce(func.sum(AgentRun.prompt_tokens), 0))) or 0)
        completion_tokens = int(self.db.scalar(select(func.coalesce(func.sum(AgentRun.completion_tokens), 0))) or 0)
        avg_latency = self.db.scalar(
            select(func.avg(AgentRun.latency_ms)).where(AgentRun.status == RunStatus.COMPLETED, AgentRun.latency_ms.is_not(None))
        )
        runs_by_agent = {
            (name.value if hasattr(name, "value") else str(name)): int(count)
            for name, count in self.db.execute(select(AgentStep.agent, func.count()).group_by(AgentStep.agent))
        }
        runs_by_status = {
            (status.value if hasattr(status, "value") else str(status)): int(count)
            for status, count in self.db.execute(select(AgentRun.status, func.count()).group_by(AgentRun.status))
        }
        tokens = prompt_tokens + completion_tokens
        cost = round(tokens * 0.000002, 4)
        hours = round(runs_completed * 0.25, 2)
        roi = round(hours * 45, 2)
        # SQLite is used by the test suite; PostgreSQL keeps the richer
        # timestamp bucket returned by date_trunc in production.
        if self.db.get_bind().dialect.name == "sqlite":
            day_expr = func.date(AgentRun.created_at)
        else:
            day_expr = func.date_trunc("day", AgentRun.created_at)
        series_rows = self.db.execute(
            select(day_expr, func.count(), func.coalesce(func.sum(AgentRun.prompt_tokens + AgentRun.completion_tokens), 0))
            .group_by(day_expr)
            .order_by(day_expr.asc())
            .limit(14)
        ).all()
        series = [
            AnalyticsPoint(
                date=str(day.date()) if hasattr(day, "date") else str(day or ""),
                runs=int(count),
                tokens=int(toks),
            )
            for day, count, toks in series_rows
            if day is not None
        ]
        kpis = [
            {"label": "Leads", "value": str(leads_total), "delta": "live"},
            {"label": "Runs completed", "value": str(runs_completed), "delta": f"{runs_total} total"},
            {"label": "Hours returned", "value": str(hours), "delta": "0.25h × completed runs"},
            {"label": "Est. agent cost", "value": f"${cost:.2f}", "delta": f"{tokens} tokens"},
        ]
        return AnalyticsSummary(
            leads_total=leads_total,
            runs_total=runs_total,
            runs_completed=runs_completed,
            pending_approvals=pending_approvals,
            outbox_delivered=outbox_delivered,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            avg_run_latency_ms=float(avg_latency) if avg_latency is not None else None,
            hours_returned=hours,
            estimated_cost_usd=cost,
            estimated_roi_usd=roi,
            runs_by_agent=runs_by_agent,
            runs_by_status=runs_by_status,
            series=series,
            kpis=kpis,
        )


class BillingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ensure_account(self, user: User) -> BillingAccount:
        row = self.db.scalar(select(BillingAccount).where(BillingAccount.user_id == user.id))
        if row is not None:
            return row
        row = BillingAccount(user_id=user.id, plan=PlanCode.STARTER, status=BillingStatus.TRIALING)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def summary(self, user: User) -> BillingSummary:
        account = self.ensure_account(user)
        methods = list(
            self.db.scalars(
                select(PaymentMethod).where(PaymentMethod.user_id == user.id).order_by(PaymentMethod.created_at.desc())
            )
        )
        invoices = list(
            self.db.scalars(select(Invoice).where(Invoice.user_id == user.id).order_by(Invoice.created_at.desc()).limit(20))
        )
        return BillingSummary(
            plan=account.plan,
            status=account.status,
            current_period_end=account.current_period_end,
            stripe_enabled=bool(settings.stripe_secret_key),
            payment_methods=[PaymentMethodPublic.model_validate(row) for row in methods],
            invoices=[InvoicePublic.model_validate(row) for row in invoices],
            plans=PLANS,
        )

    def add_payment_method(self, user: User, payload: PaymentMethodCreate) -> PaymentMethodPublic:
        if not _luhn_ok(payload.card_number):
            raise BadRequestError("Card number failed the checksum. Use a valid test card such as 4242424242424242.")
        now = _utcnow()
        if payload.exp_year < now.year or (payload.exp_year == now.year and payload.exp_month < now.month):
            raise BadRequestError("Card is expired.")
        _ = payload.cvc
        self.ensure_account(user)
        self.db.execute(
            select(PaymentMethod).where(PaymentMethod.user_id == user.id, PaymentMethod.is_default.is_(True))
        )
        for row in self.db.scalars(select(PaymentMethod).where(PaymentMethod.user_id == user.id)):
            row.is_default = False
        method = PaymentMethod(
            user_id=user.id,
            brand=_brand(payload.card_number),
            last4=payload.card_number[-4:],
            exp_month=payload.exp_month,
            exp_year=payload.exp_year,
            holder_name=payload.holder_name.strip(),
            is_default=True,
        )
        self.db.add(method)
        self.db.commit()
        self.db.refresh(method)
        return PaymentMethodPublic.model_validate(method)

    def delete_payment_method(self, user: User, method_id: UUID) -> None:
        method = self.db.get(PaymentMethod, method_id)
        if method is None or method.user_id != user.id:
            raise NotFoundError("Payment method not found.")
        self.db.delete(method)
        self.db.commit()

    def subscribe(self, user: User, plan: PlanCode, payment_method_id: UUID | None) -> SubscribeResponse:
        if plan == PlanCode.ENTERPRISE:
            raise BadRequestError("Enterprise is sales-led. Use /register and contact support.")
        account = self.ensure_account(user)
        if plan == PlanCode.STARTER:
            account.plan = PlanCode.STARTER
            account.status = BillingStatus.TRIALING
            account.current_period_end = _utcnow() + timedelta(days=14)
            self.db.commit()
            return SubscribeResponse(billing=self.summary(user), message="Starter trial is active.")
        method = None
        if payment_method_id is not None:
            method = self.db.get(PaymentMethod, payment_method_id)
        else:
            method = self.db.scalar(
                select(PaymentMethod).where(PaymentMethod.user_id == user.id, PaymentMethod.is_default.is_(True))
            )
        if method is None or method.user_id != user.id:
            raise BadRequestError("Add a payment method before subscribing to a paid plan.")
        price = next(p.price_cents for p in PLANS if p.code == plan)
        invoice = Invoice(
            user_id=user.id,
            plan=plan,
            amount_cents=price,
            currency="usd",
            status=InvoiceStatus.PAID,
            paid_at=_utcnow(),
            payment_method_id=method.id,
        )
        account.plan = plan
        account.status = BillingStatus.ACTIVE
        account.current_period_end = _utcnow() + timedelta(days=30)
        self.db.add(invoice)
        self.db.commit()
        return SubscribeResponse(
            billing=self.summary(user),
            message=f"Charged •••• {method.last4} and activated {plan.value}.",
        )

    def cancel(self, user: User) -> BillingSummary:
        account = self.ensure_account(user)
        account.plan = PlanCode.STARTER
        account.status = BillingStatus.CANCELED
        self.db.commit()
        return self.summary(user)
