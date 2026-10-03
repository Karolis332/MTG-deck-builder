# Tam, the Possibility: one win condition, consistency, walker protection (2026-10-03)

Final list: `final.txt` (100). Quick list: `quick-v1.txt`. Scripts: `calc-tam.py` (probabilities), `sources.py` (colour sources), `density.py` (synergy links).
Base: the sleeved list `decks/paper/decks/tam-the-possibility.txt`. Oracle text below is quoted from the DB.
The five sonnet screens (`screen-1..5.md`) were stopped and never written, so there is no cross-check against them.
Stage 2 (Sisay commander + buys, `final-sisay.txt`) is §8.

**Diagnosis confirmed.** Pilot guide §1 ranks six win lines and the list has one tutor (Entrust the Spark). Nothing in it says "tutor for X".

## §1 Win conditions and the pick

| Line | Pieces | Cards in final.txt that find or replace a piece | Access P T7 / T9 (+1 card/turn from T4) | Kills | Stopped by |
|---|---|---|---|---|---|
| **Jace lock (PRIMARY)** | 25+ loyalty among Jaces; JRS 0: "Exile all but the bottom card of each opponent's library. Activate only if there are twenty-five or more loyalty counters among Jaces you control." | JRS + Diabolic Tutor, Mastermind's Acquisition, Loyal Tutor, Entrust the Spark = 5. Counter sources: 7 Ways, Avatar, Fatehold Charm, Rewrite Regrets, JRS +1, Mentor, Tam, Tekuthal | JRS access .54/.59 (.64/.72). Lock-ready (JRS + Mentor/Paradox/Pia + one more empower) .19/.25 (.31/.44); before .06/.08 (.11/.17). §8.1 has the stricter goldfish numbers | **All three.** Each opponent draws their last card, then loses on the next draw (CR 704.5b). Same turn: Jace MA −7 or Windfall | A counter on the JRS cast (Chimil, Counterspell, Dovin's Veto answer it); losing the Jaces before the kill turn; shuffle-graveyard effects |
| **Vraska poison (BACKUP)** | Vraska −9: "If target player has fewer than nine poison counters, they get a number of poison counters equal to the difference" + any proliferate | Vraska + the same 4 tutors; Rewrite Regrets returns her (MV 6). Proliferate: Tam, Atomize, Evolution Sage, Flux Channeler, Expansion Algorithm, Ripples, Tezzeret's Gambit, Vraska 0; doubled by Tekuthal | .54/.59 (.64/.72) | One opponent per −9 | Walker removal; she enters with 6 and needs 9 (Mentor + Paradox + Tam close the gap in one turn) |
| Jace MA −7 alone | "Any number of target players each draw twenty cards" | Jace MA | — | Only after the lock (a full library survives 20 draws) | — kept as the lock's finisher |
| Ultimates (Elspeth −7, Chandra −7, Ajani R −10, Dellian −6) | one walker at 7–10 | none | — | Slow, one table at a time | Not tutorable as a plan; they stay as value walkers |
| Sarkhan the Masterless dragons / Cadet-Beast combat | board + attack | cut | — | Partial | Sarkhan +1 turns walkers into non-walkers (Tam X = 0) |
| Ob Nixilis HT + forced draw | static 1 per draw | cut | — | 20 damage per opponent against 40 life | Not lethal |
| Dellian −6 / Sanguine Bond drain (pool) | lifegain → drain | not added | — | Slow | A third plan breaks "one plan + one backup" |
| Deepglow Skate (Inspirit) | "double the number of each kind of counter" | not taken | — | Accelerant, not a kill | Mentor + Paradox already reach 25 (arithmetic below) |
| Chain Veil / Oath of Teferi loops | not owned | buys, §8 | — | — | — |

**Pick:** Jace lock primary (only line that kills all three and is tutorable), Vraska poison backup (same tutors, same proliferate cards). Everything else in the list is mana, draw, protection or interaction.

