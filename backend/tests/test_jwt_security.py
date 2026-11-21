"""Real RSA JWT verification tests (not overriding auth dependencies)."""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials

import app.security as security


ISSUER = "https://example.supabase.co/auth/v1"
AUDIENCE = "authenticated"


def create_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def jwt_identity(monkeypatch):
    private_key = create_key()
    class MockJWKS:
        def get_signing_key_from_jwt(self, token):
            return SimpleNamespace(key=private_key.public_key())
    monkeypatch.setenv("JWT_ISSUER", ISSUER)
    monkeypatch.setenv("JWT_AUDIENCE", AUDIENCE)
    monkeypatch.setenv("JWT_JWKS_URL", ISSUER + "/.well-known/jwks.json")
    monkeypatch.setattr(security, "jwks_client", lambda url: MockJWKS())
    def sign(**updates):
        now = datetime.now(timezone.utc)
        payload = {
            "iss":ISSUER, "aud":AUDIENCE,
            "iat":now, "exp":now+timedelta(minutes=5),
            "sub":"synthetic-owner","role":"authenticated",
        }
        payload.update(updates)
        return jwt.encode(payload, private_key, algorithm="RS256")
    return sign


def request_with_env(env=None):
    scope = {"type":"http", "method":"GET", "path":"/",
             "headers":[], "query_string":b"", "scheme":"https"}
    if env is not None:
        scope["env"] = env
    return Request(scope)


def principal_for(token):
    return asyncio.run(security.get_principal(
        request_with_env(), HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
    ))


def test_valid_rsa_user_token_is_accepted(jwt_identity):
    p = principal_for(jwt_identity())
    assert p.subject == "synthetic-owner"


def test_missing_token_fails_with_401(jwt_identity):
    with pytest.raises(HTTPException) as exc:
        asyncio.run(security.get_principal(request_with_env(), None))
    assert exc.value.status_code == 401


@pytest.mark.parametrize("payload", [
    {"aud":"wrong"},
    {"iss":"https://untrusted.example"},
    {"exp":datetime(2020,1,1,tzinfo=timezone.utc)},
    {"sub":""},
    {"role":"service_role"},
    {"role":"anon"},
])
def test_incorrect_claims_are_rejected(jwt_identity, payload):
    with pytest.raises(HTTPException) as exc:
        principal_for(jwt_identity(**payload))
    assert exc.value.status_code == 401


def test_forged_signature_is_rejected(jwt_identity):
    now = datetime.now(timezone.utc)
    attacker = create_key()
    forged = jwt.encode({
        "sub":"synthetic-owner","aud":AUDIENCE,"iss":ISSUER,
        "iat":now,"exp":now+timedelta(minutes=5),"role":"authenticated",
    }, attacker, algorithm="RS256")
    with pytest.raises(HTTPException) as exc:
        principal_for(forged)
    assert exc.value.status_code == 401
