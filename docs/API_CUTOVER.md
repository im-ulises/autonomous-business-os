# Autonomous Business OS — safe backend cutover plan

Status (2026-11-20): **NOT DEPLOYED / NO-GO FOR PRODUCTION**.
- Cloudflare Containers are explicitly out of scope. Target is FastAPI on
  Python Workers with Hyperdrive; no paid Containers subscription is needed.
- The deployed frontend still uses localStorage. There is no end-user auth UI.
- The Supabase project \`pbjsynsaavhokloonnem\` is a dedicated project; all
  migration changes are versioned in backend/migrations. Nine migrations 001–009
  are applied and verified on the dedicated Supabase project. The post-migration
  security advisor reports zero findings; the performance advisor reports
  only unused indexes because this database has no customer records yet.
- Database login \`autonomous_os_login\` is **NOLOGIN** on purpose; it must not
  be used until an operator provisions a credential through a secret manager.

## Model compatibility

- The 21 published TypeScript object types in lib/types.ts are mirrored by
  backend/app/frontend_contract.py. A CI test compares field sets on each type.
- The synthetic Store fixture survives a strict model_validate/model_dump
  roundtrip without losing any properties.
- Legacy string IDs are deterministically mapped to UUID per workspace.
- assess_import() checks foreign references and reports embedded data URLs and
  approvals marked in demo JSON. It NEVER writes to Postgres.
- Do not transfer legacy \`approved\` or \`accepted\` fields as authoritative
  review records. Evidence-backed acceptance has a separate table and endpoint.

## Typed backend now available in code

| Frontend concept | Backend authority | Remaining work |
| --- | --- | --- |
| Company name, short, accent | evo_companies + REST | Auth UI |
| Client contacts, industry, website, color | evo_clients + REST | Contact permissions UI |
| Projects, tasks, priority, due date, brief | evo_projects / evo_tasks / evo_project_details | Incremental task sync |
| Mission assignee and planning state | evo_missions (draft only) | Forge bridge, post-auth |
| LocalDoc | evo_documents | Explicit migration and duplicate-source cleanup |
| Company/client brand guides | evo_brand_sheets JSON (non-authoritative) | Object storage for logos, review workflow |
| Software portfolio, phases, milestones | evo_software_products / phases / milestones | Editing endpoints and typed UI adapter |
| Software verification | evo_software_acceptances (owner+evidence) | Signed/verified external checks |
| Department config and lessons | evo_departments / evo_department_lessons | Objective/KPI editing and review UX |
| Proposal templates | evo_proposal_templates | Brand templates UI adapter |
| Financial quotes and line items | evo_proposals / evo_proposal_line_items | Versioned editing, sending/delivery |
| Approved quote snapshots | evo_proposal_approval_snapshots | Real contract/approval evidence verification |
| Workflows, Results, Systems | Not yet persisted | Product design before backend |

## Required rollout sequence

1. Require all backend CI and Next typecheck/build jobs to pass.
2. Apply the numbered SQL migrations on the dedicated Supabase project only.
3. Verify RLS and composite foreign keys using synthetic, rolled-back test data.
4. Provision an isolated Postgres login credential **outside source control**.
   The account must be non-superuser, NOBYPASSRLS, NOINHERIT; grant only the
   autonomous_os_api role with SET TRUE. Keep production credentials private.
5. Configure Supabase Auth to use a verifiable asymmetric signing key, verify
   JWT claims (issuer, audience, exp, iat, role), and bootstrap initial workspace
   owner with a real verified subject. Never invent an owner subject.
6. Deploy a Python Worker to a separate staging name on the existing Workers
   entitlement using a dedicated Hyperdrive binding and real OIDC secrets.
   Do not enable paid plans automatically or use production client data.
7. Verify a real Container cold start, healthy database connection, negative
   401/403 checks, evidence-backed review, and image/secret rotation.
8. Add a reviewed, read-only localStorage import preview and explicit
   confirmation step; migrate only once all fields map cleanly.
9. Connect the existing Next.js UI behind a user login, never through
   service_role secrets. Remove the duplicate document/localStorage writers.
10. Create the future OAuth MCP facade and Forge/Crobi mission dispatch only
    after a separate authorization and idempotency review.

## Known blockers not solved by passing unit tests

- No Python Worker with a real JWT issuer and Hyperdrive is deployed yet.
- No trusted end-user OIDC login / initial owner workspace yet.
- Dedicated DB account has no password/login yet and the FastAPI instance
  therefore cannot connect to the live database.
- Software and Department rich editing UX is not yet wired to new endpoints.
- Old localStorage company/client IDs differ from database UUIDs; import mapping
  must be applied deliberately, not through silent direct updates.
- Historical brand approvals and software acceptance need independent review.
- Production audit retention, backups/restores, pagination, outbound egress,
  contract signatures and full enterprise user onboarding remain incomplete.

Do NOT merge the stacked PR chain, deploy, or enable agents until security
and staging verification are complete.
