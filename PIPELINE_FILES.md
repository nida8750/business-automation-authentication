# Pipeline files for a fresher

This guide is only for the **new lead → agent → approval → outbox** files.
Auth files are in [AUTH_README.md](AUTH_README.md).
File-by-file (fresher): [PIPELINE_FILES.md](PIPELINE_FILES.md).
Flow overview is in [FLOW_README.md](FLOW_README.md).

## How to read this repo (4 layers)

Think of a restaurant:


| Layer                | Folder                       | Job                                                               |
| -------------------- | ---------------------------- | ----------------------------------------------------------------- |
| Door (HTTP)          | `backend/app/api/v1/routes/` | URL aati hai, JSON check hota hai, kaun login hai                 |
| Manager              | `backend/app/services/`      | Business rules: duplicate lead? already running? approve allowed? |
| Kitchen              | `backend/app/agents/`        | AI/heuristic agents research + draft                              |
| Fridge               | `backend/app/models/`        | Postgres tables                                                   |
| Menu (shape of JSON) | `backend/app/schemas/`       | Request/response kaisa dikhega                                    |


A name that starts with `_` is a **helper**. Routes do not call helpers directly.

Request path:

```text
Route  ->  Schema  ->  Service  ->  Model (DB)
                      |
                      +-> Agent runner / graph  (when a run starts)
                      +-> Outbox dispatch       (when someone approves)
```

---



## 1. Database tables (models)



### [backend/app/models/enums.py](backend/app/models/enums.py)

**Use case:** Allowed status words. Typos like `"complted"` compile time pe pakad lo.


| Class                             | Meaning                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `LeadSource`                      | lead kahan se aayi: `app`, `api`, `n8n`                                                     |
| `LeadStatus`                      | `new` → `queued` → `running` → `awaiting_approval` → `completed` / `failed` / `rejected`    |
| `RunStatus`                       | one agent job: `pending`, `running`, `waiting_approval`, `completed`, `failed`, `cancelled` |
| `RunTrigger`                      | `manual` or `webhook`                                                                       |
| `AgentName`                       | `supervisor`, `research`, `qualification`, `outreach`, `crm`, `reporting`                   |
| `StepStatus`                      | `succeeded`, `skipped`, `failed`                                                            |
| `ApprovalType` / `ApprovalStatus` | email/CRM draft pending, approved, rejected                                                 |
| `OutboxType` / `OutboxStatus`     | real send/write pending, delivered, failed                                                  |




### [backend/app/models/lead.py](backend/app/models/lead.py)

**Use case:** One person/company you might email. Table `leads`.

-   

- 
- 
- 
- 
- **'\\\\\\\\\\\\\\\\\\\\\\\\\\\Class** `Lead` — email, name, company, web
- site, `status`, `source`, `external_id` (n8n duplicate rokne ke liye\
- \/////////////)



### [backend/app/models/agent_run.py](backend/app/models/agent_run.py) 

**Use c]]]]]]]]]]]]]ase]:** One full pipeline execution for a lead. Table `agent_runs`.

- **Class** `AgentRun` — stores plan, research, score, email draft, CRM proposal, report, token counts, latency



### [backend/app/models/agent_step.py](backend/app/models/agent_step.py)

**Use case:** Audit trail. Har agent ka ek row. Table `agent_steps`.

- **Class** `AgentStep` — kaunsa agent, input/output JSON, tokens, time, error



### [backend/app/models/approval.py](backend/app/models/approval.py)

**Use case:** Human in]\

box. Email/CRM draft yahan rukta hai. Table `approvals`.

- **Class** `Approval` — `payload` (draft), `status`, who decided, reason



### [backend/app/models/outbox.py](backend/app/models/outbox.py)

**Use case:** After approve, action yahan queue hoti hai phir send/write. Table `outbox_events`.

- **Class** `OutboxEvent` — type, payload, attempts, last_error, delivered/failed



### [backend/app/models/**init**.py](backend/app/models/__init__.py)

**Use case:** Alembic ko saari tables dikhani. Nayi table banao to yahan import add karo.

