# Recommender Methods Audit — vs. recommender.cards (2026-07-03)

Source: "I Built My Own EDHREC… and It Actually Works" (`omYfGzrsTRc`) + follow-up
(`ulbnwYd0EtA`) by the recommender.cards creator. Each method he described, whether we
already have it, and the upgrade path. His stack is a near-mirror of grimoire-cf-api
(Moxfield/Archidekt scrape → color-partition CF → SVD → Vowpal Wabbit), which makes the
deltas the interesting part.

## Method-by-method

| # | His method | Us | Notes / upgrade |
|---|---|---|---|
| 1 | Reverse-engineered Moxfield/Archidekt APIs, incremental most-recently-updated scrape into own DB | ✅ ahead | 3.17M decks vs his 600K; nightly + targeted backfill + (new) Historic Brawl pass |
| 2 | Freshness discipline — stale corpus recommends stale cards | ✅ (fixed 2026-07-02) | SVD retrains nightly; gap was `commander_card_stats` aggregation (80d stale, now refreshed) — **action: cron `refresh_ccs.sql` weekly** |
| 3 | Deck-context recs, NOT commander-page stats (his core EDHREC criticism: precon and weird deck get same recs) | ⚠️ partial | CF API `/recommend`+`/optimize` are deck-conditioned (SVD). But the **local builder scores candidates statically per commander** — his exact criticism. **Upgrade: blend deck-context re-scoring into construction** (re-rank remaining candidates against the partial deck as slots fill; weight shifts commander-stats → deck-context as the list matures) |
| 4 | Partition matrix by color identity (32 charts) | ✅ | 33 partitions incl. colorless |
| 5 | SVD low-rank approximation | ✅ | scikit-learn SVD, 30K-deck cap/partition |
| 6 | Vowpal Wabbit online learning (no full retrain per update) | ⚠️ different use | Our VW is a contextual bandit on user events; SVD is batch nightly. Batch is fine at our scale — low priority |
| 7 | Hold-one-out positives (deck minus one card = training example) | ≈ | Implicit-feedback MF; equivalent effect |
| 8 | Negative mining (popular-in-CI cards absent from deck = negatives) | ❌ **broken in practice** | Design is ahead of his (true shown-vs-picked negatives), but VPS shows **4,178 `rec_impressions` vs 1 `rec_outcomes` ever** (checked 2026-07-03) — the app isn't reporting selections back. **Fix the `/events` outcome POST in the desktop app**; until then the bandit learns from nothing |
| 9 | Staple suppression — down-scale popular cards during training | ✅ | CF API staple suppression + local color-adjusted staple scoring |
| 10 | **Lift** = P(card\|commander) / P(card\|color identity) — ratio, not diff | ⚠️ tried + reverted | Lift-tiered synergy bonus (≥8x +30, ≥4x +20, ≥2x +10) **regressed fitness 897→885** — our references are EDHREC averages, which reward consensus, so niche-surfacing is penalized by the current yardstick. Revisit when references are mostly human winning lists; or apply lift only in AI-candidate ranking / the "Deck Identity" stats (#13), where it shines regardless |
| 11 | Tags + combo data to surface "deep cut" recs | ⚠️ data exists | `scrape_commander_spellbook.py` + EDHREC themes scraped but not wired into scoring. Backlog |
| 12 | Edit-history negatives; insert-order for build-up recs | ⚠️ equivalent exists | Our bandit event stream is the stronger version of both; `/recommend` already works from partial decks |
| 13 | "Hipster meter": avg lift, synergy range, staples %, anti-staples % per deck | ❌ | **Cheap win** — all inputs already in local `commander_card_stats`. Add a "Deck Identity" stats card to deck analytics: how netdeck-vs-brew a list is |
| 14 | Candidate generation BEFORE ranking (companions, theme restrictions, user filters) | ✅ ahead | `validForPool` chokepoint: legality, color identity, collection, rarity, dead-land-fetch. His v1 ranked every legal card |
| 15 | Companion rule enforcement (Jegantha, Lurrus…) in candidate gen | ❌ | **High value** — user actively runs Jegantha companion in Brawl. Add companion constraint filters to `validForPool` + deck validation |
| 16 | Cut suggestions: naive low-score cuts are a trap (kills pet cards/silver bullets); real cuts = REDUNDANT cards | ❌ but well-positioned | He can't do it (single association score). We have `card-classifier` categories + role quotas → suggest cuts from over-quota effect clusters, keep low-synergy pet cards. Backlog |

## Priority backlog distilled

1. ~~**Fix `/events` outcome reporting from the desktop app**~~ ✅ **DONE 2026-07-03** — `/api/ai-suggest/apply` now posts `card_added`/`card_removed` (+`candidates_shown` context) to CF `/events/track` after every applied suggestion; verified end-to-end (rec_outcomes 1→2). The bandit learns from real choices from now on.
2. **Cron the VPS `refresh_ccs.sql`** (weekly) — freshness gap closes permanently.
2. **Companion constraint filter** in `validForPool` + validation (Jegantha first).
3. **Deck Identity stats** (lift avg/range/staple%) in deck analytics.
4. **Deck-context blending during construction** (re-rank vs partial deck; the "EDHREC problem" fix for our local builder).
5. **Redundancy-aware cut suggester** (cluster over-quota categories; never cut silver bullets).
6. Store `lift` natively in VPS `commander_card_stats`; wire combo/theme data into scoring.

## Where we're simply ahead

- Corpus size (3.17M vs 600K) + Arena Brawl format data (new).
- True negative mining from user behavior (bandit events).
- Candidate generation (his wishlist = our shipped `validForPool`).
- Deck construction end-to-end (he only recommends; we build, validate, audit health, and
  fitness-gate the engine against human winning references).
