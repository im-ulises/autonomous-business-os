"""Typed operational entities; approval/evidence are separate from JSON content."""
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


def now():
    return datetime.now(timezone.utc)


class ProjectDetail(Base):
    __tablename__ = "evo_project_details"
    project_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_projects.id", ondelete="CASCADE"), primary_key=True)
    brief: Mapped[str] = mapped_column(Text, default="", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class SoftwareProduct(Base):
    __tablename__ = "evo_software_products"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_companies.id", ondelete="CASCADE"), index=True, nullable=False)
    client_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("evo_clients.id", ondelete="SET NULL"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    owner: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    stack: Mapped[str] = mapped_column(Text, default="", nullable=False)
    repo_url: Mapped[str] = mapped_column(String(2048), default="", nullable=False)
    spec_url: Mapped[str] = mapped_column(String(2048), default="", nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    target_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="planning", nullable=False)
    next_action: Mapped[str] = mapped_column(Text, default="", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_name: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_version: Mapped[str] = mapped_column(Text, default="", nullable=False)
    commercial_window: Mapped[str] = mapped_column(Text, default="", nullable=False)
    repository_review: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class SoftwarePhase(Base):
    __tablename__ = "evo_software_phases"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    software_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_software_products.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    phase_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    window: Mapped[str] = mapped_column("phase_window", Text, default="", nullable=False)
    demo: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_page: Mapped[int | None] = mapped_column(Integer)
    acceptance_criteria: Mapped[list] = mapped_column(JSON, default=list, nullable=False)


class SoftwareMilestone(Base):
    __tablename__ = "evo_software_milestones"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    phase_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_software_phases.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    deliverable: Mapped[str] = mapped_column(Text, default="", nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    milestone_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class SoftwareAcceptance(Base):
    __tablename__ = "evo_software_acceptances"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    milestone_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_software_milestones.id", ondelete="CASCADE"), index=True, nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    reviewer_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)


class DepartmentLesson(Base):
    __tablename__ = "evo_department_lessons"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    department_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_departments.id", ondelete="CASCADE"), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    situation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    outcome: Mapped[str] = mapped_column(Text, default="", nullable=False)
    learning: Mapped[str] = mapped_column(Text, default="", nullable=False)
    evidence_url: Mapped[str] = mapped_column(String(2048), default="", nullable=False)
    observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    reviewed_by: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProposalTemplate(Base):
    __tablename__ = "evo_proposal_templates"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_companies.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    layout: Mapped[str] = mapped_column(String(20), default="editorial", nullable=False)
    use_brand_sheet: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    accent_hex: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    custom_logo_url: Mapped[str] = mapped_column(String(2048), default="", nullable=False)
    seller_tagline: Mapped[str] = mapped_column(Text, default="", nullable=False)
    seller_address: Mapped[str] = mapped_column(Text, default="", nullable=False)
    seller_email: Mapped[str] = mapped_column(String(320), default="", nullable=False)
    seller_phone: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    default_introduction: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_scope: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_deliverables: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_timeline: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_terms: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_exclusions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_currency: Mapped[str] = mapped_column(String(3), default="MXN", nullable=False)
    default_tax_percent: Mapped[Decimal] = mapped_column(Numeric(7,3), default=0, nullable=False)
    default_deposit_percent: Mapped[Decimal] = mapped_column(Numeric(7,3), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)


class ProposalLineItem(Base):
    __tablename__ = "evo_proposal_line_items"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    proposal_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_proposals.id", ondelete="CASCADE"), index=True, nullable=False)
    item_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[str] = mapped_column(Text, default="", nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14,4), nullable=False)
    unit: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18,4), nullable=False)


class ProposalApprovalSnapshot(Base):
    __tablename__ = "evo_proposal_approval_snapshots"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    proposal_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_proposals.id", ondelete="RESTRICT"), index=True, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    approved_by: Mapped[str] = mapped_column(String(255), nullable=False)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)


class LegacyImportId(Base):
    __tablename__ = "evo_legacy_import_ids"
    workspace_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_workspaces.id", ondelete="CASCADE"), primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(80), primary_key=True)
    legacy_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    entity_uuid: Mapped[UUID] = mapped_column(Uuid, nullable=False)
