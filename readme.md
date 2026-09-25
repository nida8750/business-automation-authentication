# Nexaflow
Multi-agent business operations platform.
Nexaflow helps sales and operations teams turn incoming leads into researched, scored, and approval-ready outreach. Specialized AI agents do the research and drafting. Humans approve high-impact actions before anything is sent or written to a CRM.
This is not a chatbot. It is a workflow engine with a supervisor agent, background jobs, an approval inbox, and an audit trail.
## What it does
1. Capture a lead from the app, API, or an n8n webhook.
2. Queue an agent run in the background.
3. A supervisor routes work to research, qualification, outreach, CRM, and reporting agents.
4. Drafts and CRM updates pause for human approval when required.
5. Approved actions execute through an outbox. Rejected actions stop with a reason.
6. The dashboard shows real run status, latency, token usage, and outcomes.
## Who it is for
- Founders and sales leads who need qualified outreach without a large SDR team
- Operations managers who want repeatable, auditable workflows
- Reviewers who must approve emails and CRM writes
- Engineers who need traces, not a black-box prompt
## Tech stack
| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Pydantic v2 |
| Database | PostgreSQL, SQLAlchemy 2.0, Alembic |
| Agents | LangGraph |
| LLM | OpenAI API |
| Auth | JWT access and refresh tokens |
| Cache / broker | Redis |
| Jobs | Celery |
| Automation | n8n webhooks |
| Deploy | Docker Compose |
## Docs
- [WORKFLOW.md](WORKFLOW.md) — register → login → lead → graph → inbox → outbox (n8n vs desk)
- [STEPS.md](STEPS.md) — run Postgres, API, frontend locally
- [AUTH_README.md](AUTH_README.md) — JWT auth boilerplate and how to copy it
- [FLOW_README.md](FLOW_README.md) — lead → agents → approval → outbox APIs
- [FRONTEND.md](FRONTEND.md) — Next.js desk routes and which screens call FastAPI
- [n8n/README.md](n8n/README.md) — import workflow + Header Auth credential
- [PIPELINE_FILES.md](PIPELINE_FILES.md) — backend files for the pipeline
- [DEPLOYMENT.md](DEPLOYMENT.md) — production Compose deployment and verification

## Repository layout
```text
nexaflow/
  frontend/     React SPA
  backend/      FastAPI app, workers, agents
  docker/       Containerfiles
  docs/         Architecture and API notes
  n8n/          Exported automation workflows
