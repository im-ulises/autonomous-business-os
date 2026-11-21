# Autonomous OS on Cloudflare Python Workers (no Containers)

This branch is a **compatibility migration, not a live deployment**.
The existing Next.js frontend, Supabase tables and Forge executors are
unchanged. Nothing here uses Cloudflare Containers or requires provisioning
billable Container infrastructure.

Cloudflare officially supports the FastAPI ASGI adapter and synchronous
SQLAlchemy with Hyperdrive, with compatibility date 2026-09-08 or later.
The actual Python Workers runtime uses Pyodide, not CPython + Uvicorn.

## Files

- `worker.py`: FastAPI-to-Workers ASGI entrypoint.
- `wrangler.python.staging.jsonc`: isolated staging Worker.
- `wrangler.python.production.jsonc`: isolated production Worker (not active).
- `pyproject.toml`: pure-Python pg8000 runtime driver; Uvicorn/psycopg binary
  are restricted to dev-only dependencies.
- GitHub Actions: validates config and Pyodide packaging with pywrangler.

Run from backend/ with Node 22 and uv installed:

```sh
uv run --python 3.13 pywrangler deploy --dry-run
uv run --python 3.13 pywrangler dev
```

This dry-run **does not prove** successful edge startup, JWT verification,
PostgreSQL connectivity, authorization or performance.

## Preconditions before making the real API publicly reachable

1. Secure Supabase Auth for a real user with asymmetric signing key and
   known `sub`; bootstrap the verified owner workspace.
2. Provision a separate restricted PostgreSQL login through a secret manager
   (the current reserved role has NOLOGIN); do not use Supabase's postgres
   or service_role credential.
3. Create a Cloudflare Hyperdrive binding targeting that restricted login.
   Hyperdrive must enable encrypted TLS from Cloudflare to Supabase.
   Use `pg8000` for synchronous SQLAlchemy. Disable query caching on
   sensitive tenant-scoped, session-variable-dependent queries.
4. Inject JWT_ISSUER, JWT_AUDIENCE, JWT_JWKS_URL, CORS_ORIGINS and
   DB_EXPECTED_LOGIN as Worker secrets or environment bindings, not browser
   variables. Verify these are available to FastAPI through request.scope.
5. Test JWKS retrieval and signature verification in actual Pyodide; a
   CPython unit test does not establish compatibility.
6. Run genuine staging cold start, database readiness, authentication
   failure tests and cross-company RLS tests with synthetic data. Only then
   connect frontend and consider a production deployment.
7. Staging and production require separate database/identity configurations
   and protected deployment workflows.

The root `wrangler.jsonc` and `wrangler.staging.jsonc` now target the
Python Worker exclusively. `wrangler.production.jsonc` is independently
reserved for production. Do not deploy until the real identity and
Hyperdrive connection are provisioned.

Docs:
https://developers.cloudflare.com/workers/languages/python/packages/fastapi/
https://developers.cloudflare.com/hyperdrive/examples/python-workers/


## Worker binding behavior

Cloudflare sends secrets and Hyperdrive connection properties via the ASGI
\`request.scope["env"]\` binding, not \`os.environ\`. The backend's auth
dependency fetches the Supabase JWKS using the Workers JS \`fetch\` API
and validates every JWT signature with RS256/ES256 and issuer/audience.
Database sessions use synchronous SQLAlchemy+pg8000 with a separate
connection per request; the per-isolate lock serializes DB access. The
transaction always checks the expected non-owner login, runs SET LOCAL ROLE,
and stores the validated user and membership-authorized workspace in
transaction-local RLS settings. No shared DB connection should persist
after a request.

All requests to \`/v1/\` return cache-control: no-store. Hyperdrive query
caching MUST be disabled on its connection configuration because SQL
policy predicates depend on per-transaction tenant/user settings.
Untrusted origins cannot pass browser CORS preflight. A missing JWT
issuer, Hyperdrive binding or restricted DB login returns a safe error.

Runtime tests include synthetic bindings/CORS, signed JWT rejection,
native PostgreSQL migrations and a local workerd cold-start health
check. Successful checks do not replace real cloud staging E2E tests.
