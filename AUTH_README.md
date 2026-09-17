# Auth boilerplate — copy this into other FastAPI projects

This repo's authentication is a reusable FastAPI + PostgreSQL + JWT kit.
Use this file when you copy auth into a new project so you do not miss a table, env var, or security rule.

**Stack:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, PyJWT (HS256), pwdlib/bcrypt.

**Not part of auth:** OpenAI, LangGraph, Redis, Celery, n8n, CRM.

---

## Complete flow

```text
Register
  -> user saved unverified (email_verified=false)
  -> verification token emailed (raw token in link, SHA-256 hash in DB)
  -> login is blocked until verify

Verify email          POST /api/v1/auth/verify-email
Resend verification   POST /api/v1/auth/resend-verification   (same message if email missing)

Login                 POST /api/v1/auth/login
  -> password check
  -> lockout after N failed attempts
  -> access JWT (short) + refresh JWT (long)
  -> refresh jti hash stored in refresh_tokens

Use API               Authorization: Bearer <access_token>
  -> get_current_user checks signature, type=access, user active, token_version

Refresh               POST /api/v1/auth/refresh
  -> old refresh revoked, new pair issued (rotation)
  -> reused refresh revokes ALL sessions for that user

Logout                POST /api/v1/auth/logout          (one session)
Logout all            POST /api/v1/auth/logout-all      (all sessions + bump token_version)

Forgot password       POST /api/v1/auth/forgot-password
Reset password        POST /api/v1/auth/reset-password  (invalidates sessions)
Change password       POST /api/v1/auth/change-password (logged-in, invalidates sessions)

Me                    GET  /api/v1/auth/me
```

Email verify and password-reset **raw tokens are never stored**. Only `sha256(token)` is stored.

Public auth routes (register, login, verify, resend, forgot, reset) are rate-limited per IP + path.

---

## API reference

Prefix: `/api/v1/auth`

| Method | Path | Auth | Success | Notes |
| --- | --- | --- | --- | --- |
| POST | `/register` | no | 201 `UserPublic` | Unverified. Duplicate email → 409 |
| POST | `/verify-email` | no | 200 `UserPublic` | Body: `{ "token": "..." }` |
| POST | `/resend-verification` | no | 200 message | Does not reveal if the email exists |
| POST | `/login` | no | 200 tokens | Unverified / disabled / locked → 403 |
| POST | `/refresh` | no | 200 tokens | Body: `{ "refresh_token": "..." }` |
| POST | `/logout` | no | 200 message | Body: `{ "refresh_token": "..." }` |
| POST | `/logout-all` | Bearer | 200 message | Kills every session |
| POST | `/forgot-password` | no | 200 message | Does not reveal if the email exists |
| POST | `/reset-password` | no | 200 message | Body: `{ "token", "new_password" }` |
| POST | `/change-password` | Bearer | 200 message | Body: `{ "current_password", "new_password" }` |
| GET | `/me` | Bearer | 200 `UserPublic` | |

Password rules: 8–128 chars, at least one letter and one digit.

Error shape (all AppError responses):

```json
{ "error": { "code": "unauthorized", "message": "...", "details": {} } }
```

---

## Files to copy as-is

Copy these paths. Keep the same package layout (`app/...`) unless you rename imports everywhere.

### Core (do not rewrite)

| File | What it does |
| --- | --- |
| `backend/app/core/security.py` | `hash_password`, `verify_password`, `hash_token` |
| `backend/app/core/tokens.py` | Create/decode access + refresh JWTs (`sub`, `typ`, `jti`, `ver`) |
| `backend/app/core/rate_limit.py` | In-memory sliding window for public auth routes |
| `backend/app/core/exceptions.py` | `AppError` + FastAPI handlers |
| `backend/app/core/email.py` | Verify + reset emails (SMTP, or log in development) |
| `backend/app/schemas/auth.py` | Request/response models + password validator |
| `backend/app/services/auth_service.py` | All auth business logic |
| `backend/app/api/v1/routes/auth.py` | HTTP routes |
| `backend/app/api/v1/deps.py` | `get_current_user`, `require_verified_email`, `require_roles` |
| `backend/app/models/refresh_token.py` | Persisted refresh sessions |

### Database support (needed for models)

| File | What it does |
| --- | --- |
| `backend/app/db/base.py` | `Base`, UUID pk, timestamps |
| `backend/app/db/session.py` | Engine + `get_db` |
| `backend/app/models/__init__.py` | Import models so Alembic sees them |
| `backend/alembic/versions/0001_create_users.py` | `users` table |
| `backend/alembic/versions/0002_add_email_verification.py` | verify + reset columns |
| `backend/alembic/versions/0003_auth_sessions_lockout.py` | `token_version`, lockout, `refresh_tokens` |

