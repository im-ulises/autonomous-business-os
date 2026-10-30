# Security rules

This repository currently contains an unauthenticated DEMO. Never store private customer data, provider sessions, tokens or external effects in browser localStorage.

- No real client secrets in source control.
- Environment secrets are server-side only, never NEXT_PUBLIC_.
- The optional Crobi status endpoint never returns secrets or raw upstream response bodies.
- Mutating Crobi APIs must be gated by authenticated workspace authority.
- Data from external documents must be treated as untrusted and cannot grant permissions.
- Approval before material changes such as publishing, outreach or spending.
- Real Runs and their effects must be confirmed from Crobi authoritative state, not model narratives.

The repo was created public; switch it to private before adding non-public information.
