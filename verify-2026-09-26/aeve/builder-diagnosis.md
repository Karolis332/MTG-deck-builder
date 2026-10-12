# Aeve, Progenitor Ooze — builder diagnosis (2026-09-26)

Repo: `C:/Users/QuLeR/MTG-deck-builder`, branch `auto-improve`. Read-only investigation.

## Q1 — Aeve classified "Spellslinger"

`src/lib/commander-synergy.ts:115-119` — the `storm` category regex list:
```
storm: [
  /\bstorm\b/i,
  /copy it for each spell cast before it/i,
  /copies become tokens/i,
],
```
Aeve's oracle text contains the literal keyword "Storm.", so this matches (`analyzeCommander`, `commander-synergy.ts:504-509`).

`inferArchetype()` (`commander-synergy.ts:441-477`), line 448:
```
if (has('storm')) return 'spellslinger';
```
`storm` is checked before `counters` (line 472) and before any tribal check exists at all — so the moment Storm matches, the function returns `spellslinger` immediately regardless of anything else on the card.

## Q2 — Ooze tribal detection

Not detected, and there is no code path that could detect it. `SynergyCategory` (`commander-synergy.ts:16-35`) has no `tribal` value for "this creature type matters to me" (only `tribal_lands`, which is about anthem/creature-type lands, e.g. `/choose a creature type/i`, `/creatures? you control .* that share a creature type/i` — `commander-synergy.ts:174-180`). None of those patterns match "for each other Ooze you control" (a counting clause, not an anthem/land clause). Changelings would not help either — the gap is structural: there is no `TRIGGER_PATTERNS` entry for "commander cares how many creatures of type X you control." To fix, a new category (or a generic parameterized "num_type" detector) would need to parse `for each other (\w+) you control` and treat the captured type as a tribal requirement.

## Q3 — +1/+1 counter synergy detection

The `counters` category regex (`commander-synergy.ts:317-320`) — `/\+1\/\+1 counter/i` — does match Aeve's text ("Aeve enters with a +1/+1 counter on it"). But it gets suppressed immediately after, at `commander-synergy.ts:531-541`:
```js
if (triggerCategories.includes('counters')) {
  const broadCounters = /(?:\+1\/\+1|charge|loyalty)? ?counters? on (?:each|target|another|all|any|up to|a |creatures|permanents)/i.test(text)
    || /proliferate/i.test(text)
    || /counters? you control|counters? placed|with counters? on (?:it|them)/i.test(text)
    || /remove .{0,40}counters? from/i.test(text);
  if (!broadCounters) {
    triggerCategories.splice(triggerCategories.indexOf('counters'), 1);
  }
}
```
Aeve's clause is "...counter on it for each other Ooze you control" — "on it" doesn't match any of the `broadCounters` alternatives (`on each/target/another/all/any/up to/a /creatures/permanents`), there's no `proliferate`, no "counters you control/placed", no "remove...counters from". So `broadCounters` is `false` and the `counters` category is deleted — the same suppression written for self-buffing commanders like Vivi Ornitier fires here too, even though Aeve's counter count depends on an external count (Oozes), not a proliferate/self-buff package. This is a false positive in the suppression heuristic, not a missing detector.

## Q4 — Gate says "commander wants: general value"

`src/lib/deck-gate-plan.ts:80-124`, `deriveCondition()`:
- `COST_RULES` (line 38-42) look for "if at least N mana was spent" / "mana value N or greater" — Storm doesn't set either, so `threshold = null`.
- `TYPE_RULES` (line 44-50) look for "noncreature/instant or sorcery/creature/artifact/enchantment spell" — none present, so `requires = null`.
- With both null, line 114-121 falls through to `profile?.payoffType`. `payoffType` is built in `commander-synergy.ts:559-569` from `PAYOFF_PATTERNS` (draws cards / deals damage / creates tokens / distributes counters / gains life / destroys / exiles / drains / bounces) — none of these phrases appear literally in Aeve's oracle text (Aeve doesn't itself draw, deal damage, or explicitly "put a counter", it just "enters with" one), so `payoffDescriptions` is empty and `payoffType` defaults to `'general value'` (line 567-569).
- Result: `description = "commander wants: general value"` (`deck-gate-plan.ts:119-120`).

