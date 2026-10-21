---
name: cpu-cap-50-percent
description: "Operator wants every Claude process tree held at a 50% CPU cap (cpu-cap skill) during long compute (climbs, sims, workflows); re-apply at session start and before batches"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1c55ddd6-8d5c-42f9-b5b1-613f919a0ed9
  modified: 2026-10-08T21:41:31.403Z
---

Keep CPU usage at the 50% cap: run `powershell -NoProfile -ExecutionPolicy Bypass -File "C:/Users/kpaul/.claude/skills/cpu-cap/cpu-cap.ps1" -Percent 50` at session start and again before launching any batch (best-deck climbs, goldfish sims, Workflow fan-outs). Children inherit the affinity, processes started before the cap do not.

**Why:** the operator said "keep cpu usage at 50% cap" (2026-10-09) after the model-lab server had been killed for low memory; the machine has 16 logical CPUs, so the cap = 8. Heavy node processes (collection-best-deck climbs ≈ 1–3 min per pass per commander at 100 games, swap-lab ≈ 20 s per swap) must also be bounded in count: ≤ 2 climb shards + ≤ 3 concurrent reviewer agents worked without thrashing.

**How to apply:** cap first, then limit concurrency in the workflow script (a JS limiter(3) around heavy agents) and shard long batches with `run_in_background`. Related: [[background-workers-hazards]], [[model-score-decides-final-list]].
