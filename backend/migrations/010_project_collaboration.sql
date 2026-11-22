-- 010: project-level collaboration; no implicit company/client visibility.
-- App authenticates a real JWT and sets app.subject + app.authorized_workspace
-- only after verifying workspace membership. Do not provision users by guesswork.
BEGIN;

CREATE SCHEMA IF NOT EXISTS autonomous_os_internal;
REVOKE ALL ON SCHEMA autonomous_os_internal FROM PUBLIC;
GRANT USAGE ON SCHEMA autonomous_os_internal TO autonomous_os_api;

CREATE TABLE IF NOT EXISTS public.evo_project_memberships (
  project_id uuid NOT NULL REFERENCES public.evo_projects(id) ON DELETE CASCADE,
  subject varchar(255) NOT NULL,
  role varchar(20) NOT NULL CHECK(role IN ('editor','viewer')),
  granted_by varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id,subject)
);
CREATE INDEX IF NOT EXISTS ix_evo_project_memberships_subject
  ON public.evo_project_memberships(subject,project_id);
ALTER TABLE public.evo_project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evo_project_memberships FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.evo_project_memberships FROM PUBLIC;
DO $revoke$
DECLARE r text;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.evo_project_memberships FROM %I',r);
  END LOOP;
END $revoke$;
GRANT SELECT, INSERT, DELETE ON public.evo_project_memberships TO autonomous_os_api;

