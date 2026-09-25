"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge, Button, Card } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type {
  AgentRun,
  AnalyticsSummary,
  Approval,
  BillingSummary,
  DashboardSummary,
  OutboxEvent,
  Page,
  TeamMember,
  WorkspaceAgent,
  WorkspaceIntegration,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { listCustomAgents, listCustomWorkflows } from "@/lib/custom-desk";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, ready, isAdmin } = useAuth();
  const [desk, setDesk] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [agents, setAgents] = useState<WorkspaceAgent[]>([]);
  const [integrations, setIntegrations] = useState<WorkspaceIntegration[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [outbox, setOutbox] = useState<OutboxEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customAgents, setCustomAgents] = useState<ReturnType<typeof listCustomAgents>>([]);
  const [customFlows, setCustomFlows] = useState<ReturnType<typeof listCustomWorkflows>>([]);

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin) {
      router.replace("/app");
    }
  }, [ready, isAdmin, router]);

  useEffect(() => {
    setCustomAgents(listCustomAgents());
    setCustomFlows(listCustomWorkflows());
    if (!isAdmin) return;
    Promise.all([
      api<DashboardSummary>("/dashboard/summary"),
      api<AnalyticsSummary>("/analytics/summary").catch(() => null),
      api<BillingSummary>("/billing/summary").catch(() => null),
      api<Page<TeamMember>>("/team").catch(() => ({ items: [] as TeamMember[] })),
      api<Page<WorkspaceAgent>>("/agents").catch(() => ({ items: [] as WorkspaceAgent[] })),
      api<Page<WorkspaceIntegration>>("/integrations").catch(() => ({ items: [] as WorkspaceIntegration[] })),
      api<Page<AgentRun>>("/runs?page_size=10").catch(() => ({ items: [] as AgentRun[] })),
      api<Page<Approval>>("/approvals?status=pending&page_size=8").catch(() => ({ items: [] as Approval[] })),
      api<Page<OutboxEvent>>("/outbox?page_size=8").catch(() => ({ items: [] as OutboxEvent[] })),
    ])
      .then(([summary, stats, bill, members, agentPage, integrationPage, runPage, approvalPage, outboxPage]) => {
        setDesk(summary);
        setAnalytics(stats);
        setBilling(bill);
        setTeam(members.items);
        setAgents(agentPage.items);
        setIntegrations(integrationPage.items.filter((row) => row.slug !== "n8n"));
        setRuns(runPage.items);
        setApprovals(approvalPage.items);
        setOutbox(outboxPage.items);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load admin dashboard."));
  }, [isAdmin]);

  if (!ready || !isAdmin) {
    return (
      <div className="space-y-3 py-10">
        <p className="text-sm text-[rgb(var(--muted))]">
          {!ready ? "Checking access…" : "Admin only — redirecting to Home."}
        </p>
      </div>
    );
  }

  const kpis = [
    { label: "Leads", value: desk?.leads_total ?? 0 },
    { label: "Runs", value: desk?.runs_total ?? 0 },
    { label: "Pending inbox", value: desk?.pending_approvals ?? approvals.length },
    { label: "Outbox pending", value: desk?.outbox_pending ?? 0 },
    { label: "Outbox delivered", value: desk?.outbox_delivered ?? 0 },
    { label: "Team", value: team.length },
    { label: "Deployed agents", value: agents.filter((a) => a.status === "deployed").length },
    { label: "Live integrations", value: integrations.filter((i) => i.status === "connected").length },
  ];

  const leadStatuses = Object.entries(desk?.leads_by_status || {});
  const runStatuses = Object.entries(desk?.runs_by_status || analytics?.runs_by_status || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Full workspace panel for {user?.full_name} · {user?.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/" variant="ghost">
            Home
          </Button>
          <Button href="/app/team">Team</Button>
          <Button href="/app/billing" variant="ghost">
            Billing
          </Button>
          <Button href="/app/workflows" variant="ghost">
            Workflows
          </Button>
          <Button href="/app/settings" variant="ghost">
            Settings
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-xs text-[rgb(var(--muted))]">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">Leads by status</h2>
          <ul className="mt-4 space-y-2">
            {leadStatuses.length === 0 ? (
              <li className="text-sm text-[rgb(var(--muted))]">No leads yet.</li>
            ) : (
              leadStatuses.map(([status, count]) => (
                <li key={status} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                  <span>{status}</span>
                  <Badge>{count}</Badge>
                </li>
              ))
            )}
          </ul>
          <Button href="/app/leads" className="mt-4" variant="ghost">
            Open leads
          </Button>
        </Card>
        <Card>
          <h2 className="font-medium">Runs by status</h2>
          <ul className="mt-4 space-y-2">
            {runStatuses.length === 0 ? (
              <li className="text-sm text-[rgb(var(--muted))]">No runs yet.</li>
            ) : (
              runStatuses.map(([status, count]) => (
                <li key={status} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                  <span>{status}</span>
                  <Badge tone="ok">{count}</Badge>
                </li>
              ))
            )}
          </ul>
          <p className="mt-3 text-sm text-[rgb(var(--muted))]">
            Tokens: {(desk?.prompt_tokens ?? 0) + (desk?.completion_tokens ?? 0)} · Avg latency{" "}
            {desk?.avg_run_latency_ms != null ? `${Math.round(desk.avg_run_latency_ms)} ms` : "—"}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="font-medium">Billing</h2>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Plan <span className="text-[rgb(var(--text))]">{billing?.plan ?? "—"}</span> · {billing?.status ?? "unknown"}
          </p>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Cards: {billing?.payment_methods.length ?? 0} · Invoices: {billing?.invoices.length ?? 0}
          </p>
          {billing?.current_period_end ? (
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">Period ends {new Date(billing.current_period_end).toLocaleDateString()}</p>
          ) : null}
          <ul className="mt-3 space-y-1 text-xs text-[rgb(var(--muted))]">
            {(billing?.invoices || []).slice(0, 3).map((inv) => (
              <li key={inv.id}>
                {inv.plan} · {(inv.amount_cents / 100).toFixed(2)} {inv.currency.toUpperCase()} · {inv.status}
              </li>
            ))}
          </ul>
          <Button href="/app/billing" className="mt-4" variant="ghost">
            Open billing
          </Button>
        </Card>
        <Card>
          <h2 className="font-medium">Analytics</h2>
          {analytics ? (
            <>
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                Est. cost ${analytics.estimated_cost_usd.toFixed(2)} · ROI ${analytics.estimated_roi_usd.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-[rgb(var(--muted))]">Hours returned: {analytics.hours_returned.toFixed(1)}</p>
              <ul className="mt-3 space-y-1">
                {analytics.kpis.slice(0, 4).map((kpi) => (
                  <li key={kpi.label} className="flex justify-between text-xs">
                    <span className="text-[rgb(var(--muted))]">{kpi.label}</span>
                    <span>
                      {kpi.value} <span className="text-[rgb(var(--muted))]">{kpi.delta}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">Analytics unavailable.</p>
          )}
          <Button href="/app/analytics" className="mt-4" variant="ghost">
            Open analytics
          </Button>
        </Card>
        <Card>
          <h2 className="font-medium">Desk extras</h2>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Custom agents: {customAgents.length} · Custom workflows: {customFlows.length}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-[rgb(var(--muted))]">
            {customAgents.slice(0, 4).map((agent) => (
              <li key={agent.id}>
                {agent.name} · {agent.role}
              </li>
            ))}
            {customAgents.length === 0 ? <li>No custom agents yet.</li> : null}
          </ul>
          <Button href="/app/workflows" className="mt-4" variant="ghost">
            Open workflows
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">Team</h2>
          <ul className="mt-4 space-y-2">
            {team.map((member) => (
              <li key={member.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                <span>
                  {member.full_name} <span className="text-[rgb(var(--muted))]">{member.email}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone={member.email_verified ? "ok" : "warn"}>{member.email_verified ? "verified" : "unverified"}</Badge>
                  <Badge>{member.role}</Badge>
                </div>
              </li>
            ))}
          </ul>
          {team.length === 0 ? <p className="mt-4 text-sm text-[rgb(var(--muted))]">No teammates loaded.</p> : null}
          <Button href="/app/team" className="mt-4" variant="ghost">
            Manage team
          </Button>
        </Card>
        <Card>
          <h2 className="font-medium">Agents & integrations</h2>
          <ul className="mt-4 space-y-2">
            {agents.map((agent) => (
              <li key={agent.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                <span>{agent.name}</span>
                <Badge tone={agent.status === "deployed" ? "ok" : "muted"}>{agent.status}</Badge>
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-2">
            {integrations.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                <span>{row.name}</span>
                <Badge tone={row.status === "connected" ? "ok" : "muted"}>{row.status}</Badge>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button href="/app/agents" variant="ghost">
              Agents
            </Button>
            <Button href="/app/integrations" variant="ghost">
              Integrations
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">Pending approvals</h2>
          <ul className="mt-4 space-y-2">
            {approvals.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                <Link className="text-sky-300" href="/app/inbox">
                  {item.action_type}
                </Link>
                <span className="font-mono text-xs text-[rgb(var(--muted))]">{item.id.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
          {approvals.length === 0 ? <p className="mt-4 text-sm text-[rgb(var(--muted))]">Inbox is clear.</p> : null}
          <Button href="/app/inbox" className="mt-4" variant="ghost">
            Open inbox
          </Button>
        </Card>
        <Card>
          <h2 className="font-medium">Outbox</h2>
          <ul className="mt-4 space-y-2">
            {outbox.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                <span>{item.event_type}</span>
                <Badge tone={item.status === "delivered" ? "ok" : "warn"}>{item.status}</Badge>
              </li>
            ))}
          </ul>
          {outbox.length === 0 ? <p className="mt-4 text-sm text-[rgb(var(--muted))]">No outbox events.</p> : null}
          <Button href="/app/outbox" className="mt-4" variant="ghost">
            Open outbox
          </Button>
        </Card>
      </div>

      <Card>
        <h2 className="font-medium">Recent runs</h2>
        <ul className="mt-4 space-y-2">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
              <Link className="font-mono text-sky-300" href={`/app/runs/${run.id}`}>
                {run.id.slice(0, 8)}
              </Link>
              <span className="text-[rgb(var(--muted))]">
                {run.trigger} · {run.status}
              </span>
            </li>
          ))}
        </ul>
        {runs.length === 0 ? <p className="mt-4 text-sm text-[rgb(var(--muted))]">No runs yet.</p> : null}
      </Card>
    </div>
  );
}
