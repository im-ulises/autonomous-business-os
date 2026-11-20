"""Migration integration test for disposable PostgreSQL in CI."""
import os
from pathlib import Path

import psycopg
import pytest


@pytest.mark.skipif(not os.getenv("MIGRATION_TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL")
def test_postgres_initial_migration_and_rls():
    url = os.environ["MIGRATION_TEST_DATABASE_URL"]
    directory = Path(__file__).resolve().parent.parent / "migrations"
    migrations = [(directory / name).read_text() for name in ("001_initial.sql", "002_business_extensions.sql")]
    expected = [
        "evo_workspaces", "evo_memberships", "evo_companies",
        "evo_clients", "evo_projects", "evo_tasks",
        "evo_missions", "evo_audit_events",
        "evo_departments", "evo_brand_sheets", "evo_proposals",
        "evo_documents", "evo_deliverables", "evo_software_roadmaps",
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
