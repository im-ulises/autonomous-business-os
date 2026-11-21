-- Version 005: RLS for a dedicated no-login API role, not a table owner.

-- Do not apply to the live project before provisioning a dedicated, non-superuser DB login.

BEGIN;

DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'autonomous_os_api') THEN
    CREATE ROLE autonomous_os_api NOLOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $role$;

GRANT USAGE ON SCHEMA public TO autonomous_os_api;

GRANT SELECT ON evo_workspaces, evo_memberships TO autonomous_os_api;

GRANT SELECT, INSERT, UPDATE, DELETE ON evo_companies, evo_clients, evo_projects, evo_tasks, evo_missions, evo_departments, evo_brand_sheets, evo_proposals, evo_documents, evo_deliverables, evo_software_roadmaps TO autonomous_os_api;

GRANT SELECT, INSERT, DELETE ON evo_company_memberships TO autonomous_os_api;

GRANT SELECT, INSERT ON evo_audit_events TO autonomous_os_api;

REVOKE UPDATE, DELETE ON evo_audit_events FROM autonomous_os_api;

ALTER TABLE evo_workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_companies FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_clients FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_projects FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_missions FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_audit_events FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_departments FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_brand_sheets FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_proposals FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_deliverables FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_software_roadmaps FORCE ROW LEVEL SECURITY;

ALTER TABLE evo_company_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evo_api_scope ON evo_workspaces;
CREATE POLICY evo_api_scope ON evo_workspaces FOR SELECT TO autonomous_os_api
  USING (id IN (SELECT workspace_id FROM evo_memberships WHERE subject = current_setting('app.subject', true)));

DROP POLICY IF EXISTS evo_api_scope ON evo_memberships;
CREATE POLICY evo_api_scope ON evo_memberships FOR SELECT TO autonomous_os_api
  USING (
    subject = current_setting('app.subject', true)
    OR workspace_id = NULLIF(current_setting('app.authorized_workspace', true), '')::uuid
  );

DROP POLICY IF EXISTS evo_api_scope ON evo_companies;
CREATE POLICY evo_api_scope ON evo_companies FOR ALL TO autonomous_os_api
  USING (workspace_id = NULLIF(current_setting('app.authorized_workspace', true), '')::uuid) WITH CHECK (workspace_id = NULLIF(current_setting('app.authorized_workspace', true), '')::uuid);

DROP POLICY IF EXISTS evo_api_scope ON evo_clients;
CREATE POLICY evo_api_scope ON evo_clients FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_projects;
CREATE POLICY evo_api_scope ON evo_projects FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_tasks;
CREATE POLICY evo_api_scope ON evo_tasks FOR ALL TO autonomous_os_api
  USING (project_id IN (SELECT id FROM evo_projects)) WITH CHECK (project_id IN (SELECT id FROM evo_projects));

DROP POLICY IF EXISTS evo_api_scope ON evo_missions;
CREATE POLICY evo_api_scope ON evo_missions FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_audit_events;
CREATE POLICY evo_api_scope ON evo_audit_events FOR ALL TO autonomous_os_api
  USING (workspace_id = NULLIF(current_setting('app.authorized_workspace', true), '')::uuid) WITH CHECK (workspace_id = NULLIF(current_setting('app.authorized_workspace', true), '')::uuid);

DROP POLICY IF EXISTS evo_api_scope ON evo_departments;
CREATE POLICY evo_api_scope ON evo_departments FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_brand_sheets;
CREATE POLICY evo_api_scope ON evo_brand_sheets FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_proposals;
CREATE POLICY evo_api_scope ON evo_proposals FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_documents;
CREATE POLICY evo_api_scope ON evo_documents FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_deliverables;
CREATE POLICY evo_api_scope ON evo_deliverables FOR ALL TO autonomous_os_api
  USING (project_id IN (SELECT id FROM evo_projects)) WITH CHECK (project_id IN (SELECT id FROM evo_projects));

DROP POLICY IF EXISTS evo_api_scope ON evo_software_roadmaps;
CREATE POLICY evo_api_scope ON evo_software_roadmaps FOR ALL TO autonomous_os_api
  USING (project_id IN (SELECT id FROM evo_projects)) WITH CHECK (project_id IN (SELECT id FROM evo_projects));

DROP POLICY IF EXISTS evo_api_scope ON evo_company_memberships;
CREATE POLICY evo_api_scope ON evo_company_memberships FOR ALL TO autonomous_os_api
  USING (company_id IN (SELECT id FROM evo_companies)) WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DO $rev$
DECLARE r text;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
    EXECUTE format('REVOKE ALL ON TABLE evo_workspaces, evo_memberships, evo_companies, evo_clients, evo_projects, evo_tasks, evo_missions, evo_audit_events, evo_departments, evo_brand_sheets, evo_proposals, evo_documents, evo_deliverables, evo_software_roadmaps, evo_company_memberships FROM %I', r);
  END LOOP;
END $rev$;

COMMIT;
