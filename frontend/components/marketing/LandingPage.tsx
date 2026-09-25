"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Lock, Radar, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useState } from "react";

import { AgentNetwork } from "@/components/marketing/AgentNetwork";
import { MuteLoopVideo, ReportStill } from "@/components/marketing/ReportMedia";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { Badge, Button, Card } from "@/components/ui";
import { agents, faqs, kpis, plans, progressReports } from "@/lib/sample";

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingPage() {
  return (
    <div className="bg-app grid-bg min-h-screen">
      <a href="#work" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <SiteHeader />
      <Hero />
      <LogoStrip />
      <ProgressReports />
      <AgentCategories />
      <WorkflowShowcase />
      <Intelligence />
      <Security />
      <Metrics />
      <PricingPreview />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section id="work" className="relative overflow-hidden px-5 pb-20 pt-16">
      <MuteLoopVideo
        src="/media/progress-data.mp4"
        poster="/media/report-weekly.png"
        label="Abstract data motion behind the Nexaflow hero"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(var(--bg)/0.55)] via-[rgb(var(--bg)/0.72)] to-[rgb(var(--bg))]" />
      <div className="noise-overlay" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Badge tone="mint">Human-approved · 2030 operating system</Badge>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="mt-6 max-w-xl text-5xl font-semibold tracking-tight sm:text-6xl"
          >
            Your AI workforce. Working 24/7.
          </motion.h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[rgb(var(--muted))]">
            Specialized agents for sales, support, ops, finance, marketing, HR, and analytics — collaborating under your approval. Built for founders, ops teams, agencies, and shops that cannot hire a 40-person machine.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/register">
              Start automating <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/pricing" variant="ghost">
              Book a demo
            </Button>
          </div>
        </div>
        <Card className="relative min-h-[360px] overflow-hidden p-4">
          <p className="px-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Live agent graph</p>
          <div className="h-[340px]">
            <AgentNetwork />
          </div>
        </Card>
      </div>
    </section>
  );
}

function ProgressReports() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="reports-heading">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-sky-300">Progress reports</p>
      <h2 id="reports-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">
        The week, in motion. Not another slide deck.
      </h2>
      <p className="mt-4 max-w-2xl text-[rgb(var(--muted))]">
        Operators watch live desk video and stills the board actually reads: weekly progress, ROI, pipeline, and agent health.
      </p>
      <div className="mt-10 overflow-hidden rounded-3xl border border-line">
        <MuteLoopVideo
          src="/media/progress-data.mp4"
          poster="/media/report-weekly.png"
          label="Data motion behind the weekly progress report reel"
          className="aspect-video h-auto w-full object-cover"
        />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {progressReports.map((report) => (
          <ReportStill key={report.src} {...report} />
        ))}
      </div>
      <div className="mt-8">
        <Button href="/app/analytics">Open ROI analytics</Button>
      </div>
    </section>
  );
}

function LogoStrip() {
  const names = ["Northwind", "Helios", "Atlas Agency", "Lumen Pay", "Orbit Labs", "Kite Retail"];
  return (
    <section className="border-y border-line py-8" aria-label="Trusted by">
      <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--muted))]">Trusted by operators in 28 countries</p>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-sm font-medium text-[rgb(var(--muted))]">
        {names.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </section>
  );
}

function AgentCategories() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-sky-300">Agents</p>
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight">A desk for every function. One approval layer.</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{agent.name}</p>
              <Badge tone={agent.status === "live" ? "ok" : "warn"}>{agent.status}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--muted))]">{agent.description}</p>
            <p className="mt-4 font-mono text-[11px] text-[rgb(var(--muted))]">{agent.tools.join(" · ")}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WorkflowShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">Workflows</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Describe the job. Watch the graph appear.</h2>
          <p className="mt-4 text-[rgb(var(--muted))]">
            “When a new lead submits a form, qualify them, update CRM, send WhatsApp follow-up, and schedule a meeting.” Chief of Staff compiles that into trigger, agent, condition, action, and approval nodes.
          </p>
          <Button href="/product" variant="soft" className="mt-6">
            See the builder <Workflow className="h-4 w-4" />
          </Button>
        </div>
        <Card className="font-mono text-xs leading-7">
          <p className="text-[rgb(var(--muted))]">natural language → graph</p>
          <p>1. Trigger · Web form</p>
          <p>2. Agent · Sales qualify</p>
          <p>3. Condition · score ≥ 70</p>
          <p>4. Action · HubSpot + WhatsApp</p>
          <p>5. Approval · human</p>
          <p>6. Action · Calendar hold</p>
        </Card>
      </div>
    </section>
  );
}

