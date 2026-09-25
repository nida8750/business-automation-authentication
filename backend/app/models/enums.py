from enum import Enum


class LeadSource(str, Enum):
    APP = "app"
    API = "api"
    N8N = "n8n"


class LeadStatus(str, Enum):
    NEW = "new"
    QUEUED = "queued"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunTrigger(str, Enum):
    MANUAL = "manual"
    WEBHOOK = "webhook"
    RETRY = "retry"


class AgentName(str, Enum):
    SUPERVISOR = "supervisor"
    RESEARCH = "research"
    QUALIFICATION = "qualification"
    OUTREACH = "outreach"
    CRM = "crm"
    REPORTING = "reporting"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"


class ApprovalType(str, Enum):
    SEND_EMAIL = "send_email"
    CRM_WRITE = "crm_write"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class OutboxType(str, Enum):
    SEND_EMAIL = "send_email"
    CRM_WRITE = "crm_write"


class OutboxStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PlanCode(str, Enum):
    STARTER = "starter"
    GROWTH = "growth"
    ENTERPRISE = "enterprise"


class BillingStatus(str, Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class InvoiceStatus(str, Enum):
    OPEN = "open"
    PAID = "paid"
    VOID = "void"


class AgentDeployStatus(str, Enum):
    AVAILABLE = "available"
    DEPLOYED = "deployed"
    PAUSED = "paused"


class IntegrationStatus(str, Enum):
    CONNECTED = "connected"
    AVAILABLE = "available"