### [backend/alembic/versions/0004_leads_runs_approvals_outbox.py](backend/alembic/versions/0004_leads_runs_approvals_outbox.py)

**Use case:** Real Postgres tables create. `upgrade()` banata hai, `downgrade()` hataata hai.

Command: `uv run alembic upgrade head`

---



## 2. JSON shapes (schemas)

Schemas **database nahi** hain. Ye sirf API ke body ko validate karte hain.

### [backend/app/schemas/leads.py](backend/app/schemas/leads.py)


| Class              | Use case                                                      |
| ------------------ | ------------------------------------------------------------- |
| `LeadCreate`       | POST `/leads` body (`start_run` default true)                 |
| `LeadPublic`       | API response — password jaisi secret cheezein nahi            |
| `LeadListResponse` | list + total + page                                           |
| `StartRunRequest`  | extra run start (rarely used; route trigger hardcoded manual) |
| `N8nLeadWebhook`   | n8n JSON + `external_id`                                      |




### [backend/app/schemas/runs.py](backend/app/schemas/runs.py)


| Class                  | Use case           |
| ---------------------- | ------------------ |
| `AgentStepPublic`      | one trace row      |
| `AgentRunPublic`       | run without steps  |
| `AgentRunDetail`       | run + `steps` list |
| `AgentRunListResponse` | paginated runs     |




### [backend/app/schemas/approvals.py](backend/app/schemas/approvals.py)


| Class                                     | Use case                    |
| ----------------------------------------- | --------------------------- |
| `ApprovalDecideRequest`                   | `{ "reason": "..." }`       |
| `ApprovalPublic` / `ApprovalListResponse` | inbox                       |
| `OutboxPublic` / `OutboxListResponse`     | delivery queue              |
| `DashboardSummary`                        | counts, tokens, avg latency |


---



## 3. Agents (kitchen)



### [backend/app/agents/state.py](backend/app/agents/state.py)

**Use case:** Ek dictionary jo graph ke nodes ke beech ghumti hai.

- **Class** `AgentState` — `lead`, `plan`, `research`, `qualification`, `outreach`, `crm_proposal`, `report`, `steps`, `skip_outreach`



### [backend/app/agents/llm.py](backend/app/agents/llm.py)

**Use case:** OpenAI JSON call. Key na ho to empty result — pipeline rukti nahi.


| Name                          | Use case                            |
| ----------------------------- | ----------------------------------- |
| `LlmResult`                   | `data` + token counts               |
| `complete_json(system, user)` | chat completion, JSON object expect |




### [backend/app/agents/nodes.py](backend/app/agents/nodes.py)

**Use case:** Har specialist agent. LLM try, warna heuristic (rules).


| Function             | Use case                                                                   |
| -------------------- | -------------------------------------------------------------------------- |
| `supervisor_node`    | plan likhta hai: research → qualify → draft                                |
| `research_node`      | lead ke fields se summary/signals                                          |
| `qualification_node` | score 0–100, `pursue` / `nurture` / `drop`. `drop` pe `skip_outreach=True` |
| `outreach_node`      | email draft, ya **skipped**                                                |
| `crm_node`           | CRM contact proposal, ya **skipped**                                       |
| `reporting_node`     | human ke liye short summary                                                |
| `_heuristic_*`       | OpenAI ke baghair same kaam                                                |
| `_append_step`       | `state["steps"]` mein audit row                                            |
| `_timed_llm`         | LLM call + latency                                                         |
| `_lead`              | state se lead dict                                                         |




### [backend/app/agents/graph.py](backend/app/agents/graph.py)

**Use case:** Nodes ko wire karta hai (LangGraph).

```text
START → supervisor → research → qualification
      → outreach → crm → reporting → END
```


| Function              | Use case           |
| --------------------- | ------------------ |
| `build_agent_graph()` | graph compile      |
| `agent_graph`         | ready-to-run graph |


Drop pe bhi outreach/crm nodes chalte hain, status `skipped` — trace complete rehti hai.

### [backend/app/agents/runner.py](backend/app/agents/runner.py)

