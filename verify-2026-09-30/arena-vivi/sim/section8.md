
## 8. Convergence review (Fable refuter, 2026-09-30)

Inputs re-read: `final.txt`, `deck.md`, `screen-01..04.md`; every claim below checked against `pool-0*.md` oracle text
(`sim/lookup.py`). Pre-review list kept at `sim/final-pre-review.txt`. §2/§5/§6 figures above are pre-review.

**Swaps applied (3): IN | OUT | why**
1. Fire Magic | Training Grounds | Training Grounds touches exactly one ability in the 100: Hapatra's "{2}{U}: Untap target creature"
   (Vivi's tap has no mana cost; Birgi, Tomik, Prodigy, Archmage, Guttersnipe have no activated abilities; Otawara/Sokenzan channel
   is not a creature ability). Its whole value is the loop at Vivi power 2–3 instead of 4 — needs Training Grounds AND Hapatra AND an
   outlet in the same ~15 cards (≈ 1–2 % of games). Fire Magic is the same {R} noncreature trigger plus an instant-speed sweeper that
   scales ("Fire — {0} — 1 damage to each creature … Fira — {2} — 2 … Firaga — {5} — 3"); Vivi (0/3 base) survives Fire and Fira,
   and the deck's only other wipe is a 4-mana sorcery. Loop threshold is now power ≥ 4 (2 spells with Prodigy on board).
2. Ojer Axonil, Deepest Might | Boltwave | Ojer: "If a red source you control would deal an amount of noncombat damage less than
   Ojer Axonil's power to an opponent, that source deals damage equal to Ojer Axonil's power instead." Vivi is a red source: every
   noncreature spell = 4 to the face (8 with Prodigy), Guttersnipe's 2 → 4; Vivi + Ojer kills from 25 with 7 cantrips (4 with Prodigy).
   4/4 trample body; on death "return it to the battlefield tapped and transformed" (a Mountain that re-transforms for {2}{R} after
   4 noncombat damage — trivial here). Boltwave is the builder's own weakest kept finisher (3 damage once). The §4 stop proof never
   weighed Ojer although screen-01 listed it ("beats: Goldspan Dragon"). Cost: creature count 6 → 7, avg MV 2.04 → 2.09.
3. Mountain (10th) | Thran Portal | Thran Portal is not a dual: "As this land enters, choose a basic land type … This land is the
   chosen type" (one colour for the game), "Mana abilities of this land cost an additional 1 life to activate" (every tap), and it
   "enters tapped unless you control two or fewer other lands" (tapped as the 4th+ land drop, i.e. in roughly half of its appearances);
   not fetchable (type is chosen on entry). Its only edge over a basic is choosing the colour on entry. `sim/review_variants.py`
   (40,000 games/cell, Portal modelled as an untapped UR dual = its ceiling): Vivi-T3 84.0/89.4 (play/draw) → 83.5/88.8 with a
   Mountain, 83.6/89.0 with an Island; all other cells within ±0.6. A ≤ 0.5-point ceiling does not pay for tapped-late plus a life per
   tap. Mountain over Island because Misty Rainforest and Flooded Strand fetch Islands only; sources are now 22 U / 22 R + Fabled.

**Screen misses checked** (searched every pool file by name; none present, so no screen miss): Riverglide Pathway, Sulfur Falls,
Frostboil Snarl, Shivan Reef, Fiery Islet, Training Center, Prismari Command, Galvanic Iteration, Expansion // Explosion,
Memory Lapse, Mystical Dispute, Saw It Coming, Jwari Disruption, Silundi Vision, Sea Gate Restoration, Valakut Awakening,
Brazen Borrower, Bonecrusher Giant, Fable of the Mirror-Breaker, Niv-Mizzet Parun, Ral Storm Conduit, Fiery Cannonade, Anger of the
Gods, Storm's Wrath, Sweltering Suns, Electrodominance, Jaya's Immolating Inferno, Banefire, Fight with Fire, Crackle with Power,
Thermo-Alchemist, Baral, Solve the Equation, Time Warp, Alrund's Epiphany, Karn's Temporal Sundering, Mind's Desire, Force of Negation.
Every land in the pool was read (`Land` type filter): no untapped U/R dual exists beyond the ones already in the list.

