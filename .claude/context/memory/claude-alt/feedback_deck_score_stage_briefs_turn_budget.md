---
name: deck-score-stage-briefs-turn-budget
description: "Opus builder/debugger agents on Deck Score stages stop at their 60–80 tool-call limit mid-edit; size each brief to ≤ 2 defects, tell the agent its budget, and resume via SendMessage rather than relaunching (2026-09-21/22)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0c6f5709-7ab2-42f9-8d4a-0eba683ab9d6
  modified: 2026-09-22T05:22:33.305Z
---

Every Deck Score v1.4 stage agent (2c, 3, 3b, 3c) hit the harness turn limit (80 for builder, 60 for debugger) before writing its report; the work was salvaged each time by `SendMessage` to the same agent id ("continue from X; ONE gate set; write the report even if red"), which keeps its context. Relaunching a fresh agent on a dirty tree loses the diagnosis.

**Why:** a stage that says "reproduce, fix at the shared site, re-freeze three references, run probes on three profiles, re-pin tests, write a report" is 100+ tool calls on this repo (vitest ≈ 20 s, `bands verify` + probes ≈ minutes each). The agent spends its budget on measurement, not on the fix.

**How to apply:** one brief = at most two defects + one gate set; put "turn budget ~60 tool calls, batch edits, ONE final gate set + one vitest repeat, write the report even if red, mark the rest UNVERIFIED" in the launch prompt; before launching a follow-up on an uncommitted tree, `git diff > ~/.claude/harness/runs/<program>/<stage>-wip.patch` as insurance (agents never stash). Never commit a red tree: gate on `npx vitest run` exit code yourself before `git commit` ([[commit-on-test-exit-status]]). Related: [[fable-orchestrator-only-routing]], [[deck-score-real-decks-and-app-sync]].