**Arithmetic.** With Way of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life") and Way of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control") out, every loyalty activation puts +1 on each Jace. Example: two Ways' token at 10, Jace MuA 4, Jace MA 4, three other walkers. Five activations give +5 to each Jace: 15 + 9 + 9 = 33. Adding JRS (enters with 5) makes 38 ≥ 25 without using Tam. Tam with Tekuthal ("If you would proliferate, proliferate twice instead") adds 2X to each Jace.

### Win-turn checklist (operator copy)
1. **Tutor order:** no Mentor or Paradox on board → Pia (ETB: "search your library for an enchantment card") or a tutor for Mentor first. Then **JRS** (Loyal Tutor at the end of the opponent's turn before yours; Diabolic/Mastermind's to hand; Entrust the Spark only on the kill turn, because it puts JRS straight onto the battlefield). Then the finisher (Jace MA or Windfall). Tekuthal if a tutor is spare.
2. **Hold:** keep JRS in hand until the kill turn. On opponents' turns keep Counterspell / Dovin's Veto / Ripples of Potential mana up.
3. **Kill turn, in this order:**
   1. Play the land (Avatar: "empower Jace 2"; Evolution Sage proliferates; Paradox allows an extra land).
   2. Cast non-Jace walkers and creatures.
   3. Activate every walker **except JRS and Jace MA** (MA has one activation per turn; keep it for −7). Use plus abilities where possible: Pyromancer gives every walker, including the token, "[+1]: Add {R}".
   4. Tam: "{W}{U}{B}{R}{G}, {T}: Proliferate X times" on the Jaces (2X with Tekuthal). Expansion Algorithm: "Proliferate X times".
   5. Count: Jaces on board + 5 (JRS) ≥ 25? If not, stop and pass.
   6. Cast JRS **last** (Chimil: "Spells you control can't be countered"). Liliana the Faultless's ETB lifegain trigger gives opponents a response window before you can activate. Interplanar Beacon's cast trigger resolves before JRS, so it opens no window.
   7. With the stack empty, activate **JRS 0** (loyalty abilities need an empty stack in your main phase, CR 606.3). Removing JRS after activation does not stop the ability.
   8. Finish: **Jace MA −7** targeting the three opponents only (needs 7; Nexus Mentality: "Move all counters from target nonland permanent you control onto another"), or **Windfall** (each player "draws cards equal to the greatest number of cards a player discarded"; this needs someone to discard 2+). If neither is available, opponents lose on their second draw.
4. **Backup turn:** no Jace token or no JRS → Vraska −9 on the most dangerous player, then proliferate (Atomize, Ripples, Tam, Evolution Sage landfall). Mentor recharges her.

## §2 Consistency before → after

