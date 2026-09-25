"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge, Button, Card } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { AgentRun } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const GRAPH = ["supervisor", "research", "qualification", "outreach", "crm", "reporting"];

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const { canWriteLeads } = useAuth();
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!params.runId) return;
    const data = await api<AgentRun>(`/runs/${params.runId}`);
    setRun(data);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load run."));
  }, [params.runId]);

  async function cancel() {
    if (!run) return;
    try {
      await api(`/runs/${run.id}/cancel`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed.");
    }
  }

  if (!run) return <p className="text-sm text-[rgb(var(--muted))]">{error || "Loading…"}</p>;

  const seen = new Set((run.steps || []).map((s) => s.agent));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Trace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Run {run.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            {run.status} · <Link className="text-sky-300" href={`/app/leads/${run.lead_id}`}>lead</Link>
          </p>
        </div>
        {canWriteLeads && (run.status === "queued" || run.status === "running") ? (
          <Button variant="ghost" onClick={() => void cancel()}>
            Cancel
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {GRAPH.map((node) => (
          <Badge key={node} tone={seen.has(node) ? "ok" : "muted"}>
            {node}
          </Badge>
        ))}
      </div>
      <ol className="space-y-3">
        {(run.steps || []).map((step) => (
          <li key={step.id}>
            <Card>
              <div className="flex justify-between font-mono text-xs uppercase">
                <span>{step.agent}</span>
                <Badge tone={step.status === "succeeded" || step.status === "completed" ? "ok" : step.status === "failed" ? "warn" : "muted"}>
                  {step.status}
                </Badge>
              </div>
              {step.output_payload ? (
                <pre className="mt-3 overflow-auto text-xs text-[rgb(var(--muted))]">{JSON.stringify(step.output_payload, null, 2)}</pre>
              ) : null}
              {step.error_message ? <p className="mt-2 text-sm text-rose-300">{step.error_message}</p> : null}
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
