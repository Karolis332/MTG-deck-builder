# Jet, Freedom Fighter — Arena Historic Brawl pilot guide

List: `verify-2026-10-08/best-deck/jet/jet-arena.txt` (Arena import "Jet Boros v1"). 1v1, 25 life.
Built from the model's #1 Arena list (objective 109.0): 27 role-window fillers reverted to go-wide payoffs,
9 colourless / filter / fetch lands replaced by coloured owned lands (34 lands + 3 MDFC). Every change is on the check page.

## 1. The plan

[[Jet, Freedom Fighter]] ({2}{R/W}{R/W}{R/W}, 3/1): *"When Jet enters, he deals damage equal to the number of creatures you
control to target creature an opponent controls. When Jet dies, put a +1/+1 counter on each of up to two target creatures."*
Jet is **removal on legs that scales with your board**; he counts himself. The deck goes wide with Allies and tokens,
turns every creature entering into damage ([[Purphoros, God of the Forge]], [[Warleader's Call]], [[Impact Tremors]],
[[Witty Roastmaster]], [[Slash, Reptile Rampager]]) and flickers its enter-the-battlefield creatures, Jet first.

- **T1–3:** untapped white source, a 2-drop that makes two bodies ([[Goblin Instigator]], [[Honored Knight-Captain]],
  [[Invasion Reinforcements]], [[Resolute Reinforcements]]), a ping enchantment ([[Impact Tremors]], [[Warleader's Call]]) or [[Intangible Virtue]].
- **T4:** [[Purphoros, God of the Forge]] / [[Hakoda, Selfless Commander]] / [[Teleportation Circle]] / [[Kyoshi Warriors]] — the engine turn.
- **T5:** Jet when his damage kills the blocker that matters, otherwise [[Gather the White Lotus]], [[Slash, Reptile Rampager]], [[Katara, Heroic Healer]].
- **Close:** pings from a token flood, or one alpha with [[Heroic Reinforcements]] + [[How to Start a Riot]].

## 2. Engine map

| Piece | What it does | Oracle |
|---|---|---|
| [[Purphoros, God of the Forge]] | 2 damage per creature entering; indestructible, not a creature below 5 red devotion (survives every wipe) | "Whenever another creature you control enters, Purphoros deals 2 damage to each opponent" |
| [[Warleader's Call]], [[Impact Tremors]], [[Witty Roastmaster]], [[Slash, Reptile Rampager]] | 1 / 1 / 1 / 2 more per creature entering; Call is also +1/+1 | Roastmaster and Slash say "another creature" — they do not ping for themselves |
| Two-body creatures: [[Goblin Instigator]], [[Honored Knight-Captain]], [[Invasion Reinforcements]], [[Resolute Reinforcements]], [[Treetop Freedom Fighters]], [[Kyoshi Warriors]], [[Mighty Mutanimals]] | two enters-triggers for one card | Resolute and Invasion have flash |
| Mobilize: [[Voice of Victory]] 2, [[Dalkovan Packbeasts]] 3, [[Shock Brigade]] 1, [[Zurgo's Vanguard]] 1; [[Leonin Warleader]] 2 Cats | tokens enter tapped and attacking → pings every attack | Mobilize tokens are sacrificed at end step; the Cats stay |
| [[Chandra, Acolyte of Flame]] | 0: two hasty 1/1s every turn → 2 enters-triggers per turn | "Create two 1/1 red Elemental creature tokens. They gain haste" |
| [[Gather the White Lotus]] | one Ally token per Plains: 11 basics + [[Sacred Foundry]] + [[Elegant Parlor]] count (Mountain Plains) | "Create a 1/1 white Ally creature token for each Plains you control" |
| [[Outlaws' Merriment]], [[Three Blind Mice]], [[The Cave of Two Lovers]], [[Grand Entryway]], [[Jasmine Dragon Tea Shop]], [[Sun Warriors]] | steady token stream | Mice II/III copy a token (copy the Glimmer or a Cat) |
| Flicker: [[Cloudshift]], [[Ephemerate]], [[Teleportation Circle]], [[Appa, Loyal Sky Bison]] (airbend), [[Aang, Airbending Master]] (airbend) | Jet enters again = another kill; Kyoshi/Treetop/Mutanimals = another token; Katara = another round of counters | Circle fires every end step |
| [[Suki, Courageous Rescuer]] | +1/+0 to others; a token whenever a permanent you control leaves during your turn (once per turn) — every flicker feeds her | "leaves the battlefield during your turn" |
| Anthems: [[Warleader's Call]], [[Intangible Virtue]], [[Suki, Courageous Rescuer]], [[Katara, Heroic Healer]], [[Caretaker's Talent]] L3, [[Abandoned Air Temple]], [[Dauntless Veteran]], [[Heroic Reinforcements]], [[Imodane's Recruiter]], [[How to Start a Riot]], [[Purphoros, God of the Forge]] {2}{R} | turn the 1/1s into a lethal alpha | Air Temple: "{3}{W}, {T}: Put a +1/+1 counter on each creature you control" |
| Cards: [[Caretaker's Talent]], [[Belladonna Took]], [[South Pole Voyager]], [[Hakoda, Selfless Commander]], [[Master Piandao]], [[Reckoner Bankbuster]], [[Inspiring Overseer]], [[Professional Face-Breaker]] | the go-wide deck's gas | Talent draws once per turn — including the opponent's turn |
| Ally payoffs: [[Hakoda, Selfless Commander]], [[Wartime Protestors]], [[Avatar Enthusiasts]], [[South Pole Voyager]], [[Cavern of Souls]], [[Secluded Courtyard]], [[Jasmine Dragon Tea Shop]] | 17 Allies + every Ally token | Protestors give each entering Ally a counter and haste |

## 3. Win lines

**Line A — token flood pings (T6–7, the common kill).**
=> [[Purphoros, God of the Forge]] + [[Warleader's Call]] in play → [[Gather the White Lotus]] with 6 Plains → 6 tokens enter → 6 × (2 + 1) = 18 damage → [[Impact Tremors]] or [[Witty Roastmaster]] also out: 24
Opponent at 25: any attack the turn before finishes it. With [[Slash, Reptile Rampager]] instead of Call, 6 tokens = 24 on their own.

**Line B — the alpha (T5–6).**
=> 6 creatures on board → [[Heroic Reinforcements]]: 8 bodies, each +1/+1 and haste → [[Warleader's Call]] +1/+1 → [[How to Start a Riot]] on yourself: +2/+0 → eight attackers at 4+ power = 32+ → blocks stop two, 24 connect
[[Voice of Victory]] attacking means the opponent cannot cast spells during the turn: no instant-speed wipe, no fog.

**Line C — Jet machine gun (board control).**
=> Jet enters with 6 creatures → 7 damage to their best creature → [[Teleportation Circle]] end step: Jet leaves and returns → 7 more next end step → [[Cloudshift]] / [[Ephemerate]] at instant speed for the third
Their board stays empty; every Jet entry also pings for Purphoros/Call/Tremors (he is a creature entering). Ephemerate rebounds: two flickers for {W}.

**Line D — Appa recast loop.**
=> [[Appa, Loyal Sky Bison]] enters or attacks → airbend Jet (exile; cast him for {2}) → recast Jet for {2} → ETB damage again + [[Suki, Courageous Rescuer]] token + [[Aang, Airbending Master]] experience counter
Leave Jet in exile and cast him from there: moving him to the command zone loses the {2} cast.

**Line E — Chandra engine (grind).**
=> [[Chandra, Acolyte of Flame]] 0 each turn → two hasty Elementals enter → [[Purphoros, God of the Forge]] 4 + [[Warleader's Call]] 2 → 6 damage a turn before combat → the Elementals attack as 2/2s under Call
Four turns of Chandra alone is 24; [[Belladonna Took]] draws off the second token every turn.

## 4. Turn plan

| Turn | Do | Why |
|---|---|---|
| 1 | untapped W source ([[Sacred Foundry]] pay 2 only with a 1-drop, [[Sunbillow Verge]], Plains), [[Earth Kingdom Protectors]] | a body for Jet's count later |
| 2 | two-body 2-drop, or [[Impact Tremors]] / [[Intangible Virtue]] / [[Belladonna Took]]; rock ([[Arcane Signet]], [[Boros Signet]], [[Talisman of Conviction]], [[Mind Stone]]) if the hand is top-heavy | enters-triggers start with the pingers down first |
| 3 | [[Warleader's Call]] / [[Suki, Courageous Rescuer]] / [[Witty Roastmaster]] / [[Caretaker's Talent]] / [[Chandra, Acolyte of Flame]] | engine pieces before bodies |
| 4 | [[Purphoros, God of the Forge]] (best) / [[Hakoda, Selfless Commander]] / [[Teleportation Circle]] / [[Kyoshi Warriors]] / [[Leonin Warleader]] | Purphoros is the card the opponent cannot answer |
| 5 | Jet if the kill matters, else [[Gather the White Lotus]] / [[Slash, Reptile Rampager]] / [[Katara, Heroic Healer]] | Jet is removal, not a threat: cast him into a target |
| 6+ | [[Appa, Loyal Sky Bison]], alpha with [[Heroic Reinforcements]]; hold [[Boros Charm]] for the wipe | close by T7 |

## 5. Mulligan

**Keep:** 3–4 lands with two white sources, one 2-drop, one of (ping enchantment, Purphoros, Talent). Jet is always castable on 5, so a hand that develops T2–T4 is a keep.
**Mull:** 1–2 lands; 5+ lands with two 5-drops; a hand whose only red source is [[Arena of Glory]] (tapped without a Mountain).

Example keep: Plains, [[Sacred Foundry]], [[Thriving Heath]], [[Goblin Instigator]], [[Warleader's Call]], [[Kyoshi Warriors]], [[Swords to Plowshares]].
Example mull: [[Temple of Triumph]], [[Boros Guildgate]], [[Appa, Loyal Sky Bison]], [[Gather the White Lotus]], [[Katara, Heroic Healer]], [[Blasphemous Act]], [[Master Piandao]].

## 6. Pilot rules

1. Jet's damage is counted on resolution with Jet on the battlefield: 5 other creatures = 6 damage. He is a 3/1 — never protect him, recast him into the next target; his death gives two counters.
2. Airbended Jet ([[Appa, Loyal Sky Bison]], [[Aang, Airbending Master]]): leave him in exile and cast him for {2}. The command-zone replacement is a "may".
3. [[Purphoros, God of the Forge]], [[Witty Roastmaster]], [[Slash, Reptile Rampager]] trigger on **another** creature: Mobilize tokens, Chandra's Elementals and Mice copies all count; the pinger itself does not.
4. [[Caretaker's Talent]] draws once **each turn**: flash [[Resolute Reinforcements]] or [[Invasion Reinforcements]] in on the opponent's turn for a second draw per round. [[Belladonna Took]] draws on the second token of a turn — Mobilize 2/3 and [[Heroic Reinforcements]] do it alone.
5. [[Blasphemous Act]] kills your own board. Make it one-sided: [[Boros Charm]] mode 2 (permanents indestructible) or sacrifice [[Hakoda, Selfless Commander]] (+0/+5 and indestructible) in response. Purphoros survives regardless.
6. [[Gather the White Lotus]] counts Plains: the 11 basics plus [[Sacred Foundry]] and [[Elegant Parlor]]. [[Razorgrass Ambush]] and [[Witch Enchanter]] land backs are not Plains.
7. [[Sun Warriors]]: firebending X adds X red mana during combat — spend it on Purphoros's {2}{R} pump, [[Jasmine Dragon Tea Shop]]'s {5} token or Sun Warriors' own {5} token.
8. [[Teleportation Circle]] at your end step: Jet (kill), [[Kyoshi Warriors]] / [[Treetop Freedom Fighters]] / [[Mighty Mutanimals]] (token), [[Katara, Heroic Healer]] (counters), [[Witch Enchanter]] (destroy an artifact or enchantment), [[Aang, Airbending Master]] (airbend). Each flicker also makes a Suki token and an Aang experience counter.
9. [[Voice of Victory]] attacking: the opponent cannot cast spells on your turn — lead the alpha or the Jet turn with her.
10. [[Hakoda, Selfless Commander]] casts Allies from the top: look at the top before every draw-replacement effect and before Bankbuster.
11. [[Reckoner Bankbuster]]: three draws for {2} each; crew 3 with two 1/1 tokens plus a Pilot once it empties.
12. [[Wartime Protestors]] gives each entering Ally haste: Kyoshi Warriors and its token both attack the turn they arrive.

## 7. Threats

- **Board wipes** ([[Sunfall]], [[Depopulate]], [[Blasphemous Act]]): keep [[Resolute Reinforcements]] / [[Heroic Reinforcements]] / [[Gather the White Lotus]] in hand; Purphoros and the ping enchantments survive and the rebuild pings again.
- **Lifegain / stall:** the pings do not care about blockers; [[Boros Charm]] mode 1 is 4 to the face; [[Slash, Reptile Rampager]] doubles the clock.
- **Big blockers:** Jet's ETB, [[Swords to Plowshares]], [[Lightning Helix]], [[Glassworks]], [[Razorgrass Ambush]], [[Eiganjo, Seat of the Empire]] channel.
- **Counterspells:** [[Voice of Victory]], [[Cavern of Souls]] / [[Secluded Courtyard]] on Ally, [[Reprieve]] to bounce their response.
- **Artifact / enchantment hate on Purphoros:** he is indestructible, not hexproof — exile effects answer him; keep [[Impact Tremors]] / [[Warleader's Call]] as the second ping layer.
