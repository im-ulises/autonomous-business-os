"""Lossless, strictly typed contract for the existing Next.js local Store.

This module validates and previews demo snapshots. It DOES NOT persist quotes,
grant approvals, or migrate customer data into the authoritative database.
Schema mirrors lib/types.ts; preserve original ID strings before mapping.
"""
from __future__ import annotations

from typing import Literal
from uuid import UUID, NAMESPACE_URL, uuid5

from pydantic import BaseModel, ConfigDict, Field


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Company(Strict):
    id: str
    name: str
    short: str
    description: str
    accent: str
    demo: bool | None = None


class Project(Strict):
    id: str
    companyId: str
    name: str
    description: str
    stage: Literal["idea", "planning", "active", "waiting", "completed"]
    createdAt: str
    demo: bool | None = None


class Mission(Strict):
    id: str
    companyId: str
    projectId: str | None = None
    title: str
    outcome: str
    assignee: Literal["claude", "codex", "grok", "unassigned"]
    status: Literal["local_draft", "planned"]
    createdAt: str
    demo: bool | None = None


class LocalDoc(Strict):
    id: str
    companyId: str
    name: str
    content: str
    createdAt: str


class BrandColor(Strict):
    id: str
    name: str
    role: Literal["primary", "secondary", "accent", "neutral", "background"]
    hex: str
    pantone: str
    cmyk: str
    approved: bool


class BrandLogo(Strict):
    id: str
    name: str
    variant: Literal["primary", "horizontal", "vertical", "monochrome", "inverse", "icon", "other"]
    background: Literal["light", "dark", "any"]
    usage: str
    url: str
    dataUrl: str | None = None
    fileName: str | None = None
    approved: bool


class BrandGuide(Strict):
    colors: list[BrandColor]
    logos: list[BrandLogo]
    primaryFont: str
    secondaryFont: str
    toneOfVoice: str
    dos: str
    donts: str
    notes: str
    guidelineUrl: str
    reviewedBy: str
    reviewedAt: str | None = None


class Client(Strict):
    id: str
    companyId: str
    name: str
    description: str
    industry: str
    brandColor: str
    website: str
    contactName: str
    contactEmail: str
    contactPhone: str
    demo: bool | None = None
    brandGuide: BrandGuide | None = None


class ProjectTask(Strict):
    id: str
    title: str
    done: bool


class ProjectDetails(Strict):
    priority: Literal["low", "normal", "high", "critical"] | None = None
    stageOverride: Literal["idea", "planning", "active", "waiting", "completed"] | None = None
    clientId: str | None = None
    dueDate: str | None = None
    brief: str | None = None
    notes: str | None = None
    tasks: list[ProjectTask] | None = None
    updatedAt: str | None = None


class SoftwareVerification(Strict):
    level: Literal["accepted", "staging", "implemented", "pending"]
    summary: str
    url: str | None = None


class SoftwareMilestone(Strict):
    id: str
    title: str
    deliverable: str
    dueDate: str
    done: bool
    verification: SoftwareVerification | None = None


class SoftwarePhase(Strict):
    id: str
    title: str
    description: str
    status: Literal["pending", "active", "review", "blocked", "done"]
    milestones: list[SoftwareMilestone]
    notes: str
    window: str | None = None
    demo: str | None = None
    sourcePage: int | None = None
    acceptanceCriteria: list[str] | None = None


class RepositoryReview(Strict):
    version: str
    reviewedAt: str
    repositoryBranch: str
    repositoryCommit: str
    stagingUrl: str
    apiDeployment: str
    webDeployment: str
    summary: str
    blockers: list[str]
    findings: list[str]


class SoftwareProject(Strict):
    id: str
    companyId: str
    name: str
    description: str
    clientId: str
    owner: str
    stack: str
    repoUrl: str
    specUrl: str
    startDate: str
    targetDate: str
    status: Literal["planning", "building", "at_risk", "paused", "delivered"]
    phases: list[SoftwarePhase]
    nextAction: str
    notes: str
    createdAt: str
    updatedAt: str
    sourceName: str | None = None
    sourceVersion: str | None = None
    commercialWindow: str | None = None
    repositoryReview: RepositoryReview | None = None


class DepartmentObjective(Strict):
    id: str
    text: str
    priority: Literal["high", "medium", "low"]
    status: Literal["active", "paused", "achieved"]


class DepartmentKpi(Strict):
    id: str
    name: str
    target: str
    unit: str
    cadence: str
    measurementSource: str


class DepartmentLesson(Strict):
    id: str
    category: Literal["worked", "failed", "insight", "decision"]
    title: str
    situation: str
    outcome: str
    learning: str
    evidenceUrl: str
    observedAt: str
    status: Literal["draft", "approved", "rejected"]
    reviewedBy: str


class DepartmentContext(Strict):
    id: str
    companyId: str
    name: str
    purpose: str
    agentRole: str
    mission: str
    successCriteria: str
    toneOfVoice: str
    workMode: str
    operatingProcedure: str
    constraints: str
    escalationRules: str
    expectedInputs: str
    expectedOutputs: str
    objectives: list[DepartmentObjective]
    kpis: list[DepartmentKpi]
    lessons: list[DepartmentLesson]
    revision: int
    updatedAt: str


