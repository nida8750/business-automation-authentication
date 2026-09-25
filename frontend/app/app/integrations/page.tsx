"use client";

import { useEffect, useState } from "react";

import { Badge, Button, Card } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { Page, WorkspaceIntegration } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function IntegrationsPage() {
  const { canWriteLeads } = useAuth();
  const [rows, setRows] = useState<WorkspaceIntegration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const data = await api<Page<WorkspaceIntegration>>("/integrations");
    setRows(data.items.filter((row) => row.slug !== "n8n"));
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load integrations."));
  }, []);

  async function toggle(row: WorkspaceIntegration) {
    if (!canWriteLeads) return;
    setBusy(row.slug);
    setError(null);
    try {
      const on = row.status === "connected";
      await api(`/integrations/${row.slug}/${on ? "disconnect" : "connect"}`, { method: "POST" });
      setMsg(on ? `${row.name} disconnected.` : `${row.name} connected.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update integration.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Tools</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">SMTP and CRM require env vars. Others save connect state in Postgres.</p>
      </div>
      {msg ? <p className="text-sm text-teal-300">{msg}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const on = row.status === "connected";
          return (
            <Card key={row.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-[rgb(var(--muted))]">{on ? row.notes || "Connected" : "Not connected"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={on ? "ok" : "muted"}>{on ? "live" : "available"}</Badge>
                {canWriteLeads ? (
                  <Button variant={on ? "ghost" : "primary"} className="px-4 py-1.5 text-xs" disabled={busy === row.slug} onClick={() => void toggle(row)}>
                    {busy === row.slug ? "…" : on ? "Disconnect" : "Connect"}
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