**Considered and rejected**
- Octopus Form (= Magic Damper text) for Chase Inspiration: hexproof is what beats targeted removal in both; +0/+3 saves Vivi from
  Anger/Storm's Wrath-class sweepers, the untap adds P mana once. Different insurance, not provably better; protection stays at 6.
- Tectonic Hazard ("1 damage to each opponent and each creature they control", {R} sorcery) — a one-sided sweep (2/2 with Tomik, 4 face
  with Ojer) but Fire Magic already fills the cheap-sweeper slot at instant speed and scales; taking a second one costs a protection
  piece or an X outlet.
- Strike It Rich ({R} Treasure, flashback {2}{R}: two triggers, four with Prodigy): mana-neutral trigger fodder; loses to every kept
  1-drop that also draws, counters or kills.
- Starting Town (any colour for 1 life, tapped from turn 4): strictly better than Thran Portal, still worse than a basic for the reasons
  in swap 3. Mistrise Village / Cori Mountain Monastery / Arena of Glory: conditional-untapped mono lands, not fetchable — no gain over
  the basic they would replace. Great Hall of the Citadel: net +1 only on legendary spells, colourless otherwise.
- Shock / Play with Fire for Abrade: Abrade's artifact mode and 3 damage beat 2 damage; Scorching Dragonfire same verdict (§4).
- Seething Song / Pyretic Ritual: net mana with no storm payoff beyond Grapeshot; Vivi is the ritual.
- Storm-Kiln Artist (Shaman → 2 Treasures per instant/sorcery with Prodigy) and Kessig Flamebreather (Shaman → 2 pings per noncreature
  spell with Prodigy): real engines, but an 8th creature would displace Archmage or Guttersnipe, which are better per mana here.
- Twinflame Tyrant (5 mana, double damage): Ojer does the small-ping job a mana cheaper with a higher floor.
- Ojer for Aggravated Assault instead of Boltwave: rejected — AA at Vivi power 5 (not 6) already wins: tap for 5, pay {3}{R}{R}, untap
  all creatures, extra combat; any other creature attacks in every extra combat (Vivi never attacks). At power ≥ 6 it is also infinite
  mana. That is a second loop piece, not a dead card; Boltwave was the weaker slot.
- Cutting Ajani's Anguish (third outlet): outside the loop it is an {X}{R} burn/removal spell, live as a 1-mana trigger at X = 0; kept.
- Lightning Greaves' shroud blanks Dive Down/Chase/Damper/Fleeting Reflection/Curiosity/Hapatra on Vivi while attached; §7 already
  says to move it (equip is sorcery-speed, so only in a main phase). Kept: shroud is the point, the instants are for when she is bare.

**Wrong or loose rules claims in §1–7**
- §4 Wipes: "Pyroclasm / Fire Magic (kill a fresh 0/3 Vivi)" — false. 2 damage does not kill a 0/3; only Firaga (3) does.
- §3 #45 / §5: Thran Portal is not a "fast dual" and not a dual at all (see swap 3); §5's "10 duals/any" and "23 U / 23 R" count
  Thran Portal and Multiversal Passage as duals — each is one colour once it enters (22/22 + Fabled Passage before the swap).
  `mana_sim.py` models both as untapped UR duals. §3 #43 "fetchable type": Passage has no type in the library, so no fetch finds it.
- §3 #19 Fiery Annihilation "exiles opposing commanders": a commander that would be exiled goes to the command zone if its owner
  chooses, so the exile clause buys nothing against commanders (it does stop recursion of ordinary creatures).
- §2 / §3 #40 Nibelheim Aflame "one-sided": it hits every other creature including Guttersnipe, Tomik, Prodigy, Archmage, Hapatra
  (and now Ojer, which comes back as a land).
