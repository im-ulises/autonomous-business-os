"""Business contract integration using only synthetic data and mocked identities."""
from app.main import app
from app.models import Membership
from app.security import Principal, get_principal
from sqlalchemy.orm import Session
from test_api import make_client, cleanup


def switch_actor(subject):
    app.dependency_overrides[get_principal] = lambda: Principal(subject=subject)


def create_company(client, wid):
    r = client.post(f"/v1/workspaces/{wid}/companies", json={
        "name":"EVO Test", "short":"EVO", "accent":"#900"
    })
    assert r.status_code == 201, r.text
    assert r.json()["short"] == "EVO"
    return r.json()["id"]


def test_client_contact_fields_are_persisted_and_scoped():
    client, wid, _, engine = make_client()
    try:
        cid = create_company(client, wid)
        response = client.post(f"/v1/workspaces/{wid}/clients", json={
            "company_id": cid, "name": "Test Customer",
            "description": "Client brief", "industry":"Advertising",
            "brand_color":"#abcdef", "website":"https://example.com",
            "contact_name":"A Contact", "contact_email":"contact@example.com",
            "contact_phone":"123456", "notes":"Internal notes"
        })
        assert response.status_code == 201, response.text
        saved = client.get(f"/v1/workspaces/{wid}/clients?company_id={cid}")
        assert saved.status_code == 200
        fields = saved.json()[0]
        assert fields["contact_name"] == "A Contact"
        assert fields["industry"] == "Advertising"
        assert fields["brand_color"] == "#abcdef"
        assert fields["website"] == "https://example.com"
    finally:
        cleanup(engine)


def test_software_portfolio_supports_phases_but_not_forged_acceptance():
    client, wid, _, engine = make_client()
    try:
        company = create_company(client, wid)
        product = client.post(f"/v1/workspaces/{wid}/software-products", json={
            "company_id":company, "name":"Synthetic Product", "status":"building",
            "repo_url":"https://example.com/code",
            "phases":[{"title":"Build","status":"active",
                       "milestones":[{"title":"Implement API","done":True}]}]
        })
        assert product.status_code == 201, product.text
        milestone = product.json()["phases"][0]["milestones"][0]["id"]
        assert product.json()["phases"][0]["milestones"][0]["reviews"] == []
        forged = client.post(f"/v1/workspaces/{wid}/software-products", json={
            "company_id":company, "name":"Forged",
            "phases":[{"title":"Build","milestones":[{"title":"M",
                "verification":{"level":"accepted"}}]}]
        })
        assert forged.status_code == 422
        no_evidence = client.post(
            f"/v1/workspaces/{wid}/software-milestones/{milestone}/reviews",
            json={"level":"accepted","evidence_url":"http://bad.example","summary":"Passed"}
        )
        assert no_evidence.status_code == 422
        review = client.post(
            f"/v1/workspaces/{wid}/software-milestones/{milestone}/reviews",
            json={"level":"accepted","evidence_url":"https://example.com/evidence",
                  "summary":"Human reviewed"}
        )
        assert review.status_code == 201, review.text
        assert review.json()["reviewer_subject"] == "owner"
        loaded = client.get(f"/v1/workspaces/{wid}/software-products?company_id={company}")
        assert loaded.status_code == 200
        assert loaded.json()[0]["phases"][0]["milestones"][0]["reviews"][0]["level"] == "accepted"
    finally:
        cleanup(engine)


def test_lessons_can_be_approved_only_by_owner_and_evidence():
    client, wid, _, engine = make_client()
    try:
        cid = create_company(client, wid)
        department = client.post(f"/v1/workspaces/{wid}/departments", json={
            "company_id":cid, "name":"Marketing","data":{"purpose":"Test"}
        })
        assert department.status_code == 201
        did = department.json()["id"]
        draft = client.post(f"/v1/workspaces/{wid}/departments/{did}/lessons", json={
            "category":"insight","title":"Synthetic learning","learning":"Lesson"
        })
        assert draft.status_code == 201, draft.text
        lid = draft.json()["id"]
        assert draft.json()["status"] == "draft"
        switch_actor("viewer")
        blocked = client.post(f"/v1/workspaces/{wid}/department-lessons/{lid}/review",
            json={"status":"approved","evidence_url":"https://example.com/evidence"})
        assert blocked.status_code == 403
        switch_actor("owner")
        assert client.post(f"/v1/workspaces/{wid}/department-lessons/{lid}/review",
            json={"status":"approved"}).status_code == 422
        reviewed = client.post(f"/v1/workspaces/{wid}/department-lessons/{lid}/review",
            json={"status":"approved","evidence_url":"https://example.com/evidence"})
        assert reviewed.status_code == 200, reviewed.text
        assert reviewed.json()["reviewed_by"] == "owner"
        again = client.post(f"/v1/workspaces/{wid}/department-lessons/{lid}/review",
            json={"status":"rejected"})
        assert again.status_code == 409
    finally:
        cleanup(engine)


def test_financial_line_items_owner_approval_creates_immutable_snapshot():
    client, wid, _, engine = make_client()
    try:
        cid = create_company(client, wid)
        template = client.post(f"/v1/workspaces/{wid}/proposal-templates", json={
            "company_id":cid,"name":"Quote layout", "default_currency":"MXN",
            "default_tax_percent":16, "default_deposit_percent":40,
        })
        assert template.status_code == 201, template.text
        quote = client.post(f"/v1/workspaces/{wid}/quotes", json={
            "company_id":cid,"template_id":template.json()["id"],
            "quote_number":"EVO-Q-001","title":"Synthetic campaign",
            "currency":"MXN","tax_percent":16,"deposit_percent":40,
            "items":[{"description":"Storyboard","quantity":"2.5",
                      "unit":"unit","unit_price":"1000.00"}],
        })
        assert quote.status_code == 201, quote.text
        q = quote.json()
        assert q["status"] == "draft"
        assert float(q["subtotal"]) == 2500
        assert float(q["total"]) == 2900
        assert q["template_snapshot"]["name"] == "Quote layout"
        bad = client.post(f"/v1/workspaces/{wid}/quotes/{q['id']}/approve", json={
            "revision":1,"evidence_url":"http://not-secure","summary":"Reviewed"
        })
        assert bad.status_code == 422
        approved = client.post(f"/v1/workspaces/{wid}/quotes/{q['id']}/approve", json={
            "revision":1,"evidence_url":"https://example.com/signed-approval",
            "summary":"Reviewed"
        })
        assert approved.status_code == 201, approved.text
        assert approved.json()["status"] == "approved"
        assert client.post(f"/v1/workspaces/{wid}/quotes/{q['id']}/approve", json={
            "revision":1,"evidence_url":"https://example.com/signed-approval",
            "summary":"Duplicate"
        }).status_code == 409
        assert client.patch(f"/v1/workspaces/{wid}/proposals/{q['id']}",json={
            "revision":2, "status":"draft", "document":{"newPrice":1}
        }).status_code == 409
        assert client.get(f"/v1/workspaces/{wid}/quotes?company_id={cid}").json()[0]["status"] == "approved"
    finally:
        cleanup(engine)
