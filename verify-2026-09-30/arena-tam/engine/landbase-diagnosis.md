# Collection builder mana base: diagnosis (2026-09-30)

**Verdict.** The builder does fill 30 of Tam's 38 land slots with nonbasics. Those picks are ranked by how many colours a land *claims*, and ownership is not scoped. Result: 6 of the 30 nonbasics are not owned on Arena, and 11 more make at most one colour or none. At least 19 owned Arena fixers that beat them are left out: Starting Town, the checklands, fastlands, painlands, snarls, verges, slowlands and triomes. The self-audit counts 32–36 sources per colour, so it never repairs anything. The defect is general. The 2-colour and 3-colour controls show the same failures. It is worst in 5 colours because the colour credit is linear in the number of colours.

## 1. Repro

```bash
# DB copy (WAL was 0 bytes; no -shm needed)
cp "$APPDATA/the-black-grimoire/data/mtg-deck-builder.db"{,-wal} C:/Users/QuLeR/AppData/Local/Temp/tam-build-db/
MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/tam-build-db npx tsx \
  verify-2026-09-30/arena-tam/engine/repro-landbase.ts "Tam, the Possibility"   # also "Tatyova, Benthic Druid", "Fire Lord Azula"
```
The script refuses any MTG_DB_DIR under `the-black-grimoire`/Roaming. It calls `autoBuildDeck({format:'brawl', useCollection:true, commanderName, userId:1, powerLevel:'optimized'})` and then re-runs `scoreLandsForDeck` to get each land's rank and reasons. Logs: `run-TamthePo.log`, `run-TatyovaB.log`, `run-FireLord.log`.

## 2. Picked mana base (Tam, BGRUW; pips B22 G21 U15 W10 R7)

38 lands = **8 basics** (2 Swamp, 2 Forest, 2 Island, 1 Plains, 1 Mountain) + **30 nonbasics**. All 30 nonbasics are untapped or fetch. The lowest picked score is 204.

