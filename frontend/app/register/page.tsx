"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { SiteHeader } from "@/components/marketing/SiteChrome";
import { Button, Card, Field, BrandLockup } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await register(fullName, email, password);
      setVerified(user.email_verified);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register. Confirm FastAPI is on :8000.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-5 py-16">
        <BrandLockup size="lg" />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Create workspace</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">Founders start here. No card for the first 14 days on Starter.</p>
        <Card className="mt-8">
          {done ? (
            <div className="space-y-3 text-sm text-[rgb(var(--muted))]">
              {verified ? (
                <p>
                  Account created and verified.{" "}
                  <Link className="text-sky-300" href="/login">
                    Sign in
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <p>Account created. We sent a verification link to your inbox. Confirm that email, then sign in.</p>
                  <p>
                    Did not get it? Check spam, or{" "}
                    <Link className="text-sky-300" href="/verify-email">
                      resend the link
                    </Link>
                    .
                  </p>
                  <p>
                    <Link className="text-sky-300" href="/login">
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
              <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required hint="At least 8 characters, with a letter and a digit." />
              {error ? (
                <p className="text-sm text-rose-300" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Start automating"}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
