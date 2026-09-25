"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { AgentRun, Approval, DashboardSummary, Lead, Page } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, canWriteLeads } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [pending, setPending] = useState<Approval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState(
    "Qualify this inbound, draft outreach, and propose a CRM update. Wait for human approval.",
  );

  useEffect(() => {
    Promise.all([
      api<DashboardSummary>("/dashboard/summary"),
      api<Page<AgentRun>>("/runs?page_size=8"),
      api<Page<Approval>>("/approvals?status=pending&page_size=8").catch(() => ({ items: [] as Approval[], total: 0, page: 1, page_size: 8 })),
    ])
      .then(([desk, runPage, approvalPage]) => {
        setSummary(desk);
        setRuns(runPage.items);
        setPending(approvalPage.items);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Backend not reachable. Start FastAPI on :8000."));
  }, []);

  async function startGraph(event: FormEvent) {
    event.preventDefault();
    if (!canWriteLeads) {
      setError("Only admin or operator can start a run.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const lead = await api<Lead>("/leads", {
        method: "POST",
        body: {
          full_name: name,
          email,
          company,
          notes,
          start_run: true,
        },
      });
      router.push(`/app/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the graph.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Live desk</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{user?.full_name || "Nexaflow"}</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">LangGraph: supervisor → research → qualify → outreach → CRM → reporting</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/" variant="ghost">
            Home
          </Button>
          <Button href="/app/admin" variant="ghost">
            Admin
          </Button>
          <Button href="/app/leads/new">New lead</Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}

      {canWriteLeads ? (
        <form onSubmit={(e) => void startGraph(e)} className="glass rounded-3xl p-4">
          <label htmlFor="nl" className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
            <Sparkles className="h-4 w-4 text-sky-300" /> Start a live agent run
          </label>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input className="rounded-2xl border border-line bg-[rgb(var(--bg))] px-3 py-2 text-sm" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="rounded-2xl border border-line bg-[rgb(var(--bg))] px-3 py-2 text-sm" type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="rounded-2xl border border-line bg-[rgb(var(--bg))] px-3 py-2 text-sm" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <textarea
            id="nl"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-3 w-full resize-none rounded-2xl border border-line bg-[rgb(var(--bg))] px-3 py-2 text-sm outline-none"
          />
          <Button type="submit" className="mt-3" disabled={busy}>
            {busy ? "Queuing graph…" : "Run supervisor graph"}
          </Button>
        </form>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Leads" value={summary?.leads_total} href="/app/leads" />
        <Kpi label="Runs" value={summary?.runs_total} />
        <Kpi label="Pending approvals" value={summary?.pending_approvals} href="/app/inbox" />
        <Kpi label="Outbox delivered" value={summary?.outbox_delivered} href="/app/outbox" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Recent runs</h2>
            <Badge tone="ok">API</Badge>
          </div>
          {!summary && !error ? <Skeleton className="mt-4 h-32" /> : null}
          <ul className="mt-4 space-y-3">
            {runs.map((run) => (
              <li key={run.id}>
                <Link href={`/app/runs/${run.id}`} className="block rounded-2xl border border-line px-3 py-3 hover:bg-white/5">
                  <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))]">
                    <span className="font-mono">{run.id.slice(0, 8)}</span>
                    <span>{run.status}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    {run.trigger} · tokens {run.prompt_tokens + run.completion_tokens}
                    {run.latency_ms ? ` · ${run.latency_ms}ms` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {summary && runs.length === 0 ? <EmptyState title="No runs yet" body="Create a lead with “start agent run” to fire supervisor → research → qualify → outreach → CRM → reporting." /> : null}
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Pending approvals</h2>
            <Link href="/app/inbox" className="text-xs text-sky-300">
              Inbox <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {pending.map((item) => (
              <li key={item.id} className="rounded-2xl border border-line px-3 py-3">
                <p className="text-sm font-medium">{item.action_type}</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">{item.status}</p>
                <Link className="mt-2 inline-block text-xs text-sky-300" href={`/app/runs/${item.run_id}`}>
                  Open trace
                </Link>
              </li>
            ))}
          </ul>
          {summary && pending.length === 0 ? <p className="mt-4 text-sm text-[rgb(var(--muted))]">No pending approvals.</p> : null}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, href }: { label: string; value?: number; href?: string }) {
  const inner = (
    <Card>
      <p className="text-sm text-[rgb(var(--muted))]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value ?? "—"}</p>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
