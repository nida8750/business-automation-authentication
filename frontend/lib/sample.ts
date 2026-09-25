export const workspace = {
  name: "Northwind Commerce",
  plan: "Growth",
  user: { name: "Maya Chen", role: "Founder", email: "maya@northwind.ai" },
};

export const kpis = [
  { label: "Automations live", value: "128", delta: "+12 this month", tone: "mint" as const },
  { label: "Tasks this week", value: "4,286", delta: "99.2% success", tone: "blue" as const },
  { label: "Automation ROI", value: "$186k", delta: "8.4× vs ops cost", tone: "violet" as const },
  { label: "Avg. cost / task", value: "$0.041", delta: "−18% vs last month", tone: "mint" as const },
];

export const agents = [
  {
    id: "sales",
    name: "Sales Agent",
    category: "Revenue",
    status: "live",
    description: "Qualifies inbound leads, updates CRM, and drafts first-touch sequences with human approval.",
    tasks: 842,
    sla: "1.4s",
    tools: ["HubSpot", "Gmail", "WhatsApp", "Calendar"],
  },
  {
    id: "support",
    name: "Support Agent",
    category: "CX",
    status: "live",
    description: "Resolves tier-1 tickets, pulls order context, and escalates exceptions with a full transcript.",
    tasks: 1204,
    sla: "0.9s",
    tools: ["Slack", "Shopify", "Gmail"],
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    category: "Growth",
    status: "live",
    description: "Builds campaigns, segments audiences, and ships copy only after brand review.",
    tasks: 316,
    sla: "2.1s",
    tools: ["Notion", "Gmail", "Slack"],
  },
  {
    id: "finance",
    name: "Finance Agent",
    category: "Ops",
    status: "paused",
    description: "Reconciles Stripe payouts, flags anomalies, and prepares weekly cash summaries.",
    tasks: 97,
    sla: "3.0s",
    tools: ["Stripe", "Google Drive"],
  },
  {
    id: "ops",
    name: "Operations Agent",
    category: "Ops",
    status: "live",
    description: "Routes work across teams, watches SLAs, and opens exception tickets before they slip.",
    tasks: 540,
    sla: "1.1s",
    tools: ["Slack", "Notion", "Calendar"],
  },
  {
    id: "analyst",
    name: "Data Analyst",
    category: "Intelligence",
    status: "live",
    description: "Turns warehouse events into board-ready insights and recommended next automations.",
    tasks: 188,
    sla: "4.6s",
    tools: ["Google Drive", "Slack"],
  },
];

export const marketplace = [
  ...agents,
  {
    id: "hr",
    name: "People Agent",
    category: "People",
    status: "available",
    description: "Screens applicants, schedules interviews, and keeps offer packets consistent.",
    tasks: 0,
    sla: "—",
    tools: ["Gmail", "Calendar", "Notion"],
  },
  {
    id: "cos",
    name: "Chief of Staff",
    category: "Command",
    status: "live",
    description: "The conversational layer: recommends workflows, explains ROI, and drafts runbooks.",
    tasks: 64,
    sla: "1.8s",
    tools: ["All connected tools"],
  },
];

export const activity = [
  { id: "a1", agent: "Sales Agent", event: "Qualified Acme Labs (score 86). CRM updated. WhatsApp queued.", time: "12s ago", tone: "ok" },
  { id: "a2", agent: "Support Agent", event: "Resolved SHOP-4412: refund policy cited, no escalation.", time: "1m ago", tone: "ok" },
  { id: "a3", agent: "Marketing Agent", event: "Paused sequence “Win-back EU” — brand voice drift detected.", time: "6m ago", tone: "warn" },
  { id: "a4", agent: "Operations Agent", event: "SLA risk on warehouse ticket WH-19. Slack pinged ops-oncall.", time: "14m ago", tone: "warn" },
  { id: "a5", agent: "Data Analyst", event: "Checkout drop 11% on mobile Safari. Draft insight ready.", time: "32m ago", tone: "info" },
];

export const approvals = [
  {
    id: "ap-204",
    title: "Send WhatsApp follow-up to Priya Shah",
    detail: "Sales Agent · Lead score 91 · Proposed 18:30 IST slot",
    risk: "Customer message",
    wait: "2m",
  },
  {
    id: "ap-205",
    title: "Create HubSpot deal — Helios Retail",
    detail: "Amount $42k · Stage: Discovery · Owner: Maya",
    risk: "CRM write",
    wait: "11m",
  },
  {
    id: "ap-206",
    title: "Issue Stripe credit $84.20",
    detail: "Support Agent · Order #8891 · Policy match 0.97",
    risk: "Payment",
    wait: "28m",
  },
];

export const workflows = [
  {
    id: "wf-lead",
    name: "Inbound lead to meeting",
    health: 99,
    runs: 1284,
    owner: "Sales",
    trigger: "Form submit",
  },
  {
    id: "wf-ticket",
    name: "Tier-1 ticket resolve",
    health: 97,
    runs: 3401,
    owner: "Support",
    trigger: "Shopify + Gmail",
  },
  {
    id: "wf-cash",
    name: "Daily cash close",
    health: 94,
    runs: 62,
    owner: "Finance",
    trigger: "07:00 cron",
  },
  {
    id: "wf-winback",
    name: "Win-back EU",
    health: 81,
    runs: 190,
    owner: "Marketing",
    trigger: "Segment exit",
  },
];

