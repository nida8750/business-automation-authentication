"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  Command,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  Plug,
  Search,
  Send,
  Settings,
  Shield,
  Sun,
  Users,
  CreditCard,
  UserPlus,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge, BrandLockup } from "@/components/ui";
import { commandItems } from "@/lib/sample";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/admin", label: "Admin", icon: Shield },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/outbox", label: "Outbox", icon: Send },
  { href: "/app/agents", label: "Agents", icon: Bot },
  { href: "/app/workflows", label: "Workflows", icon: Workflow },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/integrations", label: "Integrations", icon: Plug },
  { href: "/app/team", label: "Team", icon: UserPlus },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { mode, toggle } = useTheme();
  const { user, ready, logout, isAdmin } = useAuth();
  const [palette, setPalette] = useState(false);

  const visibleNav = useMemo(
    () => nav.filter((item) => item.href !== "/app/admin" || isAdmin),
    [isAdmin],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") setPalette(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  const initials = (user?.full_name || "NF")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!ready || !user) {
    return <p className="p-10 text-sm text-[rgb(var(--muted))]">Connecting to Nexaflow…</p>;
  }

  return (
    <div className="bg-app grid-bg flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-3 py-4 md:flex">
        <Link href="/" className="mb-6 flex items-center px-2" aria-label="Nexaflow">
          <BrandLockup />
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Console">
          {visibleNav.map((item) => {
            const active =
              item.href === "/"
                ? path === "/"
                : item.href === "/app"
                  ? path === "/app"
                  : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${active ? "bg-white/10 text-[rgb(var(--text))]" : "text-[rgb(var(--muted))] hover:bg-white/5"}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-3 pb-2 text-[11px] text-[rgb(var(--muted))]">
          {user.role} · {user.email}
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-[rgb(var(--bg)/0.85)] px-4 py-3 backdrop-blur">
          <label className="relative hidden min-w-0 flex-1 md:block">
            <span className="sr-only">Search console</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[rgb(var(--muted))]" />
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="w-full rounded-full border border-line bg-[rgb(var(--bg))] py-2 pl-9 pr-4 text-left text-sm text-[rgb(var(--muted))]"
            >
              Search leads, runs, inbox
            </button>
          </label>
          <button type="button" className="rounded-full border border-line px-3 py-2 text-xs md:hidden" onClick={() => setPalette(true)}>
            Search
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-white/5"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            {isAdmin ? (
              <Link
                href="/app/admin"
                className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/25"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            ) : null}
            <button type="button" onClick={() => setPalette(true)} className="hidden items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs text-[rgb(var(--muted))] lg:inline-flex" aria-label="Open command palette">
              <Command className="h-3.5 w-3.5" /> K
            </button>
            <button type="button" onClick={toggle} className="rounded-full border border-line p-2" aria-label="Toggle theme">
              {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-xs font-medium" title={user.email}>
              {initials}
            </div>
            <button
              type="button"
              className="rounded-full border border-line p-2"
              aria-label="Sign out"
              onClick={() => void logout().then(() => router.replace("/login"))}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2 md:hidden" aria-label="Mobile navigation">
          {visibleNav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full border border-line px-3 py-1 text-xs">
              {item.label}
            </Link>
          ))}
        </div>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
      {palette ? <CommandPalette onClose={() => setPalette(false)} /> : null}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const items = useMemo(
    () =>
      commandItems.filter((i) => {
        if (i.href === "/app/admin" && !isAdmin) return false;
        return i.label.toLowerCase().includes(q.toLowerCase());
      }),
    [q, isAdmin],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]" role="dialog" aria-label="Command palette">
      <button type="button" className="absolute inset-0" aria-label="Close palette" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-line bg-[rgb(var(--bg-elev))] p-3 shadow-card">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Go to leads, inbox, outbox…"
          className="w-full rounded-2xl border border-line bg-transparent px-3 py-2.5 text-sm outline-none"
          aria-label="Command search"
        />
        <ul className="mt-2 max-h-72 overflow-auto">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[rgb(var(--muted))]">No matches.</li>
          ) : (
            items.map((item) => (
              <li key={item.href}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                >
                  {item.label}
                  <Badge>{item.hint}</Badge>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
