---
name: project-session-state-2026-08-23
description: "Current state — Tier 1 COMPLETE, retrain iteration done, launch plan written; what's running/next"
metadata: 
  node_type: memory
  type: project
  originSessionId: bfeba8d1-f96d-42e6-8ad2-3749c0faf6c7
  modified: 2026-08-24T12:24:10.088Z
---

# Session state (2026-08-23, updated 2026-08-24)

## 2026-08-24 — ALL 5 confirmed review defects FIXED
- #6/C1/C3/#11/C2/C4 all landed (01dae81..e8114ac on auto-improve): arsenal capped+reconciled+enabled everywhere, classifier own-ability scoping, tutor category+quota. **Baselines: standard 968 / collection 363→366, hardFails 0, 412 tests.** The +95 jump came from ENABLING the arsenal (userId plumbing) after C1 made it safe. Engine deployed to VPS build-api. Auto-improve gate baseline = these numbers now.
- Web (black-grimoire-web master): /collection persistent (localStorage + REAL Neon — DATABASE_URL exists!, 03710f9), parser Count=0 bug fixed + user's Downloads/collection.csv e2e (744fdd8), /decks catalogue over deck-catalog VPS endpoints (f0d813f + VPS 9ade487).
- Research on file: domains (blackgrimoire.com AVAILABLE — operator to buy; .gg $51 Porkbun-only defensive), scrapers (Topdeck.gg API first — real cEDH W/L, effort 2; Aetherhub Brawl telemetry second; TappedOut+Melee DO NOT). docs/MONETIZATION_NOTES.md = tier re-anchor plan.
- Standard web builds now ~90s cold (arsenal cost) — builder progress copy still says 15-45s.

Supersedes [[project-session-state-2026-07-03]] — **all Tier 1 items from that halt point are DONE**:
legality-skip ✅ verified (hardFails 1→0), commander_summary ✅ (VPS /commander-list 2 min→25 ms),
game_won/game_lost → /events/track ✅ (c324ac3), engine badge ✅ (bae8c28, migration 36 `decks.built_by`).

## Retrain iteration findings
- Nightly cron NOW RETRAINS RELIABLY — SVD retrained 04:47 UTC same-day, VW bandit 07:51, corpus 3.79M decks. Don't force-retrain without checking `last_retrained` first.
- Weekly VPS CCS cron working (Mon 03:00 UTC). `commander_summary` (3,589 rows) rebuilt in the same refresh_ccs.sql pass.
- Roster fitness after fresh stats sync: 860 → 864 (scale changed vs July's 897 — magus+vivi brawl scenarios now SKIP instead of building, so scores aren't comparable across that boundary).
- Bandit outcome wiring now covers: card add/remove (apply route) + game outcomes (match-logs + arena-matches routes). Watch VPS `rec_outcomes` grow past 2 as the app gets used.

## Sync footgun (bit us this session)
`sync_commander_stats.py --commanders-file` with a SHORT list did an atomic swap and **wiped local
commander_card_stats to 12 commanders**. Fixed in c92ca96: partial syncs (<50% of existing
commanders) now MERGE. Full commander list lives at `data/all-commanders.txt` (pull fresh via
`SELECT DISTINCT commander_name FROM commander_card_stats` on VPS postgres). Recovery re-sync of all
3,589 launched this session — verify `COUNT(DISTINCT commander_name)` ≈3.5K locally.

## Launch track (new this session)
- `docs/LAUNCH_PLAN.md` — phased: P0 ship-readiness (privacy/EULA, clean-VM test) → P1 direct
  (GitHub Release + landing) → P2 Overwolf → P3 MS Store ($19) → P4 payments → P5 mac/linux.
  Rung-3 operator gates marked inline (release publish, store spends, Stripe live).
- black-grimoire-web: landing polished for desktop launch + `DEPLOY.md` manual checklist
  (14f4163). Vercel project already linked; Clerk/Neon/Stripe dashboards still untouched.

## Online platform (added later same day)
- **build-api on VPS**: PM2 process `build-api`, nginx `http://187.77.110.100/build-api/` → 127.0.0.1:8100, code at `/opt/grimoire-build-api/app` (repo `services/build-api/server.ts`), DB snapshot at `/opt/grimoire-build-api/db`, key at `/opt/grimoire-build-api/.key` (also in black-grimoire-web `.env.local`). Wraps `autoBuildDeck` — same engine as desktop. Redeploy: scp server.ts + `pm2 restart build-api`.
- **black-grimoire-web**: `/builder` page (public, rate-limited 5/hr anon) + full grimoire art-style port (Tailwind v4 CSS-first — NO tailwind.config.ts there; theme lives in globals.css @theme). Local dev with stale Clerk keys: blank them at PROCESS level (`CLERK_SECRET_KEY= NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= npm run dev`) → Clerk keyless mode works. `.env.local` edits are permission-DENIED — never script-edit it.
- **DB snapshot staleness**: web builds use the 2026-08-23 card DB copy; re-snapshot + re-upload when local card data updates.
- **Collection builds online**: POST /build accepts `ownedCards:[{name,quantity}]` (≤10K) → temp-seeds the service DB collection table (SERIALIZED — engine collection reads have NO user_id scoping) → useCollection build → cleanup. Operator's private collection rows were WIPED from the service DB. Formats: commander | brawl (100) | standardbrawl (60 — engine land-floor bug fixed bbea79e). Cards carry set_code/collector_number for Arena export. Illegal commander → 422.

## Deck-model review (docs/DECK_REVIEW_2026-08-23.md)
27 builds / 11 commanders, median B-. 5 CONFIRMED systemic defects (adversarially verified, file:line mechanisms in doc): C1 arsenal pre-fill uncapped (75% budget, no role caps — worst-ratio root cause), C2 classifier regex false-positives suppress real wipes, C3 arsenal bypasses anti-synergy strips (= Ramos counters-leak mechanism), C4 no tutor category + ALL template synergyMinimums are dead code, C5 protection quota hardcoded. Refuted: fast-mana-outscored claim (don't re-chase). **UI builds run arsenal-less** — `userId` never passed (deck-builder-ai.ts:1506). Work the doc's §5 backlog top-down; re-baseline deck-fitness after #1-5.

## Still-useful resume commands (carried from July halt)
- EDHREC bulk fetch (was ~1,010/2,104, lossless resume):
  `PYTHONUTF8=1 py scripts/fetch_avg_decklists.py --db "$APPDATA/the-black-grimoire/data/mtg-deck-builder.db" --from-cf-stats --min-decks 20 --stale-days 30`
- Auto-improve loop: `bash scripts/auto-improve.sh 10` (gate baseline = today's results.json, score 864)