**Use case:** Graph ko DB se jodta hai. Yahi asal “job”.


| Function                  | Use case                                                   |
| ------------------------- | ---------------------------------------------------------- |
| `enqueue_agent_run`       | Celery pe daalo, fail ho to in-process chalao              |
| `run_agent_pipeline`      | run load, graph invoke, save, approvals/outbox             |
| `_persist_graph_result`   | steps + drafts save; flags ke hisaab se approval ya outbox |
| `_queue_outbox`           | pending outbox row                                         |
| `dispatch_pending_outbox` | us run ke pending events send                              |
| `dispatch_outbox_event`   | ek event deliver / fail mark                               |
| `_lead_dict`              | Lead ORM → dict for agents                                 |




### [backend/app/agents/**init**.py](backend/app/agents/__init__.py)

Package marker. `from app.agents import agent_graph` ke liye.

---



## 4. Services (managers)



### [backend/app/services/lead_service.py](backend/app/services/lead_service.py)

**Use case:** Lead banana aur run start.


| Method                | Use case                                             |
| --------------------- | ---------------------------------------------------- |
| `create`              | logged-in user se lead; `start_run` true ho to graph |
| `create_from_webhook` | n8n; same `external_id` = same lead (idempotent)     |
| `get` / `list_leads`  | read                                                 |
| `start_run`           | active run already ho to **409 Conflict**            |
| `_blank_to_none`      | `" "` ko `null`                                      |




### [backend/app/services/run_service.py](backend/app/services/run_service.py)


| Method      | Use case                    |
| ----------- | --------------------------- |
| `get`       | run + steps                 |
| `list_runs` | filter `lead_id` / status   |
| `cancel`    | run cancel, lead `rejected` |




### [backend/app/services/approval_service.py](backend/app/services/approval_service.py)


| Class / method                           | Use case                                                             |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `ApprovalService.get` / `list_approvals` | inbox                                                                |
| `ApprovalService.decide`                 | approve → outbox row; reject → nahi                                  |
| `ApprovalService._maybe_finalize_run`    | jab koi pending approval na bache: dispatch + lead complete/rejected |
| `OutboxService.list_events`              | queue dekho                                                          |
| `OutboxService.retry`                    | failed/pending dubara bhejo                                          |




### [backend/app/services/dashboard_service.py](backend/app/services/dashboard_service.py)


| Method    | Use case                                       |
| --------- | ---------------------------------------------- |
| `summary` | counts, pending approvals, tokens, avg latency |


---



## 5. HTTP routes (door)

FastAPI: function name = endpoint. `Depends(...)` = pehle login/role check.

### [backend/app/api/v1/routes/leads.py](backend/app/api/v1/routes/leads.py)


| Function           | URL                            | Who                       |
| ------------------ | ------------------------------ | ------------------------- |
| `create_lead`      | `POST /api/v1/leads`           | admin, operator           |
| `list_leads`       | `GET /api/v1/leads`            | admin, operator, reviewer |
| `get_lead`         | `GET /api/v1/leads/{id}`       | same                      |
| `start_lead_run`   | `POST /api/v1/leads/{id}/runs` | admin, operator           |
| `get_lead_service` | —                              | DB session → service      |




### [backend/app/api/v1/routes/runs.py](backend/app/api/v1/routes/runs.py)


| Function     | URL                                      |
| ------------ | ---------------------------------------- |
| `list_runs`  | `GET /api/v1/runs`                       |
| `get_run`    | `GET /api/v1/runs/{id}` (includes steps) |
| `cancel_run` | `POST /api/v1/runs/{id}/cancel`          |




### [backend/app/api/v1/routes/approvals.py](backend/app/api/v1/routes/approvals.py)

Teen routers ek file mein.


| Function                          | URL                                           | Who             |
| --------------------------------- | --------------------------------------------- | --------------- |
| `list_approvals` / `get_approval` | `/api/v1/approvals`                           | admin, reviewer |
| `approve` / `reject`              | `/api/v1/approvals/{id}/approve` or `/reject` | admin, reviewer |
| `list_outbox` / `retry_outbox`    | `/api/v1/outbox`                              | admin, operator |
| `dashboard_summary`               | `GET /api/v1/dashboard/summary`               | all three roles |




