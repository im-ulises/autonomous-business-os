"""Versioned API contracts; UI demo shapes are not assumed to be production records."""
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Stage = Literal["idea", "planning", "active", "waiting", "completed"]
Priority = Literal["low", "normal", "high", "critical"]
TaskStatus = Literal["todo", "doing", "blocked", "done"]
Executor = Literal["unassigned", "forge", "crobi_marketing", "human"]


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class WorkspaceOut(Out):
    id: UUID
    name: str
    role: str


class CompanyIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=10000)
    short: str = Field(default="", max_length=40)
    accent: str = Field(default="", max_length=32)


class CompanyOut(Out):
    id: UUID
    workspace_id: UUID
    name: str
    description: str
    short: str
    accent: str
    created_at: datetime


class ClientIn(BaseModel):
    company_id: UUID
    name: str = Field(min_length=1, max_length=160)
    notes: str = Field(default="", max_length=10000)
    description: str = Field(default="", max_length=50000)
    industry: str = Field(default="", max_length=160)
    brand_color: str = Field(default="", max_length=32)
    website: str = Field(default="", max_length=2048)
    contact_name: str = Field(default="", max_length=160)
    contact_email: str = Field(default="", max_length=320)
    contact_phone: str = Field(default="", max_length=80)


class ClientOut(Out):
    id: UUID
    company_id: UUID
    name: str
    notes: str
    description: str
    industry: str
    brand_color: str
    website: str
    contact_name: str
    contact_email: str
    contact_phone: str
    created_at: datetime


class ProjectIn(BaseModel):
    company_id: UUID
    client_id: UUID | None = None
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=50000)
    stage: Stage = "planning"
    priority: Priority = "normal"
    due_date: date | None = None


class ProjectPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=50000)
    stage: Stage | None = None
    priority: Priority | None = None
    due_date: date | None = None
    client_id: UUID | None = None


class ProjectOut(Out):
    id: UUID
    company_id: UUID
    client_id: UUID | None
    name: str
    description: str
    stage: Stage
    priority: Priority
    due_date: date | None
    created_at: datetime
    updated_at: datetime


class TaskIn(BaseModel):
    project_id: UUID
    title: str = Field(min_length=1, max_length=240)
    due_date: date | None = None


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    status: TaskStatus | None = None
    due_date: date | None = None


class TaskOut(Out):
    id: UUID
    project_id: UUID
    title: str
    status: TaskStatus
    due_date: date | None
    created_at: datetime
    updated_at: datetime


class MissionIn(BaseModel):
    company_id: UUID
    project_id: UUID | None = None
    title: str = Field(min_length=1, max_length=240)
    outcome: str = Field(min_length=1, max_length=50000)
    executor_hint: Executor = "unassigned"
    assignee: Literal["claude","codex","grok","unassigned"] = "unassigned"
    planning_state: Literal["local_draft","planned"] = "local_draft"


class MissionOut(Out):
    id: UUID
    company_id: UUID
    project_id: UUID | None
    title: str
    outcome: str
    executor_hint: Executor
    assignee: Literal["claude","codex","grok","unassigned"]
    planning_state: Literal["local_draft","planned"]
    status: Literal["draft", "approved", "submitted", "running", "succeeded", "failed"]
    external_run_id: str | None
    created_at: datetime


class AuditOut(Out):
    id: UUID
    workspace_id: UUID
    actor_subject: str
    action: str
    entity_type: str
    entity_id: UUID
    details: dict
    occurred_at: datetime


class CompanyGrantIn(BaseModel):
    company_id: UUID
    subject: str = Field(min_length=1, max_length=255)
    role: Literal["editor", "viewer"]


class CompanyGrantOut(Out):
    company_id: UUID
    subject: str
    role: Literal["editor", "viewer"]


class WorkspaceMemberIn(BaseModel):
    # Supabase Auth user UUID after real login/verification, never an email guess.
    subject: UUID
    role: Literal["editor", "viewer"] = "editor"


class WorkspaceMemberOut(Out):
    workspace_id: UUID
    subject: str
    role: Literal["owner", "editor", "viewer"]


class ProjectGrantIn(BaseModel):
    subject: UUID
    role: Literal["editor", "viewer"] = "editor"


class ProjectGrantOut(Out):
    project_id: UUID
    subject: str
    role: Literal["editor", "viewer"]
    granted_by: str
    created_at: datetime
