# Autonomous OS backend separation (first implementation)

The advanced Next.js frontend currently lives in stacked feature PRs; main is not a safe integration target.
The backend is introduced as a completely independent process under backend/, based on the latest UI branch.
There is no deployment or database provisioning in this branch.

### Source of truth
- Next.js: UX only, existing demo data remains explicitly demo until authenticated API migration.
- FastAPI / PostgreSQL: authoritative business data: workspaces, memberships, companies, clients, projects, tasks, draft missions and business audit.
- Crobi Chief / Forge: authoritative agent identity, permissions, approvals, execution, run state, and verifiable evidence.
- Crobi Marketing: specialist executor, not a source of truth for business project state.
- MCP: OAuth-protected transport adapter calling the same business API; no direct database access.

### Production-gating criteria
1. Merge/retarget the stacked UI branches into a coherent baseline.
2. Provision dedicated PostgreSQL with tested backups, restore and migrations.
3. Verify OIDC JWKS authentication, per-workspace authorization and tenant isolation.
4. Use TLS, secret manager, rate limits, request tracing, metrics and health checks.
5. Run API/UI integration tests before switching away from demo localStorage.
6. Add evidence verification, idempotency, human approval and retry safety *before* agent dispatch.
7. Conduct independent security review of data access and external integrations.

### Phase 1 concrete API
- GET /healthz, GET /readyz
- GET /v1/workspaces
- GET/POST companies, clients, projects, tasks and draft missions per workspace
- PATCH projects and tasks
- GET owner-scoped audit events
- OpenAPI at /openapi.json and /docs

There are no anonymous CRUD calls, no agent execution endpoints, no local auth bypass and no public onboarding endpoint.
