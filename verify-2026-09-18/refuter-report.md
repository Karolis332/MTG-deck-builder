# Refuter report — The Cabbage Merchant, design A vs design B
Adversarial verification, 2026-09-18. Every command was re-run by me; no builder output trusted. Design B was
revised mid-review (Gingerbrute in, Forest 31 to 30); everything below is against `design-B.txt` at 10:31 and
`design-B.md` at 10:35, which I re-validated after the change.

## (a) PASS/FAIL per criterion

| # | Criterion | Design A | Design B |
|---|---|---|---|
| 1 | Validator clean, exactly 100, no duplicate non-basics | **PASS** `check-deck.cjs design-A.txt --ci G` -> `total cards: 100  lands: 36 ... errors: 0` | **PASS** same command -> `total cards: 100  lands: 35 ... errors: 0` |
| 2 | Every add in the pool with legality legal/deck/side | **PASS** 0 not-in-pool, 0 legality flags | **PASS** 0 not-in-pool, 0 legality flags |
| 3 | Dropped-card scan (inc>=20 or lift>=2.5, in neither list nor current deck) | **PARTIAL** 20 cards, 1 real miss (Chrome Dome) | **PARTIAL** same 20 missed |
| 4 | Shared cuts justified | **PASS** all 31 sound | **PASS** all 31 sound |
| 5 | Disputed slots | **3 wrong** (Seedborn Muse, Tezzeret, Fomori Vault) | **5 wrong** (Toski, Party Dude, Goldvein Hydra, Knockout Maneuver, Orchard Strider) |
| 6 | Mana / land count | **PARTIAL** 34 true + 2 MDFC is right; 2 colourless lands against three {G}{G}{G} costs is one too many | **PASS** 33 true + 2 MDFC, 35/35 green sources, claim verified |
| 7 | Win condition is real | **PASS** kill is real, turn estimate optimistic by about one turn | **PASS** its ranked #1 (Halsin) is a two-turn clock, not a one-swing kill |
| 8 | Rules claims in sections 10-12 | **PARTIAL** 3 wrong claims | **PARTIAL** 4 wrong claims |
| 9 | Opening-hand criteria consistent | **FAIL** Mox Opal listed as a one-mana accelerant | **PASS** |

Validator caveat verified in source: `check-deck.cjs:37-39` loads every name from the current deck and the
sidedeck into `DECK_OK`/`owned`, **bypassing both the Brawl-legality and the ownership check** for those names,
so "errors: 0" is weaker than it looks. I re-checked legality independently against `cabbage-pool-FULL.txt` for
all 100 cards in each list: no `db:not_legal` or `db:banned` card is used by either.
## (b) Findings by severity

### HIGH-1 — Design B keeps Flare of Cultivation on a misread alternative cost
`design-B.md`, section 9: "the alternative cost makes it a free spell when a token body is expendable." Pool
oracle: *"You may sacrifice a **nontoken** green creature rather than pay this spell's mana cost."* A token can
never pay it. Design A cut the card with the correct reading (`design-A.md:125`). B's only free-spell
justification evaporates; it is a 3-mana ramp sorcery in a 33-land deck.

### HIGH-2 — Design B's Nutrient Block reason is impossible
`design-B.md:195` and `design-B.md:290`: "draws a card when the commander's damage clause eats it" and
"a free sacrifice outlet the opponent operates for you, feeding Syr Ginger and **Nutrient Block**."
Commander oracle, verified in the card DB and not just the brief: *"Whenever a creature deals combat damage to
you, sacrifice a Food **token**."* Nutrient Block is `Artifact — Food`, a nontoken card, so it can never be
chosen for that trigger. The Syr Ginger half is correct. Nutrient Block is still fine via Wicked Wolf
("Sacrifice a Food"), Peregrin Took ("Sacrifice three Foods") and its own ability, so the card stays; the
stated reason does not.