| Metric | Sleeved list | final.txt |
|---|---|---|
| Tutors | 1 (Entrust) + Pia (Ways) | **4** (Entrust, Loyal Tutor, Diabolic Tutor, Mastermind's) + Pia |
| JRS access by T7 / T9 | .26 / .30 | **.54 / .59** |
| Lock-ready by T7 / T9 | .06 / .08 | **.19 / .25** (.31 / .44 with one extra card per turn from T4) |
| Engine access by T4 (Mentor, Paradox, Pia, any-tutor) | .30 (3 cards) | **.45** (5 cards) |
| Draw sources | 12: Sylvan Library, Uro, Chimil, Nexus Mentality, Mind Sculptor, Vigorbloom Charm, Kaya IS, Jace MA, Vraska 0, Kaito 0, Dellian 0, Chandra +1 | **16**: −Kaya IS; +Jace MuA ("+1: Draw two cards…"), Windfall, Tezzeret's Gambit ("Draw two cards, then proliferate"), Fatehold Charm ("Draw a card. Empower Jace 2."), Kasmina (loot) |
| Lands / Karsten | 34 / 39.1 | 34 (your choice, kept) |
| Colour sources (lands) | — | W18 U19 B16 R16 G16. Any-colour lands are counted for all colours; Beacon is walkers-only, Great Hall legendary-only |
| Accel ≤ 2 MV | 7 | 7 (Sol Ring, Signet, 3 Talismans, Bloom Tender, Great Divide Guide) |
| P(Tam on T3 / T4) | .97 / .98 | .97 / .98 (calcs.py sim, ignores colours) |
| Avg MV (gate) | — | 3.25 (quick-v1 3.34) |
| Walkers / types | 21 / 17 | 15 / 12 + Jace token from 7 Ways |
| Synergy links (non-exempt cards) | median 16, min 1 | **median 18, min 1** |

Lowest synergy (final): Chimil 1 (JRS uncounterable), Timeless Lotus 1 (pays Tam), Uro 4, Rewrite Regrets 5, Mastermind's 6. Chimil and Lotus are draw/mana, judged on efficiency.

## §3 Protection before → after

| Layer | Before | After (added; removed) |
|---|---|---|
| **Anti-attack** | Archangel of Tithes ("creatures can't attack you or planeswalkers you control unless their controller pays {1}"), Settle the Wreckage, Elspeth soldiers, Ajani U / Healer Cadets, Saheeli Servos, Kaito +1, Oko +1, JRS −3, wipes ×3 | **+Tomik, Orzhov Lawmage:** "No more than one creature can attack this planeswalker each combat." **+Jace MuA:** "they may pay {2}. If they don't, creatures they control can't attack Jaces you control this turn." **+Dovin, Hand of Control:** "−1: Until your next turn, prevent all damage that would be dealt to and dealt by target permanent an opponent controls" (Paradox + Mentor refund the 1, so it repeats every turn). **+Ripples of Potential:** "Those permanents phase out." **+Promise of Loyalty:** survivors "can't attack you or planeswalkers you control for as long as it has a vow counter on it." +Kasmina Wizards. −Fumigate, −Final Act (wipes now: Toxic Deluge, Promise, Settle, plus Elspeth −3 and Ajani U −3) |
| **Anti-removal** | Vigorbloom Charm, Counterspell, Dovin's Veto, Liliana F hexproof, Kaya IS hexproof | **+Kasmina:** "Spells your opponents cast that target a creature or planeswalker you control cost {2} more." **+Dovin:** "Artifact, instant, and sorcery spells your opponents cast cost {1} more." **+Ripples** (phase out against wipes/removal). **+Fatehold Charm:** "Return target spell or creature to its owner's hand." Tekuthal can buy an indestructible counter. −Kaya IS |
| **Recursion** | Kaya's Ghostform (one permanent) | **Rewrite Regrets:** "Return target creature or planeswalker card with mana value 6 or less from your graveyard to the battlefield." Uro escape. −Ghostform |

## §4 Swaps (sleeved → final.txt)

| # | Out | In | Why (DB) | Donor / backfill |
|---|---|---|---|---|
| 1 | Chandra, Awakened Inferno | Jace, Multiverse Architect | A Jace: counts toward 25 and is a lock-wide attack tax | registered hot-swap |
| 2 | Sarkhan the Masterless | Diabolic Tutor | "Search your library for a card, put that card into your hand" | free |
| 3 | Ral Zarek | Mastermind's Acquisition | same mode | free |
| 4 | Ob Nixilis of the Black Oath | Loyal Tutor | "Search your library for a planeswalker card … put that card on top" (instant) | free |
| 5 | Tezzeret, Master of the Bridge | Expansion Algorithm | "Proliferate X times" | free |
| 6 | Kiora of Salt and Sand | Tomik, Orzhov Lawmage | one attacker per walker | free |
| 7 | Thrummingbird | Windfall | lock finisher, refuel | free |
| 8 | Nissa, Steward of Elements | Kasmina, Enigmatic Mentor | {2} targeting tax | free |
| 9 | Sorin, Vengeful Bloodlord | Rewrite Regrets | recursion + "Empower Jace 2" | free |
| 10 | Kaya's Ghostform | Tekuthal, Inquiry Dominus | "If you would proliferate, proliferate twice instead." (operator asked) | **Inspirit** ← Contagion Clasp (free: "{4}, {T}: Proliferate."). In Inspirit, Tekuthal doubles Karn's Bastion, Kilo, Surge Conductor and Ripples onto charge/station counters |
| 11 | Geist of Saint Thalia | Fatehold Charm | draw + empower, or bounce a removal spell | free |
| 12 | Final Act | Ripples of Potential | proliferate + phase out walkers | **Inspirit** ← Experimental Augury (free: "Look at the top three … Proliferate.") |
| 13 | Kaya, Intangible Slayer | Tezzeret's Gambit | 7-drop out; draw 2 + proliferate for 4 | free |
| 14 | Ob Nixilis, the Hate-Twisted | Dovin, Hand of Control | repeatable attacker neutraliser | free |
| 15 | Fumigate | Promise of Loyalty | sacrifice gets through indestructible; vow keeps them off your walkers | free |

There are no Tazri, Meren, Cabbage or Urza moves. The two Inspirit moves are 1-for-1 proliferate backfills: Inspirit loses Ripples' phasing and Tekuthal's doubling and keeps the counter count.

## §5 Stop proof per role (weakest kept vs best left out)

- **Win pieces:** weakest kept is Windfall (needs a 2+ discard) vs Deepglow Skate (Inspirit, 5 MV accelerant). Not improving: the lock needs a finisher more than more counters, and a third Inspirit loss. Sanguine Bond would be a third plan.
- **Tutors:** weakest kept is Loyal Tutor (1 MV, but costs the draw). Best left out: Solve the Equation (only an instant/sorcery, a second step); Personal Tutor (a sorcery, on top); Dimir House Guard (transmute finds MV 4, not JRS); Insatiable Avarice (Imotekh; costs 3 to go on top, needs a donor); Emeritus of Woe // Demonic Tutor (Meren's loop: "if two or more creatures died this turn, this creature becomes prepared"; taking it breaks Meren); Wishclaw (hands opponents a tutor).
- **Draw:** weakest kept is Fatehold Charm. Best left out: Experimental Augury (now Inspirit's backfill); Protege's Awakening (4 MV, empower 6 + 1 card, below Mind Sculptor and Gambit); Murmuring Volume, Frantic Search, Seize the Secrets, Ponder (worse rates in this deck).
- **Anti-attack:** weakest kept is Archangel of Tithes ({1}{W}{W}{W}). Best left out: Nils (taxes only countered creatures, one per player per turn); Mu Yanling, Sky Dancer (−2/−0 to one creature; Dovin prevents all of its damage); Teyo (only gives *you* hexproof); The Wanderer (noncombat damage only, no subtype, so no Tam X); Ghostly Prison (protects "you" only); Heroic Intervention / Grand Abolisher (Tazri: top priority, no whole-leaving trade).
- **Anti-removal:** weakest kept is Vigorbloom Charm. Best left out: Flare of Fortitude ("your life total can't change" switches off Mentor); Simic Charm (hexproof only); Hindering Light (can't stop wipes); Veil of Summer (Meren; colour-limited, needs a donor).
- **Recursion:** weakest kept is Rewrite Regrets vs Kaya's Ghostform (one permanent, tokens excluded). Kept.
- **Ramp:** weakest kept is Talisman of Conviction (2 MV) vs Commander's Sphere, Murmuring Volume and the Lockets (all 3 MV).
- **Removal:** weakest kept is Erode (1 MV, any creature/walker). Best left out: Your Fate Ends Here [ASSUMED FRA] (3 MV, MV ≥ 3 only); Wrath of the Bloodmane (4 damage).
- **Wipes:** weakest kept is Promise of Loyalty vs Fumigate (5 MV, one Mentor trigger) and Final Act (6 MV). Promise is the better walker wipe; the third wipe slot went to Ripples.
- **Ways:** weakest kept is Pyromancer (2 MV, empower 2, the token's only plus ability). Best left out: Way of the Cryomancer (empower 5; "[−3]" copy needs an instant/sorcery the same turn); Way of the Necromancer [ASSUMED FRA] (empower 2; "Whenever a creature you control dies, put a loyalty counter on each planeswalker you control"; close, but unregistered and needs a creature dying); Tam's Resistance (empower 4, no static); Plan for All Outcomes.
- **Walkers:** weakest kept is Kasmina / Ajani Resolute (Ajani R's "0: You gain 1 life" is +2 on every walker with both Ways). Best left out: Mu Yanling, Sky Dancer; Ob Nixilis HT (5 MV; only after the lock does −2 kill one player); Kaya IS (7 MV); Sarkhan the Dragonspeaker; Tezzeret, Cruel Captain and Chandra, Spark Hunter (both Inspirit, artifact/other-plan).
- **Lands:** weakest kept is Cinder Glade (tapped unless 2 basics; 3 basics in deck) vs Transformative Commons (G/U, untapped with a walker). The swap drops R to 15 and lifts U to 20 (already the highest), so it doesn't improve. Konstrari Annex and Innkeeper's Talent are excluded (not found). 34 lands kept.

## §6 Gate (final.txt, `--owner 1 --source paper`)

```
  PASS  size        100 cards (commander wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in commander
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BGRUW
  PASS  ownership   all cards owned; paper collection imported 0 days ago
  WARN  arenaNames  1 card(s) must be exported front-face only:   (Esika)
  WARN  lands       34 lands (+0 MDFC land backs = 34 effective); Karsten wants 38 ±2
  FAIL  plan        4/65 nonland cards interact (6%)   (known false negative)
  PASS  curve       avg MV 3.25
  PASS  wincons     7 win condition(s)/closer(s)
  PASS  locks       1 locked card(s) present and intact
```
There are no ASSUMED FRA cards in the final list. Tekuthal and Ripples count as owned; physically they move from the Inspirit box.

## §7 IF-OWNED FRA (ask before adding)

| IF-OWNED card | DB text that matters | Would replace |
|---|---|---|
| Sanctum Lurker | "Planeswalkers you control aren't put into their owners' graveyards for having 0 loyalty." + "[+2]: … you gain 1 life" | Kasmina (best anti-attack card in the pool) |
| Jace's Machinations | "activate loyalty abilities of Jace planeswalkers you control … any time you could cast an instant. / Empower Jace 8." | Fatehold Charm. JRS 0 at instant speed removes the sorcery window |
| The Theorist, Jace Beleren | Jace; "At the beginning of each opponent's draw step, you draw a card." | Saheeli |
| Theorist's Proxy | flash, "empower Jace 3", "The next spell you cast this turn can't be countered" | Tezzeret's Gambit |
| Theorist's Sanctum | "Land — Island", "{2}{U}, {T}: Empower Jace 2" | one Island (also an Island for JRS +1) |
| Teferi's Reproach / Overwrite the Multiverse | phase out one opponent's board / "Exile all creatures. Empower Jace X" | Promise of Loyalty (Overwrite) |

Buys are in §8.3.

## §8 Stage 2: Sisay, Weatherlight Captain commander + buys (`final-sisay.txt`)
The commander is Sisay [buy] and Tam moves into the 99. The list is the owned cards + 10 buys + Noble Hierarch (owned, unregistered). Play `final.txt` until the buys arrive.
Goldfish MC: `sisay-mc.py`, 20k games. It ignores colours, opposing interaction and damage to walkers. Drafts: `sisay-owned.txt`, `sisay-buys.txt`, `tam-fallback.txt`.

### 8.1 Primary, re-decided
**Sisay:** "{W}{U}{B}{R}{G}: Search your library for a legendary permanent card with mana value less than Sisay's power, put that card onto the battlefield". Her power is 2 + colours among other legendaries (max 7 → MV ≤ 6). The card is not cast, so it can't be countered.

| Line in final-sisay.txt | Assembled T7 / T9 | Survives walkers attacked down? |
|---|---|---|
| **Jace lock**, fetch Mentor → Paradox → JRS (power 6) | **.05 / .55–.59** (owned-only Sisay .05 / .61; final.txt with Tam .00 / .05) | no: needs 25 loyalty on board |
| **Chain Veil + Teferi loop**, Veil fetched first | .01 / .19, and the lock drops to .40 | **yes**: Ways, Veil, Carth and mana aren't attackable; Teferi arrives fresh |
- **PRIMARY: the Jace lock via Sisay.** The loop's kill turn needs Teferi (5 via Sisay at power 7, or 6 cast) + the Veil (4, or 5 fetched) + {4} = 9–14 mana, both Ways and a ready mana permanent.
- **BACKUP: the loop** (replacing Vraska). Switch to it when the Jaces are attacked below reach.
- The §1–§2 "lock-ready" figures counted one engine card. The MC needs the real 25 count and the mana.
**Loop check:**
- **Veil.** "{4}, {T}: For each planeswalker you control, you may activate one of its loyalty abilities once this turn as though none of its loyalty abilities have been activated this turn".
- **Rulings (Scryfall 2014-07-18).** "Each additional time The Chain Veil's last ability resolves will allow you to activate a loyalty ability of each planeswalker you control an additional time", and "it must be your main phase and the stack must be empty". Each Teferi/Veil activation uses the stack, so opponents can respond to every one.
- **Mana.** Teferi "−1: Untap up to four target permanents" untaps the Veil plus ≥ {4} of mana: Timeless Lotus ({W}{U}{B}{R}{G}; "enters tapped", so it must already be out) + 2 lands = 7, **+3 per loop**.; Bloom Tender / Faeburrow at 5 colours = 5 each. As creatures they must have been under your control since the turn began (CR 302.6).; Sol Ring + Noble + Ignoble = 4: net 0, but the loop still runs.
- **Loyalty.** Paradox "you gain 1 life" → Mentor "put a loyalty counter on each planeswalker" puts Teferi back level after each −1. He needs ≥ 2 before each −1, because at 0 he dies before the refund (CR 704.5i). Carth (ruling 2021-06-18: "a cost of [−6] would become [−5]") makes the −1 cost [0]. With neither, the loop is finite: 5 loops.
- **Payoff per loop** (every walker gets one more activation per Veil resolution), any one kills the table: Chandra, Torch of Defiance +1 "If you don't [cast it], Chandra deals 2 damage to each opponent": 20 loops.; Way of the Warlord's granted "[−4]: … 2 damage to target player" on every walker. Each walker nets walkers − 4 loyalty per loop (−3 with Carth).; Vraska −9 + Ichormoon "[0]: Proliferate": 9 → 10 poison, one opponent per loop.; Ichormoon "[−12]: Take an extra turn".; Lotus surplus pays Sisay for JRS + Jace MA → JRS 0 → MA −7.; Commodore Guff −3 is BENCH. Kaya IS is MV 7: Sisay can't fetch her, so she is not put back.

### 8.2 Sisay power chain
| Colour | Cheapest legendary sources (MV) |
|---|---|
| W | Liliana F 1, Oath of Ajani 2, Tomik 2, Mentor 3, Dovin 3, Aminatou 3, Oath of Kaya 3 |
| U | Tam 3, Oko 3, Uro 3, Aminatou 3, Dovin 3, Kaito 4, Tekuthal 4, Theorist 4 |
| B (scarce, 7) | Aminatou 3, Oath of Kaya 3, Carth 4, Kaito 4, Dellian 4, Jace MuA 5, Vraska 6 |
| R (6) | Pyromancer 2, Warlord 3, Chandra ToD 4, Jace MuA 5, Quintorius 5, Ajani U 6 |
| G | Oath of Ajani 2, Paradox 3, Tam / Oko / Uro / Esika / Pia 3, Carth / Dellian 4 |
- **When she gets there** (MC, lock-first): power ≥ 5 (Veil) by T6 .27, **T7 .50**, T8 .73. Power 7 (Teferi) by T8 .24, **T9 .55**, T10 .77. **Fetch order from Sisay alone:** Liliana (W) → Oath of Ajani (+G) → Aminatou (+U B) = power 6 → JRS, or → Jace MuA (+R) = 7 → Teferi. **Normal game:** Mentor + Paradox from hand = 4 → Aminatou = 6 → JRS. Backup: Veil at 5, Teferi at 7.

### 8.3 Buys (38)
| Card | Verdict | DB quote / why |
|---|---|---|
| Sisay, Weatherlight Captain | **IN** commander | "Search your library for a legendary permanent card with mana value less than Sisay's power" |
| The Chain Veil | **IN** −Windfall | "activate one of its loyalty abilities once this turn as though none … have been activated": backup loop |
| Teferi, Temporal Archmage | **IN** −Expansion Algorithm | "−1: Untap up to four target permanents." |
| Carth the Lion | **IN** −Ajani Resolute | "loyalty abilities you activate cost an additional [+1]": +1 each activation, free Teferi −1, B G |
| Ichormoon Gauntlet | **IN** −Rewrite Regrets | "[0]: Proliferate" on every walker (×2 with Tekuthal); "[−12]: Take an extra turn" |
| The Theorist, Jace Beleren | **IN** −Saheeli | a Jace; "At the beginning of each opponent's draw step, you draw a card." Don't buy if the FRA copy is owned |
| Aminatou, the Fateshifter | **IN** −Evolution Sage | W U B at MV 3; "−1: Exile another target permanent you own, then return it" re-empowers a Way |
| Oath of Kaya | **IN** −Archangel of Tithes | "Whenever an opponent attacks a planeswalker you control … 2 damage to that player and you gain 2 life" |
| Vronos, Masked Inquisitor | **IN** −Kasmina | "+1: Up to two other target planeswalkers you control phase out at the beginning of the next end step." |
| Oath of Ajani | **IN** −Flux Channeler | G W at MV 2; "Planeswalker spells you cast cost {1} less to cast." |
| Oath of Teferi | BENCH | "activate the loyalty abilities … twice each turn": an accelerant only |
| Jace's Machinations | BENCH | "Empower Jace 8." (also IF-OWNED FRA) |
| Commodore Guff | BENCH | "−3: … deals X damage to each opponent": the list already has loop payoffs |
| Semester's End | BENCH | blinks walkers back "with an additional loyalty counter"; Ripples is cheaper |
| Vraska, Soul of Stone | BENCH | U R W at MV 3 for Sisay, but its "Sculpture Treasure" creature tokens are off-plan |
| Tamiyo, Field Researcher | BENCH | G W U; "−2: Tap up to two target nonland permanents": Dovin/Kaito cover it |
| The Eternal Wanderer | SKIP | 6 MV, no subtype; its attack limit protects only itself (Tomik covers every walker) |
| Wrenn and Realmbreaker | SKIP | "Lands you control have '{T}: Add one mana of any color.'" = Great Divide Guide |
| Oath of Nissa | SKIP | "look at the top three cards": low impact |
| Oath of Gideon | SKIP | "enters with an additional loyalty counter": Mentor does more |
| Oath of Chandra | SKIP | end-step "2 damage to each opponent": no plan role |
| Gideon's Memorial | SKIP | "Spend this mana only to cast a planeswalker spell" |
| Brokers Ascendancy | SKIP | not legendary; end-step +1 loyalty is below Mentor |
| Rowan's Talent | SKIP | "Enchant planeswalker": 2-for-1 risk |
| Garruk, Veiled Butcher | SKIP | "+2: Up to one target creature gets -4/-1" |
| Garruk, Curse Breaker | SKIP | "+2: Untap up to two target lands": ramp walker |
| Chandra, Chill of Compliance | SKIP | no plan role (also IF-OWNED FRA) |
| Primevals' Glorious Rebirth | SKIP | "Legendary Sorcery", 7 MV; Sisay can't fetch it |
| Nicol Bolas, Dragon-God | SKIP | "−8: Each opponent who doesn't control a legendary creature or planeswalker loses the game": opponents' commanders make it miss; {B}{B}{B} |
| Narset, Parter of Veils | SKIP | "Each opponent can't draw more than one card each turn" stops the MA −7 kill |
| Urza Assembles the Titans | SKIP | not legendary; double activations for one turn only |
| Replicating Ring | SKIP | 3 MV rock, below the Hierarchs |
| Return to the Light Realms | SKIP | {7}{W}{W} |
| Future Flight | SKIP | "Enchant creature" |
| Reckless Charge | SKIP | "+3/+0 and gains haste" |
| Slip Out the Back | SKIP | creatures only |
| Wizard's Staff | SKIP | "Equipped creature has prowess" |
| Spider-Verse | SKIP | not a card (DB type "Card", not Commander-legal) |

### 8.4 Hierarchs, legendary density, swaps, gate
- **Hierarchs.** Noble "{T}: Add {G}, {W}, or {U}" + Ignoble "{T}: Add {B}, {R}, or {G}" cover WUBRG for Sisay and Tam. They cost 1 MV against the Talismans' 2 (P of a 1-drop accel on T1 .23 → Sisay on T2) and are Teferi untap targets. They take the weakest ramp, Talisman of Conviction and Progress; Talisman of Dominance stays because black is scarce. Cost: they die to our own Deluge / Promise.
- **Legendary density.** Sleeved 36 legendary permanents (12 multicolour); final.txt 30 (8, black 4); **final-sisay.txt 36 (12, black 7)**. Aminatou (WUB) and Oath of Ajani (GW) take non-legendary slots; Vraska SoS and Tamiyo FR are raised to BENCH.

| Out (final.txt) | In (final-sisay.txt) | Out | In |
|---|---|---|---|
| Tam (commander) | **Sisay** [buy]; Tam → 99 | Windfall | The Chain Veil [buy] |
| Fatehold Charm | Tam | Expansion Algorithm | Teferi, Temporal Archmage [buy] |
| Talisman of Conviction | Noble Hierarch [owned, register] | Rewrite Regrets | Ichormoon Gauntlet [buy] |
| Talisman of Progress | Ignoble Hierarch | Ajani Resolute | Carth the Lion [buy] |
| Archangel of Tithes | Oath of Kaya [buy] | Evolution Sage | Aminatou [buy] |
| Kasmina | Vronos [buy] | Flux Channeler | Oath of Ajani [buy] |
| Saheeli | The Theorist [buy / IF-OWNED] | | |
Unchanged: the Inspirit backfills (Contagion Clasp, Experimental Augury), the 34 lands and the locks. There are no Tazri, Meren, Cabbage or Urza moves.
**Gate (`gate-final-sisay.txt`).** Everything passes except: FAIL `plan`: known false negative. FAIL `ownership`, 11 cards, all expected: the 10 buys (Sisay, The Chain Veil, Teferi TA, Carth, Ichormoon, The Theorist, Aminatou, Oath of Kaya, Vronos, Oath of Ajani) and Noble Hierarch (unregistered). WARN `lands` 34 (Karsten 39 ±2) and WARN `arenaNames` (Esika). Average MV 3.32.
