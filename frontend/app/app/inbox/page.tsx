"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button, Card, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { Approval, Page } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function InboxPage() {
  const { canReview } = useAuth();
  const [items, setItems] = useState<Approval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    const data = await api<Page<Approval>>("/approvals?status=pending&page_size=50");
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 403) {
        setError("Inbox is for admin or reviewer. Operators can start runs and watch traces.");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to load inbox.");
    });
  }, []);

  async function decide(id: string, ok: boolean) {
    setError(null);
    try {
      await api(`/approvals/${id}/${ok ? "approve" : "reject"}`, {
        method: "POST",
        body: { reason: ok ? "Approved from Nexaflow inbox" : "Rejected from Nexaflow inbox" },
      });
      setFlash(ok ? "Approved. Outbox will dispatch." : "Rejected.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Decision failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Last mile</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">Live approvals from outreach and CRM nodes.</p>
      </div>
      {flash ? (
        <p className="text-sm text-teal-300" role="status">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      {!canReview ? <p className="text-sm text-amber-200">Your role cannot decide approvals. Ask an admin or reviewer.</p> : null}
      {items.length === 0 && !error ? (
        <EmptyState title="Inbox clear" body="When a run reaches outreach/CRM with approval flags on, drafts wait here." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-medium">{item.action_type}</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">{item.status}</p>
                <pre className="mt-3 max-h-40 overflow-auto text-xs text-[rgb(var(--muted))]">{JSON.stringify(item.payload, null, 2)}</pre>
                <p className="mt-2 text-xs">
                  <Link className="text-sky-300" href={`/app/leads/${item.lead_id}`}>
                    Lead
                  </Link>
                  {" · "}
                  <Link className="text-sky-300" href={`/app/runs/${item.run_id}`}>
                    Trace
                  </Link>
                </p>
              </div>
              {canReview ? (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => void decide(item.id, false)}>
                    Reject
                  </Button>
                  <Button onClick={() => void decide(item.id, true)}>Approve</Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
