---
name: feedback-never-prefilter-agent-input
description: "Don't hand subagents a regex-filtered subset of a dataset — give the complete set sorted by relevance, or they silently never see the best option"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f1ae1c09-6723-4310-bf6f-9fa27f25d8fb
  modified: 2026-09-12T04:55:21.184Z
---

When fanning work out to subagents over a candidate set (card pools, file lists, config
options, search results), give them the **complete** set — sorted by relevance if it is
large — not a categorised or regex-filtered subset. A filter that drops anything matching
no rule is invisible to the agent and to the reviewer: the agent produces a confident,
well-argued answer over a pool that was missing the best item.

**Why:** 2026-09-12, MTG-deck-builder. I built a Kuja card pool by tagging 1,506 owned
cards into categories with regexes and emitting only the tagged ones. Collective Inferno —
present in 44% of the 6,983 real decks in the corpus, and mechanically a second copy of
the deck's key effect — matched no regex and was dropped. Three independent designers,
nine judges and a synthesis agent all missed it because none of them could see it. Only the
adversarial "what is missing from the pool?" verifier caught it.

**How to apply:** emit the whole set with a relevance sort and compact per-row summary;
use tags as *annotations on rows*, never as a gate. When the set genuinely must be trimmed,
`log()` or state exactly what was dropped and why. Always include a completeness critic in
the verify phase whose only job is "what is missing that the source data contains?" — see
[[feedback-fable-orchestrator-only-routing]] for the routing side of this.
