---
name: briefs-via-write-tool
description: A single Bash call carrying several quoted heredocs (git commit + three brief files) failed to parse and ran nothing; write briefs with the Write tool or one heredoc per call
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0c6f5709-7ab2-42f9-8d4a-0eba683ab9d6
  modified: 2026-09-20T12:11:50.344Z
---

On 2026-09-20 a Bash call that chained `git commit -m "…"` with three `cat > file <<'EOF' … EOF` blocks died with "unexpected EOF while looking for matching `''" and executed none of it (the commit had to be redone). A single quoted heredoc per call has always worked.

**Why:** the whole `-c` string is parsed before anything runs, so one bad quote anywhere loses every command in the call, including the ones before it.

**How to apply:** create brief files with the Write tool (one file per call), keep Bash to commands; when a heredoc is unavoidable, one per call and nothing else in the call. Related: [[commit-on-test-exit-status]], [[fable-orchestrator-only-routing]].
