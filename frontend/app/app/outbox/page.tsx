"use client";

import { useEffect, useState } from "react";

import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { OutboxEvent, Page } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function OutboxPage() {
  const { canOutbox } = useAuth();
  const [items, setItems] = useState<OutboxEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<Page<OutboxEvent>>("/outbox?page_size=50");
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load outbox."));
  }, []);

  async function retry(id: string) {
    try {
      await api(`/outbox/${id}/retry`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Retry failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Delivery</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Outbox</h1>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {!canOutbox ? <p className="text-sm text-amber-200">Outbox is for admin/operator.</p> : null}
      {items.length === 0 && !error ? <EmptyState title="Nothing in the outbox" body="Approved outreach and CRM writes land here after the graph." /> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase">{item.event_type}</p>
              <Badge tone={item.status === "delivered" ? "ok" : item.status === "failed" ? "warn" : "muted"}>{item.status}</Badge>
              {item.last_error ? <p className="mt-2 text-xs text-rose-300">{item.last_error}</p> : null}
            </div>
            {canOutbox && (item.status === "failed" || item.status === "pending") ? (
              <Button variant="ghost" onClick={() => void retry(item.id)}>
                Retry
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
