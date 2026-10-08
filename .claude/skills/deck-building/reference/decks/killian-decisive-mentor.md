# Killian, Decisive Mentor — Orzhov Auras and goad (paper, 2026-10-08)

List: `verify-2026-10-08/killian/killian-final.txt` (= v2). Base: the Silverquill Influence precon (SOC, in hand since 2026-10-02): 58 precon cards kept, 20 loose cards in, 26 precon cards out (10 of those already live in other sleeved decks). Nothing is taken from a sleeved deck. Gate: all PASS except the known `plan` false negative (Auras are not counted as the commander's draw enablers).

## 1. Plan

**Primary — the Eriette drain.** Put Auras on the table in any form: pump on our evasive bodies, Impetus Auras on opponents' creatures, Scriv's Contract tokens. Every one counts for [[Eriette of the Charmed Apple]]: *"At the beginning of your end step, each opponent loses X life and you gain X life, where X is the number of Auras you control."* Eight Auras is 8 to each opponent every turn. [[Defiant Bloodlord]] turns the lifegain into a second hit on one opponent. Two tutors find Eriette.

**Backup — voltron.** [[Shadrix Silverquill]] (flying, double strike) or any flyer wearing [[Angelic Destiny]], [[Eldrazi Conscription]] or [[Super State]]. Super State is the table kill: *"Whenever enchanted creature deals combat damage to an opponent, it deals that much damage to each other opponent."*

**Defence — goad.** Killian goads on every enchantment ETB, the four Impetus Auras goad permanently, Eriette makes enchanted creatures unable to attack us, [[Ghostly Prison]] taxes the rest. Opponents fight each other while the drain ticks.

**Draw.** Killian: *"Whenever one or more creatures that are enchanted by an Aura you control attack, draw a card."* A goaded opponent's creature wearing our Impetus attacking someone else draws us a card too. [[Sram, Senior Edificer]], [[Kor Spiritdancer]], [[Pearl-Ear, Imperial Advisor]] draw on Aura casts; [[Coercive Impetus]] draws on each attack.

## 2. Engine map

| Piece | Oracle (verbatim) | Role |
|---|---|---|
| Killian, Decisive Mentor | Whenever an enchantment you control enters, tap up to one target creature and goad it. / Whenever one or more creatures that are enchanted by an Aura you control attack, draw a card. | goad + draw |
| Eriette of the Charmed Apple | Each creature that's enchanted by an Aura you control can't attack you or planeswalkers you control. / At the beginning of your end step, each opponent loses X life and you gain X life, where X is the number of Auras you control. | primary win |
| Defiant Bloodlord | Whenever you gain life, target opponent loses that much life. | drain doubler |
| Shadrix Silverquill | Flying, double strike / At the beginning of combat on your turn, you may choose two. Each mode must target a different player. | voltron body, politics |
| Super State | Enchanted creature has base power and toughness 9/9 and has flying, first strike, trample, and haste. / Whenever enchanted creature deals combat damage to an opponent, it deals that much damage to each other opponent. | table kill |
| Eldrazi Conscription | Enchanted creature gets +10/+10 and has trample and annihilator 2. | voltron |
| Angelic Destiny | Enchanted creature gets +4/+4, has flying and first strike, and is an Angel in addition to its other types. / When enchanted creature dies, return this card to its owner's hand. | voltron, recursive |
| Flickering Ward | Enchanted creature has protection from the chosen color. This effect doesn't remove this Aura. / {W}: Return this Aura to its owner's hand. | repeatable enchantment ETB |
| Ajani's Chosen | Whenever an enchantment you control enters, create a 2/2 white Cat creature token. If that enchantment is an Aura, you may attach it to the token. | bodies |
| Archon of Sun's Grace | Constellation — Whenever an enchantment you control enters, create a 2/2 white Pegasus creature token with flying. | bodies |
| Doomwake Giant | Constellation — Whenever this creature or another enchantment you control enters, creatures your opponents control get -1/-1 until end of turn. | sweep engine |
| Pearl-Ear, Imperial Advisor | Enchantment spells you cast have affinity for Auras. / Whenever you cast an Aura spell that targets a modified permanent you control, draw a card. | cost + draw |
| Killian, Ink Duelist | Spells you cast that target a creature cost {2} less to cast. | every Aura costs 2 less |
| Transcendent Envoy / Starfield Mystic / Pearl Medallion | Aura spells you cast cost {1} less / Enchantment spells you cast cost {1} less / White spells you cast cost {1} less | cost |
| Scriv, the Obligator | Whenever Scriv enters or attacks, create a white Aura enchantment token named Contract attached to target creature an opponent controls. | Aura count + goad-like |
| Parasitic Impetus | Enchanted creature gets +2/+2 and is goaded. / Whenever enchanted creature attacks, its controller loses 2 life and you gain 2 life. | goad + drain |
| Breena, the Demagogue | Whenever a player attacks one of your opponents, if that opponent has more life than another of your opponents, that attacking player draws a card and you put two +1/+1 counters on a creature you control. | goad payoff; counters = modified for Pearl-Ear |
| Diabolic Tutor / Mastermind's Acquisition | Search your library for a card, put it into your hand, then shuffle. | find Eriette, then Conscription / Super State |
| Winds of Rath | Destroy all creatures that aren't enchanted. They can't be regenerated. | one-sided wipe |
| Forum Filibuster | At the beginning of your upkeep, create a 2/1 white and black Inkling creature token with flying. When you do, return up to one target Aura or Equipment card from your graveyard to the battlefield attached to that token. | Aura recursion |

## 3. Win lines — validated

Validation = oracle text above (DB, verbatim), rules check, and `verify-2026-10-08/killian/winsim.py` (3,000 goldfish games, 3 opponents at 40, no interaction, every opponent has a creature to goad from T3; greedy casting; coarse — it ranks lines, it does not predict a table).

### Line A — Eriette drain (primary)
=> Auras on the table (ours, Impetus, Contracts) → [[Eriette of the Charmed Apple]] end step: each opponent −X, we +X → [[Defiant Bloodlord]]: one opponent −X again

- **Rules.** "Auras you control" counts Impetus Auras attached to opponents' creatures and Scriv's Contract tokens (they are Auras we control). Eriette and Bloodlord both resolve at our end step; Bloodlord's trigger is from the lifegain, so it always follows Eriette's drain.
- **Arithmetic.** 8 Auras = 24 life off the table per turn, 32 with Bloodlord; three 40-life opponents fall in 5 turns from the first drain, 4 turns at 10 Auras.
- **Redundancy.** One Eriette, two tutors. Sim: Eriette on the battlefield by T5 in 14 %, by T7 in 35 % (v1 without tutors: 16 %). Auras on the battlefield: 2.2 on T6, 3.8 on T8 on average — the deck needs T8+ to have the drain at 4+, which is why the goldfish close is T12–13.
- **Verdict.** ✅ Works as written; it is the slow, inevitable line. It wants Eriette early (mulligan for a tutor or Eriette with a 2-drop engine).

### Line B — Super State table kill
=> [[Super State]] on [[Shadrix Silverquill]] (or any flyer) → 9 to the defender, 9 to each other opponent → double strike: 18 to all three per swing

- **Rules.** Super State sets base 9/9; Shadrix keeps double strike and flying; first-strike and regular damage each trigger "deals combat damage to an opponent" → each other opponent takes 9 twice = 18. With [[Eldrazi Conscription]] on the same body: 19/19, 38 to every opponent in one combat — the table dies from 40 in two swings, or one swing after any Eriette turn.
- **Cost.** Super State {7} and Conscription {8} are Aura spells that target → [[Killian, Ink Duelist]] takes 2 off each, Envoy 1, Mystic 1 (Pearl Medallion does not apply: both are colourless), Pearl-Ear's affinity takes 1 per Aura. With Ink Duelist + Envoy + Mystic + four Auras out, Super State costs {1}... floor {1} generic, Conscription {1}.
- **Redundancy.** One Super State, two tutors, Herald of Amity / Armored Skyhunter / Songbirds' Blessing dig for Auras.
- **Verdict.** ✅ Legal and lethal; realistic from T8 with a reducer or a tutor.

### Line C — commander damage / voltron
=> [[Angelic Destiny]] or [[Eldrazi Conscription]] on Killian (2/3) or a flyer → 21 commander damage in two hits, or 12+ flying per turn

- Killian + Destiny = 6/7 flying first strike; + Conscription = 16/17 trample annihilator 2 → two hits = 32 ≥ 21 commander damage. Shadrix + Destiny = 6/9 double strike flying = 12 a turn before any other Aura. [[Spirit Mantle]] (protection from creatures) makes any body unblockable by creatures. [[Kor Spiritdancer]] is +2/+2 per Aura on her.
- **Protection.** [[Shielded by Faith]] (indestructible, re-attaches on any creature ETB), [[Gift of Immortality]] (dies → returns, Aura comes back at end step), [[Flickering Ward]] (protection from the removal colour), [[Teyo, Lightshield Expert]] (flash hexproof + counter), [[Flare of Fortitude]].
- **Verdict.** ✅ Works; it is the line against a single problem player while the drain ticks on the other two.

### Line D — Flickering Ward engine (value, not a kill)
=> {W}: Ward to hand → cast for {W} → Killian goads one creature → Ajani's Chosen Cat → Archon Pegasus → Doomwake −1/−1 to all opposing creatures → Sram / Spiritdancer / Pearl-Ear draw

- Two mana per loop (both costs are coloured {W}; no reducer lowers them). Four loops on eight mana = 4 goads, 4 Cats, 4 Pegasi, a −4/−4 sweep of every opposing creature, 4–12 cards. Not infinite: mana-bound.
- Pearl-Ear draws only when the target is already modified (a token wearing the Ward from Ajani's Chosen is not; Killian with a Breena counter is).
- **Verdict.** ✅ Legal and repeatable; the deck's mid-game engine, the reason Doomwake Giant is in.

### Line E — Winds of Rath / Promise of Loyalty (one-sided wipes)
- Winds of Rath spares every enchanted creature: ours, and the opponents' creatures wearing our Impetus / Contract (trap: they survive, but they are goaded and cannot attack us while Eriette is out). Promise of Loyalty: everyone keeps one creature; the kept ones cannot attack us.
- **Verdict.** ✅ Resets the board around our Auras. Not a win line; the drain finishes.

### Rejected / not a line
- Infinite combos: none in the free pool. No Exquisite Blood / Sanguine Bond in this identity's free cards (both are in Beledros).
- Minthara, Merciless Soul: experience counters need a permanent leaving each turn (Flickering Ward does it); +1/+0 per counter on tokens is real but slow; the model's goldfish rates her flat (v5 = v2 with Minthara for Power Word Kill: Deck Score 27.8 either way). Maybeboard.

## 4. Numbers

| List | Model objective | Deck Score | Sim: table kill by T12 | Eriette by T7 |
|---|---|---|---|---|
| v1 (no tutors, Minthara, Nils, Calligrapher, Commando, Rustler Rampage) | 36.1 | 50.6 | 22 % | 16 % |
| **v2 = final** (+Diabolic Tutor, Mastermind's Acquisition, Murder, Power Word Kill, 37th land) | 17.3 | 27.8 | 35 % | 35 % |
| v3 (v2 + Bender's Waterskin, Prophetic Prism for Changing Loyalty, Secret Rendezvous) | 19.7 | 26.0 | 33 % | 37 % |
| v4 (v2 with Calligrapher + Commando back for the two kill spells) | 13.4 | 27.8 | 33 % | 35 % |
| v5 (v2 with Minthara for Power Word Kill) | 15.3 | 27.8 | 34 % | 36 % |
| Reference: Minthara raid list (second-best report) | 89.9 | 77.5 | — | — |
| Reference: Beledros (sleeved) | 101.0 | 88 | — | — |

The model's goldfish counts creature combat damage and ignores Auras entirely (Eldrazi Conscription adds nothing to its win component), so it cannot rank this archetype; the v1 → v2 drop is one close-turn step of its win component (38 → 10), not the tutors. The sim ranks the tutor lists best on the drain line. Judgment picked v2; numbers recorded per the score-decides rule. **Power level: a precon-plus table deck (bracket 2), goldfish close T12–13.** It does not approach the sleeved decks (Beledros T8–9).

## 5. Mana

37 lands (Karsten wants 39 ± 2 for avg MV 3.1; the deck has 8 cost reducers / rocks: Talisman of Hierarchy, Worn Powerstone, Burnished Hart, Sword of the Animist, Pearl Medallion, Transcendent Envoy, Starfield Mystic, Pearl-Ear). Precon lands kept (11): Isolated Chapel, Shineshadow Snarl, Temple of Silence, Silverquill Campus, Forum of Amity, Umbral Expanse, Sunlit Marsh, Fetid Heath, Desolate Mire, Study Hall, Arcane Lighthouse. Loose lands in: Vault of the Archangel, Forlorn Flats, Secluded Steppe, Riveteers Overlook. Basics 15 Plains / 7 Swamp. The deck is white-heavy (WW on Destiny, Shielded by Faith, Eidolon, Archon, Ajani's Chosen, Winds); black is Impetus ×3, Eriette, Scriv, Doomwake, the kill spells.

Precon lands not available: Caves of Koilos, Eclipsed Steppe, Turbulent Moor (in Tam / Tazri), Command Tower, Exotic Orchard, Fabled Passage, Bojuka Bog, Terramorphic Expanse, Path of Ancestry (in other sleeved decks), War Room (not owned).

## 6. Turn plan

| Turn | Play |
|---|---|
| T1 | Land; Hateful Eidolon / Flickering Ward held |
| T2 | Sram / Kor Spiritdancer / Envoy / Starfield Mystic / Pearl Medallion / Talisman / Ink Duelist |
| T3 | Killian; or Eriette if in hand; or Pearl-Ear |
| T4 | Cheap Auras on the best body (Nighthawk, Tomik, Breena, Killian): Spirit Mantle, Sheltered by Ghosts, Raffine's Guidance, Sentinel's Eyes; first Impetus on the biggest opposing creature |
| T5–T6 | Tutor → Eriette; Shadrix; Ajani's Chosen / Archon; Angelic Destiny; start Flickering Ward loops with spare W |
| T7+ | Super State / Conscription with reducers; Bloodlord; Winds of Rath when behind |

## 7. Keep / mulligan

- **Keep:** 3–4 lands + a 2-drop engine (Sram, Spiritdancer, Envoy, Mystic, Medallion, Ink Duelist) + an Aura. Keep any hand with Eriette or a tutor and 3 lands.
- **Mull:** 2 lands without a rock; 5+ lands; a hand of Auras with no body before T4; a hand whose only spells cost 5+.
- Flickering Ward in the opener is a keep-maker: it is a 1-mana enchantment ETB every turn from T3 with Killian out.

## 8. Traps

- Winds of Rath spares opposing creatures wearing our Impetus / Contracts — they are goaded and cannot attack us (Eriette), but they stay.
- Darksteel Mutation and Redemption Arc on an opposing commander: both count as Auras for Eriette; Redemption Arc's {1}{W} exile is the removal if the goad stops mattering.
- Pearl Medallion reduces white spells only: Impetus (black), Conscription and Super State (colourless) get nothing from it; Ink Duelist reduces anything that targets a creature.
- Changing Loyalty was cut (v2): without sacrifice outlets its death trigger rarely happens.
- Herald of Amity's free Aura must be cast on resolution; without a body to enchant it fizzles — cast Herald with a creature already out (Herald itself is a legal target).
- Eriette's lock stops enchanted creatures from attacking us, not from blocking. Goaded creatures still block.

## 9. Changes vs the stock precon (check page: NEW = loose in, OUT = precon out)

| Out (precon) | In (loose) | Why |
|---|---|---|
| Keen Duelist, Nils, Combat Calligrapher, Firemane Commando, Mangara (Tazri) | Diabolic Tutor, Mastermind's Acquisition, Defiant Bloodlord, Super State, Teyo | one Eriette needs tutors; the two colourless finishers are the table kill; symmetric Duelist out |
| Fallen Ideal, Screams from Within, Intermediate Chirography, Inkshield, Anguished Unmaking (Tam) | Vampire Nighthawk, Night's Whisper, Murder, Power Word Kill, Sheoldred's Edict, Orzhov Charm, Flare of Fortitude | a lifelink flyer to enchant; draw; the removal window (6 → 8) |
| Sol Ring, Arcane Signet, Fellwar Stone, Land Tax (all in other decks) | Pearl Medallion, Worn Powerstone, Burnished Hart, Sword of the Animist, Talisman kept | the free rocks; Medallion hits ~45 white spells |
| Caves of Koilos, Eclipsed Steppe, Turbulent Moor, Command Tower, Exotic Orchard, Fabled Passage, Bojuka Bog, Terramorphic Expanse, Path of Ancestry, War Room | Vault of the Archangel, Forlorn Flats, Secluded Steppe, Riveteers Overlook, +basics | the precon duals in other decks stay there (Tam / Tazri trade whole); 37 lands |
| Defacing Duskmage, Eiganjo Dynastorian | — | not registered: confirm they are in the box (Eiganjo Dynastorian // Replenish — "Return all enchantment cards from your graveyard to the battlefield" — would be the first card in if it is there) |

## 10. Maybeboard

| Card | Note |
|---|---|
| Minthara, Merciless Soul | model flat (v5); in if the operator wants her — for Power Word Kill |
| Combat Calligrapher, Firemane Commando | goad-draw flyers; model flat (v4) |
| Bender's Waterskin, Prophetic Prism | v3; +2 objective, −1.8 Deck Score; sim equal |
| Archfiend of Despair | {6}{B}{B}: doubles every life loss at each end step (order Eriette first) — the fastest drain doubler, 8 mana |
| Eiganjo Dynastorian // Replenish, Defacing Duskmage | precon cards not registered — box check |
| Nils, Discipline Enforcer, Ghostly Prison already in | more pillow if the table punishes us |
| Rustler Rampage | double strike for a Conscription swing; cut for the removal window |
| Changing Loyalty, Secret Rendezvous | cut in v2 / v3 candidates |