class ProposalTemplate(Strict):
    id: str
    companyId: str
    name: str
    layout: Literal["editorial", "classic"]
    useBrandSheet: bool
    accentHex: str
    customLogoUrl: str
    sellerTagline: str
    sellerAddress: str
    sellerEmail: str
    sellerPhone: str
    defaultIntroduction: str
    defaultScope: str
    defaultDeliverables: str
    defaultTimeline: str
    defaultTerms: str
    defaultExclusions: str
    defaultNotes: str
    defaultCurrency: Literal["MXN", "USD"]
    defaultTaxPercent: float
    defaultDepositPercent: float
    createdAt: str


class ProposalLineItem(Strict):
    id: str
    description: str
    details: str
    quantity: float
    unit: str
    unitPrice: float


class ProposalDocument(Strict):
    id: str
    companyId: str
    templateId: str
    number: str
    title: str
    status: Literal["draft", "sent", "approved", "declined"]
    clientId: str
    clientName: str
    clientContact: str
    issueDate: str
    validUntil: str
    currency: Literal["MXN", "USD"]
    introduction: str
    scope: str
    deliverables: str
    timeline: str
    terms: str
    exclusions: str
    notes: str
    taxPercent: float
    depositPercent: float
    items: list[ProposalLineItem]
    templateSnapshot: ProposalTemplate
    createdAt: str
    updatedAt: str


class Store(Strict):
    companies: list[Company]
    projects: list[Project]
    missions: list[Mission]
    localDocs: list[LocalDoc]
    clients: list[Client]
    projectDetails: dict[str, ProjectDetails]
    companyBrandGuides: dict[str, BrandGuide]
    softwareProjects: list[SoftwareProject]
    departmentContexts: list[DepartmentContext]
    proposalTemplates: list[ProposalTemplate]
    proposals: list[ProposalDocument]


def legacy_uuid(workspace_id: UUID, kind: str, legacy_id: str) -> UUID:
    """Deterministic per-workspace mapping for non-UUID localStorage IDs."""
    return uuid5(NAMESPACE_URL, f"autonomous-os:{workspace_id}:{kind}:{legacy_id}")


def assess_import(store: Store) -> dict:
    """Read-only preview: detect broken links and embedded assets before import."""
    companies = {c.id for c in store.companies}
    projects = {p.id: p for p in store.projects}
    clients = {c.id: c for c in store.clients}
    templates = {t.id: t for t in store.proposalTemplates}
    warnings = []
    for kind, items in [
        ("project", store.projects), ("mission", store.missions),
        ("client", store.clients), ("document", store.localDocs),
        ("software_project", store.softwareProjects),
        ("department", store.departmentContexts),
        ("proposal_template", store.proposalTemplates), ("proposal", store.proposals),
    ]:
        for item in items:
            if item.companyId not in companies:
                warnings.append(f"{kind} {item.id}: missing company {item.companyId}")
    for key in store.projectDetails:
        if key not in projects:
            warnings.append(f"projectDetails {key}: missing project")
    for c in store.clients:
        if c.brandGuide:
            for logo in c.brandGuide.logos:
                if logo.dataUrl:
                    warnings.append(f"client {c.id}: logo {logo.id} needs object-storage upload")
    for company_id, guide in store.companyBrandGuides.items():
        if company_id not in companies:
            warnings.append(f"companyBrandGuides: missing company {company_id}")
        for logo in guide.logos:
            if logo.dataUrl:
                warnings.append(f"company {company_id}: logo {logo.id} needs object-storage upload")
    for p in store.projects:
        details = store.projectDetails.get(p.id)
        if details and details.clientId:
            client = clients.get(details.clientId)
            if client is None or client.companyId != p.companyId:
                warnings.append(f"project {p.id}: invalid client link {details.clientId}")
    for m in store.missions:
        if m.projectId:
            project = projects.get(m.projectId)
            if project is None or project.companyId != m.companyId:
                warnings.append(f"mission {m.id}: invalid project link")
    for software in store.softwareProjects:
        if software.clientId and (
            software.clientId not in clients or
            clients[software.clientId].companyId != software.companyId
        ):
            warnings.append(f"software project {software.id}: invalid client link")
    for quote in store.proposals:
        template = templates.get(quote.templateId)
        if template is None or template.companyId != quote.companyId:
            warnings.append(f"proposal {quote.id}: invalid template link")
        if quote.clientId and (
            quote.clientId not in clients or clients[quote.clientId].companyId != quote.companyId
        ):
            warnings.append(f"proposal {quote.id}: invalid client link")
    # Approval flags are historical/demo assertions and are NEVER imported
    # as authoritative agent verification or financial approval.
    for department in store.departmentContexts:
        for lesson in department.lessons:
            if lesson.status == "approved":
                warnings.append(f"department {department.id}: lesson {lesson.id} needs new approval")
    for software in store.softwareProjects:
        for phase in software.phases:
            for milestone in phase.milestones:
                if milestone.verification and milestone.verification.level == "accepted":
                    warnings.append(f"software project {software.id}: milestone {milestone.id} needs new acceptance")
    return {
        "safe_to_import": len(warnings) == 0,
        "warnings": warnings,
        "counts": {
            name: len(getattr(store, name)) for name in Store.model_fields if
            isinstance(getattr(store, name), (list, dict))
        },
        "note": "This is validation only. No records or approvals were written.",
    }
