"""Workspace-scoped business modules. All actions are audited; no agent execution."""
import json
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import urlparse
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuditEvent, Client, Company, Project
from app.business_models import BrandSheet, Department, Deliverable, Document, Proposal, SoftwareRoadmap
from app.security import Principal, authorize, authorize_company, authorize_project, get_principal

router = APIRouter(prefix="/v1/workspaces/{workspace_id}", tags=["Business modules"])


class DomainIn(BaseModel):
    company_id: UUID
    name: str = Field(min_length=1, max_length=160)
    data: dict[str, Any] = Field(default_factory=dict)


class DomainPatch(BaseModel):
    revision: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    data: dict[str, Any] | None = None


class BrandIn(DomainIn):
    client_id: UUID | None = None


class DocumentIn(BaseModel):
    company_id: UUID
    project_id: UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    markdown: str = Field(default="", max_length=250_000)


class DocumentPatch(BaseModel):
    revision: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    markdown: str | None = Field(default=None, max_length=250_000)


class ProposalIn(BaseModel):
    company_id: UUID
    client_id: UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    currency: Literal["MXN", "USD"] = "MXN"
    document: dict[str, Any] = Field(default_factory=dict)


class ProposalPatch(BaseModel):
    revision: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    document: dict[str, Any] | None = None
    status: Literal["draft", "review", "approved"] | None = None


class DeliverableIn(BaseModel):
    project_id: UUID
    title: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=2000)


class DeliverableStatus(BaseModel):
    status: Literal["submitted", "review", "approved", "rejected"]


class RoadmapIn(BaseModel):
    project_id: UUID
    roadmap: dict[str, Any] = Field(default_factory=dict)
    revision: int | None = Field(default=None, ge=1)


def view(obj):
    return {column.name: getattr(obj, column.name) for column in obj.__table__.columns}


def bounded_json(data):
    if len(json.dumps(data, ensure_ascii=False).encode("utf-8")) > 128_000:
        raise HTTPException(status_code=422, detail="Structured content exceeds 128 KB")
    return data


def ensure_company(db: Session, wid: UUID, cid: UUID, actor: Principal, *, write: bool = False):
    return authorize_company(db, wid, cid, actor, write=write)


def ensure_project(db: Session, wid: UUID, pid: UUID, actor: Principal, *, write: bool = False):
    return authorize_project(db, wid, pid, actor, write=write)


def ensure_client(db: Session, company_id: UUID, client_id: UUID | None):
    if client_id is not None and db.scalar(
        select(Client.id).where(Client.id == client_id, Client.company_id == company_id)
    ) is None:
        raise HTTPException(status_code=422, detail="Client must belong to same company")


def owned(db: Session, wid: UUID, model, entity_id: UUID, actor: Principal, *, write: bool = False):
    row = db.scalar(
        select(model).join(Company, model.company_id == Company.id)
        .where(model.id == entity_id, Company.workspace_id == wid)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Record not found in workspace")
    authorize_company(db, wid, row.company_id, actor, write=write)
    return row

def audit(db: Session, wid: UUID, actor: Principal, action: str, kind: str, entity_id: UUID):
    db.add(AuditEvent(
        workspace_id=wid, actor_subject=actor.subject, action=action,
        entity_type=kind, entity_id=entity_id, details={},
    ))


def bump(db: Session, row, revision: int):
    """Atomic compare-and-set; prevents concurrent writers from overwriting one revision."""
    cls = type(row)
    pk = cls.id if hasattr(cls, "id") else cls.project_id
    pk_value = row.id if hasattr(row, "id") else row.project_id
    result = db.execute(
        update(cls)
        .where(pk == pk_value, cls.revision == revision)
        .values(revision=revision + 1, updated_at=datetime.now(timezone.utc))
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="Revision conflict: refresh before editing")
    db.refresh(row)


def prevent_approval_forgery(data: dict[str, Any]):
    """Opaque domain payloads are untrusted. No approval authority inside JSON."""
    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                lower = key.lower()
                if lower in ("status", "level", "verification_level") and (
                    isinstance(value, str) and value.lower() in ("approved", "accepted")
                ):
                    raise HTTPException(status_code=422, detail="Approval/acceptance requires a separate authorized review")
                if lower in ("approved", "is_approved", "accepted") and value is True:
                    raise HTTPException(status_code=422, detail="Approval flags are not writable domain content")
                if lower in ("reviewedby", "reviewed_by", "reviewedat", "reviewed_at") and value:
                    raise HTTPException(status_code=422, detail="Review attestation is server-managed")
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)
    walk(data)
    return bounded_json(data)

