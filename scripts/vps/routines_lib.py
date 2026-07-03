"""
Shared helpers for grimoire-routines.

Provides:
- env loading (routines/.env first, geo-scraper/.env fallback)
- provider selection (Groq preferred, Anthropic fallback)
- call_llm()
- send_telegram()
- sh() / http() utilities
"""
from __future__ import annotations

import json
import os
import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from typing import Tuple

# Load env from grimoire-routines first, then geo-scraper as fallback.
# Skip empty values so an unset key in routines/.env doesn't block the fallback.
for env_path in ["/opt/grimoire-routines/.env", "/opt/geo-scraper/.env"]:
    p = Path(env_path)
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip()
                if v and not os.environ.get(k):
                    os.environ[k] = v

GROQ_KEY = os.environ.get("GROQ_API_KEY", "").strip()
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
TG_BOT = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
TG_CHAT = os.environ.get("TELEGRAM_CHAT_ID", "").strip()

if GROQ_KEY:
    PROVIDER = "groq"
    MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
elif ANTHROPIC_KEY:
    PROVIDER = "anthropic"
    MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
else:
    PROVIDER = ""
    MODEL = ""


def have_llm() -> bool:
    return bool(PROVIDER)


def sh(cmd: str, timeout: int = 15) -> str:
    """Run shell command, return stdout (or stderr if stdout empty)."""
    try:
        r = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return (r.stdout or r.stderr).strip()
    except Exception as e:
        return f"ERR: {e}"


def http(url: str, timeout: int = 8) -> str:
    """GET a URL, return body or 'ERR: ...'."""
    try:
        return urllib.request.urlopen(url, timeout=timeout).read().decode()
    except Exception as e:
        return f"ERR: {e}"


def call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 600) -> Tuple[str, int, int]:
    """Call the active LLM provider. Returns (text, in_tokens, out_tokens)."""
    if PROVIDER == "groq":
        return _call_groq(system_prompt, user_prompt, max_tokens)
    if PROVIDER == "anthropic":
        return _call_anthropic(system_prompt, user_prompt, max_tokens)
    raise RuntimeError("no LLM provider configured")


def _call_groq(system_prompt: str, user_prompt: str, max_tokens: int) -> Tuple[str, int, int]:
    body = json.dumps(
        {
            "model": MODEL,
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_KEY}",
            "User-Agent": "grimoire-routines/1.0",
        },
    )
    try:
        raw = urllib.request.urlopen(req, timeout=30).read().decode()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="replace")
        raise RuntimeError(f"Groq HTTP {e.code}: {err_body[:600]}") from None
    data = json.loads(raw)
    text = data["choices"][0]["message"]["content"].strip()
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)


def _call_anthropic(system_prompt: str, user_prompt: str, max_tokens: int) -> Tuple[str, int, int]:
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return resp.content[0].text.strip(), resp.usage.input_tokens, resp.usage.output_tokens


def send_telegram(title: str, body: str, in_tok: int = 0, out_tok: int = 0) -> bool:
    """Post a routine result to Telegram. Returns True on success."""
    if not (TG_BOT and TG_CHAT):
        print("telegram: skipped (no token/chat)")
        return False
    footer = (
        f"\n\n<i>{PROVIDER}/{MODEL} · in={in_tok} out={out_tok} tok</i>"
        if in_tok or out_tok
        else ""
    )
    msg = f"<b>{title}</b>\n\n{body}{footer}"
    payload = json.dumps(
        {
            "chat_id": TG_CHAT,
            "text": msg,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
    ).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TG_BOT}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=10).read()
        print("telegram: posted")
        return True
    except Exception as e:
        print(f"telegram FAILED: {e}")
        return False
