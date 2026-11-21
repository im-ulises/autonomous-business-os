-- Company-level grants; workspace membership alone cannot access other companies.
BEGIN;
CREATE TABLE IF NOT EXISTS evo_company_memberships (
  company_id UUID NOT NULL REFERENCES evo_companies(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('editor', 'viewer')),
  PRIMARY KEY (company_id, subject)
);
CREATE INDEX IF NOT EXISTS ix_evo_company_memberships_subject
ON evo_company_memberships(subject);
ALTER TABLE evo_company_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON evo_company_memberships FROM PUBLIC;
DO $rev$
DECLARE r text;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON evo_company_memberships FROM %I',r);
  END LOOP;
END $rev$;
COMMIT;
