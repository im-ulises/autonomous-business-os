# Autonomous OS: two accounts and shared projects

Status: draft PR #29, not deployed. No real accounts or project data are created by this branch.

## Product model
- One verified Supabase Auth account per person; never a shared password.
- Each person can have a separate private workspace with its own owner (operator bootstrap): e.g. EVO Studios owned by Ulises, and Dad's Projects owned by father. The other can be invited as editor or viewer, but sees no private company or project by default.
- A workspace has a verified owner; invited members are editor or viewer.
- Workspace membership alone grants no company or project access.
- The owner shares specific projects with an editor or viewer; that does not share other projects, clients, brand sheets, contacts or quotes.
- Only owner can add/revoke members and project shares. Revocation also removes older grants so re-inviting doesn't restore privileges.
- Tasks, project details, deliverables and roadmaps inherit project permissions. Agent execution remains disabled.

## Staging sequence
1. Review PR #28 and #29, test PostgreSQL migration 010 twice (idempotence), FORCE RLS and adversarial API cases. No deployment before review.
2. Configure Supabase Auth with asymmetric JWT signing. Verify issuer, audience, JWKS, expiry and authenticated role. Browser may hold only the publishable key, NEVER database password or service role.
3. Establish TWO REAL verified Supabase Auth identities, one for the owner and one for father. Each signs in with their own magic link when the route is configured.
4. Bootstrap TWO owner workspaces from a trusted operator session: EVO Studios with verified owner's auth.users.id; Dad's Projects with verified father's auth.users.id. No public endpoint may assign itself owner. To collaborate in both directions, register the other user as editor in each workspace, then share projects individually. Never grant blanket company access.
5. Provision restricted autonomous_os_login via private secret workflow. Create Hyperdrive with SQL query caching DISABLED and upstream TLS. Deploy only a staging Python Worker and verify end-to-end JWT, RLS and real DB connection.
6. Configure frontend public environment: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_AUTONOMOUS_API_URL. Route /collaboration fails closed until all are configured.
7. Each user signs into /collaboration. Their private owner workspace appears after the operator bootstrap. Each owner adds the other's verified Auth subject UUID as a member and shares only selected projects; the other member can open the shared project but not the other companies. An unassigned account sees its Auth subject UUID.
8. Verify on independent browsers: owner sees all; father sees only assigned projects, can edit only if granted editor; viewer cannot write; revoking immediately denies; no contact/quote leak or other workspace access.
9. Integrate the full OperatingConsole with the remote API and migrate browser-only records only after reviewed data mapping, backups and audit.

## Limitations
- No user accounts or invitation emails were created in this PR. To create them, both actual emails must be known and verified via Supabase Auth.
- The new /collaboration screen supports authenticated basic projects, tasks and sharing; the original rich / remains a localStorage demo.
- Email invitation by administrator requires a separate trusted workflow; currently the owner adds the provider's verified subject UUID.
- Hermes, Forge, WhatsApp and existing client data import are outside this phase.
