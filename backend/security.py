"""Token verification, authentication and email authorization for FastAPI backend."""
import os, json, time, urllib.request
from functools import lru_cache
from typing import Dict, Any
from jose import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# OIDC settings for token validation
ISSUER = "https://accounts.google.com"  # if tokens issued directly by Google
AUDIENCE = "https://airecruitingagent.pythonanywhere.com"  # your API audience / client_id as configured
JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ALGORITHMS = ["RS256"]
security = HTTPBearer(auto_error=True)


@lru_cache(maxsize=1)
def _jwks() -> Dict[str, Any]:
    """Fetch JWKS keys from the OIDC provider."""
    with urllib.request.urlopen(JWKS_URL, timeout=5) as r:
        return json.loads(r.read().decode("utf-8"))


def _key_for(kid: str) -> Dict[str, Any]:
    """Get the public key for a given key id (kid)."""
    for k in _jwks().get("keys", []):
        if k.get("kid") == kid:
            return k
    raise HTTPException(status_code=401, detail="Invalid token key id")


def verify_token(creds: HTTPAuthorizationCredentials = Security(security)):
    """Verify JWT token from Authorization header."""
    token = creds.credentials
    try:
        headers = jwt.get_unverified_header(token)
        key = _key_for(headers["kid"])
        claims = jwt.decode(
            token,
            key,
            algorithms=ALGORITHMS,
            audience=AUDIENCE,
            issuer=ISSUER,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if claims.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired")
    return claims


def _parse_list(env_name: str) -> set[str]:
    raw = os.getenv(env_name, "")
    return {x.strip().lower() for x in raw.split(",") if x.strip()}


# Authorized email and domains
ALLOWED_EMAILS = _parse_list("ALLOWED_EMAILS")        # e.g., "fam@cheongfamily.com, ccmmail@gmail.com"
ALLOWED_DOMAINS = _parse_list("ALLOWED_EMAIL_DOMAINS")# optional e.g., "udemy.com"


def require_user(claims: dict = Depends(verify_token)) -> dict:
    """Checks that the user email is present, verified, and authorized."""
    email = (claims.get("email") or "").lower()

    if not email or not claims.get("email_verified", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email not present/verified")

    if ALLOWED_EMAILS and email in ALLOWED_EMAILS:
        return claims
    if ALLOWED_DOMAINS and email.split("@")[-1] in ALLOWED_DOMAINS:
        return claims

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not allowed")

