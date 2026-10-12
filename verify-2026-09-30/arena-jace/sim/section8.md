
## 8. Convergence review (Fable refuter, 2026-10-01)

Method: read `final.txt`, `deck.md`, all eight screens; probed every `pool-NN.md` by name for ~220 known W/U/B/R staples
(`sim/probe.py`) and scanned the pool by predicate (`sim/scan.py`: every planeswalker, every creature MV ≥ 6, every 2+-colour
land, every counter ≤ 3, every removal instant ≤ 2, every wipe ≤ 6, every draw/token engine ≤ 5). Re-ran `sim/hits.py`,
`sim/landsim.py` (10k games) and the gate. Two full passes; the second found no improving swap.

**Screen misses that matter (in the pool, in no screen):** Myr Battlesphere, Aurelia the Warleader, Meteor Golem, Gideon's
Sacrifice, It'll Quench Ya!, Get Out, Disdainful Stroke, Syncopate, Lightning Strike, Play with Fire, Consider, Dark Ritual,
Gemstone Caverns, Dark Fortress, Zodiark. None of the classic staples is owned: no Teferi (any), Wandering Emperor, Liliana,
Bolas Dragon-God, Elspeth, Farewell, Wrath, Damnation, Rift, Mana Drain, Memory Lapse, Absorb, Fatal Push, Grasp, Vindicate,
Anguished Unmaking, Smothering Tithe, Rhystic Study, Fact or Fiction, Sol Ring, Watery Grave, any Pathway, checkland,
painland, or the missing fast/slow/Verge duals. The screeners dropped nothing above the deck's bar except Tomik, which they
passed but the builder never weighed (it appears in no stop-proof line).

### Swaps applied

| IN | OUT | why |
|---|---|---|
| Tomik, Orzhov Lawmage | Negate | "Planeswalkers you control have 'No more than one creature can attack this planeswalker each combat.'" on a 2-mana 2/3 flyer. Jace has 4 loyalty and spends 3 of it; his static only taxes the attack ({2}), it does not cap it — a three-creature board kills him through one removal spell. With Tomik every one of the 11 walkers faces one attacker per combat, which Teyo's Walls, a Cadet, Eiganjo, Razorgrass or any of the 12 instant removal spells answers; Kasmina taxes the spells. Negate was the builder's own weakest card: the seventh counter, noncreature-only, in a deck whose stated fear is creature decks. Cost: a 20th −3 hit at value 5 (a revealed Tomik still installs the cap) — E[hit] 7.21 → 7.10, P(≥ 8) 42 % → 40 %. |

Gate after the swap: unchanged (100 / singleton / legality / identity / ownership PASS, `plan` FAIL as before, WARNs
informational). `sim/hits.py`: 20 hits = 10 creatures + 10 walkers, E[hit] 7.10, creature avg 8.40.

### Considered and rejected

- **Dovin, Hand of Control for Teyo** — "−1: Until your next turn, prevent all damage that would be dealt to and dealt by
  target permanent an opponent controls" five times, plus a {1} tax on their artifact/instant/sorcery spells, hybrid {W/U}.
  Rejected: with Tomik each walker faces one attacker, so a 0/3 defender Wall stops it every turn for good, twice, and both
  Walls are −3 fodder; Dovin's neutralisation lasts one turn cycle and makes no body. Teyo's "You have hexproof" also blanks
  Duress-class discard on the counters. Closest call in the review.
- **Karn, the Great Creator for Teyo** — static kills the opponent's Signets/Talismans/Treasures/equip/crew; "+1: … noncreature
  artifact becomes an artifact creature" turns a rock into a blocker and a −3 target. Rejected: the fodder costs a rock each
  time, 4 mana vs 3, no ultimate; the static is strong only against artifact-ramp opponents.
- **Myr Battlesphere for Terror of the Peaks** — "create four 1/1 colorless Myr" = four −3 fodder plus a 4/7, colourless at 7.
  Hit 8 vs 7, but cast 7 vs 5 in a deck that already carries six cards costing ≥ 7; not provable.
- **Bard, King of Dale for Terror** — doubles Jace's +1 to four cards and every token maker (Empower would make two Jace tokens).
  Hit 8 vs 7, cast 6 (WU) vs 5; same verdict as Battlesphere.
- **Absolute Virtue for Terror** — "You have protection from each of your opponents" ends damage and targeting on the player,
  not on the walkers; 8 mana; hit 8 vs 7. Rejected on cast value.
- **Aurelia, the Warleader** (unscreened, RRWW 6): extra combat on a 3/4 — hit 7 at best; loses to Terror/Wan Shi Tong on cast.
- **Meteor Golem** (unscreened, 7): Vindicate on a 3/3 — hit 7, no better than the kept 7s and a worse body.
- **Kaito, Bane of Nightmares for Kaito, Cunning Infiltrator** — "−2: Tap target creature. Put two stun counters on it" is
  protection; 4 mana vs 3 and no fodder mode. Coin flip; kept the builder's.
- **Gideon's Sacrifice** (unscreened, {W} instant): redirects all damage this turn to a chosen creature or walker — a 1-mana
  fog onto a Wall/Cadet. Dead against control; the removal suite and Tomik cover the aggro case.
- **Gideon's Memorial for Azorius Signet** — any-colour mana but "Spend this mana only to cast a planeswalker spell": dead on
  every turn the deck holds up a counter. The 4-damage discard mode does not pay for that.
