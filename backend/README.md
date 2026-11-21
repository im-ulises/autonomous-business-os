# Autonomous Business OS API — FastAPI

An independent FastAPI service backing the existing Next.js UI.
Business records belong to Autonomous OS. Crobi Chief owns agent approvals,
execution authority and evidence; this backend never runs agent missions.

## Local development

Requires Python 3.12+ and PostgreSQL. From backend/:

~~~
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
# Supply environment variables from a trusted secret manager:
# DATABASE_URL, JWT_ISSUER, JWT_AUDIENCE, JWT_JWKS_URL, CORS_ORIGINS
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f migrations/001_initial.sql
python -m app.bootstrap --workspace-name "EVO Studios" --owner-sub "VERIFIED_SUB"
uvicorn app.main:app --reload
pytest -q
~~~

Health: GET /healthz. Database readiness: GET /readyz.
REST/OpenAPI: /docs and /openapi.json.

## Cloudflare
Read [Cloudflare deployment instructions](cloudflare/DEPLOYMENT.md).
Staging and production Workers are separate and require Cloudflare Workers Paid,
an external PostgreSQL instance and real OIDC credentials. No deployment has
been performed by merely committing these files.

## Security and boundaries
- JWT validation requires real OIDC issuer, JWKS, expiry and audience.
- No anonymous create/update, no permissive development bypass.
- Owner/editor/viewer membership is always checked against the workspace in DB.
- References to company/client/project must remain in the same tenant.
- PostgreSQL migration enables RLS and revokes Data API direct access.
- API runs through a server-side DB owner/dedicated role, never a browser key.
- Missions are draft-only. No agent may self-approve, dispatch or report a
  completed job through this API.
- Demo browser localStorage is not real project state; import requires review.
- Audit records are not yet tamper-evident.
- Multi-company ACLs, documents, deliverables, proposals, brand assets and
  agent events need later implementation.


## Independent security review follow-up

See PR #25 for the Grok-audit security remediations.
Live Supabase has migrations 001-003 only. Additional migration 004
introduces company ACLs; migration 005 enforces per-workspace RLS
for a non-owner database role. Do not apply 005 until a trusted operator
has provisioned an initial workspace and a dedicated non-owner LOGIN
credential with GRANT to autonomous_os_api, and a disposable Postgres
integration test is green. No production credentials belong in source.
Production and staging remain blocked pending Cloudflare cold start and
frontend/API contract reconciliation.
