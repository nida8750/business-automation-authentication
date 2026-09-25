"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { Page, WorkspaceAgent } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { listCustomAgents, type CustomAgent } from "@/lib/custom-desk";

export default function AgentsPage() {
  const { canWriteLeads } = useAuth();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<WorkspaceAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomAgent[]>([]);

  async function load() {
    const data = await api<Page<WorkspaceAgent>>("/agents");
    setRows(data.items);
  }

  useEffect(() => {
    setCustom(listCustomAgents());
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load agents."));
  }, []);

  const filtered = useMemo(
    () => rows.filter((a) => `${a.name} ${a.description} ${a.category}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  async function toggle(agent: WorkspaceAgent) {
    if (!canWriteLeads) return;
    setBusy(agent.slug);
    setError(null);
    try {
      const on = agent.status === "deployed";
      await api(`/agents/${agent.slug}/${on ? "pause" : "deploy"}`, { method: "POST" });
      setToast(on ? `${agent.name} paused.` : `${agent.name} deployed.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update agent.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Marketplace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">Core graph nodes stay deployed. Extra agents persist in Postgres.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button href="/" variant="ghost">
            Home
          </Button>
          <Button href="/app/workflows">Custom agent</Button>
          <label className="text-sm">
            <span className="sr-only">Filter agents</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents" className="rounded-full border border-line bg-transparent px-4 py-2" />
          </label>
        </div>
      </div>
      {toast ? <p className="text-sm text-teal-300">{toast}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {custom.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {custom.map((agent) => (
            <Card key={agent.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">{agent.role}</p>
                </div>
                <Badge tone="ok">custom</Badge>
              </div>
              <p className="mt-3 text-sm text-[rgb(var(--muted))]">{agent.prompt || "Desk-only custom agent."}</p>
              <p className="mt-3 font-mono text-[11px] text-[rgb(var(--muted))]">{agent.tools || "no tools listed"}</p>
            </Card>
          ))}
        </div>
      ) : null}
      {filtered.length === 0 && !error ? (
        <EmptyState title="No agents match" body="Try “sales” or “research”." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((agent) => {
            const on = agent.status === "deployed";
            return (
              <Card key={agent.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted))]">{agent.category}</p>
                  </div>
                  <Badge tone={on ? "ok" : "muted"}>{agent.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-[rgb(var(--muted))]">{agent.description}</p>
                <p className="mt-3 font-mono text-[11px] text-[rgb(var(--muted))]">
                  {agent.tasks} steps · {agent.tools.join(", ")}
                  {agent.is_core ? " · core" : ""}
                </p>
                {canWriteLeads ? (
                  <Button variant={on ? "ghost" : "primary"} className="mt-4" disabled={busy === agent.slug} onClick={() => void toggle(agent)}>
                    {busy === agent.slug ? "Saving…" : on ? "Pause" : "Deploy"}
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
