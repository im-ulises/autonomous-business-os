"""The checked-in TypeScript Store and Python contract must remain lossless."""
import re
from pathlib import Path
from uuid import UUID

from pydantic import ValidationError
import pytest

import app.frontend_contract as contract


TS_TYPES = Path(__file__).resolve().parents[2] / "lib" / "types.ts"


def ts_fields(source: str, name: str) -> set[str]:
    start = re.search(r"export type " + re.escape(name) + r" = \{", source)
    assert start, f"Missing TypeScript type: {name}"
    depth = 1
    p = start.end()
    lines = []
    while p < len(source) and depth:
        startline = p
        endline = source.find("\n", p)
        if endline < 0:
            endline = len(source)
        line = source[startline:endline]
        if depth == 1:
            fields = re.match(r"\s*([A-Za-z]\w*)\??\s*:", line)
            if fields:
                lines.append(fields.group(1))
        # Braces inside source strings are not expected in this project's types.
        depth += line.count("{") - line.count("}")
        p = endline + 1
    assert depth == 0, f"Unclosed TS type {name}"
    return set(lines)


def test_contract_field_names_match_the_frontend_types():
    typescript = TS_TYPES.read_text()
    names = [
        "Company", "Project", "Mission", "LocalDoc", "Store", "Client",
        "ProjectTask", "ProjectDetails", "BrandColor", "BrandLogo", "BrandGuide",
        "SoftwareMilestone", "SoftwarePhase", "SoftwareProject",
        "DepartmentObjective", "DepartmentKpi", "DepartmentLesson",
        "DepartmentContext", "ProposalTemplate", "ProposalLineItem",
        "ProposalDocument",
    ]
    for name in names:
        actual = set(getattr(contract, name).model_fields)
        expected = ts_fields(typescript, name)
        assert actual == expected, (
            f"{name}: missing={sorted(expected-actual)}, extra={sorted(actual-expected)}"
        )


