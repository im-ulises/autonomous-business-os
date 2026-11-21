-- 008: enforce company consistency directly in PostgreSQL, not only in API handlers.
-- PostgreSQL 17 supports column-specific SET NULL on composite foreign keys.
BEGIN;
DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_clients_id_company_uq') THEN
    ALTER TABLE evo_clients ADD CONSTRAINT evo_clients_id_company_uq UNIQUE(id,company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_projects_id_company_uq') THEN
    ALTER TABLE evo_projects ADD CONSTRAINT evo_projects_id_company_uq UNIQUE(id,company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_proposal_templates_id_company_uq') THEN
    ALTER TABLE evo_proposal_templates ADD CONSTRAINT evo_proposal_templates_id_company_uq UNIQUE(id,company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_projects_client_company_fk') THEN
    ALTER TABLE evo_projects ADD CONSTRAINT evo_projects_client_company_fk
      FOREIGN KEY (client_id,company_id) REFERENCES evo_clients(id,company_id)
      ON DELETE SET NULL (client_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_proposals_client_company_fk') THEN
    ALTER TABLE evo_proposals ADD CONSTRAINT evo_proposals_client_company_fk
      FOREIGN KEY (client_id,company_id) REFERENCES evo_clients(id,company_id)
      ON DELETE SET NULL (client_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_brand_sheets_client_company_fk') THEN
    ALTER TABLE evo_brand_sheets ADD CONSTRAINT evo_brand_sheets_client_company_fk
      FOREIGN KEY (client_id,company_id) REFERENCES evo_clients(id,company_id)
      ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_software_products_client_company_fk') THEN
    ALTER TABLE evo_software_products ADD CONSTRAINT evo_software_products_client_company_fk
      FOREIGN KEY (client_id,company_id) REFERENCES evo_clients(id,company_id)
      ON DELETE SET NULL (client_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_documents_project_company_fk') THEN
    ALTER TABLE evo_documents ADD CONSTRAINT evo_documents_project_company_fk
      FOREIGN KEY (project_id,company_id) REFERENCES evo_projects(id,company_id)
      ON DELETE SET NULL (project_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_missions_project_company_fk') THEN
    ALTER TABLE evo_missions ADD CONSTRAINT evo_missions_project_company_fk
      FOREIGN KEY (project_id,company_id) REFERENCES evo_projects(id,company_id)
      ON DELETE SET NULL (project_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evo_proposals_template_company_fk') THEN
    ALTER TABLE evo_proposals ADD CONSTRAINT evo_proposals_template_company_fk
      FOREIGN KEY (template_id,company_id) REFERENCES evo_proposal_templates(id,company_id)
      ON DELETE SET NULL (template_id);
  END IF;
END $constraints$;
COMMIT;
