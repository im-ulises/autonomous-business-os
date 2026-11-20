-- Index referenced foreign keys reported by Supabase performance advisor.
-- Safe to rerun; does not modify existing customer data.
BEGIN;
CREATE INDEX IF NOT EXISTS ix_evo_brand_sheets_client_id ON public.evo_brand_sheets (client_id);
CREATE INDEX IF NOT EXISTS ix_evo_documents_project_id ON public.evo_documents (project_id);
CREATE INDEX IF NOT EXISTS ix_evo_missions_project_id ON public.evo_missions (project_id);
CREATE INDEX IF NOT EXISTS ix_evo_projects_client_id ON public.evo_projects (client_id);
CREATE INDEX IF NOT EXISTS ix_evo_proposals_client_id ON public.evo_proposals (client_id);
COMMIT;
