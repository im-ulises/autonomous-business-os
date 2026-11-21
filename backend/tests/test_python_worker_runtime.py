"""Native emulation of Worker bindings. No real credentials or customer data."""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app import db, security
from app.main import app


def as_request(env):
    return Request({"type":"http", "method":"GET", "path":"/v1/workspaces",
                    "headers":[], "query_string":b"", "scheme":"https",
                    "env":env})


def test_worker_secret_bindings_drive_asymmetric_jwt_verification(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    issuer = "https://synthetic.supabase.co/auth/v1"
    env = SimpleNamespace(JWT_ISSUER=issuer, JWT_AUDIENCE="authenticated",
                          JWT_JWKS_URL=issuer + "/.well-known/jwks.json")
    now = datetime.now(timezone.utc)
    token = jwt.encode({
        "iss":issuer, "aud":"authenticated", "iat":now, "exp":now+timedelta(minutes=5),
        "sub":"synthetic-account", "role":"authenticated"
    }, key, algorithm="RS256", headers={"kid":"test-key"})
    called = []
    async def test_key(raw, url):
        called.append(url)
        return key.public_key()
    monkeypatch.setattr(security, "_worker_signing_key", test_key)
    result = asyncio.run(security.get_principal(
        as_request(env),
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
    ))
    assert result.subject == "synthetic-account"
    assert called == [env.JWT_JWKS_URL]
    with pytest.raises(HTTPException) as exc:
        asyncio.run(security.get_principal(
            as_request(env),
            HTTPAuthorizationCredentials(scheme="Bearer", credentials=token + "corrupted"),
        ))
    assert exc.value.status_code == 401


def test_worker_db_requires_configured_restricted_identity(monkeypatch):
    invalid = SimpleNamespace(DB_EXPECTED_LOGIN="postgres", HYPERDRIVE=None)
    with pytest.raises(HTTPException) as exc:
        db._factory(as_request(invalid))
    assert exc.value.status_code == 503
    no_binding = SimpleNamespace(DB_EXPECTED_LOGIN="autonomous_os_login")
    with pytest.raises(HTTPException) as exc:
        db._factory(as_request(no_binding))
    assert exc.value.status_code == 503

    captured = {}
    def fake_engine(url, **kwargs):
        captured.update({"url":url, "opts":kwargs})
        return SimpleNamespace()
    monkeypatch.setattr(db, "create_engine", fake_engine)
    hd = SimpleNamespace(user="autonomous_os_login", password="dummy-test-only",
                         host="hyperdrive.internal",port=5432,database="postgres")
    env = SimpleNamespace(DB_EXPECTED_LOGIN="autonomous_os_login", HYPERDRIVE=hd)
    factory, engine, login = db._factory(as_request(env))
    assert login == "autonomous_os_login"
    assert captured["url"].drivername == "postgresql+pg8000"
    assert captured["url"].host == "hyperdrive.internal"
    assert captured["opts"]["connect_args"]["ssl_context"] is False
    assert "NullPool" in str(captured["opts"]["poolclass"])


def test_worker_cors_is_explicit_and_credentials_are_not_enabled():
    env = SimpleNamespace(CORS_ORIGINS="https://staging.example.com")
    class BoundApp:
        async def __call__(self, scope, receive, send):
            scope["env"] = env
            await app(scope, receive, send)
    with TestClient(BoundApp()) as client:
        allowed = client.options("/v1/workspaces", headers={
            "Origin":"https://staging.example.com",
            "Access-Control-Request-Method":"PUT",
        })
        assert allowed.status_code == 204
        assert allowed.headers["access-control-allow-origin"] == "https://staging.example.com"
        assert "access-control-allow-credentials" not in allowed.headers
        blocked = client.options("/v1/workspaces", headers={
            "Origin":"https://untrusted.example",
            "Access-Control-Request-Method":"POST",
        })
        assert blocked.status_code == 403
        health = client.get("/healthz")
        assert health.status_code == 200
        assert health.json()["status"] == "up"