- §1 line 3 undersells Aggravated Assault: infinite combats already at power 5 (see above), infinite mana from 6.
- §4 Engines omitted Ojer Axonil entirely (screened, not weighed) — the gap swap 2 closes.
- Verified correct: Hapatra loop thresholds (4 / 2 with the old Training Grounds), Aggravated Assault has no once-per-turn clause,
  Harmonic Prodigy doubles Vivi (Wizard), Guttersnipe (Goblin Shaman) and Archmage (Human Wizard), Tomik +1 replacement, Artist's
  Talent L3 +2, Birgi's mana persists, Jeska's Will "choose both", Curiosity draws off the ping, Mox Amber with Vivi/Ral/Chandra,
  Light Up the Stage spectacle off the ping, Wizard's Retort {U}{U} with a Wizard, Daze, Otawara/Sokenzan discounts, Mystic Sanctuary.

**Gate (after swaps)** — same command as §6:
```
totals    : 100 cards | 32 lands (33.1 eff.) | 67 nonland | avg MV 2.07
  PASS  size / singleton / legality / rules / identity / lands (Karsten 33 ±2) / plan (65/67 interact) / curve / locks (5)
  FAIL  ownership   1 card(s) not in the arena collection: A-Vivi Ornitier      <- known A- gate defect (§6), treated as PASS
  WARN  arenaNames  5 front-face-only lines (Birgi, Ojer Axonil, Shatterskull, Sink into Stupor, Spikefield) — already front-face
  WARN  wincons     2 (Chandra, Guttersnipe) — the gate's closer heuristic counted Boltwave and does not recognise Ojer, Choco-Comet,
                    Traumatic Critique, Ajani's Anguish, Hapatra or Aggravated Assault; the deck has more kill lines than before
```

**Final stop statement per role (pass 2 found zero improving swaps)**
- Combo / finisher: best remaining Kang the Conqueror / Mathemagics / Inescapable Blaze / Fling lose to weakest kept Ajani's Anguish
  because Anguish is an {X}{R} burn spell and a 1-mana trigger without the loop; they are dead or 6 mana without it.
- Engines / payoffs: best remaining Storm-Kiln Artist / Kessig Flamebreather / Twinflame Tyrant lose to weakest kept Archmage
  Emeritus because an 8th creature adds no new kill speed beyond Ojer + Guttersnipe + Prodigy, and Archmage is the card flow that
  keeps the spells coming.
- Protection: best remaining Octopus Form / Slip Out the Back / Mithril Coat lose to weakest kept Chase Inspiration because none
  answers a class of removal the six kept pieces miss (bounce and exile ignore Mithril Coat; phasing loses Vivi's untap-step mana).
- Counters: best remaining Remand / Miscast / Mana Sculpt lose to weakest kept Daze because Daze is the only counter castable with
  no mana on the Vivi turn; a 10th counter is a tapped-out dead card.
- Removal: best remaining Scorching Dragonfire / Shock / Play with Fire / Tectonic Hazard lose to weakest kept Abrade because Abrade
  kills a 3-toughness creature or an artifact at instant speed; 2-damage spells miss most Brawl commanders.
- Wipes: best remaining Pyroclasm / Jennika's Technique / Slagstorm lose to Fire Magic (instant, 1 mana, scales to 3) and Nibelheim
  Aflame (one-sided at Vivi power ≥ 4 vs the opponent's board).
- Cantrips / draw: best remaining Sleight of Hand / Strike It Rich / Chart a Course / Stock Up lose to weakest kept Consider and Light
  Up the Stage on timing and rate (§4 unchanged).
- Rocks / lands: best remaining Mind Stone / Starting Town / Mistrise Village lose to Talisman of Creativity and the 10th Mountain
  because coloured, untapped, fetchable mana on turns 2–4 is what casts Vivi on 3; every remaining pool land is tapped, conditional,
  colourless or costs life per tap.
- Tutors: unchanged (§4).

Converged: a full pass over every screen file and the pool land list against the post-swap 100 finds no further improving swap.
