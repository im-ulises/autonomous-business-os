"""Tenant-scoped database sessions in CPython or Python Workers/Hyperdrive."""
import os
from functools import lru_cache
from typing import Generator

from fastapi import Depends, HTTPException, Request
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.security import Principal, get_principal


def _setting(request: Request, name: str) -> str:
    env = request.scope.get("env")
    return str(getattr(env, name, "") or "").strip() if env is not None else os.getenv(name, "").strip()


@lru_cache(maxsize=1)
def session_factory() -> sessionmaker[Session]:
    """Native CPython fallback: local development or a persistent server."""
    url = os.getenv("DATABASE_URL", "").strip()
    login = os.getenv("DB_EXPECTED_LOGIN", "").strip()
    if not url or not login:
        raise RuntimeError("Dedicated database login not configured")
    if not (url.startswith("postgresql+psycopg://") or url.startswith("postgresql+pg8000://")):
        raise RuntimeError("Unsupported PostgreSQL driver")
    if login in ("postgres", "supabase_admin", "service_role"):
        raise RuntimeError("Elevated database login is forbidden")
    kwargs = {"sslmode": "require", "prepare_threshold": None} if "+psycopg://" in url else {}
    engine = create_engine(url, pool_pre_ping=True, pool_size=5,
                           max_overflow=5, connect_args=kwargs)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _factory(request: Request):
    env = request.scope.get("env")
    login = _setting(request, "DB_EXPECTED_LOGIN")
    if not login or login in ("postgres", "supabase_admin", "service_role"):
        raise HTTPException(status_code=503, detail="Dedicated database login unavailable")
    if env is None:
        try:
            return session_factory(), None, login
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail="Database not configured") from exc

    hd = getattr(env, "HYPERDRIVE", None)
    if hd is None:
        raise HTTPException(status_code=503, detail="Hyperdrive is not configured")
    try:
        if str(hd.user) != login:
            raise ValueError("Hyperdrive credential is not the restricted API login")
        url = URL.create(
            "postgresql+pg8000", username=str(hd.user), password=str(hd.password),
            host=str(hd.host), port=int(hd.port), database=str(hd.database),
        )
        # Hyperdrive pools upstream; never pool connections inside an isolate.
        # Plain socket connects to Cloudflare-internal Hyperdrive; configure
        # Hyperdrive itself to require TLS to Supabase's actual PostgreSQL host.
        engine = create_engine(url, poolclass=NullPool, pool_pre_ping=False,
                               connect_args={"ssl_context": False})
        return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False), engine, login
    except (TypeError, ValueError, AttributeError) as exc:
        raise HTTPException(status_code=503, detail="Hyperdrive binding invalid") from exc


def _prepare(db: Session, login: str):
    if db.scalar(text("SELECT session_user")) != login:
        raise HTTPException(status_code=503, detail="Database login mismatch")
    db.execute(text("SET LOCAL ROLE autonomous_os_api"))


def get_db(request: Request, actor: Principal = Depends(get_principal)) -> Generator[Session, None, None]:
    factory, engine, login = _factory(request)
    try:
        with factory() as db:
            try:
                _prepare(db, login)
                db.execute(text("SELECT set_config('app.subject', :subject, true)"),
                           {"subject": actor.subject})
                yield db
            finally:
                db.rollback()
    finally:
        if engine is not None:
            engine.dispose()


def get_health_db(request: Request) -> Generator[Session, None, None]:
    factory, engine, login = _factory(request)
    try:
        with factory() as db:
            try:
                _prepare(db, login)
                yield db
            finally:
                db.rollback()
    finally:
        if engine is not None:
            engine.dispose()
