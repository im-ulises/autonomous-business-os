"""Migration integration test for disposable PostgreSQL in CI."""
import os
from pathlib import Path

import psycopg
import pytest


@pytest.mark.skipif(not os.getenv("MIGRATION_TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL")
def test_postgres_initial_migration_and_rls():
    url = os.environ["MIGRATION_TEST_DATABASE_URL"]
    sql = (Path(__file__).resolve().parent.parent / "migrations" / "001_initial.sql").read_text()
    expected = [
        "evo_workspaces", "evo_memberships", "evo_companies",
        "evo_clients", "evo_projects", "evo_tasks",
        "evo_missions", "evo_audit_events",
    ]
    with psycopg.connect(url, autocommit=True) as db:
        db.execute(sql, prepare=False)
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
