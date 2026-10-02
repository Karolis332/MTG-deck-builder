# Captain Sisay — fixed-point build report (2026-10-02)

Historic Brawl, 1v1, 25 life. Start: `quick-v1.txt`. Result: `final.txt` (10 swaps). All oracle quotes come from `pool-0*.md`.

## 1. Plan

- Sisay: "{T}: Search your library for a legendary card, reveal that card, put it into your hand". She finds Way of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life") and Way of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control"). With both out, N walkers activating gives every walker +N loyalty each turn.
- 12 walkers, 4 Ways and the Jace token are the engine. 8 sources of "another creature you control enters → gain 1 life" turn each token into Mentor counters. Bloombrute, Caretaker's Talent and Haliya turn the same events into cards.
- Tokens (Ajani OC +1, Eternal Wanderer 0, the Ways' Cadet/Beast abilities, Germinate Recruits, each doubled by Doubling Season / Exalted Sunborn) close the game with Craterhoof, Elesh Norn or walker ultimates.
- Second tutor per turn: Tezzeret 0 ("Untap target artifact or creature") or Formidable Speaker ("{1}, {T}: Untap another target permanent"). Greaves/Boots give Sisay haste.
- **Sisay targets: 28 legendary cards** (27 nonland + Eiganjo). quick-v1 had 29; Beza is gone.

## 2. Health: quick-v1 vs final

| Metric | quick-v1 | final |
|---|---|---|
| Lands | 35 (G sources 24 / W 22, + Great Hall for legendaries) | 35 (24 / 22) |
| Ramp: dorks/rocks | 10 (incl. Propagator) + Mirari's Wake | 10 |
| Draw engines | 5: One Ring, Sylvan Library, Haliya, Great Henge, Beza | 7: One Ring, Sylvan Library, Haliya, Great Henge, **Bloombrute, Caretaker's Talent, Kutzil** |
| Spot removal | 5 | 6 (+Ossification) |
| Wipes | 2 (Urza's Ruinous Blast, Sunfall) + Elesh Norn | same |
| Protection | 6 (Teferi's Prot., Heroic Int., Dawn's Truce, Greaves, Boots, Tomik) | 6 (Kutzil for Tomik) |
| Walkers | 12 | 12 (Karn for Arlinn) |
| Ways | 4 | 4 |
| Creature-ETB lifegain sources | 7 (Liliana, Aunt May, Haliya, Propagator, Dazzling Angel, Authority, Belladonna) | 8 (Authority out; **Hinterland Sanctifier, Virulent Emissary** in) |
| Token makers | 12 + 2 doublers | 10 + 2 doublers + Caretaker's Talent (L2 copies a token) |
| Tutors / Sisay untappers | 4 / 2 | 4 / 2 |
| Win lines (gate count) | 8 | 9 |
| Avg MV, nonland | 3.03 | 2.97 |
| Pips G / W | 35 / 40 | 34 / 38 |

Mana: the deck stays at 35 lands + 10 dorks/rocks. Paradox gives an extra land drop and Evolution Sage proliferates on landfall, so land drops are never dead. The gate's band is 37 ±2, so 35 passes.

Colour sources:
- **G: 24 lands.** Command Tower, Temple Garden, Overgrown Farmland, Lush Portico, Fortified Village, Vigorbloom Annex, Arctic Treeline, Brokers Hideout, Cabaretti Courtyard, Fabled Passage, Misty Rainforest, Flooded Strand (via a Forest-typed dual), Starting Town, 11 Forest.
- **W: 22 lands.** The same 13 nonbasics, plus Eiganjo, Abandoned Air Temple and 7 Plains.
- **Why G is ahead of W pips.** Every 1-drop ramp piece costs {G}: Llanowar, Mystic, Pilgrim, Sprawl and Emissary. The dorks then make W: Pilgrim "Add {W}", Bloom Tender, Feaster, Signet, Talisman.
- **Forest count is 14** (11 basics + Temple Garden, Lush Portico, Arctic Treeline). This feeds Nissa ("Whenever you tap a Forest for mana, add an additional {G}") and Utopia Sprawl.

## 3. Swaps, ranked by impact

| # | IN | OUT | Role | Why IN (quote) | Why OUT is weaker |
|---|---|---|---|---|---|
| 1 | Bloombrute | Anthem of Champions | draw | "Whenever you gain life, draw a card. This ability triggers only once each turn." Every loyalty activation (Paradox) and every creature ETB gains life, so this is about 1 card per turn, on both players' turns | "Creatures you control get +1/+1." That is all it does; Caretaker's Talent L3 and Elesh Norn already cover the anthem |
| 2 | Germinate Recruits | Monastery Mentor | tokens / finisher | "Create X 2/2 ... Cadet, where X is the amount of life you gained this turn." Cast in main 2 after all walkers activate: X ≈ 5–10, doubled by Doubling Season / Exalted Sunborn. Each Cadet then re-triggers the ETB lifegain sources | One "1/1 white Monk" per noncreature spell, on a 2/2 that dies to everything |
| 3 | Karn, the Great Creator | Arlinn, Voice of the Pack | walker | 4 MV and colourless. "+1" every turn is a free Paradox trigger. "Activated abilities of artifacts your opponents control can't be activated." (−2 finds nothing in Arena Brawl; the +1 is the reason to play him) | 6 MV, and its only ability is "−2: Create a 2/2 green Wolf". Its Wolf clause only helps its own tokens |
| 4 | Caretaker's Talent | Mirari's Wake | draw / tokens | "Whenever one or more tokens you control enter, draw a card." L2 copies a token; L3: "Creature tokens you control get +2/+2". 3 MV; as an enchantment it makes an Archon Pegasus and is a Pia / Enlightened Tutor target | 5 MV. "+1/+1" is half of L3, and the mana doubling is redundant next to 10 dorks/rocks + Nissa |
| 5 | Hinterland Sanctifier | Authority of the Consuls | lifegain source | "Whenever another creature you control enters, you gain 1 life." Triggers on our own tokens, dozens of times per game | Triggers only "Whenever a creature an opponent controls enters" (one opponent in 1v1) |
| 6 | Kutzil, Malamet Exemplar | Tomik, Orzhov Lawmage | protection / legendary | "Your opponents can't cast spells during your turn." Sisay turns, Doubling Season and Craterhoof can't be countered or answered at instant speed. It also draws when pumped creatures connect (Elesh, Talent L3, Hoof) | "No more than one creature can attack this planeswalker each combat." Combat only; tokens, Teyo walls and Eternal Wanderer already cover that |
| 7 | Virulent Emissary | Ajani's Pridemate | lifegain source | Same clause, "Whenever another creature you control enters, you gain 1 life", on a {G} 1-drop with Deathtouch | Payoff only: "put a +1/+1 counter on this creature". It creates no event for Mentor or Bloombrute |
| 8 | Ossification | Beza, the Bounding Spring | removal | {1}{W}: "exile target creature or planeswalker an opponent controls" (18 basics enable it). As an enchantment it feeds Archon, Pia and Enlightened Tutor | Every mode is conditional: "if an opponent has more life than you" / "controls more lands than you". In a lifegain-ramp deck these are rarely true |
| 9 | Vigorbloom Annex | Temple of Plenty | land | "This land enters tapped unless you control a planeswalker." With 12 walkers + Jace tokens it is untapped from about turn 3 | "This land enters tapped." every time; scry 1 is worth less than untapped mana |
| 10 | Forest | Ba Sing Se | land | Nissa "Whenever you tap a Forest", Sprawl "Enchant Forest". Fetchable by Misty, Fabled Passage, Brokers Hideout, Cabaretti Courtyard; can be revealed for Fortified Village | None of those apply. "{2}{G}, {T}: Earthbend 2" is a minor sink, and it enters tapped without a basic |

## 4. Stop proof per role (final pass: zero improving swaps)

- **Walkers.** The pool holds 13 owned planeswalkers; 12 are in the deck.
  - The only one left out is Arlinn. It loses to the weakest kept walker, Teyo, the Shieldmage.
  - Both are minus-only walkers that the Paradox+Mentor loop keeps alive. Teyo costs 3, not 6, and its static works: "You have hexproof."
  - Arlinn's static ("Each creature you control that's a Wolf or a Werewolf enters with an additional +1/+1 counter") only touches its own Wolves.
  - The Jace empowerers lose to Teyo too (Academic Ascent, Arcane Amphisbaena: "empower Jace 2"; Hexhaven Battalion at 6 MV). The Ways already create Jace, so these only add counters to an existing token.
- **Ways.** All 4 GW Ways are in. There are no candidates.
- **Lifegain sources.**
  - Impassioned Orator has the same clause, "Whenever another creature you control enters, you gain 1 life". It only ties the weakest kept source, Dazzling Angel. A swap needs a strict gain, and Angel's "Flying" blocks fliers that attack walkers.
  - Inspiring Overseer ("When this creature enters, you gain 1 life and draw a card") fires once. Angel fires on every creature.
  - Druid Class ("Landfall — ... you gain 1 life") triggers on 1–2 lands per turn. The Angel triggers on every token.
- **Draw.** The weakest kept draw card is Sylvan Library ({1}{G}, "you may draw two additional cards" every turn, paid with life the engine produces).
  - Harmonize: 4 MV, "Draw three cards" once.
  - Up the Beanstalk: triggers only on about 11 spells with MV ≥ 5.
  - Return of the Wildspeaker: 5 MV, one-shot.
  - Mind Stone: "Draw a card" once.
  - All of them lose to Library.
- **Tokens.** The weakest kept token maker is Leonin Warleader ("Whenever this creature attacks, create two 1/1 white Cat creature tokens with lifelink" — repeatable, 4 MV).
  - Regal Caracal: 5 MV, makes two lifelink Cats once.
  - Hop to It: "three 1/1" once.
  - Release the Dogs: four 1/1s once, for 4.
  - Cosmogrand Zenith: needs a second spell each turn.
  - All of them lose to Warleader.
- **Multipliers / finishers.** The weakest kept card is Archon of Sun's Grace: 4 MV flying lifelink, and "Whenever an enchantment you control enters, create a 2/2 ... Pegasus" across 10 enchantments.
  - Panharmonicon ("If an artifact or creature entering causes a triggered ability ... triggers an additional time") does nothing on its own.
  - It doesn't double the Ways (enchantments) or walker ETBs.
  - It is redundant with Doubling Season and Exalted Sunborn.
  - It loses to Archon. Ghalta the Unstoppable and Lyra lose to Craterhoof and Elesh Norn, which are already in.
- **Ramp.**
  - Paradise Druid ({1}{G}, "{T}: Add one mana of any color.") only ties Fuel Tank Feaster, which has the same cost and mana and adds a perpetual cost reduction. No strict gain.
  - Enduring Vitality ({1}{G}{G}) and Tireless Provisioner ({2}{G}) cost 3. On the turn-1 → turn-2 → turn-3 Sisay curve they lose to the 2-MV Bloom Tender and Feaster.
  - Chromatic Lantern ({3}) loses to Talisman of Unity ({2}, "Add {G} or {W}"). Two colours need no Lantern.
  - Wolfwillow Haven (only "additional {G}") loses to Talisman's W option, since W pips are 38.
- **Tutors.**
  - The Seriema ("search your library for a legendary creature card") duplicates Sisay. It loses to Pia, which finds the non-legendary Doubling Season, Caretaker's Talent and Sylvan Library.
  - Loyal Tutor ("Search your library for a planeswalker card ... put that card on top") duplicates Sisay. It loses to Enlightened Tutor, which finds Doubling Season and Caretaker's Talent.
- **Protection.** The weakest kept card is Dawn's Truce ({1}{W}: "You and permanents you control gain hexproof", covering walkers and Ways).
  - Flare of Fortitude: costs 4, or "sacrifice a nontoken white creature".
  - Tamiyo's Safekeeping: one target.
  - Spectacular Spider-Man: creatures only.
  - Tomik: combat only, on a 2/3 body.
  - All of them lose.
- **Removal.**
  - Reduce to Memory ({1}{W}{W} sorcery, exiles any nonland permanent) loses to Beast Within. Same reach, but Beast Within is an instant and also hits lands.
  - Compel Brutality needs a creature or walker of ours. It loses to Kenrith's Transformation, which is unconditional and says "draw a card".
  - Seam Rip (MV ≤ 2) and Glass Casket (MV ≤ 3) are capped. They lose to Erode ({W}, "creature or planeswalker").
  - Liminal Hold costs 4 and loses to Ossification at 2.
- **Wipes.**
  - Fumigate ("You gain 1 life for each creature destroyed" is one event) loses to Sunfall, which exiles (beating indestructible and death triggers) and incubates.
  - Kindred Judgment costs 7 against Sunfall's 5. It loses.
- **Lands.**
  - Gate to Manorborn / Gate to the Citadel: mono-colour, "enters the battlefield tapped", "Seek ... Activate only once". They lose to the weakest kept tapped land, Arctic Treeline, a Forest Plains dual that both fetches can find.
  - Interplanar Beacon, Cavern of Souls, Gemstone Caverns: colourless. They lose to coloured sources at 38 W / 34 G pips.
  - Dark Depths + Thespian's Stage: Depths alone needs "{3}: Remove an ice counter" ×10, and Stage is not legendary, so Sisay can't find it. That is two no-colour slots for a combo that assembles in well under 20% of games.

## 5. Gate (`deck-gate.ts final.txt --format brawl --owner 1`)

```
PASS  size        100 cards (brawl wants 100)
PASS  singleton   singleton respected (basics exempt)
PASS  legality    every card legal in brawl
PASS  rules       no other format rule broken
PASS  identity    all cards inside GW
FAIL  ownership   2 card(s) not in the arena collection   -> Liliana the Faultless, Germinate Recruits (both [LIST], known false FAIL)
PASS  arenaNames  every line uses a name Arena accepts
PASS  lands       35 lands (+0 MDFC land backs = 35 effective); Karsten wants 37 ±2
FAIL  plan        0/64 nonland cards interact (0%)            -> known false FAIL (legendary-tutor commander)
PASS  curve       avg MV 2.97; commander sets no cost threshold
PASS  wincons     9 win condition(s)/closer(s)
PASS  locks       4 locked card(s) present and intact
```

## 6. Mulligan / play notes

- **Keep:** 3+ lands with a G source, or 2 lands + a {G} 1-drop (Llanowar, Mystic, Pilgrim, Sprawl). Mulligan hands with no green: all turn-1 ramp is {G}.
- **Curve:** turn-1 dork, turn-2 2-drop rock/dork/Greaves, turn-3 Sisay. With Greaves or Boots she tutors the turn she lands.
- **Tutor order:**
  1. The missing half of Paradox + Mentor. Paradox first if a walker is already out.
  2. Ajani Resolute ("Whenever you gain life, put a loyalty counter on Ajani").
  3. Ajani OC (its +1 token feeds the ETB lifegain sources).
  4. The One Ring for cards. Take Urza's Ruinous Blast or Elesh Norn instead when behind.
  5. Get a second search each turn: Tezzeret 0 or Formidable Speaker untaps Sisay.
- **Engine turn:** activate every walker first, then cast Germinate Recruits in main 2 (X = life gained this turn).
- **Big turns:** land Kutzil before them, and hold Heroic Intervention / Dawn's Truce / Teferi's Protection for wipes.
- **Urza's Ruinous Blast** spares walkers, Ways, legendary creatures, The One Ring and Mox Amber. Cast it after the engine is down.
