"""Fail-closed OIDC JWT authentication. Workspace membership is stored server-side."""
import os
from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Membership, Company, CompanyMembership, Project, Task

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str


@lru_cache(maxsize=1)
def jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_jwk_set=True, lifespan=300)


def get_principal(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> Principal:
    issuer = os.getenv("JWT_ISSUER", "").rstrip("/")
    audience = os.getenv("JWT_AUDIENCE", "")
    jwks_url = os.getenv("JWT_JWKS_URL", "")
    if not issuer or not audience or not jwks_url or not jwks_url.startswith("https://"):
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bearer token required", headers={"WWW-Authenticate": "Bearer"})
    try:
        key = jwks_client(jwks_url).get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials, key.key,
            algorithms=["RS256", "ES256"], audience=audience, issuer=issuer,
            options={"require": ["sub", "exp", "iat", "iss", "aud"]},
        )
        subject = claims["sub"]
        if not isinstance(subject, str) or not subject.strip():
            raise ValueError("Invalid subject")
        return Principal(subject=subject)
    except (PyJWTError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"}) from exc


def authorize(db: Session, workspace_id: UUID, principal: Principal, *, write: bool = False, owner: bool = False) -> Membership:
    membership = db.get(Membership, (workspace_id, principal.subject))
    if membership is None:
        raise HTTPException(status_code=403, detail="No access to this workspace")
    if owner and membership.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    if write and membership.role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="Write access required")
    return membership


def authorize_company(
    db: Session, workspace_id: UUID, company_id: UUID, principal: Principal,
    *, write: bool = False,
) -> Company:
    """Workspace owner sees its companies; everyone else needs explicit company ACL."""
    membership = authorize(db, workspace_id, principal, write=write)
    company = db.scalar(
        select(Company).where(Company.id == company_id, Company.workspace_id == workspace_id)
    )
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found in workspace")
    if membership.role == "owner":
        return company
    grant = db.get(CompanyMembership, (company_id, principal.subject))
    if grant is None or (write and grant.role != "editor"):
        raise HTTPException(status_code=403, detail="No access to this company")
    return company


def authorize_project(
    db: Session, workspace_id: UUID, project_id: UUID, principal: Principal,
    *, write: bool = False,
) -> Project:
    project = db.scalar(
        select(Project).join(Company, Project.company_id == Company.id)
        .where(Project.id == project_id, Company.workspace_id == workspace_id)
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found in workspace")
    authorize_company(db, workspace_id, project.company_id, principal, write=write)
    return project


def authorize_task(
    db: Session, workspace_id: UUID, task_id: UUID, principal: Principal,
    *, write: bool = False,
) -> Task:
    task = db.scalar(
        select(Task).join(Project, Task.project_id == Project.id)
        .join(Company, Project.company_id == Company.id)
        .where(Task.id == task_id, Company.workspace_id == workspace_id)
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found in workspace")
    authorize_company(db, workspace_id, db.get(Project, task.project_id).company_id, principal, write=write)
    return task
