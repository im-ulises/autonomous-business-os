"""Typed, workspace/company-authorized software, CRM quote and review APIs.

All write operations create drafts. Evidence-backed approvals are explicit,
owner-gated and immutable. No Forge/Crobi authority is introduced here.
"""
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuditEvent, Client, Company, Project
from app.business_models import Department, Proposal
from app.operational_models import (
    DepartmentLesson, ProposalTemplate, ProposalLineItem, ProposalApprovalSnapshot,
    SoftwareProduct, SoftwarePhase, SoftwareMilestone, SoftwareAcceptance,
)
from app.security import Principal, authorize, authorize_company, get_principal

class StrictIn(BaseModel):
    model_config = ConfigDict(extra="forbid")


router = APIRouter(prefix="/v1/workspaces/{workspace_id}", tags=["Operational records"])


def rowdict(row):
    return {column.name: getattr(row, column.name) for column in row.__table__.columns}


def audit(db: Session, workspace_id: UUID, actor: Principal, verb: str, kind: str, entity_id: UUID):
    db.add(AuditEvent(
        workspace_id=workspace_id, actor_subject=actor.subject,
        action=verb, entity_type=kind, entity_id=entity_id, details={},
    ))


def validate_company_client(db: Session, company_id: UUID, client_id: UUID | None):
    if client_id is not None and db.scalar(
        select(Client.id).where(Client.id == client_id, Client.company_id == company_id)
    ) is None:
        raise HTTPException(status_code=422, detail="Client must belong to the specified company")


def verified_https(value: str):
    from urllib.parse import urlparse
    url = urlparse(value)
    if url.scheme != "https" or not url.netloc or url.username or url.password or url.fragment:
        raise HTTPException(status_code=422, detail="A valid HTTPS evidence URL is required")
    return value


class MilestoneIn(StrictIn):
    title: str = Field(min_length=1, max_length=200)
    deliverable: str = Field(default="", max_length=10000)
    due_date: date | None = None
    done: bool = False


class PhaseIn(StrictIn):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10000)
    status: Literal["pending","active","review","blocked","done"] = "pending"
    notes: str = Field(default="", max_length=10000)
    milestones: list[MilestoneIn] = Field(default_factory=list, max_length=200)
    window: str = Field(default="", max_length=3000)
    demo: str = Field(default="", max_length=3000)
    source_page: int | None = None
    acceptance_criteria: list[str] = Field(default_factory=list, max_length=100)


class SoftwareIn(StrictIn):
    company_id: UUID
    client_id: UUID | None = None
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=20000)
    owner: str = Field(default="", max_length=160)
    stack: str = Field(default="", max_length=2000)
    repo_url: str = Field(default="", max_length=2048)
    spec_url: str = Field(default="", max_length=2048)
    start_date: date | None = None
    target_date: date | None = None
    status: Literal["planning", "building", "at_risk", "paused", "delivered"] = "planning"
    next_action: str = Field(default="", max_length=10000)
    notes: str = Field(default="", max_length=10000)
    source_name: str = Field(default="", max_length=500)
    source_version: str = Field(default="", max_length=500)
    commercial_window: str = Field(default="", max_length=2000)
    phases: list[PhaseIn] = Field(default_factory=list, max_length=100)


class EvidenceIn(StrictIn):
    evidence_url: str = Field(min_length=8, max_length=2048)
    summary: str = Field(min_length=1, max_length=20000)


class SoftwareReviewIn(EvidenceIn):
    level: Literal["implemented", "staging", "accepted"]


class LessonIn(StrictIn):
    category: Literal["worked","failed","insight","decision"]
    title: str = Field(min_length=1, max_length=200)
    situation: str = Field(default="", max_length=20000)
    outcome: str = Field(default="", max_length=20000)
    learning: str = Field(default="", max_length=20000)
    evidence_url: str = Field(default="", max_length=2048)
    observed_at: datetime | None = None


class LessonReviewIn(StrictIn):
    status: Literal["approved", "rejected"]
    evidence_url: str = Field(default="", max_length=2048)


