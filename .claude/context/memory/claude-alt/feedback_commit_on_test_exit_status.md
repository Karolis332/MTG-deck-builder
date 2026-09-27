---
name: commit-on-test-exit-status
description: Never chain git commit after a grep of test output; gate on the runner's exit status
metadata:
  type: feedback
---

Twice on 2026-09-19 a commit landed with failing tests because the chain was
`vitest run | grep "Tests " && git commit …` — grep succeeds whenever the summary line prints,
even when it says "7 failed".

**Why:** the pipeline's exit status is grep's, not vitest's; `;` is worse still.

**How to apply:** run the suite in its own Bash call (or `set -o pipefail` and test
`${PIPESTATUS[0]}`), read the pass/fail line, and only then commit in a separate call.
Same for `tsc`/`lint` piped through `tail`/`grep`. Related: [[fable-orchestrator-only-routing]].
