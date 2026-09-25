"use client";

import { useEffect, useState } from "react";

import { MuteLoopVideo, ReportStill } from "@/components/marketing/ReportMedia";
import { Badge, Card } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { AnalyticsSummary } from "@/lib/api/types";
import { progressReports } from "@/lib/sample";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AnalyticsSummary>("/analytics/summary")
      .then(setData)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load analytics."));
  }, []);

  const max = Math.max(1, ...(data?.series.map((p) => p.runs) || [1]));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Returns</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Analytics and ROI</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">Live counts from leads, runs, tokens, and outbox — not sample Northwind data.</p>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="overflow-hidden rounded-3xl border border-line">
        <MuteLoopVideo src="/media/progress-data.mp4" poster="/media/report-roi.png" label="Data visualization loop for the ROI desk" className="aspect-[21/9] h-auto w-full object-cover" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(data?.kpis || []).map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-[rgb(var(--muted))]">{k.label}</p>
            <p className="mt-2 text-3xl font-semibold">{k.value}</p>
            <p className="mt-2 text-xs text-teal-300">{k.delta}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {progressReports.map((report) => (
          <ReportStill key={report.src} {...report} />
        ))}
      </div>
      <Card>
        <h2 className="font-medium">Steps by agent</h2>
        <div className="mt-6 space-y-4">
          {Object.entries(data?.runs_by_agent || {}).map(([name, count]) => (
            <div key={name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{name}</span>
                <span className="text-[rgb(var(--muted))]">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-teal-300" style={{ width: `${Math.min(100, count * 8)}%` }} />
              </div>
            </div>
          ))}
          {data && Object.keys(data.runs_by_agent).length === 0 ? <p className="text-sm text-[rgb(var(--muted))]">No steps yet. Start a run from Home.</p> : null}
        </div>
      </Card>
      <Card>
        <h2 className="font-medium">Runs over time</h2>
        <div className="mt-6 flex h-40 items-end gap-2">
          {(data?.series.length ? data.series : [{ date: "—", runs: 0, tokens: 0 }]).map((point) => (
            <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-lg bg-sky-500/80" style={{ height: `${(point.runs / max) * 100}%` }} title={`${point.runs} runs`} />
              <span className="text-[10px] text-[rgb(var(--muted))]">{point.date.slice(5) || "—"}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[rgb(var(--muted))]">
          <Badge tone="mint">Live</Badge> Est. ROI ${data?.estimated_roi_usd ?? 0} · tokens {data ? data.prompt_tokens + data.completion_tokens : 0} · outbox {data?.outbox_delivered ?? 0}
        </p>
      </Card>
    </div>
  );
}
