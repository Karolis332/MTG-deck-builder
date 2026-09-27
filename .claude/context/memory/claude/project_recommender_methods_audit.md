---
name: project-recommender-methods-audit
description: Audit of recommender.cards videos vs our engine — full mapping in docs/RECOMMENDER_METHODS_AUDIT.md; bandit outcomes broken (1 ever); lift scoring tried+reverted
metadata: 
  node_type: memory
  type: project
  originSessionId: 7fbf5f4b-340f-47ab-8962-4cc85bb2a503
---

# Recommender methods audit (2026-07-03)

Analyzed both recommender.cards videos (creator built an EDHREC rival on the same stack we
run). Full mapping: `docs/RECOMMENDER_METHODS_AUDIT.md`. Key outcomes:

- **CRITICAL: bandit never learns.** VPS `rec_impressions` = 4,178, `rec_outcomes` = 1 (ever).
  The desktop app doesn't POST selection outcomes to `/events`. Fixing that is the single
  highest-leverage recommender improvement. [[cf-engine-details]]
- **Lift-ratio scoring tried + REVERTED** (fitness 897→885): EDHREC-average references reward
  consensus, so lift's niche-surfacing is penalized. Revisit when references are human winning
  lists, or use lift for "Deck Identity" stats / AI-candidate ranking instead.
- We are ahead of him on: corpus (3.17M vs 600K), candidate generation (`validForPool`),
  Brawl format data, end-to-end building. Behind on: companion constraints (Jegantha!),
  deck-uniqueness stats, deck-context blending in the LOCAL builder (it's commander-stats
  static — his exact criticism of EDHREC), redundancy-aware cut suggestions.

**Why:** the videos validated our architecture but exposed that our learning loop is
severed and our local builder has the "EDHREC problem" his project was built to fix.

**How to apply:** work the priority backlog in the audit doc top-down (events fix → cron
refresh_ccs → companion filter → deck identity stats → deck-context blending).
