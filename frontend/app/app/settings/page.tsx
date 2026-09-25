"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Card, Field } from "@/components/ui";
import { api, ApiError, clearTokens } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { current_password: current, new_password: next },
      });
      clearTokens();
      setFlash("Password changed. Sign in again.");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  async function logoutAll() {
    setError(null);
    try {
      await api("/auth/logout-all", { method: "POST" });
      clearTokens();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign out all sessions.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          {user?.full_name} · {user?.email} · {user?.role}
        </p>
      </div>
      {flash ? <p className="text-sm text-teal-300">{flash}</p> : null}
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      <Card>
        <form className="space-y-4" onSubmit={(e) => void onChangePassword(e)}>
          <h2 className="font-medium">Change password</h2>
          <Field label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          <Field label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} required hint="At least 8 characters, one letter and one digit." />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>
        <Button href="/app/billing" variant="ghost" className="mt-4">
          Open billing
        </Button>
      </Card>
      <Card>
        <h2 className="font-medium">Sessions</h2>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">Revoke every refresh token for this account.</p>
        <Button variant="ghost" className="mt-4" onClick={() => void logoutAll()}>
          Sign out all devices
        </Button>
      </Card>
    </div>
  );
}