### HIGH-3 — Design A contradicts its own list about Nutrient Block, twice
`design-A.md:300`: "Nutrient Block did not make the final 100." It is `design-A.txt:15`.
`design-A.md:184`: "An indestructible Food that **returns itself to hand**." False. Pool oracle: *"When this
artifact is put into a graveyard from the battlefield, **draw a card**."* Lembas is the card that returns
itself, and it shuffles into the **library**, not the hand. Two wrong statements about one card.

### HIGH-4 — Design A's mulligan rule treats Mox Opal as acceleration
`design-A.md:309`: "2 lands **plus** a one-mana accelerant (Llanowar Elves, Elvish Mystic, Gilded Goose,
Utopia Sprawl, **Mox Opal**)". Mox Opal: *"Metalcraft — {T}: Add one mana of any color. Activate only if you
control three or more artifacts."* On turn 1-2 it produces zero mana. Keeping a two-lander on Mox Opal is a
mulligan to five. The rest of A's opening-hand section is consistent with 36 land slots.

### MEDIUM-5 — Both lists miss the highest-lift unused card in the pool
Chrome Dome — inc **27.9 %**, lift **3.88**, 4 copies owned, `legal`. `{2}` Artifact Creature — Robot Ninja:
*"Other artifact creatures you control get +1/+0. {5}: Create a token that's a copy of another target artifact
you control. That token gains haste. Sacrifice it at the beginning of the next end step."* Under Displaced
Dinosaurs every Food token is a 7/7 **artifact** creature, so the anthem is live on the whole board, and the
{5} ability makes a second Academy Manufactor for a turn (one Food trigger becomes 9 tokens). The pool's fourth
highest lift went unused by both — the exact failure the "never pre-filter the candidate set" lesson describes.

### MEDIUM-6 — Design A runs two colourless lands against three triple-green costs
A: 29 Forest + Command Tower + Ba Sing Se + Mosswort Bridge = **32 green of 34 true lands**. Inventors' Fair
and Fomori Vault both read *"{T}: Add {C}"*. A's {G}{G}{G} costs are Archdruid's Charm, Chord of Calling and
Disciple of Freyalise, plus eight {G}{G} costs and Nissa, who only doubles **Forests**. B is at 35/35 green
and its own land claim checks out after the revision. Keep Inventors' Fair (inc 48.7, lift 3.17, any-artifact
tutor);
cut Fomori Vault, whose activation is `{3}, {T}, discard a card`, the most expensive utility land in the pool.

### MEDIUM-7 — Design B's Toski cut rests on a false premise
`design-B.md:139`: "Forcing a 1/1 into a single opponent's blockers is a liability." Toski is *indestructible*
and *can't be countered*, so it cannot be lost in combat. The conclusion (mediocre) is arguable, the reason is
wrong. With Halsin's 4/4 Bears and Displaced Dinosaurs' 7/7s it draws a card per connecting body. Kept.

### MEDIUM-8 — Design B's Party Dude argument has the 1v1 axis backwards
`design-B.md:137` rates the symmetric Food as a 1v1 problem. One opponent getting one Food is the **smallest**
version of that drawback; multiplayer, where the corpus's 15.8 % inc and 3.27 lift were measured, gives three
opponents a Food. The level-2 ability *"Whenever an artifact an opponent controls is put into a graveyard from
the battlefield, draw a card"* is turned on by the very Food you gave them. {G} for a token event that Took and
Manufactor multiply beats 3 life on a deck whose kill is 7/7s. Kept.

### MEDIUM-9 — Design A understates Doubling Season on the Bumi line
`design-A.md:239`: "With Doubling Season it is 20 counters." It also doubles the Food the Lecture creates
*before* the count: 4 prior Foods, create 1 doubled to 2, gives 6 Foods, earthbend 12, doubled to **24**.

### LOW-10 — Design A overstates Unlucky Cabbage Merchant's one-shot clause
`design-A.md:288` says it bottoms itself after the first Food sacrifice; the search is optional
(*"you **may** search"*) and only searching bottoms it, so you can keep the body. Design B's earlier land-count
and Forest-count slips were self-corrected in the 10:35 revision and no longer apply.

