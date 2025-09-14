# # /home/<your_pa_username>/mysite/app.py
# from flask import Flask, Response
# import os, base64
from fastapi import APIRouter, Response
import os, base64


# app = Flask(__name__)
router = APIRouter()


def _nonce(n=16):
    return base64.urlsafe_b64encode(os.urandom(n)).decode().rstrip("=")


# @app.route("/oauth2cb")
# def oauth2cb():
@router.get("/oauth2cb")
def oauth2cb():
    """Redirects OAuth2 callback endpoint for Chrome extension."""
    ext_id = "oblgighcolckndbinadplmmmebjemido"   # your extension ID
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