Compounding this: because `counters` was stripped from `triggerCategories` (Q3), `CATEGORY_NOUNS['counters'] = ['+1/+1 counter']` (`deck-gate-plan.ts:56`) never gets added to the plan's noun set either — so even a card that visibly reads "+1/+1 counter" would not score as "interacting" via that noun. Only `storm`'s nouns (`'whenever you cast'`, `'copy that spell'` — `deck-gate-plan.ts:55`) survive, and Aeve's own text contains neither phrase (Storm is a keyword, not spelled-out cast-trigger wording), so the plan's noun list is nearly useless for this commander. That is the direct cause of the 2/64 (3%) interaction figure.

## Q5 — How dead filler (Courier of Comestibles, Radioactive Spider, etc.) gets picked

Two independent generic-role systems pick cards with no regard to whether the searched/tutored payoff is present in the deck:

1. **Storm minimum backfill** — `src/lib/deck-builder-ai.ts:1997-2039` ("Step 4b: Fill commander synergy minimums"). Because Aeve's only surviving category is `storm` with `min: 20` (`commander-synergy.ts:317-326`, `SYNERGY_REQUIREMENTS.storm`), the builder must find 20 cards matching `SYNERGY_REQUIREMENTS_MAP.storm` patterns (`draw a card`, `add {`, `search your library for a...land`, `create...treasure`, `untap` — `deck-builder-ai.ts:98`). This is a broad "cheap value" bucket, not an Ooze/counters filter, so any cheap card with those phrases (including irrelevant tutors) can satisfy it.

2. **Generic `tutor` role quota** — `src/lib/card-classifier.ts:209-215` classifies *any* card whose text matches `TUTOR_SEARCH_CLAUSE` (`/search your library for (?:up to \w+ )?(?:an? )?([^.\n]*?) cards?\b/i`) as category `'tutor'`, with no check on what the searched card type actually does for the deck's plan (Food, Spider Hero, etc. all satisfy the same generic bucket). `src/lib/deck-builder-constraints.ts:811`:
   ```js
   if (c.categories.has('tutor') && underCap('tutor')) return { accept: true, role: 'tutor', reason: `extra tutor: ${c.card.name}` };
   ```
   Any unpicked card tagged `'tutor'` is accepted as long as the `tutor` role quota (`roleCaps.tutor`) isn't full — Courier of Comestibles (Food tutor) and Radioactive Spider (Spider Hero tutor) both satisfy this generic role even though the deck runs no Food/Spider Heroes payoffs.

Root cause for both: neither system checks the *target* of a synergy/tutor match against what the commander's plan actually needs (Ooze creatures, counters payoffs) — they only check that a card's text contains one of a small set of generic value phrases or fits a generic role bucket. Since Q2/Q3 mean the builder never derived an Ooze-count or counters requirement for Aeve in the first place, there was no signal to bias these generic fills toward Ooze tribal cards even if such a signal had existed.

I did not reproduce this offline via a script — `autoBuildDeck` needs a live SQLite DB with EDHREC/CF data and takes real query time; tracing the exact code paths above already gives file:line-level certainty within the ~10 minute budget, so I skipped the repro run.

## Q6 — Land base: nonbasic "fixers" in a mono-green identity, and the not-legal paper Thran Portal

### Why nonbasics beat basics at all in mono-color

