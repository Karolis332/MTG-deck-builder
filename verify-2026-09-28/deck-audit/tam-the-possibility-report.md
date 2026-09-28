# Tam, the Possibility — audit report (2026-09-28, revised)

## 1. Plan

Tam makes planeswalker spells cost {1} less and taps for {W}{U}{B}{R}{G} to proliferate X times (X =
planeswalker types you control). The Ways (`empower Jace N`) build a Jace token as a proxy walker; Way
of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control") and Way
of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life... play an additional land")
form a loyalty-lifegain loop that outpaces normal Superfriends ramp-up. Wins: Jace, Reality Sculptor's 0
("Activate only if there are twenty-five or more loyalty counters among Jaces you control"), Vraska,
Betrayal's Sting −9 poison, Sarkhan the Masterless turning walkers into 4/4 flying Dragons, or grinding
ultimates (Elspeth, Ajani Unrelenting, Chandra Torch of Defiance).

**Note on Way of the Mentor's math:** Mentor's trigger is "whenever you gain life," a boolean per-event
check, not scaled by the amount gained. A card that only doubles the *amount* of life gained (e.g.
Alhammarret's Archive) adds zero extra Mentor triggers — it only matters if something else (Sanguine
Bond, Vito, Well of Lost Dreams) cares about the amount. This shaped which card-draw/lifegain candidates
below were worth the slot.

## 2. Health

| Category | Current | Proposed | Note |
|---|---|---|---|
| Lands | 35 | 35 | unchanged, locked, operator-accepted WARN (Karsten wants 39 ±2) |
| Ramp/fixing | 11 | 9 | cut Talisman of Dominance + Talisman of Progress; 9 remaining (Arcane Signet, Bloom Tender, Esika, Faeburrow Elder, Farseek, Great Divide Guide [locked], Sol Ring, Talisman of Conviction, Timeless Lotus [locked]) is plenty for a 35-land, heavily-fixed 5c base |
| Card draw (dedicated) | ~1 (Protege's Awakening) | 5 (+Sign in Blood, Harmonize, Painful Truths, Well of Lost Dreams) | was the deck's clearest hole; Dina, Soul Steeper is a drain payoff, not draw |
| Spot removal | 7 | 8 (+Bedevil) | Bedevil hits creature/artifact/planeswalker in one card |
| Board wipes | 5 | 5 | unchanged (Elspeth −3, Final Act, Fumigate [locked], Settle the Wreckage, Toxic Deluge) |
| Protection | Counterspell, Dovin's Veto, Chimil [locked], The Wanderer, Vigorbloom Charm, Kaya's Ghostform [locked] | Counterspell, Dovin's Veto, Chimil, The Wanderer, Kaya's Ghostform | lost Vigorbloom Charm (narrow modal trick); Grand Abolisher was considered but is assigned to Tazri, not available |
| Win conditions/closers (gate count) | 11 | 9 | drop is Chandra, Fire Artisan's −7 emblem, Jared Carthalion's token/counter modes, and Saheeli's Servo swarm leaving; core closers (Jace Reality Sculptor, Vraska ult, Sarkhan, Elspeth ult, Ajani Unrelenting, Chandra Torch emblem, Kaya Intangible Slayer [locked]) untouched, and Sanguine Bond/Dina add a drain clock the gate heuristic doesn't score |
| Avg MV | 3.42 | 3.45 | +0.03, essentially flat |
| Game changers | 0 | 0 | no GC cards in the deck or in any swap; bracket-3 cap not touched |

Structural note: no missing category — the deck already ran removal/wipes/protection/ramp in reasonable
counts. The real hole was card draw outside the Jace/Ways package, which the swaps target directly
without touching any locked card, engine piece, or card reserved for another deck.

## 3. Swaps (ranked by impact, 7 of the 8 allowed)

| # | IN | OUT | why IN | why OUT is the weakest slot |
|---|---|---|---|---|
| 1 | Sanguine Bond {3}{B}{B} | Archangel of Tithes {1}{W}{W}{W} | "Whenever you gain life, target opponent loses that much life" — direct damage off Way of the Mentor's every-walker lifegain trigger and Ajani Resolute's 0 ability | WWW-heavy stax body with zero line to proliferate/loyalty/lifegain; hardest card in the 100 to cast off a 5c base and does nothing for the plan |
| 2 | Well of Lost Dreams {4} | Chandra, Fire Artisan {2}{R}{R} | "Whenever you gain life, you may pay {X}... draw X cards" is its own per-event trigger (separate from Mentor's counter, so it stacks value on top rather than competing for the same trigger) | static only fires "whenever one or more loyalty counters are removed from Chandra" — narrow, and her own −7 is the only reliable way to trigger it |
| 3 | Dina, Soul Steeper {B}{G} | Jared Carthalion {W}{U}{B}{R}{G} | second copy of the Sanguine Bond drain effect ("Whenever you gain life, each opponent loses 1 life") on a cheap 2-drop body, insurance against one removal spell answering the enchantment | 5-color-pip filler planeswalker; +1 makes a vanilla 3/3, −3/−6 need multicolor graveyard fodder this deck doesn't generate — no line to loyalty/proliferate |
| 4 | Bedevil {B}{B}{R} | Talisman of Dominance {2} | "Destroy target artifact, creature, or planeswalker" in one card | 4th mana rock beyond Signet/Sol Ring/Bloom Tender/Faeburrow/Farseek/Timeless Lotus/Esika; ramp is deep enough to lose one without denting the curve |
| 5 | Sign in Blood {B}{B} | Vigorbloom Charm {G}{W} | flat 2-card draw; deck's only non-Jace/Way card advantage before this pass | modal trick whose fight mode is dead (deck runs few creatures) and whose hexproof mode duplicates Kaya's Ghostform's job (which stays, locked) |
| 6 | Harmonize {2}{G}{G} | Talisman of Progress {2} | flat draw 3, no built-in tax | second cut ramp rock; 9 fixers/rocks remain after both Talisman cuts, still comfortably above what a 35-land 5c deck needs |
| 7 | Painful Truths {2}{B} | Saheeli, Sublime Artificer {1}{U/R}{U/R} | Converge — draw X (likely 5 in this manabase) lose X life; cheap card advantage | 1/1 Servo tokens on noncreature casts is incidental value with no loyalty/proliferate synergy; weakest of the deck's non-Jace planeswalkers |

Banned/unavailable candidates that were considered and correctly excluded: **Innkeeper's Talent** (not
physically available), **Grand Abolisher** (assigned to Tazri), **Alhammarret's Archive** (assigned to
The Cabbage Merchant — also see the Mentor-math note in §1: doubling the amount gained adds no extra
Mentor triggers, so its upside here was already marginal), **Night's Whisper** (assigned to Imotekh),
**Vito, Thorn of the Dusk Rose** (assigned to Meren), **Grave Titan** (assigned to Meren), **Syphon
Mind** (assigned to Tazri). Dina, Soul Steeper stepped into Vito's slot as the second Sanguine Bond
effect once Vito was reassigned.

