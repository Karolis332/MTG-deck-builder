# Standard Corpus Research — Build Rules and Data-Quality Verdict

Date: 2026-09-10. Source: live DB `$APPDATA/the-black-grimoire/data/mtg-deck-builder.db`
(read-only), tables `community_decks` / `community_deck_cards`, `format='standard'`.
Full numeric distributions and the archetype-consensus JSON: `verify-2026-09-10/corpus-stats.json`.

**Corpus size:** 9,176 Standard decks — mtgtop8 5,931, mtggoldfish 2,495, mtgo 750.

**Known corpus bugs corrected before any aggregate below was computed:**
- `community_deck_cards` stores a card as several rows per deck — every aggregate sums
  `quantity` grouped by `(community_deck_id, card_name, board)` first.
- `cards.name` stores DFC/adventure/split cards as `"Front // Back"`; `community_deck_cards`
  stores the front face only. Resolution tries an exact name match, then the front-face split.
  Result: 1,356 of 264,064 deduplicated (deck, board, card) row-instances (0.51%, 30 distinct
  card names) still fail to resolve — mostly joke/un-set or crossover cards not in the `cards`
  table at all (e.g. "Mjolnir, Hammer of Thor", "Zora, Spider Fancier"). Negligible impact.
- The `cards` table has 2,240 corrupt doubled-name rows (`"X // X"`, type_line `"Card // Card"`,
  null mana cost, `standard: not_legal`) — larger than a prior estimate of "~12"; measured live
  and excluded from every lookup and legality check below.

## 1. Data quality

| source | n | date range | null dates | has W/L | has archetype | exact 60+≤15 after dedup |
|---|---|---|---|---|---|---|
| mtgo | 750 | 2026-08-20 → 2026-09-08 | 0 | 750 (100%) | 750 (100%) | 743 (99.1%) |
| mtggoldfish | 2,495 | 2026-03-18 → 2026-09-04 | 48 (1.9%) | 0 | 2,495 (100%) | 2,467 (98.9%) |
| mtgtop8 | 5,931 | — | **5,931 (100.0%)** | 0 | 5,931 (100%) | 5,811 (98.0%) |

The mtgtop8 missing-date problem is total, not partial: **every** mtgtop8 Standard row has
`event_date = NULL` (5,931/5,931). mtgtop8 cannot supply freshness or recency signal at all —
only archetype shape and raw deck-count weight. Only mtgo carries win/loss (750/750, 100%);
mtggoldfish and mtgtop8 carry zero W/L data between them (8,426 decks with no outcome signal).

Archetype labels exist on 100% of rows in every source, but the labels are not one vocabulary:
mtgo uses colour-guild names ("Izzet", "Jeskai", "Mono-Green"); mtgtop8/mtggoldfish use real
archetype names ("Izzet Prowess"). The two real-name sources also disagree with each other on
punctuation for the same archetype — e.g. "Mono Green Landfall" (mtgtop8, 445 decks) vs.
"Mono-Green Landfall" (mtggoldfish, 364 decks), and "Izzet Lesson" (mtgtop8, 358) vs.
"Izzet Lessons" (mtggoldfish, 210) — these are the same archetype split by a hyphen/plural and
must be merged before any archetype-count ranking is trusted.

### Engine rules
1. Never use mtgtop8 `event_date` for freshness/recency logic — it is NULL on 100% of rows (n=5,931).
2. Restrict all win-rate-weighted logic to `source='mtgo'` — it is the only source with W/L (n=750).
3. Filter any decklist used as a structural template to `exact60Main15Side` after correct dedup — ~1-2% of rows in every source are partial/mis-scraped (n=743/750, 2,467/2,495, 5,811/5,931).
4. Merge archetype labels by normalizing hyphen/plural variants across mtgtop8 and mtggoldfish before ranking by deck count (confirmed pairs, n=809 and n=568 combined — see Data quality above).
5. Resolve DFC/split card names via front-face fallback before any per-card aggregate; still expect ~0.5% of row-instances to be unresolved joke/un-set cards (n=1,356/264,064).

