"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { Badge, Button, Card } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { Plan } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

function money(cents: number) {
  if (cents === 0) return "Custom";
  return `$${(cents / 100).toFixed(0)}`;
}

export default function PricingPage() {
  const { user, ready } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    api<Plan[]>("/billing/plans", { auth: false }).then(setPlans).catch(() => setPlans([]));
  }, []);

  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <Badge tone="mint">Pricing</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Pay for the workforce, not another seat tax.</h1>
        <p className="mt-4 max-w-2xl text-lg text-[rgb(var(--muted))]">
          Starter trial after you register. Growth charges the card on file (test Visa 4242…). Enterprise is sales-led.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.code} className={plan.featured ? "ring-1 ring-sky-400/40" : ""}>
              <h2 className="text-lg font-medium">{plan.name}</h2>
              <p className="mt-3 text-4xl font-semibold">
                {money(plan.price_cents)}
                <span className="text-base font-normal text-[rgb(var(--muted))]">{plan.period}</span>
              </p>
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">{plan.blurb}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" /> {item}
                  </li>
                ))}
              </ul>
              <Button
                href={plan.code === "enterprise" ? "/register" : ready && user ? "/app/billing" : "/register"}
                variant={plan.featured ? "primary" : "ghost"}
                className="mt-8 w-full"
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