### LOW-12 — Arachnogenesis is the closest shared cut to a reversal
Both cut it as multiplayer-only (inc 17.0, lift 1.67). In **Bo1** Brawl there is no sideboard, and both lists
kill on turn 7-8. A card that both fogs and leaves blockers is the cleanest answer to a turn-4 aggro start.
I did not reverse it, since Heroic Intervention, Endurance, Wicked Wolf, Beast Within and Walking Ballista
cover enough, but it is the one shared cut worth revisiting if the ladder is aggro-heavy.

### Dropped-card scan, all 20 (inc >= 20 OR lift >= 2.5, in neither design and not in the current deck)
| Card | inc% | lift | Omitting it is |
|---|---|---|---|
| Crop Rotation | 37.2 | 0.64 | Right. Only 3-5 land targets here, and it eats a land. |
| Emergence Zone | 32.7 | 1.66 | Right. Colourless land, and no flash payoff worth a land slot. |
| Gemstone Caverns | 31.0 | 1.70 | Right. Colourless, and only live on the draw with a spare card. |
| Vexing Bauble | 29.5 | 2.50 | Right. Mostly hate; the cantrip does not pay for a slot. |
| **Chrome Dome** | **27.9** | **3.88** | **Wrong. See MEDIUM-5. Added in my merged list.** |
| Noxious Revival | 25.9 | 1.43 | Right. No graveyard theme to rebuy. |
| Harmonize | 25.4 | 0.04 | Right. Sylvan Library, Idol of Oblivion and Toski draw more cheaply. |
| Craterhoof Behemoth | 21.4 | -0.05 | Right. MV 8 against a 2.4 curve, and the token pile is artifacts, not creatures, until animated. |
| Agatha's Soul Cauldron | 15.1 | 2.64 | Right. Needs both a graveyard and a counters theme. |
| Creeping Crystal Coating | 9.7 | 3.34 | Right. An Aura that two-for-ones to any removal. |
| Pippin's Bravery | 8.8 | 3.21 | Right. A combat trick that spends a Food. |
| Secluded Starforge | 8.1 | 3.41 | Right. Colourless land, activations cost 2 and 5. |
| The Art of Tea | 6.9 | 3.24 | Right. One Food at instant speed is below the bar at 2 mana. |
| Glaring Fleshraker | 6.5 | 2.51 | Right. {2}{C}, and it wants colourless spells this deck does not cast. |
| Mirrormind Crown | 5.1 | 2.51 | Right. Four to cast plus two to equip before it does anything. |
| Leaves from the Vine | 3.9 | 2.91 | Right. A Saga paying out over three turns. |
| Eriette's Tempting Apple | 3.6 | 3.52 | Right. A 4-mana Threaten with no sacrifice outlet for the stolen creature. |
| Omni-Cheese Pizza | 2.5 | 2.69 | Right. Worse than Instant Ramen and Candy Trail, both already in. |
| Magnetic Snuffler | 0.4 | 3.49 | Right. MV 5 and it wants an Equipment in the graveyard. |
| Together as One | 0.2 | 2.54 | Right. Converge in a mono-coloured deck is X=1. |

**Sidedeck (48 cards):** nothing with a strong case was missed. The only name worth stating is **Elvish Spirit
Guide** (inc 34.9, lift 1.64), a free {G} that would turn a turn-2 Academy Manufactor on; it is card
disadvantage in a 1v1 grind and both were right to leave it. The rest sits at 5 % or below with negative lift.

