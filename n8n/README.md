# n8n — Nexaflow lead intake

n8n **does not** do register, login, verify, inbox, or outbox. Those are Nexaflow.

n8n only: take a lead JSON → `POST /api/v1/webhooks/n8n/leads` → FastAPI starts LangGraph.

Full product path: [WORKFLOW.md](../WORKFLOW.md). How to run the stack: [STEPS.md](../STEPS.md).

---

## Files in this folder

| File | Use |
| --- | --- |
| [lead-intake.json](lead-intake.json) | Import into n8n (⋮ → Import from File) |
| [lead-body.json](lead-body.json) | Curl / Postman body straight to FastAPI (skip n8n) |

---

## n8n nodes (this workflow)

```text
When clicking Test workflow  →  Sample lead  ─┐
Inbound lead (webhook nexaflow-lead)         ─┴→  Normalize lead  →  POST Nexaflow
```

| Node | What it does |
| --- | --- |
| Setup (sticky) | Import + Header Auth instructions |
| When clicking Test workflow | Manual start |
| Sample lead | Casey Buyer fixture |
| Inbound lead | `POST` webhook path `nexaflow-lead` |
| Normalize lead | Map email, name, company, `external_id`, `start_run` |
| POST Nexaflow | HTTP POST to FastAPI webhook |

Response mode: last node. FastAPI returns the `LeadPublic` JSON.

---

## Import and credential

1. n8n → **⋮ → Import from File** → `n8n/lead-intake.json`
2. Open **POST Nexaflow**
3. Authentication = **Generic Credential Type**
4. Generic Auth Type = **Header Auth**
5. Create credential **Nexaflow Webhook Secret**:
   - **Name:** `X-Webhook-Secret`
   - **Value:** repo `.env` `N8N_WEBHOOK_SECRET` (not a JWT)
6. Select that credential on the node
7. URL (edit if needed):
   - Same PC: `http://127.0.0.1:8000/api/v1/webhooks/n8n/leads`
   - n8n in Docker, API on Windows: `http://host.docker.internal:8000/api/v1/webhooks/n8n/leads`
8. FastAPI + Postgres must be up. Then **Execute workflow** or activate and POST to the n8n webhook.

JWT is **not** used on this route. Wrong secret → `401`.

---

## Sample lead

n8n **Sample lead** node:

| Field | Value |
| --- | --- |
| email | `buyer@acme.com` |
| full_name | `Casey Buyer` |
| company | `Acme Industries` |
| title | `VP Operations` |
| website | `https://acme.example` |
| phone | `+1-555-0100` |
| notes | `Inbound from n8n test` |
| external_id | `n8n-row-123` |
| start_run | `true` |

[lead-body.json](lead-body.json) is the same person; notes there are `Inbound from website`.

Same `external_id` posted twice → **same lead id** (idempotent). Change `external_id` to create a new row.

This fixture scores as **pursue** on heuristics (work email + company + title + website + phone).

---

## FastAPI contract

`POST /api/v1/webhooks/n8n/leads`

Header: `X-Webhook-Secret`

Body:

```json
{
  "email": "buyer@acme.com",
  "full_name": "Casey Buyer",
  "company": "Acme Industries",
  "title": "VP Operations",
  "website": "https://acme.example",
  "phone": "+1-555-0100",
  "notes": "Inbound from website",
  "extra": { "campaign": "optional" },
  "external_id": "n8n-row-123",
  "start_run": true
}
```

Required: `email`, `full_name`. `start_run` defaults to true.

Normalize also accepts `name`, `first_name`/`last_name`, `job_title`, `domain`, `phone_number`, `message`, `id`.

---

## Curl without n8n

Secret must match `.env`.

```powershell
curl.exe -s -H "Content-Type: application/json" -H "X-Webhook-Secret: change_me_n8n_webhook_secret" --data-binary "@n8n/lead-body.json" http://127.0.0.1:8000/api/v1/webhooks/n8n/leads
```

Then sign in at http://localhost:5173/login and open `/app/leads`.

After `start_run: true`:

`/app/runs/{id}` → supervisor → research → qualification → outreach → crm → reporting  
`/app/inbox` → approve  
`/app/outbox` → delivered
