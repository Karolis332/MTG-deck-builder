# Deck Model Review — 2026-08-23

**Model context**

| Item | Value |
|---|---|
| SVD retrain | 2026-08-23 04:47 UTC, **3,789,422** community decks, `model_version v33p-loaded` |
| VW bandit retrain | 2026-08-23 07:51 UTC |
| Per-commander stats | `commander_card_stats` synced to local engine same day |
| Roster fitness | 860 → **864** after the sync |
| Scope | **27 builds / 11 commanders** — commander (paper EDH) + Historic Brawl, standard and collection-constrained modes |
| CF API | reachable, auth OK, `/health` confirms today's retrain; 3 × `/recommend` spot-checks returned 200 / 30 recs |

---

## 1. Executive Summary

The engine reliably produces **legal, castable, on-color decks**. Across all 27 builds there were **zero color-identity violations and zero format-legality violations** — including the historically leaky MDFC path, and including correct exclusion of Historic-Brawl-banned cards (Sol Ring, Mana Drain, Oko, Demonic Tutor, Kodama's Reach). Collection mode leaked **no unowned non-basics** in any build that was cross-checked against the `collection` table.

What the engine does **not** do well is **budget allocation**. Five systemic defects were adversarially verified this round; four are CONFIRMED and all four are allocation or classification bugs, not knowledge bugs. The dominant failure shape:

> An uncapped pre-fill stage consumes ~75% of nonland slots before the role-quota system runs → one role (usually ramp or draw) overshoots 2-3x → removal, protection, tutors and win conditions get starved → the harness reports the quota as "OK" because a misclassified card fills it.

Grade distribution: **1 B+ ×2, B ×4, B- ×11, C+ ×7, C- ×2, C ×0** (median **B-**). No build was unplayable; none was tournament-tight.

### 1.1 Grade table — all 27 builds

| # | Commander | Format | Mode | Grade | One-line verdict |
|---|---|---|---|---|---|
| 1 | Vivi Ornitier | commander | standard | B- | Good draw/removal density, protection collapses to 2, zero tutors |
| 2 | Vivi Ornitier | commander | collection | C+ | Protection over-delivers (7), curve floods at CMC 0-2 (66%) |
| 3 | Ramos, Dragon Engine | commander | standard | B- | Gold density 47/61 correct, **0 protection**, thin White + 1 fetch |
| 4 | Ramos, Dragon Engine | brawl | standard | C+ | Near-duplicate of paper build; misses the winning Gates/Maze's End plan |
| 5 | Ramos, Dragon Engine | commander | collection | C- | ramp 24 vs 12, draw 5, **5 counters-matters leaks** vs own gate |
| 6 | Magus Lucea Kane | commander | standard | C+ | Sol Ring absent (88.6% incl.), 3 fake protection cards, 2 dead fetches |
| 7 | Magus Lucea Kane | commander | collection | B- | Real protection suite, 7/38 lands are pay-{1}-to-filter |
| 8 | Thrasios / Tymna | commander | standard | B- | Excellent 4c manabase, 29-30 interaction, 0 tutors, 1 wincon |
| 9 | Thrasios / Tymna | brawl | standard | B | Precise Historic Brawl legality; ramp 21 vs 4-6 target |
| 10 | Thrasios / Tymna | commander | collection | C+ | ramp 29 / removal 4 inversion; owned Greaves + Sylvan Library unpicked |
| 11 | Heliod, Sun-Crowned | commander | standard | B | Real Heliod+Ballista combo; 4 mono-white-dead fetches + City of Brass |
| 12 | Heliod, Sun-Crowned | brawl | standard | B | Correct Arena re-cut; same dead-fetch manabase |
| 13 | Heliod, Sun-Crowned | commander | collection | B- | Best-calibrated ratios of the three; 4 strictly-worse-than-Plains lands |
| 14 | Orvar, the All-Form | commander | standard | B- | Real Orvar trigger fodder present; 0 tutors, 2 counters, 0/8 utility lands |
| 15 | Orvar, the All-Form | brawl | standard | C+ | Zero commander-trigger cards (mostly pool ceiling); Rhystic/Remora legal + absent |
| 16 | Orvar, the All-Form | commander | collection | C+ | Clean ownership; **1 win condition** in a 99-card control shell |
| 17 | Sheoldred, the Apocalypse | commander | standard | B- | Coherent group-slug punisher package; 0 tutors, 1 protection, top-heavy |
| 18 | Sheoldred, the Apocalypse | brawl | standard | B- | Best protection of the three; avgCMC 3.72 too slow for 1v1 |
| 19 | Sheoldred, the Apocalypse | commander | collection | B | Zero CI leaks, ratios hold under pool constraint |
| 20 | Krenko, Mob Boss | commander | standard | B+ | 72%+ real reference overlap, full Goblin package; misses Coat of Arms |
| 21 | Krenko, Mob Boss | brawl | standard | B+ | Tight Arena-legal swarm; 19/32 "missing" entries are correctly-excluded paper cards |
| 22 | Krenko, Mob Boss | commander | collection | B- | Good sac/ritual substitution; 3 owned lands strictly worse than Mountain |
| 23 | Ghalta, Primal Hunger | commander | standard | B- | ramp 19 vs 10-12; 5/41 land slots wasted; 0 power-matters payoffs |
| 24 | Ghalta, Primal Hunger | brawl | standard | B- | ramp 19 vs HB-aggro 4-6; correct Sol Ring exclusion |
| 25 | Ghalta, Primal Hunger | commander | collection | C+ | ramp 24; Chromatic Lantern/Hedron Archive in mono-green; CMC2 glut (24/58) |
| 26 | Meren of Clan Nel Toth | commander | collection | C+ | Ramp 18 / draw 17 over cap while removal 7, protection 2; orphaned Entomb |
| 27 | General Tazri | commander | collection | C- | **Not an Allies deck** — 10/26 Allies, 0 tribal payoffs, 22 ramp |

Legend: ✅ target met · ⚠️ off-target but tolerable · ❌ target missed materially

---

## 2. Systemic Engine Findings

### 2.1 CONFIRMED (adversarially verified — fix these)

---

#### C1 — Arsenal pre-fill has no per-role cap; it consumes 75% of nonland slots before quotas exist ❌ **highest impact**

| Field | Value |
|---|---|
| Confidence | high |
| Reported by | ramos-dragon-engine |
| Blast radius | ≥6 commanders, both modes; ramp *and* draw |

**Mechanism**
- `src/lib/deck-builder-ai.ts:1550` — `arsenalSlotBudget = Math.floor(nonLandTarget * 0.75)` (**45 of 61** Commander slots).
- `src/lib/deck-builder-ai.ts:1553-1573` — pre-fill loop pushes arsenal cards with **no role classification and no per-role counter**; only checks `arsenalUsed >= arsenalSlotBudget`.
- Role caps exist only in Pass B, `src/lib/deck-builder-constraints.ts:752-760` (`ramp: quotas.ramp + 4`, `draw: quotas.draw + 5`). `roleFills` is seeded from `preFilled` (`:599-616`) so the caps *see* the overflow but can only refuse to add more — they cannot retract.
- `getRoleQuotas` is not computed until `deck-builder-ai.ts:1609` — after the pre-fill has already run. The cap data does not exist yet.
- Aggravator: the 3+-color fixing floor at `deck-builder-ai.ts:1580-1605` adds up to 8 more ramp rocks, also uncapped, also before quotas.
- Aggravator: the arsenal top-45 contains **lands** (13 for Ramos, 18 for Thrasios, 17 for Tazri) which are charged against the *nonland* budget, burning spell slots outright.

**Measured** (arsenal probe, first 45 in-budget entries, same `classifyCard`):

| Commander | Mode | Arsenal ramp | Quota | Pass-B cap | Shipped ramp |
|---|---|---|---|---|---|
| Ghalta (mono-G, aggro) | standard, full pool | 22 | 9 | 13 | 19 |
| Ghalta | collection | 20 | 9 | 13 | **24** |
| Thrasios+Tymna | collection | 17 (+8 floor) | 9 | 13 | **29** |
| General Tazri | collection | 11 (+8 floor) | 11 | 15 | 22 |
| Ramos | collection | 10 (+8 floor) | 12 | 16 | **24** |
| Ramos | standard | 8 (+8 floor) | 12 | 16 | 16 (at cap) |

Ghalta is the clean proof: mono-color (no fixing floor), full pool — **22 ramp from pre-fill alone against a quota of 9**. Not ramp-specific: `mono-u-orvar` collection draw = 21 vs cap 18; `mono-b-sheoldred` brawl draw = 19 vs cap 15. It is whatever role the CF/EDHREC arsenal happens to be dense in.

**Harm** — Ramos collection ships **draw 5 vs quota 10** and removal 9 in the same build where ramp is 8 over cap. Thrasios collection ships **removal 4**.

**Fix**
1. Hoist `getRoleQuotas` above the pre-fill (currently `deck-builder-ai.ts:1609` → before `:1550`).
2. Extract `roleCapsFor(quotas)` from `deck-builder-constraints.ts:752-758`; enforce it inside the pre-fill loop — classify each arsenal card, `continue` if every role it fills is at cap. Arsenal ordering still wins contested slots.
3. Count the 3+-color fixing floor (`:1580`) against the same ramp counter instead of stacking on top.
4. Skip land-type arsenal cards in the pre-fill (or charge them to the land budget).
5. Derive `arsenalSlotBudget` from `sum(Object.values(quotas))` headroom, not a flat 75%.
6. Harness gate in `scripts/test-deck-builds.ts` / `deck-fitness.mjs`: hard-fail any build where a capped role exceeds `quota + headroom`. Nothing catches this today.

> Re-baseline the auto-improve gate after this lands — `referenceOverlapPct` will move.

---

#### C2 — Classifier regexes match token/reminder/nested text, and the false wipes *suppress real wipe injection* ❌

| Field | Value |
|---|---|
| Confidence | high |
| Reported by | vivi-ornitier (+ 8 other commanders independently) |
| Blast radius | Bag of Holding tagged `board_wipe` in **9 of 11 commanders**; **21 of 27 builds** have inflated wipe counts |

**Mechanism**
- `src/lib/card-classifier.ts:220` — `/return all .* to (?:their|its) owner/i` matches Bag of Holding's *"Return all cards exiled with this artifact to their owner's hand."*
- `src/lib/card-classifier.ts:217` — `/each (?:creature|player|opponent) .* deals? .* damage/i` matches **reminder text** (Duskshell Crawler's trample reminder) → `board_wipe`.
- `src/lib/card-classifier.ts:192` — `/deals? \d+ damage to (?:target|any target)/i` matches text inside **quoted token/emblem grants**: Zurzoth Chaos Rider, Zariel Archduke, Chandra Spark Hunter (−7 emblem), Weapons Manufacturing → `removal`.
- Root cause: `matchesPatterns()` at `card-classifier.ts:249` tests the raw oracle string with no stripping of `"…"` granted-ability spans or `(…)` reminder text.

**Not cosmetic — it changes deck contents.** `deck-builder-constraints.ts:702` fills the wipe quota by category membership; `deck-builder-ai.ts:1655` computes `wipeNeed` from that count while the backfill SQL at `:1660-1672` uses a **stricter, correct** LIKE set. A phantom wipe therefore silently suppresses injection of a real one. Two sources of truth, one wrong.

**Worst cases — ship ZERO real board wipes while reporting quota satisfied:** `mono-g-ghalta` build1 (reported 2 = Bag + Duskshell), `vivi-ornitier` build1 (reported 1 = Bag).

**Fix**
```ts
// Abilities the CARD ITSELF has: drop granted abilities in quotes
// (token/emblem text) and parenthetical reminder text.
const ownAbilities = (o: string) =>
  (o || '').replace(/"[^"]*"/g, ' ').replace(/\([^)]*\)/g, ' ');
```
Use in `matchesPatterns` (`:249`) for REMOVAL/BOARD_WIPE only — keep raw text for `isDrawEngine`, which legitimately reads granted text.

Tighten line 220 to require a battlefield object class:
```ts
/return all (?:\w+ )*(?:attacking |blocking |nonland |non-\w+ )?(?:creatures|permanents|artifacts|enchantments|nonland permanents)\b[^.]*to (?:their|its) owners?'? hand/i,
```
Still catches Cyclonic Rift, Aetherize, Jin-Gitaxias // The Great Synthesis ch. II (all verified true positives).

Tighten line 217: `/each (?:creature|player|opponent)[^.]{0,40}deals? \d+ damage/i`.

Kill the second source of truth: export `isBoardWipe` and have the `deck-builder-ai.ts:1660` backfill filter through it.

**Regression guard** — `src/lib/__tests__/card-classifier.test.ts`: Bag of Holding → not wipe, Duskshell Crawler → not wipe, Zurzoth → not removal, Aetherize / Cyclonic Rift / Jin-Gitaxias → still wipe. Then re-run the harness: real wipe counts will *rise* in 21 builds as the backfill stops being suppressed — verify fitness doesn't regress from wipes displacing payoffs.

---

#### C3 — Arsenal pre-fill bypasses commander anti-synergy strips (`commander_direct_need` @ priority 75) ❌

| Field | Value |
|---|---|
| Confidence | high |
| Reported by | ramos-dragon-engine |
| Reporter's attribution was **wrong** on source and cause; the mechanism is real and worse |

**Real chain**
1. `src/lib/commander-analysis.ts:197-200` — `extractDirectNeeds()` sets `countersMatter = true` from a raw oracle regex `/\+1\/\+1 counter/`. It never consults `synergyProfile`.
2. `src/lib/commander-analysis.ts:512-516` — injects all of `ARCHETYPE_PAYOFFS.counters` at **priority 75**, above the pre-fill cutoff.
3. This is a *parallel* path to `commander-analysis.ts:481-489`, which **does** honour the strips. So `commander-synergy.ts:487-489` (counters + five_colors strip) and `:470-480` (self-buff-only counters, comment literally names Vivi) are **dead for the directNeeds path**.
4. `deck-builder-ai.ts:1553-1573` takes `a.priority >= 55` and only checks `poolByName.has(name)` — it has the scored entry in hand but ignores `.score`, so the `five_colors` `-25` non-gold penalty (`deck-builder-ai.ts:1272-1276`) never applies.

**Live reproduction** (`autoBuildDeck`, commander, full pool):

| Commander | userId | counters cards | arsenal pre-filled |
|---|---|---|---|
| Ramos | undefined | 0 | 0/96 |
| Ramos | 1 | **5** (Evolution Sage, Hardened Scales, Inspiring Call, Hydra's Growth, Conclave Mentor) | 45/96, all `arsenal:commander_direct_need` |
| Vivi | undefined | 0 | 0/96 |
| Vivi | 1 | **1** (The Ozolith) | `arsenal:commander_direct_need` |

Both commanders have the counters trigger correctly stripped from `triggerCategories`, yet both have `directNeeds.countersMatter = true`. Two distinct suppression rules, one shared bypass.

**Corrections to the original report:** source is `commander_direct_need`, **not** `community_top`/`community_synergy`. The standard-vs-collection differential is **not** pool thinning — `deck-builder-ai.ts:1506` gates the whole arsenal on `options.userId !== undefined`, and `scripts/test-deck-builds.ts:165` passes `userId` only in collection mode. Full-pool + userId=1 leaks identically.

**Do not "fix" Magus Lucea Kane** (counterMattersCount 4/5) — its `counters` trigger legitimately survives and its counters cards arrive via `community_top` at 50-59% inclusion. Correct behaviour.

**Secondary defect found:** `src/app/api/decks/auto-build/route.ts:43-53` never passes `userId`, so **the shipped UI builds decks with the entire arsenal system disabled**. File separately.

**Fix**
```ts
// Anti-synergy strips live in analyzeCommander() (five_colors, self-buff-only
// counters). directNeeds re-reads raw oracle text, so it must not resurrect a
// category the profile deliberately dropped.
if (synergyProfile && !synergyProfile.triggerCategories.includes('counters')) {
  directNeeds.countersMatter = false;
}
```
Apply to every `directNeeds.*Matter` flag with a `SynergyCategory` counterpart (artifacts, graveyard, tokens, landfall, lifegain, enchantments). Leave `cmcCeiling`/`selfEvasion` alone.

Defence in depth at `deck-builder-ai.ts:1559` — reject bottom-decile-scored cards below staple priority (`a.priority < 85 && poolEntry.score < scoreFloor`), so the `-25` and `-60` penalties actually bite.

Also: make the harness pass `userId` in **both** modes, otherwise full-pool rows keep testing a code path the arsenal never enters and the gate stays blind.

---

#### C4 — Tutors have no category, no quota, and the one declared tutor floor is dead code ❌

| Field | Value |
|---|---|
| Confidence | high |
| Reported by | vivi-ornitier (and independently by 6 other commanders) |
| Data | **24 of 27 builds ship 0 or 1 tutor**; docs target 5-8 (2-3 budget casual) |

Three independent gaps:

1. **No category** — `src/lib/card-classifier.ts:7-16` `CardCategory` = land\|ramp\|draw\|removal\|board_wipe\|protection\|synergy\|win_condition\|utility. `:175-176` explicitly strips tutors out of `DRAW_PATTERNS`, so they fall to `utility`.
2. **No quota** — `deck-builder-constraints.ts:472-480` (`RoleQuotas`) and `:489-536` (`getRoleQuotas`) have no tutor field. The picker has nothing to target.
3. **ROOT MECHANISM — the declared floor is unreachable.** `deck-templates.ts:314` sets combo's `synergyMinimums: { tutors: 5, combo_pieces: 4, protection: 4 }`. Enforcement at `deck-builder-ai.ts:1730-1732` looks each key up in `SYNERGY_REQUIREMENTS_MAP` (`deck-builder-ai.ts:90-108`, 16 commander-**trigger** keys only) and `continue`s on miss. Set difference computed programmatically: **all 23 template `synergyMinimums` keys** resolve to `undefined` — haste_sources, pump_effects, cheap_interaction, counterspells, board_wipes, tutors, combo_pieces, protection, equipment_or_auras, tribe_members, lords, tribal_payoffs, reanimate_spells, self_mill, big_threats, instants_sorceries, spell_payoffs, cantrips, sac_outlets, death_triggers, token_producers, stax_pieces, mana_denial. **Zero template minimums are enforceable.** Tutors are one instance of a whole dead-config surface.

Only path a tutor enters today: incidental name allowlists — `'worldly tutor'`/`'mystical tutor'`/`'crop rotation'` in `STAPLE_DRAW` (`deck-builder-constraints.ts:344`), `'worldly tutor'` in `DRAW_NAMES` (`card-classifier.ts:185`) — i.e. tutors are **miscounted as card draw**, inflating the very quota the `:175` comment was written to protect.

Zeros across every mode: vivi (standard), magus-lucea-kane (both), mono-b-sheoldred (all 3), mono-g-ghalta (all 3), mono-u-orvar (standard+brawl), mono-w-heliod (standard+brawl), ramos (all 3).

**Fix, smallest-diff first**
1. **Regression guard FIRST** — unit test asserting every `ARCHETYPE_TEMPLATES[*].synergyMinimums` key exists in `SYNERGY_REQUIREMENTS_MAP`. Fails on all 23 today. Consider typing `synergyMinimums` as `Record<keyof typeof SYNERGY_REQUIREMENTS_MAP, number>` so the compiler enforces it.
2. Add a `tutor` `CardCategory` with `TUTOR_PATTERNS = /search your library for (?:up to \w+ )?(?:an?|two|three|X )?(?!.*\bbasic\b)[^.\n]*card/i`, excluding land-fetch (reuse the clause parser in `isDeadLandFetch`, `deck-builder-ai.ts:76-84`) so Cultivate/Farseek stay `ramp`. Add `TUTOR_NAMES` for Gamble, Intuition, Gifts Ungiven, Entomb, Birthing Pod, Eldritch Evolution, Bring to Light.
3. Add `tutor: number` to `RoleQuotas`, populate from a new per-template `tutors: [min,max]` (docs: ~2-3 casual / 5-8 optimized / 5-10 cEDH), scaled by `powerLevel`. Wire through the role picker like ramp/draw.
4. Remove tutors from `DRAW_NAMES` / `STAPLE_DRAW` once (3) lands, or both quotas overshoot.

Cheap cleanup: `deck-builder-ai.ts:958` writes `category` into `cedhStapleMap` and nothing reads it (only `power_tier` at `:1311`). Either consume `cedh_staples` `category='tutor'` rows as a tutor signal, or drop the field. Note `cedhStapleMap` is only built when `powerLevel` is `cedh|optimized`, and `powerLevel` has no default (`:379,:438`) and is never passed by the harness — so it is inert for all 27 builds.

---

#### C5 — Protection quota is a hardcoded constant, and counterspells are billed to a role they cannot fill ❌

| Field | Value |
|---|---|
| Confidence | high |
| Reported by | vivi-ornitier |
| Blast radius | standard mode pins protection at exactly 3/3 in **10 of 12** builds across tribal/control/spellslinger/midrange |

**Mechanism (causal story corrected from the report)**

1. `deck-builder-constraints.ts:522` hardcodes `protection: 3` while every other quota is template-derived (`:496-501`, `:518-524`). Pass-B cap at `:757` is `quotas.protection + 2`, also archetype-blind. `ArchetypeTemplate` in `deck-templates.ts` has **no protection field at all** — there is no data path to vary it.
2. **The amplifier:** counterspells classify as `protection`, not `removal` — `card-classifier.ts:235` (`/counter target (?:spell|ability)/i`) and `:239-245` (`PROTECTION_NAMES` holds counterspell, negate, swan song, force of will, fierce guardianship, pact of negation). But `deck-builder-constraints.ts:501+520` folds the archetype **counterspell budget into the REMOVAL quota** (`removal: Math.max(4, removalTarget + counterTarget - removalReduction)`), which no counterspell can satisfy (`isRemoval` at `:303` needs REMOVAL_NAMES/PATTERNS; "Counter target spell" matches neither). So control (counters 6-12) and spellslinger (5-10) budgets are spent on an **unfillable role**, while the role counterspells actually fill is frozen at 3 / cap 5.
3. **Overshoot past the cap:** the uncapped arsenal pre-fill (see C1) seeds `roleFills` from `preFilled`, so collection builds arrive already past the cap.

**Engine-native evidence** (`decks/test-builds/results*.json` `buildReport.roleFills`, not the harness recount):

| Build | roleFills.protection / quota |
|---|---|
| mono-r-krenko tribal (standard) | 3/3 |
| mono-u-orvar spellslinger (standard) | 3/3 |
| mono-b-sheoldred control (standard) | 3/3 |
| vivi spellslinger (standard) | 3/3 |
| mono-g-ghalta aggro (standard) | 4 (template says 0 counterspells) |
| thrasios control (standard) | 5 (= cap) |
| vivi collection | **8/3** |
| orvar collection | **8/3** |
| thrasios collection | **9/3** |
| magus collection | **6/3** |

Note: the reviewer's stated evidence (`categoryCounts` in `data/review-input`) is a harness re-classification via `getPrimaryCategory` called at `scripts/test-deck-builds.ts:177` **without** `commanderOracle` — it measures display priority, not the engine quota. Engine-native `roleFills` confirms the defect more starkly.

**Fix**
1. Add `protection: [min, max]` to `ArchetypeTemplate` (aggro `[0,2]`, tribal `[1,3]`, midrange `[2,4]`, control `[2,4]`, combo `[4,6]`, voltron `[5,8]`); derive in `getRoleQuotas` (`:518-525`) with the same midpoint pattern as ramp/draw; make the Pass-B cap the template max.
2. **LOAD-BEARING:** split `counterspell` out of `protection` as its own `CardCategory`, give it a dedicated rolePass with `quota = counterTarget`, cap `counterTarget+2`, and drop `+ counterTarget` from the removal quota at `:520`. Without this, blue archetypes stay wrong regardless of the protection constant.
3. Apply role caps inside the arsenal pre-fill (same fix as C1).
4. Gate on per-archetype protection/counterspell **bands**, not `>= quota` — `buildReasoningSummary` currently prints "protection 9/3 OK" for a quota whose intended max is 5.

---

### 2.2 Reported with code cites, not in the adversarial-verify batch (treat as high-confidence, verify before fixing)

| ID | Claim | Cite | Reported by |
|---|---|---|---|
| R1 | **Harness bug:** `referenceMissing` always lists every reference **land** and the **commander itself** as missing, because `buildNames` filters out lands (`scripts/test-deck-builds.ts:232`) while `refNames` (`:229`) is unfiltered before the diff (`:238-240`). Confirmed by direct counterexample in ≥5 commanders (Castle Ardenvale, Breeding Pool, Command Tower, Arena of Glory present in-build yet flagged missing). Inflates every "missing staple" count. Does **not** corrupt `referenceOverlapPct`, which compares nonland cards only. | `scripts/test-deck-builds.ts:229-240` | magus, heliod, krenko, tazri, ghalta |
| R2 | **Mono-color fetch waste:** `isFetchLandRelevant()` (`land-intelligence.ts:23-31`) only checks that *one* fetch target type matches a deck color; it does not discount the fact that in mono-color a fetch is strictly worse than the basic it finds. Fetches get the full +30/+20 color-match bonus (`land-intelligence.ts:263-273`) while colorless utility lands get a flat +5 (`:291`) — a ~90-point gap unrelated to land quality. Recurs in **all five mono-color commanders**. | `land-intelligence.ts:23-31, 263-273, 291` | ghalta, heliod, orvar, krenko, sheoldred |
| R3 | **Taxed filter lands scored as free rainbow lands:** `isConditionalColoredProducer()` (`mana-sources.ts:108-117`) flags only "activated only if" / "entered this turn" / "devotion"; it has no check for an attached mana cost on the color ability, so `{1},{T}: Add one mana of any color` lands keep full `colorBonusScale`. Magus collection ships **7 of 38** such lands; Vivi collection 4+; Meren 5 of 39. | `mana-sources.ts:108-117` | magus, vivi, meren, krenko |
| R4 | **`cedh_staples` is scoped to `format='historic_brawl'` only** — `SELECT DISTINCT format FROM cedh_staples` returns one value across all 120 rows; `getCedhStaples()` (`db.ts:1087-1108`) does `WHERE format = ?` with no fallback. Paper Commander builds get **zero** staple-tier bonus. Compounded by `powerLevel` never being passed (see C4 note), which makes the map inert everywhere. | `db.ts:1087-1108`, `deck-builder-ai.ts:956, 1308-1333` | thrasios-tymna |
| R5 | **3+-color fixing-rock floor excludes Sol Ring and all land-ramp.** `deck-builder-ai.ts:1575-1604` force-adds `min(8, colors.length*2)` rocks from a `talisman of ` / ` signet$` regex + fixed `FIXING_ROCK_ALLOW` set before scored selection. Sol Ring is colorless so it never qualifies; land-ramp spells (Cultivate/Farseek/Nature's Lore/Three Visits) are structurally unselectable. Magus standard: Sol Ring at **88.6% per-commander / 80.7% global inclusion** absent, while Prismatic Lens (1.2%) and Fractured Powerstone (0.3%) are in. | `deck-builder-ai.ts:1575-1604` | magus, thrasios |
| R6 | **Target land count never scales with picked ramp**, contradicting this repo's own Formula Method (`docs/DECK_CONSTRUCTION_RATIOS.md`: "8 mana rocks = remove 4 lands"). `DEFAULT_LAND_COUNT.commander = 38` (`constants.ts:88`) is read at `deck-builder-ai.ts:522` with no ramp input. Thrasios ran 39 lands at ramp 18, 21 and 29 alike — collection build spends **68 of 99 slots on lands+ramp** while removal is 4. | `constants.ts:88`, `deck-builder-ai.ts:522` | thrasios |
| R7 | **`tribal_lands` synergy trigger never fires for token-generator tribal commanders.** `commander-synergy.ts:165-173` gates on the *commander's own* text matching `choose a creature type` / `[Type]s you control get +` / `creature of the chosen type` / `share a creature type`. Krenko matches none, so Coat of Arms, Cavern of Souls, Herald's Horn, Urza's Incubator, Door of Destinies (all in the curated payoff list at `deck-builder-constraints.ts:301-306`) never get the +15 bonus. Absent from all 3 Krenko builds. | `commander-synergy.ts:165-173` | krenko |
| R8 | **Tribal payoff fetch is tribe-name-substring only.** `fetchTribalCards` (`deck-builder-ai.ts:305-330`) does `LIKE '%ally%'`, so generic "choose a creature type" kindred cards (Kindred Discovery, Kindred Summons, Reflections of Littjara, Retreat to Emeria) are never in the tribal pool and get no +30/+15 bonus or displacement protection (`:1140-1149`, `:1774`). Would identically break Slivers / Goblins / Zombies / Elves. | `deck-builder-ai.ts:305-330` | tazri |
| R9 | **False `five_colors` trigger from cost symbols.** `TRIGGER_PATTERNS.five_colors` (`commander-synergy.ts:77`) = `/\{w\}.*\{u\}.*\{b\}.*\{r\}.*\{g\}/i` matches General Tazri's *activated ability cost* `{W}{U}{B}{R}{G}:`, firing the `deck-builder-ai.ts:1256-1287` branch: `-25` to every mono-colored nonland, `+24` to cheap rainbow rocks. Directly penalizes the mono-colored Ally payoffs and lords Tazri needs. Will misfire on any commander with a WUBRG-ordered symbol run in a cost. | `commander-synergy.ts:77`, `deck-builder-ai.ts:1256-1287` | tazri |
| R10 | **`hasCommanderSynergy()` cannot flag tribal.** Its mechanics list (`card-classifier.ts:338-354`) has no creature-type entry, so the `synergy` category (target 8-12) is structurally **unfillable** for typal commanders. Tazri shipped 0 of 61 synergy cards. | `card-classifier.ts:338-354` | tazri |
| R11 | **`isRemoval()` `/exile target/i` has no "you control" exclusion**, so self-flicker (Ephemerate, Cloudshift, Eerie Interlude, Restoration Angel) counts as removal. Verified in-DB for Ephemerate and Cloudshift; both tagged `removal` in the Tazri build. Also Staff of Compleation ("destroy target permanent you own") in the Magus build. | `card-classifier.ts:191` | tazri, magus |
| R12 | **Classifier coverage holes:** Arbor Elf (`{T}: Untap target Forest.`) is neither in `RAMP_PATTERNS` (`:143-167`) nor `RAMP_NAMES` → tagged `utility`. Ram Through (fight-equivalent without the word "fight") is neither in `REMOVAL_PATTERNS` (`:189-203`) nor `REMOVAL_NAMES` (`:205-212`) → `utility`. K'rrik-style alt-cost life payment isn't recognized as ramp. | `card-classifier.ts:143-212` | ghalta, sheoldred |
| R13 | **Land tiers are not archetype-aware for mono-color.** `land_classifications` rows for Cabal Coffers / Cabal Stronghold / Nykthos are flat `tier:3` — identical to generic utility lands like Geier Reach Sanitarium — with no field to boost them where they are mana-**doublers**. Absent from all Sheoldred builds despite being format-legal. | `land_classifications` table | sheoldred |
| R14 | **Format-blind archetype construction.** Ramos paper Commander and Historic Brawl builds share **40+ identical nonland picks**; the brawl build runs 1 gate-typed land against a winning reference that runs 17+. The format-specific fixture (`ramos-dragon-engine--brawl-winning-reference.txt`) is used by the offline harness only, not the live build pipeline. | — | ramos |
| R15 | **Doc-vs-template drift.** `deck-templates.ts` tribal sets ramp 10-12 / draw 8-12 while `docs/DECK_CONSTRUCTION_RATIOS.md` TRIBAL says ramp 4-6 / draw 3-5. All 3 Krenko builds landed at 10-11/10 — matching the template, not the doc. Same shape for the `control` template baking in a **6-12 counterspell** requirement a mono-black deck can never fill (`deck-templates.ts:264-270`), pushing Sheoldred to 24 total interaction against its own `totalMax:20`. | `deck-templates.ts:264-270, 360-391` | krenko, sheoldred |

### 2.3 REFUTED — do not re-chase

| Claim | Why refuted |
|---|---|
| **0-1cmc one-shot fast mana (Moxen, Lotus Petal, Simian Spirit Guide, Thought Vessel) is systematically outscored by repeatable rocks.** | No fast-mana penalty exists anywhere in the engine. The ordering is a category-agnostic tier ladder (`deck-builder-ai.ts:1083-1092`, inclusion_rate → +70/+50/+35/+20/+10). For Vivi the cut line fell between the 0.40 and 0.25 tiers and cut **repeatable** rocks at the same time (Izzet Signet 0.397, Fellwar Stone 0.305, Thought Vessel 0.283 alongside Lotus Petal 0.383, Mox Amber 0.324, Chrome Mox 0.280). Counterexample: **thrasios-tymna standard picks Lotus Petal, Chrome Mox AND Mox Amber** while dropping repeatable Fellwar Stone, because commander stats put the Moxen in the +70 tier. The claim's premise is also factually wrong — Fellwar Stone and Izzet Signet are *not* in the Vivi build; they are in `referenceMissing` next to the Moxen. And the "class" is incoherent: Thought Vessel is a CMC-2 repeatable rock, Simian Spirit Guide is CMC 3. **Adding a fast-mana bonus would regress thrasios-tymna.** The real root cause of the report is a fixture mismatch: `scripts/test-deck-builds.ts:161-168` calls `autoBuildDeck` with no `powerLevel`, while `data/review-input/vivi-ornitier.json`'s reference is a **cEDH storm list** — 60 missing reference cards including the entire Force of Will / Grapeshot / Brain Freeze package. Fast mana is a symptom of the power-level gap. |

Two optional, category-agnostic follow-ups from that investigation (not defects): smooth the tier cliff at `deck-builder-ai.ts:1083-1092` (15 points discarded across a 0.003 gap) — same cliff at `:1350-1358`; and fix the Vivi reference fixture (swap to a mid-power EDHREC-consensus list, or pass `powerLevel` per scenario) or every cEDH-referenced commander keeps generating phantom missing-staple findings in every category.

---

## 3. Per-Commander Reviews

### 3.1 Vivi Ornitier — UR spellslinger

**Build 1 — commander / standard — B-**
Genuinely leans into cheap noncreature spells with real payoffs (Guttersnipe, Niv-Mizzet Visionary, Murmuring Mystic, Locust God). Lands/ramp/removal all healthy; manabase clean (one true tapland). But protection collapses to **2** for a commander whose whole plan is surviving and snowballing, tutors are **0**, and the curve has a dead 5-CMC zone next to a 6-7 pile.

| Ratio | Actual | Target | |
|---|---|---|---|
| Lands | 38 | 35-38 | ✅ |
| Ramp | 11 | 10-12 (spellslinger doc says 3-5) | ✅ |
| Draw | 20 | 6-10 spellslinger / 10-12 general | ❌ ~2x |
| Removal | 14 | 8-12 | ✅ |
| Board wipes | 2 reported / **1 real** | 2-4 | ❌ (C2) |
| Protection | 2 | 3-6 (engine's own quota 3) | ❌ |
| Win conditions | 3 | 4-6 | ⚠️ |

Top defects: Bag of Holding (C2 false wipe, med) · Zurzoth Chaos Rider (C2 false removal, med) · Elementalist's Palette (clunky 3-mana ramp, low) · Hangarback Walker (no spell-cast interaction, low) · Comet Storm (low).

Missing staples: Lightning Greaves/Swiftfoot Boots, Force of Will / Force of Negation / Fierce Guardianship / Pact of Negation (**C5** protection ceiling — all correctly in `PROTECTION_NAMES`, never surface) · Mystical Tutor / Gamble (**C4**) · Stormcatch Mentor, Birgi, Underworld Breach, Coruscation Mage (candidate-pool/data — needs a stats check; Coruscation Mage losing to near-identical Guttersnipe is unexplained) · Hexing Squelcher (**C5**).

Manabase: 38 lands, 20 basics (11 Island / 9 Mountain tracking a U-heavier pip load), 5 fetches but only 2 real UR duals to find — functional, thin on targets.

Fixes: cut 4-5 of the 20 draw spells (Idol of Oblivion, Uthros Research Craft weakest) → Greaves/Boots + 2 free counters · add 2-3 tutors · add Stormcatch Mentor + Birgi · cut a 6-drop, backfill the 5-slot · fix the Bag of Holding tag and add Blasphemous Act.

**Build 2 — commander / collection — C+**
Good substitution work: protection **over**-delivers (7: Fierce Guardianship, Deflecting Swat, Hexing Squelcher, Swiftfoot Boots — note this is the C5 cap bypass), removal and ramp in range, smart MDFC/modal land use (Shatterskull Smashing, Sundering Eruption) to stretch spell slots. The problem is the curve: **40 of 61 nonland cards (66%) at CMC 0-2**, valley at 3-4, avgCMC 2.39 vs a 2.8-3.5 target. Real board wipes = **0** after C2 correction. Narrow flavor-reskin fillers (Sokka's Haiku, Zuko's Exile) occupy mid-curve slots; 3-4 taxed any-color filter lands (Rumble Arena, Daily Bugle Building, Capital City) cost 2 mana for 1 colored (R3).

Fixes: trim CMC2 by 4-6 into the 3-4 valley · flag for a real wipe · swap a CMC5 Lesson reskin for a noncreature-trigger payoff · consolidate taxed filter lands to 2.

---

### 3.2 Ramos, Dragon Engine — 5c multicolor charms

**Build 3 — commander / standard — B-**
The 2026-06-21 identity fix is **holding**: 47/61 gold spells (reference target ~50), avgCMC 3.36, 42/61 nonland at CMC 2-3, `counterMattersCount: 0`. 5 of 11 curated `MANA_SINK_PAYOFFS` present.

Then it ships **zero protection** (categoryCounts has no `protection` key at all — see C5) for a commander whose plan is loading counters onto himself, over-invests in single-target removal (removal 18 + wipes 4 = 22 vs a 13-16 target), and runs 3 shocklands with **White having no dedicated dual** and only **1 fetch** vs a 4-5 target. ~10-12 of 38 lands are ETB-tapped/conditional, fighting a turn-2-gold-spell plan.

Defects: entire protection role (**high**) · Deathrite Shaman (only 3 basics of the right types, 2 of 3 abilities dead — med) · Maelstrom Nexus (randomizes your *own* trigger order — med) · Conflux (8-mana top end, low) · Niv-Mizzet the Firemind redundant with Parun (low).

Missing: Dovin's Veto (**C5** + `removal` rolePass runs before `protection`, siphoning dual-classified cards) · Jodah / Timeless Lotus / Bring to Light (in `MANA_SINK_PAYOFFS`, should get +45, but arsenal pre-fill eats 75% of slots before Pass B runs — **C1**) · fetches (R2-adjacent: rainbow lands outscore 1-2-color fetches) · 3 more signets/talismans (blocked by the 8-rock hard cap, **R5**).

**Build 4 — brawl / standard — C+**
Mechanically sound as a generic multicolor midrange pile — and that's the problem. It is **a near-copy of the paper build** (40+ identical nonland picks) and completely misses the **Gates / Maze's End hybrid** that is this commander's documented *winning* Historic Brawl strategy. Runs 1 gate-typed land (A-Thran Portal) vs a reference with 17+. `commander-synergy.ts` `TRIGGER_PATTERNS` has **no `gate` pattern**, so the theme cannot be inferred from oracle text at all (R14/R7 family). Also 0 protection, 0 tutors, Chromatic Orrery at 7 mana in a cheap-gold-spell deck.

Fixes: add a `gate` trigger pattern + gate-count payoff bonus · **wire the format-specific reference into the live build pipeline, not just the offline harness**, so brawl and paper can diverge · force 2-3 protection · 1-2 tutors.

**Build 5 — commander / collection — C-**
Best manabase of the three (9/10 shocks owned, 3 fetches + 3 generic fetches, 34% reference overlap). But the spell slots are broken: **ramp 24** (vs quota 12, Pass-B cap 16 — **C1**), **draw 5** (vs 8-12), and **5 counters-matters cards** (Evolution Sage, Hardened Scales, Kami of Whispered Hopes, Inspiring Call, Hydra's Growth) — a direct violation of this commander's own documented design rule and the harness's `COUNTERS_MATTERS` gate. Root cause verified as **C3** (`commander_direct_need` @ priority 75 bypassing the five_colors strip), **not** pool thinning as originally suspected.

Fixes: cap arsenal ramp to `quota+headroom` · filter `COUNTERS_MATTERS` against the pre-fill list, not just the scored pool · redirect the ~8 excess ramp slots to draw.

---

### 3.3 Magus Lucea Kane — Temur counters / Tyranid ramp

**Build 6 — commander / standard — C+**
Coherent Temur counters shell; the Tyranid package (Hardened Scales, Branching Evolution, Aberrant, Zoanthrope, Tervigon, Broodlord) genuinely synergizes with the combat-counter trigger, and X-spell payoffs (Crackle with Power, Walking Ballista) exploit the copy ability. 36/61 nonland are creatures (~59%) — this is creature-tribal, not the "spellslinger" label the engine assigned.

Two structural gaps: **zero real protection** (the 3 tagged cards — Mistcutter Hydra, Rhythm of the Wild, Altered Ego — only say "can't be countered"; verified false positives on `PROTECTION_PATTERNS` `/can't be (?:the target|destroyed|countered)/i`), and **Sol Ring absent** at 88.6% per-commander inclusion (**R5**).

Defects: Prismatic Lens / Fractured Powerstone (1.2% / 0.3% meta inclusion, forced in ahead of Sol Ring — **high**) · Verdant Catacombs / Windswept Heath (no Swamp or Plains in deck; can only find a Forest — **high**) · fake protection trio (med) · Staff of Compleation ("destroy target permanent **you own**" counted as removal — med, R11) · Zurzoth (C2 token-text removal — med) · Simic Signet / Talisman of Curiosity (GU-only, don't cast the commander's own {R} pip — low).

Missing: Sol Ring (R5) · Lightning Greaves / Swiftfoot Boots (quota satisfied by the false positives — **proven by the collection build, which lacks those creatures and correctly picks both**) · The Ozolith (+0.18 synergy, crowded out by a 17-slot removal category) · Twinning Staff (**+0.30, the single highest synergy score of any nonland for this commander**) · Cultivate/Farseek/Nature's Lore/Rampant Growth/Three Visits (R5 — the fixing floor structurally cannot select land-ramp).

**Build 7 — commander / collection — B-**
Sensible substitution for a thin, mostly-unowned 40K Tyranid pool; ~24 of the tribal package is verifiably unowned. Ships a **complete, real protection suite** (Greaves, Boots, Heroic Intervention, Counterspell) — the standard build did not. Land ramp present here (Cultivate, Farseek, Rampant Growth), also absent from the standard build.

Flaw is structural, not ownership: **7 of 38 lands (18%)** are pay-{1}-to-filter Town/Cave lands (Capital City, Rumble Arena, Daily Bugle Building, Branch of Vitu-Ghazi, Plaza of Harmony, Forgotten Monument, Captivating Cave) scored as free rainbow (R3). Win conditions = **1**. Curve spikes at 2 CMC (26/61 = 43% vs ~15-17% guideline).

---

### 3.4 Thrasios / Tymna — 4c (WUBG) toolbox

**Build 8 — commander / standard — B-**
Excellent 4c manabase (9 basics, 7 fetches, 6 shocks, 3 ABUR duals, 5 any-color fixers, zero CI leaks) and creature count correctly follows the **control archetype's** 3-8 rather than the generic 15-25. Then it drowns in interaction (18 spot + 6 wipes + 5-6 counter/protection ≈ **29-30** vs a 15-20 control target), ships **0 tutors** for the format's most tutor-hungry pairing, and has **1 win condition** (Seedborn Muse) with no Thassa's Oracle / Lab Man backup despite huge self-draw.

Root cause traced to **R4**: `cedh_staples` has zero `format='commander'` rows, so this build gets **no staple-tier bonus at all** — while the sibling brawl build (which *does* get it) picked up Vampiric Tutor, Enlightened Tutor and Chord of Calling.

Also: The Great Henge at CMC 9 with ~7 creatures and no big attackers · Basalt Monolith and Lightning Greaves both legal, in-DB, and scored off the list · 39 lands + 18 ramp = 57 sources for a 60-card nonland pool (R6).

**Build 9 — brawl / standard — B** — *the engine's best legality work*
Correctly excludes every card actually banned/unavailable in Historic Brawl — Sol Ring, Mana Drain, Oko, Arcane Denial, Kodama's Reach, Nature's Lore, Three Visits, Wild Growth, Fyndhorn Elves, Avenger of Zendikar, Aesi, Coiling Oracle — all verified against `legalities.brawl`. **Keep this as the reference implementation.** Creature 26 (target 22-28 ✅), removal 5 (4-6 ✅), avgCMC 1.98.

One real flaw: **ramp 21 vs a 4-6 aggro target** on a deck whose curve tops out at 3, plus 39 lands vs 34-36. Cultivate, Farseek, Llanowar Elves and Elvish Mystic are all confirmed **brawl-legal** and still absent — they lose to the forced signet/talisman floor (R5).

**Build 10 — commander / collection — C+**
Zero unowned-nonbasic leaks (every non-basic joined against the `collection` table — the critical check, passed). Ratios are the worst of the three: **ramp 29 (29% of the deck) vs removal 4** — an inversion no archetype wants. Several "ramp" picks are marginal value creatures (Zimone, Unlucky Cabbage Merchant, Firemind Vessel, Starting Column, Tundra Tank).

**Lightning Greaves ×2 and Sylvan Library ×2 are confirmed owned and were not picked** — auto-include-caliber cards losing to ramp-category overflow. Same failure shape as the documented Ramos collection bug, different category (**C1**).

---

### 3.5 Heliod, Sun-Crowned — mono-white lifegain / counters

**Build 11 — commander / standard — B**
Correctly centers Heliod's real ability (lifegain → counters) with real payoffs (Archangel of Thune, Ajani's Pridemate, Voice of the Blessed) and includes the genuine **Heliod + Walking Ballista** infinite combo. Ramp 11 ✅, draw 12 ✅, interaction 17 (13-16, slight over), win conditions 9 vs 4-6 (over, partly justified by double-duty lifegain payoffs), **protection 2 vs a hardcoded floor of 3** (C5).

Manabase is the concrete failure: **4 fetches (Flooded Strand, Windswept Heath, Marsh Flats, Arid Mesa) can only ever find a Plains** and function as tapped Plains that cost 1 life; City of Brass is a strictly worse painted Plains (R2). Meanwhile Hall of Heliod's Generosity and Nykthos are absent.

Missing: Esper Sentinel · Mother of Runes (**not in the 15-card curated `STAPLE_PROTECTION` allowlist**, `deck-builder-constraints.ts:397-403`) · Sun Titan · Ranger-Captain of Eos / Ranger of Eos / Recruiter of the Guard (**C4** — no tutor role) · Hall of Heliod's Generosity · Nykthos (devotion isn't a land-scoring signal). All six verified in-DB and format-legal.

**Build 12 — brawl / standard — B**
Correct Arena re-cut: paper-only staples (Hall of Heliod's, War Room, Austere Command, Generous Gift, The Gaffer, Suture Priest, Cosmos Elixir) absent **for the right reason**. Ramp 11 and draw 10 land exactly on the 10-source baseline. Curve has a real dip: 2cmc 18 vs 3cmc 10 where they should be near parity. Same 4-fetch waste. Esper Sentinel, Mother of Runes, Sun Titan, Grand Abolisher all confirmed brawl-legal and still missing.

**Build 13 — commander / collection — B-**
Best-calibrated ratios of the three (protection 4 ✅, win conditions 6 ✅, removal 10 ✅). No off-color or unowned leaks. Two real issues, neither an ownership constraint:
- **4 tapped/life-cost "choose a basic type" lands** (Cabaretti Courtyard, Brokers Hideout, Thran Portal, Multiversal Passage) all resolve to Plains-only, chosen despite `deck-builder-ai.ts:573-576` confirming basic Plains are **always available in unlimited quantity even in collection mode**. Pure downgrade (R2).
- A Voltron aura sub-package (Ethereal Armor, All That Glitters) with **no hexproof/indestructible carrier** — high 2-for-1 risk.

Curve is front-loaded: CMC2+3 = 36/60 = 60% (target ~24-28 combined), CMC4 = 7, CMC6+ = 1.

---

### 3.6 Orvar, the All-Form — mono-U

**Build 14 — commander / standard — B-**
Orvar's actual payoff is genuinely represented — Leap, Shimmering Mirage, Cerulean Wisps, Shadow Rift, Twiddle, Thermal Flux, Aquitect's Will, Mind Games all target only your own permanents; Vesuvan Duplimancy and Osgood duplicate the theme. Talrand / Murmuring Mystic / Sai / Thopter Spy Network give a coherent flier-swarm axis.

Then it skips **three of the most auto-include blue staples in the format** — Rhystic Study, Mystic Remora, Cyclonic Rift — all commander-legal and in the DB. Cyclonic Rift is the sharpest: it is **hardcoded by name in `BOARD_WIPE_NAMES`**, so classification knows it's premium, yet selection never surfaces it. Ramp 10 vs a 3-5 spellslinger target; draw 23 vs a ~18 ceiling; **true counterspells = 2** for a deck the engine itself tagged `control` (target 8-12); tutors 0.

Manabase: 38 lands, mono-U clean, zero taplands — but **4 fetches that can only find an Island** and **0 of 8** commander-legal colorless utility lands (Reliquary Tower, Otawara, Riptide Laboratory, Mystic Sanctuary, Swarmyard) (R2).

**Build 15 — brawl / standard — C+**
Functional mono-U value/tempo pile, but **zero of Orvar's trigger fodder made it in** — no Twiddle, Leap, Cerulean Wisps, Shadow Rift, Mind Games. Most of that cycle is confirmed `not_legal` in Historic, so that part is a **pool ceiling, not an engine bug**. Sol Ring, Propaganda, Fellwar Stone, Thought Vessel, Cloud of Faeries, Spellseeker, Cloudpost, Arcane Denial all correctly excluded per DB legalities.

What *is* a clear gap: **Rhystic Study and Mystic Remora are both `historic: legal` / `brawl: legal`** and still 0-for-3 across every build. Otawara and Riptide Laboratory likewise `historic: legal` and missing.

**Build 16 — commander / collection — C+**
Clean ownership (Fierce Guardianship, Mana Drain, Agatha's Soul Cauldron, Cavern of Souls, Command Tower all spot-checked owned; no leaks). Best tutor count of the three (1 — Mystical Tutor). But **1 win condition** (Murmuring Mystic) in a 99 running 21 draw / 14 removal / 7 protection — no plan to actually close. Ramp 12 vs 3-5.

Defects: Thaumaton Torpedo (6cmc conditional removal with no Spacecraft package, med) · Starting Column (Speed mechanic never turns on, low) · **Dress Down** (strips abilities from *all* creatures — turns off your own Murmuring Mystic trigger, low).

---

### 3.7 Sheoldred, the Apocalypse — mono-black control / punisher

**Build 17 — commander / standard — B-**
The best *strategic* read in the batch: Howling Mine + Font of Mythos + Teferi's Puzzle Box feed symmetric draw into Underworld Dreams + Fate Unraveler + Sheoldred's own trigger. Removal suite deep (18 spot + 6 wipes). Curve peak correctly at CMC 2-3.

But: **0 tutors** (C4), **1 protection** (C5 — the `control` template has no protection floor, unlike combo/voltron), 7 cards at CMC7+ vs a 3-4 target with only 2 at CMC6, and avgCMC 3.8 at the top of the band. Interaction 24 exceeds the control template's own `totalMax: 20` — consistent with the scorer filling an **unreachable 6-12 counterspell quota** with extra spot removal (R15/C5).

Defects: City of Brass in a 100% mono-black manabase (pure downside — **high**) · Kozilek CMC10 with no Coffers package (med) · Chromatic Orrery 7-mana any-color in mono (med) · Damnable Pact (worse rate than the absent Night's Whisper/Read the Bones; also miscategorized `utility`) · Font of Mythos + Puzzle Box + Howling Mine all three (low).

Missing: Demonic Tutor, Vampiric Tutor (C4) · Cabal Coffers / Urborg (R13, flat tier:3) · **Gray Merchant of Asphodel** (the defining mono-black devotion payoff, absent from all 3 builds) · Night's Whisper / Read the Bones · Bolas's Citadel · **Exquisite Blood** — Sanguine Bond *is* in the deck and the pair is a recognized 2-card near-inevitable win; the combo isn't tagged as a unit.

**Build 18 — brawl / standard — B-**
Best protection package of the three (Greaves + Boots + Shadowspear) and picks up strong black value creatures the paper build missed (Rankle, K'rrik, Midnight Reaper, Harvester of Souls). Tagged `midrange` but plays like control. avgCMC **3.72** exceeds both the doc's HB-midrange band (3.0-3.5) and its own template target (2.8-3.2) — nearly a fifth of the 61 nonland cards sit at 5+ CMC in a 20-40 minute 1v1 format. Demonic Tutor's absence is **correct** (banned); Vampiric Tutor is legal and still absent. K'rrik's alt-cost life payment isn't recognized as ramp (R12).

**Build 19 — commander / collection — B**
Executes the hard constraint well. Zero CI leaks, zero unowned nonbasics. Ratios stay near control targets (ramp 11, draw 17, removal 16, wipes 6) rather than collapsing into on-color filler — the engine compensates for missing bombs with more/cheaper interaction, which is the right call. avgCMC 2.78 reflects the pool, not a defect. 40 lands, only 1 true tapland.

One thing to check: **Sol Ring absent from a 3,500-card collection** is surprising enough to warrant a **printing-variant join check** on the collection name-match before concluding non-ownership.

---

### 3.8 Krenko, Mob Boss — mono-red goblins ⭐ *best builds of the batch*

**Build 20 — commander / standard — B+**
40 creatures, 38 lands, avgCMC 2.69, full Krenko package: Krenko Tin Street Kingpin, Kiki-Jiki, Muxus, Fable of the Mirror-Breaker, four tribal lords (Warchief/Chieftain/King/Hobgoblin Bandit Lord), Skullclamp for the token→cards loop. Board-verified **72% reference overlap, understated by the R1 harness bug** (Arena of Glory, Castle Embereth, Three Tree City are all present yet flagged missing) — true overlap is high-70s.

Two genuine weaknesses: one misclassified wipe slot (Bag of Holding, C2) and **Coat of Arms absent** — the format's best mono-tribe payoff. Root-caused to **R7**: `tribal_lands` gates on the *commander's* text matching an anthem/"choose a creature type" pattern; Krenko's token-generation text matches none, so Coat of Arms, Cavern of Souls, Herald's Horn, Urza's Incubator and Door of Destinies never get their +15 — even though `detectTribalTheme()` independently and correctly identifies him as goblin-tribal.

Also: Ashling Flame Dancer tagged ramp but needs 2-3 instant/sorcery casts per turn in a deck with ~5 total · 4 fetches that can only find a Mountain (R2) · Village Pillagers counted as a wipe (1 damage to each opposing creature).

**Build 21 — brawl / standard — B+**
The raw 64% overlap is **misleading**: 19 of 32 `referenceMissing` entries are verified `brawl: not_legal` (Sol Ring, Skullclamp, Kiki-Jiki, Goblin King/Lackey/Recruiter/Chirurgeon, Mogg War Marshal, Warren Instigator, Treasure Nabber, Coat of Arms, Patriar's Seal, Vandalblast, Boggart Shenanigans, Quest for the Goblin Lord, Massive Raid, Battle Hymn, Brightstone Ritual, Path of Ancestry, Goblin War Strike). No brawl-specific reference fixture exists for Krenko, so the harness fell back to the paper list. Strip that noise and it's a tight 38-creature Arena-legal swarm with `illegalCardsForFormat: []`.

Real gaps: Ruby Medallion, Raid Bombardment, Lightning Bolt/Abrade, and the whole brawl-legal tribal-support package (Cavern of Souls rank 113, Herald's Horn 141, Urza's Incubator 311, Door of Destinies 1100) — all R7.

**Build 22 — commander / collection — B-**
Good substitution reasoning given that nearly every marquee lord is verifiably unowned: it finds a different coherent line (Ashnod's Altar sac outlet + Jeska's Will / Seething Song rituals + Fiery Confluence as a real wipe + 10 removal). Creature count 27 dips just under the tribal floor — a direct consequence of missing lords, not an engine error.

Concrete defect is the manabase — three **owned** lands chosen over a basic Mountain:
- **Cori Mountain Monastery** — enters tapped unless you control a Plains or Island. Impossible in mono-red, so it **always** enters tapped (**high**).
- **Multiversal Passage** — 2 life or tapped, zero fixing benefit (med).
- **Thran Portal** — conditional-tapped plus 1 life per activation (med).

Plus Agatha's Soul Cauldron in a deck with `counterMattersCount: 0`.

---

### 3.9 Ghalta, Primal Hunger — mono-green stompy

**Build 23 — commander / standard — B-**
Legal, clean, would play fine. Resource allocation is the problem: **ramp 19 vs 10-12** and **41 lands vs 35-38** simultaneously — directly contradicting the repo's own "more ramp removes lands" formula (R6). Removal 4. Explicit win conditions 4, though Managorger Hydra, Yorvo, Steel Leaf Champion, Rhonas and Pugnacious Hammerskull are de facto payoffs mis-bucketed as `utility`.

**5 of 41 land slots wasted:** City of Brass (pure life-loss, **high**) + 4 fetches that can only find a Forest (med) — while **all 6** EDHREC-reference green utility lands (Castle Garenbrig, Rogue's Passage, Reliquary Tower, Nykthos, Mosswort Bridge, Cactus Preserve) are absent (R2).

Also: Arbor Elf tagged `utility` not `ramp`, Ram Through tagged `utility` not `removal` (R12). Missing power-matters payoffs Zopandrel and Defiler of Vigor — `commander-synergy.ts`'s 18-category `SynergyCategory` union has **no entry for power/toughness-scaling**, which is this commander's entire mechanic.

**Build 24 — brawl / standard — B-**
Legality filtering correct (Sol Ring properly excluded, verified `not_legal`). Picks up Arena-appropriate value the paper build missed (Toski, Tireless Tracker, Eternal Witness, Kogla). Ramp 19 vs an HB-aggro target of **4-6** (3-4x over); 42 lands vs 34-36. Vexing Bauble has no home in this deck. Castle Garenbrig confirmed brawl-legal and still absent.

**Build 25 — commander / collection — C+**
No unowned or off-color leaks (14 cards spot-checked against the collection table). Removal 7 and draw 11 close to target. But **ramp 24** (worst overage in the batch) and the curve collapses: **24 of 58 nonland cards at exactly CMC2** (peak target 12-14) vs **10 total at CMC4+** — for a strategy whose entire point is reaching a huge top end.

Defects: Chromatic Lantern (5-color fixing rock in mono-green — **high**) · Hedron Archive (same, med) · Kishla Village (untap condition needs an Island or Swamp — always tapped, low) · Thran Portal stacking life cost on top of Hashep Oasis and a fetch (low).

---

### 3.10 Meren of Clan Nel Toth — BG aristocrats

**Build 26 — commander / collection — C+**
Legal, on-color, broadly on-theme (27 creatures inside the 24-34 aristocrats target; Grave Pact, Cauldron of Essence, Zulaport Cutthroat, Deadly Dispute, Village Rites, Warren Soultrader, Midnight Reaper, Grim Haruspex all made it). **Zero CI violations including all 6 MDFCs** — the historical MDFC leak is not present.

But it blows past the engine's own coded caps while undershooting interaction:

| Role | Actual | Quota | Coded cap | |
|---|---|---|---|---|
| Ramp | 18 | 12 | 16 | ❌ |
| Draw | 17 | 10 | 15 | ❌ |
| Removal | 7 | — | — | ⚠️ (archetype floor 6, doc target 10-12) |
| Protection | 2 | 3 | — | ❌ |
| Win conditions | 3 | — | — | ⚠️ (target 4-6) |
| Board wipes | 3 reported / **2 real** | 2-4 | — | ⚠️ (C2) |

Defects: **Vexing Bauble** (counted as draw off a minor rider; its real function is dead in most pods — high) · **Chronicle of Victory** (tribal-lord ETB in a 27-creature deck spanning 8+ types — the anthem never turns on — high) · **Entomb with zero reanimation spells in the 99** — an orphaned half-combo functioning as a weak discard outlet (med) · 5 of 39 lands tap for {C} alone in a deck with BBB (Massacre Wurm) and 1BBB (Grave Pact) costs (R3, med).

Missing staples — **all confirmed absent from the `collection` table**, i.e. legitimate pool constraints, not picking bugs: Sol Ring, Skullclamp, Blood Artist, Viscera Seer, Carrion Feeder, Animate Dead/Reanimate/Buried Alive/Living Death, Deathrite Shaman, Mikaeus, Toxic Deluge, Assassin's Trophy, and 10 BG duals/fetches. Sac outlets sit at ~4 vs the archetype's own `synergyMinimums.sac_outlets = 6` — which, per **C4**, is unenforceable dead config anyway.

New fix specific to this build: **add an orphan-tutor guard** — if a graveyard tutor (Entomb-class) is included, require at least one reanimation spell in the pool, else deprioritize.

---

### 3.11 General Tazri — 5c Allies

**Build 27 — commander / collection — C-** *(worst build in the batch)*
Legal, castable, mana-consistent — and **not an Allies deck**. Only **10 of 26 creatures are Allies** (docs want 60-75% tribal share), **zero** tribal-payoff cards, and **zero** cards in the `synergy` category against a target of 8-12. The freed slots went to **22 ramp/fixing pieces** and generic 5c goodstuff.

Manabase is genuinely strong: 9 of 10 shocklands, 3 true fetches, 3 basic-fetchers, 38 lands, no illegal or CI-leaking cards. Taplands are ~20-25% (slow for a curve-out plan, acceptable under pool constraint).

| Role | Actual | Target | |
|---|---|---|---|
| Ramp | 22 | 11 (tribal doc: 4-6) | ❌ 2x-5x |
| Draw | 7 | 10-12 | ❌ |
| Removal | 10 nominal / **~8 real** | 11 | ⚠️ (R11 blink FPs) |
| Board wipes | 3 | 3 | ✅ |
| Protection | 3 | 3 min | ⚠️ floor only |
| Win conditions | 5 | 5 | ✅ |
| **Synergy** | **0** | 8-12 | ❌ |

Defects: **Door to Nothingness** (activation is `{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}` — two pips of every color plus a sac, dead in a 38-land deck — high) · 3 of the 8 redundant 2cmc rainbow rocks (high) · Progenitus at CMC10 (med) · Risen Reef with only 2 other Elementals (med) · Jegantha maindecked as a vanilla 5-mana 3/3 (low) · Ephemerate/Cloudshift miscounted as removal (low, R11).

Missing — **three separate scoring bugs stacking**: Kindred Summons, Kindred Discovery, Reflections of Littjara, Sokka's Charge, Retreat to Emeria are all present, legal, and mono-colored, so they are hit by **R8** (generic "choose a creature type" wording never enters the tribal pool) **and R9** (`-25` mono-color penalty from a falsely-triggered `five_colors`) simultaneously. Beastcaller Savant, Kazuul Warlord and Firemantle Mage are literal Ally creatures that R8 would catch — but R9's mono-color penalty kills them anyway.

Sol Ring, Herald's Horn, Captain's Claws and Urza's Incubator are plausible ownership gaps, not engine failures.

---

## 4. CF `/recommend` Spot-Check

**Verdict: production-quality for CF-based Commander recs.** API reachable, auth OK, `/health` confirms today's retrain (3,789,422 decks, `v33p-loaded`). All three POSTs returned 200 / 30 recs. No color-identity or legality violations in any list.

| Commander | Quality | Fallback rate (`similar_deck_count = 0`) | Verdict |
|---|---|---|---|
| Krenko, Mob Boss | ⭐ Best | ~23% | Overwhelmingly commander-specific tribal tech, essentially no junk |
| Sheoldred, the Apocalypse | ✅ Strong | **~3%** | Correct, non-obvious "Group Slug / Peer Pressure" archetype match |
| Ramos, Dragon Engine | ⚠️ Weakest | ~27% | Good dragon/5c hits mixed with generic "any powerful 5c legendary" |

**Krenko** — the model reasoned about the *exact activated ability*, not just "popular in red". Impact Tremors (every token ETB = 1 damage per opponent), Mana Echoes (mana per shared-type ETB, ritual enabler), and **Battlemage's Bracers** (copies an activated non-mana ability — literally doubles Krenko's token trigger) are all sharp, non-obvious picks. Plus the lord package (Adaptive Automaton, Warchief, Chieftain, Goblin King, Goblin General), Legion Loyalist, Akroma's Memorial (solves summoning sickness on fresh tokens), Rabblemaster, Matron, Conspicuous Snoop, Kiki-Jiki. **Secluded Courtyard was verified NOT a legality problem** — its "any color" is restricted to a chosen creature type so it adds nothing to color identity. Only mild filler: Goblin Guide (aggro-shell card in a value build), Stoneforge Masterwork.

**Sheoldred** — looks like generic group-hug at first glance (Howling Mine, Font of Mythos, Temple Bell, Dark Deal, Otherworld Atlas) but **this is a correct archetype read, not laziness**: her real text is "whenever you draw, gain 2; whenever an opponent draws, they lose 2," and the input decklist already runs Underworld Dreams, Fate Unraveler and Psychosis Crawler. That package is the textbook Group Slug enabler suite. Sharper still: Damnable Pact (triggers her per card drawn either way), Well of Lost Dreams (converts her draw-triggered lifegain into more draw — a real loop), Erebos (life paid is largely refunded). High `similar_deck_count` on Crypt Ghast (50) and Damnable Pact (50) confirms archetype consensus. Two misfires: **Zenith Chronicler** (triggers on "first multicolored spell each turn" — near-dead in mono-black, mostly benefits opponents) and **Teferi's Puzzle Box** (self-labeled "Commander synergy" with **0** similar-deck support; actively disrupts your own Damnable Pact / Peer into the Abyss sequencing).

**Ramos** — roughly a third of the list is noise. Confirmed dead card: **Gishath, Sun's Avatar** (payoff requires putting Dinosaurs into play; deck has zero). Weak-density: **Coat of Arms** with only ~4 Dragon creatures. Generic "Sol Ring effect" pulls with no tie to the cost-reduction plan: **Yidris, Zur the Enchanter, Najeela**. Genuinely good: Chromatic Orrery, Jodah the Unifier, the three Niv-Mizzets, Two-Headed Hellkite, Chromanticore, Thoughtcast/Thought Monitor (affinity off the heavy rock package), Fabricate, Primeval Spawn.

**Pattern:** fallback rate correlates with rec quality. Sheoldred (high-volume Standard-legal commander, deep training signal) has 3% fallback and near-zero junk; Ramos's 27% fallback picks are where the misfires cluster. **Wide color identity invites generic-staple noise.** Actionable: tighten the "any strong N-color legendary" long tail for 4-5c commanders — condition content-based fallback recs on functional tie-in, not just color legality.

---

## 5. Prioritized Backlog

Ranked by expected impact on deck quality. This is what the auto-improve loop and future sessions work from.

| # | Action | Tag | Why it's ranked here |
|---|---|---|---|
| 1 | **Enforce role caps in the arsenal pre-fill** (C1): hoist `getRoleQuotas` above `deck-builder-ai.ts:1550`, extract `roleCapsFor()` from `deck-builder-constraints.ts:752-758`, reject at-cap arsenal cards, fold the fixing floor into the same ramp counter, skip land-type arsenal cards, derive budget from quota headroom. | [engine] | Single root cause of the worst ratios in ≥6 commanders (ramp 24-29, draw 5, removal 4). Fixes the most builds per line changed. |
| 2 | **Scope classifier regexes to the card's own abilities** (C2): add the `ownAbilities()` quote/paren stripper to `matchesPatterns` for REMOVAL/BOARD_WIPE; tighten `:220` to battlefield object classes and `:217` to a 40-char window; export `isBoardWipe` so the `:1660` backfill and the quota accountant agree. | [engine] | 21 of 27 builds report inflated wipe counts; **2 builds ship zero real wipes** because a phantom wipe suppresses backfill. Cheap, high-certainty. |
| 3 | **Add a `tutor` category + quota, and fix the dead `synergyMinimums` surface** (C4): regression test first (all 23 template keys currently unreachable), then `CardCategory.tutor` + `TUTOR_PATTERNS`/`TUTOR_NAMES`, `RoleQuotas.tutor`, per-template `tutors: [min,max]`, and remove tutors from `DRAW_NAMES`/`STAPLE_DRAW`. | [engine] | 24/27 builds ship 0-1 tutors against a 5-8 target. The dead-config finding is bigger than tutors — **no template minimum is enforceable today.** |
| 4 | **Reconcile `directNeeds` with `synergyProfile`** (C3): `commander-analysis.ts` — clear any `directNeeds.*Matter` flag whose `SynergyCategory` was stripped. Add a score floor to the pre-fill at `deck-builder-ai.ts:1559`. | [engine] | Directly resolves the Ramos `counterMattersCount: 5` hardFail against the project's own regression gate. Do **not** touch Magus (its counters trigger is legitimate). |
| 5 | **Split `counterspell` out of `protection`; make protection template-driven** (C5): add `protection: [min,max]` to `ArchetypeTemplate`, new `counterspell` CardCategory + rolePass, drop `+ counterTarget` from the removal quota at `deck-builder-constraints.ts:520`, gate on bands not `>= quota`. | [engine] | Protection is pinned at exactly 3 in 10/12 standard builds; blue archetypes spend their counter budget on an unfillable role and over-stack spot removal. |
| 6 | **Fix the harness `referenceMissing` land/commander false positives** (R1): filter lands out of `refNames` at `scripts/test-deck-builds.ts:229` the same way `buildNames` is filtered at `:232`. | [reference] | Not a deck defect, but it inflates every "missing staple" count across all 11 commanders and will keep sending future sessions chasing ghosts. Trivial diff. |
| 7 | **Discount fixing-irrelevant lands in mono-color decks** (R2): make `isFetchLandRelevant()` account for dead fetch halves; penalize painlands/rainbow lands when `colors.length === 1`; raise the flat +5 colorless-utility fallback at `land-intelligence.ts:291`. | [engine] | Recurs in **all five** mono-color commanders — 4-5 wasted land slots each, while on-theme utility lands go 0-for-8. |
| 8 | **Cost-tax detection for filter lands** (R3): add an attached-mana-cost check to `isConditionalColoredProducer()` (`mana-sources.ts:108-117`) so `{1},{T}: Add one mana of any color` stops scoring as a free rainbow source. | [engine] | 7/38 lands in one build, 5/39 in another. Real tempo tax, easy predicate. |
| 9 | **Populate `cedh_staples` for `format='commander'`** (R4) and pass `powerLevel` through the harness / auto-build route. | [data] | Paper Commander — the flagship format — currently gets **zero** staple-tier scoring signal. Explains the tutor/counterspell/fast-mana gaps in paper builds that the brawl builds don't have. |
| 10 | **Make the fixing floor score-competitive instead of allow-listed** (R5): let Sol Ring and land-ramp spells (Cultivate/Farseek/Nature's Lore/Three Visits/Rampant Growth) compete for the 3+-color rock slots. | [engine] | Sol Ring at 88.6% per-commander inclusion loses to Prismatic Lens at 1.2%. Land-ramp is structurally unselectable for every 3+-color deck. |
| 11 | **Fix `userId` plumbing**: pass it in both harness modes (`test-deck-builds.ts:165`) and in `src/app/api/decks/auto-build/route.ts:43-53`. | [engine] | **The shipped UI currently builds decks with the entire arsenal system disabled.** Also makes full-pool harness rows representative so the gate can see C3-class bugs. |
| 12 | **Generalize tribal detection** (R7 + R8 + R10): add a `gate` and a power/total-power `SynergyCategory`; let `tribal_lands` fire from `detectTribalTheme()` rather than only the commander's own anthem text; extend `fetchTribalCards` past tribe-name substrings to generic "chosen creature type" wording; add a creature-type entry to `hasCommanderSynergy()`. | [engine] | Owns three whole build failures: Krenko's missing Coat of Arms/Cavern package, Tazri shipping 0 synergy cards and 0 tribal payoffs, and Ramos brawl missing its winning Gates plan. |
| 13 | **Scope the `five_colors` trigger to cast-context** (R9): require the WUBRG regex at `commander-synergy.ts:77` to hit a spell-cast/reward clause, or exclude activated-ability cost strings; suppress the mono-color `-25` when a tribal theme is also detected. | [engine] | Actively inverts card quality for Tazri and any commander with WUBRG-ordered symbols in a cost. |
| 14 | **Wire format-specific references into the live build pipeline** (R14), not just the offline scoring harness. Add a brawl reference fixture for Krenko while there. | [reference] | Ramos paper and brawl are 40+ cards identical; the brawl build cannot reach the strategy the user has actually won with on Arena. Krenko's brawl overlap is understated by ~19 falsely-flagged paper-only cards. |
| 15 | **Scale target land count with picked ramp** (R6): read the ramp count at `deck-builder-ai.ts:522` instead of the static `DEFAULT_LAND_COUNT` constant, per the repo's own Formula Method. | [engine] | Thrasios collection spends 68/99 slots on lands+ramp while removal is 4. Ghalta runs 41 lands at 19-24 ramp. |
| 16 | **Reconcile doc targets with `ARCHETYPE_TEMPLATES`** (R15): tribal ramp/draw (template 10-12/8-12 vs doc 4-6/3-5); make the `control` counterspell requirement conditional on blue being in the identity. | [data] | Two sources of truth producing ~2x overshoot on every tribal build and 24-vs-20 interaction overshoot on mono-black control. Decide which is canonical and delete the other. |
| 17 | **Close classifier coverage holes** (R11 + R12): exclude "you control" from `isRemoval()`'s `/exile target/i`; add Arbor Elf-style untap ramp, fight-equivalent removal (Ram Through), and alt-cost life-payment ramp (K'rrik). | [engine] | Individually small; collectively they mis-bucket genuinely strong on-theme cards into `utility` where they are under-scored. |
| 18 | **Archetype-aware land tiers for mono-color** (R13): boost Cabal Coffers/Stronghold/Nykthos/Urborg above flat `tier:3` when `colors.length === 1`, where they are mana-**doublers** not generic utility. | [data] | Sheoldred's top-heavy curve is uncastable without them, and they're currently scored identically to Geier Reach Sanitarium. |
| 19 | **Replace the Vivi reference fixture** with a mid-power EDHREC-consensus list (or pass `powerLevel` per scenario). | [reference] | The current fixture is a cEDH storm list; 60 phantom "missing staples" per run, across every card category. Already caused one refuted investigation. |
| 20 | **Add an orphan-combo guard**: if a graveyard tutor (Entomb-class) is selected, require ≥1 reanimation spell in the pool; recognize known 2-card pairs (Sanguine Bond + Exquisite Blood) as units. | [engine] | Low frequency, but produces visibly nonsensical inclusions (Meren's Entomb with zero reanimation; Sheoldred's Sanguine Bond with no Exquisite Blood). |
| 21 | **Verify the collection name-match join across printing variants** (Sol Ring, other multi-printing staples). | [data] | Sol Ring absent from a 3,500-card collection is suspicious enough to rule out a join bug before accepting non-ownership. Cheap check. |
| 22 | **Tighten CF content-based fallback for wide-identity commanders**: condition `similar_deck_count = 0` recs on functional tie-in, not just color legality. | [data] | Ramos's 27% fallback rate is where every misfire clusters (Gishath, Coat of Arms, Yidris/Zur/Najeela). Sheoldred at 3% fallback has near-zero junk. |

---

### Verification note

All CONFIRMED findings above were adversarially verified against live code and the live DB (`%APPDATA%/the-black-grimoire/data/mtg-deck-builder.db`), with explicit refutation attempts logged. The single REFUTED claim is documented so it is not re-chased. Section 2.2 items carry code cites but did **not** go through the adversarial pass — verify before implementing. Re-baseline `deck-fitness.mjs` after items 1-5 land; `referenceOverlapPct` will move and a score change is not automatically a regression.
