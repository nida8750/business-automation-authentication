"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { SiteHeader } from "@/components/marketing/SiteChrome";
import { Button, Card, Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";

function ResetInner() {
  const params = useSearchParams();
  const tokenFromUrl = params.get("token") || "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { token, new_password: password },
        auth: false,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed.");
    }
  }

  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">New password</h1>
        <Card className="mt-8">
          {done ? (
            <p className="text-sm">
              Updated.{" "}
              <Link className="text-sky-300" href="/login">
                Sign in
              </Link>
            </p>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              {tokenFromUrl ? null : (
                <Field label="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
              )}
              <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <Button type="submit">Save password</Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading…</p>}>
      <ResetInner />
    </Suspense>
  );
}
