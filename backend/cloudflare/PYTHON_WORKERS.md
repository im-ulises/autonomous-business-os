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
uv run --python 3.13 pywrangler deploy --dry-run --config wrangler.python.staging.jsonc
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

**Do not run old `wrangler.staging.jsonc`**; that is an unmerged historical
Container candidate. This branch uses the **`wrangler.python.*.jsonc`**
configuration exclusively.

Docs:
https://developers.cloudflare.com/workers/languages/python/packages/fastapi/
https://developers.cloudflare.com/hyperdrive/examples/python-workers/
