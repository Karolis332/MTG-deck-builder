#!/usr/bin/env python3
"""
CVE triage (weekly Mon 08:00 UTC, also runs ad-hoc).

Lists open Dependabot PRs across the 3 repos, asks the LLM to rank by
exploitability + suggest merge order. Keeps the auto-PR firehose actionable.
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, "/opt/grimoire-routines")
from routines_lib import call_llm, have_llm, send_telegram, sh

REPOS = [
    "Karolis332/MTG-deck-builder",
    "Karolis332/geo-scraper",
    "Karolis332/black-grimoire-web",
]

SYSTEM = """You are a security engineer triaging Dependabot CVE PRs across multiple
repos for a solo operator. Goal: tell the operator which PRs to merge first,
which can wait, and which to ignore.

Guidance for ranking:
- HIGH PRIORITY: critical/high CVE on a runtime dependency reachable from user input
  (auth, web framework, DB driver, parser, network library).
- MEDIUM: high/moderate CVE on a build/dev dep, OR low-severity on runtime dep.
- LOW: dev-only, or in a path the app doesn't actually exercise.
- IGNORE: deprecated/unused package, or false-positive transitives.

Output (Telegram HTML, max 14 lines):
- Line 1: "<b>🛡️ CVE Triage</b>" + total open Dependabot PR count.
- Group by repo with <b>repo</b> on its own line.
- Under each repo, up to 3 PRs ranked, format: "• [P1/P2/P3] #N pkg X→Y — one-line rationale".
- Final line: <code>gh pr merge N --squash --auto --repo R</code> for the top P1.
- No preamble, no markdown headers, no code fences."""


def get_dependabot_prs(repo: str) -> list[dict]:
    """Fetch open Dependabot PRs for a repo via gh CLI."""
    raw = sh(
        f"gh pr list --repo {repo} --state open --author 'app/dependabot' "
        f"--json number,title,labels,createdAt,url --limit 30",
        timeout=20,
    )
    if raw.startswith("ERR") or not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


def main() -> None:
    if not have_llm():
        print("no LLM provider — skipping")
        return

    by_repo: dict = {}
    total = 0
    for repo in REPOS:
        prs = get_dependabot_prs(repo)
        by_repo[repo] = prs
        total += len(prs)

    if total == 0:
        send_telegram(
            "🛡️ CVE Triage",
            "<b>✅ All clear</b> — no open Dependabot PRs across the 3 repos.",
        )
        return

    payload = json.dumps(
        {"total_open_prs": total, "by_repo": by_repo}, indent=2, default=str
    )[:18000]
    verdict, in_tok, out_tok = call_llm(
        SYSTEM, f"Open Dependabot PRs:\n\n{payload}", max_tokens=700
    )
    print(verdict)
    send_telegram("🛡️ CVE Triage", verdict, in_tok, out_tok)


if __name__ == "__main__":
    main()
