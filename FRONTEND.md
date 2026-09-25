# Frontend — Nexaflow desk (Next.js)

Live desk is **`/app`**. Next.js proxies `/api/*` to FastAPI `http://127.0.0.1:8000`.

Gradio/Streamlit are not used.

Full start-to-end path: [WORKFLOW.md](WORKFLOW.md). Local run order: [STEPS.md](STEPS.md).

---

## Setup

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Backend:

```powershell
cd backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`next.config.mjs` rewrites `/api/:path*` → `http://127.0.0.1:8000/api/:path*`.

Tokens: `localStorage` keys `nexaflow.access`, `nexaflow.refresh`.

---

## Packages

- Next.js App Router, React 19, Tailwind
- Framer Motion, Lucide
- `@react-three/fiber` + `@react-three/drei` + `three` (landing)
- `@xyflow/react` (graph canvas preview)

---

## Routes

### Marketing

| Path | Notes |
| --- | --- |
| `/` | Landing |
| `/product` `/use-cases` `/pricing` | Marketing |

### Auth (FastAPI)

| Path | API |
| --- | --- |
| `/register` | `POST /auth/register` |
| `/login` | `POST /auth/login` → `/app` |
| `/verify-email` | `POST /auth/verify-email`, resend |
| `/forgot-password` | `POST /auth/forgot-password` |
| `/reset-password` | `POST /auth/reset-password` |

### Live desk (login required)

| Path | API |
| --- | --- |
| `/app` | `GET /dashboard/summary`, `GET /runs`, `GET /approvals`, `POST /leads` |
| `/app/leads` | `GET /leads` |
| `/app/leads/new` | `POST /leads` |
| `/app/leads/[leadId]` | `GET /leads/{id}`, `GET /runs?lead_id=`, `POST /leads/{id}/runs` |
| `/app/runs/[runId]` | `GET /runs/{id}` (steps), `POST /runs/{id}/cancel` |
| `/app/inbox` | `GET /approvals`, `POST …/approve`, `POST …/reject` |
| `/app/outbox` | `GET /outbox`, `POST /outbox/{id}/retry` |
| `/app/workflows` | Live run list + LangGraph node names |
| `/app/workflows/[id]` | Canvas; **Test run** = `POST /leads` |
| `/app/agents` | `GET/POST /agents` |
| `/app/analytics` | `GET /analytics/summary` |
| `/app/integrations` | `GET/POST /integrations` |
| `/app/team` | `GET /team`, invite, role |
| `/app/billing` | payment methods + subscribe |
| `/app/settings` | `POST /auth/change-password`, `POST /auth/logout-all` |

### Preview only (no FastAPI)

`/app/agents`, `/app/analytics`, `/app/integrations`, `/app/team`

`/ops/*` is the older live shell (same APIs). Prefer `/app`.

---

## Key files

| File | Role |
| --- | --- |
| `lib/api/client.ts` | `fetch` to `/api/v1`, refresh on 401 |
| `lib/auth.tsx` | login/register/logout, roles |
| `components/app/AppShell.tsx` | Console nav; redirects if not signed in |
| `components/ops/LeadsViews.tsx` | Shared lead list / create / detail |
| `components/workflow/WorkflowBuilder.tsx` | Canvas + live Test run |
| `app/app/page.tsx` | Live home / start graph |
| `app/app/inbox/page.tsx` | Approvals |
| `app/app/outbox/page.tsx` | Outbox |
| `app/app/runs/[runId]/page.tsx` | Node trace |