### [backend/app/api/v1/routes/webhooks.py](backend/app/api/v1/routes/webhooks.py)

**JWT nahi.** Header `X-Webhook-Secret`.


| Function              | Use case                          |
| --------------------- | --------------------------------- |
| `_require_n8n_secret` | secret galat → 401                |
| `ingest_n8n_lead`     | `POST /api/v1/webhooks/n8n/leads` |




### [backend/app/api/v1/router.py](backend/app/api/v1/router.py)

Saari routers ko `/api/v1` ke neeche jodta hai. Nayi route file → yahan `include_router`.

---



## 6. Workers + real send



### [backend/app/workers/celery_app.py](backend/app/workers/celery_app.py)

**Use case:** Celery app (Redis broker). Local: `CELERY_TASK_ALWAYS_EAGER=true` → worker ki zaroorat nahi.

### [backend/app/workers/tasks.py](backend/app/workers/tasks.py)


| Function                    | Use case                             |
| --------------------------- | ------------------------------------ |
| `execute_agent_run(run_id)` | background mein `run_agent_pipeline` |


Worker: `uv run celery -A app.workers.celery_app worker -l info`

### [backend/app/integrations/outbox_dispatch.py](backend/app/integrations/outbox_dispatch.py)


| Function              | Use case                                           |
| --------------------- | -------------------------------------------------- |
| `dispatch_send_email` | SMTP if configured, else **dev log** (development) |
| `dispatch_crm_write`  | CRM HTTP if configured, else **dev log**           |


Abhi Gmail/HubSpot live nahi — development mein “delivered” log se.

---



## 7. Tests, n8n, docker



### [backend/tests/test_pipeline.py](backend/tests/test_pipeline.py)


| Test                                                  | What it proves                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `test_create_lead_runs_agents_and_waits_for_approval` | good lead → 2 approvals → approve → completed + outbox delivered |
| `test_low_fit_lead_completes_without_approvals`       | student/intern → drop → skipped outreach/CRM                     |
| `test_reject_approval_marks_lead_rejected`            | reject → lead rejected                                           |
| `test_n8n_webhook_is_idempotent`                      | same `external_id` twice = same lead                             |
| `test_webhook_rejects_bad_secret`                     | 401                                                              |
| `test_leads_require_auth`                             | no token → 401                                                   |
| `_verified_admin`                                     | test user ko admin banata hai (approve ke liye)                  |




### [backend/tests/conftest.py](backend/tests/conftest.py)

`TestClient` + Celery eager (tests Redis ke baghair).

### [n8n/lead-intake.json](n8n/lead-intake.json)

n8n se kaunsa JSON + header bhejna hai.

### [docker-compose.yml](docker-compose.yml)

Postgres + Redis containers.

---



## One story (file order)

1. Operator `POST /leads` → [leads.py route](backend/app/api/v1/routes/leads.py)
2. Body check → [LeadCreate](backend/app/schemas/leads.py)
3. Row save → [LeadService.create](backend/app/services/lead_service.py) + [Lead](backend/app/models/lead.py)
4. `start_run` → [AgentRun](backend/app/models/agent_run.py) + [enqueue_agent_run](backend/app/agents/runner.py)
5. Graph → [nodes.py](backend/app/agents/nodes.py)
6. Steps save → [AgentStep](backend/app/models/agent_step.py)
7. Drafts → [Approval](backend/app/models/approval.py)
8. Reviewer approve → [ApprovalService.decide](backend/app/services/approval_service.py)
9. Send → [OutboxEvent](backend/app/models/outbox.py) + [outbox_dispatch.py](backend/app/integrations/outbox_dispatch.py)
10. Counts → [dashboard_service.py](backend/app/services/dashboard_service.py)

Cursor mein file kholne ke liye upar wale links pe Ctrl+click (Cmd+click Mac).