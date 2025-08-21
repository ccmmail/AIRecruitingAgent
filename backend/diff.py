"""Redline Diff Module with custom <add> and <del> tags."""
import re
from difflib import SequenceMatcher

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
