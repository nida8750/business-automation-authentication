# Next flow after auth — Lead → Agents → Approval → Outbox

Auth is done. A signed-in user can now run the real Nexaflow loop: capture a lead, let agents research and draft, wait for a human, then execute through the outbox.

This is not a chatbot. The graph always writes an audit trail (`agent_steps`). Risky actions never go out until a reviewer approves them (unless you turn that flag off).

```text
Lead in (app / API / n8n)
  -> AgentRun queued
  -> Supervisor plans
  -> Research
  -> Qualification (score + pursue|nurture|drop)
       drop -> reporting -> run completed, no email/CRM
       else -> Outreach draft -> CRM proposal -> reporting
  -> Approvals (email + CRM) if flags are on
  -> Reviewer approve / reject
  -> Outbox delivers (SMTP / CRM HTTP, or dev log)
  -> Dashboard counts status, tokens, latency
```

OpenAI is optional. If `OPENAI_API_KEY` is empty, the same graph runs with deterministic heuristic agents so the flow is still complete and testable.

Fresher file-by-file guide: [PIPELINE_FILES.md](PIPELINE_FILES.md).

---

## Who can do what

| Action | Roles |
| --- | --- |
| Create lead, start/cancel run | admin, operator |
| Read leads/runs/dashboard | admin, operator, reviewer |
| Approve / reject | admin, reviewer |
| Outbox list / retry | admin, operator |
| n8n webhook | shared secret header, no JWT |

---

## APIs

Prefix: `/api/v1`

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/leads` | Body can set `start_run: true` (default). Creates the lead and runs the graph. |
| GET | `/leads` | Query: `status`, `source`, `page`, `page_size` |
| GET | `/leads/{id}` | |
| POST | `/leads/{id}/runs` | Start another run if none is active |
| GET | `/runs` | Query: `lead_id`, `status` |
| GET | `/runs/{id}` | Includes `steps` (the trace) |
| POST | `/runs/{id}/cancel` | |
| GET | `/approvals` | Query: `status=pending` for the inbox |
| POST | `/approvals/{id}/approve` | Body: `{ "reason": "..." }` |
| POST | `/approvals/{id}/reject` | |
| GET | `/outbox` | |
| POST | `/outbox/{id}/retry` | Failed/pending only |
| GET | `/dashboard/summary` | Counts, tokens, avg latency |
| POST | `/webhooks/n8n/leads` | Header `X-Webhook-Secret` |

Lead create example:

```json
{
  "email": "buyer@acme.com",
  "full_name": "Casey Buyer",
  "company": "Acme Industries",
  "title": "VP Operations",
  "website": "https://acme.example",
  "start_run": true
}
```

Webhook example: see `n8n/lead-intake.json`. Repeat posts with the same `external_id` return the same lead.

---

## Files in this flow (complete modules)

Do not copy these as empty stubs — each file on disk is the full implementation.

### Domain

- `backend/app/models/enums.py`
- `backend/app/models/lead.py`
- `backend/app/models/agent_run.py`
- `backend/app/models/agent_step.py`
- `backend/app/models/approval.py`
- `backend/app/models/outbox.py`
- `backend/alembic/versions/0004_leads_runs_approvals_outbox.py`

### Agents

- `backend/app/agents/state.py` — LangGraph state
- `backend/app/agents/llm.py` — OpenAI JSON calls, silent fallback
- `backend/app/agents/nodes.py` — supervisor, research, qualification, outreach, CRM, reporting
- `backend/app/agents/graph.py` — compiled StateGraph
- `backend/app/agents/runner.py` — persist steps, approvals, outbox; enqueue Celery

### Application

- `backend/app/schemas/leads.py`
- `backend/app/schemas/runs.py`
- `backend/app/schemas/approvals.py`
- `backend/app/services/lead_service.py`
- `backend/app/services/run_service.py`
- `backend/app/services/approval_service.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/integrations/outbox_dispatch.py`
- `backend/app/workers/celery_app.py`
- `backend/app/workers/tasks.py`
- `backend/app/api/v1/routes/leads.py`
- `backend/app/api/v1/routes/runs.py`
- `backend/app/api/v1/routes/approvals.py`
- `backend/app/api/v1/routes/webhooks.py`

### Tests and ops

- `backend/tests/test_pipeline.py`
- `docker-compose.yml` (Postgres + Redis)
- `n8n/lead-intake.json`

---

## How to run it locally

1. Start Postgres (and Redis if you want a real worker):

```powershell
docker compose up -d
```

2. Apply the new tables:

```powershell
cd backend
uv run alembic upgrade head
```

3. API (agents run in-process when `CELERY_TASK_ALWAYS_EAGER=true`):

```powershell
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Optional real worker (`CELERY_TASK_ALWAYS_EAGER=false`):

```powershell
uv run celery -A app.workers.celery_app worker -l info
```

5. Tests:

```powershell
uv run pytest tests/test_pipeline.py tests/test_auth.py
```

Flags in `.env`:

- `REQUIRE_APPROVAL_FOR_EMAIL=true`
- `REQUIRE_APPROVAL_FOR_CRM=true`
- `CELERY_TASK_ALWAYS_EAGER=true` for local without a worker
- `OPENAI_API_KEY=` leave empty until you want live LLM drafts
- `N8N_WEBHOOK_SECRET` must match the n8n header

---

## Qualification rules without OpenAI

Heuristic score starts at 40.

- +20 company, +15 website/domain, +10 title, +5 phone
- +15 work email domain (not gmail/yahoo/hotmail/outlook/icloud)
- −30 notes contain student / intern / homework / assignment

Then: `>= 70` pursue, `>= 40` nurture, else drop.

Drop skips outreach and CRM and does not create approvals.

---

## What is still later

- React dashboard / approval inbox UI — see [FRONTEND.md](FRONTEND.md)
- Live SMTP send and a real CRM vendor
- Live SMTP send and a real CRM vendor
- Redis-backed rate limits
- Multi-tenant orgs

The backend loop above is the complete next slice after authentication.
