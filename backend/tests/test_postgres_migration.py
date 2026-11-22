"""Migration integration test for disposable PostgreSQL in CI."""
import os
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest


@pytest.mark.skipif(not os.getenv("MIGRATION_TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL")
def test_postgres_initial_migration_and_rls():
    url = os.environ["MIGRATION_TEST_DATABASE_URL"]
    directory = Path(__file__).resolve().parent.parent / "migrations"
    migrations = [(directory / name).read_text() for name in ("001_initial.sql", "002_business_extensions.sql", "003_fk_indexes.sql", "004_company_acl.sql", "005_rls_non_owner_api.sql", "006_frontend_operational_entities.sql", "007_dedicated_login_prerequisites.sql", "008_same_company_integrity.sql", "009_fk_performance_rls_initplan.sql", "010_project_collaboration.sql")]
    expected = [
        "evo_workspaces", "evo_memberships", "evo_companies",
        "evo_clients", "evo_projects", "evo_tasks",
        "evo_missions", "evo_audit_events",
        "evo_departments", "evo_brand_sheets", "evo_proposals",
        "evo_documents", "evo_deliverables", "evo_software_roadmaps",
        "evo_company_memberships",
        "evo_project_details", "evo_software_products", "evo_software_phases",
        "evo_software_milestones", "evo_software_acceptances",
        "evo_department_lessons", "evo_proposal_templates",
        "evo_proposal_line_items", "evo_proposal_approval_snapshots",
        "evo_legacy_import_ids", "evo_project_memberships",
    ]
    with psycopg.connect(url, autocommit=True) as db:
        for sql in migrations:
            db.execute(sql, prepare=False)
        for sql in migrations:
            db.execute(sql, prepare=False)
        for name in expected:
            row = db.execute(
                """SELECT c.relrowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = 'public' AND c.relname = %s""",
                (name,),
            ).fetchone()
            assert row == (True,), "Missing table or RLS: " + name
            force = db.execute(
                "SELECT relforcerowsecurity FROM pg_class WHERE relname = %s",
                (name,),
            ).fetchone()
            assert force == (True,), "Missing FORCE RLS: " + name



@pytest.mark.skipif(not os.getenv("MIGRATION_TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL")
def test_non_owner_role_rls_does_not_leak_across_workspaces():
    """Verify RLS with a real role; testing relrowsecurity=True alone is insufficient."""
    url = os.environ["MIGRATION_TEST_DATABASE_URL"]
    wid_a, wid_b, cid_a, cid_b = (uuid4() for _ in range(4))
    with psycopg.connect(url, autocommit=True) as db:
        db.execute("INSERT INTO evo_workspaces (id,name) VALUES (%s,'A'),(%s,'B')", (wid_a, wid_b))
        db.execute(
            "INSERT INTO evo_memberships (workspace_id, subject, role) VALUES "
            "(%s,'alice','owner'),(%s,'bob','owner')", (wid_a, wid_b)
        )
        db.execute(
            "INSERT INTO evo_companies (id,workspace_id,name) VALUES "
            "(%s,%s,'Secret A'),(%s,%s,'Secret B')",
            (cid_a,wid_a,cid_b,wid_b),
        )
        with db.transaction():
            db.execute("SET LOCAL ROLE autonomous_os_api")
            db.execute("SELECT set_config('app.subject', 'alice', true)")
            # Missing authorized workspace context must fail closed.
            assert db.execute("SELECT count(*) FROM evo_companies").fetchone() == (0,)
            assert db.execute("SELECT count(*) FROM evo_workspaces").fetchone() == (1,)
            db.execute("SELECT set_config('app.authorized_workspace', %s, true)", (str(wid_a),))
            rows = db.execute("SELECT name FROM evo_companies").fetchall()
            assert rows == [("Secret A",)]
            assert db.execute(
                "SELECT has_table_privilege(current_user, 'evo_audit_events', 'DELETE')"
            ).fetchone() == (False,)
        with db.transaction():
            db.execute("SET LOCAL ROLE autonomous_os_api")
            db.execute("SELECT set_config('app.subject', 'bob', true)")
            db.execute("SELECT set_config('app.authorized_workspace', %s, true)", (str(wid_b),))
            assert db.execute("SELECT name FROM evo_companies").fetchall() == [("Secret B",)]



@pytest.mark.skipif(not os.getenv("MIGRATION_TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL")
def test_composite_fk_blocks_cross_company_clients():
    """No SQL handler may attach another company's client to a project."""
    url = os.environ["MIGRATION_TEST_DATABASE_URL"]
    wid, company_a, company_b, client_a, project_b = (uuid4() for _ in range(5))
    with psycopg.connect(url) as db:
        db.execute("INSERT INTO evo_workspaces(id,name) VALUES (%s,'Test')", (wid,))
        db.execute("INSERT INTO evo_companies(id,workspace_id,name) VALUES "
                   "(%s,%s,'A'),(%s,%s,'B')",
                   (company_a,wid,company_b,wid))
        db.execute("INSERT INTO evo_clients(id,company_id,name) VALUES (%s,%s,'A Client')",
                   (client_a,company_a))
        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            db.execute(
                "INSERT INTO evo_projects(id,company_id,client_id,name) "
                "VALUES (%s,%s,%s,'Invalid cross-company link')",
                (project_b,company_b,client_a),
            )
        db.rollback()


@pytest.mark.skipif(not os.getenv("MIGRATION_TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL")
def test_project_share_rls_grants_only_one_project_and_no_company_records():
    """Prove actual PostgreSQL FORCE RLS behavior for two different users."""
    url = os.environ["MIGRATION_TEST_DATABASE_URL"]
    wid, cid, p_shared, p_private, t_shared, t_private = (uuid4() for _ in range(6))
    dad = str(uuid4())
    viewer = str(uuid4())
    with psycopg.connect(url, autocommit=True) as db:
        db.execute("INSERT INTO evo_workspaces(id,name) VALUES (%s,'Collaboration')", (wid,))
        db.execute(
            "INSERT INTO evo_memberships(workspace_id,subject,role) VALUES "
            "(%s,'collab-owner','owner'),(%s,%s,'editor'),(%s,%s,'viewer')",
            (wid,wid,dad,wid,viewer),
        )
        db.execute("INSERT INTO evo_companies(id,workspace_id,name) VALUES (%s,%s,'EVO')", (cid,wid))
        db.execute("INSERT INTO evo_projects(id,company_id,name) VALUES "
                   "(%s,%s,'Share me'),(%s,%s,'Private')",
                   (p_shared,cid,p_private,cid))
        db.execute("INSERT INTO evo_tasks(id,project_id,title) VALUES "
                   "(%s,%s,'Collaborate'),(%s,%s,'Secret')",
                   (t_shared,p_shared,t_private,p_private))

        with db.transaction():
            db.execute("SET LOCAL ROLE autonomous_os_api")
            db.execute("SELECT set_config('app.subject','collab-owner',true)")
            db.execute("SELECT set_config('app.authorized_workspace',%s,true)", (str(wid),))
            db.execute(
                "INSERT INTO evo_project_memberships(project_id,subject,role,granted_by) "
                "VALUES (%s,%s,'editor','collab-owner'),(%s,%s,'viewer','collab-owner')",
                (p_shared,dad,p_shared,viewer),
            )

        with db.transaction():
            db.execute("SET LOCAL ROLE autonomous_os_api")
            db.execute("SELECT set_config('app.subject',%s,true)", (dad,))
            db.execute("SELECT set_config('app.authorized_workspace',%s,true)", (str(wid),))
            assert db.execute("SELECT name FROM evo_projects").fetchall() == [("Share me",)]
            assert db.execute("SELECT name FROM evo_companies").fetchall() == []
            assert db.execute("SELECT title FROM evo_tasks").fetchall() == [("Collaborate",)]
            assert db.execute("SELECT count(*) FROM evo_clients").fetchone() == (0,)
            db.execute("INSERT INTO evo_tasks(id,project_id,title) VALUES (%s,%s,'Dad edit')",
                       (uuid4(),p_shared))

        with db.transaction():
            db.execute("SET LOCAL ROLE autonomous_os_api")
            db.execute("SELECT set_config('app.subject',%s,true)", (viewer,))
            db.execute("SELECT set_config('app.authorized_workspace',%s,true)", (str(wid),))
            assert db.execute("SELECT name FROM evo_projects").fetchall() == [("Share me",)]
            assert db.execute("SELECT title FROM evo_tasks ORDER BY title").fetchall() == [
                ("Collaborate",),("Dad edit",)
            ]
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                with db.transaction():
                    db.execute("INSERT INTO evo_tasks(id,project_id,title) VALUES (%s,%s,'Bad write')",
                               (uuid4(),p_shared))

        with db.transaction():
            db.execute("SET LOCAL ROLE autonomous_os_api")
            db.execute("SELECT set_config('app.subject','collab-owner',true)")
            db.execute("SELECT set_config('app.authorized_workspace',%s,true)", (str(wid),))
            db.execute("DELETE FROM evo_project_memberships WHERE project_id=%s AND subject=%s",
                       (p_shared,dad))

        with db.transaction():
            db.execute("SET LOCAL ROLE autonomous_os_api")
            db.execute("SELECT set_config('app.subject',%s,true)", (dad,))
            db.execute("SELECT set_config('app.authorized_workspace',%s,true)", (str(wid),))
            assert db.execute("SELECT count(*) FROM evo_projects").fetchone() == (0,)
            assert db.execute("SELECT count(*) FROM evo_tasks").fetchone() == (0,)