@router.get("/departments")
def departments(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    ensure_company(db, workspace_id, company_id, actor)
    return [view(x) for x in db.scalars(select(Department).where(Department.company_id == company_id)).all()]


@router.post("/departments", status_code=201)
def create_department(workspace_id: UUID, data: DomainIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    ensure_company(db, workspace_id, data.company_id, actor, write=True)
    row = Department(company_id=data.company_id, name=data.name, context=prevent_approval_forgery(data.data))
    db.add(row); db.flush()
    audit(db, workspace_id, actor, "create", "department", row.id)
    db.commit(); return view(row)


@router.patch("/departments/{entity_id}")
def update_department(workspace_id: UUID, entity_id: UUID, data: DomainPatch, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    row = owned(db, workspace_id, Department, entity_id, actor, write=True)
    bump(db, row, data.revision)
    if data.name is not None: row.name = data.name
    if data.data is not None: row.context = prevent_approval_forgery(data.data)
    audit(db, workspace_id, actor, "update", "department", row.id)
    db.commit(); return view(row)


@router.get("/brand-sheets")
def brand_sheets(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    ensure_company(db, workspace_id, company_id, actor)
    return [view(x) for x in db.scalars(select(BrandSheet).where(BrandSheet.company_id == company_id)).all()]


@router.post("/brand-sheets", status_code=201)
def create_brand_sheet(workspace_id: UUID, data: BrandIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    ensure_company(db, workspace_id, data.company_id, actor, write=True)
    ensure_client(db, data.company_id, data.client_id)
    row = BrandSheet(company_id=data.company_id, client_id=data.client_id, title=data.name, guide=bounded_json(data.data))
    db.add(row); db.flush()
    audit(db, workspace_id, actor, "create", "brand_sheet", row.id)
    db.commit(); return view(row)


@router.patch("/brand-sheets/{entity_id}")
def update_brand_sheet(workspace_id: UUID, entity_id: UUID, data: DomainPatch, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    row = owned(db, workspace_id, BrandSheet, entity_id, actor, write=True)
    bump(db, row, data.revision)
    if data.name is not None: row.title = data.name
    if data.data is not None: row.guide = bounded_json(data.data)
    audit(db, workspace_id, actor, "update", "brand_sheet", row.id)
    db.commit(); return view(row)


@router.get("/proposals")
def proposals(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    ensure_company(db, workspace_id, company_id, actor)
    return [view(x) for x in db.scalars(select(Proposal).where(Proposal.company_id == company_id)).all()]


@router.post("/proposals", status_code=201)
def create_proposal(workspace_id: UUID, data: ProposalIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    ensure_company(db, workspace_id, data.company_id, actor, write=True)
    ensure_client(db, data.company_id, data.client_id)
    row = Proposal(**data.model_dump(exclude={"document"}), document=bounded_json(data.document), status="draft")
    db.add(row); db.flush()
    audit(db, workspace_id, actor, "create", "proposal", row.id)
    db.commit(); return view(row)


@router.patch("/proposals/{entity_id}")
def update_proposal(workspace_id: UUID, entity_id: UUID, data: ProposalPatch, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    row = owned(db, workspace_id, Proposal, entity_id, actor, write=True)
    if data.status == "approved" or row.status == "approved":
        authorize(db, workspace_id, actor, owner=True)
    if row.status == "approved":
        raise HTTPException(status_code=409, detail="Approved proposal is immutable: create a new revision")
    bump(db, row, data.revision)
    if data.title is not None: row.title = data.title
    if data.document is not None: row.document = bounded_json(data.document)
    if data.status is not None: row.status = data.status
    audit(db, workspace_id, actor, "update", "proposal", row.id)
    db.commit(); return view(row)


@router.get("/documents")
def documents(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    ensure_company(db, workspace_id, company_id, actor)
    return [view(x) for x in db.scalars(select(Document).where(Document.company_id == company_id)).all()]


@router.post("/documents", status_code=201)
def create_document(workspace_id: UUID, data: DocumentIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    ensure_company(db, workspace_id, data.company_id, actor, write=True)
    if data.project_id is not None and ensure_project(db, workspace_id, data.project_id, actor, write=True).company_id != data.company_id:
        raise HTTPException(status_code=422, detail="Project must belong to document company")
    row = Document(**data.model_dump())
    db.add(row); db.flush()
    audit(db, workspace_id, actor, "create", "document", row.id)
    db.commit(); return view(row)


@router.patch("/documents/{entity_id}")
def update_document(workspace_id: UUID, entity_id: UUID, data: DocumentPatch, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    row = owned(db, workspace_id, Document, entity_id, actor, write=True)
    bump(db, row, data.revision)
    if data.title is not None: row.title = data.title
    if data.markdown is not None: row.markdown = data.markdown
    audit(db, workspace_id, actor, "update", "document", row.id)
    db.commit(); return view(row)


@router.get("/deliverables")
def deliverables(workspace_id: UUID, project_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    ensure_project(db, workspace_id, project_id, actor)
    return [view(x) for x in db.scalars(select(Deliverable).where(Deliverable.project_id == project_id)).all()]


@router.post("/deliverables", status_code=201)
def create_deliverable(workspace_id: UUID, data: DeliverableIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    ensure_project(db, workspace_id, data.project_id, actor, write=True)
    parsed = urlparse(data.url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise HTTPException(status_code=422, detail="Deliverable must use a public or permissioned HTTPS URL")
    row = Deliverable(**data.model_dump(), submitted_by=actor.subject, status="submitted")
    db.add(row); db.flush()
    audit(db, workspace_id, actor, "submit", "deliverable", row.id)
    db.commit(); return view(row)


@router.patch("/deliverables/{entity_id}")
def review_deliverable(workspace_id: UUID, entity_id: UUID, data: DeliverableStatus, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True, owner=data.status in ("approved", "rejected"))
    row = db.scalar(
        select(Deliverable).join(Project, Deliverable.project_id == Project.id)
        .join(Company, Project.company_id == Company.id)
        .where(Deliverable.id == entity_id, Company.workspace_id == workspace_id)
    )
    if row is None: raise HTTPException(status_code=404, detail="Deliverable not found in workspace")
    project = authorize_project(db, workspace_id, row.project_id, actor, write=True)
    if row.status in ("approved", "rejected"):
        raise HTTPException(status_code=409, detail="Final review is immutable; submit a new deliverable")
    if data.status in ("approved", "rejected"):
        authorize(db, workspace_id, actor, owner=True)
    row.status = data.status
    audit(db, workspace_id, actor, "review", "deliverable", row.id)
    db.commit(); return view(row)


@router.get("/software-roadmaps/{project_id}")
def roadmap(workspace_id: UUID, project_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    ensure_project(db, workspace_id, project_id, actor)
    row = db.get(SoftwareRoadmap, project_id)
    return view(row) if row else None


@router.put("/software-roadmaps/{project_id}")
def save_roadmap(workspace_id: UUID, project_id: UUID, data: RoadmapIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    ensure_project(db, workspace_id, project_id, actor, write=True)
    if data.project_id != project_id:
        raise HTTPException(status_code=422, detail="Project ID mismatch")
    row = db.get(SoftwareRoadmap, project_id)
    if row:
        if data.revision is None: raise HTTPException(status_code=409, detail="Revision required for update")
        bump(db, row, data.revision)
        row.roadmap = prevent_approval_forgery(data.roadmap)
    else:
        if data.revision is not None: raise HTTPException(status_code=409, detail="Roadmap does not exist")
        row = SoftwareRoadmap(project_id=project_id, roadmap=prevent_approval_forgery(data.roadmap))
        db.add(row)
    db.flush()
    audit(db, workspace_id, actor, "save", "software_roadmap", project_id)
    db.commit(); return view(row)
