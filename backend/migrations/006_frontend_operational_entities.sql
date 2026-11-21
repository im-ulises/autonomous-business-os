-- 006: typed business fields and normalized operational records from lib/types.ts.
-- Existing JSON guides/roadmaps are content only, never authoritative approvals.
-- Apply after 005. No customer data is modified by this migration.
BEGIN;

ALTER TABLE evo_companies ADD COLUMN IF NOT EXISTS short varchar(40) NOT NULL DEFAULT '';
ALTER TABLE evo_companies ADD COLUMN IF NOT EXISTS accent varchar(32) NOT NULL DEFAULT '';

ALTER TABLE evo_clients ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE evo_clients ADD COLUMN IF NOT EXISTS industry varchar(160) NOT NULL DEFAULT '';
ALTER TABLE evo_clients ADD COLUMN IF NOT EXISTS brand_color varchar(32) NOT NULL DEFAULT '';
ALTER TABLE evo_clients ADD COLUMN IF NOT EXISTS website varchar(2048) NOT NULL DEFAULT '';
ALTER TABLE evo_clients ADD COLUMN IF NOT EXISTS contact_name varchar(160) NOT NULL DEFAULT '';
ALTER TABLE evo_clients ADD COLUMN IF NOT EXISTS contact_email varchar(320) NOT NULL DEFAULT '';
ALTER TABLE evo_clients ADD COLUMN IF NOT EXISTS contact_phone varchar(80) NOT NULL DEFAULT '';

ALTER TABLE evo_missions ADD COLUMN IF NOT EXISTS assignee varchar(20) NOT NULL DEFAULT 'unassigned'
  CHECK(assignee IN ('claude','codex','grok','unassigned'));
ALTER TABLE evo_missions ADD COLUMN IF NOT EXISTS planning_state varchar(20) NOT NULL DEFAULT 'local_draft'
  CHECK(planning_state IN ('local_draft','planned'));
