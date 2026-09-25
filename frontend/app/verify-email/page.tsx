"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { SiteHeader } from "@/components/marketing/SiteChrome";
import { Button, Card, Field, BrandLockup } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";

function VerifyInner() {
  const params = useSearchParams();
  const tokenFromUrl = params.get("token") || "";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(Boolean(tokenFromUrl));
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  async function verify(value: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/auth/verify-email", { method: "POST", body: { token: value }, auth: false });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "This link is invalid or has expired. Request a new one below.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!tokenFromUrl || ran.current) return;
    ran.current = true;
    void verify(tokenFromUrl);
  }, [tokenFromUrl]);

  async function resend() {
    setError(null);
    try {
      await api("/auth/resend-verification", { method: "POST", body: { email }, auth: false });
      setResent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend.");
    }
  }

  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16">
        <BrandLockup />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Verify email</h1>
        <Card className="mt-8">
          {done ? (
            <p className="text-sm">
              Email confirmed.{" "}
              <Link className="text-sky-300" href="/login">
                Sign in
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {busy ? <p className="text-sm text-[rgb(var(--muted))]">Confirming your email…</p> : null}
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              {!tokenFromUrl && !busy ? (
                <p className="text-sm text-[rgb(var(--muted))]">
                  Open the link from your inbox, or request a new verification email.
                </p>
              ) : null}
            </div>
          )}
          {!done ? (
            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void resend();
              }}
            >
              <Field label="Resend to email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" variant="ghost">
                Resend verification
              </Button>
              {resent ? (
                <p className="text-xs text-teal-300">If that account exists and is unverified, a new link is on its way. Check inbox and spam.</p>
              ) : null}
            </form>
          ) : null}
        </Card>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm">Loading…</p>}>
      <VerifyInner />
    </Suspense>
  );
}
