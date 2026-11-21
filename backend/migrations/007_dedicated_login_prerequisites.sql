-- 007: reserve a dedicated, non-login application DB identity.
-- Its password/login privilege must be enabled later via a private operator
-- secret workflow. NEVER commit or log a password.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='autonomous_os_login') THEN
    CREATE ROLE autonomous_os_login NOLOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;
-- Role switching never inherits privileges implicitly.
GRANT autonomous_os_api TO autonomous_os_login WITH INHERIT FALSE, SET TRUE;
-- Permit the DB owner to run RLS-negative integration checks by dropping privileges.
-- This does not make autonomous_os_api a login or grant the app elevated rights.
DO $grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN
    GRANT autonomous_os_api TO postgres WITH INHERIT FALSE, SET TRUE;
  END IF;
END $grant$;
COMMIT;
