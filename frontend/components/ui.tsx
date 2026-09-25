import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";

const tones = {
  blue: "text-sky-300 bg-sky-400/10 ring-sky-400/20",
  violet: "text-violet-300 bg-violet-400/10 ring-violet-400/20",
  mint: "text-teal-200 bg-teal-400/10 ring-teal-400/20",
  warn: "text-amber-200 bg-amber-400/10 ring-amber-400/20",
  ok: "text-emerald-200 bg-emerald-400/10 ring-emerald-400/20",
  muted: "text-[rgb(var(--muted))] bg-white/5 ring-white/10",
};

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl p-5 ${className}`}>{children}</div>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "ghost" | "soft";
};

export function Button({ href, variant = "primary", className = "", children, ...rest }: BtnProps) {
  const styles = {
    primary:
      "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-glow hover:brightness-110",
    ghost:
      "border border-line bg-transparent text-[rgb(var(--text))] hover:bg-white/5",
    soft: "bg-sky-500/15 text-sky-200 hover:bg-sky-500/25",
  }[variant];
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${styles} disabled:opacity-50 ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = props.id ?? props.name ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="text-[rgb(var(--muted))]">{label}</span>
      <input
        id={id}
        className="mt-1.5 w-full rounded-2xl border border-line bg-[rgb(var(--bg))] px-3.5 py-2.5 text-[rgb(var(--text))] outline-none"
        {...props}
      />
      {hint ? <span className="mt-1 block text-xs text-[rgb(var(--muted))]">{hint}</span> : null}
    </label>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/10 ${className}`} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-2 max-w-md text-sm text-[rgb(var(--muted))]">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `nexa-flow-${uid}`;

  return (
    <svg viewBox="0 0 82 82" className={`nexa-logo-mark ${className}`} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#7c5cff" />
          <stop offset=".48" stopColor="#22d7ff" />
          <stop offset="1" stopColor="#a6f7ff" />
        </linearGradient>
      </defs>
      <path className="nexa-logo-track" d="M13 57c11-31 24-31 34 0s21 31 30 0" />
      <path className="nexa-logo-track" d="M5 41c12-31 25-31 36 0s22 31 36 0" />
      <path className="nexa-logo-flow nexa-logo-flow-delay" d="M13 57c11-31 24-31 34 0s21 31 30 0" stroke={`url(#${gradientId})`} />
      <path className="nexa-logo-flow" d="M5 41c12-31 25-31 36 0s22 31 36 0" stroke={`url(#${gradientId})`} />
      <circle className="nexa-logo-core" cx="41" cy="41" r="3" />
    </svg>
  );
}

export function BrandLockup({ size = "sm" }: { size?: "sm" | "lg" }) {
  const large = size === "lg";
  return (
    <span className={`inline-flex items-center ${large ? "gap-4" : "gap-2.5"}`}>
      <LogoMark className={large ? "h-20 w-20" : "h-8 w-8"} />
      <span className={large ? "text-4xl font-semibold tracking-tight" : "text-sm font-semibold tracking-tight"}>
        nexa<span className="text-[#36d4ff]">flow</span>
      </span>
    </span>
  );
}
