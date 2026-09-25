# Nexaflow — complete local steps

Windows PowerShell. Do these in order. Skip a step only if it already succeeded.

**Live desk is `/app` (not `/ops`).** Next proxies `/api/*` → FastAPI `:8000`.

Right now on this PC: FastAPI `:8000` and Next `:5173` can be up, **Postgres `:5432` is not**. Register/login/runs hang or 500 until step 2 works.

---

## 0. One-time tools

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node 20+
- **Postgres 16** — either Docker Desktop **or** a local Postgres install
- Redis only if you later set `CELERY_TASK_ALWAYS_EAGER=false`

```powershell
cd "F:\agentic_projects\multiagent business automation"
```

---

## 1. Env file

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `.env` and set at least:

```env
APP_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
CELERY_TASK_ALWAYS_EAGER=true
OPENAI_API_KEY=
REQUIRE_APPROVAL_FOR_EMAIL=true
REQUIRE_APPROVAL_FOR_CRM=true
N8N_WEBHOOK_SECRET=change_me_n8n_webhook_secret
BOOTSTRAP_ADMIN_EMAIL=you@example.com
```

`BOOTSTRAP_ADMIN_EMAIL` must be the **same email you register first**. That user becomes **admin** (can start runs **and** approve inbox). Any other signup is **operator** (runs/outbox yes, inbox approve no).

Password rule: 8+ chars, at least one letter and one digit.

Do not commit `.env`.

---

## 2. Postgres (required)

Port **5432** must listen. User/db from `.env` (defaults: `nexusflow` / `nexusflow_dev_password` / db `nexusflow`).

### Option A — Docker (preferred)

Install Docker Desktop, start it, wait until it is running, then:

```powershell
docker compose up -d postgres redis
docker compose ps
```

Postgres healthy = `5432` open.

### Option B — local Postgres (no Docker)

1. Install PostgreSQL 16.
2. In `psql` as superuser:

```sql
CREATE USER nexusflow WITH PASSWORD 'nexusflow_dev_password';
CREATE DATABASE nexusflow OWNER nexusflow;
```

3. Confirm `.env` `DATABASE_URL` matches that user/db/port.

Check:

```powershell
netstat -ano | findstr ":5432"
```

You must see `LISTENING`. If not, stop here — the API cannot store users or runs.

---

## 3. Migrations

```powershell
cd backend
uv sync
uv run alembic upgrade head
```

Expect revisions through `0004` (users + leads/runs/approvals/outbox).

---

## 4. Backend API

New terminal:

