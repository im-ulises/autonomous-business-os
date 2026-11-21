"""Business extensions for the mature frontend. No agent execution authority."""
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


def now():
    return datetime.now(timezone.utc)


class Department(Base):
    __tablename__ = "evo_departments"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_companies.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    context: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class BrandSheet(Base):
    __tablename__ = "evo_brand_sheets"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_companies.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("evo_clients.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    guide: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class Proposal(Base):
    __tablename__ = "evo_proposals"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_companies.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("evo_clients.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="MXN", nullable=False)
    document: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    template_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("evo_proposal_templates.id", ondelete="SET NULL"))
    quote_number: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    client_name: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    client_contact: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    issue_date: Mapped[date | None] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    introduction: Mapped[str] = mapped_column(Text, default="", nullable=False)
    scope: Mapped[str] = mapped_column(Text, default="", nullable=False)
    deliverables: Mapped[str] = mapped_column(Text, default="", nullable=False)
    timeline: Mapped[str] = mapped_column(Text, default="", nullable=False)
    terms: Mapped[str] = mapped_column(Text, default="", nullable=False)
    exclusions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(7,3), default=0, nullable=False)
    deposit_percent: Mapped[Decimal] = mapped_column(Numeric(7,3), default=0, nullable=False)
    template_snapshot: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class Document(Base):
    __tablename__ = "evo_documents"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_companies.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("evo_projects.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    markdown: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class Deliverable(Base):
    __tablename__ = "evo_deliverables"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_projects.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="submitted", nullable=False)
    submitted_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)


class SoftwareRoadmap(Base):
    __tablename__ = "evo_software_roadmaps"
    project_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("evo_projects.id", ondelete="CASCADE"), primary_key=True)
    roadmap: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)