Operator history note: Diabolic Tutor was considered and rejected because the operator has cut that
exact card from Imotekh and Meren twice already in favor of narrower/repeatable tutors, and no analogous
engine card sits in Tam's open pool; Entrust the Spark already fills the tutor role for planeswalkers.

All locked cards (Kaya's Ghostform, Ob Nixilis of the Black Oath, Ob Nixilis, the Hate-Twisted,
Thrummingbird, Kaito, Dancing Shadow, Chimil, the Inner Sun, Esika, God of the Tree, Jace, Memory Adept,
Great Divide Guide, Timeless Lotus, Great Hall of the Citadel, Seachrome Coast, Cinder Glade, Fumigate,
Shivan Reef, Mana Confluence) and all engine pieces (Way of the Paradox, Way of the Mentor, every other
Way, Liliana the Faultless, Interplanar Beacon, Sorin, Vengeful Bloodlord, Kaya, Intangible Slayer)
remain untouched in the proposed list. 35 lands unchanged.

## 4. Coverage (mandatory safety net)

234 open cards meet EDHREC rank ≤ 3000, price ≥ $4, game-changer, or planeswalker/legendary text
referencing proliferate. 7 are ADD (the swaps above); the rest are REJECT with a reason tied to their
text vs. this deck. Full list (234 lines):

