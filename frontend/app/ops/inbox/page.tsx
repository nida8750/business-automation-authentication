"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api/client";
import type { Approval, OutboxEvent, Page } from "@/lib/api/types";
import { MagneticButton } from "@/components/motion/MagneticButton";

export default function InboxPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<Page<Approval>>("/approvals?status=pending&page_size=50");
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load."));
  }, []);

  async function decide(id: string, approved: boolean) {
    await api(`/approvals/${id}/${approved ? "approve" : "reject"}`, {
      method: "POST",
      body: { reason: approved ? "Approved" : "Rejected" },
    });
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Approval inbox</h1>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <article key={item.id} className="glass-panel p-5">
            <p className="font-mono text-xs uppercase">{item.action_type}</p>
            <p className="mt-2 text-sm">
              <Link className="text-cyan-200" href={`/app/leads/${item.lead_id}`}>Lead</Link>
              {" · "}
              <Link className="text-cyan-200" href={`/app/runs/${item.run_id}`}>Trace</Link>
            </p>
            <pre className="mt-3 max-h-48 overflow-auto text-xs text-slate-300">{JSON.stringify(item.payload, null, 2)}</pre>
            <div className="mt-4 flex gap-3">
              <MagneticButton onClick={() => void decide(item.id, true)}>Approve</MagneticButton>
              <MagneticButton onClick={() => void decide(item.id, false)}>Reject</MagneticButton>
            </div>
          </article>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-400">Inbox is empty.</p> : null}
      </div>
    </div>
  );
}

export function OutboxList() {
  const [items, setItems] = useState<OutboxEvent[]>([]);

  useEffect(() => {
    api<Page<OutboxEvent>>("/outbox?page_size=50")
      .then((data) => setItems(data.items))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Outbox</h1>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="glass-panel p-4 text-sm">
            <span className="font-mono text-xs uppercase">{item.event_type}</span>
            <span className="ml-3 text-slate-400">{item.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
