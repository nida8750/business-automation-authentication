"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import type { ReactNode } from "react";

import { MagneticButton } from "@/components/motion/MagneticButton";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden px-6 pb-24 pt-28 sm:px-10 lg:px-16">
      <a href="#work" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <div className="noise-overlay" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-100/80">Nexaflow</p>
        <MagneticButton href="/login">
          Enter desk
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </MagneticButton>
      </header>

      <div id="work" className="relative z-10 mx-auto mt-20 grid max-w-6xl items-center gap-12 lg:mt-28 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-cyan-100/90 backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Multi-agent operations, human-approved
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease, delay: 0.08 }}
            className="mt-6 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight text-mist sm:text-6xl"
          >
            Leads arrive.
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">
              Agents research.
            </span>
            You decide.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.16 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-slate-300/90"
          >
            A quiet command surface for sales ops. The core breathes with your cursor — a live model of the supervisor graph: research, qualify, draft, wait.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease, delay: 0.24 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <MagneticButton href="/register">Create workspace</MagneticButton>
            <MagneticButton href="/app">Open live desk</MagneticButton>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease, delay: 0.12 }}
          className="relative hidden min-h-[420px] rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-2xl lg:block"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">Live graph</p>
          <ul className="mt-6 space-y-3 text-sm text-slate-200/90">
            <PulseRow icon={<Workflow className="h-4 w-4" />} label="Supervisor routes research" />
            <PulseRow icon={<Sparkles className="h-4 w-4" />} label="Qualification scores fit" delay={0.15} />
            <PulseRow icon={<ShieldCheck className="h-4 w-4" />} label="Outreach waits for you" delay={0.3} />
          </ul>
          <p className="mt-8 text-xs leading-relaxed text-slate-400">
            Move the cursor. The orb tracks velocity, not just position — the same way a run should feel: elastic, never snappy.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function PulseRow({
  icon,
  label,
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  delay?: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + delay, duration: 0.7, ease }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
    >
      <span className="text-cyan-200">{icon}</span>
      {label}
    </motion.li>
  );
}
