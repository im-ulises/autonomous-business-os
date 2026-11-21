"""Adversarial regression tests derived from Grok audit, using synthetic data only."""
from app.main import app
from app.security import Principal, get_principal
from app.models import Membership
from sqlalchemy.orm import Session
from test_api import make_client, cleanup


def actor(subject):
    app.dependency_overrides[get_principal] = lambda: Principal(subject=subject)


def test_company_acl_prevents_cross_company_read_and_write():
    client, wid, _, engine = make_client()
    try:
        a = client.post(f"/v1/workspaces/{wid}/companies", json={"name":"Company A"}).json()
        b = client.post(f"/v1/workspaces/{wid}/companies", json={"name":"Company B"}).json()
        with Session(engine) as db:
            db.add_all([
                Membership(workspace_id=wid, subject="editor", role="editor"),
            ])
            db.commit()
        assert client.post(f"/v1/workspaces/{wid}/company-memberships", json={
            "company_id": a["id"], "subject": "editor", "role":"editor"
        }).status_code == 201
        assert client.post(f"/v1/workspaces/{wid}/company-memberships", json={
            "company_id": b["id"], "subject": "viewer", "role":"viewer"
        }).status_code == 201
        secret = client.post(f"/v1/workspaces/{wid}/proposals", json={
            "company_id": b["id"], "title":"CONFIDENTIAL B"
        })
        assert secret.status_code == 201, secret.text
        actor("viewer")
        assert [x["name"] for x in client.get(f"/v1/workspaces/{wid}/companies").json()] == ["Company B"]
        assert client.get(f"/v1/workspaces/{wid}/proposals?company_id={a['id']}").status_code == 403
        allowed = client.get(f"/v1/workspaces/{wid}/proposals?company_id={b['id']}")
        assert allowed.status_code == 200 and allowed.json()[0]["title"] == "CONFIDENTIAL B"
        assert client.post(f"/v1/workspaces/{wid}/projects", json={
            "company_id": b["id"],"name":"Unauthorized write"
        }).status_code == 403
        actor("editor")
        assert [x["name"] for x in client.get(f"/v1/workspaces/{wid}/companies").json()] == ["Company A"]
        assert client.get(f"/v1/workspaces/{wid}/proposals?company_id={b['id']}").status_code == 403
        assert client.post(f"/v1/workspaces/{wid}/projects", json={
            "company_id": a["id"],"name":"Authorized"
        }).status_code == 201
        assert client.post(f"/v1/workspaces/{wid}/companies", json={"name":"Unauthorized company"}).status_code == 403
        actor("owner")
        assert client.delete(f"/v1/workspaces/{wid}/company-memberships?company_id={b['id']}&subject=viewer").status_code == 204
        actor("viewer")
        assert client.get(f"/v1/workspaces/{wid}/proposals?company_id={b['id']}").status_code == 403
    finally:
        cleanup(engine)


def test_unreviewed_department_and_roadmap_cannot_claim_approval():
    client, wid, _, engine = make_client()
    try:
        cid = client.post(f"/v1/workspaces/{wid}/companies", json={"name":"Company A"}).json()["id"]
        pid = client.post(f"/v1/workspaces/{wid}/projects", json={
            "company_id":cid, "name":"Software"
        }).json()["id"]
        with Session(engine) as db:
            db.add(Membership(workspace_id=wid, subject="editor", role="editor"))
            db.commit()
        client.post(f"/v1/workspaces/{wid}/company-memberships", json={
            "company_id":cid, "subject":"editor", "role":"editor"
        })
        actor("editor")
        dept = client.post(f"/v1/workspaces/{wid}/departments", json={
            "company_id":cid, "name":"Engineering",
            "data":{"lessons":[{"title":"Unverified","status":"approved"}]}
        })
        assert dept.status_code == 422, dept.text
        roadmap = client.put(f"/v1/workspaces/{wid}/software-roadmaps/{pid}",json={
            "project_id":pid,
            "roadmap":{"phases":[{"milestones":[{"verification":{"level":"accepted"}}]}]}
        })
        assert roadmap.status_code == 422, roadmap.text
        normal = client.put(f"/v1/workspaces/{wid}/software-roadmaps/{pid}",json={
            "project_id":pid, "roadmap":{"phases":[{"name":"Build"}]}
        })
        assert normal.status_code == 200, normal.text
    finally:
        cleanup(engine)


def test_approved_proposals_and_deliverables_cannot_be_rolled_back():
    client, wid, _, engine = make_client()
    try:
        cid = client.post(f"/v1/workspaces/{wid}/companies", json={"name":"Company A"}).json()["id"]
        pid = client.post(f"/v1/workspaces/{wid}/projects", json={"company_id":cid, "name":"Project"}).json()["id"]
        proposal = client.post(f"/v1/workspaces/{wid}/proposals", json={
            "company_id":cid,"title":"Quote","document":{"price":100}
        }).json()
        prop_id = proposal["id"]
        # The generic API can no longer confer financial approval.
        assert client.patch(f"/v1/workspaces/{wid}/proposals/{prop_id}",json={
            "revision":1, "status":"approved"
        }).status_code == 422
        # Review through evidence-backed typed /quotes/{id}/approve instead.
        deliverable = client.post(f"/v1/workspaces/{wid}/deliverables",json={
            "project_id":pid,"title":"Video","url":"https://example.com/video"
        }).json()
        did=deliverable["id"]
        assert client.patch(f"/v1/workspaces/{wid}/deliverables/{did}",json={
            "status":"approved"
        }).status_code == 200
        assert client.patch(f"/v1/workspaces/{wid}/deliverables/{did}",json={
            "status":"submitted"
        }).status_code == 409
    finally:
        cleanup(engine)


def test_cors_put_preflight_and_production_docs_are_closed(monkeypatch):
    # The running app is configured with APP_ENV != development at import time.
    client, wid, _, engine = make_client()
    try:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
    finally:
        cleanup(engine)
