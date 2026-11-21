"""PostgreSQL sessions: always use the non-owner API role and trusted actor context."""
import os
from functools import lru_cache
from typing import Generator

from fastapi import Depends, HTTPException, Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.security import Principal, get_principal


@lru_cache(maxsize=1)
def session_factory() -> sessionmaker[Session]:
    url = os.getenv("DATABASE_URL", "").strip()
    login = os.getenv("DB_EXPECTED_LOGIN", "").strip()
    if not url or not login:
        raise RuntimeError("Database URL or dedicated login is not configured")
    if not url.startswith("postgresql+psycopg://"):
        raise RuntimeError("DATABASE_URL must use postgresql+psycopg://")
    if login in ("postgres", "supabase_admin", "service_role"):
        raise RuntimeError("An elevated PostgreSQL login is not allowed for FastAPI")
    engine = create_engine(
        url, pool_pre_ping=True, pool_size=5, max_overflow=5,
        connect_args={
            "sslmode": "require",
            # Compatible with Supabase transaction pooler if it is used.
            "prepare_threshold": None,
        },
    )
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _factory():
    try:
        return session_factory()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Dedicated database login is not configured") from exc


def get_db(request: Request, actor: Principal = Depends(get_principal)) -> Generator[Session, None, None]:
    """JWT subject is applied per transaction; authorization sets workspace after membership lookup."""
    with _factory()() as db:
        try:
            login = db.scalar(text("SELECT session_user"))
            if login != os.environ["DB_EXPECTED_LOGIN"]:
                raise HTTPException(status_code=503, detail="Unexpected database login")
            db.execute(text("SET LOCAL ROLE autonomous_os_api"))
            db.execute(text("SELECT set_config('app.subject', :subject, true)"), {"subject": actor.subject})
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Database access role unavailable") from exc
        yield db


def get_health_db() -> Generator[Session, None, None]:
    """Health checks inspect schema metadata, never customer rows or privileged data."""
    with _factory()() as db:
        try:
            login = db.scalar(text("SELECT session_user"))
            if login != os.environ["DB_EXPECTED_LOGIN"]:
                raise HTTPException(status_code=503, detail="Unexpected database login")
            db.execute(text("SET LOCAL ROLE autonomous_os_api"))
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Database access role unavailable") from exc
        yield db
