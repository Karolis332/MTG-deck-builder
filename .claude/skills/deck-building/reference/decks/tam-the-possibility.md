# Tam, the Possibility — pilot guide (paper, 4-player pod, 40 life)

Review 2026-10-09: proposed swaps in verify-2026-10-09/color-best/eval/tam-the-possibility/REVIEW.md (refuted: REFUTE.md), not yet applied. This guide describes the sleeved deck file, not a draft list.

List: `decks/paper/decks/tam-the-possibility.txt` (100 cards: 34 lands, 21 walkers, 7 Ways). Every quote below is from the live card DB (`q.py`). Rulings come from Scryfall and the CR (https://magic.wizards.com/en/rules).

## 1. Plan in 3 lines
1. **T1–3:** ramp into Tam: "Planeswalker spells you cast cost {1} less to cast." Ramp = Sol Ring, Signet, 3 Talismans, Bloom Tender, Great Divide Guide, Faeburrow, Esika.
2. **T3–6:** Way of the Paradox + Way of the Mentor, then a walker a turn. Each loyalty activation gives 1 life, and each life gain puts +1 loyalty on **every** walker.
3. **Close:** turn the loyalty surplus into ultimates: the Jace-25 lock first (primary), else poison. "{W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is the number of planeswalker types among planeswalkers you control" speeds up every line.

| Rank (est.) | Win line | Closer text (DB) | Needs |
|---|---|---|---|
| 1 | Jace-25 lock (primary, 2026-10-03 review) | Jace RS "0: Exile all but the bottom card of each opponent's library. Activate only if there are twenty-five or more loyalty counters among Jaces you control." Finish: Jace MA "−7: Any number of target players each draw twenty cards." | JRS (Entrust the Spark can fetch him), Ways/Avatar on the Jace token |
| 2 | Walker burn grind (no single card needed) | Way of the Warlord grants "[−4]: This planeswalker deals 2 damage to up to one target creature or planeswalker and 2 damage to target player." · Chandra AI "+2: Each opponent gets an emblem with 'At the beginning of your upkeep, this emblem deals 1 damage to you.'" · Kaya IS "+2: Each opponent loses 3 life and you gain 3 life." · Tezzeret "+2: … X damage to each opponent, where X is the number of artifacts you control. You gain X life." | 4+ walkers under Mentor |
| 3 | Poison | Vraska "−9: If target player has fewer than nine poison counters, they get a number of poison counters equal to the difference." Then any proliferate (Tam, Atomize, Evolution Sage, Flux Channeler, Thrummingbird, Vraska's own 0) takes them to 10 | Vraska at 10+, a proliferate the same turn |
| 4 | Board of tokens | Kiora grants "[−8]: Create an 8/8 blue Leviathan creature token with hexproof." · Wildspeaker grants "[−4]: Create a 4/4 green Beast creature token with trample." · Elspeth "+1: Create three 1/1 white Soldier creature tokens." / "−7: … Creatures you control get +2/+2 and have flying." | Mentor refills the minus abilities |
| 5 | Draw-out burn | Ob Nixilis HT "Whenever an opponent draws a card, Ob Nixilis deals 1 damage to that player." + Jace MA −7 = 20 damage to each targeted opponent (each card drawn is its own draw, CR 121.2) | Both walkers out, Jace MA at 7 |
| 6 | Extra turns / emblem | Ral "−7: Flip five coins. Take an extra turn after this one for each coin that comes up heads." · Dellian "−6: You get an emblem with 'Whenever you gain life, target opponent loses that much life.'" | Late game |

## 2. Engine map
| # | Interaction | Text (DB) | Why it works / ⚠️ flag |
|---|---|---|---|
| 1 | Paradox × Mentor | Paradox: "Whenever you activate a loyalty ability, you gain 1 life. You may play an additional land this turn." Mentor: "Whenever you gain life, put a loyalty counter on each planeswalker you control." | With N walkers activating, every walker gains about N loyalty a turn, and every activation adds a land drop. ⚠️ The loyalty cost is paid first (CR 606.4). A walker taken to 0 by its own cost dies to state-based actions (CR 704.5i) before the Mentor counter arrives. Mentor never saves a −X to zero. |
| 2 | Lifegain multipliers | Ajani U "Whenever you activate a loyalty ability, create a 2/2 … Cadet" → Liliana F "Whenever another creature or planeswalker you control enters, you gain 1 life." Interplanar Beacon "Whenever you cast a planeswalker spell, you gain 1 life." Ajani R "Whenever you gain life, put a loyalty counter on Ajani." | With Paradox + Ajani U + Liliana F, each activation is 2 Mentor triggers (Paradox's gain + Cadet → Liliana); without Paradox it is 1. A new Jace token or walker entering also triggers Liliana. Beacon's trigger resolves before the walker does (Scryfall ruling), so the new walker does not get that counter. |
| 3 | Five-colour mana for Tam | Bloom Tender / Faeburrow "For each color among permanents you control, add one mana of that color." Timeless Lotus "{T}: Add {W}{U}{B}{R}{G}." Great Divide Guide "Each land and Ally you control has '{T}: Add one mana of any color.'" | With 5 colours on board, one Tender pays Tam's whole activation. Lotus "enters tapped". |
| 4 | Tam's proliferate | X = types on the battlefield; the Jace token counts as Jace. Proliferate also hits players' poison. | Rulings (https://scryfall.com/card/fra/276/tam-the-possibility): X is locked as it resolves, and nobody can respond between proliferates. ⚠️ {T} is in the cost, so you can't activate it the turn Tam enters (summoning sickness, CR 302.6). Esika's "{T}: Add one mana" uses the same tap. |
| 5 | Jace token stack | Ways empower 5/5/5/5/2/5/7 (34 total). Avatar "Landfall — … empower Jace 2." JRS "+1: Empower Jace X, where X is the number of Islands you control" (2 Island, Breeding Pool, Turbulent Wilderness). | ⚠️ Ruling (https://scryfall.com/card/fra/216/jace-reality-sculptor): empower never puts counters on JRS or Jace MA, only on the **token**. JRS's 0 counts "among Jaces you control", so the token, JRS and Jace MA all add up. The token also turns on the 6 Annex/Commons lands ("enters tapped unless you control a planeswalker"). |
| 6 | Granted abilities | Pyromancer "[+1]: Add {R}." Healer "[−2]: Create a 2/2 … Cadet. Surveil 1." Warlord/Wildspeaker −4, Avatar −10, Kiora −8 | Every walker gets a plus ability that feeds the loop. ⚠️ Rulings: still only one loyalty ability per walker per turn. A loyalty ability is never a mana ability, so it uses the stack at sorcery speed and the {R} must be spent that main phase (https://scryfall.com/card/fra/254/way-of-the-pyromancer). |
| 7 | Mind Sculptor draw | "Whenever you activate a loyalty ability, if you removed two or more loyalty counters to activate it, draw a card." | Healer −2, Warlord/Wildspeaker −4 and the token's "−3: Draw a card" each draw, and Mentor refills them. The draw resolves before the ability (ruling). |
| 8 | Sorin lifelink | "During your turn, creatures and planeswalkers you control have lifelink." | Each lifelink creature that deals combat damage is a **separate** Mentor trigger (Way of the Mentor ruling, https://scryfall.com/card/fra/208/way-of-the-mentor). Kaito's Drone, Cadets, Beasts and Leviathans all count. |
| 9 | Exile casts | Quintorius "Whenever you cast a spell from exile, … 2 damage to each opponent and you gain 2 life." Sources: Chimil "At the beginning of your end step, discover 5", Chandra ToD "+1: Exile the top card … You may cast that card", Quintorius "−3: Discover 4". | Each cast from exile is a drain plus a Mentor trigger. |
| 10 | Nexus Mentality (Tam out = both modes) | "Move all counters from target nonland permanent you control onto another …" / "Remove all counters … Draw a card for each counter removed this way." | At instant speed, moving a token's 20+ counters onto Vraska gives −9 this turn. You can also move counters off a walker that removal is targeting. ⚠️ Drawing more cards than your library holds loses the game (Jace MA ruling). |
| ⚠️ | **Sarkhan does NOT combine** | "+1: Until end of turn, each planeswalker you control becomes a 4/4 red Dragon creature and gains flying." | Ruling (https://scryfall.com/card/cmm/880/sarkhan-the-masterless): they are "no longer a planeswalker for the rest of the turn". Tam's X becomes 0 and Mentor/Ajani R add nothing. Walkers cast this turn can't attack. |
| ⚠️ | **Fumigate is one trigger** | "You gain 1 life for each creature destroyed this way." | A "for each" gain is one event, so it is one Mentor trigger (Ajani's Pridemate ruling, https://scryfall.com/card/fdn/135/ajanis-pridemate). |

## 3. Turn by turn
| Turn | Ideal (on the play, Sol Ring start) | Realistic (3 lands incl. 1 tapped, Talisman, 1 Way, 2 walkers, 1 answer) |
|---|---|---|
| T1 | Breeding Pool (pay 2), Sol Ring | Tapped tri-land (Opulent Palace / Seaside Citadel) |
| T2 | Command Tower, **Tam** ({1}{G}{U}) | Land, Talisman |
| T3 | Seachrome Coast (untapped with ≤ 2 other lands), Way of the Paradox ({2}{G}) + Ajani Resolute ({W} after Tam). Ajani 0, token −1 surveil: 2 Paradox lifegains plus Ajani's own, about 3 extra loyalty on Ajani | Land, **Tam** |
| T4 | Way of the Mentor (token now 9) + Oko ({G}{U}). Oko +2, Ajani 0, token −1: about 4 life events, every walker +4 | Way of the Paradox + Path/Erode, or Ajani R |
| T5 | Vraska (5 after Tam) or JRS. Pyromancer if mana is left | First 3-cost walker (Sorin, Kaito, Ral, Dellian, Chandra ToD, each 3 after Tam) + activations |
| T6 | Tam proliferate X=4 after every activation has resolved. Set up Vraska −9 + proliferate, or JRS 0 | Second Way or walker. First Tam activation once 5 colours are online (Tender/Faeburrow/Lotus/Guide) |

## 4. Mulligan guide
The first mulligan is free in multiplayer (CR 103.5c).

**Keep if:**
- 3–4 lands, including a G and a U source (for Tam) and a third colour;
- at least 1 accelerant;
- at least 1 engine piece (Paradox, Mentor) or a cheap walker (Ajani R, Oko, Saheeli, Nissa).

Keep a 2-lander only with Sol Ring or Signet plus 2-drops, and only on the draw.

| Hand | Verdict | Reason |
|---|---|---|
| Breeding Pool, Command Tower, Opulent Palace, Talisman of Progress, Way of the Paradox, Oko, Thief of Crowns, Counterspell | ✅ Keep | G/U on T1, rock into a T3 Tam, engine plus a 2-mana walker, and an answer |
| Yavimaya Coast, Sandsteppe Citadel, Island, Sol Ring, Way of the Mentor, Ajani Resolute, Path to Exile | ✅ Keep | Sol Ring → T2 Tam. Mentor + Ajani R is a lifegain loop on its own |
| Command Tower, Mana Confluence, Sol Ring, Arcane Signet, Chandra, Torch of Defiance, Evolution Sage, Erode | ✅ Keep (draw) | 2 lands + 2 rocks = 4 mana on T2. Chandra "+1: Add {R}{R}" keeps ramping |
| Island, Mountain, Nomad Outpost, Timeless Lotus, Chimil, the Inner Sun, Kaya, Intangible Slayer, Final Act | ❌ Mull | No G, so no Tam. Every spell costs 5–7 |
| Seaside Citadel, Bloom Tender, Way of the Mentor, Way of the Paradox, Oko, Sylvan Library, Erode | ❌ Mull | One tapped land. Bloom Tender needs colours on board before it ramps |
| Savage Lands, Shivan Reef, Deserted Beach, Cinder Glade, Rootbound Crag, Dragonskull Summit, Fumigate | ❌ Mull | 6 lands and a wipe: no ramp, engine or walker |

## 5. Lines to visualise each turn
| Situation | Line |
|---|---|
| Activation order | Cast walkers first (Tam's discount, and Liliana/Beacon triggers). Then plus/0 abilities on low walkers, then the minuses: each Mentor trigger has already raised the others. Tam's proliferate after every trigger has resolved. **Sarkhan +1 last**, if at all. |
| Minus maths | Use a minus only if loyalty > cost, unless losing that walker is the point. Count the Mentor triggers still to come this turn before choosing. |
| Extra land drops | Each Paradox trigger allows another land: play lands one at a time so Evolution Sage ("Landfall — … proliferate") and Avatar ("empower Jace 2") trigger on each. |
| Hold up | Counterspell {U}{U} or Dovin's Veto {W}{U} (wipes, walker removal; Veto "can't be countered"). Settle the Wreckage {2}{W}{W} against a wide swing at your walkers. Vigorbloom Charm {G}{W} "hexproof and indestructible" on the Jace token, Vraska or JRS. Anguished Unmaking for any nonland permanent. |
| When to wipe | Toxic Deluge or Fumigate when creatures threaten walkers and your board is only dorks. Final Act: choose "Destroy all creatures"; "Each opponent loses all counters" removes counters on the players only (poison, energy, experience), not on their permanents, and erases the poison from your Vraska −9 line, so never pair it with the poison plan. Never the "Destroy all planeswalkers" mode unless you are behind on walkers. Elspeth "−3: Destroy all creatures with power 4 or greater" is a wipe against fatties, not one-sided: it also kills your 4/4 Beasts, 8/8 Leviathans and Sarkhan's Dragons. |
| Protect the win turn | Chimil "Spells you control can't be countered". Kaya's Ghostform on JRS/Vraska ("return that card to the battlefield"). Liliana F "{1}, {T}, Discard a card: Another target creature or planeswalker you control gains hexproof". Archangel of Tithes untapped. Fire Vraska −9 or JRS 0 only with 1–2 answers held. |
| Threat cues | Wide/hasty/flying boards will kill walkers: lead with Archangel, Elspeth +1 or Ajani U Cadets. Draw-heavy opponents feed Ob Nixilis HT. Vs single-target walker removal, spread loyalty and let the Jace token draw fire. Target Warlord −4's "2 damage to target player" at whoever is closest to killing you. |
| Tutors | Entrust the Spark: sacrifice a small Jace token or a spent walker (operator line), never the big token. Pia: discard → Way of the Mentor/Paradox. The Prismatic Bridge (back face {W}{U}{B}{R}{G}, Scryfall) is not a tutor: each upkeep it reveals until the first creature or walker card and puts that in free. |

## 6. Misplays to avoid
- Spending a walker's last counter on its cost and expecting Paradox/Mentor to refund it. It dies first (CR 704.5i).
- Using Sarkhan +1 before the other activations or Tam's proliferate (X = 0, Mentor wasted).
- Tapping Tam for Esika mana on the turn you need the proliferate.
- Ajani U "−3: Ajani deals 4 damage to each creature except for tokens you control" kills Tam (2/4), Kiora, Avatar, Sage and Liliana. Chandra AI "−3: … 3 damage to each non-Elemental creature" kills every dork.
- Nexus Mentality's draw mode on a 25-counter token with a thin library (decking), or on the token you need for JRS 0.
- Treating JRS 0 as a win. Opponents draw their last card next turn and lose only on the following draw. Follow up with Jace MA −7 the same turn, or hold Settle/Archangel for their swing-back.
- Jace MA −7 without JRS or Ob Nixilis HT just refills three opponents.
- Vraska −9 with no proliferate the same turn gives them a turn to answer her. Line up Tam, Atomize (instant) or a noncreature spell with Flux Channeler first.
- Counting Fumigate's "for each" as several Mentor triggers.
- Firing Fumigate or Toxic Deluge into your own Tender/Faeburrow/Guide when the threat is walker removal, not creatures.

## 7. Weak spots
| Threat | Why it hurts | Play around |
|---|---|---|
| Fast wide/flying aggro | Walkers have few blockers | Archangel's "{1} for each of those creatures" tax, Settle, Elspeth tokens, an early Deluge |
| Enchantment removal / mass bounce (Farewell, Austere Command, Cyclonic Rift) | The Ways are the engine | Don't run out a 3rd Way into open mana. Hold Counterspell/Veto for the sweeper. Pia re-finds a Way |
| Walker-hitting removal and wipes (Vindicate-type, Pernicious Deed) | Single points of failure (JRS, Vraska) | Kaya's Ghostform, Vigorbloom indestructible, Kaya IS has "Hexproof". Spread loyalty across walkers |
| Combo decks faster than T7 | The engine is a T6–9 deck | Keep a hand with Counterspell, Veto or Anguished Unmaking. Ob Nixilis HT taxes draw-combo |
| Stax on activated abilities (Pithing Needle on Tam) | Removes the proliferate | The Ways + Mentor still close without Tam's activation |
| Mana: five colours, 3 basics, many conditional lands | Tam's ability needs exactly WUBRG | Prioritise untapped G/U early. The 6 Annex/Commons lands turn on with the first walker or Jace token |
