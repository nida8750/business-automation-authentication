"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { api, ApiError } from "@/lib/api/client";
import type { AgentRun } from "@/lib/api/types";

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.runId) return;
    api<AgentRun>(`/runs/${params.runId}`)
      .then(setRun)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load."));
  }, [params.runId]);

  if (!run) return <p className="text-sm text-slate-400">{error || "Loading…"}</p>;

  return (
    <div>
      <h1 className="text-3xl font-semibold">Run</h1>
      <p className="text-sm text-slate-400">
        {run.status} · <Link className="text-cyan-200" href={`/app/leads/${run.lead_id}`}>lead</Link>
      </p>
      <ol className="mt-6 space-y-3">
        {(run.steps || []).map((step) => (
          <li key={step.id} className="glass-panel p-4">
            <div className="flex justify-between font-mono text-xs uppercase">
              <span>{step.agent}</span>
              <span>{step.status}</span>
            </div>
            {step.output_payload ? (
              <pre className="mt-3 overflow-auto text-xs text-slate-300">{JSON.stringify(step.output_payload, null, 2)}</pre>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