## 2. Land counts

Land-count median/IQR by archetype (top archetypes by deck count) and by average-nonland-MV
quartile bin; correlation of land count vs. mtgo win rate. Full table in `corpus-stats.json`.

| archetype | n | median lands | IQR | median avg-nonland-MV |
|---|---|---|---|---|
| Izzet Spellementals | 697 | 20 | [20,20] | 3.23 |
| Izzet Prowess | 1,305 | 21 | [21,21] | 1.69 |
| Izzet Lesson(s) | 358/210 | 22 | [22,22]/[22,23] | 1.89/1.76 |
| Dimir Aggro | 154 | 24 | [23,24] | 2.11 |
| Selesnya Aggro | 392 | 23 | [22,24] | 2.27 |
| Jeskai Control | 206 | 26 | [26,26] | 2.71 |
| Mono-Green Landfall | 445/364 | 26 | [26,26] | 2.59/2.33 |
| Dimir Excruciator | 199 | 26 | [26,26] | 3.18 |
| Superior Doomsday | 349 | 26 | [26,26] | 3.32 |
| 4/5C Control | 284 | 27 | [26,27] | 3.15 |

By avg-nonland-MV quartile (n≈2,293-2,296 each): Q1 (low curve) median 21 lands [21,22];
Q2 median 23 [22,25]; Q3 median 25 [23,26]; Q4 (high curve) median 25 [20,26] — Q4's wide IQR
means "high average MV" is not a single archetype shape (burn decks with an expensive top end
sit in the same bin as control decks, at opposite land counts).

Correlation of land count vs. mtgo win rate: **Pearson r = 0.006** (n=750) — effectively zero.
This is expected, not a null result to discard: land count is set by archetype/curve, and the
within-archetype variance in land count is small relative to the win-rate noise floor. Land
count is a curve-fit constraint, not an independent win-rate lever.

### Engine rules
6. Set target land count per archetype/curve bucket, not one global number: observed medians range 20 (Izzet Spellementals) to 27 (4/5C Control), n=697-1,305 per archetype.
7. Bucket by avg-nonland-MV to pick a land-count baseline for an unfamiliar archetype: Q1→21, Q2→23, Q3→25, Q4→25 lands (n≈2,293-2,296 per bucket) — but flag Q4 as high-variance (IQR spans 20-26) and fall back to rule 6 if archetype is known.
8. Do not treat land-count tuning as a win-rate optimization lever on its own (r=0.006, n=750) — optimize land count for curve fit / color-source math, not for win rate directly.

## 3. Curve shape: winning vs. losing decks (mtgo only)

Average main-deck nonland card count per mana-value bucket, mtgo decks with win/loss recorded,
split winners (win rate ≥60%) vs. losers (<50%).

| MV | winners (n=474) | losers (n=96, LOW-N borderline) |
|---|---|---|
| 1 | 11.68 | 12.17 |
| 2 | 10.44 | 9.66 |
| 3 | 5.51 | 5.49 |
| 4 | 4.20 | 3.50 |
| 5 | 0.97 | 1.43 |
| 6+ | 3.42 | 4.16 |

The clearest gap is at the 4- and 5-drop slots: winners run more 4-drops and fewer 5-drops than
losers, and losers run more top-end (6+) filler. 1- and 2-drop and 3-drop counts are close
enough (≤0.8 apart) not to be a reliable signal at this sample size.

### Engine rules
9. When suggesting curve edits to an existing list, bias toward compressing a 5-mana slot down to 4 mana or lower, and trimming 6+ filler, rather than touching the 1-3 drop counts (winners n=474, losers n=96 — losers group is close to the LOW-N floor, treat as directional not precise).

## 4. Composition by archetype