-- All helpers use only server-validated session settings. They have no user-
-- supplied subject or workspace argument and are not callable by browser roles.
CREATE OR REPLACE FUNCTION autonomous_os_internal.can_company(p_company uuid, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.evo_companies c
    JOIN public.evo_memberships m ON m.workspace_id=c.workspace_id
    WHERE c.id=p_company
      AND c.workspace_id=NULLIF(current_setting('app.authorized_workspace',true),'')::uuid
      AND m.subject=current_setting('app.subject',true)
      AND (
        m.role='owner'
        OR (m.role <> 'viewer' OR NOT p_write) AND EXISTS(
          SELECT 1 FROM public.evo_company_memberships g
          WHERE g.company_id=c.id AND g.subject=m.subject
            AND (g.role='editor' OR NOT p_write)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION autonomous_os_internal.can_project(p_project uuid, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.evo_projects p
    JOIN public.evo_companies c ON c.id=p.company_id
    JOIN public.evo_memberships m ON m.workspace_id=c.workspace_id
    WHERE p.id=p_project
      AND c.workspace_id=NULLIF(current_setting('app.authorized_workspace',true),'')::uuid
      AND m.subject=current_setting('app.subject',true)
      AND (
        m.role='owner'
        OR (
          (m.role <> 'viewer' OR NOT p_write)
          AND (
            EXISTS (SELECT 1 FROM public.evo_company_memberships cm
                    WHERE cm.company_id=c.id AND cm.subject=m.subject
                      AND (cm.role='editor' OR NOT p_write))
            OR EXISTS (SELECT 1 FROM public.evo_project_memberships pm
                       WHERE pm.project_id=p.id AND pm.subject=m.subject
                         AND (pm.role='editor' OR NOT p_write))
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION autonomous_os_internal.can_manage_shares(p_project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.evo_projects p
    JOIN public.evo_companies c ON c.id=p.company_id
    JOIN public.evo_memberships m ON m.workspace_id=c.workspace_id
    WHERE p.id=p_project
      AND c.workspace_id=NULLIF(current_setting('app.authorized_workspace',true),'')::uuid
      AND m.subject=current_setting('app.subject',true)
      AND m.role='owner'
  );
$$;

CREATE OR REPLACE FUNCTION autonomous_os_internal.validate_project_share()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE target_role text;
BEGIN
  SELECT m.role INTO target_role
  FROM public.evo_projects p
  JOIN public.evo_companies c ON c.id=p.company_id
  JOIN public.evo_memberships m ON m.workspace_id=c.workspace_id
  WHERE p.id=NEW.project_id AND m.subject=NEW.subject;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Project invitee must be an existing workspace member' USING ERRCODE='23514';
  END IF;
  IF NEW.role='editor' AND target_role='viewer' THEN
    RAISE EXCEPTION 'Viewer workspace members cannot become project editors' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS evo_validate_project_share ON public.evo_project_memberships;
CREATE TRIGGER evo_validate_project_share
  BEFORE INSERT OR UPDATE ON public.evo_project_memberships
  FOR EACH ROW EXECUTE FUNCTION autonomous_os_internal.validate_project_share();

REVOKE ALL ON FUNCTION autonomous_os_internal.can_company(uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION autonomous_os_internal.can_project(uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION autonomous_os_internal.can_manage_shares(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION autonomous_os_internal.validate_project_share() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION autonomous_os_internal.can_company(uuid,boolean),
  autonomous_os_internal.can_project(uuid,boolean),
  autonomous_os_internal.can_manage_shares(uuid) TO autonomous_os_api;

DROP POLICY IF EXISTS evo_api_project_share ON public.evo_project_memberships;
CREATE POLICY evo_api_project_share ON public.evo_project_memberships
  FOR ALL TO autonomous_os_api
  USING (subject=(SELECT current_setting('app.subject',true))
         OR autonomous_os_internal.can_manage_shares(project_id))
  WITH CHECK (autonomous_os_internal.can_manage_shares(project_id));

-- Company visibility stays tied to company grants. A project guest never sees
-- its company's other clients, proposals, employees or unrelated projects.
DROP POLICY IF EXISTS evo_api_scope ON public.evo_companies;
CREATE POLICY evo_api_company_select ON public.evo_companies
  FOR SELECT TO autonomous_os_api
  USING (autonomous_os_internal.can_company(id,false));
CREATE POLICY evo_api_company_insert ON public.evo_companies
  FOR INSERT TO autonomous_os_api
  WITH CHECK (
    workspace_id=NULLIF((SELECT current_setting('app.authorized_workspace',true)),'')::uuid
    AND EXISTS(SELECT 1 FROM public.evo_memberships m
      WHERE m.workspace_id=workspace_id
        AND m.subject=(SELECT current_setting('app.subject',true))
        AND m.role='owner')
  );
CREATE POLICY evo_api_company_update ON public.evo_companies
  FOR UPDATE TO autonomous_os_api
  USING (autonomous_os_internal.can_company(id,true))
  WITH CHECK (autonomous_os_internal.can_company(id,true));
CREATE POLICY evo_api_company_delete ON public.evo_companies
  FOR DELETE TO autonomous_os_api
  USING (autonomous_os_internal.can_company(id,true));

DROP POLICY IF EXISTS evo_api_scope ON public.evo_projects;
CREATE POLICY evo_api_project_select ON public.evo_projects
  FOR SELECT TO autonomous_os_api
  USING (autonomous_os_internal.can_project(id,false));
CREATE POLICY evo_api_project_insert ON public.evo_projects
  FOR INSERT TO autonomous_os_api
  WITH CHECK (autonomous_os_internal.can_company(company_id,true));
CREATE POLICY evo_api_project_update ON public.evo_projects
  FOR UPDATE TO autonomous_os_api
  USING (autonomous_os_internal.can_project(id,true))
  WITH CHECK (autonomous_os_internal.can_project(id,true));
CREATE POLICY evo_api_project_delete ON public.evo_projects
  FOR DELETE TO autonomous_os_api
  USING (autonomous_os_internal.can_project(id,true));

-- Project descendants must not become writable to viewers via FOR ALL policies.
DROP POLICY IF EXISTS evo_api_scope ON public.evo_tasks;
CREATE POLICY evo_api_task_select ON public.evo_tasks FOR SELECT TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,false));
CREATE POLICY evo_api_task_insert ON public.evo_tasks FOR INSERT TO autonomous_os_api
  WITH CHECK (autonomous_os_internal.can_project(project_id,true));
CREATE POLICY evo_api_task_update ON public.evo_tasks FOR UPDATE TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,true))
  WITH CHECK (autonomous_os_internal.can_project(project_id,true));
CREATE POLICY evo_api_task_delete ON public.evo_tasks FOR DELETE TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,true));

DROP POLICY IF EXISTS evo_api_scope ON public.evo_project_details;
CREATE POLICY evo_api_details_select ON public.evo_project_details FOR SELECT TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,false));
CREATE POLICY evo_api_details_write ON public.evo_project_details FOR ALL TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,true))
  WITH CHECK (autonomous_os_internal.can_project(project_id,true));

DROP POLICY IF EXISTS evo_api_scope ON public.evo_deliverables;
CREATE POLICY evo_api_deliverable_select ON public.evo_deliverables FOR SELECT TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,false));
CREATE POLICY evo_api_deliverable_write ON public.evo_deliverables FOR ALL TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,true))
  WITH CHECK (autonomous_os_internal.can_project(project_id,true));

DROP POLICY IF EXISTS evo_api_scope ON public.evo_software_roadmaps;
CREATE POLICY evo_api_roadmap_select ON public.evo_software_roadmaps FOR SELECT TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,false));
CREATE POLICY evo_api_roadmap_write ON public.evo_software_roadmaps FOR ALL TO autonomous_os_api
  USING (autonomous_os_internal.can_project(project_id,true))
  WITH CHECK (autonomous_os_internal.can_project(project_id,true));

COMMIT;