### Tests (copy so you know it still works)

| File | What it does |
| --- | --- |
| `backend/tests/test_auth.py` | Register, verify, login, refresh reuse, logout, lockout, reset |
| `backend/tests/conftest.py` | TestClient + rate-limit reset |

### Wiring (small files; copy then confirm includes)

| File | What to keep |
| --- | --- |
| `backend/app/api/v1/router.py` | `api_router.include_router(auth_router)` |
| `backend/app/main.py` | CORS, `register_exception_handlers`, include `api_router` |

### Python packages required for auth only

```text
fastapi
uvicorn[standard]
pydantic
pydantic-settings
email-validator
sqlalchemy
alembic
psycopg[binary]
pyjwt
bcrypt
pwdlib[bcrypt]
python-multipart
```

Dev: `pytest`

Do **not** copy OpenAI / LangGraph / Redis / Celery just to get auth.

---

## Changes you must make in the new project

These are the only intentional edits. If you skip them, auth will run but it will still look like NexusFlow or reuse a leaked secret.

### 1. New JWT secret (required)

In `.env` of the **new** project:

```env
JWT_SECRET_KEY=<long random string, 32+ chars>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
PASSWORD_RESET_TTL_HOURS=1
AUTH_RATE_LIMIT_PER_MINUTE=30
BOOTSTRAP_ADMIN_EMAIL=
```

Never reuse this repo's `JWT_SECRET_KEY`. Never commit `.env`.

### 2. App name, frontend, SMTP

```env
APP_NAME=YourApp
APP_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@yourapp.com
```

`email.py` builds:

- `{FRONTEND_ORIGIN}/verify-email?token=...`
- `{FRONTEND_ORIGIN}/reset-password?token=...`

Either add those two frontend pages, or change the paths in `backend/app/core/email.py`.

Without `SMTP_HOST`, verification/reset emails are only logged in development.

### 3. Roles (NexusFlow-specific today)

`backend/app/models/user.py` currently has:

```python
class UserRole(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    REVIEWER = "reviewer"
```

Change this enum to your product (`admin` / `user`, etc.).

Then update:

- `AuthService._role_for_new_user` — default role for a new signup (today: `OPERATOR`)
- Alembic `0001_create_users.py` `server_default="operator"` if you change the default
- Any `require_roles(UserRole.ADMIN)` usage

`BOOTSTRAP_ADMIN_EMAIL`: if that email registers first, it becomes `ADMIN`.

### 4. Database URL

Point `DATABASE_URL` at the new project's Postgres. Run migrations there:

```bash
cd backend
alembic upgrade head
```

If the new project already has Alembic history, **do not paste these revision IDs blindly**. Recreate equivalent migrations with new revision IDs that follow *that* project's `down_revision` chain. The SQL (tables/columns) can stay the same.

### 5. Config class

Copy only auth-related settings from `backend/app/config.py`. Leave out `openai_*`, `celery_*`, `crm_*`, `n8n_*`, agent flags.

Keep:

- `jwt_*`, lockout, password-reset TTL, `auth_rate_limit_per_minute`
- `smtp_*`, `frontend_origin`, `cors_origins`
- `database_url`
- `bootstrap_admin_email`
- production check: JWT secret must not start with `change_me` and must be ≥ 32 chars

### 6. Protect your own routes

```python
from app.api.v1.deps import get_current_user, require_roles
from app.models.user import User, UserRole

@router.get("/private")
def private(user: User = Depends(get_current_user)):
    return {"email": user.email}

@router.get("/admin-only")
def admin_only(user: User = Depends(require_roles(UserRole.ADMIN))):
    return {"ok": True}
```

`require_roles` also requires a verified email.

---

## What not to copy

- `.env` (secrets)
- `OPENAI_*`, agent, CRM, n8n, Redis, Celery settings
- NexusFlow product copy in `readme.md`
- Frontend (this kit is backend-only; you still need login/verify/reset screens)

---

## New-project checklist

1. Copy the files listed above.
2. Install the auth-only Python packages.
3. Set a **new** `JWT_SECRET_KEY`.
4. Set `APP_NAME`, `FRONTEND_ORIGIN`, CORS, SMTP.
5. Change `UserRole` + default signup role if needed.
6. Create/adapt Alembic migrations; `alembic upgrade head`.
7. Include `auth_router` and exception handlers in the app.
8. Add frontend pages for verify-email and reset-password, or edit email URLs.
9. Run `pytest backend/tests/test_auth.py`.
10. Register → verify → login → call `/me` with the access token.

If those tests pass, the copied auth is behaving like this repo.
