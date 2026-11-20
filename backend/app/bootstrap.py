"""One-time, operator-run workspace/owner bootstrap after SQL migrations."""
import argparse
from uuid import uuid4

from app.db import session_factory
from app.models import Membership, Workspace


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-name", required=True)
    parser.add_argument("--owner-sub", required=True, help="Verified OIDC sub claim of the initial owner")
    args = parser.parse_args()
    if not args.owner_sub.strip() or not args.workspace_name.strip():
        parser.error("Both values are required")
    with session_factory()() as db:
        workspace = Workspace(id=uuid4(), name=args.workspace_name.strip())
        db.add(workspace)
        db.add(Membership(workspace_id=workspace.id, subject=args.owner_sub.strip(), role="owner"))
        db.commit()
        print("Workspace ID:", workspace.id)


if __name__ == "__main__":
    main()
