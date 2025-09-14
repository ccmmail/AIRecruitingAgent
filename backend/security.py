"""User authentication and authorization for FastAPI backend."""
from fastapi import Depends, HTTPException, Security, status
from fastapi import APIRouter, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from dotenv import load_dotenv, find_dotenv
import os, base64

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

router = APIRouter()

def _nonce(n=16):
    return base64.urlsafe_b64encode(os.urandom(n)).decode().rstrip("=")


@router.get("/oauth2cb")
def oauth2cb():
    """Redirects OAuth2 callback endpoint for Chrome extension.
    Workaround the limitation of Chrome extensions not being binded properly in Google Console.
    """
    ext_id = os.getenv("CHROME_EXTENSION_ID")
    nonce = _nonce()

    # Minimal HTML that forwards the URL fragment (#...) to the extension redirect
    html = f"""<!doctype html>
<meta charset="utf-8">
<title>OAuth redirect</title>
<script nonce="{nonce}">
  // Forward the fragment intact to the extension's chromiumapp URL
  var frag = location.hash || "";
  location.replace("https://{ext_id}.chromiumapp.org/" + frag);
</script>
<noscript>JavaScript required for redirect.</noscript>
"""

    # resp = Response(html, mimetype="text/html")
    resp = Response(content=html, media_type="text/html")

    # Strict caching + security headers
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"

    # CSP: only allow this one inline script via nonce; block everything else
    resp.headers["Content-Security-Policy"] = (
        f"default-src 'none'; "
        f"script-src 'nonce-{nonce}'; "
        f"base-uri 'none'; "
        f"frame-ancestors 'none'; "
        f"connect-src 'none'; "
        f"img-src 'none'; "
        f"style-src 'none'"
    )

    # Extra hardening
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return resp


def verify_token(creds: HTTPAuthorizationCredentials = Security(security)):
    """Authenticate user by verifying the Google ID token."""
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No ID token provided."
        )
    token = creds.credentials
    try:
        claims = id_token.verify_oauth2_token(
            token,
            grequests.Request(),
            GOOGLE_WEB_CLIENT_ID,  # aud must equal your WEB client_id
        )
        if claims["iss"] not in {"accounts.google.com", "https://accounts.google.com"}:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong issuer"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid ID token for authentication: {e}"
        )
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
        detail=f"{email} is not an authorized user. Please contact ccmmmail@gmail.com for access."
    )


