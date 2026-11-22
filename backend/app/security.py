"""Fail-closed OIDC JWT authentication. Workspace membership is stored server-side."""
import os
import json
import time
from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWTError, PyJWKSet
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import Membership, Company, CompanyMembership, Project, ProjectMembership, Task

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str


@lru_cache(maxsize=1)
def jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_jwk_set=True, lifespan=300)


# Public JWKS cache scoped to the Worker isolate. Signatures are checked on
# every request; only keys may be cached briefly for 300 seconds.
_worker_jwks_cache: dict[str, tuple[float, PyJWKSet]] = {}


async def _worker_signing_key(token: str, url: str):
    header = jwt.get_unverified_header(token)
    if header.get("alg") not in ("RS256", "ES256"):
        raise ValueError("Unsupported JWT algorithm")
    kid = header.get("kid")
    if not isinstance(kid, str) or not kid:
        raise ValueError("JWT key ID missing")

    def lookup(keys: PyJWKSet):
        for item in keys.keys:
            if item.key_id == kid and item.algorithm_name == header["alg"]:
                return item.key
        return None

    cached = _worker_jwks_cache.get(url)
    if cached and cached[0] > time.monotonic():
        found = lookup(cached[1])
        if found is not None:
            return found

    # Workers' supported network primitive is JS fetch; urllib is unsuitable
    # for network calls inside Pyodide.
    from js import fetch
    response = await fetch(url)
    if not response.ok:
        raise ValueError("JWKS unavailable")
    raw = json.loads(str(await response.text()))
    jwks = PyJWKSet.from_dict(raw)
    key = lookup(jwks)
    if key is None:
        raise ValueError("No matching JWKS public key")
    _worker_jwks_cache[url] = (time.monotonic() + 300, jwks)
    return key


async def get_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Principal:
    env = request.scope.get("env")

    def config(name: str):
        return str(getattr(env, name, "") or "") if env is not None else os.getenv(name, "")

    issuer = config("JWT_ISSUER").rstrip("/")
    audience = config("JWT_AUDIENCE")
    jwks_url = config("JWT_JWKS_URL")
    if not issuer or not audience or not jwks_url.startswith("https://"):
        raise HTTPException(status_code=503, detail="Authentication not configured")
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bearer token required",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        if env is not None:
            key = await _worker_signing_key(credentials.credentials, jwks_url)
        else:
            key = jwks_client(jwks_url).get_signing_key_from_jwt(credentials.credentials).key
        claims = jwt.decode(
            credentials.credentials, key, algorithms=["RS256", "ES256"],
            audience=audience, issuer=issuer,
            options={"require": ["sub", "exp", "iat", "iss", "aud"]},
        )
        subject = claims["sub"]
        if not isinstance(subject, str) or not subject.strip():
            raise ValueError("Invalid subject")
        if claims.get("role") != "authenticated":
            raise ValueError("Only authenticated end-user tokens accepted")
        return Principal(subject=subject)
    except (PyJWTError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"}) from exc


def authorize(db: Session, workspace_id: UUID, principal: Principal, *, write: bool = False, owner: bool = False) -> Membership:
    membership = db.get(Membership, (workspace_id, principal.subject))
    if membership is None:
        raise HTTPException(status_code=403, detail="No access to this workspace")
    if owner and membership.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    if write and membership.role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="Write access required")
    # This setting is derived from a validated JWT and verified membership,
    # never directly from an untrusted URL parameter.
    if db.get_bind().dialect.name == "postgresql":
        db.execute(
            text("SELECT set_config('app.authorized_workspace', :wid, true)"),
            {"wid": str(workspace_id)},
        )
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
    """Project guests may work without being granted the whole company."""
    member = authorize(db, workspace_id, principal, write=write)
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found in workspace")

    # In production, FORCE RLS verifies company.workspace and project membership
    # before Project can be selected. SQLite tests need this explicit equivalent.
    if db.get_bind().dialect.name != "postgresql":
        company = db.get(Company, project.company_id)
        if company is None or company.workspace_id != workspace_id:
            raise HTTPException(status_code=404, detail="Project not found in workspace")

    if member.role == "owner":
        return project
    company_grant = db.get(CompanyMembership, (project.company_id, principal.subject))
    project_grant = db.get(ProjectMembership, (project.id, principal.subject))
    if not (
        (company_grant is not None and (not write or company_grant.role == "editor"))
        or (project_grant is not None and (not write or project_grant.role == "editor"))
    ):
        raise HTTPException(status_code=403, detail="No access to this project")
    return project


def authorize_task(
    db: Session, workspace_id: UUID, task_id: UUID, principal: Principal,
    *, write: bool = False,
) -> Task:
    authorize(db, workspace_id, principal, write=write)
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found in workspace")
    authorize_project(db, workspace_id, task.project_id, principal, write=write)
    return task
