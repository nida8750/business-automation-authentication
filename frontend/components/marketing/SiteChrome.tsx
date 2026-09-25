"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";

import { Button, BrandLockup } from "@/components/ui";
import { useTheme } from "@/lib/theme";

const links = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Product" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  const path = usePathname();
  const { mode, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[rgb(var(--bg)/0.78)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center" aria-label="Nexaflow home">
          <BrandLockup />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-[rgb(var(--muted))] md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? "text-[rgb(var(--text))]" : "hover:text-[rgb(var(--text))]"}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-line p-2"
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
            Log in
          </Button>
          <Button href="/register" className="hidden sm:inline-flex">
            Start automating
          </Button>
          <button type="button" className="rounded-full border border-line p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>
              Log in
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              Start automating
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-[rgb(var(--muted))] md:flex-row md:items-center md:justify-between">
        <p>© 2030 Nexaflow. Human-approved multi-agent operations.</p>
        <div className="flex gap-6">
          <Link href="/">Home</Link>
          <Link href="/product">Product</Link>
          <Link href="/use-cases">Use cases</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">User login</Link>
        </div>
      </div>
    </footer>
  );
}
