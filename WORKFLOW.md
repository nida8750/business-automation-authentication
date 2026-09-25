# Nexaflow — start to end workflow

This is the **full product path**: register → login → lead in → LangGraph → inbox → outbox.

**n8n is not that path.** n8n only posts an inbound lead into FastAPI. Auth, agents, approvals, and the desk live in Nexaflow (Next.js + FastAPI).

Related files:

- [STEPS.md](STEPS.md) — how to run locally
- [AUTH_README.md](AUTH_README.md) — JWT auth
- [FLOW_README.md](FLOW_README.md) — pipeline APIs
- [n8n/README.md](n8n/README.md) — import the n8n workflow + Header Auth credential
- [FRONTEND.md](FRONTEND.md) — desk screens

---

## System map

```text
Browser  http://localhost:5173
  /register  /login  /verify-email  /forgot-password  /reset-password
  /app  /app/leads  /app/inbox  /app/outbox  /app/runs/:id
       │
       │  /api/*  rewritten by Next → FastAPI :8000
       ▼
FastAPI  http://127.0.0.1:8000/api/v1
  /auth/*     JWT register, verify, login, refresh, logout, …
  /leads      create + start_run
  /runs       list, trace (steps), cancel
  /approvals  inbox approve / reject
  /outbox     deliver / retry
  /dashboard/summary
  /webhooks/n8n/leads     ← only this is n8n (header secret, no JWT)
       │
       ▼
Postgres  :5432     users, leads, agent_runs, agent_steps, approvals, outbox
LangGraph           supervisor → research → qualification → outreach → crm → reporting
```

---

## 1. Register (not n8n)

| Step | Where | API |
| --- | --- | --- |
| Open form | http://localhost:5173/register | |
| Submit | | `POST /api/v1/auth/register` |
| User saved | Postgres `users` | `email_verified = false`, default role **operator** |
| Bootstrap | `.env` `BOOTSTRAP_ADMIN_EMAIL` | If this email registers **first**, role is **admin** |
| Email | Inbox link from SMTP | Gmail App Password in `SMTP_PASSWORD` |

Password: 8+ characters, at least one letter and one digit.

Login is blocked until the email is verified.

---

## 2. Verify email (not n8n)

| Step | Where | API |
| --- | --- | --- |
| Open the link in the verification email | | |
| Open | http://localhost:5173/verify-email?token=… | `POST /api/v1/auth/verify-email` |
| Resend | same page | `POST /api/v1/auth/resend-verification` |

---

## 3. Login (not n8n)

| Step | Where | API |
| --- | --- | --- |
| Sign in | http://localhost:5173/login | `POST /api/v1/auth/login` |
| Tokens | browser `localStorage` | `nexaflow.access`, `nexaflow.refresh` |
| Me | | `GET /api/v1/auth/me` |
| Land | `/app` | AppShell redirects to `/login` if no user |

Also wired: logout, logout-all, forgot/reset password, change-password on `/app/settings`.

---

## 4. Lead in — two doors

### A. Desk (JWT, after login)

| Screen | API |
| --- | --- |
| `/app` home form | `POST /api/v1/leads` `{ start_run: true }` |
| `/app/leads/new` | same |
| `/app/leads/:id` Start agent run | `POST /api/v1/leads/{id}/runs` |
| Canvas Test run | `/app/workflows` → same `POST /leads` |

Roles: **admin** or **operator**.

### B. n8n (no login)

See [n8n/README.md](n8n/README.md).

```text
n8n Test workflow  OR  POST n8n webhook /nexaflow-lead
  → Normalize lead
  → POST http://127.0.0.1:8000/api/v1/webhooks/n8n/leads
       Header Auth credential: X-Webhook-Secret = .env N8N_WEBHOOK_SECRET
  → FastAPI create_from_webhook (source = n8n, trigger = webhook)
```

Same `external_id` → same lead (idempotent). No JWT.

---

## 5. LangGraph (FastAPI, after the lead exists)

