-- Contract for frontend modules not covered by core project CRUD.
-- Run after 001_initial.sql as the trusted DB owner. Deliberately no DML.
BEGIN;
CREATE TABLE IF NOT EXISTS evo_departments (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
 name varchar(160) NOT NULL,
 context jsonb NOT NULL DEFAULT '{}'::jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK(revision >= 1),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_departments_company_id ON evo_departments(company_id);

CREATE TABLE IF NOT EXISTS evo_brand_sheets (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
 client_id uuid REFERENCES evo_clients(id) ON DELETE CASCADE,
 title varchar(160) NOT NULL,
 guide jsonb NOT NULL DEFAULT '{}'::jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK(revision >= 1),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_brand_sheets_company_id ON evo_brand_sheets(company_id);

CREATE TABLE IF NOT EXISTS evo_proposals (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
 client_id uuid REFERENCES evo_clients(id) ON DELETE SET NULL,
 title varchar(200) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'draft'
   CHECK(status IN ('draft','review','approved')),
 currency varchar(3) NOT NULL DEFAULT 'MXN' CHECK(currency IN ('MXN','USD')),
 document jsonb NOT NULL DEFAULT '{}'::jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK(revision >= 1),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_proposals_company_id ON evo_proposals(company_id);

CREATE TABLE IF NOT EXISTS evo_documents (
 id uuid PRIMARY KEY,
 company_id uuid NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
 project_id uuid REFERENCES evo_projects(id) ON DELETE SET NULL,
 title varchar(200) NOT NULL,
 markdown text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 1 CHECK(revision >= 1),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_documents_company_id ON evo_documents(company_id);

CREATE TABLE IF NOT EXISTS evo_deliverables (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES evo_projects(id) ON DELETE CASCADE,
 title varchar(200) NOT NULL,
 url text NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'submitted'
   CHECK(status IN ('submitted','review','approved','rejected')),
 submitted_by varchar(255) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evo_deliverables_project_id ON evo_deliverables(project_id);

CREATE TABLE IF NOT EXISTS evo_software_roadmaps (
 project_id uuid PRIMARY KEY REFERENCES evo_projects(id) ON DELETE CASCADE,
 roadmap jsonb NOT NULL DEFAULT '{}'::jsonb,
 revision integer NOT NULL DEFAULT 1 CHECK(revision >= 1),
 updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE evo_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_brand_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE evo_software_roadmaps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON evo_departments, evo_brand_sheets, evo_proposals,
 evo_documents, evo_deliverables, evo_software_roadmaps FROM PUBLIC;
DO $revoke$
DECLARE db_role text;
BEGIN
 FOR db_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  EXECUTE format(
    'REVOKE ALL ON TABLE evo_departments, evo_brand_sheets, evo_proposals, evo_documents, evo_deliverables, evo_software_roadmaps FROM %I',
    db_role
  );
 END LOOP;
END
$revoke$;
COMMIT;