`src/lib/land-intelligence.ts:408-459`, `buildOptimalLandBase()`. Line 427-428:
```js
const numColors = colors.length;
const nonBasicTarget = numColors <= 1
  ? Math.min(10, targetLandCount - 25)
  : ...
```
Even a **mono-color** deck reserves up to 10 nonbasic land slots as a flat floor — it is not "does this deck need fixing," it is a fixed target the picker tries to fill first (`selectedLands` loop, lines 444-459) before the remainder becomes basics (line 463: `remainingSlots = targetLandCount - nonBasicCount`). A basic Forest is never in the same scored list as the nonbasics (`scoreLandsForDeck` only scores nonbasic lands — see the SQL `WHERE ... c.type_line NOT LIKE '%Basic%'`, `land-intelligence.ts:144-145`), so Forest literally cannot "outscore" Cabaretti Courtyard etc. — it only receives whatever land count is left over after the nonbasic floor is filled. Any nonbasic land scoring `>= 20` (line 447: `if (scored_land.score < 20) continue`) fills that floor regardless of color identity fit.

### Why off-color-producing utility lands pass the color filter

`scoreLandsForDeck()`, `land-intelligence.ts:191-205` — the hard color-identity gate only inspects Scryfall's `color_identity` JSON field:
```js
if (land.color_identity) {
  const ci: string[] = JSON.parse(land.color_identity);
  for (const c of ci) { if (!allowedColorSet.has(c)) { legal = false; break; } }
  if (!legal) continue;
}
```
Verified against the local DB (`mtg-deck-builder.db`):
- `Cabaretti Courtyard` → `color_identity: []`, `produced_mana: null`
- `Brokers Hideout` → `color_identity: []`, `produced_mana: null`
- `Multiversal Passage` → `color_identity: []`, `produced_mana: null`

These are "gate"/utility lands with no colored mana symbols in their own oracle text, so Scryfall (and this DB, mirroring it) records `color_identity: []` — which trivially passes the mono-green filter (the `for` loop over an empty `ci` array never sets `legal = false`). `produced_mana` is also `null` here (a data gap, not just a Scryfall quirk — most of these do actually produce colored mana card-in-hand), so the later color-match scoring (`land-intelligence.ts:217-233`, `producesColors`) can't credit or penalize them by color either; they just get scored on `tier`/EDHREC rank/`land_category` alone and slot into the mono-green deck as pure filler.