Always written to `agent_runs` + `agent_steps`. Trace: `/app/runs/{id}`.

```text
supervisor → research → qualification → outreach → crm → reporting → END
```

| Node | Job |
| --- | --- |
| supervisor | Plan / route |
| research | Firm + contact |
| qualification | Score: pursue / nurture / drop |
| outreach | Draft email (pauses if approval flag on) |
| crm | CRM proposal (pauses if approval flag on) |
| reporting | Write report |

If `OPENAI_API_KEY` is empty, heuristic agents still run the same graph.

**Drop:** low score (student/intern notes, weak email) skips outreach and CRM. No inbox item. Reporting still runs.

Heuristic (no OpenAI): start 40; +20 company, +15 website, +10 title, +5 phone, +15 work email domain; −30 student/intern notes. `>=70` pursue, `>=40` nurture, else drop.

Cancel: `POST /api/v1/runs/{id}/cancel` from the run page (admin/operator).

Local: `CELERY_TASK_ALWAYS_EAGER=true` runs the graph inside uvicorn.

---

## 6. Inbox (not n8n)

| Screen | API | Roles |
| --- | --- | --- |
| `/app/inbox` | `GET /api/v1/approvals?status=pending` | admin, reviewer |
| Approve | `POST /api/v1/approvals/{id}/approve` | admin, reviewer |
| Reject | `POST /api/v1/approvals/{id}/reject` | admin, reviewer |

Operator can start runs but **cannot** decide inbox.

Flags: `REQUIRE_APPROVAL_FOR_EMAIL`, `REQUIRE_APPROVAL_FOR_CRM`.

---

## 7. Outbox (not n8n)

| Screen | API | Roles |
| --- | --- | --- |
| `/app/outbox` | `GET /api/v1/outbox` | admin, operator |
| Retry | `POST /api/v1/outbox/{id}/retry` | admin, operator |

Approved outreach/CRM become outbox events. Empty SMTP/CRM in development → log and mark delivered.

---

## 8. Desk home

`/app` loads `GET /api/v1/dashboard/summary` plus recent runs and pending approvals.

---

## One picture (register to end)

```text
REGISTER
  POST /auth/register
VERIFY
  POST /auth/verify-email
LOGIN
  POST /auth/login  →  /app

LEAD
  desk POST /leads          OR          n8n POST /webhooks/n8n/leads

RUN
  supervisor → research → qualification
       │
       ├─ drop ─────────────── reporting ─ complete (no email/CRM)
       └─ pursue/nurture
              outreach ─ (approval) ─ crm ─ (approval) ─ reporting

INBOX   /app/inbox     approve | reject
OUTBOX  /app/outbox    deliver | retry
HOME    /app           counts
END
```

---

## Roles

| Action | admin | operator | reviewer |
| --- | --- | --- | --- |
| Register / login / verify | yes | yes | yes |
| Create lead / start / cancel run | yes | yes | no |
| Dashboard, leads, traces | yes | yes | yes |
| Inbox approve / reject | yes | no | yes |
| Outbox list / retry | yes | yes | no |
| n8n webhook | secret header, any caller with the secret | | |

---

## Frontend: live vs preview

**Live (FastAPI):** `/app`, leads, inbox, outbox, runs, workflows Test run, **agents**, **analytics**, **integrations**, **team**, **billing/payment methods**, settings, auth pages.

**Preview only:** canvas layout save, marketing stills.

---

## Sample n8n lead (Casey Buyer)

Used by n8n **Sample lead** and [n8n/lead-body.json](n8n/lead-body.json).

| Field | Value |
| --- | --- |
| email | buyer@acme.com |
| full_name | Casey Buyer |
| company | Acme Industries |
| title | VP Operations |
| website | https://acme.example |
| phone | +1-555-0100 |
| notes | Inbound from n8n test (body file: Inbound from website) |
| external_id | n8n-row-123 |
| start_run | true |