def sample_store():
    guide = {
        "colors": [{"id":"c","name":"Black","role":"primary","hex":"#000000",
                    "pantone":"","cmyk":"","approved":False}],
        "logos": [{"id":"logo","name":"Logo","variant":"primary","background":"any",
                    "usage":"web","url":"","dataUrl":"data:image/png;base64,YQ==",
                    "fileName":"logo.png","approved":False}],
        "primaryFont":"IBM Plex Sans","secondaryFont":"IBM Plex Mono",
        "toneOfVoice":"Precise","dos":"","donts":"","notes":"","guidelineUrl":"",
        "reviewedBy":"",
    }
    template = {
        "id":"tpl","companyId":"evo","name":"Default","layout":"editorial",
        "useBrandSheet":True,"accentHex":"#000000","customLogoUrl":"",
        "sellerTagline":"","sellerAddress":"","sellerEmail":"","sellerPhone":"",
        "defaultIntroduction":"","defaultScope":"","defaultDeliverables":"",
        "defaultTimeline":"","defaultTerms":"","defaultExclusions":"","defaultNotes":"",
        "defaultCurrency":"MXN","defaultTaxPercent":16,"defaultDepositPercent":40,
        "createdAt":"2026-11-20",
    }
    return {
        "companies":[{"id":"evo","name":"EVO Studios","short":"EVO","description":"",
                      "accent":"#000000","demo":False}],
        "projects":[{"id":"p","companyId":"evo","name":"Big Media","description":"",
                     "stage":"active","createdAt":"2026-11-20","demo":False}],
        "missions":[{"id":"m","companyId":"evo","projectId":"p","title":"Commercial",
                     "outcome":"Approved storyboard","assignee":"claude",
                     "status":"local_draft","createdAt":"2026-11-20"}],
        "localDocs":[{"id":"d","companyId":"evo","name":"Brief",
                      "content":"A brief","createdAt":"2026-11-20"}],
        "clients":[{"id":"b","companyId":"evo","name":"Big Media","description":"",
                    "industry":"Advertising","brandColor":"#000000","website":"",
                    "contactName":"Test Name","contactEmail":"test@example.com",
                    "contactPhone":"","brandGuide":guide}],
        "projectDetails":{"p":{"priority":"high","stageOverride":"active",
                       "clientId":"b","dueDate":"2026-12-01","brief":"Brief",
                       "notes":"Notes","tasks":[{"id":"t","title":"Storyboard","done":False}],
                       "updatedAt":"2026-11-20"}},
        "companyBrandGuides":{"evo":guide},
        "softwareProjects":[{
            "id":"sp","companyId":"evo","name":"Crobi","description":"",
            "clientId":"b","owner":"Owner","stack":"Python","repoUrl":"https://example.com",
            "specUrl":"","startDate":"2026-11-20","targetDate":"2027-01-01",
            "status":"building","phases":[{"id":"ph","title":"Build","description":"",
             "status":"active","milestones":[{"id":"ms","title":"Implement",
             "deliverable":"PR","dueDate":"2026-12-10","done":False,
             "verification":{"level":"pending","summary":""}}],
             "notes":"","acceptanceCriteria":["Tests pass"]}],
            "nextAction":"Tests","notes":"","createdAt":"2026-11-20",
            "updatedAt":"2026-11-20",
        }],
        "departmentContexts":[{
            "id":"dept","companyId":"evo","name":"Marketing","purpose":"Campaigns",
            "agentRole":"Designer","mission":"","successCriteria":"",
            "toneOfVoice":"","workMode":"","operatingProcedure":"",
            "constraints":"","escalationRules":"","expectedInputs":"",
            "expectedOutputs":"","objectives":[{"id":"obj","text":"Campaign",
                     "priority":"high","status":"active"}],
            "kpis":[{"id":"kpi","name":"Revenue","target":"100","unit":"USD",
                     "cadence":"Monthly","measurementSource":"CRM"}],
            "lessons":[{"id":"lesson","category":"worked","title":"Insight",
                "situation":"","outcome":"","learning":"",
                "evidenceUrl":"","observedAt":"2026-11-20",
                "status":"approved","reviewedBy":"Local Demo"}],
            "revision":1,"updatedAt":"2026-11-20",
        }],
        "proposalTemplates":[template],
        "proposals":[{
            "id":"quote","companyId":"evo","templateId":"tpl","number":"Q-001",
            "title":"Campaign","status":"draft","clientId":"b",
            "clientName":"Big Media","clientContact":"Test Name",
            "issueDate":"2026-11-20","validUntil":"2026-12-10",
            "currency":"MXN","introduction":"","scope":"Campaign",
            "deliverables":"Video","timeline":"1 week","terms":"",
            "exclusions":"","notes":"","taxPercent":16,"depositPercent":40,
            "items":[{"id":"item","description":"Video","details":"",
                      "quantity":1,"unit":"unit","unitPrice":50000}],
            "templateSnapshot":template,
            "createdAt":"2026-11-20","updatedAt":"2026-11-20",
        }],
    }


def test_store_roundtrip_does_not_drop_fields_or_change_ids():
    raw = sample_store()
    model = contract.Store.model_validate(raw)
    assert model.model_dump(exclude_unset=True) == raw
    assert contract.legacy_uuid(UUID("00000000-0000-0000-0000-000000000001"), "project", "p") == \
           contract.legacy_uuid(UUID("00000000-0000-0000-0000-000000000001"), "project", "p")
    assert contract.legacy_uuid(UUID("00000000-0000-0000-0000-000000000001"), "project", "p") != \
           contract.legacy_uuid(UUID("00000000-0000-0000-0000-000000000002"), "project", "p")


def test_legacy_approval_and_embedded_assets_are_not_silently_trusted():
    raw = sample_store()
    review = contract.assess_import(contract.Store.model_validate(raw))
    assert review["safe_to_import"] is False
    assert any("new approval" in warning for warning in review["warnings"])
    assert any("object-storage upload" in warning for warning in review["warnings"])


def test_invalid_client_links_and_unknown_fields_block_or_warn():
    raw = sample_store()
    raw["projects"][0]["unexpected"] = "not silently discarded"
    with pytest.raises(ValidationError):
        contract.Store.model_validate(raw)
    del raw["projects"][0]["unexpected"]
    raw["softwareProjects"][0]["clientId"] = "other-company-client"
    review = contract.assess_import(contract.Store.model_validate(raw))
    assert any("invalid client link" in warning for warning in review["warnings"])