function Intelligence() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal-300">Intelligence</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Real-time business intelligence, not another BI login.</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: Radar, title: "Live activity", body: "Every agent write is streamed into a single feed with cost, latency, and outcome." },
          { icon: Sparkles, title: "Chief of Staff", body: "Ask why checkout dropped, or which workflow to clone for a new region." },
          { icon: ShieldCheck, title: "ROI truth", body: "Hours returned, dollars saved, and tasks that still need a human." },
        ].map((item) => (
          <Card key={item.title}>
            <item.icon className="h-5 w-5 text-sky-300" />
            <p className="mt-4 font-medium">{item.title}</p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{item.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-sky-300">Control</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Humans keep the last mile.</h2>
          <p className="mt-4 text-[rgb(var(--muted))]">
            Payments, customer messages, and CRM mutations wait in Inbox. Audit log, SSO, region lock, and per-workflow budget caps ship on Growth and Enterprise.
          </p>
        </div>
        <ul className="space-y-3 text-sm">
          {["Approval required on external writes", "SOC2-ready audit trail", "Role-based operators and reviewers", "Kill-switch per agent"].map((line) => (
            <li key={line} className="flex items-center gap-2 rounded-2xl border border-line px-4 py-3">
              <Lock className="h-4 w-4 text-teal-300" /> {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Metrics() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <h2 className="text-3xl font-semibold tracking-tight">Operators measure the desk, not the demo.</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-[rgb(var(--muted))]">{k.label}</p>
            <p className="mt-2 text-3xl font-semibold">{k.value}</p>
            <p className="mt-2 text-xs text-teal-300">{k.delta}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PricingPreview() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-10">
      <h2 className="text-3xl font-semibold tracking-tight">Pricing that tracks the workforce, not seats.</h2>
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.featured ? "ring-1 ring-sky-400/40" : ""}>
            <p className="font-medium">{plan.name}</p>
            <p className="mt-2 text-3xl font-semibold">
              {plan.price}
              <span className="text-base font-normal text-[rgb(var(--muted))]">{plan.period}</span>
            </p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{plan.blurb}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {plan.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-teal-300" /> {item}
                </li>
              ))}
            </ul>
            <Button href={plan.name === "Enterprise" ? "/pricing" : "/register"} variant={plan.featured ? "primary" : "ghost"} className="mt-6 w-full">
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-3xl px-5 py-16">
      <h2 className="text-3xl font-semibold tracking-tight">Questions operators actually ask</h2>
      <div className="mt-8 divide-y divide-[rgb(var(--line)/var(--line-a))]">
        {faqs.map((item, i) => (
          <div key={item.q} className="py-4">
            <button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setOpen(i)} aria-expanded={open === i}>
              <span className="font-medium">{item.q}</span>
              <ChevronDown className={`h-4 w-4 transition ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i ? <p className="mt-2 text-sm text-[rgb(var(--muted))]">{item.a}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 pb-20">
      <Card className="mx-auto max-w-6xl flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="text-2xl font-semibold">Put a workforce on the night shift.</p>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">Start in a demo workspace. Connect tools when you are ready.</p>
        </div>
        <div className="flex gap-3">
          <Button href="/app">Open the OS</Button>
          <Button href="/register" variant="ghost">
            Create workspace
          </Button>
        </div>
      </Card>
    </section>
  );
}
