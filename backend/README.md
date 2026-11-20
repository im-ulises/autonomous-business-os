# Autonomous Business OS API — FastAPI

A separately deployable service. Business OS owns company/client/project/task records and draft missions.
Crobi Chief remains authoritative for agent execution, approvals, and external side effects.

## Quick start

Requires Python 3.12+ and PostgreSQL. From backend/:

~~~bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# Fill DATABASE_URL, JWT_* and CORS_ORIGINS using server-side secrets.
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f migrations/001_initial.sql
python -m app.bootstrap --workspace-name "EVO Studios" --owner-sub "<verified JWT sub>"
uvicorn app.main:app --reload
pytest -q
~~~

Load the .env in your process manager: the API intentionally does not read dotenv files itself.
Swagger/OpenAPI: http://localhost:8000/docs. Health: /healthz (process), /readyz (database).

## Security and authority

- JWTs must be signed and validated against a configured HTTPS JWKS, issuer, audience, expiry and issued-at time. No anonymous write endpoint or development bypass.
- Membership is checked per workspace on every data request; owner/editor may write, viewer is read-only.
- Tenant-bound referenced company/client/project IDs are checked server-side, even if the caller supplies another tenant's ID.
- Sensitive DB credentials, JWKS config and provider tokens stay exclusively on the API server.
- Migration enables RLS and revokes direct table rights from PUBLIC, anon and authenticated. Use a dedicated *server-side* DB role with explicitly audited permissions; current deployment bootstrap assumes migration/DB owner privileges. Do not expose this connection string to browsers.
- Missions created here are always drafts. The API cannot approve, dispatch, publish, spend money, or claim an agent run completed.
- Audit events record writes, but are not yet tamper-evident. Protect logs and backups.
- Supabase is optional as a PostgreSQL host. No Supabase project, user, database or token is provisioned by this PR.
- Initial data from browser localStorage is not imported automatically; demo data must never become actual business state by accident.

## Roadmap

1. Deploy PostgreSQL and FastAPI privately with migrations, real OIDC issuer, backups and log drains.
2. Connect the Next.js UI to authenticated /v1 endpoints with a server-side BFF, replacing demo storage only after verification.
3. Add task assignments, files, comments, milestones, client workspace roles and fine-grained policies.
4. Implement external MCP OAuth resource server over the same authorized API (never connect an LLM directly to PostgreSQL).
5. Integrate Crobi Chief via signed, idempotent mission submissions and independently verified run events; add approval gates and deduplication before enabling execution.
