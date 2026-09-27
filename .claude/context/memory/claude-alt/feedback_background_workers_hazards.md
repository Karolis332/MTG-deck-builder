---
name: feedback-background-workers-hazards
description: "How to run Codex exec and Sonnet subagents in the background on this machine without hanging, crashing or killing the operator's dev servers (learned 2026-09-09)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a6cf997f-c648-4ed8-9cce-6aa53cc1c250
  modified: 2026-09-18T09:32:28.829Z
---

Operator instruction (2026-09-09): "delegate tasks to parallel agents and other models to save tokens" — Fable writes briefs
and reviews; Codex gpt-6-astra and Sonnet subagents execute. Three hazards seen the same day:

1. `codex exec ... "$(cat brief.md)"` launched as a background Bash task blocks on "Reading additional input from stdin..."
   because the task's stdin never closes. Always append `< /dev/null`.
2. Codex dumps whole files it reads into the log; a 700 KB JSON read crashed the run (exit 1, no final message, 1 MB log).
   Put "never print whole files, load in Python and print only the numbers you need" and
   `$env:PYTHONIOENCODING='utf-8'` (its PowerShell+Python steps die on "→" in card names) in every brief. Also say
   "no clarifying questions, decide and state the assumption" — exec mode has nobody to answer.
3. A Sonnet subagent cleaning up its own dev server ran `taskkill /F /IM node.exe /T` and killed every Node process,
   including the operator's `next dev --port 3010` desktop shell. Briefs that let an agent start a server must say:
   never kill by image name; stop only the PID you started.

4. (2026-09-18) Git Bash / MSYS rewrites any argument that starts with `/` into `C:/Program Files/Git/...`. An
   agent that wrote `.env.local` values through a bash command turned `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` into a
   Windows path, so every Clerk redirect went to `file:///C:/Program Files/Git/sign-in`. Write env files with the
   Write tool or a heredoc, never as bash args; check `node --env-file=.env.local -e` afterwards (names + first chars only).
5. (2026-09-18) Tailwind v4 scans every non-gitignored text file in the web repo: a `next dev` log or page dump inside
   the repo breaks the CSS build on every route. Logs go to `/tmp`. Playwright MCP screenshots land in
   `MTG-deck-builder/.playwright-mcp` or the repo root even when a path is given — move them into the target repo's
   `verify-<date>/` afterwards. A dev server can also keep serving a stale stylesheet after big CSS edits; restart it
   before concluding an animation "does not fire".

6. (2026-09-18) Backslash sequences in Bash-tool commands do not survive intact: a Python heredoc with `"\\n"` and a
   sed replacement with `\\\\n` both ended up writing REAL newlines into a TypeScript template literal (three failed
   attempts). Build escape sequences without backslashes in the source (`chr(92)+'n'`) or use the Edit tool for any
   edit that must contain a literal `\n`. Also `/tmp` differs between Git Bash and node (`C:\tmp`): pass paths through
   `cygpath -m`.

**Why:** each cost a full re-run or an outage; none is discoverable from the repo.
**How to apply:** template the three lines into every Codex/agent brief; after agents finish, check `netstat -ano | grep :3010`
and restart the dev server if it is gone. Related: [[feedback-codex-gpt6-astra-design]], [[project-theblackgrimoire-com-launch]].

**2026-09-19 addendum:** an engine builder ran a repro without `MTG_DB_DIR` and `resolveDbDir` preferred `%APPDATA%/the-black-grimoire/data`, so migration 46 was applied to the operator's LIVE desktop DB (additive, harmless, but a constraint breach). Every brief that touches the card DB must say: set `MTG_DB_DIR` explicitly on every command (repo `data/` or a temp copy); never rely on the default.
