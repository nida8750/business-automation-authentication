"use client";

import { FormEvent, useEffect, useState } from "react";

import { Badge, Button, Card, Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { BillingSummary, Plan } from "@/lib/api/types";

function money(cents: number) {
  if (cents === 0) return "Custom";
  return `$${(cents / 100).toFixed(0)}`;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("4242424242424242");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("2030");
  const [cvc, setCvc] = useState("123");
  const [busy, setBusy] = useState(false);

  async function load() {
    const summary = await api<BillingSummary>("/billing/summary");
    setData(summary);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load billing."));
  }, []);

  async function addCard(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/billing/payment-methods", {
        method: "POST",
        body: {
          holder_name: holder,
          card_number: number.replace(/\s/g, ""),
          exp_month: Number(expMonth),
          exp_year: Number(expYear),
          cvc,
        },
      });
      setFlash("Card saved. Only brand, last4, and expiry are stored — never the PAN or CVC.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save card.");
    } finally {
      setBusy(false);
    }
  }

  async function subscribe(plan: Plan["code"]) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ billing: BillingSummary; message: string }>("/billing/subscribe", {
        method: "POST",
        body: { plan },
      });
      setData(result.billing);
      setFlash(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Subscribe failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      const summary = await api<BillingSummary>("/billing/cancel", { method: "POST" });
      setData(summary);
      setFlash("Subscription canceled. You are on Starter.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Billing</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Payment methods</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Current plan <Badge>{data?.plan || "—"}</Badge> · {data?.status || "—"}
        </p>
      </div>
      {flash ? <p className="text-sm text-teal-300">{flash}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Card>
        <h2 className="font-medium">Card on file</h2>
        <p className="mt-1 text-xs text-[rgb(var(--muted))]">Test Visa: 4242 4242 4242 4242 · any future expiry · any CVC</p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(e) => void addCard(e)}>
          <Field label="Name on card" value={holder} onChange={(e) => setHolder(e.target.value)} required />
          <Field label="Card number" inputMode="numeric" autoComplete="cc-number" value={number} onChange={(e) => setNumber(e.target.value)} required />
          <Field label="Exp month" inputMode="numeric" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} required />
          <Field label="Exp year" inputMode="numeric" value={expYear} onChange={(e) => setExpYear(e.target.value)} required />
          <Field label="CVC" inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value)} required />
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save card"}</Button>
          </div>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {(data?.payment_methods || []).map((pm) => (
            <li key={pm.id} className="flex justify-between rounded-2xl border border-line px-3 py-2">
              <span className="capitalize">{pm.brand} •••• {pm.last4}</span>
              <span className="text-[rgb(var(--muted))]">{pm.exp_month}/{pm.exp_year}{pm.is_default ? " · default" : ""}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {(data?.plans || []).map((plan) => (
          <Card key={plan.code} className={plan.featured ? "ring-1 ring-sky-400/40" : ""}>
            <h2 className="text-lg font-medium">{plan.name}</h2>
            <p className="mt-3 text-4xl font-semibold">
              {money(plan.price_cents)}
              <span className="text-base font-normal text-[rgb(var(--muted))]">{plan.period}</span>
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{plan.blurb}</p>
            <Button className="mt-6 w-full" variant={plan.featured ? "primary" : "ghost"} disabled={busy || plan.code === "enterprise"} onClick={() => void subscribe(plan.code)}>
              {data?.plan === plan.code ? "Current" : plan.cta}
            </Button>
          </Card>
        ))}
      </div>
      <Button variant="ghost" onClick={() => void cancel()} disabled={busy}>Cancel paid plan</Button>

      <Card>
        <h2 className="font-medium">Invoices</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.invoices || []).map((inv) => (
            <li key={inv.id} className="flex justify-between border-t border-line py-2">
              <span>{inv.plan} · {inv.status}</span>
              <span>${(inv.amount_cents / 100).toFixed(2)} {inv.currency.toUpperCase()}</span>
            </li>
          ))}
          {data && data.invoices.length === 0 ? <p className="text-[rgb(var(--muted))]">No invoices yet.</p> : null}
        </ul>
      </Card>
    </div>
  );
}
