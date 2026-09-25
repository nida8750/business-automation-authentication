"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/api/types";

export default function OpsDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardSummary>("/dashboard/summary")
      .then(setData)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load."));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Desk</h1>
      <p className="mt-1 text-sm text-slate-400">Live run health, approvals, and delivery.</p>
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Leads" value={data?.leads_total ?? "—"} />
        <Card label="Runs" value={data?.runs_total ?? "—"} />
        <Link href="/ops/inbox">
          <Card label="Pending approvals" value={data?.pending_approvals ?? "—"} />
        </Link>
        <Link href="/ops/outbox">
          <Card label="Outbox delivered" value={data?.outbox_delivered ?? "—"} />
        </Link>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass-panel p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-3xl">{value}</p>
    </div>
  );
}
