"""Two-user collaboration tests; only synthetic identities and projects."""
from uuid import uuid4

from app.main import app
from app.security import Principal, get_principal
from test_api import cleanup, make_client


def sign_in(subject: str):
    app.dependency_overrides[get_principal] = lambda: Principal(subject=subject)


def test_father_sees_only_one_shared_project_and_can_edit_its_tasks():
    client, wid, _, engine = make_client()
    dad = str(uuid4())
    stranger = str(uuid4())
    try:
        company = client.post(f"/v1/workspaces/{wid}/companies",
                              json={"name": "EVO Studios"}).json()
        other_company = client.post(f"/v1/workspaces/{wid}/companies",
                                    json={"name": "Private Company"}).json()
        p_shared = client.post(f"/v1/workspaces/{wid}/projects",
                               json={"company_id":company["id"],"name":"Shared"}).json()
        p_private = client.post(f"/v1/workspaces/{wid}/projects",
                                json={"company_id":company["id"],"name":"Only owner"}).json()
        client.post(f"/v1/workspaces/{wid}/projects",
                    json={"company_id":other_company["id"],"name":"Secret"})
        task = client.post(f"/v1/workspaces/{wid}/tasks",
                           json={"project_id":p_shared["id"],"title":"A shared task"}).json()
        assert client.post(f"/v1/workspaces/{wid}/members",
                           json={"subject":dad,"role":"editor"}).status_code == 201
        assert client.post(f"/v1/workspaces/{wid}/projects/{p_shared['id']}/members",
                           json={"subject":stranger,"role":"editor"}).status_code == 422
        grant = client.post(f"/v1/workspaces/{wid}/projects/{p_shared['id']}/members",
                            json={"subject":dad,"role":"editor"})
        assert grant.status_code == 201, grant.text
        assert grant.json()["granted_by"] == "owner"
        sign_in(dad)
        assert client.get(f"/v1/workspaces/{wid}/companies").json() == []
        assert [p["name"] for p in client.get(
            f"/v1/workspaces/{wid}/shared-projects").json()] == ["Shared"]
        assert [p["name"] for p in client.get(
            f"/v1/workspaces/{wid}/projects?company_id={company['id']}").json()] == ["Shared"]
        assert client.get(f"/v1/workspaces/{wid}/projects?company_id={other_company['id']}").json() == []
        assert client.get(f"/v1/workspaces/{wid}/clients?company_id={company['id']}").status_code == 403
        assert client.get(f"/v1/workspaces/{wid}/proposals?company_id={company['id']}").status_code == 403
        assert client.post(f"/v1/workspaces/{wid}/projects",
                           json={"company_id":company["id"],"name":"Forbidden"}).status_code == 403
        assert client.get(f"/v1/workspaces/{wid}/tasks?project_id={p_shared['id']}").json()[0]["id"] == task["id"]
        assert client.post(f"/v1/workspaces/{wid}/tasks",
                           json={"project_id":p_shared["id"],"title":"Dad's task"}).status_code == 201
        assert client.patch(f"/v1/workspaces/{wid}/tasks/{task['id']}",
                            json={"status":"doing"}).status_code == 200
        assert client.get(f"/v1/workspaces/{wid}/tasks?project_id={p_private['id']}").status_code == 403
        assert client.patch(f"/v1/workspaces/{wid}/projects/{p_private['id']}",
                            json={"name":"Leaked"}).status_code == 403
        assert client.get(f"/v1/workspaces/{wid}/members").status_code == 403
        assert client.get(f"/v1/workspaces/{wid}/projects/{p_shared['id']}/members").status_code == 403
        sign_in("owner")
        assert client.delete(f"/v1/workspaces/{wid}/projects/{p_shared['id']}/members/{dad}").status_code == 204
        sign_in(dad)
        assert client.get(f"/v1/workspaces/{wid}/shared-projects").json() == []
        assert client.get(f"/v1/workspaces/{wid}/tasks?project_id={p_shared['id']}").status_code == 403
    finally:
        cleanup(engine)


def test_viewer_share_is_readonly_and_workspace_removal_revokes_every_grant():
    client, wid, _, engine = make_client()
    dad = str(uuid4())
    viewer = str(uuid4())
    try:
        company = client.post(f"/v1/workspaces/{wid}/companies",json={"name":"EVO"}).json()
        project = client.post(f"/v1/workspaces/{wid}/projects",json={
            "company_id":company["id"],"name":"Shared"}).json()
        client.post(f"/v1/workspaces/{wid}/members",json={"subject":dad,"role":"editor"})
        client.post(f"/v1/workspaces/{wid}/members",json={"subject":viewer,"role":"viewer"})
        assert client.post(f"/v1/workspaces/{wid}/projects/{project['id']}/members",
                           json={"subject":viewer,"role":"editor"}).status_code == 422
        assert client.post(f"/v1/workspaces/{wid}/projects/{project['id']}/members",
                           json={"subject":viewer,"role":"viewer"}).status_code == 201
        sign_in(viewer)
        assert client.get(f"/v1/workspaces/{wid}/shared-projects").status_code == 200
        assert client.post(f"/v1/workspaces/{wid}/tasks",
                           json={"project_id":project["id"],"title":"Cannot edit"}).status_code == 403
        sign_in("owner")
        assert client.post(f"/v1/workspaces/{wid}/projects/{project['id']}/members",
                           json={"subject":dad,"role":"viewer"}).status_code == 201
        sign_in(dad)
        assert client.get(f"/v1/workspaces/{wid}/shared-projects").status_code == 200
        assert client.patch(f"/v1/workspaces/{wid}/projects/{project['id']}",
                            json={"stage":"active"}).status_code == 403
        sign_in("owner")
        assert client.delete(f"/v1/workspaces/{wid}/members/{dad}").status_code == 204
        assert client.post(f"/v1/workspaces/{wid}/members",
                           json={"subject":dad,"role":"editor"}).status_code == 201
        sign_in(dad)
        assert client.get(f"/v1/workspaces/{wid}/shared-projects").json() == []
    finally:
        cleanup(engine)
