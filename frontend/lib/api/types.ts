export type Role = "admin" | "operator" | "reviewer";

export type UserPublic = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
    email_verified: boolean;
    created_at: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Lead = {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  title: string | null;
  website: string | null;
  phone: string | null;
  notes: string | null;
  source: string;
  status: string;
  extra: Record<string, unknown> | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadCreate = {
  email: string;
  full_name: string;
  company?: string;
  title?: string;
  website?: string;
  phone?: string;
  notes?: string;
  start_run: boolean;
};

export type AgentStep = {
  id: string;
  agent: string;
  status: string;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type AgentRun = {
  id: string;
  lead_id: string;
  status: string;
  trigger: string;
  plan: Record<string, unknown> | null;
  research: Record<string, unknown> | null;
  qualification: Record<string, unknown> | null;
  outreach: Record<string, unknown> | null;
  crm_proposal: Record<string, unknown> | null;
  report: Record<string, unknown> | null;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  steps?: AgentStep[];
};

export type Approval = {
  id: string;
  run_id: string;
  lead_id: string;
  action_type: string;
  status: string;
  payload: Record<string, unknown>;
  reason: string | null;
  decided_by_user_id: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OutboxEvent = {
  id: string;
  run_id: string;
  approval_id: string | null;
  event_type: string;
  status: string;
  payload: Record<string, unknown>;
  attempts: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
};

export type DashboardSummary = {
  leads_total: number;
  leads_by_status: Record<string, number>;
  runs_total: number;
  runs_by_status: Record<string, number>;
  pending_approvals: number;
  outbox_pending: number;
  outbox_delivered: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_run_latency_ms: number | null;
};

export type Page<T> = {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
};

export type WorkspaceAgent = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  tools: string[];
  is_core: boolean;
  status: "available" | "deployed" | "paused";
  tasks: number;
  sla: string | null;
};

export type WorkspaceIntegration = {
  id: string;
  slug: string;
  name: string;
  status: "connected" | "available";
  last_sync_at: string | null;
  notes: string | null;
  env_backed: boolean;
};

export type TeamMember = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
};

export type Plan = {
  code: "starter" | "growth" | "enterprise";
  name: string;
  price_cents: number;
  period: string;
  blurb: string;
  items: string[];
  featured: boolean;
  cta: string;
};

export type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  holder_name: string;
  is_default: boolean;
  created_at: string;
};

export type Invoice = {
  id: string;
  plan: Plan["code"];
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type BillingSummary = {
  plan: Plan["code"];
  status: string;
  current_period_end: string | null;
  stripe_enabled: boolean;
  checkout_url: string | null;
  payment_methods: PaymentMethod[];
  invoices: Invoice[];
  plans: Plan[];
};

export type AnalyticsSummary = {
  leads_total: number;
  runs_total: number;
  runs_completed: number;
  pending_approvals: number;
  outbox_delivered: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_run_latency_ms: number | null;
  hours_returned: number;
  estimated_cost_usd: number;
  estimated_roi_usd: number;
  runs_by_agent: Record<string, number>;
  runs_by_status: Record<string, number>;
  series: { date: string; runs: number; tokens: number }[];
  kpis: { label: string; value: string; delta: string }[];
};
