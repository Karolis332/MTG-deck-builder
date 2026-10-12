# Anti-Venom, Horrifying Healer — Arena Competitive Brawl pilot guide

List: `verify-2026-10-12/anti-venom/final-v2.txt` (Arena import "Anti-Venom Airbend v2"). 1v1, 25 life, mono-W.

## 1. The plan

[[Anti-Venom, Horrifying Healer]] ({W}{W}{W}{W}{W}): *"When Anti-Venom enters, if he was cast, return target
creature card from your graveyard to the battlefield. / If damage would be dealt to Anti-Venom, prevent that
damage and put that many +1/+1 counters on him."* Fill the graveyard, cast him on T4–5 to reanimate a fatty,
then keep re-casting him from exile for {2} (no commander tax) via **airbend** — never flicker, which drops his
ETB — to reanimate again and again. [[Monk Gyatso]] turns every targeting of him, including the opponent's
removal, into a free airbend. The close is the [[Ashnod's Altar]] loop with [[Perilous Myr]] (or three other
3-card loops — see §3) for infinite damage; the backup is a hasted fatty off a fair T4.

## 2. Engine map

| Piece | Oracle | Role |
|---|---|---|
| [[Monk Gyatso]] | "Whenever another creature you control becomes the target of a spell or ability, you may airbend that creature." | turns targeted removal into a free re-cast; also the core loop engine |
| [[Gandalf the White]] | "If a legendary permanent or an artifact entering or leaving the battlefield causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time." | doubles Anti-Venom's ETB and Myr's death trigger — 4 damage/loop instead of 2 |
| [[Panharmonicon]] | "If an artifact or creature entering causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time." | same doubling as Gandalf, on every artifact/creature ETB (Krang, Battlesphere, Meteor Golem, Alabaster, Moonshaker, Synthoids, Teyo, Witch Enchanter, Liliana's lifegain) |
| [[Lightning Greaves]] / [[Swiftfoot Boots]] | Equip {0} / {1}, haste + shroud/hexproof | Gyatso targeters: equip Anti-Venom, Gyatso intercepts, equip fizzles |
| [[Éowyn, Lady of Rohan]] | "At the beginning of combat... target creature gains first strike or vigilance. / Equip abilities you activate cost {1} less." | free combat-trigger targeting every turn; makes Swiftfoot's equip {0} |
| [[Teyo, Lightshield Expert]] | flash, grants hexproof | cheap loop piece and Gyatso-shield (protects Gyatso himself from exile) |
| [[Ashnod's Altar]] | "Sacrifice a creature: Add {C}{C}." | the one sac outlet every loop needs |
| [[Perilous Myr]] | "When this creature dies, it deals 2 damage to any target." | the kill piece for loop A |
| [[Aang, Airbending Master]] | "When Aang enters, airbend another target creature." | ETB-airbends Anti-Venom with no Gyatso needed (loop E) |
| [[Appa, Steadfast Guardian]] | flash, flying, "airbend any number of other target nonland permanents you control" | ETB-airbends Anti-Venom, no Gyatso (loop F) |
| [[Appa, Loyal Sky Bison]] | "Whenever Appa enters or attacks, choose one — target creature gains flying / airbend another target nonland permanent you control" | ETB-airbends Anti-Venom, no Gyatso (loop G) |
| Grave fillers: [[Thrór's Map]], [[Murmuring Volume]], [[Network Terminal]], [[Airlift Chaplain]], [[A.I.M. Synthoids]], [[The Restoration of Eiganjo]], [[The Echoverse Fulcrum]] | loot/surveil/mill | fill the yard with Krang, Myr, Battlesphere before T4–5 |
| Reanimation targets: [[Krang, Utrom Warlord]] (9/9, grants artifact creatures flying/trample/indestructible/haste), [[Zetalpa, Primal Dawn]], [[Elesh Norn, Grand Cenobite]], [[Moonshaker Cavalry]], [[Curious Colossus]], [[Myr Battlesphere]], [[Meteor Golem]], [[Alabaster Host Intercessor]] | never hard-cast; milled/discarded/cycled and returned by Anti-Venom | the payoff of a successful reanimation |
| [[The Seriema]] / [[The Arkenstone]] (Seek the Heart) | tutor a legendary creature to hand | finds Gyatso or Krang (to discard) |
| [[Tune Up]] | "Return target artifact card from your graveyard to the battlefield." | recovers a milled Altar/Greaves/Panharmonicon without Anti-Venom |
| [[Flawless Maneuver]], [[Teferi's Protection]], [[Flare of Fortitude]], [[Restoration Magic]] | free/cheap protection | wipe insurance while Anti-Venom is out |

## 3. Win lines (main phase, empty stack between steps; "−" = mana spent)

**Loop A — Gyatso + Greaves + Altar + Perilous Myr in the yard (needs Gyatso).**
=> Equip Greaves {0} targeting Anti-Venom → Gyatso: "you may airbend" → exile (decline the move-to-command-zone
prompt) → cast Anti-Venom from exile for {2} → his ETB returns Perilous Myr → Altar sac Myr for {C}{C} → Myr's
death deals 2 to the opponent → repeat
Net mana 0 per loop after the first {2}. 13 loops kills from 25 life. With [[Gandalf the White]] or
[[Panharmonicon]] out, Anti-Venom's ETB (and Myr's death trigger, for Gandalf) triggers twice: **4 damage per
loop**, half the loops needed.
- **A′ (no Greaves):** Swiftfoot Boots + Éowyn's "equip costs {1} less" = Equip {0}. Same loop.
- **A″ (equip {1}, no Éowyn):** add [[Oltec Matterweaver]] (makes a Gnome on every creature cast) — the Gnome's
  sac covers the extra {1}, net +1 mana/loop.

**Loop E — Anti-Venom + Aang, Airbending Master + Altar (does NOT need Gyatso).**
=> Aang's ETB ("airbend another target creature") exiles Anti-Venom, mandatory → sacrifice Aang to the Altar
(+{C}{C}) → cast Anti-Venom for {2} from exile → his ETB returns Aang → repeat
Net 0. Infinite "leaves without dying" experience counters → infinite 1/1 Allies at the next upkeep. With
[[Liliana the Faultless]] out: +2 life/loop. With Panharmonicon/Gandalf: also returns Perilous Myr each time for
the kill.

**Loop F — Anti-Venom + Appa, Steadfast Guardian + Altar (does NOT need Gyatso).**
=> Appa's ETB airbends Anti-Venom → recast him for {2} while Appa is out → "whenever you cast a spell from
exile" makes an Ally → sacrifice Appa and the Ally to the Altar (+{C}{C} each) → Anti-Venom's ETB returns Appa →
repeat
+2 mana/loop (infinite colourless), or bank the Allies at net 0. Appa has flash, so this also starts from an
instant-speed cast.

**Loop G — Anti-Venom + Appa, Loyal Sky Bison + Altar (does NOT need Gyatso).**
=> Appa's ETB/attack mode "airbend another target nonland permanent you control" → Anti-Venom → sacrifice Appa
(+{C}{C}) → recast Anti-Venom (−{C}{C}) → his ETB returns Appa → repeat
Net 0. Infinite ETBs — each one is a free Ally with Steadfast Guardian also out.

**Kill with E/F/G when only Panharmonicon or Gandalf is out (no Myr needed):** Anti-Venom's ETB triggers twice →
return the loop piece AND Perilous Myr in the same resolution → sacrifice both (+{C}{C}{C}{C}) → recast (−{C}{C})
→ **+2 mana and 2 damage per loop**.

**Fair T4 (no combo, no reanimation target in the yard yet):**
=> T2 Coldsteel Heart → T3 cycle/mill Krang into the graveyard (Alabaster plainscycling, Map/Volume/Terminal
loot, Mountain-king I, Echoverse ETB) → T4 Anti-Venom (4 lands + Heart = 5 W) reanimates Krang → attack for 9
flying trample haste
Note: the Seriema route (tutor Krang to hand, then loot it away) does not finish by T4 — it needs 4 more mana
than a T4 hand has (Map {2} + loot {2}, or Terminal {3} + {1}) on top of Anti-Venom's 5. Use it as a T5 line, or
mill Krang directly if you want the kill on T4.

## 4. T1–T6 timeline

| Turn | Do |
|---|---|
| 1 | Chrome Mox (imprint a spare removal/protection spell), or an untapped W source |
| 2 | Coldsteel Heart / Arcane Signet / Ornithopter of Paradise / Thrór's Map / Bender's Waterskin |
| 3 | Network Terminal / Murmuring Volume / Airlift Chaplain / The Restoration of Eiganjo / The Seriema (tutor Gyatso, or Krang to discard) / Éowyn. Spare {2}: plainscycle Alabaster or cycle Eldrazi Ravager |
| 4 | Anti-Venom (4 lands + 1 W rock) → reanimate the best target in the yard: Krang (swings now) > Moonshaker/Zetalpa/Curious Colossus/Elesh Norn > Alabaster/Meteor Golem (removal) > Gyatso (if milled) |
| 5 | Gyatso (if not already down) + any targeter re-casts Anti-Venom for {2}: Greaves {0}, Swiftfoot {1} ({0} with Éowyn), Éowyn's combat trigger, Teleportation Circle at end step, Liliana, Teyo, Ephemerate, Restoration Magic (Cure, {0}) |
| 6 | Close with loop A/E/F/G if the pieces are assembled, or keep stacking reanimated fatties |

## 5. Mulligan

**Keep:** 3–4 W sources, a T2 or T3 ramp/grave-filler, and either a loop piece (Gyatso/Greaves/Swiftfoot/Altar) or
one of the airbending Aang/Appa creatures (those need no Gyatso). Anti-Venom is always castable on turn 5 off 4
lands + 1 rock, so any hand that develops a mana base and has *something* to reanimate is a keep.

Example keeps:
1. Plains, Plains, Abandoned Air Temple, Coldsteel Heart, Thrór's Map, Monk Gyatso, Ashnod's Altar.
2. Eiganjo, Seat of the Empire, Plains, Plains, Arcane Signet, Lightning Greaves, Anti-Venom, Perilous Myr.
3. Plains, Cavern of Souls, Bender's Waterskin, Airlift Chaplain, Appa, Loyal Sky Bison, Ashnod's Altar, Swords to Plowshares.

**Mull:** 1–2 lands; 6+ lands with no rock and no grave filler; a hand with a loop piece but no Altar and no way
to find one (no Seriema/Arkenstone, no Enlightened Tutor, no Tune Up).

Example mulls:
1. Plains, Krang Utrom Warlord, Myr Battlesphere, Meteor Golem, Elesh Norn, Zetalpa, The Eternal Wanderer (one
   land, all uncastable fatties).
2. Plains, Plains, Chrome Mox, Swiftfoot Boots, Teferi's Protection, Flare of Fortitude, Divine Reckoning (no
   grave filler, no reanimation target, no Altar).
3. Plains, Plains, Plains, Plains, Plains, Zetalpa, Myr Battlesphere (5 lands, nothing castable before T6).

## 6. Piloting traps

1. **Flicker vs airbend.** [[Ephemerate]], [[Cloud, Midgar Mercenary]]'s own body, [[Teleportation Circle]]'s
   blink only exile-and-return *without* recasting — that is fine for Aang/Appa/Teyo ETB creatures, but
   **never flicker Anti-Venom**: a flicker returns him already on the battlefield, so his "if he was cast"
   clause is false and no reanimation happens. Only airbend (Gyatso, Aang, Appa SG/LSB, Airbender's
   Reversal/Lesson/Ascension) exiles him for a genuine re-**cast**.
2. **Gyatso's "may" fires on the opponent's targeting too.** Any removal aimed at a creature other than Gyatso
   himself becomes an airbend and a {2} re-cast — this is free protection, not just an engine trigger. Decide
   per-target; you don't have to airbend a creature you'd rather let die (e.g., a token with no re-cast value).
3. **The command-zone prompt.** When Anti-Venom (or any commander) is airbended, Arena asks whether to move him
   to the command zone instead of exile. **Always decline** — moving him to the command zone loses access to
   the {2} exile-cast and reintroduces the commander tax.
4. **Sorcery-speed recast without Gandalf.** Casting a creature spell from exile is still casting a creature
   spell: it only works at a time you could normally cast sorceries, unless [[Gandalf the White]] is out
   ("cast legendary spells and artifact spells as though they had flash"). Without Gandalf, finish your loop
   steps in a single main phase.
5. **Mesmeric Orb is gone** (swapped for Panharmonicon in REFUTE). There is no passive untap-mill in this build
   — graveyard filling is on Thrór's Map, Murmuring Volume, Network Terminal, Airlift Chaplain, A.I.M.
   Synthoids, The Restoration of Eiganjo, and The Echoverse Fulcrum (all active loot/surveil/mill effects, not
   symmetric).

## 7. Tutor targets per situation

| Tutor | Typical target | When |
|---|---|---|
| [[The Seriema]] | Monk Gyatso | no engine piece down yet, need the free-airbend shield |
| [[The Seriema]] | Krang, Utrom Warlord | to discard it (not to hand-cast) — sets up a fair T4 Anti-Venom |
| [[Enlightened Tutor]] | Ashnod's Altar | have a loop piece (Gyatso+Greaves, or Aang/Appa) but no sac outlet |
| [[Enlightened Tutor]] | Lightning Greaves / Swiftfoot Boots | have Gyatso + Altar but no cheap targeter |
| [[The Arkenstone]] (Seek the Heart) | Krang, Utrom Warlord | legendary tutor to hand when you want the T4 fair kill, not binned |
| [[The Arkenstone]] (Seek the Heart) | Gandalf the White | want the doubled-loop damage over the fair-beats line |
