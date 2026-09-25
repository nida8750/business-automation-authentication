"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, LayoutDashboard, LogOut, Send, Users } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { BrandLockup } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export function OpsShell({ children }: { children: ReactNode }) {
  const { user, ready, logout, canReview, canOutbox, canWriteLeads } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return <p className="p-10 text-sm text-slate-400">Loading desk…</p>;
  }

  const links = [
    { href: "/ops", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/ops/leads", label: "Leads", icon: Users, show: true },
    { href: "/ops/inbox", label: "Inbox", icon: Inbox, show: canReview },
    { href: "/ops/outbox", label: "Outbox", icon: Send, show: canOutbox },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 bg-black/40 px-4 py-6 backdrop-blur-xl lg:border-b-0 lg:border-r">
        <Link href="/" className="flex items-center" aria-label="Nexaflow home">
          <BrandLockup />
        </Link>
        <nav className="mt-8 space-y-1">
          {links
            .filter((item) => item.show)
            .map((item) => {
              const active = path === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${
                    active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          {canWriteLeads ? (
            <Link href="/ops/leads/new" className="flex rounded-2xl px-3 py-2 text-sm text-cyan-200 hover:bg-white/5">
              + New lead
            </Link>
          ) : null}
        </nav>
        <div className="mt-10 border-t border-white/10 pt-4 text-xs text-slate-400">
          <p className="text-slate-200">{user.full_name}</p>
          <p className="truncate">{user.email}</p>
          <p className="mt-1 font-mono uppercase text-cyan-300/80">{user.role}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-slate-400 hover:text-white"
            onClick={() => void logout().then(() => router.push("/"))}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="px-4 py-8 lg:px-10">{children}</main>
    </div>
  );
}
