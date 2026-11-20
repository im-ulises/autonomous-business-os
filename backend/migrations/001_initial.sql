-- Versioned initial PostgreSQL schema. Run with psql -v ON_ERROR_STOP=1.
-- Dedicated evo_ tables. Never grant anon/authenticated direct access.
BEGIN;

CREATE TABLE IF NOT EXISTS evo_workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evo_memberships (
  workspace_id UUID NOT NULL REFERENCES evo_workspaces(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (workspace_id, subject)
);

CREATE TABLE IF NOT EXISTS evo_companies (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES evo_workspaces(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_companies_workspace_id ON evo_companies(workspace_id);

CREATE TABLE IF NOT EXISTS evo_clients (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_clients_company_id ON evo_clients(company_id);

CREATE TABLE IF NOT EXISTS evo_projects (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES evo_clients(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  stage VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (stage IN ('idea','planning','active','waiting','completed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_projects_company_id ON evo_projects(company_id);
CREATE INDEX IF NOT EXISTS ix_evo_project_company_stage ON evo_projects(company_id, stage);

CREATE TABLE IF NOT EXISTS evo_tasks (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES evo_projects(id) ON DELETE CASCADE,
  title VARCHAR(240) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','blocked','done')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_tasks_project_id ON evo_tasks(project_id);
CREATE INDEX IF NOT EXISTS ix_evo_task_project_status ON evo_tasks(project_id, status);

CREATE TABLE IF NOT EXISTS evo_missions (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES evo_projects(id) ON DELETE SET NULL,
  title VARCHAR(240) NOT NULL,
  outcome TEXT NOT NULL,
  executor_hint VARCHAR(30) NOT NULL DEFAULT 'unassigned' CHECK (executor_hint IN ('unassigned','forge','crobi_marketing','human')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','submitted','running','succeeded','failed')),
  external_run_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_missions_company_id ON evo_missions(company_id);

CREATE TABLE IF NOT EXISTS evo_audit_events (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES evo_workspaces(id) ON DELETE CASCADE,
  actor_subject VARCHAR(255) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_audit_events_workspace_id ON evo_audit_events(workspace_id);

-- Supabase: public schema can be Data API exposed. No anon/authenticated grants.
ALTER TABLE evo_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON evo_workspaces, evo_memberships, evo_companies, evo_clients, evo_projects,
  evo_tasks, evo_missions, evo_audit_events FROM PUBLIC;

-- On hosted Supabase, anon/authenticated are predefined. Plain PostgreSQL may
-- not have those roles: revoke from each only when it actually exists.
DO $revoke$
DECLARE db_role text;
BEGIN
  FOR db_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE evo_workspaces, evo_memberships, evo_companies, evo_clients, evo_projects, evo_tasks, evo_missions, evo_audit_events FROM %I',
      db_role
    );
  END LOOP;
END
$revoke$;
COMMIT;
