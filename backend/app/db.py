"""Centralized PostgreSQL session handling; does not initialize schema on boot."""
import os
from functools import lru_cache
from typing import Generator

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


@lru_cache(maxsize=1)
def session_factory() -> sessionmaker[Session]:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not configured")
    if not url.startswith("postgresql+psycopg://"):
        raise RuntimeError("DATABASE_URL must use postgresql+psycopg://")
    engine = create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    try:
        factory = session_factory()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database is not configured")
    with factory() as db:
        yield db
