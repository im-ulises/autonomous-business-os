-- 009: composite FK covering indexes and PostgreSQL RLS initplan optimization.
-- No policy semantics change; custom settings are stable per transaction.
BEGIN;
CREATE INDEX IF NOT EXISTS ix_evo_brand_sheets_client_company
  ON evo_brand_sheets(client_id,company_id);
CREATE INDEX IF NOT EXISTS ix_evo_documents_project_company
  ON evo_documents(project_id,company_id);
CREATE INDEX IF NOT EXISTS ix_evo_missions_project_company
  ON evo_missions(project_id,company_id);
CREATE INDEX IF NOT EXISTS ix_evo_projects_client_company
  ON evo_projects(client_id,company_id);
CREATE INDEX IF NOT EXISTS ix_evo_proposals_client_company
  ON evo_proposals(client_id,company_id);
CREATE INDEX IF NOT EXISTS ix_evo_proposals_template_company
  ON evo_proposals(template_id,company_id);
CREATE INDEX IF NOT EXISTS ix_evo_software_products_client_company
  ON evo_software_products(client_id,company_id);

ALTER POLICY evo_api_scope ON evo_workspaces USING (
  id IN (
    SELECT workspace_id FROM evo_memberships
    WHERE subject = (SELECT current_setting('app.subject',true))
  )
);
ALTER POLICY evo_api_scope ON evo_memberships USING (
  subject = (SELECT current_setting('app.subject',true))
  OR workspace_id = NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
);
ALTER POLICY evo_api_scope ON evo_companies USING (
  workspace_id = NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
) WITH CHECK (
  workspace_id = NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
);
ALTER POLICY evo_api_scope ON evo_audit_events USING (
  workspace_id = NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
) WITH CHECK (
  workspace_id = NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
);
ALTER POLICY evo_api_scope ON evo_legacy_import_ids USING (
  workspace_id = NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
) WITH CHECK (
  workspace_id = NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
);
COMMIT;
