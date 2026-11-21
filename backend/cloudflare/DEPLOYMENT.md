# Cloudflare deployment — Python Workers only

**Current strategy:** ASGI FastAPI on Python Workers, PostgreSQL via Hyperdrive.
No Containers, Docker or Durable Object Container lifecycle.

See [PYTHON_WORKERS.md](PYTHON_WORKERS.md) for exact gates, security and CLI.
Past Container instructions are obsolete. Do not deploy before PostgreSQL
restricted login, real JWKS/OIDC and Hyperdrive credentials are provisioned.
The current Supabase project has migrations 001–009 already applied and
contains no imported customer data.
