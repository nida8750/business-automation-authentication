"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api/client";
import type { AgentRun, Lead, LeadCreate, Page } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { MagneticButton } from "@/components/motion/MagneticButton";

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Page<Lead>>("/leads?page_size=50")
      .then((data) => setRows(data.items))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load."));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-3xl font-semibold">Leads</h1>
        <MagneticButton href="/app/leads/new">New lead</MagneticButton>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <Link className="text-cyan-200" href={`/app/leads/${lead.id}`}>
                    {lead.full_name}
                  </Link>
                  <div className="text-xs text-slate-400">{lead.email}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{lead.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NewLeadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LeadCreate>({
    email: "",
    full_name: "",
    company: "",
    notes: "",
    start_run: true,
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const lead = await api<Lead>("/leads", { method: "POST", body: form });
      router.push(`/app/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="glass-panel max-w-xl space-y-3 p-6" onSubmit={(e) => void onSubmit(e)}>
      <h1 className="text-2xl font-semibold">New lead</h1>
      <input className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      <input className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2" type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
      <textarea className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={form.start_run} onChange={(e) => setForm({ ...form, start_run: e.target.checked })} />
        Start agent run
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <MagneticButton type="submit">{busy ? "Saving…" : "Create"}</MagneticButton>
    </form>
  );
}

export function LeadDetail() {
  const params = useParams<{ leadId: string }>();
  const { canWriteLeads } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(id: string) {
    const [row, page] = await Promise.all([api<Lead>(`/leads/${id}`), api<Page<AgentRun>>(`/runs?lead_id=${id}`)]);
    setLead(row);
    setRuns(page.items);
  }

  useEffect(() => {
    const id = params.leadId;
    if (!id) return;
    load(id).catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load."));
  }, [params.leadId]);

  async function startRun() {
    if (!lead) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/leads/${lead.id}/runs`, { method: "POST" });
      await load(lead.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start run.");
    } finally {
      setBusy(false);
    }
  }

  if (!lead) return <p className="text-sm text-slate-400">{error || "Loading…"}</p>;

  return (
    <div>
      <h1 className="text-3xl font-semibold">{lead.full_name}</h1>
      <p className="text-sm text-slate-400">{lead.email} · {lead.status}</p>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      {canWriteLeads ? (
        <MagneticButton onClick={() => void startRun()}>{busy ? "Queuing…" : "Start agent run"}</MagneticButton>
      ) : null}
      <h2 className="mt-8 text-lg">Runs</h2>
      <ul className="mt-3 space-y-2">
        {runs.map((run) => (
          <li key={run.id} className="glass-panel px-4 py-3">
            <Link className="font-mono text-cyan-200" href={`/app/runs/${run.id}`}>
              {run.id.slice(0, 8)}
            </Link>
            <span className="ml-3 text-xs text-slate-400">{run.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
