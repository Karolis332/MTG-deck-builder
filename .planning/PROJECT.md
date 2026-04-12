# Deck Builder Quality Overhaul

## What This Is

A data pipeline and scoring overhaul for The Black Grimoire's AI deck constructor. Currently the AI produces filler-heavy decks because community data tables are empty locally. This project bridges real deck data from the VPS CF API (506K+ decks) and EDHREC into the local SQLite database, builds a commander analysis engine that extracts synergy patterns from proven decklists, and adds collection coverage scoring with upgrade recommendations — so any commander gets a competitive, synergy-aware deck built from the user's actual collection.

## Core Value

The AI deck builder produces competitive, synergy-aware decks for any commander — not generic filler — and tells the user exactly how to improve their build.

## Requirements

### Validated

- ✓ AI deck construction pipeline with constraint system — existing (`deck-builder-ai.ts`, `deck-builder-constraints.ts`)
- ✓ Commander synergy analysis with 13 trigger categories — existing (`commander-synergy.ts`)
- ✓ Collection filter enforcement (3 bypass paths fixed) — existing (commit `5b8c6bc`)
- ✓ Storm synergy detection + ooze tribal awareness — existing (commit `c7c704c`)
- ✓ 34 database migrations with commander_card_stats table schema — existing (`schema.ts`)
- ✓ CF API running on VPS with 506K+ scraped decks — existing (`grimoire-cf-api`)
- ✓ EDHREC scraping infrastructure — existing (`scrape_edhrec_articles.py`, `fetch_avg_decklists.py`)

### Active

- [ ] Data pipeline: Pull commander card stats from VPS CF API into local SQLite
- [ ] Data pipeline: Scrape EDHREC for per-commander card recommendations
- [ ] Indexed deck lookup table for fast "which decks run card X" queries
- [ ] Commander analysis function: scan real decklists, extract synergy patterns
- [ ] Collection coverage scoring: % of optimal deck covered by user's cards
- [ ] Upgrade suggestions ranked by impact (biggest improvement per card added)
- [ ] AI deck builder uses real community data when available (not just hardcoded payoffs)

### Out of Scope

- Web app (black-grimoire-web) integration — separate project
- ML model retraining — existing pipeline handles this
- Arena overlay changes — unrelated subsystem
- UI redesign — only data/scoring backend changes + minimal API surface

## Context

- **Existing architecture:** Next.js 14 + Electron 33 + SQLite (better-sqlite3, WAL mode)
- **Data gap:** `community_decks` (0 rows) and `commander_card_stats` (0 rows) locally. Real data lives in VPS PostgreSQL (187.77.110.100, Docker container `grimoire-cf-api`).
- **CF API capabilities:** `/recommend` endpoint returns card recommendations per commander. PostgreSQL has `decks`, `deck_cards`, `card_stats` tables with 506K+ scraped decklists.
- **EDHREC data:** `edhrec_knowledge` and `edhrec_avg_decks` tables exist locally with FTS5. Scraping scripts exist but need to feed into `commander_card_stats` format.
- **Current scoring:** `deck-builder-ai.ts` scores candidates via synergy patterns, CMC curves, archetype templates, and hardcoded payoff lists. When `commander_card_stats` is empty, all commander-specific scoring is skipped.
- **Storm fix context:** Just added storm as 13th synergy category. Aeve now detected as storm+counters+token_generation → spellslinger archetype. But without real deck data, the builder still produces suboptimal lists.
- **Game validation:** User played Aeve deck (deck 82) and won but deck felt weak — won via Coliseum Behemoth voltron, not Aeve's storm gameplan. Torpor Orb locked out ETBs for 7 turns with no artifact removal until turn 9.

## Constraints

- **Database:** Must use existing SQLite schema. New tables/columns via migrations only.
- **VPS access:** SSH to 187.77.110.100 via `~/.ssh/id_ed25519_geo_vps`. CF API at `/cf-api/` endpoint.
- **Network:** Data sync must work offline after initial pull (Electron app may not always have internet).
- **Performance:** Commander analysis must complete in <5s for responsive deck building.
- **Compatibility:** Must not break existing 391 tests or 52 API routes.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Both CF API + EDHREC as data sources | CF API has volume (506K decks), EDHREC has curation (staple identification) | — Pending |
| Local SQLite as indexed store | Electron app needs offline access, SQLite already established | — Pending |
| Score + suggest as completion criteria | User wants actionable upgrade paths, not just deck lists | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after initialization*
