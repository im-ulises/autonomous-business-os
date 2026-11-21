"""Autonomous Business OS HTTP API. No agent can self-declare completed work."""
import os
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db import get_db, get_health_db
from app.models import AuditEvent, Client, Company, CompanyMembership, Membership, Mission, Project, Task, Workspace
from app.schemas import (
    AuditOut, ClientIn, ClientOut, CompanyIn, CompanyOut, MissionIn, MissionOut,
    ProjectIn, ProjectOut, ProjectPatch, TaskIn, TaskOut, TaskPatch, WorkspaceOut, CompanyGrantIn, CompanyGrantOut,
)
from app.security import Principal, authorize, authorize_company, authorize_project, authorize_task, get_principal

app = FastAPI(title="Autonomous Business OS API", version="0.1.1",
    docs_url="/docs" if os.getenv("APP_ENV") == "development" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if os.getenv("APP_ENV") == "development" else None)

origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "").split(",") if item.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware, allow_origins=origins, allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"],
    )


@app.get("/healthz")
def healthz():
    return {"status": "up", "service": "autonomous-os-api"}


@app.get("/readyz", include_in_schema=False)
def readyz(db: Session = Depends(get_health_db)):
    try:
        tables = db.scalar(text("""
            SELECT count(*) FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname='public'
              AND c.relname IN ('evo_workspaces','evo_software_roadmaps','evo_company_memberships')
              AND c.relrowsecurity AND c.relforcerowsecurity
        """))
        if tables != 3:
            raise RuntimeError("Required migrations or FORCE RLS missing")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database schema or RLS is not ready") from exc
    return {"status": "ready"}


def audit(db: Session, workspace_id: UUID, principal: Principal, action: str, entity_type: str, entity_id: UUID):
    db.add(AuditEvent(
        workspace_id=workspace_id, actor_subject=principal.subject,
        action=action, entity_type=entity_type, entity_id=entity_id, details={},
    ))


def company_for(db: Session, workspace_id: UUID, company_id: UUID, actor: Principal, *, write: bool = False) -> Company:
    return authorize_company(db, workspace_id, company_id, actor, write=write)


def project_for(db: Session, workspace_id: UUID, project_id: UUID, actor: Principal, *, write: bool = False) -> Project:
    return authorize_project(db, workspace_id, project_id, actor, write=write)


def task_for(db: Session, workspace_id: UUID, task_id: UUID, actor: Principal, *, write: bool = False) -> Task:
    return authorize_task(db, workspace_id, task_id, actor, write=write)


def client_for_company(db: Session, company_id: UUID, client_id: UUID) -> Client:
    client = db.scalar(select(Client).where(Client.id == client_id, Client.company_id == company_id))
    if client is None:
        raise HTTPException(status_code=422, detail="Client must belong to the project's company")
    return client


