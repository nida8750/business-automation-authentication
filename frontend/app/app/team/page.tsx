"use client";

import { FormEvent, useEffect, useState } from "react";

import { Badge, Button, Card, Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { Page, Role, TeamMember } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("operator");

  async function load() {
    const data = await api<Page<TeamMember>>("/team");
    setRows(data.items);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load team."));
  }, []);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await api<{ user: TeamMember; temporary_password: string }>("/team/invite", {
        method: "POST",
        body: { email, full_name: fullName, role },
      });
      setFlash(`Invited ${created.user.email}. Temporary password: ${created.temporary_password}`);
      setEmail("");
      setFullName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invite failed.");
    }
  }

  async function changeRole(id: string, next: Role) {
    setError(null);
    try {
      await api(`/team/${id}`, { method: "PATCH", body: { role: next } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update role.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">People</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">Live users from Postgres. Admins invite; operators write; reviewers own inbox.</p>
      </div>
      {flash ? <p className="text-sm text-teal-300">{flash}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {isAdmin ? (
        <Card>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => void invite(e)}>
            <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="block text-sm">
              <span className="text-[rgb(var(--muted))]">Role</span>
              <select className="mt-1.5 w-full rounded-2xl border border-line bg-[rgb(var(--bg))] px-3.5 py-2.5" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="operator">operator</option>
                <option value="reviewer">reviewer</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button type="submit">Invite</Button>
            </div>
          </form>
        </Card>
      ) : null}
      <div className="overflow-hidden rounded-3xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs text-[rgb(var(--muted))]">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-4 py-3">{m.full_name}</td>
                <td className="px-4 py-3 text-[rgb(var(--muted))]">{m.email}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select className="rounded-full border border-line bg-transparent px-2 py-1 text-xs" value={m.role} onChange={(e) => void changeRole(m.id, e.target.value as Role)}>
                      <option value="admin">admin</option>
                      <option value="operator">operator</option>
                      <option value="reviewer">reviewer</option>
                    </select>
                  ) : (
                    <Badge tone={m.role === "admin" ? "blue" : "muted"}>{m.role}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
