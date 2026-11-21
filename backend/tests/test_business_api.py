"""Business modules: tenant isolation, version conflicts, review permissions."""
from test_api import make_client, cleanup


def test_business_records_isolation_and_revision():
    client, wid, other_wid, engine = make_client()
    try:
        company = client.post(f"/v1/workspaces/{wid}/companies", json={"name": "EVO Studios"}).json()
        other_company = client.post(f"/v1/workspaces/{wid}/companies", json={"name": "Second company"}).json()
        other_client = client.post(f"/v1/workspaces/{wid}/clients", json={
            "company_id": other_company["id"], "name": "External client"
        }).json()
        invalid = client.post(f"/v1/workspaces/{wid}/brand-sheets", json={
            "company_id": company["id"], "client_id": other_client["id"],
            "name": "Brand", "data": {}
        })
        assert invalid.status_code == 422
        brand = client.post(f"/v1/workspaces/{wid}/brand-sheets", json={
            "company_id": company["id"], "name": "EVO Brand",
            "data": {"colors": [{"hex": "#ff0000"}]}
        })
        assert brand.status_code == 201, brand.text
        bid = brand.json()["id"]
        assert client.patch(f"/v1/workspaces/{wid}/brand-sheets/{bid}", json={
            "revision": 1, "name": "EVO Brand V2"
        }).json()["revision"] == 2
        assert client.patch(f"/v1/workspaces/{wid}/brand-sheets/{bid}", json={
            "revision": 1, "name": "Stale"
        }).status_code == 409
        assert client.get(f"/v1/workspaces/{other_wid}/brand-sheets?company_id={company['id']}").status_code == 403
    finally:
        cleanup(engine)


def test_roadmap_deliverable_approval_and_documents():
    client, wid, _, engine = make_client()
    try:
        cid = client.post(f"/v1/workspaces/{wid}/companies", json={"name":"EVO"}).json()["id"]
        pid = client.post(f"/v1/workspaces/{wid}/projects", json={
            "company_id": cid, "name": "Big Media campaign"
        }).json()["id"]
        document = client.post(f"/v1/workspaces/{wid}/documents", json={
            "company_id": cid, "project_id": pid, "title": "Brief", "markdown": "# Script"
        })
        assert document.status_code == 201, document.text
        dept = client.post(f"/v1/workspaces/{wid}/departments", json={
            "company_id": cid, "name": "Marketing", "data": {"purpose": "Campaigns"}
        })
        assert dept.status_code == 201, dept.text
        assert client.put(f"/v1/workspaces/{wid}/software-roadmaps/{pid}", json={
            "project_id": pid, "roadmap": {"phases":[]}
        }).status_code == 200
        assert client.put(f"/v1/workspaces/{wid}/software-roadmaps/{pid}", json={
            "project_id": pid, "revision": 1, "roadmap": {"phases":[{"title":"QA"}]}
        }).json()["revision"] == 2
        rejected = client.post(f"/v1/workspaces/{wid}/deliverables", json={
            "project_id": pid, "title": "Storyboard", "url":"http://example.com"
        })
        assert rejected.status_code == 422
        deliverable = client.post(f"/v1/workspaces/{wid}/deliverables", json={
            "project_id": pid, "title": "Storyboard", "url":"https://example.com/review"
        })
        assert deliverable.status_code == 201
        assert client.patch(
            f"/v1/workspaces/{wid}/deliverables/{deliverable.json()['id']}",
            json={"status":"approved"}
        ).status_code == 200
    finally:
        cleanup(engine)


def test_proposal_workflow_is_not_autonomous_outreach():
    client, wid, _, engine = make_client()
    try:
        company = client.post(f"/v1/workspaces/{wid}/companies", json={"name":"EVO"}).json()
        proposal = client.post(f"/v1/workspaces/{wid}/proposals", json={
            "company_id": company["id"], "title":"Comercial",
            "document": {"items":[{"description":"Filming","unitPrice":200}]}
        })
        assert proposal.status_code == 201 and proposal.json()["status"] == "draft"
        proposal_id = proposal.json()["id"]
        assert client.patch(f"/v1/workspaces/{wid}/proposals/{proposal_id}", json={
            "revision":1, "status":"approved"
        }).status_code == 422
        assert client.patch(f"/v1/workspaces/{wid}/proposals/{proposal_id}", json={
            "revision":1, "title":"Still an editable draft"
        }).status_code == 200
    finally:
        cleanup(engine)