class TemplateIn(StrictIn):
    company_id: UUID
    name: str = Field(min_length=1, max_length=160)
    layout: Literal["editorial","classic"] = "editorial"
    use_brand_sheet: bool = True
    accent_hex: str = Field(default="", max_length=32)
    custom_logo_url: str = Field(default="", max_length=2048)
    seller_tagline: str = Field(default="", max_length=10000)
    seller_address: str = Field(default="", max_length=10000)
    seller_email: str = Field(default="", max_length=320)
    seller_phone: str = Field(default="", max_length=80)
    default_introduction: str = Field(default="", max_length=20000)
    default_scope: str = Field(default="", max_length=20000)
    default_deliverables: str = Field(default="", max_length=20000)
    default_timeline: str = Field(default="", max_length=20000)
    default_terms: str = Field(default="", max_length=20000)
    default_exclusions: str = Field(default="", max_length=20000)
    default_notes: str = Field(default="", max_length=20000)
    default_currency: Literal["MXN","USD"] = "MXN"
    default_tax_percent: Decimal = Field(default=Decimal("0"),ge=0,le=100)
    default_deposit_percent: Decimal = Field(default=Decimal("0"),ge=0,le=100)


class QuoteLineIn(StrictIn):
    description: str = Field(min_length=1, max_length=20000)
    details: str = Field(default="", max_length=20000)
    quantity: Decimal = Field(gt=0, max_digits=14, decimal_places=4)
    unit: str = Field(default="", max_length=80)
    unit_price: Decimal = Field(ge=0, max_digits=18, decimal_places=4)


class QuoteIn(StrictIn):
    company_id: UUID
    client_id: UUID | None = None
    template_id: UUID | None = None
    quote_number: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    client_name: str = Field(default="", max_length=200)
    client_contact: str = Field(default="", max_length=200)
    issue_date: date | None = None
    valid_until: date | None = None
    currency: Literal["MXN","USD"] = "MXN"
    introduction: str = Field(default="", max_length=20000)
    scope: str = Field(default="", max_length=20000)
    deliverables: str = Field(default="", max_length=20000)
    timeline: str = Field(default="", max_length=20000)
    terms: str = Field(default="", max_length=20000)
    exclusions: str = Field(default="", max_length=20000)
    notes: str = Field(default="", max_length=20000)
    tax_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    deposit_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    items: list[QuoteLineIn] = Field(min_length=1, max_length=100)


class ApproveQuoteIn(EvidenceIn):
    revision: int = Field(ge=1)