### Rules check on sections 10-12: the claims that are CORRECT and load-bearing
Verified against the pool oracle text. Both designers got the hard ones right.
- **Took + Manufactor ordering.** Both are replacement effects on one token-creation event; CR 616.1 gives the
  choice to the affected player, which is you. **For one Food trigger, Took first = 6 tokens** (Took makes it
  2 Foods, Manufactor then replaces each with one of each, giving 2 Clue + 2 Food + 2 Treasure);
  **Manufactor first = 4 tokens** (Clue + Food + Treasure, then Took's single extra Food). A states this case
  exactly (`design-A.md:262`); B states the 3-Food case, 12 versus 10 (`design-B.md:267`), also correct.
- **Jaheira** grants *"{T}: Add {G}"* to **all** tokens, not only Food, so Clue, Treasure and Role tokens tap
  too, and they are noncreature permanents so summoning sickness never applies. Both correct.
- **Night of the Sweets' Revenge** is Food-only, and Foods tapped for mana still count for its X because the
  ability counts Foods you control, not untapped ones. Both correct.
- **Second Harvest + Manufactor**: a copy of a Food token is a Food token being created, so Manufactor applies
  to each copy. Both correct.
- **Displaced Dinosaurs anti-synergy**: tokens enter *as* 7/7 creatures, so they are summoning sick and cannot
  use Jaheira's or Night's granted {T} ability that turn. Both flagged it. B adds the correct rider that they
  **can** still be tapped for convoke on Chord of Calling, and that the commander's own "tap two untapped
  Foods" cost is likewise unaffected by summoning sickness.
- **Garruk's Uprising does not fire on animation** (Halsin, Tough Cookie), only on a power-4 creature
  *entering*. B states this explicitly (`design-B.md:228`, `:282`); A never claims otherwise.
- **Wicked Wolf**: the tap is part of the effect, not a cost, so it can be activated again while already
  tapped (`design-B.md:286`). Correct, and more precise than A's framing.
- **Syr Ginger, Sarinth Steelseeker, Idol of Oblivion, Teething Wurmlet, the Bumi earthbend maths, Nissa's +1,
  two Manufactors giving 9 tokens, and "no infinite loop in this list"** are all correct in both documents.

## (c) Verdict: design A is the better base

A is the Food and artifact engine deck this commander actually is; B is a green midrange deck that happens to
have a Food commander. Concretely, A runs **20 artifacts to B's 17**, and that count is the input to Sarinth
Steelseeker, Teething Wurmlet, Syr Ginger, Idol of Oblivion, Inventors' Fair, Nettlecyst and Mox Opal at once.
A's only-adds are high-lift corpus cards (Inventors' Fair 48.7/3.17, Instant Ramen 11.8/3.59, Candy Trail
8.0/3.52, Lembas 16.8/3.52). B also runs one fewer land (33 true to A's 34). Three of B's only-adds are
sideboard filler with negative lift: Goldvein Hydra
(1.5 / -0.96), Knockout Maneuver (0.2 / -1.24) and Orchard Strider (six mana for two Foods). B's genuine wins
are its **cut list** (Seedborn Muse) and **Lightning Greaves**, and I merge both in. Power port, report only:
A 7.38, B 7.18, merged 7.31 — the dip is the price term losing Seedborn Muse, not a strength signal.

## (d) Merged list: design A with three swaps

Written to `verify-2026-09-18/merged.txt`.

1. **-Seedborn Muse +Lightning Greaves.** B is right on the 1v1 argument: one extra untap per cycle instead of
   three, for five mana and no board presence. Its 34.1 % inclusion carries lift 0.88, generic rather than
   commander-specific and measured in multiplayer. Greaves (inc 26.9) answers this deck's real failure mode, a
   removal spell on Academy Manufactor or Jaheira, at equip {0}, and is itself an artifact for six payoffs.
2. **-Tezzeret, Cruel Captain +Chrome Dome.** Tezzeret's 0 is worth roughly one mana a turn, the -3 only
   fetches artifacts of mana value 1 or less, and the -7 needs loyalty 10. A 3-mana planeswalker with no board
   impact dies to the first attack in 1v1. Chrome Dome is the pool's highest-lift unused card (27.9 / 3.88), a
   2-mana artifact creature, an anthem for every Dinosaur-animated Food, and a second Manufactor for {5}.
3. **-Fomori Vault, Forest 29 to 30.** Removes A's second colourless source against three {G}{G}{G} costs and
   Nissa's Forest-only doubling. Inventors' Fair stays as the one colourless slot because it tutors any
   artifact. Green sources go from 32/34 to 33/34 true lands, or 35 of 36 counting both double-faced lands.

Kept against B, with reasons: **Toski** (MEDIUM-7, indestructible and drawing off the Dinosaur board),
**Party Dude** (MEDIUM-8), **Doubling Season** (it doubles the engine and the Bumi kill, and the five-slot is
down to three cards after swap 1), **Mox Opal** (22 artifacts after the merge; Gilded Goose plus Mox Opal plus
any one-mana artifact is metalcraft on turn 2-3, which is realistic, just not a mulligan keep), and
**Inventors' Fair**. Rejected from B: Snakeskin Veil and Royal Treatment (redundant behind Veil of Summer,
Tamiyo's Safekeeping and Heroic Intervention), Goldvein Hydra, Knockout Maneuver and Orchard Strider. Near
miss: Origin of Metalbending, a genuinely flexible 2-mana modal instant and the first card to add if the
ladder turns artifact-heavy.

Validator on the merged list:
```
node verify-2026-09-18/check-deck.cjs verify-2026-09-18/merged.txt --ci G
total cards : 100   lands: 36   nonland: 64
avg MV (nonland): 2.36
curve       : 0:3 1:15 2:18 3:18 4:6 5:3 7:1
errors      : 0
```
34 true lands (30 Forest, Command Tower, Ba Sing Se, Mosswort Bridge, Inventors' Fair) plus two double-faced
lands that enter untapped for 3 life. That is the right number: the curve is 2.36, there are eight non-land
mana sources, and Arena's Bo1 smoother draws two sevens and keeps the one nearer the deck's land ratio, which
cuts the flood and screw tails this count is normally padded against. Flood outlets exist in Idol of Oblivion,
Inventors' Fair, Walking Ballista, Chord of Calling's X and the Bumi earthbend. 33 true lands would also be
defensible; 29 Forests plus two colourless lands was not.

**Win-condition reality, honestly.** The kill is Displaced Dinosaurs plus Academy Manufactor, and it needs
**two turns after the Dinosaurs resolve**, not one, because the Dinosaur-animated tokens are summoning sick on
the turn they are created. The median line is Dinosaurs on turn 6 (seven mana needs Jaheira token mana, Nissa
or a dork), one token event that turn or the next, then a swing on turn 7-8 for 42 trampling power off six
tokens, lethal from 25 in one attack with Garruk's Uprising. Bumi's Feast Lecture is the fastest single card,
but a 4/4 to 10/10 hasty land is a three-attack clock that dies to any creature removal, taking a land with it.
Neither designer's "turn 5 to 6" is the median. **Turn 7-8 is.** All three lists win late.

## (e) Corrected rules claims
1. Nutrient Block does **not** return itself to hand (design A). It draws a card when put into a graveyard from
   the battlefield, and it is in design A's final 100.
2. Nutrient Block can **not** be sacrificed to the commander's combat-damage trigger (design B). That trigger
   reads "sacrifice a Food **token**" and Nutrient Block is a nontoken Food card. Use Wicked Wolf or Peregrin
   Took as the outlet instead.
3. Flare of Cultivation's alternative cost requires a **nontoken** green creature (design B). A token never
   pays it.
4. Toski, Bearer of Secrets cannot be killed by blockers (design B). It is indestructible and uncounterable.
5. Doubling Season on Bumi's Feast Lecture yields 24 counters from four prior Foods, not 20 (design A), because
   the Food the Lecture itself creates is doubled before the count is taken.
6. Mox Opal is not a mana accelerant for mulligan purposes (design A). Metalcraft gates every activation.
7. Unlucky Cabbage Merchant only bottoms itself if you choose to search, and the search is optional (design A).
