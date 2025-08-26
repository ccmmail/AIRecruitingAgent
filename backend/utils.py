"""Redline Diff Module with custom <add> and <del> tags."""
import re
from difflib import SequenceMatcher
import json, time, urllib.request
from functools import lru_cache
from typing import Dict, Any
from jose import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# OIDC settings for token validation
ISSUER = "https://accounts.google.com"  # if tokens issued directly by Google
AUDIENCE = "https://ai-recruiting-agent.pythonanywhere.com"  # your API audience / client_id as configured
JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ALGORITHMS = ["RS256"]
security = HTTPBearer(auto_error=True)


@lru_cache(maxsize=1)
def _jwks() -> Dict[str, Any]:
    with urllib.request.urlopen(JWKS_URL, timeout=5) as r:
        return json.loads(r.read().decode("utf-8"))

def _key_for(kid: str) -> Dict[str, Any]:
    for k in _jwks().get("keys", []):
        if k.get("kid") == kid:
            return k
    raise HTTPException(status_code=401, detail="Invalid token key id")

def verify_token(creds: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
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




def _tokenize(text: str):
    """
    Split into words, punctuation, and whitespace — while preserving all
    whitespace tokens so we can reconstruct the Baseline verbatim.
    """
    # words (with ' or -), single punctuation, or whitespace
    pattern = re.compile(r"(\s+|[^\w\s]|[\w][\w'-]*[\w]|[\w])", re.UNICODE)
    tokens, i = [], 0
    while i < len(text):
        m = pattern.match(text, i)
        if m:
            tokens.append(m.group(0))
            i = m.end()
        else:
            tokens.append(text[i])  # fallback: single character
            i += 1
    return tokens

def _join(tokens):  # keep verbatim spacing
    return "".join(tokens)

def redline_diff(baseline: str, revised: str) -> str:
    """
    Return Baseline with changes from Revised applied using markup:
      - Additions: <span style="color:#008000"><add>…</add></span>
      - Deletions: <span style="color:#c00000"><del>…</del></span>

    Rules satisfied:
      - Preserve all Baseline line breaks and order
      - Phrase-level spans (difflib groups contiguous changes)
      - Merge adjacent spans naturally (by opcode ranges)
      - No tag nesting
    """
    A = _tokenize(baseline)
    B = _tokenize(revised)

    sm = SequenceMatcher(a=A, b=B, autojunk=False)

    def wrap_add(s: str) -> str:
        return f'<span style="color:#008000"><add>{s}</add></span>'

    def wrap_del(s: str) -> str:
        return f'<span style="color:#c00000"><del>{s}</del></span>'

    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            out.append(_join(A[i1:i2]))
        elif tag == "delete":
            text = _join(A[i1:i2])
            if text:
                out.append(wrap_del(text))
        elif tag == "insert":
            text = _join(B[j1:j2])
            if text:
                out.append(wrap_add(text))
        elif tag == "replace":
            del_text = _join(A[i1:i2])
            ins_text = _join(B[j1:j2])
            if del_text:
                out.append(wrap_del(del_text))
            if ins_text:
                out.append(wrap_add(ins_text))
    return "".join(out)

