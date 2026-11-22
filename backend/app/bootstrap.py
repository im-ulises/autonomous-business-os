"""Operator-only provisioning of an owner workspace from a verified Auth identity.

This CLI is NOT reachable via the HTTP API or Cloudflare Worker.
Never use the restricted app DB login to bootstrap a workspace.
"""
import argparse
import os
from uuid import UUID, uuid4

from sqlalchemy import create_engine, text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-name", required=True)
    parser.add_argument("--owner-sub", type=UUID, required=True,
                        help="Actual verified Supabase auth.users.id")
    args = parser.parse_args()
    name = args.workspace_name.strip()
    url = os.environ.get("BOOTSTRAP_DATABASE_URL", "").strip()
    if not name:
        parser.error("Workspace name cannot be empty")
    if not url.startswith("postgresql+psycopg://"):
        parser.error("BOOTSTRAP_DATABASE_URL must be a private PostgreSQL psycopg URL")
    # This bootstrap role must be privileged and used only by a trusted operator;
    # the runtime Worker continues using the restricted autonomous_os_login.
    engine = create_engine(url, connect_args={"sslmode": "require"})
    try:
        with engine.begin() as db:
            verified = db.execute(text("""
                SELECT 1 FROM auth.users
                WHERE id = :sub AND email_confirmed_at IS NOT NULL
            """), {"sub": str(args.owner_sub)}).first()
            if not verified:
                parser.error("Owner must be a real email-verified Supabase Auth user")
            already = db.execute(text("""
                SELECT 1 FROM public.evo_workspaces w
                JOIN public.evo_memberships m ON m.workspace_id = w.id
                WHERE w.name = :name AND m.subject = :sub AND m.role = 'owner'
            """), {"name": name, "sub": str(args.owner_sub)}).first()
            if already:
                parser.error("Owner already has a workspace with this name")
            workspace_id = uuid4()
            db.execute(text("""
                INSERT INTO public.evo_workspaces (id, name) VALUES (:id, :name)
            """), {"id": str(workspace_id), "name": name})
            db.execute(text("""
                INSERT INTO public.evo_memberships (workspace_id, subject, role)
                VALUES (:id, :sub, 'owner')
            """), {"id": str(workspace_id), "sub": str(args.owner_sub)})
        print("Created workspace:", workspace_id)
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
