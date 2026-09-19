# Standard (60-card) Deckbuilding Theory — Research Pass

Date: 2026-09-10. Scope: published theory only (no corpus queries — that is a separate empirical
pass). All numeric claims are cited; where only a secondary/aggregator source was reachable
(the primary ChannelFireball/ScryfallTCGplayer articles are paywalled or JS-rendered and could
not be fetched directly), that is flagged. Hypergeometric numbers are computed from scratch
below, not quoted from memory, per the brief. Banned as of 2026-09-10: Stormchaser's Talent,
Vivi Ornitier, Proft's Eidetic Memory, Monstrous Rage, Heartfire Hero — no example list below
uses them.

Reconciliation target: `src/lib/land-math.ts` in this repo.

---

## 1. Land count as a function of mana curve (Karsten)

**Primary source:** Frank Karsten, "How Many Lands Do You Need in Your Deck? An Updated
Analysis," ChannelFireball / TCGplayer, 2022. Regression over 95,000+ successful tournament
decklists. Could not fetch the article body directly (TCGplayer page is JS-rendered, gist/mirror
pages returned only loading shells); the formula below is corroborated by multiple independent
secondary reproductions that agree verbatim on the coefficients, so treated as reliable.
[TCGplayer article](https://www.tcgplayer.com/content/article/How-Many-Lands-Do-You-Need-in-Your-Deck-An-Updated-Analysis/cd1c1a24-d439-4a8e-b369-b936edb0b38a/) ·
[ManaTuner mirror listing](https://www.manatuner.app/library/karsten-how-many-lands-2022) ·
[ScrollVault reproduction](https://scrollvault.net/guides/mana-bases.html)

**60-card formula** (counting MDFCs partially, see below):

```
lands = 19.59 + 1.90 × avg_mana_value − 0.28 × (cheap_draw_or_ramp_count) + 0.27 × (has_companion ? 1 : 0)
```

R² = 0.395, RMSE = 2.75, all coefficients significant at p < .0001. "Cheap" = mana value ≤ 2.
Example from the source article: avg MV 2.2, no cheap draw/ramp, no companion →
19.59 + 1.90×2.2 = 23.77 → 24 lands.

**MDFC land-back credit** (modal double-faced land/spell cards, e.g. Zendikar Rising duals):
non-mythic MDFC = **0.38 land**, mythic MDFC = **0.74 land**. Subtracted from the raw land count
(each MDFC copy displaces some of a "real" land's job).

**100-card/Commander scaling** (for reference — not this project's target format, but useful for
sanity-checking the general shape): Karsten's own published scale-up is
`((100 − commanders) / 60) × (19.59 + 1.90×avgMV + 0.27×commanders) − 0.28×(ramp+draw) − 0.74×mdfc_mythic − 0.38×mdfc_nonmythic − 1.35`,
where 1.35 approximates the extra guaranteed draw + free mulligan Commander effectively gets.

**Reconciliation with `src/lib/land-math.ts`:**

| | Karsten 2022 (60-card) | `land-math.ts` `FORMULA_60` |
|---|---|---|
| Base | 19.59 | 19.59 ✅ |
| Per avg MV | +1.90 | +1.90 ✅ |
| Per cheap draw/ramp | −0.28 | −0.28 ✅ |
| Companion | +0.27 | **not modeled** |
| MDFC credit | 0.38 (non-mythic) / 0.74 (mythic) | flat **0.38** for all MDFC land-backs (`MDFC_LAND_CREDIT`), rarity-blind |
| Clamp | none published | `min: 16, max: 30` |

The core regression is reproduced exactly. Two gaps: (1) no companion term — low-impact for
Standard today (companions are rare/mostly banned across formats, and this repo doesn't track
companion status), safe to leave unless a companion card re-enters the pool; (2) mythic MDFCs are
under-credited by 0.36 land each (0.38 used vs 0.74 correct), which very slightly overshoots land
count on decks running mythic MDFC lands (e.g. Deathcap Glade-tier cards, or original ZNR mythic
MDFCs if reprinted). Low priority — mythic MDFC lands are a small fraction of any given Standard
manabase.

**Engine rules**
1. `lands = round(clamp(19.59 + 1.90 × avgMV − 0.28 × cheapDrawRamp, 16, 30))` for 60-card decks — already implemented, keep as-is.
2. If the pool contains a companion, add +0.27 to the raw land count before rounding (small, currently unimplemented gap).
3. Credit non-mythic MDFC land-backs at 0.38 land, mythic MDFC land-backs at 0.74 land (currently both credited at 0.38 — acceptable approximation, correct only if mythic MDFC lands become common in the target Standard pool).

---

## 2. Colored-source counting

**Primary source:** Frank Karsten, "How Many Sources Do You Need to Consistently Cast Your
Spells? A 2022 Update," ChannelFireball (not directly fetchable — paywalled/dynamic). Cross-
checked against three independent secondary reproductions that converge on the same headline
numbers: [ScrollVault](https://scrollvault.net/guides/mana-bases.html),
[Canadian Highlander build guide](https://canadianhighlander.ca/2023/07/17/how-to-build-a-manabase-for-singleton-formats/),
[gist mirror](https://gist.github.com/teryror/881d60e08480a56043895d3bbb83c374).

**Headline numbers, 60-card deck, ~90% consistency, on the draw:**

| Pip pattern | Sources needed |
|---|---|
| Single pip (e.g. `1W`) | 14 |
| Double pip (e.g. `WW`) | 18 |
| Triple pip (e.g. `WWW`) | 21+ |

By-turn breakdown reported by secondary sources for single pip: turn 1 ≈ 14, turn 3 ≈ 12, later
turns fewer (more draws = more looks). **On the play, add roughly 1 source** for the same
consistency (one fewer card seen).

**Methodology, and why my own computation differs from the headline table:** Karsten's number is
not a raw hypergeometric draw probability. It is *conditioned on the hand being a keep* under a
London-mulligan rule (mulligan hands with extreme land counts; a 7-card hand with 0-1 or 6-7
lands gets shipped). Conditioning on "reasonable" hands raises the apparent color-hit rate,
because the excluded hands (screw/flood) are disproportionately likely to also miss the target
color. I reproduced this from scratch two ways:

**(a) Naive/unconditioned** — plain hypergeometric P(≥k color sources among cards seen by turn N),
no mulligan filter, 60-card deck, on the draw (seen = 7 + turn):

```
single pip (need ≥1), turn 1 (seen=8):  S=12 → 85.3%   S=14 → 89.8%   S=16 → 93.1%   S=18 → 95.4%
double pip (need ≥2), turn 2 (seen=9):  S=14 → 67.8%   S=16 → 76.0%   S=18 → 82.6%   S=20 → 87.7%
triple pip (need ≥3), turn 3 (seen=10): S=18 → 63.5%   S=20 → 72.2%   S=22 → 79.6%   S=24 → 85.6%
```

**(b) Mulligan-conditioned** — Monte Carlo (60,000 trials/config), London mulligan up to once,
mulligan any 7-card hand with <2 or >5 total lands, bottom the least-useful card(s) on a
mulligan, then check color sources among cards seen by the target turn:

```
single pip, turn 1 on draw: S=12 → 89.5%   S=14 → 93.7%   S=16 → 96.5%
double pip, turn 2 on draw: S=16 → 82.2%   S=18 → 88.8%   S=20 → 93.7%
triple pip, turn 3 on draw: S=20 → 79.2%   S=22 → 86.8%   S=24 → 92.6%
```

Conditioning moves S=14/single-pip from 89.8% (naive) to 93.7% (conditioned) — consistent with
Karsten's published "14 sources ≈ 90%" figure sitting between the two (his exact mulligan rule —
mulligan 0/1/6/7-land hands, then separately re-evaluate 6-card and 5-card hands — is stricter
about re-mulliganing than my one-mulligan-max simulation, which is why my conditioned numbers run
a couple points above his). **Net: naive hypergeometric alone understates real-game consistency by
roughly 3–7 points at these sample sizes; the headline 14/18/21 table already bakes in mulligan
behavior and should be used as-is, not derived by naive draw-probability alone.**

**Discount rules for lands that enter tapped / conditional sources** (CONVENTION — compiled from
practitioner consensus, no single primary source found for exact discount fractions):
- Always-untapped dual (shock, original dual, etc.): counts as a full source of each color.
- Checkland / fastland / slowland (conditionally or situationally untapped): counts as a full
  source in the *turn-window* analysis if it usually enters untapped early (fastland,
  checkland with the right land type out), else treat as tapped.
- Land that always enters tapped (most "slowlands," "vivid," scry lands): full color credit, but
  a real tempo cost not captured by the pure source count — commonly downweighted informally by
  treating one guaranteed-tapped land as worth slightly less than 1.0 in curve-sensitive slots
  (no published coefficient; CONVENTION).
- Treasure/mana-rock producing a color: counts as a source for consistency math only if it is
  castable before the spell it's meant to enable and survives to be used — not equivalent to a
  land for sequencing purposes. Most practitioner guides count these as 0.5–1.0 of a source
  depending on how cheap/reliable the rock is (CONVENTION, no primary formula found).
- MDFC (land/spell): counts as a source when face-up as the land side; for the purposes of
  color-source counting (distinct from land-count credit in §1), an MDFC land-back is usually
  counted as a full source of its color since the player chooses to play it as a land when
  color-screwed (CONVENTION extension of Karsten's MDFC land-count credit, which addresses
  quantity, not color-fixing quality).

**Engine rules**
4. Require ≥14 sources of a color for any spell with exactly one pip of that color castable by turn 1–3 on the draw, at ~90% consistency; ≥15 on the play.
5. Require ≥18 sources of a color for any spell with two pips of that color (e.g. `WW`) castable by turn 2–4, at ~90% consistency.
6. Require ≥21 sources of a color for any spell with three or more pips of that color at ~90% consistency; treat this as a near-mono-color commitment.
7. When computing "sources," count: basic lands, always-untapped duals/fetches-into-that-color at full weight; MDFC land-backs at full weight (color-fixing use case, distinct from §1's land-count credit); mana rocks at reduced weight (no fixed coefficient — CONVENTION, suggest 0.5 unless empirical data says otherwise) rather than 0 or 1.
8. Naive hypergeometric draw probability alone will understate true consistency by several points versus real (mulligan-aware) play — do not use naive P(≥k) as the sole gate without a margin; the 14/18/21 headline table already includes the mulligan effect and is the correct target to build against.

---

## 3. Archetype skeletons (60-card constructed)

**Sources:** compiled from multiple deckbuilding-theory summaries — no single primary academic
source for exact ratios exists; these are widely-repeated **CONVENTION** ranges, not measured
facts. [MTG Wiki: Aggro deck](https://mtg.fandom.com/wiki/Aggro_deck) ·
[Draftsim aggro guide](https://draftsim.com/mtg-aggro-deck/) ·
[Magic: The Gathering Authority archetypes](https://magicthegatheringauthority.com/deck-archetypes-aggro-control-combo-midrange) ·
[Gamertag Mythras archetypes](https://gamertagmythras.com/blog/magic-the-gathering/mtg-deck-archetypes-explained)

| Archetype | Lands | Creatures/threats | Removal/interaction | Card advantage | Curve top | Kill turn |
|---|---|---|---|---|---|---|
| Aggro | 18–23 | 26–35 (incl. equivalents) | light, cheap | rare, minimal | 3–4 MV | 3–5 |
| Tempo | 21–23 | 16–20 | moderate, mostly cheap (bounce/counter-lite) | light | 3–4 MV | 5–7 |
| Midrange | 23–25 | 14–18 spread across curve | moderate–heavy, efficient | moderate | 4–5 MV, 1–2 top-end finishers | 7–9 |
| Control | 25–27 | few (mostly finishers/planeswalkers) | heavy (removal + counters/wipes) | heavy | 4–6+ MV finishers | 9+ / by attrition |
| Combo | varies by shell (often 16–18 if aggro-combo, 24+ if control-combo) | minimal, combo pieces prioritized | just enough to survive to combo turn | high (to find pieces) | bimodal: cheap enablers + the combo itself | as soon as assembled |

Illustrative curve shapes (example skeletons, cube/constructed-derived, CONVENTION):
- **Aggro:** ~6× one-drop, 5× two-drop, 4× three-drop, 3× four-drop, 6 noncreature spells, 16–18 lands (40-card cube-derived shape scaled to 60 keeps the same *ratios*, not raw counts).
- **Midrange:** ~1× one-drop, 5× two-drop, 5× three-drop, 3× four-drop, 2× five-plus, 7 noncreature spells, 23–25 lands.
- **Control:** minimal early creatures, removal-dense turns 1–4, card draw turns 2–4, 1–3 finishers at 5+ MV, 25–27 lands.

**Engine rules**
9. If avg nonland MV ≤ 2.0 and count of MV-≤2 creatures ≥ 14, classify as Aggro; target lands 20–22 (bottom of the Karsten band), creature count 24+.
10. If avg nonland MV is 2.0–2.8 with removal+threats spread across MV 2–4 and 1–2 finishers at MV 5+, classify as Midrange; target lands 23–25.
11. If creature count ≤ 10 and removal+counterspell+wipe count ≥ 12, classify as Control; target lands 25–27, and require ≥1 sweeper effect (destroy/exile ≥3 creatures) at MV ≤ 5.
12. Combo shells: do not apply the standard threat/interaction ratios — instead require the combo package to hit ≥90% 4-of consistency math (§6) and treat land count per the underlying beatdown-or-control shell it's wrapped in.

---

## 4. Threat density vs. interaction density

No single authoritative Standard-specific numeric table was found (most published numeric
removal-density guidance is for Commander, where deck size/singleton constraints differ enough
that the raw numbers don't transfer). Compiled from
[Draftsim EDH removal](https://draftsim.com/edh-how-much-removal/),
[Tapped Decks removal package guide](https://tappeddecks.com/blog/commander-removal-package-guide),
[Kraken Opus removal heuristic](https://krakenopus.com/how-many-removal-and-counterspells-is-enough-in-magic-the-gathering/)
— all **CONVENTION**, scaled down from Commander's 99-card 10–12-interaction guideline
proportionally (10–12 / 99 ≈ 10–12%) and cross-checked against typical published Standard
decklists (removal counts in successful Standard lists commonly run 6–10 in a 60-card, i.e. 10–17%).

| Archetype | Win conditions (creatures/PWs that can close the game) | Removal + interaction (spot + sweeper + counters) |
|---|---|---|
| Aggro | 12+ (the creature base itself is the plan) | 0–4 |
| Tempo | 6–10 | 4–8 (bounce/counter-leaning) |
| Midrange | 4–8 (including value creatures that double as threats) | 6–10 |
| Control | 1–4 dedicated finishers | 10–16 |

Shifts with the metagame: against a fast/aggro-heavy field, all non-aggro archetypes trend toward
more early removal and fewer 5+ MV cards; against a combo/control-heavy field, midrange/control
trend toward more countermagic and disruption, less pure removal.

**Engine rules**
13. Aggro decks: cap dedicated removal at 4 slots; prioritize threat count over interaction.
14. Midrange/Control decks: target removal+interaction as 10–17% of the 60-card deck (6–10 cards), scaling toward the top of that range as avg opponent aggro-density (from the meta corpus, not covered here) increases.
15. Every non-aggro deck should carry at least one unconditional answer to a resolved threat (exile/destroy-any-creature effect) — decks with zero such effects are a known auto-build failure mode (see §8).

---

## 5. Sideboard construction (15-card board)

**Sources:** [TCGplayer sideboarding guide](https://www.tcgplayer.com/content/article/How-Do-You-Sideboard-in-MTG/e305a6bc-8ca7-4f03-a4bc-9998e4df46c8/) ·
[MTG Arena Zone sideboard guide](https://mtgazone.com/building-a-sideboard-turning-15-cards-into-wins/) ·
[Magic: The Gathering Authority sideboard theory](https://magicthegatheringauthority.com/sideboard-construction-and-strategy) —
these are practitioner-consensus (CONVENTION), not a peer-reviewed methodology.

**The "elephant method"** (attributed to Zvi Mowshowitz): write out the ideal realistic 60-card
list for every expected matchup, pool the *unique* cards across all those lists, and only then
decide which 75 total slots (60 main + 15 side) cover the most matchups. Build the deck as one
75-card unit, not a 60 followed by an afterthought 15.

**Slot allocation per matchup:** 2–3 copies of a targeted hate card is the norm — 1 copy is
statistically unreliable to draw post-board (see §6 math — a 1-of has an 11.7% opening-hand rate
and doesn't improve much by turn 3–4 either), 4 copies over-invests a scarce 15-slot budget into
a single matchup. **3–6 total card swaps** for a given matchup is typical; more than ~6 usually
means the maindeck itself is mistuned for the metagame, not that the matchup needs that much
boarding.

**Hosers vs. flexible cards:** narrow color/strategy hosers (graveyard hate, artifact hate,
color-specific "elemental blast" effects) are highest-impact in their exact matchup but dead
elsewhere; flexible cards (modal removal, cards good against two archetypes at once) are lower
peak impact but reduce the number of matchups the sideboard must ignore entirely. General
practitioner lean: prefer flexible cards for the bulk of the 15, reserve 2–4 slots for true
hosers only against decks expected to be common in the metagame — not for purely theoretical
matchups.

**The boarding-plan test:** for each of the top expected matchups, write an explicit IN/OUT list
before the event. If the OUT list can't find 3+ maindeck cards that are clearly worse in that
matchup, the deck doesn't have room to board without diluting itself, and side cards for that
matchup should not be prioritized.

**Engine rules**
16. Sideboard slot budget: default to 2–3 copies per targeted card, never plan around a bare 1-of unless it is a tutorable/dig-able target.
17. Cap total swap-in cards recommended for any single matchup at 6; if the natural answer set exceeds 6, flag the maindeck as mistuned for that matchup instead of over-boarding.
18. Weight flexible (multi-matchup) sideboard candidates above single-matchup hosers when two candidates fill a similar power level, unless the hosed matchup has corpus-confirmed high representation in the metagame (empirical-pass question).
19. Every sideboard plan must name ≥3 maindeck cards it cuts; a plan that adds cards without a matching cut list is invalid.

---

## 6. The 4-of rule and consistency math

**Sources:** [Star City Games, "Magical Hack: The Rule of Fours"](https://articles.starcitygames.com/articles/magical-hack-the-rule-of-fours/) ·
[WotC, "Four of a Kind"](https://magic.wizards.com/en/news/feature/four-kind-2016-08-11) ·
[Star City Games, "Four, Three, Two, One: How Many Copies Do You Run?"](https://articles.starcitygames.com/articles/four-three-two-one-how-many-copies-do-you-run/) —
theory/qualitative, CONVENTION. Numbers below are my own hypergeometric computation.

**Why 4-ofs dominate:** playing the maximum legal copies of your best cards is the simplest lever
for consistency — every non-4-of slot is a bet that some other effect (redundancy via similar
but distinct cards, a tutor, a specific matchup plan) is worth trading raw copy-count for.
3-ofs are correct when a card is powerful but has real downside if drawn in multiples (situational
answers, expensive bombs where flooding on copies is bad) or when 4 copies would push the card
count for an effect above what the deck actually wants live simultaneously. 2-ofs and 1-ofs are
typically tutor targets, format-specific narrow answers, or "good enough" filler where the deck
has more good cards than slots.

**Computed: P(≥1 copy of a 4-of by turn N), 60-card deck** (own hypergeometric computation,
`P = 1 − C(56, seen) / C(60, seen)`, seen = cards drawn by that point):

```
turn |  on the play (seen)     |  on the draw (seen)
  1  |  seen=7   39.9%          |  seen=8   44.5%
  2  |  seen=8   44.5%          |  seen=9   48.8%
  3  |  seen=9   48.8%          |  seen=10  52.8%
  4  |  seen=10  52.8%          |  seen=11  56.6%
  5  |  seen=11  56.6%          |  seen=12  60.1%
  6  |  seen=12  60.1%          |  seen=13  63.4%
  8  |  seen=14  66.5%          |  seen=15  69.4%
 10  |  seen=16  72.2%          |  seen=17  74.7%
```

Cross-checked: a secondary source independently states "39.9% chance of at least one copy in a
7-card opener for a 4-of in 60 cards" and "11.7% for a 1-of" — both match this computation exactly
(1-of turn-1 on the play: `1 − C(59,7)/C(60,7) = 7/60 = 11.7%`), confirming the method.

**Practical reading:** even a 4-of doesn't reach 50% seen until around turn 3 on the draw. A
2-card combo needing both pieces live simultaneously with zero tutoring, both at 4 copies, by
turn 4 on the draw (seen=11) is `P(≥1 of piece A) × P(≥1 of piece B | independent draws)` ≈
56.6% × 56.6% ≈ 32% if pieces are independent (they're not exactly, since drawing one card
changes the pool for the other, but this is the right order of magnitude) — which is the
quantitative reason 2-card no-tutor combos are considered unreliable before turn 6–7 and why such
decks invest heavily in card selection.

**Engine rules**
20. Default to 4 copies of any nonland card the deck wants to draw reliably and can tolerate seeing multiples of.
21. Drop to 3 copies only when (a) the card is a high-impact card where multiples are genuinely dead in hand (rare, situational answers) or (b) total count of a shared effect-class would otherwise exceed the deck's desired density for that effect.
22. Never build around a bare 1-of or 2-of "key card" unless the deck also runs ≥3 tutor effects for it or the card is genuinely replaceable (i.e., not load-bearing).
23. For any combo requiring 2+ specific cards simultaneously with no tutoring, do not credit the combo as "live" before turn 6–7 on the draw at 4 copies each; credit proportionally lower for fewer copies or earlier turns using the compounding hypergeometric estimate above.

---

## 7. Mulligan / opening-hand math and its construction implications

**Own computation** — hypergeometric P(land count in range) for a 7-card opener, 60-card deck,
by land count L (exact, `C(L,k)×C(60−L,7−k) / C(60,7)` summed over k in range):

```
L=18: P(2-4 lands)=66.4%  P(2-5 lands)=68.4%  P(>=2 lands)=68.6%
L=20: P(2-4 lands)=71.7%  P(2-5 lands)=74.9%  P(>=2 lands)=75.3%
L=22: P(2-4 lands)=75.4%  P(2-5 lands)=80.2%  P(>=2 lands)=81.0%
L=23: P(2-4 lands)=76.7%  P(2-5 lands)=82.5%  P(>=2 lands)=83.5%
L=24: P(2-4 lands)=77.5%  P(2-5 lands)=84.4%  P(>=2 lands)=85.7%
L=25: P(2-4 lands)=77.8%  P(2-5 lands)=86.0%  P(>=2 lands)=87.8%
L=26: P(2-4 lands)=77.8%  P(2-5 lands)=87.4%  P(>=2 lands)=89.6%
L=28: P(2-4 lands)=76.5%  P(2-5 lands)=89.1%  P(>=2 lands)=92.6%
```

Independently matches a secondary source's stated "24 lands → 77.5% (2-4) / 85.7% (≥2 lands)"
exactly, confirming the computation.
[Source](https://gamertagmythras.com/blog/magic-the-gathering/mtg-mulligan-guide-london-mulligan)

Note the "2–4 lands" window peaks and flattens around L=24–26 (77.5–77.8%) — pushing land count
past ~26 buys very little extra chance of a *comfortably in-range* hand (it mostly trades "too
few lands" risk for "too many lands" risk), while the *"at least 2 lands"* metric keeps climbing
because it doesn't penalize flood. This is the quantitative shape behind "24–26 is the Standard
sweet spot" — it's not that more lands stop helping, it's that the two failure modes (screw vs.
flood) trade off around there for a typical curve.

**London mulligan mechanics:** each mulligan draws a fresh 7, then bottoms a number of cards
equal to mulligans taken (so a 1-mulligan keep still *sees* 7 cards and chooses the best 6 to
keep). This structurally favors decks that can function slightly land-light or slightly
spell-light after a mulligan, because the player selects which card(s) to bottom rather than
being stuck with a random reduced hand (as under the old "Vancouver" mulligan). It also means a
mulligan is comparatively cheaper for decks with a narrow/consistent gameplan (curve-outs,
combo) than the classic "lose a card" framing suggests, since screening for exactly what's needed
is easier when the deck wants a narrower band of cards.

**Construction implications (CONVENTION, follows directly from the numbers above):**
- Very low-curve aggro decks can keep 1-land hands profitably if avg MV < ~1.5 and the land
  matches the deck's primary color — the deck's own curve substitutes for the missing land draws.
- Decks that structurally cannot mulligan aggressively (combo needing a specific density of
  pieces) should run land counts toward the top of their Karsten-formula band, since every
  mulligan taken to find the color/curve costs proportionally more when there's no slack.

**Engine rules**
24. Do not recommend land counts below 20 for any 60-card Standard archetype regardless of curve — below L=20 the "2-4 lands" keep rate drops under ~72% even before mulligan support, which is below what practitioner consensus treats as reliable.
25. Treat L=24–26 as the default target band absent other signal; deviate downward only for avg MV ≤ 2.0 decks with ≥8 one-drops (aggro), upward only for avg MV ≥ 3.2 decks or decks wanting to hard-cast 4+ mana value spells reliably (control).

---

## 8. Common failure modes of auto-generated decklists

Not sourced externally — this section synthesizes known auto-build failure patterns from general
deckbuilding-engine practice and the "reconciliation" gaps already identified above. Tests should
catch these categorically, not just for one bad decklist instance.

| Failure mode | Symptom | Test that catches it |
|---|---|---|
| No removal/interaction | Deck has 0–2 unconditional answers | Assert removal+interaction count ≥ archetype floor (§4, rule 14/15) |
| Curve top-heavy for the archetype | Aggro deck with avg MV > 2.5, or too many 5+ MV cards for its land count | Assert avg MV within archetype band before applying Karsten land formula |
| Land count mismatched to curve | Karsten formula applied to wrong avg MV bucket (e.g. computed pre-cuts, not post-cuts) | Recompute avg MV from the *final* 60-card list, not the candidate pool, before setting land count |
| Color base under-supports pip density | A card with `WW`/`BB` etc. included with < 18 sources of that color | Gate card inclusion on §2 rule 4–6 source thresholds given the *actual* manabase being built, not the format average |
| Redundant narrow effects crowd the curve | Multiple near-identical 1-of situational answers instead of one flexible 3-4-of | Cap unique "answer" cards per removal-subtype; prefer copy-count increases over card-count sprawl |
| Sideboard built as generic goodstuff, not matchup-targeted | 15 cards with no coherent boarding plan against any specific expected archetype | Require each sideboard card tagged with ≥1 target matchup from the metagame corpus |
| MDFC/land-back miscounted as both a spell slot and 0 lands | Effective land count too low despite "24 lands" on the list | Use `effectiveLandCount()` (already implemented) everywhere land sufficiency is checked, never raw `landCount` |
| 4-of assumed for cards that should be fewer | Situational sideboard-style answers maindecked at 4 copies, flooding dead draws | Apply §6 rule 21–22 (3-of/lower ceiling for situational cards) as a build-time check, not just a suggestion |
| Combo pieces treated as always-live | Auto-build credits a 2-card combo as a "win condition" without accounting for find-probability | Apply §6 rule 23 — discount combo win-condition credit by the compounded hypergeometric estimate |

---

## Open questions for the empirical pass

These require the project's own corpus (`commander_card_stats`-equivalent Standard/mtgo data,
per `docs/PROJECT... ` Session Log 2026-09-08/09/10 pipeline) rather than published theory:

1. What removal-density counts do actually-winning current Standard decks run, broken out by
   archetype (aggro/midrange/control/tempo)? §4's numbers are Commander-derived approximations.
2. Does the corpus's real mtgo-sourced W/L data support a *different* land-count target than
   Karsten's formula for specific archetypes (e.g. do winning aggro lists in this Standard
   format run below 20 lands, contradicting Engine rule 24)?
3. What is the actual observed distribution of copy-counts (4/3/2/1) in winning decklists per
   card role, to calibrate Engine rules 20–22 against real practice rather than theory?
4. For sideboard construction (§5), what specific hosers/flexible cards are the highest-win-rate
   swaps in the current metagame's actual top matchups, per corpus data?
5. Does this Standard format's actual color-source distribution in winning decks match or beat
   the 14/18/21 headline table, or does the format's specific curve (aggressive vs. grindy) shift
   the practical threshold, as suggested by the naive-vs-conditioned gap found in §2?
6. What MDFC/Treasure/mana-rock discount weighting (§2, "discount rules") does the corpus support
   empirically, since no primary source published exact coefficients for these?
