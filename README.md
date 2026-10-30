# Autonomous Business OS

An AI-first operating console for multiple businesses. Separate from Crobi Chief, which remains the authority for agent execution, permissions, approvals and audit.

> **Current status: UI starter / demo only.** No agent is executing work, no real approvals are displayed, and project/mission data only persists in your browser.

## Run locally

Requires Node.js 22 or newer.

~~~bash
npm install
npm run dev
~~~

Open http://localhost:3000.

## Architecture

- **Business OS** owns the presentation and business-domain records: companies, departments, projects, missions and docs.
- **Crobi Chief** owns agents, runs, approvals, permissions, delegation, external effects and audit.
- A future authenticated gateway will connect both. Do **not** expose Crobi tokens to client-side code.
- Git Markdown is the canonical documentation source; a later read-only index may be rebuilt from Git.

## Current features

- Responsive dark interface with navigation, company switching and local drafts.
- Pages for Now, Companies, Departments, Projects, Missions, Docs, Workflows, Results and System.
- Demo content is clearly labeled and not represented as real agent activity.
- Docs reader for Markdown samples.
- Server-side read-only Crobi status proxy (optional; requires env configuration).

## Missing before production

Identity/authentication, database storage, tenant isolation, approved Crobi APIs, agent runtime connections, and verifiable run/approval events.

## Commands

~~~bash
npm run typecheck
npm run build
~~~

See [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md) and [roadmap](docs/ROADMAP.md).