@app.get("/v1/workspaces", response_model=list[WorkspaceOut])
def workspaces(db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    rows = db.execute(
        select(Workspace, Membership.role).join(Membership, Workspace.id == Membership.workspace_id)
        .where(Membership.subject == actor.subject).order_by(Workspace.name)
    ).all()
    return [WorkspaceOut(id=ws.id, name=ws.name, role=role) for ws, role in rows]


@app.get("/v1/workspaces/{workspace_id}/companies", response_model=list[CompanyOut])
def companies(workspace_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    member = authorize(db, workspace_id, actor)
    query = select(Company).where(Company.workspace_id == workspace_id)
    if member.role != "owner":
        query = query.join(CompanyMembership, CompanyMembership.company_id == Company.id).where(
            CompanyMembership.subject == actor.subject
        )
    return db.scalars(query.order_by(Company.name)).all()


@app.post("/v1/workspaces/{workspace_id}/companies", response_model=CompanyOut, status_code=201)
def create_company(workspace_id: UUID, payload: CompanyIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    company = Company(workspace_id=workspace_id, **payload.model_dump())
    db.add(company)
    db.flush()
    audit(db, workspace_id, actor, "create", "company", company.id)
    db.commit()
    return company


@app.get("/v1/workspaces/{workspace_id}/clients", response_model=list[ClientOut])
def clients(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    company_for(db, workspace_id, company_id, actor)
    return db.scalars(select(Client).where(Client.company_id == company_id).order_by(Client.name)).all()


@app.post("/v1/workspaces/{workspace_id}/clients", response_model=ClientOut, status_code=201)
def create_client(workspace_id: UUID, payload: ClientIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    company_for(db, workspace_id, payload.company_id, actor, write=True)
    client = Client(**payload.model_dump())
    db.add(client)
    db.flush()
    audit(db, workspace_id, actor, "create", "client", client.id)
    db.commit()
    return client


@app.get("/v1/workspaces/{workspace_id}/projects", response_model=list[ProjectOut])
def projects(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    company_for(db, workspace_id, company_id, actor)
    return db.scalars(select(Project).where(Project.company_id == company_id).order_by(Project.created_at.desc())).all()


@app.post("/v1/workspaces/{workspace_id}/projects", response_model=ProjectOut, status_code=201)
def create_project(workspace_id: UUID, payload: ProjectIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    company_for(db, workspace_id, payload.company_id, actor, write=True)
    if payload.client_id:
        client_for_company(db, payload.company_id, payload.client_id)
    project = Project(**payload.model_dump())
    db.add(project)
    db.flush()
    audit(db, workspace_id, actor, "create", "project", project.id)
    db.commit()
    return project


@app.patch("/v1/workspaces/{workspace_id}/projects/{project_id}", response_model=ProjectOut)
def edit_project(workspace_id: UUID, project_id: UUID, payload: ProjectPatch, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    project = project_for(db, workspace_id, project_id, actor, write=True)
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("client_id"):
        client_for_company(db, project.company_id, changes["client_id"])
    for key, value in changes.items():
        if key not in ("due_date", "client_id") and value is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
        setattr(project, key, value)
    audit(db, workspace_id, actor, "update", "project", project.id)
    db.commit()
    return project


@app.get("/v1/workspaces/{workspace_id}/tasks", response_model=list[TaskOut])
def tasks(workspace_id: UUID, project_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    project_for(db, workspace_id, project_id, actor)
    return db.scalars(select(Task).where(Task.project_id == project_id).order_by(Task.created_at)).all()


@app.post("/v1/workspaces/{workspace_id}/tasks", response_model=TaskOut, status_code=201)
def create_task(workspace_id: UUID, payload: TaskIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    project_for(db, workspace_id, payload.project_id, actor, write=True)
    task = Task(**payload.model_dump())
    db.add(task)
    db.flush()
    audit(db, workspace_id, actor, "create", "task", task.id)
    db.commit()
    return task


@app.patch("/v1/workspaces/{workspace_id}/tasks/{task_id}", response_model=TaskOut)
def edit_task(workspace_id: UUID, task_id: UUID, payload: TaskPatch, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    task = task_for(db, workspace_id, task_id, actor, write=True)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in ("title", "status") and value is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
        setattr(task, key, value)
    audit(db, workspace_id, actor, "update", "task", task.id)
    db.commit()
    return task


@app.get("/v1/workspaces/{workspace_id}/missions", response_model=list[MissionOut])
def missions(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor)
    company_for(db, workspace_id, company_id, actor)
    return db.scalars(select(Mission).where(Mission.company_id == company_id).order_by(Mission.created_at.desc())).all()


@app.post("/v1/workspaces/{workspace_id}/missions", response_model=MissionOut, status_code=201)
def prepare_mission(workspace_id: UUID, payload: MissionIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, write=True)
    company_for(db, workspace_id, payload.company_id, actor, write=True)
    if payload.project_id:
        project = project_for(db, workspace_id, payload.project_id, actor, write=True)
        if project.company_id != payload.company_id:
            raise HTTPException(status_code=422, detail="Project and mission must belong to same company")
    mission = Mission(**payload.model_dump(), status="draft")
    db.add(mission)
    db.flush()
    audit(db, workspace_id, actor, "prepare", "mission", mission.id)
    db.commit()
    return mission


@app.get("/v1/workspaces/{workspace_id}/audit-events", response_model=list[AuditOut])
def audit_events(workspace_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    return db.scalars(
        select(AuditEvent).where(AuditEvent.workspace_id == workspace_id)
        .order_by(AuditEvent.occurred_at.desc()).limit(100)
    ).all()


@app.get("/v1/workspaces/{workspace_id}/company-memberships", response_model=list[CompanyGrantOut])
def company_grants(workspace_id: UUID, company_id: UUID, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    authorize_company(db, workspace_id, company_id, actor)
    return db.scalars(select(CompanyMembership).where(CompanyMembership.company_id == company_id)).all()


@app.post("/v1/workspaces/{workspace_id}/company-memberships", response_model=CompanyGrantOut, status_code=201)
def grant_company(workspace_id: UUID, payload: CompanyGrantIn, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    authorize_company(db, workspace_id, payload.company_id, actor)
    if db.get(Membership, (workspace_id, payload.subject)) is None:
        raise HTTPException(status_code=422, detail="Subject must first belong to this workspace")
    if db.get(CompanyMembership, (payload.company_id, payload.subject)) is not None:
        raise HTTPException(status_code=409, detail="Company membership already exists")
    grant = CompanyMembership(**payload.model_dump())
    db.add(grant); db.flush()
    audit(db, workspace_id, actor, "grant", "company_membership", payload.company_id)
    db.commit()
    return grant


@app.delete("/v1/workspaces/{workspace_id}/company-memberships", status_code=204)
def revoke_company(workspace_id: UUID, company_id: UUID, subject: str, db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    authorize_company(db, workspace_id, company_id, actor)
    grant = db.get(CompanyMembership, (company_id, subject))
    if grant is None:
        raise HTTPException(status_code=404, detail="Company membership not found")
    db.delete(grant)
    audit(db, workspace_id, actor, "revoke", "company_membership", company_id)
    db.commit()
    return None


# Business modules are kept outside the core CRUD service for independent evolution.
from app.business_api import router as business_router
app.include_router(business_router)
