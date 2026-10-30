# Architecture v0.1

## Component boundaries

Business OS (Next.js) is a separate application from Crobi Chief.

Business OS:
- company/project/mission presentation;
- Markdown documentation reader;
- local demo drafts (not server state);
- an optional read-only API status check.

Crobi Chief:
- identity and workspace authority;
- agents, runs, permissions and approvals;
- runtime adapters, tools, effects and evidence.

## Integration future-state

User intent -> Business OS authenticated API -> Crobi authorized mission/run -> events and evidence -> Business OS reconciliation.

Use stable IDs and idempotency keys. Never treat model text as authoritative action completion.

## Docs

Git markdown is canonical. A future content index may be derived from it. Keep access checks server-side and independent from labels/tags.