- **Path of Ancestry** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Rogue's Passage** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Evolving Wilds** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Cultivate** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Rampant Growth** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Terramorphic Expanse** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Commander's Sphere** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Negate** — REJECT — protection quota already met (Counterspell, Dovin's Veto in; Grand Abolisher unavailable, assigned to Tazri)
- **Generous Gift** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Temple of the False God** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Dragonskull Summit** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Sunken Hollow** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Smoldering Marsh** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Frantic Search** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Wayfarer's Bauble** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Talisman of Hierarchy** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Abrade** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Boros Charm** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Night's Whisper** — REJECT — assigned to Imotekh by the orchestrator, not available for this deck
- **Ornithopter of Paradise** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Terminate** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Mirkwood Bats** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Sign in Blood** — IN — cheap card advantage; deck's only draw outside the Ways/Jace package
- **Explore** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Sword of the Animist** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Growth Spiral** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Grand Abolisher** — REJECT — assigned to Tazri by the orchestrator, not available for this deck
- **Everflowing Chalice** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Infernal Grasp** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Skyshroud Claim** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Harmonize** — IN — flat draw 3, no synergy tax, deck is draw-light
- **Golgari Rot Farm** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Putrefy** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Shamanic Revelation** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Forgotten Ancient** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Selvala, Heart of the Wilds** — REJECT — her mana/draw scale off "greatest power among creatures you control"; deck runs almost no big creatures, ramp quota already met
- **Gruul Turf** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Ghalta, Primal Hunger** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Vault of the Archangel** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Bedevil** — IN — versatile removal ("Destroy target artifact, creature, or planeswalker")
- **Diabolic Tutor** — REJECT — operator has cut this exact card from Imotekh and Meren twice already for more specific/repeatable tutors; no better target here than what Entrust the Spark already finds
- **Vito, Thorn of the Dusk Rose** — REJECT — assigned to Meren by the orchestrator, not available for this deck
- **Rise of the Dark Realms** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Burnished Hart** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Sanguine Bond** — IN — drain payoff for Way of Mentor's lifegain loop ("Whenever you gain life, target opponent loses that much life")
- **Avacyn's Pilgrim** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Rakdos Carnarium** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Terror of the Peaks** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Ignoble Hierarch** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Nesting Grounds** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Bender's Waterskin** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Worn Powerstone** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Return the Favor** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Corrupted Conviction** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Realmwalker** — REJECT — tribal payoff, deck runs no creature-type synergy
- **Boggart Trawler // Boggart Bog** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Sheltered Thicket** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Fog** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Opal Palace** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Canyon Slough** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Innkeeper's Talent** — REJECT — not physically available (owner note); would otherwise be strong but is off the table
- **Vernal Fen** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Charcoal Diamond** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Chain Reaction** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Riveteers Overlook** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Palladium Myr** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Elvish Spirit Guide** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Seize the Spoils** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Jungle Hollow** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Steel Overseer** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Cankerbloom** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Murder** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Rishkar, Peema Renegade** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Elvish Archdruid** — REJECT — tribal payoff, deck runs no creature-type synergy
- **Loot, Exuberant Explorer** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Reconnaissance Mission** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Spell Pierce** — REJECT — protection quota already met (Counterspell, Dovin's Veto in; Grand Abolisher unavailable, assigned to Tazri)
- **Blighted Woodland** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Devoted Druid** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Alhammarret's Archive** — REJECT — assigned to The Cabbage Merchant by the orchestrator; also doubling the AMOUNT of life gained adds no extra Way of the Mentor triggers (Mentor fires once per lifegain EVENT, not scaled by amount), so its synergy upside here was already marginal
- **Loxodon Warhammer** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Moraug, Fury of Akoum** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Noxious Gearhulk** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Annie Joins Up** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Talisman of Unity** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Syphon Mind** — REJECT — assigned to Tazri by the orchestrator, not available for this deck
- **Roiling Regrowth** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Hunter's Insight** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Strix Serenade** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Shared Roots** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Witch's Clinic** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Three Steps Ahead** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Fertile Ground** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Cathartic Reunion** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Mishra's Bauble** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Lumra, Bellow of the Woods** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Well of Lost Dreams** — IN — "Whenever you gain life, you may pay {X}... draw X cards" is its own per-event trigger (independent of Way of Mentor's once-per-event counter), converts the lifegain loop into cards
- **Twilight Prophet** — REJECT — ascend-gated ("if you have the city's blessing"), unreliable trigger vs Sanguine Bond hooking directly off the deck's constant lifegain
- **Sheoldred's Edict** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Plumb the Forbidden** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Requisition Raid** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Bushwhack** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Peer into the Abyss** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Maestros Theater** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Carpet of Flowers** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Archfiend of Ifnir** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Haunted Mire** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Tendershoot Dryad** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Undying Malice** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Umbral Collar Zealot** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Persist** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Pristine Talisman** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Binding the Old Gods** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Butcher of Malakir** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Glissa Sunslayer** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Regrowth** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Rankle, Master of Pranks** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Grave Titan** — REJECT — assigned to Meren by the orchestrator, not available for this deck
- **Contagion Clasp** — REJECT — proliferate already covered (Evolution Sage, Flux Channeler, Thrummingbird, Atomize); marginal add
- **Muraganda Raceway** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Weathered Wayfarer** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Goldvein Hydra** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Elixir of Immortality** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Dreadhorde Invasion** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Insidious Roots** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Beledros Witherbloom** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Fling** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Treasure Nabber** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Fell the Mighty** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Arid Archway** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Lavaspur Boots** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Uro, Titan of Nature's Wrath** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Radiant Fountain** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Kozilek, the Great Distortion** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Kiora's Follower** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Nissa, Who Shakes the World** — REJECT — "Whenever you tap a Forest" is a mono-green ramp payoff the 5c manabase can't lean on
- **Murderous Rider // Swift End** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Massacre Girl, Known Killer** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Overrun** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Painful Truths** — IN — Converge draw X (X = colors spent, likely 5 in this manabase) lose X life, cheap card advantage
- **Flame of Anor** — REJECT — narrower than the removal already run (Assassin's Trophy/Path/Erode/Bedevil cover creature+artifact+PW)
- **Alesha, Who Laughs at Fate** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Vampire Nighthawk** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Nyx Lotus** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Vengeful Bloodwitch** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Adaptive Automaton** — REJECT — tribal payoff, deck runs no creature-type synergy
- **Supernatural Stamina** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Ilysian Caryatid** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Honest Rutstein** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Casualties of War** — REJECT — {2}{B}{B}{G}{G} 5-mode wipe incl. planeswalkers is real, but Bedevil covers the same lane cheaper
- **Springleaf Parade** — REJECT — tribal payoff, deck runs no creature-type synergy
- **Festering Thicket** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Aven Interrupter** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Tree of Perdition** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Black Sun's Zenith** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Cycle of Renewal** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Varragoth, Bloodsky Sire** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Bitterthorn, Nissa's Animus** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Venser's Journal** — REJECT — passive 1 life/card in hand per upkeep, doesn't fire the "whenever you gain life" triggers Well of Lost Dreams/Sanguine Bond/Dina need
- **Magda, the Hoardmaster** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Conduit Pylons** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Sangromancer** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Gonti, Lord of Luxury** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Paradise Druid** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Mycoloth** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Cityscape Leveler** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **The Key to the Vault** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Monstrous Vortex** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Verdant Sun's Avatar** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Primeval Bounty** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Flare of Cultivation** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Earthbender Ascension** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Greed** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Final Showdown** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Hidden Grotto** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Qarsi Revenant** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Nether Traitor** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Earthshaker Dreadmaw** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Urban Evolution** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Regal Behemoth** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Abundant Growth** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Primordial Hydra** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Forsaken Miner** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Consuming Corruption** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Harvest Season** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Nulldrifter** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Doc Aurlock, Grizzled Genius** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Chomping Changeling** — REJECT — tribal payoff, deck runs no creature-type synergy
- **Witch of the Moors** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Dread Presence** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Puppeteer Clique** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Bloated Contaminator** — REJECT — proliferate already covered (Evolution Sage, Flux Channeler, Thrummingbird, Atomize); marginal add
- **Vraska Joins Up** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Blood Pet** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Ashiok, Dream Render** — REJECT — hates on opponents' tutoring/graveyards, no line to this deck's own proliferate/lifegain plan
- **Mirri, Weatherlight Duelist** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Archfiend of Despair** — REJECT — {6}{B}{B} 8-drop; "opponents can't gain life" and the drain trigger don't touch proliferate/loyalty, too slow next to Jace/Vraska/Sarkhan win lines already in
- **Fire Covenant** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Blade Historian** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Domri, Anarch of Bolas** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Dina, Soul Steeper** — IN — second copy of the Sanguine Bond drain effect ("Whenever you gain life, each opponent loses 1 life") on a cheap 2-drop body, insurance against removal of the enchantment
- **Nightshade Dryad** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Hornet Nest** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Metamorphosis Fanatic** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Outcaster Trailblazer** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Simic Charm** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Skirge Familiar** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Mudflat Village** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **Necroskitter** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Abraded Bluffs** — REJECT — fixing land, 35 lands already at the accepted ceiling (locked count)
- **The Legend of Kyoshi // Avatar Kyoshi** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Worldwalker Helm** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Torpor Orb** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Planetarium of Wan Shi Tong** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Avatar Kyoshi, Earthbender** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Lost Jitte** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Helix Pinnacle** — REJECT — X-tower-counter win-con proliferate could technically advance, but 100 counters is far slower than the Jace Reality Sculptor/Vraska/Sarkhan win lines already built in
- **Everything Comes to Dust** — REJECT — tribal payoff, deck runs no creature-type synergy
- **Necrotic Ooze** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Stensian Sanguinist // Exsanguinate** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Shard of the Nightbringer** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Pact Weapon** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Emeritus of Ideation // Ancestral Recall** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Sapling of Colfenor** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Tamiyo, Inquisitive Student // Tamiyo, Seasoned Scholar** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Slickshot Show-Off** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Tarmogoyf** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Pest Control** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams
- **Flickering Hound** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Simulacrum Shaper** — REJECT — ramp quota already covered (9 mana rocks/dorks/fixers remain in the 100)
- **Identity Echo** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Carnivorous Cultivator // Enroot** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **Omnipresence** — REJECT — no line to the loyalty/proliferate/lifegain plan; weaker than a kept card in its slot
- **The Echoverse Fulcrum** — REJECT — card-draw slot filled by Sign in Blood/Harmonize/Painful Truths/Well of Lost Dreams

No game changers exist in the pool or the deck (0/0, checked for "GAME-CHANGER" across both files), so
the bracket-3 cap (≤3) is not a constraint here.

## 5. Gate

Ran on the proposed 100-card list (`MTG_DB_DIR` pointed at the live app data dir, `--format commander
--owner 1 --source paper`), Esika written front-face-only (`1 Esika, God of the Tree`, matching the
sleeved decklist at `decks/paper/decks/tam-the-possibility.txt:26`):

```
totals    : 100 cards | 35 lands (35 eff.) | 64 nonland | avg MV 3.44
VERDICT   : FAIL

  PASS  size        100 cards (commander wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in commander
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BGRUW
  PASS  ownership   all cards owned; paper collection imported 0 days ago
  WARN  arenaNames  1 card(s) must be exported front-face only: 1 Esika, God of the Tree
  WARN  lands       35 lands (+0 MDFC land backs = 35 effective); Karsten wants 39 ±2
  FAIL  plan        4/64 nonland cards interact (6%) — commander wants: general value
  PASS  curve       avg MV 3.44; commander sets no cost threshold
  PASS  wincons     9 win condition(s)/closer(s)
  PASS  locks       1 locked card(s) present and intact
```

`plan` FAIL is the known/accepted case — the gate has no specific plan profile for Tam, the Possibility
("commander wants: general value" is the generic fallback), same as the original registered v1. `lands`
WARN at 35 matches the locked/accepted count for this exact deck. `arenaNames` WARN is expected and
matches how the physical decklist already exports Esika (front-face only). Everything else PASSes.

## 6. Reality Fracture pass

Baseline for this pass is `REFUTE.md` §1's fixed list, not my earlier proposal: current deck + Well of
Lost Dreams (−Chandra, Fire Artisan) + Domri, Anarch of Bolas (−Rewrite Regrets). Locks now also include
Jared, Saheeli, both Talismans, Archangel of Tithes, Vigorbloom Charm, Final Act (on top of the original
lock list and every Way/engine piece). Most Reality Fracture cards key off a new "empower Jace N" verb —
mechanically identical to the Ways' ETB text — so they build directly toward Jace, Reality Sculptor's
25-loyalty win and stack loyalty for Way of the Mentor/proliferate.

- **Academic Ascent** — REJECT — {1}{W} combat trick (+2/+2 flying) + empower Jace 2; deck runs few
  creatures worth pumping, narrow
- **Campus Crier** — REJECT — needs to die and be exiled from the graveyard before it does anything;
  slow, no board presence
- **Countersculpt** — REJECT — operator cut today; no new text-based reason beyond what already applied
- **Edgar, Moonlit Sovereign** — REJECT — Werewolf upkeep/+1+1-counter creature, no Jace/proliferate/
  loyalty line at all
- **Eye of Jace** — REJECT — the name is flavor only; its ability (surveil, self-sac at 7 graveyard
  cards) has no loyalty-counter or Jace-token text
- **Fatehold Charm** — REJECT — operator cut today; no new text-based reason
- **Fblthp, Knows the Way** — REJECT — ramp/fixing (fetches basics to hand), no Jace synergy, ramp quota
  already met by locked pieces
- **Hexhaven Battalion** — REJECT — 6-mana 3 tokens + empower Jace 2 is fine value but Elspeth, Sun's
  Champion ("Create three 1/1... Destroy all creatures power 4+... emblem") already fills this exact
  slot better and isn't a legal cut (win-con)
- **Inspired Tethermage** — REJECT — real payoff ("put a +1/+1 counter on this creature" per loyalty
  counter placed) but no clean weak slot to cut it in for without touching a locked/engine card
- **Keeper of the Quiet Hour** — REJECT — vanilla 3-mana body, empower Jace 2 ETB with no other text;
  weaker than the ADD below
- **Kiora of Salt and Sand** — **ADD, OUT Pia, Aether Ascetic** — "Planeswalkers you control have
  '[−8]: Create an 8/8 blue Leviathan creature token with hexproof'" grants every walker in the 100
  (14+ types) a second win-line, on a cheap {1}{G}{U} body. Pia's ETB is "you may discard a card... search
  your library for an enchantment card": the only legal targets left in the library are whichever of the
  7 Ways/Kaya's Ghostform hasn't been drawn yet (Esika's back face doesn't count — a DFC's library
  characteristics are its front face, a Creature), so it's a conditional, RNG-gated tutor for a card the
  deck already draws into naturally. Kiora's blanket ability is the stronger long-run investment
- **Konstrari Charm** — REJECT — 6 dmg only hits flyers, or a +1/+1-counter/trample mode, or a ritual;
  no Jace/loyalty line
- **Loot, the Nexus** — REJECT — mana ability scales off "different power among creatures you control";
  deck runs too few creatures for reliable output, ramp quota met
- **Mindseeker Oculus** — REJECT — strong ETB (empower Jace 4) but no clean weak slot to cut it in for
  without touching a locked/engine/win-con card
- **Murmuring Volume** — REJECT — any-color rock + loot ability; ramp quota already met by locked pieces
- **No Admittance** — REJECT — 3 dmg to any target + empower Jace 1 is solid but doesn't clearly beat
  Erode (1-mana unconditional creature/PW removal) or Atomize (destroy+proliferate) already in the 100
- **Plan for All Outcomes** — REJECT — operator cut today; no new text-based reason
- **Repurposed Enforcer** — REJECT — "empower Jace X, where X is the number of creatures you control";
  this deck runs very few creatures, so X is usually 1-2
- **Solve for Disappointment** — REJECT — strong one-sided Thoughtseize + empower Jace 1, but Quintorius
  Kand ("Whenever you cast a spell from exile...") has genuine if narrow synergy with Chandra, Torch of
  Defiance's +1 and Chimil's discover, so it isn't a clean enough OUT target to claim this beats it
- **Stingerquill Charm** — REJECT — flexible modal removal/trick, no Jace/loyalty line, doesn't clearly
  beat the removal already locked in
- **Tam's Resistance** — REJECT — operator cut today; no new text-based reason
- **Teyo, Diamondblade Mage** — REJECT — Flash ETB puts a loyalty counter on a target planeswalker
  (real synergy: can push Jace, Reality Sculptor toward 25), but no clean weak slot to cut it in for
- **Teyo, Lightshield Expert** — REJECT — operator cut today ("Teyo the Shieldmage"); no new text-based
  reason
- **Theorix Charm** — REJECT — modal soft-counter/debuff/loot; no synergy edge over Dovin's Veto/
  Counterspell already locked in
- **Tomik, Orzhov Lawmage** — REJECT — operator cut today; no new text-based reason
- **Vindictive Triumph** — REJECT — strong flexible removal/steal (exile creature or PW, MV≤3 comes back
  under your control) but no clean weak slot to cut it in for without touching locked removal
- **Violent Echoes** — REJECT — 6 dmg to creature/PW + conditional empower on excess damage, but Vraska's
  Final Mercy already covers "destroy creature/PW or empower Jace 6" cheaper and more flexibly at {B}{B}
- **Way of the Cryomancer** — REJECT — operator cut today; would otherwise be an 8th Way (empower Jace 5
  + walker copy ability), no new text-based reason
- **Yuriko, Blade of the Mighty** — REJECT — combat stax + solo-attacker double strike, no Jace/
  proliferate/loyalty line at all

**Net: 1 ADD.** Kiora of Salt and Sand IN, Pia, Aether Ascetic OUT. All locks (including the new ones:
Jared, Saheeli, both Talismans, Archangel of Tithes, Vigorbloom Charm, Final Act) and the fixed baseline
(Well of Lost Dreams −Chandra FA, Domri −Rewrite Regrets) are untouched. Not written to the proposed
file per instruction.
