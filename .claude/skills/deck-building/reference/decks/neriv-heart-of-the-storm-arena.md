# Neriv, Heart of the Storm — Arena Historic Brawl pilot guide

List: `verify-2026-10-08/best-deck/neriv/neriv-arena.txt` (Arena import "Neriv Mardu v1"). 1v1, 25 life.
Built from the model's #2 Arena list (objective 108.9): 11 role-window fillers reverted to Neriv payoffs,
8 tapped/colourless lands replaced by owned untapped duals. Every change is listed on the check page.

## 1. The plan

[[Neriv, Heart of the Storm]] ({1}{R}{W}{B}, 4/5 flier): *"If a creature you control that entered this turn
would deal damage, it deals twice that much damage instead."* Everything that **enters and hits the same
turn** hits for double: hasty creatures, Mobilize tokens (they enter tapped and attacking), reanimated or
copied creatures given haste, and enter-the-battlefield damage from the creature itself.

- **T1–3:** lands untapped, a rock ([[Arcane Signet]], [[Talisman of Conviction]], [[Talisman of Indulgence]],
  [[Boros Signet]], [[Rakdos Signet]]), a Mobilize body ([[Stadium Headliner]], [[Shock Brigade]], [[Voice of Victory]],
  [[Zurgo's Vanguard]], [[Zurgo Stormrender]], [[Zurgo, Thunder's Decree]]) or a haste source ([[Fervor]], [[Ragavan, Nimble Pilferer]]).