ALTER TABLE evo_documents ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS evo_project_details (
  project_id uuid PRIMARY KEY REFERENCES evo_projects(id) ON DELETE CASCADE,
  brief text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evo_software_products (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES evo_clients(id) ON DELETE SET NULL,
  name varchar(200) NOT NULL,
  description text NOT NULL DEFAULT '',
  owner varchar(160) NOT NULL DEFAULT '',
  stack text NOT NULL DEFAULT '',
  repo_url varchar(2048) NOT NULL DEFAULT '',
  spec_url varchar(2048) NOT NULL DEFAULT '',
  start_date date,
  target_date date,
  status varchar(20) NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning','building','at_risk','paused','delivered')),
  next_action text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  source_name text NOT NULL DEFAULT '',
  source_version text NOT NULL DEFAULT '',
  commercial_window text NOT NULL DEFAULT '',
  repository_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_software_products_company_id ON evo_software_products(company_id);
CREATE INDEX IF NOT EXISTS ix_evo_software_products_client_id ON evo_software_products(client_id);

CREATE TABLE IF NOT EXISTS evo_software_phases (
  id uuid PRIMARY KEY,
  software_id uuid NOT NULL REFERENCES evo_software_products(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text NOT NULL DEFAULT '',
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','review','blocked','done')),
  notes text NOT NULL DEFAULT '',
  phase_order integer NOT NULL DEFAULT 0,
  phase_window text NOT NULL DEFAULT '',
  demo text NOT NULL DEFAULT '',
  source_page integer,
  acceptance_criteria jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS ix_evo_software_phases_software_id ON evo_software_phases(software_id);

CREATE TABLE IF NOT EXISTS evo_software_milestones (
  id uuid PRIMARY KEY,
  phase_id uuid NOT NULL REFERENCES evo_software_phases(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  deliverable text NOT NULL DEFAULT '',
  due_date date,
  done boolean NOT NULL DEFAULT false,
  milestone_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_evo_software_milestones_phase_id ON evo_software_milestones(phase_id);

-- Only an owner-reviewed record, not imported JSON, may attest accepted verification.
CREATE TABLE IF NOT EXISTS evo_software_acceptances (
  id uuid PRIMARY KEY,
  milestone_id uuid NOT NULL REFERENCES evo_software_milestones(id) ON DELETE CASCADE,
  level varchar(20) NOT NULL CHECK (level IN ('pending','implemented','staging','accepted')),
  summary text NOT NULL,
  evidence_url varchar(2048) NOT NULL,
  reviewer_subject varchar(255) NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (level <> 'accepted' OR length(evidence_url) > 0)
);
CREATE INDEX IF NOT EXISTS ix_evo_software_acceptances_milestone_id ON evo_software_acceptances(milestone_id);

CREATE TABLE IF NOT EXISTS evo_department_lessons (
  id uuid PRIMARY KEY,
  department_id uuid NOT NULL REFERENCES evo_departments(id) ON DELETE CASCADE,
  category varchar(30) NOT NULL CHECK(category IN ('worked','failed','insight','decision')),
  title varchar(200) NOT NULL,
  situation text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT '',
  learning text NOT NULL DEFAULT '',
  evidence_url varchar(2048) NOT NULL DEFAULT '',
  observed_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','approved','rejected')),
  reviewed_by varchar(255) NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  CHECK(status <> 'approved' OR (length(evidence_url)>0 AND length(reviewed_by)>0 AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_evo_department_lessons_department_id ON evo_department_lessons(department_id);

CREATE TABLE IF NOT EXISTS evo_proposal_templates (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  layout varchar(20) NOT NULL DEFAULT 'editorial' CHECK(layout IN ('editorial','classic')),
  use_brand_sheet boolean NOT NULL DEFAULT true,
  accent_hex varchar(32) NOT NULL DEFAULT '',
  custom_logo_url varchar(2048) NOT NULL DEFAULT '',
  seller_tagline text NOT NULL DEFAULT '',
  seller_address text NOT NULL DEFAULT '',
  seller_email varchar(320) NOT NULL DEFAULT '',
  seller_phone varchar(80) NOT NULL DEFAULT '',
  default_introduction text NOT NULL DEFAULT '',
  default_scope text NOT NULL DEFAULT '',
  default_deliverables text NOT NULL DEFAULT '',
  default_timeline text NOT NULL DEFAULT '',
  default_terms text NOT NULL DEFAULT '',
  default_exclusions text NOT NULL DEFAULT '',
  default_notes text NOT NULL DEFAULT '',
  default_currency varchar(3) NOT NULL DEFAULT 'MXN' CHECK(default_currency IN ('MXN','USD')),
  default_tax_percent numeric(7,3) NOT NULL DEFAULT 0 CHECK(default_tax_percent BETWEEN 0 AND 100),
  default_deposit_percent numeric(7,3) NOT NULL DEFAULT 0 CHECK(default_deposit_percent BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_proposal_templates_company_id ON evo_proposal_templates(company_id);

ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES evo_proposal_templates(id) ON DELETE SET NULL;
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS quote_number varchar(100) NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS client_name varchar(200) NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS client_contact varchar(200) NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS issue_date date;
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS valid_until date;
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS introduction text NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS deliverables text NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS timeline text NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS terms text NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS exclusions text NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS tax_percent numeric(7,3) NOT NULL DEFAULT 0 CHECK (tax_percent BETWEEN 0 AND 100);
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS deposit_percent numeric(7,3) NOT NULL DEFAULT 0 CHECK (deposit_percent BETWEEN 0 AND 100);
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS template_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE evo_proposals ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS ix_evo_proposals_template_id ON evo_proposals(template_id);
ALTER TABLE evo_proposals DROP CONSTRAINT IF EXISTS evo_proposals_status_check;
ALTER TABLE evo_proposals ADD CONSTRAINT evo_proposals_status_check
  CHECK(status IN ('draft','review','sent','approved','declined'));

CREATE TABLE IF NOT EXISTS evo_proposal_line_items (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES evo_proposals(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  details text NOT NULL DEFAULT '',
  quantity numeric(14,4) NOT NULL CHECK(quantity > 0),
  unit varchar(80) NOT NULL DEFAULT '',
  unit_price numeric(18,4) NOT NULL CHECK(unit_price >= 0)
);
CREATE INDEX IF NOT EXISTS ix_evo_proposal_line_items_proposal_id ON evo_proposal_line_items(proposal_id);

-- Approvals become immutable snapshots that an editor cannot rewrite.
CREATE TABLE IF NOT EXISTS evo_proposal_approval_snapshots (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES evo_proposals(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK(revision >= 1),
  approved_by varchar(255) NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL,
  UNIQUE(proposal_id, revision)
);
CREATE INDEX IF NOT EXISTS ix_evo_proposal_approval_snapshots_proposal_id ON evo_proposal_approval_snapshots(proposal_id);

-- Deterministic import mapping for legacy IDs that aren't UUIDs.
CREATE TABLE IF NOT EXISTS evo_legacy_import_ids (
  workspace_id uuid NOT NULL REFERENCES evo_workspaces(id) ON DELETE CASCADE,
  entity_type varchar(80) NOT NULL,
  legacy_id varchar(255) NOT NULL,
  entity_uuid uuid NOT NULL,
  PRIMARY KEY (workspace_id, entity_type, legacy_id),
  UNIQUE (workspace_id, entity_type, entity_uuid)
);
CREATE INDEX IF NOT EXISTS ix_evo_legacy_import_ids_uuid ON evo_legacy_import_ids(entity_uuid);

-- Endpoint handles operate through an isolated non-owner role with RLS.
ALTER TABLE evo_project_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_software_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_software_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_software_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_software_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_department_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_proposal_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_proposal_approval_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_legacy_import_ids ENABLE ROW LEVEL SECURITY;

ALTER TABLE evo_project_details FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_software_products FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_software_phases FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_software_milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_software_acceptances FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_department_lessons FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_proposal_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_proposal_line_items FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_proposal_approval_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE evo_legacy_import_ids FORCE ROW LEVEL SECURITY;

REVOKE ALL ON evo_project_details, evo_software_products, evo_software_phases,
  evo_software_milestones, evo_software_acceptances, evo_department_lessons,
  evo_proposal_templates, evo_proposal_line_items,
  evo_proposal_approval_snapshots, evo_legacy_import_ids FROM PUBLIC;

DO $rev$
DECLARE r text;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
    EXECUTE format(
      'REVOKE ALL ON evo_project_details, evo_software_products, evo_software_phases, evo_software_milestones, evo_software_acceptances, evo_department_lessons, evo_proposal_templates, evo_proposal_line_items, evo_proposal_approval_snapshots, evo_legacy_import_ids FROM %I',r
    );
  END LOOP;
END $rev$;

GRANT SELECT,INSERT,UPDATE,DELETE ON
  evo_project_details, evo_software_products, evo_software_phases,
  evo_software_milestones, evo_department_lessons, evo_proposal_templates,
  evo_proposal_line_items, evo_legacy_import_ids
  TO autonomous_os_api;

GRANT SELECT,INSERT ON evo_software_acceptances, evo_proposal_approval_snapshots TO autonomous_os_api;

DROP POLICY IF EXISTS evo_api_scope ON evo_project_details;
CREATE POLICY evo_api_scope ON evo_project_details FOR ALL TO autonomous_os_api USING
  (project_id IN (SELECT id FROM evo_projects))
  WITH CHECK (project_id IN (SELECT id FROM evo_projects));

DROP POLICY IF EXISTS evo_api_scope ON evo_software_products;
CREATE POLICY evo_api_scope ON evo_software_products FOR ALL TO autonomous_os_api USING
  (company_id IN (SELECT id FROM evo_companies))
  WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_software_phases;
CREATE POLICY evo_api_scope ON evo_software_phases FOR ALL TO autonomous_os_api USING
  (software_id IN (SELECT id FROM evo_software_products))
  WITH CHECK (software_id IN (SELECT id FROM evo_software_products));

DROP POLICY IF EXISTS evo_api_scope ON evo_software_milestones;
CREATE POLICY evo_api_scope ON evo_software_milestones FOR ALL TO autonomous_os_api USING
  (phase_id IN (SELECT id FROM evo_software_phases))
  WITH CHECK (phase_id IN (SELECT id FROM evo_software_phases));

DROP POLICY IF EXISTS evo_api_scope ON evo_software_acceptances;
CREATE POLICY evo_api_scope ON evo_software_acceptances FOR ALL TO autonomous_os_api USING
  (milestone_id IN (SELECT id FROM evo_software_milestones))
  WITH CHECK (milestone_id IN (SELECT id FROM evo_software_milestones));

DROP POLICY IF EXISTS evo_api_scope ON evo_department_lessons;
CREATE POLICY evo_api_scope ON evo_department_lessons FOR ALL TO autonomous_os_api USING
  (department_id IN (SELECT id FROM evo_departments))
  WITH CHECK (department_id IN (SELECT id FROM evo_departments));

DROP POLICY IF EXISTS evo_api_scope ON evo_proposal_templates;
CREATE POLICY evo_api_scope ON evo_proposal_templates FOR ALL TO autonomous_os_api USING
  (company_id IN (SELECT id FROM evo_companies))
  WITH CHECK (company_id IN (SELECT id FROM evo_companies));

DROP POLICY IF EXISTS evo_api_scope ON evo_proposal_line_items;
CREATE POLICY evo_api_scope ON evo_proposal_line_items FOR ALL TO autonomous_os_api USING
  (proposal_id IN (SELECT id FROM evo_proposals))
  WITH CHECK (proposal_id IN (SELECT id FROM evo_proposals));

DROP POLICY IF EXISTS evo_api_scope ON evo_proposal_approval_snapshots;
CREATE POLICY evo_api_scope ON evo_proposal_approval_snapshots FOR ALL TO autonomous_os_api USING
  (proposal_id IN (SELECT id FROM evo_proposals))
  WITH CHECK (proposal_id IN (SELECT id FROM evo_proposals));

DROP POLICY IF EXISTS evo_api_scope ON evo_legacy_import_ids;
CREATE POLICY evo_api_scope ON evo_legacy_import_ids FOR ALL TO autonomous_os_api USING
  (workspace_id = NULLIF(current_setting('app.authorized_workspace',true),'')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.authorized_workspace',true),'')::uuid);

COMMIT;
