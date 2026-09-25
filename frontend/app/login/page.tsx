"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { SiteHeader } from "@/components/marketing/SiteChrome";
import { Button, Card, Field, BrandLockup } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";

function LoginInner() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const adminOnly = params.get("admin") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await login(email, password);
      if (adminOnly) {
        if (me.role !== "admin") {
          setError("Admin login is for admin accounts only.");
          return;
        }
        router.push("/app/admin");
        return;
      }
      router.push("/app");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not sign in. Confirm FastAPI is running and the email is verified.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-5 py-16">
        <BrandLockup size="lg" />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">{adminOnly ? "Admin login" : "User login"}</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          {adminOnly
            ? "Admin accounts only. Opens the admin dashboard."
            : "Sign in to your workspace console."}
        </p>
        <Card className="mt-8">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            {error ? (
              <p className="text-sm text-rose-300" role="alert">
                {error}{" "}
                {error.toLowerCase().includes("not verified") ? (
                  <Link className="text-sky-300" href="/verify-email">
                    Verify email
                  </Link>
                ) : null}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : adminOnly ? "Admin sign in" : "User sign in"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-sm text-[rgb(var(--muted))]">
          {adminOnly ? (
            <>
              <Link className="text-sky-300" href="/login">
                User login
              </Link>
              {" · "}
            </>
          ) : (
            <>
              <Link className="text-sky-300" href="/login?admin=1">
                Admin login
              </Link>
              {" · "}
            </>
          )}
          <Link className="text-sky-300" href="/register">
            Create account
          </Link>
          {" · "}
          <Link className="text-sky-300" href="/forgot-password">
            Forgot password
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm">Loading…</p>}>
      <LoginInner />
    </Suspense>
  );
}