def software_company(db: Session, wid: UUID, software_id: UUID, actor: Principal, write=False):
    row = db.scalar(
        select(SoftwareProduct).join(Company, SoftwareProduct.company_id == Company.id)
        .where(SoftwareProduct.id == software_id, Company.workspace_id == wid)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Software product not found")
    authorize_company(db, wid, row.company_id, actor, write=write)
    return row


def software_record(db: Session, product: SoftwareProduct):
    data = rowdict(product)
    data["phases"] = []
    phases = db.scalars(
        select(SoftwarePhase).where(SoftwarePhase.software_id == product.id)
        .order_by(SoftwarePhase.phase_order,SoftwarePhase.id)
    ).all()
    for phase in phases:
        phase_data = rowdict(phase)
        milestones = db.scalars(
            select(SoftwareMilestone).where(SoftwareMilestone.phase_id == phase.id)
            .order_by(SoftwareMilestone.milestone_order,SoftwareMilestone.id)
        ).all()
        phase_data["milestones"] = []
        for milestone in milestones:
            item = rowdict(milestone)
            reviews = db.scalars(
                select(SoftwareAcceptance).where(SoftwareAcceptance.milestone_id == milestone.id)
                .order_by(SoftwareAcceptance.reviewed_at)
            ).all()
            item["reviews"] = [rowdict(review) for review in reviews]
            phase_data["milestones"].append(item)
        data["phases"].append(phase_data)
    return data


@router.get("/software-products")
def list_software(workspace_id: UUID, company_id: UUID, limit: int = 50,
                  db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize_company(db, workspace_id, company_id, actor)
    if not 1 <= limit <= 100:
        raise HTTPException(status_code=422, detail="Limit must be 1 to 100")
    products = db.scalars(
        select(SoftwareProduct).where(SoftwareProduct.company_id == company_id)
        .order_by(SoftwareProduct.created_at.desc()).limit(limit)
    ).all()
    return [software_record(db, row) for row in products]


@router.post("/software-products", status_code=201)
def create_software(workspace_id: UUID, data: SoftwareIn,
                    db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize_company(db, workspace_id, data.company_id, actor, write=True)
    validate_company_client(db, data.company_id, data.client_id)
    if sum(len(p.milestones) for p in data.phases) > 1500:
        raise HTTPException(status_code=422, detail="Too many milestones")
    product = SoftwareProduct(**data.model_dump(exclude={"phases"}))
    db.add(product); db.flush()
    for i, phase in enumerate(data.phases):
        row = SoftwarePhase(
            software_id=product.id, phase_order=i,
            **phase.model_dump(exclude={"milestones"}),
        )
        db.add(row); db.flush()
        for j, item in enumerate(phase.milestones):
            db.add(SoftwareMilestone(
                phase_id=row.id, milestone_order=j, **item.model_dump(),
            ))
    audit(db, workspace_id, actor, "create", "software_product", product.id)
    db.flush()
    response = software_record(db, product)  # RLS context expires on COMMIT.
    db.commit()
    return response


@router.post("/software-milestones/{milestone_id}/reviews", status_code=201)
def review_milestone(workspace_id: UUID, milestone_id: UUID, data: SoftwareReviewIn,
                     db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    item = db.scalar(
        select(SoftwareMilestone).join(SoftwarePhase,SoftwareMilestone.phase_id==SoftwarePhase.id)
        .join(SoftwareProduct,SoftwarePhase.software_id==SoftwareProduct.id)
        .join(Company,SoftwareProduct.company_id==Company.id)
        .where(SoftwareMilestone.id==milestone_id, Company.workspace_id==workspace_id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    phase = db.get(SoftwarePhase, item.phase_id)
    software_company(db, workspace_id, phase.software_id, actor, write=True)
    review = SoftwareAcceptance(
        milestone_id=milestone_id, level=data.level, summary=data.summary,
        evidence_url=verified_https(data.evidence_url),
        reviewer_subject=actor.subject,
    )
    db.add(review); db.flush()
    audit(db, workspace_id, actor, "review", "software_acceptance", review.id)
    db.commit()
    return rowdict(review)


def department_for(db: Session, workspace_id: UUID, did: UUID, actor: Principal, write=False):
    row = db.scalar(
        select(Department).join(Company,Department.company_id==Company.id)
        .where(Department.id==did, Company.workspace_id==workspace_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="Department not found")
    authorize_company(db, workspace_id, row.company_id, actor, write=write)
    return row


@router.get("/departments/{department_id}/lessons")
def list_lessons(workspace_id: UUID, department_id: UUID,
                 db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    department_for(db, workspace_id, department_id, actor)
    return [rowdict(x) for x in db.scalars(
        select(DepartmentLesson).where(DepartmentLesson.department_id==department_id)
        .order_by(DepartmentLesson.id).limit(100)
    ).all()]


@router.post("/departments/{department_id}/lessons", status_code=201)
def create_lesson(workspace_id: UUID, department_id: UUID, data: LessonIn,
                  db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    department_for(db, workspace_id, department_id, actor, write=True)
    lesson = DepartmentLesson(department_id=department_id, **data.model_dump(), status="draft")
    db.add(lesson); db.flush()
    audit(db, workspace_id, actor, "submit", "department_lesson", lesson.id)
    db.commit()
    return rowdict(lesson)


@router.post("/department-lessons/{lesson_id}/review")
def review_lesson(workspace_id: UUID, lesson_id: UUID, data: LessonReviewIn,
                  db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    lesson = db.scalar(
        select(DepartmentLesson).join(Department,DepartmentLesson.department_id==Department.id)
        .join(Company,Department.company_id==Company.id)
        .where(DepartmentLesson.id==lesson_id,Company.workspace_id==workspace_id)
        .with_for_update()
    )
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    department_for(db, workspace_id, lesson.department_id, actor, write=True)
    if lesson.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft lessons may be reviewed")
    if data.status == "approved":
        lesson.evidence_url = verified_https(data.evidence_url or lesson.evidence_url)
    lesson.status = data.status
    lesson.reviewed_by = actor.subject
    lesson.reviewed_at = datetime.now(timezone.utc)
    audit(db, workspace_id, actor, "review", "department_lesson", lesson.id)
    db.commit()
    return rowdict(lesson)


@router.get("/proposal-templates")
def list_templates(workspace_id: UUID, company_id: UUID,
                   db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize_company(db, workspace_id, company_id, actor)
    return [rowdict(x) for x in db.scalars(select(ProposalTemplate)
        .where(ProposalTemplate.company_id==company_id)
        .order_by(ProposalTemplate.created_at.desc()).limit(100)).all()]


@router.post("/proposal-templates", status_code=201)
def create_template(workspace_id: UUID, data: TemplateIn,
                    db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize_company(db, workspace_id, data.company_id, actor, write=True)
    tpl = ProposalTemplate(**data.model_dump())
    db.add(tpl); db.flush()
    audit(db, workspace_id, actor, "create", "proposal_template", tpl.id)
    db.commit()
    return rowdict(tpl)


def quote_data(db: Session, quote: Proposal):
    payload = rowdict(quote)
    items = db.scalars(select(ProposalLineItem)
        .where(ProposalLineItem.proposal_id==quote.id)
        .order_by(ProposalLineItem.item_order, ProposalLineItem.id)).all()
    payload["items"] = [rowdict(x) for x in items]
    subtotal = sum((x.quantity*x.unit_price for x in items), Decimal("0"))
    payload["subtotal"] = subtotal
    payload["tax_amount"] = (subtotal * quote.tax_percent) / Decimal("100")
    payload["total"] = subtotal + payload["tax_amount"]
    return payload


@router.get("/quotes")
def list_quotes(workspace_id: UUID, company_id: UUID, limit: int=50,
                db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize_company(db, workspace_id, company_id, actor)
    if not 1 <= limit <= 100:
        raise HTTPException(status_code=422, detail="Limit must be 1 to 100")
    return [quote_data(db, q) for q in db.scalars(
        select(Proposal).where(Proposal.company_id==company_id)
        .order_by(Proposal.updated_at.desc()).limit(limit)).all()]


@router.post("/quotes", status_code=201)
def create_quote(workspace_id: UUID, data: QuoteIn,
                 db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize_company(db, workspace_id, data.company_id, actor, write=True)
    validate_company_client(db, data.company_id, data.client_id)
    snapshot = {}
    if data.template_id is not None:
        tpl = db.scalar(select(ProposalTemplate).where(
            ProposalTemplate.id==data.template_id,
            ProposalTemplate.company_id==data.company_id,
        ))
        if tpl is None:
            raise HTTPException(status_code=422, detail="Template must belong to company")
        snapshot = {key:(str(value) if isinstance(value, Decimal) else value)
                    for key,value in rowdict(tpl).items()}
        snapshot["id"] = str(tpl.id)
        snapshot["company_id"] = str(tpl.company_id)
        snapshot["created_at"] = tpl.created_at.isoformat()
    quote = Proposal(
        **data.model_dump(exclude={"items"}),
        status="draft", document={}, template_snapshot=snapshot,
    )
    db.add(quote); db.flush()
    for index,item in enumerate(data.items):
        db.add(ProposalLineItem(proposal_id=quote.id,item_order=index,**item.model_dump()))
    db.flush()
    audit(db, workspace_id, actor, "draft", "quote", quote.id)
    db.flush()
    response = quote_data(db, quote)  # RLS context expires on COMMIT.
    db.commit()
    return response


@router.post("/quotes/{quote_id}/approve", status_code=201)
def approve_quote(workspace_id: UUID, quote_id: UUID, data: ApproveQuoteIn,
                  db: Session = Depends(get_db), actor: Principal = Depends(get_principal)):
    authorize(db, workspace_id, actor, owner=True)
    quote = db.scalar(
        select(Proposal).join(Company, Proposal.company_id==Company.id)
        .where(Proposal.id==quote_id, Company.workspace_id==workspace_id)
    )
    if quote is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    authorize_company(db, workspace_id, quote.company_id, actor, write=True)
    evidence_url = verified_https(data.evidence_url)
    payload = quote_data(db, quote)
    if len(payload["items"]) == 0:
        raise HTTPException(status_code=422, detail="Cannot approve quote without line items")
    result = db.execute(
        update(Proposal).where(
            Proposal.id==quote_id, Proposal.revision==data.revision,
            Proposal.status=="draft",
        ).values(status="approved",revision=data.revision+1)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="Quote version/status changed")
    def json_safe(value):
        if isinstance(value, (UUID, Decimal)):
            return str(value)
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        if isinstance(value, dict):
            return {k: json_safe(v) for k,v in value.items()}
        if isinstance(value, list):
            return [json_safe(x) for x in value]
        return value
    snapshot = json_safe({
        "quote_id":quote_id, "revision":data.revision,
        "evidence_url":evidence_url, "summary":data.summary,
        "quote":{k:v for k,v in payload.items() if k != "items"},
        "items":payload["items"],
    })
    approval = ProposalApprovalSnapshot(
        proposal_id=quote_id, revision=data.revision,
        approved_by=actor.subject,snapshot=snapshot,
    )
    db.add(approval); db.flush()
    audit(db, workspace_id, actor, "approve", "quote", quote_id)
    db.commit()
    return {"status":"approved","approval_id":approval.id,"revision":data.revision}