```powershell
cd "F:\agentic_projects\multiagent business automation\backend"
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check: http://127.0.0.1:8000/docs → 200.

Leave this window open. Verification links print here.

If `CELERY_TASK_ALWAYS_EAGER=true`, the graph runs **inside this process**. No Celery worker needed.

Optional real worker (only if eager is `false` and Redis is up), extra terminal:

```powershell
cd backend
uv run celery -A app.workers.celery_app worker -l info
```

---

## 5. Frontend

New terminal:

```powershell
cd "F:\agentic_projects\multiagent business automation\frontend"
npm install
npm run dev
```

Open http://localhost:5173

---

## 6. Register → verify → login

1. http://localhost:5173/register  
   Full name, **same email as `BOOTSTRAP_ADMIN_EMAIL`**, password with a letter and a digit.
2. Submit. Login is blocked until email is verified.
3. Open the verification link in the inbox (and spam). Gmail needs `SMTP_PASSWORD` set to a Google **App Password**, not the account password.
4. http://localhost:5173/login → **Enter console** → lands on `/app`.

If login says email not verified, resend at `/verify-email`.

---

## 7. Live loop (this is the product)

Signed in as **admin**:

| Step | Where | What happens |
| --- | --- | --- |
| 1 | `/app` | KPIs from `GET /dashboard/summary` |
| 2 | Home form **or** `/app/leads/new` | `POST /leads` with `start_run: true` |
| 3 | Lead page | `POST /leads/{id}/runs` if you need another run |
| 4 | `/app/runs/{id}` | Nodes: **supervisor → research → qualification → outreach → crm → reporting** |
| 5 | `/app/inbox` | Pending outreach/CRM. **Approve** / **Reject** |
| 6 | `/app/outbox` | Delivered or failed events. **Retry** if failed |

Canvas `/app/workflows` → **Test run (live API)** also `POST /leads` + start_run.

**Drop path:** low-quality lead (student/intern notes, weak email) skips outreach/CRM — no inbox item, reporting still runs.

Heuristic score (no OpenAI): start 40; +company/website/title/phone/work-domain; −student/intern notes. `>=70` pursue, `>=40` nurture, else drop.

SMTP/CRM empty → outbox still **succeeds in development** (logged, not really emailed).

---

## 8. Who can click what

| Action | admin | operator | reviewer |
| --- | --- | --- | --- |
| Create lead / start / cancel run | yes | yes | no |
| Dashboard, leads, run traces | yes | yes | yes |
| Inbox approve/reject | yes | **no** | yes |
| Outbox list/retry | yes | yes | no |

---

## 9. n8n intake (optional)

Importable workflow: `n8n/lead-intake.json` (n8n → ⋮ → Import from File). Direct API body: `n8n/lead-body.json`.

n8n env: none required for the secret. After import, attach **Header Auth** on **POST Nexaflow**:

- Name: `X-Webhook-Secret`
- Value: repo `.env` `N8N_WEBHOOK_SECRET` (JWT nahi)

If n8n runs in Docker, edit the HTTP URL to `http://host.docker.internal:8000/api/v1/webhooks/n8n/leads`.

Activate, then POST JSON to n8n path `nexaflow-lead`, **or** Execute workflow to send the sample Casey Buyer lead.

FastAPI still:

- `POST http://127.0.0.1:8000/api/v1/webhooks/n8n/leads`
- Header `X-Webhook-Secret`
- Body: `email`, `full_name`, optional `company`, `title`, `website`, `phone`, `notes`, `extra`, `external_id`, `start_run`

Same `external_id` → same lead (idempotent).

Curl from PowerShell (secret must match `.env`):

```powershell
curl.exe -s -H "Content-Type: application/json" -H "X-Webhook-Secret: change_me_n8n_webhook_secret" --data-binary "@n8n/lead-body.json" http://127.0.0.1:8000/api/v1/webhooks/n8n/leads
```

Example body file:

```json
{
  "email": "buyer@acme.com",
  "full_name": "Casey Buyer",
  "company": "Acme Industries",
  "title": "VP Operations",
  "website": "https://acme.example",
  "notes": "Inbound from website",
  "external_id": "n8n-row-123",
  "start_run": true
}
```

Then open `/app/leads` (signed in) to see the lead and its run.

---

## 10. Tests (optional)

```powershell
cd backend
uv run pytest tests/test_auth.py tests/test_pipeline.py
```

Tests force eager Celery. They need Postgres too.

---

## 11. Preview-only pages (no backend)

These do **not** call FastAPI: canvas layout save. Live graph is Home / Leads / Inbox / Outbox / Runs / Agents / Analytics / Integrations / Team / Billing.

---

## If it breaks

| Symptom | Fix |
| --- | --- |
| Register/login hangs or 500, traceback `ConnectionTimeout` `:5432` | Step 2 — Postgres not listening |
| `Email is not verified` | Open the link in the verification email, or resend from `/verify-email`. Confirm `SMTP_PASSWORD` is a Gmail App Password. |
| Inbox 403 / “for admin or reviewer” | Register the bootstrap email first, or use an admin |
| Lead already has an active run | Wait until it finishes, or cancel on the run page |
| Nodes stay `queued` forever | Set `CELERY_TASK_ALWAYS_EAGER=true` or start a Celery worker + Redis |
| Frontend loads, APIs 404 | Next rewrite needs FastAPI on `127.0.0.1:8000` |
| CORS errors | `FRONTEND_ORIGIN` and `CORS_ORIGINS` include `http://localhost:5173` |

Do not push `.env` or secrets. Do not commit until you ask.