(`Kishla Village` and `Hashep Oasis` are, by contrast, correctly `color_identity: ["G"]` — legitimately green lands, just weak ones for a genuinely mono-color deck because their "enters tapped unless you control an Island/Swamp" or desert-cycle conditions never trigger with 0 other basic types in the deck. That's a land-quality issue, not a color-identity bug.)

### Why a not_legal paper "Thran Portal" can appear in a Brawl build

Confirmed in the local DB (`mtg-deck-builder.db`), `legalities` JSON:
- `A-Thran Portal` (`dmu`, id `b4505c11…`) → `"brawl":"legal"`
- `Thran Portal` (`dmu`, id `ef074a2e…`) → `"brawl":"not_legal"`
- `Thran Portal // Thran Portal` (`admu`, id `cc6406aa…`) → `"brawl":"not_legal"`

I confirmed `buildOptimalLandBase`/`scoreLandsForDeck`'s own SQL (`land-intelligence.ts:119-148`) correctly excludes the not-legal paper row for `legalityKey = 'brawl'` — reran the exact query (with and without a collection-name join simulating ownership of the paper card) and both returned 0 rows for "Thran Portal". So the land-scoring SQL itself is not the entry point.

The actual bug is the shared by-name card resolver used to turn a plain card name (as it would arrive from the user's paper/ManaBox collection, or from EDHREC land recs, or from a pasted decklist) into a DB row: `lookup()` inside `resolveLines()`, `src/lib/deck-gate-parse.ts:189-215`:
```js
const lookup = (name: string): DbCard | null => {
  ...
  const plain = name.replace(/^A-/, '');
  const front = plain.split(' // ')[0];
  // ... comment claims "A-Thran Portal is brawl-legal, plain Thran Portal is not"
  const exactRows = [
    name !== plain ? (exact.get(name) as DbCard | undefined) : undefined,
    exact.get(plain) as DbCard | undefined,
  ].filter(Boolean) as DbCard[];
  ...
  const legalExact = exactRows.find((c) => legalityOf(c, key) === 'legal');
  const candidates = legalExact
    ? exactRows
    : ([...exactRows, byFront.get(front, front) as DbCard | undefined].filter(Boolean) as DbCard[]);
  const card = candidates.find((c) => legalityOf(c, key) === 'legal') ?? candidates[0] ?? null;
  ...
};
```
This function only strips a leading `A-` (paper→Arena direction is never attempted: it never prepends `A-` to a plain name to check the rebalanced variant). For input `"Thran Portal"` (the paper name, exactly what a ManaBox/paper collection import stores), `plain === name`, so `exactRows` = just the row for exact name `"Thran Portal"` (`not_legal`). `byFront` also only ever matches `name = front` or `name LIKE front || ' // %'` — again never tries an `A-` prefixed candidate. So `candidates` never contains `A-Thran Portal` at all, `candidates.find(legal)` fails, and the code falls back to `candidates[0]` (line 212) — silently returning the **not-legal** paper row instead of throwing or reporting unresolved. The comment on lines 194-197 describes the intended behavior (prefer whichever variant is legal) but the code only implements it for names that *start with* `A-`; the common case (plain paper name, no prefix) is asymmetric and never reaches the Arena-legal row.

This resolver lives in `deck-gate-parse.ts` (used by the deck gate / list-validation path), not inside `land-intelligence.ts`'s own SQL — so the most likely route by which a not-legal "Thran Portal" ends up attributed to this build is any path that names the land by its plain string and resolves it through this shared `lookup()`/`resolveLines()` helper (collection-name resolution, decklist re-validation, or land-rec resolution reusing this function) rather than through `scoreLandsForDeck`'s own legality-filtered SQL, which I verified is correct.

## Minimal fix proposals

1. **Ooze/type-count tribal detection** (`src/lib/commander-synergy.ts`, near `TRIGGER_PATTERNS`): add a category (or generic capture) for `for each other (\w+) you control` / `for each (\w+) you control` clauses, extracting the creature type as a tribal requirement instead of relying only on `tribal_lands`' anthem/land wording.
   ```ts
   // in analyzeCommander, after the existing category loop:
   const tribalCountMatch = text.match(/for each other (\w+)s? you control/i);
   if (tribalCountMatch) detectedTribalType = tribalCountMatch[1]; // wire into pool/minimums
   ```

2. **Counters suppression false positive** (`commander-synergy.ts:531-541`): extend `broadCounters` to also treat "on it for each other X you control" as broad (external-count-driven), not self-buff:
   ```ts
   || /counter on it for each/i.test(text)
   ```

3. **Generic tutor/storm-filler role checks target relevance** (`deck-builder-constraints.ts:811`, `deck-builder-ai.ts:2028-2039`): before accepting a `tutor`/`storm`-bucket card, check that its searched/produced card type intersects the deck's detected payoff categories (e.g. skip a Food/Spider-Hero tutor when the deck has no Food/Spider-Hero cards) rather than accepting any card that matches the generic phrase list.

4. **Mono-color nonbasic floor should require actual color relevance** (`land-intelligence.ts:427-428` and the CI filter at `196-205`): for `numColors <= 1`, either drop the flat 10-slot floor to something driven by `producesColors` relevance (skip a land whose `producesColors` is empty/off-color once `implicitLandColors`/`fetchLandColors` also return nothing), or backfill `land_classifications.produces_colors` for gate/hideout-cycle lands so the existing color-match scoring can penalize them.

5. **`resolveLines` name resolution should also try the Arena variant in the paper→Arena direction** (`deck-gate-parse.ts:189-215`):
   ```ts
   const arenaVariant = name.startsWith('A-') ? null : `A-${name}`;
   const exactRows = [
     name !== plain ? exact.get(name) : undefined,
     exact.get(plain),
     arenaVariant ? exact.get(arenaVariant) : undefined,
   ].filter(Boolean) as DbCard[];
   ```
   And replace the `candidates[0]` fallback with `null` (push to `unresolved`) when nothing legal is found, instead of silently shipping a not-legal printing.