- **T4:** Neriv. From here every attack is a doubled attack.
- **T5–6:** one haste enabler + one big body or one burn creature = 15–25 damage in a turn. Close.
- **Backup:** no Neriv → the deck is a Mardu Mobilize aggro deck with [[Purphoros, God of the Forge]] / [[Warleader's Call]] /
  [[Impact Tremors]] pings and [[Twinflame Tyrant]] as a second doubler.

## 2. Engine map

| Piece | What it does with Neriv | Oracle |
|---|---|---|
| Mobilize creatures (9) | tokens enter tapped and attacking → 2 damage each instead of 1 | "create … tapped and attacking 1/1 red Warrior creature tokens" |
| [[Windcrag Siege]] (Mardu) | every Mobilize trigger fires twice → twice the tokens | "If a creature attacking causes a triggered ability … to trigger, that ability triggers an additional time" |
| [[Fervor]], [[Tannuk, Steadfast Second]], [[Ogre Battledriver]], [[Enduring Courage]], [[Zariel, Archduke of Avernus]] +1, [[Lightning Greaves]], [[Swiftfoot Boots]], [[Arena of Glory]] | haste = the fresh creature attacks the turn it enters → doubled | Battledriver / Courage also give +2/+0 |
| [[Twinflame Tyrant]] | second doubler on damage to the opponent → ×4 | "deals double that damage instead" |
| [[Raphael, the Nightwatcher]] | attacking creatures have double strike → two doubled hits | "Attacking creatures you control have double strike" |
| [[Purphoros, God of the Forge]], [[Warleader's Call]], [[Impact Tremors]], [[General Kreat, the Boltbringer]] | ping per creature entering — every Mobilize token, every Chandra elemental | Purphoros 2, the others 1; Twinflame doubles these too (Neriv does not: the source is not a creature that entered) |
| [[Terror of the Peaks]] | damage equal to each entering creature's power | doubled by Neriv only on the turn Terror itself entered |
| [[Fear of Burning Alive]], [[Sonic Shrieker]], [[Scourge of Valkas]] | enter-the-battlefield damage by the creature itself → doubled (8 / 4 / 2X) | [[Panharmonicon]] makes each trigger twice |
| [[Aurelia, the Warleader]], [[Aggravated Assault]], [[Raph & Leo, Sibling Rivals]], [[Fear of Missing Out]] (delirium), [[Great Train Heist]] | extra combat: creatures that entered this turn still count as entered → doubled again | Goldspan Treasures pay for Assault |
| [[Mardu Siegebreaker]], [[Devastating Onslaught]], [[Push // Pull]], [[Reanimate]], [[Gut, True Soul Zealot]], [[Leonin Warleader]], [[Chandra, Acolyte of Flame]] | bodies that enter attacking or with haste on the turn they arrive | Siegebreaker's copies and Gut's 4/1 Skeleton enter tapped and attacking |
| [[Hardened Tactician]], [[Village Rites]], [[Professional Face-Breaker]], [[Night's Whisper]], [[Big Score]], [[Jeska's Will]] | cards: sacrifice the end-step tokens for draws, Treasures off combat damage | Tactician: "{1}, Sacrifice a token: Draw a card" |

## 3. Win lines

**Line A — Mobilize alpha (T5–6, the common kill).**
=> [[Neriv, Heart of the Storm]] in play → attack with [[Zurgo, Thunder's Decree]] + [[Dalkovan Packbeasts]] + [[Voice of Victory]] → 7 Warrior tokens enter tapped and attacking → each deals 2 → 14 from tokens + the attackers → [[Warleader's Call]] pings 7 → 21+
With [[Windcrag Siege]] (Mardu) the tokens double to 14 → 28 from tokens alone. Opponent at 25.

**Line B — haste bomb (T5–7).**
=> [[Fervor]] or [[Tannuk, Steadfast Second]] out → cast [[Goldspan Dragon]] → attacks for 4 flying → Neriv doubles to 8 → Treasure → next turn [[Aurelia, the Warleader]] with haste: 3 power ×2 = 6, untap, second combat 6 more → 12 from Aurelia alone
[[Ogre Battledriver]] / [[Enduring Courage]] add +2/+0 and haste to every creature that enters: a 4-drop hits for (4+2)×2 = 12.

**Line C — burn out (any turn with 6 mana).**
=> [[Fear of Burning Alive]] enters → 4 damage to the opponent → Neriv: 8 → with [[Twinflame Tyrant]]: 16 → with [[Panharmonicon]]: two triggers → 32
[[Sonic Shrieker]] = 4 (8 with Tyrant); [[Scourge of Valkas]] with 2 Dragons = 4 → 8. [[Boros Charm]] to the face is 4 → 8 under Tyrant (not Neriv: Charm is not a creature).

**Line D — double strike stack (one-shot).**
=> [[Raphael, the Nightwatcher]] in play → a fresh hasty 4-power attacker → first-strike damage 4×2 = 8 → regular damage 8 → 16 from one creature → [[Twinflame Tyrant]]: 32
[[Boros Charm]] mode 3 or [[Legion Leadership // Legion Stronghold]] (double power + first strike) does the same for one creature at instant/sorcery speed.

**Line E — graveyard to face.**
=> [[Push // Pull]] (Pull, 6 mana) → two creatures return with haste → both entered this turn → [[Terror of the Peaks]] + [[Fear of Burning Alive]] back: 8 burn + attacks doubled
[[Reanimate]] T2 on a milled/discarded fatty (via [[Fear of Missing Out]], [[Big Score]]) then haste from Fervor.

## 4. Turn plan

| Turn | Do | Why |
|---|---|---|
| 1 | untapped land ([[Blood Crypt]] / [[Sacred Foundry]] / [[Godless Shrine]] paying 2 if you have a 1-drop), [[Ragavan, Nimble Pilferer]] or [[Stadium Headliner]] | early Mobilize body |
| 2 | rock or 2-drop Mobilize ([[Shock Brigade]], [[Voice of Victory]]); [[Fear of Missing Out]] rummages | ramp to Neriv on 4 |
| 3 | [[Fervor]] / [[Zurgo Stormrender]] / [[Zurgo, Thunder's Decree]] / [[War Effort]]; attack with Mobilize bodies | start the token stream |
| 4 | **Neriv**; attack only if the attackers survive blocks (Neriv has no haste — the doubling starts next combat) | protect the engine turn |
| 5+ | haste enabler + body, or [[Fear of Burning Alive]]; hold [[Boros Charm]] / [[Teferi's Protection]] for the wipe | close by T7 |

## 5. Mulligan

**Keep:** 3–4 lands making at least two colours, one 2–3 drop, one of (haste source, Mobilize creature, rock). Neriv is always available, so a hand that casts Neriv T4 and attacks T5 is a keep.
**Mull:** 1–2 lands; 5+ lands with no 2–3 drop; all 5-drops; a hand whose only red source is [[Arena of Glory]] (enters tapped without a Mountain).

Example keep: [[Sacred Foundry]], [[Shattered Sanctum]], Mountain, [[Talisman of Indulgence]], [[Voice of Victory]], [[Ogre Battledriver]], [[Terminate]].
Example mull: [[Savai Triome]], [[Nomad Outpost]], [[Aurelia, the Warleader]], [[Scourge of Valkas]], [[Fear of Burning Alive]], [[Panharmonicon]], [[Blasphemous Act]].

## 6. Pilot rules

1. Neriv doubles only creatures that **entered this turn**. Neriv himself doubles nothing of his own after his first turn; a creature that stayed from last turn hits for normal damage.
2. Tokens created "tapped and attacking" entered this turn → doubled. Sacrifice them at end step with [[Hardened Tactician]] / [[Village Rites]] / [[Gut, True Soul Zealot]] before Mobilize cleans them up.
3. [[Purphoros, God of the Forge]], [[Warleader's Call]], [[Impact Tremors]] damage is dealt by the enchantment, not a creature: Neriv does not double it, [[Twinflame Tyrant]] does.
4. [[Terror of the Peaks]]: cast it the turn you also drop other creatures — its own damage is doubled only on its entry turn.
5. Extra combats keep the "entered this turn" status: with [[Aurelia, the Warleader]] or [[Aggravated Assault]] every fresh attacker is doubled in both combats.
6. [[Windcrag Siege]]: always choose **Mardu** (attack triggers twice). Jeskai is a draw mode this deck does not want.
7. [[Blasphemous Act]] kills your own tokens and Neriv (5 toughness): cast it only when behind, ideally the turn before a hasty rebuild.
8. [[Teferi's Protection]] answers a wipe or a lethal swing back; [[Boros Charm]] mode 2 (indestructible) answers damage wipes only.
9. [[Mardu Siegebreaker]]: exile your best enter-the-battlefield creature ([[Fear of Burning Alive]], [[Sonic Shrieker]]); every attack makes a tapped-and-attacking copy that enters this turn → doubled and the ETB fires again.
10. Fetch order: [[Fabled Passage]] after the fourth land (untapped); shocks pay 2 life only when the mana is used that turn.

## 7. Threats

- **Board wipes** ([[Sunfall]], [[Depopulate]], [[Blasphemous Act]]): keep one Mobilize creature and a haste enabler in hand; rebuild hits as hard as the first wave.
- **Removal on Neriv:** the deck functions without him (Mobilize + pings); recast when the attack is already lethal-adjacent, not on an empty board.
- **Lifegain / big blockers:** go over with fliers ([[Goldspan Dragon]], [[Aurelia, the Warleader]], Neriv) and burn (Line C); [[Terminate]] / [[Swords to Plowshares]] / [[Path to Exile]] the one blocker that matters.
- **Counterspells:** [[Voice of Victory]] ("Your opponents can't cast spells during your turn") turns them off for the whole turn — lead with it before the haste bomb.
