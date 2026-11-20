"""Contract tests: workspace isolation, editor rights and non-executing missions."""
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.main import app
from app.models import Base, Membership, Workspace
from app.security import Principal, get_principal


def make_client(actor: str = "owner"):
    engine = create_engine(
        "sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    w1, w2 = uuid4(), uuid4()
    with Session(engine) as db:
        db.add_all([
            Workspace(id=w1, name="EVO Studios"),
            Workspace(id=w2, name="Unrelated company"),
            Membership(workspace_id=w1, subject="owner", role="owner"),
            Membership(workspace_id=w1, subject="viewer", role="viewer"),
            Membership(workspace_id=w2, subject="other", role="owner"),
        ])
        db.commit()

    def db_override():
        with Session(engine, expire_on_commit=False) as db:
            yield db

    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_principal] = lambda: Principal(subject=actor)
    return TestClient(app), w1, w2, engine


def cleanup(engine):
    app.dependency_overrides.clear()
    engine.dispose()


def test_health():
    with TestClient(app) as client:
        assert client.get("/healthz").json()["status"] == "up"


def test_workspace_scoping_and_draft_missions():
    client, w1, w2, engine = make_client()
    try:
        company = client.post(f"/v1/workspaces/{w1}/companies", json={"name": "EVO"}).json()
        assert company["workspace_id"] == str(w1)
        assert client.get(f"/v1/workspaces/{w2}/companies").status_code == 403
        project = client.post(f"/v1/workspaces/{w1}/projects", json={
            "company_id": company["id"], "name": "Big Media"
        })
        assert project.status_code == 201, project.text
        task = client.post(f"/v1/workspaces/{w1}/tasks", json={
            "project_id": project.json()["id"], "title": "Review storyboard"
        })
        assert task.status_code == 201
        mission = client.post(f"/v1/workspaces/{w1}/missions", json={
            "company_id": company["id"], "project_id": project.json()["id"],
            "title": "Make ad", "outcome": "Approved storyboard", "executor_hint": "crobi_marketing"
        })
        assert mission.status_code == 201
        assert mission.json()["status"] == "draft"
        assert mission.json()["external_run_id"] is None
        assert len(client.get(f"/v1/workspaces/{w1}/audit-events").json()) == 4
    finally:
        cleanup(engine)


def test_viewers_cannot_write():
    client, w1, _, engine = make_client(actor="viewer")
    try:
        assert client.get(f"/v1/workspaces/{w1}/companies").status_code == 200
        assert client.post(f"/v1/workspaces/{w1}/companies", json={"name": "No"}).status_code == 403
        assert client.get(f"/v1/workspaces/{w1}/audit-events").status_code == 403
    finally:
        cleanup(engine)
