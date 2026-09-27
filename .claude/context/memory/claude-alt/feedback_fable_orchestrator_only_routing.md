---
name: fable-orchestrator-only-routing
description: "Operator rule 2026-09-10 — Fable never executes; route to pinned role agents (scout/researcher/builder/refuter/debugger), measure with usage-report.mjs, target Fable ≤ 25% of spend"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6d67229c-6f28-4a11-85db-ccbb28e4247b
  modified: 2026-09-10T08:08:33.118Z
---

Fable is orchestrator only: plan, spec, spawn, read reports, decide, integrate. Execution goes to the pinned agents in `~/.claude/agents/`: scout (haiku, low), researcher (sonnet, medium), builder (sonnet, medium), refuter (opus, high), debugger (opus, high). Default loop: Fable (spec file) → builder → refuter → Fable. One-line fixes and single greps Fable does itself.

**Why:** the 7-day baseline on 2026-09-10 was Fable at 95% of estimated spend with ~403k tokens of context per Fable turn; the operator wants Fable reserved for special occasions.

**How to apply:** write the spec to `~/.claude/harness/briefs/<slug>.md` and have agents read it (never paste it twice); cap agent output and send big output to `~/.claude/harness/runs/<slug>/`; never let a builder self-certify; read `node ~/.claude/harness/usage-report.mjs --brief` (printed at SessionStart) and the statusline `F NN%`; keep contexts small (`/clear` between tasks). Related: [[background-workers-hazards]] [[codex-gpt6-astra-design]].

**Context guard (2026-09-10):** auto-compact at 150k via `CLAUDE_CODE_AUTO_COMPACT_WINDOW` in both profiles; `~/.claude/harness/context-guard.mjs` nudges at 100k/130k (UserPromptSubmit + PostToolUse for Read/Bash/Grep/Glob/Agent/WebFetch) and `checkpoint.mjs` writes `~/.claude/harness/checkpoints/<slug>.md` before compaction, re-injected on SessionStart compact/clear/resume. On a `[context-guard]` notice: finish the current step, start nothing new, tell the operator to `/clear`. Sub-agents exempt from nudges. Deployed 2026-09-10, tested across 5 sessions (full/pre-compact/post-compact/clear-to-resume).
Related: [[background-workers-hazards]] (no taskkill) [[token-routing-v1]] (orchestrator-only).