export const roiSeries = [42, 48, 51, 63, 70, 86, 94, 112, 128, 141, 158, 186];

export const integrations = [
  { name: "Gmail", status: "connected", last: "live" },
  { name: "WhatsApp", status: "connected", last: "live" },
  { name: "Slack", status: "connected", last: "live" },
  { name: "HubSpot CRM", status: "connected", last: "2m ago" },
  { name: "Stripe", status: "connected", last: "live" },
  { name: "Shopify", status: "connected", last: "live" },
  { name: "Notion", status: "connected", last: "1h ago" },
  { name: "Google Drive", status: "connected", last: "12m ago" },
  { name: "Google Calendar", status: "connected", last: "live" },
  { name: "Microsoft Teams", status: "available", last: "—" },
  { name: "Salesforce", status: "available", last: "—" },
  { name: "Zendesk", status: "available", last: "—" },
];

export const team = [
  { name: "Maya Chen", role: "Owner", access: "Admin" },
  { name: "Omar Farid", role: "RevOps", access: "Operator" },
  { name: "Lina Park", role: "Support lead", access: "Reviewer" },
  { name: "Jonah Adeyemi", role: "Finance", access: "Reviewer" },
];

export const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    blurb: "Founders automating the first revenue loop.",
    items: ["3 agents", "2,000 tasks / mo", "Gmail, Calendar, Slack", "Human approval inbox", "Email support"],
    cta: "Start automating",
    featured: false,
  },
  {
    name: "Growth",
    price: "$249",
    period: "/mo",
    blurb: "SMEs running sales, support, and ops on one OS.",
    items: ["Unlimited agents", "50,000 tasks / mo", "CRM, Shopify, Stripe, WhatsApp", "Workflow versions + test runs", "SSO, audit log"],
    cta: "Start automating",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "Agencies and multi-brand operators with dedicated controls.",
    items: ["Private VPC / region", "Custom SLAs", "SCIM + DLP", "Dedicated success architect", "On-prem connectors"],
    cta: "Book a demo",
    featured: false,
  },
];

export const faqs = [
  {
    q: "Do agents send messages without me?",
    a: "Not by default. Customer messages, payments, and CRM writes wait in the approval inbox unless you mark a workflow as auto-run after it proves itself.",
  },
  {
    q: "What if I am not technical?",
    a: "Describe the job in plain language. Chief of Staff drafts the workflow, names the agents, and shows you the graph before anything goes live.",
  },
  {
    q: "Can this replace my existing tools?",
    a: "No. Nexaflow sits above Gmail, Slack, Shopify, Stripe, and your CRM. Agents use those systems; they do not ask you to migrate data on day one.",
  },
  {
    q: "How is cost controlled?",
    a: "Every task has a token and dollar cap. Analytics shows cost per workflow. Finance Agent can pause a run if it crosses the budget you set.",
  },
];

export const progressReports = [
  {
    src: "/media/report-weekly.png",
    title: "Weekly progress",
    body: "Revenue, pipeline, SLA, and automation ROI on one desk.",
  },
  {
    src: "/media/report-roi.png",
    title: "Automation ROI",
    body: "$186k returned this year versus ops cost of the same work.",
  },
  {
    src: "/media/report-desk.png",
    title: "Desk health",
    body: "Live agent load, task volume, and workflow success in one glance.",
  },
  {
    src: "/media/report-pipeline.png",
    title: "Pipeline progress",
    body: "Leads to qualified to meetings to closed — Northwind Q3.",
  },
];

export const useCases = [
  {
    id: "founders",
    title: "Startup founders",
    body: "Ship a 24/7 revenue desk before you hire RevOps. Qualify, follow up, and book meetings while you stay on product.",
  },
  {
    id: "sme",
    title: "SME & enterprise ops",
    body: "Standardize exceptions. Operations Agent watches SLAs; humans only touch the 3% that actually need judgment.",
  },
  {
    id: "agencies",
    title: "Agencies",
    body: "Clone a client workspace, attach their CRM and ads stack, and keep brand approval on every outbound.",
  },
  {
    id: "ecom",
    title: "E-commerce",
    body: "Support Agent reads Shopify + Stripe, answers “where is my order”, and only refunds after policy match.",
  },
];

export const commandItems = [
  { href: "/", label: "Go to Home", hint: "Home" },
  { href: "/app", label: "Go to Dashboard", hint: "Desk" },
  { href: "/app/admin", label: "Open admin dashboard", hint: "Admin" },
  { href: "/app/leads", label: "Open leads", hint: "Leads" },
  { href: "/app/leads/new", label: "Create lead and start graph", hint: "Run" },
  { href: "/app/inbox", label: "Review pending approvals", hint: "Inbox" },
  { href: "/app/outbox", label: "Open outbox", hint: "Outbox" },
  { href: "/app/agents", label: "Open agents", hint: "Agents" },
  { href: "/app/workflows", label: "Open workflows", hint: "Workflows" },
  { href: "/app/analytics", label: "Open analytics", hint: "Analytics" },
  { href: "/app/team", label: "Open team", hint: "Team" },
  { href: "/app/billing", label: "Open billing", hint: "Pay" },
];