Average main-deck (nonland) creature / instant-sorcery / removal / card-draw counts per deck,
top 8 archetypes by raw deck count. Classification rule (regex over `cards.type_line` /
`oracle_text`, applied to the resolved main-deck nonland cards only):
- **creature**: `type_line` contains "Creature".
- **instant/sorcery**: `type_line` contains "Instant" or "Sorcery".
- **removal**: oracle text matches destroy/exile-target, X damage to target/any target,
  -X/-X or power-becomes effects, bounce-to-hand, sacrifice-a-creature, fight, or
  counter-target-spell patterns (one combined regex, see `.tmp-corpus-query.cjs` history —
  script deleted per task instructions, pattern reproduced in this file's commit).
- **card-draw**: oracle text matches "draw a/an/N card(s)" or "investigate".
This is a coarse heuristic (no ETB/replacement-effect nuance, no split-card second face) —
treat the numbers as archetype fingerprints, not certified card-by-card tags.

| archetype | n | avg creatures | avg inst/sorc | avg removal | avg draw |
|---|---|---|---|---|---|
| Izzet Prowess | 1,305 | 9.57 | 27.04 | 4.99 | 8.39 |
| Izzet Spellementals | 697 | 12.00 | 31.87 | 7.21 | 16.28 |
| Mono Green Landfall | 445 | 24.02 | 4.39 | 0.64 | 0.85 |
| Selesnya Aggro | 392 | 28.08 | 4.87 | 5.02 | 2.76 |
| Mono-Green Landfall | 364 | 24.33 | 4.84 | 1.15 | 0.80 |
| Izzet Lesson | 358 | 4.47 | 26.30 | 10.93 | 15.75 |
| Superior Doomsday | 349 | 13.90 | 21.74 | 8.30 | 7.40 |
| 4/5C Control | 284 | 0.66 | 28.30 | 15.32 | 5.47 |

### Engine rules
10. Use these per-archetype averages as inclusion-quota baselines when scoring/building a list against a named archetype (e.g. flag a "4/5C Control" list with <10 removal spells as under-quota; n=284).
11. Aggro shells (Mono-Green/Selesnya Landfall/Aggro) run 24-28 creatures and near-zero removal/draw by design — do not apply spell-heavy archetypes' removal/draw quotas to them (n=445-392).

## 5. Copy distribution in winning lists (mtgo, win rate ≥60%)

Fraction of nonland card-slots (copies, not distinct cards) coming from 4-of / 3-of / 2-of /
1-of entries, by (guild-name) archetype.

| archetype | n | 4-of | 3-of | 2-of | 1-of |
|---|---|---|---|---|---|
| Mono-Green | 96 | 71.5% | 11.2% | 9.3% | 8.0% |
| Boros | 48 | 69.1% | 16.6% | 11.7% | 2.6% |
| Izzet | 71 | 65.5% | 15.9% | 14.8% | 3.8% |
| Mardu | 20 (LOW-N-adjacent) | 66.1% | 7.7% | 22.6% | 3.6% |
| Jeskai | 27 | 53.1% | 16.4% | 18.1% | 12.4% |
| Dimir | 70 | 51.1% | 14.2% | 27.7% | 7.0% |
| Four-Color (no G) | 26 | 40.8% | 17.9% | 34.2% | 7.1% |
| Orzhov | 20 (LOW-N-adjacent) | 42.2% | 31.2% | 20.3% | 6.3% |

### Engine rules
12. Default a new/unscored nonland card to a 4-of when suggesting it into a 2-color aggro/tempo archetype (Mono-Green/Boros/Izzet all >65% of slots are 4-ofs, n=71-96); default to 2-3 copies for 3+ color or control shells (Dimir/Four-Color/Orzhov all <52% four-ofs, n=20-70, two of these are LOW-N-adjacent).

## 6. Sideboard shape (mtgo)

| group | n | median distinct cards | avg distinct cards | avg 4-ofs | avg 1-ofs |
|---|---|---|---|---|---|
| League 5-0 | 180 | 8 | 8.29 | 0.46 | 3.46 |
| Any win rate ≥60% (league+challenge) | 474 | 8 | 8.51 | 0.51 | 3.96 |

### Engine rules
13. Default a generated sideboard to ~8 distinct answers (median 8, both groups, n=180/474), weighted toward 1-2 copy singleton answers (avg 3.5-4.0 one-ofs) over playsets (avg 0.5 four-ofs).

## 7. Archetype consensus — top 8 mtgo archetypes, last 30 days

Cutoff `event_date >= 2026-08-11` (today minus 30 days) — this covers the mtgo corpus's entire
date range (2026-08-20 to 2026-09-08 all falls inside it), so "last 30 days" here is simply
"all mtgo data on hand," not a true recency filter; there is no older mtgo data to exclude yet.
Consensus = cards in ≥50% of an archetype's decks, with average copy count. Full machine-readable
lists (all 8 archetypes, all consensus cards) are in `verify-2026-09-10/corpus-stats.json` →
`archetypeConsensus_last30Days_mtgoOnly.consensus`. Top archetypes by deck count in the window:
Mono-Green (144), Izzet (112), Dimir (111), Boros (76), Four-Color no-G (44), Jeskai (36),
Selesnya (30), Orzhov (29).

```json
{
  "cutoffDate": "2026-08-11",
  "top8Recent": ["Mono-Green","Izzet","Dimir","Boros","Four-Color (no G)","Jeskai","Selesnya","Orzhov"],
  "sample_Mono-Green_n144": [
    {"name": "Forest", "inclusionPct": 100, "avgQty": 13.93},
    {"name": "Fabled Passage", "inclusionPct": 100, "avgQty": 4},
    {"name": "Llanowar Elves", "inclusionPct": 100, "avgQty": 4},
    {"name": "Sapling Nursery", "inclusionPct": 88.2, "avgQty": 3.31},
    {"name": "Meltstrider's Resolve", "inclusionPct": 81.9, "avgQty": 1.56},
    {"name": "Demolition Field", "inclusionPct": 79.2, "avgQty": 1.04},
    {"name": "Surrak, Elusive Hunter", "inclusionPct": 61.1, "avgQty": 1.08}
  ]
}
```
(Truncated sample for readability — see the JSON file for the full 17-25 card consensus list
per archetype, all 8 archetypes.)

### Engine rules
14. Use `corpus-stats.json`'s `archetypeConsensus_last30Days_mtgoOnly.consensus` directly as a "cards other decks in this archetype run" suggestion source, keyed by inclusion% and avgQty; sample sizes per archetype range n=29 (Orzhov) to n=144 (Mono-Green) — treat archetypes with n<30 as directional only.

## 8. Staleness test

Banned in Standard as of 2026-09-10: Stormchaser's Talent, Vivi Ornitier, Proft's Eidetic
Memory, Monstrous Rage, Heartfire Hero.

Checked the top 10 Standard archetypes **by raw deck count across the whole corpus** (all
sources, 4,610 decks total) for any banned card, anywhere in the main or sideboard:

| archetype | n | decks with a banned card | % | which card |
|---|---|---|---|---|
| **Izzet Prowess** | **1,305** | **1,304** | **99.9%** | Stormchaser's Talent |
| Izzet Lessons | 210 | 77 | 36.7% | Stormchaser's Talent |
| Izzet Lesson | 358 | 100 | 27.9% | Stormchaser's Talent |
| Izzet Spellementals | 697 | 6 | 0.9% | Stormchaser's Talent |
| Mono Green Landfall | 445 | 0 | 0% | — |
| Selesnya Aggro | 392 | 0 | 0% | — |
| Mono-Green Landfall | 364 | 0 | 0% | — |
| Superior Doomsday | 349 | 0 | 0% | — |
| 4/5C Control | 284 | 0 | 0% | — |
| Jeskai Control | 206 | 0 | 0% | — |

**Total across the top 10: 1,487 of 4,610 decks (32.3%) contain a now-banned card** — every
single hit is Stormchaser's Talent; Vivi Ornitier, Proft's Eidetic Memory, Monstrous Rage and
Heartfire Hero appear zero times in these 10 archetypes' decklists.

**Headline:** Izzet Prowess is the single largest Standard archetype in the entire 9,176-deck
corpus by raw deck count (14.2% of all Standard decks scraped), and 99.9% of its decklists
(1,304/1,305) run the now-banned Stormchaser's Talent. A recommender that ranks archetypes or
suggests cards by raw historical popularity, without a banned-card filter, would today push a
player toward building the corpus's #1 archetype around an illegal card.

### Engine rules
15. Hard-filter: drop any archetype/deck/card whose consensus/decklist centers on a currently-banned card before surfacing it as a popularity-ranked suggestion — do not rely on staleness "washing out" via aggregate weighting; Izzet Prowess proves a single banned card can dominate 99.9% of the single largest archetype (n=1,305).
16. Re-check archetype popularity rankings against the current banlist on every use, not once at corpus-build time — 32.3% of the top-10-by-deck-count corpus (n=4,610) is currently illegal to build as scraped.

## Sanity checks (raw decklist vs. aggregate)

Two individual decklists dumped raw and cross-checked against the pipeline's computed totals:

1. **mtgo 5-0 league, id 901445867, archetype "Jeskai"** — 23 distinct main cards summing to
   60 (matches `computedMainTotal: 60`), 7 distinct sideboard cards summing to 15 (matches
   `computedSideTotal: 15`); land rows (Sacred Foundry, Plains×3, Hallowed Fountain×4,
   Floodfarm Verge×4, Meticulous Archive×4, Castle Doom×4, Repurposing Bay×3, Starting Town)
   sum to 24, matching `computedLandCount: 24`.
2. **mtggoldfish, id 900000001, archetype "Ouroboroid"** — main deck (Forest×6, Botanical
   Sanctum×4, Breeding Pool×4, Willowrush Verge×4, plus 34 nonland cards) sums to 60
   (`computedMainTotal: 60`), sideboard 10 distinct cards sum to 15 (`computedSideTotal: 15`),
   land rows sum to 22 (`computedLandCount: 22`) — both checks pass.

## Data-quality verdict

Trustworthy for: archetype shape/composition, card-copy distribution, land-count baselines,
sideboard shape (mtgtop8 + mtggoldfish, no date needed for these). Trustworthy for win-rate-
weighted signal only from mtgo (n=750, 100% W/L coverage, but that's a 19-day, 750-deck window
— thin for any single-archetype LOW-N split, see rule 9's losers group at n=96).

**Not trustworthy without a banned-card filter, today**: raw deck-count-weighted popularity
directly recommends the corpus's largest archetype (14.2% of everything scraped), which is
99.9% built around a card banned as of this research date. Any consumer of this corpus for
live recommendations must apply rules 15-16 before rules 6-14.

### Backfill: mtgtop8 event_date (2026-09-19)

`scripts/backfill_mtgtop8_dates.py` dates `community_decks` rows scraped before the
`scrape_mtgtop8.py` date-parser fix (2026-09-11). On the VPS: `cd /opt/grimoire-scrapers &&
venv/bin/python -u scripts/backfill_mtgtop8_dates.py --db data/mtg-deck-builder.db 2>&1 |
tee backfill-mtgtop8-$(date +%F).log` (run under `nohup` for the full ~230-event standard
backlog; `--dry-run` first to preview, `--formats standard` / `commander` to scope one at a
time). Idempotent — re-running only touches events still `event_date IS NULL`.
