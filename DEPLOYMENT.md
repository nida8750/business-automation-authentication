# Deploy Nexaflow

The supplied Compose stack runs PostgreSQL, Redis, database migrations, the FastAPI API, a Celery worker, and the Next.js desk. It is intended for a single host behind a TLS reverse proxy.

## 1. Prepare secrets

Copy `.env.example` to `.env` on the deployment host. Set `APP_ENV=production`, `APP_DEBUG=false`, a unique `JWT_SECRET_KEY` of at least 32 characters, and a unique `N8N_WEBHOOK_SECRET`. Set `FRONTEND_ORIGIN` and `CORS_ORIGINS` to the public HTTPS frontend URL.

For the bundled PostgreSQL service, leave `SUPABASE_PROJECT_REF` blank and use a strong, non-default `POSTGRES_PASSWORD`. Configure SMTP and CRM credentials before enabling real outbound actions; production startup rejects empty SMTP credentials.

Do not commit `.env` or inject its values into frontend build arguments. The public browser API path remains same-origin (`/api/v1`).

## 2. Start

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f migrate api worker frontend
```

`migrate` exits successfully after applying Alembic migrations. The API and worker wait for it; the frontend waits for the API health endpoint.

## 3. Verify

```powershell
curl.exe http://127.0.0.1:8000/health
curl.exe -I http://127.0.0.1:5173
```

Put a reverse proxy such as Caddy, Nginx, or a cloud load balancer in front of port `5173`, terminate TLS there, and expose only HTTPS publicly. Keep Postgres and Redis ports private in an internet-facing deployment by removing their `ports` entries or restricting them with host firewall rules.

## 4. Upgrade and rollback

Build and restart with `docker compose up --build -d`. Back up the PostgreSQL volume before any schema-changing release. To stop the application without deleting data, run `docker compose down`; the named `nexusflow_pgdata` volume remains intact.
