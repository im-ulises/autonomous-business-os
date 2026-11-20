# Deploy Autonomous Business OS API on Cloudflare

**Status: configured in GitHub, not deployed.** The current Next.js demo is
intentionally unchanged. A NEW dedicated Supabase project is provisioned:
`pbjsynsaavhokloonnem` (US West, PostgreSQL 17), with migrations 001, 002,
and 003 applied. No secrets or credentials are committed.
Cloudflare Containers requires the Workers Paid plan.

## Architecture

Internet -> Cloudflare Worker (TLS) -> Durable Object -> Python 3.12 FastAPI
Container (port 8000) -> separate PostgreSQL database.

Cloudflare Containers runs a normal Linux image, keeping SQLAlchemy, PyJWT and
psycopg intact. This avoids a Python Workers/Pyodide compatibility rewrite.
The Worker has its own isolated staging/production configs. The app uses one
named Container (api-v1), a basic instance, and a 10-minute inactivity timeout.
The filesystem in the Container is temporary; PostgreSQL owns persisted data.

Cloudflare Hyperdrive is a database connection accelerator, NOT a PostgreSQL
database. It can be assessed later; the first version uses the normal Postgres
connection from the Container.

## Dependencies and identity

1. Dedicated Supabase project created: `pbjsynsaavhokloonnem`. Confirm backups,
   restore process, and database connectivity before use with client data.
   For IPv4 connectivity, use Supabase session-pooler when appropriate.
2. Migrated database with 001_initial, 002_business_extensions, 003_fk_indexes.
   The migration files remain the canonical source for other environments.
3. Configure a real OIDC issuer with HTTPS JWKS supporting RS256 or ES256.
   Set the exact JWT_ISSUER, JWT_AUDIENCE, JWT_JWKS_URL.
4. Bootstrap a workspace with a verified JWT subject:
   python -m app.bootstrap --workspace-name "EVO Studios" --owner-sub "OIDC-SUB"
5. Do not send database credentials, service keys or agent tokens to browsers.

For staging, set up a separate Cloudflare Worker and dedicated staging DB.
From backend/ (with Docker and Wrangler available) run:

~~~
npx --yes wrangler@4.164.0 deploy --config wrangler.staging.jsonc
npx --yes wrangler@4.164.0 secret put DATABASE_URL --config wrangler.staging.jsonc
npx --yes wrangler@4.164.0 secret put JWT_ISSUER --config wrangler.staging.jsonc
npx --yes wrangler@4.164.0 secret put JWT_AUDIENCE --config wrangler.staging.jsonc
npx --yes wrangler@4.164.0 secret put JWT_JWKS_URL --config wrangler.staging.jsonc
npx --yes wrangler@4.164.0 secret put CORS_ORIGINS --config wrangler.staging.jsonc
~~~

The Worker returns 503 (not configured) until all required secrets are present.
GET /edge-healthz probes the edge without launching a Container.
GET /healthz probes the Container after startup.
GET /readyz verifies the PostgreSQL schema is accessible.

For production, use wrangler.production.jsonc with separate secrets and database.
Use a protected GitHub production environment with required reviewers.

## Manual GitHub Actions deployment

The workflow backend-cloudflare-deploy.yml is workflow_dispatch ONLY.
It needs to be present on GitHub's default branch before it is discoverable
in the Actions UI. Configure both "staging" and "production" environments:
Environment secrets:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- AUTONOMOUS_DATABASE_URL
- AUTONOMOUS_JWT_ISSUER
- AUTONOMOUS_JWT_AUDIENCE
- AUTONOMOUS_JWT_JWKS_URL

Environment variable:
- AUTONOMOUS_CORS_ORIGINS (exact origin of the Next.js frontend).

Grant the Cloudflare token only the permission set required to deploy
Workers, Containers and Durable Objects in this account. Do not log secrets.
This workflow deploys first, then attaches Worker secrets. Do not use it for
an already-running production instance until the secret propagation process
has been reviewed and a maintenance plan exists.

## Verify before connecting client data

- Run GitHub CI with disposable PostgreSQL and migration tests.
- /edge-healthz and /healthz healthy, /readyz healthy after DB migration.
- Protected /v1 endpoints reject a request without a Bearer JWT (401).
- Cross-workspace reads and writes reject 403.
- Viewer cannot write, owner/editor can, audit logs are recorded.
- Confirm actual CORS, TLS, rate limiting, JWT key rotation, and backups.
- Only then migrate Next.js browser-local demo state to authenticated API.
- MCP/OAuth and Forge/Crobi dispatch are future phases, not enabled here.

Cloudflare documentation:
https://developers.cloudflare.com/containers/get-started/
https://developers.cloudflare.com/containers/examples/env-vars-and-secrets/