- **It'll Quench Ya! / Get Out / Disdainful Stroke / Syncopate** — Mana Leak-class soft counters, or narrower than Negate;
  none beats the six kept counters, and the slot went to Tomik.
- **Phyrexian Arena** — the deck already draws off Jace +1, Ring, Theorist, Talent, three cantrips; BB at 3 competes with the
  walker turn and bleeds against aggro. Builder's rejection stands.
- **Gemstone Caverns / Dark Fortress / Hidden Lair** — Caverns is a colourless land in ~96 % of games; Fortress and Lair need a
  basic land on the battlefield after their entry turn and the deck runs one Island.
- **Chromatic Lantern → 2-mana B/R Signet** (`sim/rockvariant.py`, 10k games): Jace by T5 61.0/70.5 vs 60.8/70.4, WUBR by T5
  86.8/89.5 vs 86.5/89.2 — identical within noise, so Lantern's extra mana costs nothing measurable and its fixing stays.
- **Way of the Mentor** — see rules note 2; still not worth a slot (live only with Sheoldred or Valgavoth on the table).

### Land / rock split (builder's `landsim.py`, re-run at 10k games, seed 20260930)

35 faces: 2 lands by T2 99.2/99.4, 3 mana by T3 91.4/94.8, Jace by T4 31.6/40.6, Jace by T5 60.8/71.2, WUBR by T5 85.9/89.1,
flood 8.7/14.3, screw 10.8/7.1 — the report's numbers reproduce. 36 faces buys +2.5 Jace-by-T5 for +1.0/+1.4 flood and a
spell; 34 loses 2.5. The sim ignores tapped lands (9 of the 35 enter tapped on some turn), so real Jace-by-T5 is a few points
lower at every count, which does not change the ordering. No better split was proven; 31 + 4 MDFC + 8 rocks + Mox stands.

### Rules claims checked against the pool/deck oracle text

Correct: Identity Echo is a Jace-free −3 ("{3}{R}: Exile target creature or planeswalker you control … Activate only as a
sorcery") — and understated: there is no once-per-turn clause, so eight mana is two reveals. Oath of Teferi +1 then −3 (4 →
5 → 2). Countersculpt at {U}{U} with a Jace token on the table or The Theorist in hand. Chandra Acolyte's first 0 hits Jace
(he is red). Wan Shi Tong triggers on Jace +1's bottom, on the −3's "rest on the bottom", and on Brainstorm's put-back.
The static covers the commander, The Theorist and every Jace token ("Jaces you control"). Hit table = final list (19 → 20).

Wrong or loose:
1. "Valgavoth … exile-only answer" — he is not indestructible: "Flying, lifelink | Ward—Sacrifice three nonland permanents".
   Day of Judgment-class wipes kill him outright and any destroy spell does once the ward is paid.
2. "Way of the Mentor … no lifegain trigger source in the list" — Sheoldred ("Whenever you draw a card, you gain 2 life") and
   Valgavoth (lifelink) are in the list; Mentor would add a loyalty counter to every walker on each Sheoldred draw. The
   rejection still holds (dead without one of the two); the reason given was false.
3. "Sunfall … leaves a −3 fodder token" — the Incubator is a noncreature artifact until "{2}: Transform this token"; the −3
   needs the {2} first.
4. "Nissa … every land drop is another polymorph" — Nissa reveals "until you reveal a creature card": walkers are skipped and
   bottomed, and stay there until a fetch shuffles.
5. "Theorist's Sanctum … repeatable fodder" — Empower adds counters to an existing Jace token and creates one only if you
   control none; it is repeatable only after the previous token has been exiled.
6. §1 "23 pieces of cheap interaction" counts Sunfall (5), Overwrite (6), Day of Judgment (4) and Moon (3).

### Stop statement per role (after the swap)

- **Creature / −3 hit.** Weakest kept: Tomik (hit 5, cast 2) — kept for the cap, not the reveal; weakest bomb: Terror of the
  Peaks (7 at 5). Best remaining: Myr Battlesphere / Bard / Absolute Virtue at hit 8 lose because each costs 6–8 to cast in a
  deck already holding six ≥ 7-drops, and a one-point hit gain on one card in twenty is +0.05 per reveal.
- **Walker.** Weakest kept: Teyo. Best remaining: Dovin, Hand of Control loses because, under Tomik, two permanent 0/3 Walls
  plus player hexproof beat five one-turn neutralisations that leave no body; Karn loses on fodder cost and 4 mana.
- **Counter.** Weakest kept: An Offer You Can't Refuse ({U}, two Treasures to the opponent). Best remaining: Negate (cut) loses
  because the seventh counter was the slot Tomik needed; It'll Quench Ya! is a soft counter; Get Out counters only creature or
  enchantment spells.
- **Spot removal / wipe / empower / engine / draw / tutor / ramp / land.** Unchanged from §4 — no pool card found that the
  builder's lines do not already dominate; the probe confirmed the named alternatives are the only ones owned.
- **Protection.** Weakest kept: Teferi's Protection. Best remaining: Gideon's Sacrifice ({W}, a one-turn redirect) loses
  because Teferi's covers wipes and Cyclonic effects as well as combat; Tomik now covers the repeated-attack case.

Converged: yes. Second full pass over every role and the "roles not in the deck" list found zero improving swaps.
