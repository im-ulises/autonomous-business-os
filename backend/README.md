# Autonomous Business OS — Independent FastAPI backend

This is a separate, tenant-scoped FastAPI API for Next.js, with Supabase
PostgreSQL 17 as the authoritative database. Crobi/Forge are independent
agent executors, and this API does not autonomously dispatch work.

## Cloudflare hosting — Python Workers, no Containers

The current deployment target is **Cloudflare Python Workers**:
- worker.py is the FastAPI ASGI entrypoint using Cloudflare's workers SDK.
- backend/wrangler.jsonc is a staging-default Python Worker configuration.
- backend/wrangler.python.production.jsonc is reserved for production.
- Hyperdrive + pg8000 is the database transport for Python Workers.
- No Dockerfile, Container, Uvicorn server process or VPS migration needed.

See [PYTHON_WORKERS.md](cloudflare/PYTHON_WORKERS.md) for deployment and
security gating. The old Containers deployment strategy has been retired.

## Local CPython development

From backend/, with Python 3.12+, PostgreSQL 17 and actual local-only
secrets:

\`\`\`sh
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
# Set DATABASE_URL, DB_EXPECTED_LOGIN, JWT_ISSUER, JWT_AUDIENCE,
# JWT_JWKS_URL, CORS_ORIGINS using an untracked .env file/secret manager.
uvicorn app.main:app --reload
pytest -q
\`\`\`

\`/healthz\` checks process availability; \`/readyz\` checks the database.
The OpenAPI docs are disabled unless APP_ENV=development.

## Database & security state

Supabase project pbjsynsaavhokloonnem has migrations 001–009, 25 tables
with FORCE RLS, and no imported business/customer data. The restricted
login role \`autonomous_os_login\` is intentionally NOLOGIN: no real API
connection is possible until a secure credential and Hyperdrive binding
are provisioned. Never put passwords or service_role tokens in browser JS.

Workspace/company memberships are server-side; all agent missions remain
draft-only, and quote/acceptance approvals require separate owner review.
Browser localStorage is not yet migrated. No production deployment is live.

Run backend CI (native Python + PostgreSQL) and Python Workers
compatibility CI before enabling staging. A Python Workers package dry-run
alone does not prove the API or PostgreSQL access works.