| Class | n | Cards (score) |
|---|---|---|
| ✅ real fixer, Arena-owned | 13 | Command Tower (246), 9 shocks (210–216), Flooded Strand, Misty Rainforest, Scalding Tarn (210) |
| ❌ not owned on Arena | 6 | Mana Confluence, Bloodstained Mire, Windswept Heath, Wooded Foothills, Riveteers Overlook (user 1 **paper**), A-Thran Portal (user **2** paper) |
| ❌ colourless in practice | 5 | Gemstone Caverns (246), Branch of Vitu-Ghazi, Plaza of Harmony, Mirrodin's Core, Forgotten Monument (236) |
| ⚠️ one colour (chosen basic type) | 2 | Multiversal Passage (**272, rank #1**), Thran Portal (267); A-Thran Portal is also picked, so the same Arena card appears twice |
| ⚠️ fetch a tapped basic (only 8 basics) | 4 | Evolving Wilds, Terramorphic Expanse, Fabled Passage (206), Escape Tunnel (204) |

Lands that really make each colour (Command Tower, shocks, typed fetches, basics): **W 7 · U 9 · B 6 · R 7 · G 8**. The heaviest colour, B, has the fewest sources. The auditor reports `{"W":32,"U":34,"B":33,"R":35,"G":36}` with no deficiencies.

## 3. Owned-best lands it missed (user 1, source arena, brawl-legal)

There are 204 owned Arena lands that tap for 2+ of Tam's colours or any colour. The build picked 15 and left out 189. Every one of them was in the scored candidate list: 0 were unscored. The good ones it left out:

| Group | Cards (score) | Why below the 204 cut |
|---|---|---|
| 5c, untapped T1–3 | Starting Town (180) | classified `tapped` tier 4 |
| Check | Woodland Cemetery BG (186), Hinterland Harbor GU (180) | 2 colours × 30 < 5 claimed × 30 |
| Fast | Concealed Courtyard BW (184), Spirebluff Canal UR (177) | same |
| Pain | Mount Doom BR (184), Yavimaya Coast GU (180) | same |
| Snarl | Vineglimmer Snarl GU, Fortified Village GW (179) | same |
| Verge | Bleachbone BW (114), Riverpyre UR, Sunbillow RW, Willowrush GU (112) | "activate only if" → ×0.4 conditional |
| Slow | Deserted Beach UW, Overgrown Farmland GW (84) | classified `tapped` tier 4 |
| Tri / triome | Savage Lands (145), Mystic Monastery (139), Savai Triome, Opulent Palace, Sandsteppe Citadel, Nomad Outpost (120), Jetmir's Garden, Frontier Bivouac (114), Urban Retreat (105) | tier 4 (15) + 3 × 30 |
| Temple | 10 temples (109–115) | tier 3, tapped |

With the check/fast/pain/snarl/verge/slow lands, Starting Town and 4 tri-lands (19 lands) in place of the 17 bad picks and 2 basics, B rises from 6 to 15 real sources. Every colour reaches 12+.

**Controls.** Both controls show the same failures, at a smaller scale.

| Commander | Lands | Basics / nonbasic | Not on Arena | Fake / 1-colour picked | Owned fixers missed |
|---|---|---|---|---|---|
| Tatyova GU | 35 | 20 / 15 (quota 18) | 4 (Windswept Heath, Wooded Foothills, Mana Confluence, A-Thran Portal) | Gemstone Caverns, Multiversal Passage, Thran Portal | Temple of Mystery, Dreamroot Cascade, Willowrush Verge, Hedge Maze, Tangled Islet, Thriving Grove/Isle |
| Fire Lord Azula BRU | 34 | 14 / 20 (quota 24) | **7** (Bloodstained Mire, Dragonskull Summit, Shivan Reef, Maestros Theater, Mana Confluence, Riveteers Overlook, A-Thran Portal) | Gemstone Caverns, Branch, Plaza, Mirrodin's Core, Forgotten Monument, Multiversal Passage, Thran Portal | Waterlogged Teachings, Temples of Epiphany/Malice, Stormcarved Coast, Riverpyre Verge |

Auditor for Tatyova: W10 B8 R9 "sources" in a GU deck.

## 4. Root causes

**(a) Ownership ignores user and source. This is the cause of 6 of Tam's picks.**
- `src/lib/deck-builder-ai.ts:693-697`: `SELECT c.name, SUM(col.quantity) as total FROM collection col JOIN cards c ON col.card_id = c.id GROUP BY c.name`. There is no `user_id` filter and no `source` filter. `getMaxQty` (:1717-1723) trusts this map.
- `src/lib/deck-builder-ai.ts:714-720` (`collectionJoin`) and `src/lib/land-intelligence.ts:129-135` (`colJoin`): `SELECT DISTINCT c2.name AS cname FROM collection col2 JOIN cards c2 ...`. Also unscoped. The land builder derives ownership on its own, separate from `ownedQty`.
- `src/lib/commander-analysis.ts:651`: `WHERE col.user_id = ?`. Scoped by user but not by source. `BuildOptions` (`deck-builder-ai.ts:414-435`) has no source field at all.
- Ownership is matched by exact name, so `A-X` and `X` are unrelated. The Arena import stores Thran Portal under its paper name, and the build picks both `Thran Portal` and `A-Thran Portal`. The land dedupe is `selectedNames.has(scored_land.card.name)` (`land-intelligence.ts:446`).

**(b) Candidate pool: not a cause.** All 204 owned fixers are scored (448 rows for Tam). 30 nonbasic slots were available.

**(c) Basic/nonbasic split: not the Tam cause.** `land-intelligence.ts:427-433` gives `Math.min(30, targetLandCount - 3)` for 4+ colours, i.e. 30 of 38. The `min(10, targetLandCount - 25)` rule at :428 caps mono-colour decks only. There is a real leak for 2c/3c decks. `deck-builder-ai.ts:2168`, `if (pickedNames.has(card.name)) continue;`, drops land-base picks that were already taken as MDFC spells (Tatyova 3, Azula 4) without taking the next land. Step 7 (:2301-2327) then fills those slots with basics split evenly. This is why Tatyova got 15 nonbasics against a quota of 18.

**(d) Ranking claims colours instead of counting real ones. This is the cause of 11 of Tam's picks and of the misses.**
- `land-intelligence.ts:284-287`: `score += Math.round(30 * matchingColors.length * colorBonusScale);`. The credit is linear in colours claimed, up to +150. That outweighs tier (`{1:100,2:70,3:40,4:15}`, :253) plus untapped (+40, :257). An untapped dual gets 100+40+60 = 200. A land claiming 5 colours gets 40+150 = 190+. A tapped triome gets only 15+90.
- `mana-sources.ts:79-80`, `chosenTypeLandColors`: `if (/choose a basic land type/ ...) return ['W','U','B','R','G'];`. A land that makes one colour gets credit for 5. `land-intelligence.ts:229-233` applies it. Multiversal Passage and Thran Portal rank #1 and #2.
- `mana-sources.ts:62`: `if (/for a basic land/.test(o) ...) return ['W','U','B','R','G'];`. Evolving Wilds and similar get credit for 5 colours whatever basics the deck runs (8 here), and they enter tapped.
- `mana-sources.ts:117-131`, `isConditionalColoredProducer`, misses several gates. `makesColor` requires `add (?:one|x|five|\d+) mana of any`, so Branch's "add **two** mana" and Plaza's "any **type** a Gate could produce" are not seen. It has no rule for counter-gated mana: Gemstone Caverns needs a luck counter and Mirrodin's Core needs a charge counter. It has no rule for abilities granted to other permanents: Forgotten Monument gives other Caves "{T}, Pay 1 life: Add one mana of any color". All five of these lands take the full 5 × 30. Meanwhile the `activated? only if` rule (:119) flags Verges as conditional at ×0.4, although shocks and basics satisfy them.
- `scripts/classify_lands.py` misclassifies some cycles. Slowlands ("unless you control two or more other lands") and Starting Town fall to generic `tapped`, tier 4 (:175-190). Every `//` name with a land face is `pathway`, untapped, tier 2 (:149), even MOM MDFCs whose land face "enters tapped" (Revitalizing Repast // Old-Growth Grove). Multiversal Passage matches `chosen type` → `tribal` (:154). **Coverage is not the problem:** every owned Arena nonbasic land has a `land_classifications` row reachable through some printing.
- Minor: classification joins `lc.card_id = c.id` (`land-intelligence.ts:143`). Unclassified printings of the same card score about 100 lower; for example, one Godless Shrine row scores 116 and the classified one 216. The name dedupe keeps the best row, so the pick is unaffected, but the candidate list is inflated.

**(e) Pips drive only the basics.** Basics are split by pip share (`land-intelligence.ts:466-487`). Nonbasics get only `20 * intensity` for the heaviest colour (:290-293), about +6. Nothing sets a per-colour source target. The commander is left out of the demand (`deck-builder-ai.ts:2144-2147` maps `picked` only), so Tam's `{W}{U}{B}{R}{G}` activation adds no W or R demand. The safety net is blind too. `deck-auditor.ts:93-94` counts sources with `realManaSources`, which shares the same colour helpers. Every fake 5-colour land counts as 5 sources, so the Step 8 `color_sources` repair (`deck-builder-ai.ts:2348`) never fires.

## 5. Proposed minimal fix (3 rules, in order of impact)

1. **One scoped ownership source.** Add `collectionSource?: 'arena' | 'paper'` to `BuildOptions`. Brawl, standardbrawl and competitivebrawl default to `'arena'`. Build `ownedQty` with `WHERE col.user_id = ? [AND col.source = ?]` (`deck-builder-ai.ts:693`). Key names with `A-` stripped, so `A-X` and `X` share one entry. Pass the owned-name predicate into `buildOptimalLandBase` and delete its `colJoin`, so the land builder cannot disagree with `getMaxQty`. In `buildOptimalLandBase`, dedupe on the `A-`-stripped name. Apply the same source filter at `commander-analysis.ts:291` and `:651`.
2. **Honest colour count, shared by scorer and auditor (`mana-sources.ts`).** Chosen-type lands count as 1 colour. Basic-land fetchers count only the colours whose basics the deck runs, and as tapped. A land is colourless for fixing when its coloured mana is gated by a counter, is a one-shot face-up trigger, is granted only to other permanents, or is "any type a Gate could produce". An "activate only if you control a <basic type>" gate is satisfied when the deck runs typed duals or basics of that type. Because `realManaSources` uses these helpers, the audit and the Step 8 repair start seeing the real shortfall.
3. **Cap breadth in `scoreLandsForDeck`.** Change :286 to `30 * Math.min(matchingColors.length, 3) * colorBonusScale`, so a 5-colour land is worth a triome, not 2.5 duals, and tier plus untapped decide the order among real fixers.

Second pass, needed for the full owned-best base: fix `classify_lands.py` for slowlands and Starting Town (conditional-untapped, tier 2) and MOM MDFCs (tapped). Also make Step 5 (`deck-builder-ai.ts:2166-2175`) take the next scored land when a pick is skipped, instead of adding a basic.

## 6. Test plan (failing tests first; scratch DB only)

New file `tests/collection-build-landbase.test.ts`. Copy the scratch-dir pattern of `tests/collection-build-synergy-minimums.test.ts`: `MTG_DB_DIR = data/test-collection-landbase`, `expect(db.getDataDir()).toBe(DIR)`, mock EDHREC and CF, and use test users 999902 (builder) and 999903 (other).
- Seed a 5-colour test commander, about 62 owned 1–3 MV spells with B-heavy pips, and these lands with `land_classifications` rows:
  - user 999902, `arena`: Command Tower, 5 shocks, 2 checklands, Starting Town, 1 triome, and the traps Gemstone Caverns, Plaza of Harmony, Mirrodin's Core, Forgotten Monument, Multiversal Passage, Evolving Wilds, Thran Portal.
  - user 999902, `paper`: Mana Confluence, Bloodstained Mire.
  - user 999903, `arena`: A-Thran Portal.
- Assertions, which fail on today's code:
  1. With `collectionSource: 'arena'`, every picked nonbasic is owned by 999902 with source `arena`. Today Mana Confluence, Bloodstained Mire and A-Thran Portal get in.
  2. Thran Portal and A-Thran Portal are never both picked.
  3. Every seeded real fixer (Command Tower, shocks, checks, Starting Town, triome) is picked before any trap land.
  4. `auditDeck(result.cards).sourcesByColor.B` equals the count of lands that really make B. Pure unit tests in `src/lib/__tests__/mana-sources.test.ts` should cover `chosenTypeLandColors` (1 colour), `isConditionalColoredProducer` (true for the 4 gated lands, false for a Verge) and the basic-fetcher colours.
- Run only `npx vitest run tests/collection-build-landbase.test.ts src/lib/__tests__/mana-sources.test.ts`, with MTG_DB_DIR unset. `vitest.config.ts` pins the repo DB and throws on the live dir.
- Acceptance: re-run `repro-landbase.ts` on a fresh DB copy. Tam should have 0 lands not owned on Arena and 0 trap lands, and Starting Town, both checklands and at least 3 tri-lands should be picked. The controls should show no quota loss and no lands not owned on Arena.

Verify in staging: the per-colour quality of the 3-colour cap and of the Verge gate is a judgement call. Re-measure the land-choice snapshot tests after the change.
