"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Suspense } from "react";

import { SiteHeader } from "@/components/marketing/SiteChrome";
import { Button, Card, Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";

function ForgotInner() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
    }
  }

  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Reset password</h1>
        <Card className="mt-8">
          {done ? (
            <p className="text-sm">If an account exists for that address, we sent a reset link. Check inbox and spam.</p>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <Button type="submit">Send link</Button>
            </form>
          )}
        </Card>
        <p className="mt-4 text-sm">
          <Link className="text-sky-300" href="/login">
            Back to sign in
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading…</p>}>
      <ForgotInner />
    </Suspense>
  );
}
