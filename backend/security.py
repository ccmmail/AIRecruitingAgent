"""User authentication and authorization for FastAPI backend."""
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from dotenv import load_dotenv, find_dotenv
import os

# try loading .env from the *current working dir* and walking upwards to project root
try:
    env_path = find_dotenv(filename=".env", usecwd=True)
    if env_path:
        load_dotenv(env_path, override=False)
        print(f"[startup] Loaded .env from: {env_path}")
    else:
        print("[startup] .env not found via find_dotenv()")
except Exception as e:
    print(f"[startup] dotenv load skipped/failed: {e}")


def _parse_list(env_name: str) -> set[str]:
    """Parse comma-separated list from environment variable into a set of lowercase strings."""
    raw = os.getenv(env_name, "")
    return {x.strip().lower() for x in raw.split(",") if x.strip()}


# Set up the HTTP Bearer security scheme and allowed users/domains
security = HTTPBearer(auto_error=False)
GOOGLE_WEB_CLIENT_ID = os.getenv("GOOGLE_WEB_CLIENT_ID")
ALLOWED_EMAILS = _parse_list("ALLOWED_EMAILS")  # e.g., "fam@cheongfamily.com, ccmmail@gmail.com"
ALLOWED_DOMAINS = _parse_list("ALLOWED_DOMAINS")  # optional e.g., "udemy.com"


def verify_token(creds: HTTPAuthorizationCredentials = Security(security)):
    """Authenticated user by verifying the Google ID token."""
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No ID token provided is for authentication."
        )
    token = creds.credentials
    try:
        claims = id_token.verify_oauth2_token(
            token,
            grequests.Request(),
            GOOGLE_WEB_CLIENT_ID,  # aud must equal your WEB client_id
        )
        if claims["iss"] not in {"accounts.google.com", "https://accounts.google.com"}:
            raise ValueError("Wrong issuer")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid ID token for authentication: {e}")
    return claims


def check_authorized_user(claims: dict = Depends(verify_token)) -> dict:
    """Authorize the user based on ALLOWED_EMAILS and ALLOWED_DOMAINS."""
    email = (claims.get("email") or "").lower()

    # email is allowed
    if ALLOWED_EMAILS and email in ALLOWED_EMAILS:
        return claims
    if ALLOWED_DOMAINS and email.split("@")[-1] in ALLOWED_DOMAINS:
        return claims

    # email not present or not verified
    if not email or not claims.get("email_verified", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="There is an issue with your email address. Please login again.")

    # email not authorized
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"{email} is not an authorized user."
    )
