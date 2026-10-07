# Krenko, Mob Boss — pilot guide (Arena Historic Brawl, 1v1, 25 life)

List: `verify-2026-10-08/best-deck/krenko-arena.txt` (100, Arena-importable; Desktop copy `MTG decks/krenko-arena-brawl.txt`). 36 lands, 21 Mountains, 33 of 38 sources make R. Picked on judgment from the 2026-10-08 collection-wide search (the model saturated at 108 ± 0.5 for 14 commanders); its 11 filler swaps were reverted and 17 colourless / off-colour utility lands from the CF seed became Mountains. Oracle quotes are DB text.

## 1. Plan in 3 lines
- Land [[Krenko, Mob Boss]] on turn 4 (turn 3 with a rock) with haste and tap him at once: "{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control." The Goblin count doubles every turn.
- Every token entering is damage with [[Impact Tremors]] (1), [[Purphoros, God of the Forge]] (2), [[General Kreat, the Boltbringer]] (1) or [[Witty Roastmaster]] (1). From 25 life that is two Krenko activations.
- Sacrifice outlets ([[Skirk Prospector]], [[Ashnod's Altar]], [[Goblin Bombardment]]) turn the swarm into mana and damage, and with [[Aggravated Assault]] into unbounded combats.

| # | Win line (most frequent first) | Closer text (DB) |
|---|---|---|
| 1 | Krenko doubling + enter damage | Purphoros: "Whenever another creature you control enters, Purphoros deals 2 damage to each opponent." Tremors: "Whenever a creature you control enters, this enchantment deals 1 damage to each opponent." Six Goblins and Purphoros = 12 on the tap; the next tap is 24. |
| 2 | Hasty alpha | [[Goblin Warchief]]: "Goblins you control have haste." [[Goblin Trashmaster]] +1/+1, [[Banner of Kinship]], [[Goblin Bushwhacker]] kicked, [[You See a Pair of Goblins]] / [[Goblin Surprise]] +2/+0, [[Raid Bombardment]] 1 per attacker with power 2 or less. |
| 3 | Assault loop | Aggravated Assault: "{3}{R}{R}: Untap all creatures you control. After this main phase, there is an additional combat phase followed by an additional main phase." Prospector: "Sacrifice a Goblin: Add {R}." Six Goblins + Krenko + Prospector + Assault = combats until they are dead (§2 row 1). |
| 4 | Machine gun | [[Goblin Sharpshooter]]: "Whenever a creature dies, untap this creature. / {T}: This creature deals 1 damage to any target." + Bombardment: every Goblin is 2 damage. [[Collective Inferno]] on Goblin doubles it. [[Goblin Grenade]] is 5 for one Goblin. |
| 5 | Storm | [[Empty the Warrens]] and [[Grapeshot]] with Prospector / [[Seething Song]] / [[Jeska's Will]] mana; [[Guttersnipe]] adds 2 per spell. |

=> T3 [[Goblin Warchief]] → T4 [[Krenko, Mob Boss]] taps at once (haste) → 2 tokens, [[Impact Tremors]] pings 2 → T5 tap: 4 tokens, attack with 6 hasty Goblins → **T6 tap makes 8, opponent at 25 is dead on the swing**

=> [[Krenko, Mob Boss]] taps for X → sacrifice 5 Goblins to [[Skirk Prospector]] → [[Aggravated Assault]] untaps everything, extra combat and main phase → Krenko taps again, the army doubled → **repeat: 6 Goblins become 7, 9, 13, 21 attackers with haste, every combat**

=> sacrifice a Goblin to [[Goblin Bombardment]] (1 damage) → [[Goblin Sharpshooter]] untaps → tap for 1 more → **2 damage per Goblin, 13 Goblins from 25**

## 2. Engine map
| # | Interaction | Text (DB) | Why it works / caveat |
|---|---|---|---|
| 1 | Prospector + Assault loop | Assault untaps "all creatures you control", so Krenko taps once per main phase and Prospector pays {3}{R}{R} with 5 Goblins | Needs Krenko untapped with at least 6 Goblins including himself: tap for 6, sacrifice 5, net +1 and an extra combat. Tokens attack with haste only through Warchief, [[Howlsquad Heavy]], [[Fervor]] or [[Ogre Battledriver]]. [[Great Train Heist]] (+{2}{R} mode) is a one-shot version. |
| 2 | Howlsquad Heavy at max speed | "Max speed — {T}: Add {R} for each Goblin you control." | Replaces Prospector in the loop without sacrificing anything. Speed rises once per turn an opponent loses life, so it is live four turns after it enters; its combat trigger makes a tapped attacker every turn meanwhile. |
| 3 | Krenko with haste | Warchief, Heavy ("Other Goblins"), [[Lightning Greaves]] (equip {0}), [[Swiftfoot Boots]], Fervor, [[Goblin Motivator]], [[Torch Courier]], [[Expedite]], Battledriver, Bushwhacker | Ten haste sources: never cast Krenko without one unless the opponent is tapped out. Greaves shroud also stops your own Expedite and Motivator. |
| 4 | [[Roaming Throne]] on Goblin | "If a triggered ability of another creature you control of the chosen type triggers, it triggers an additional time." | Doubles Kreat's token and ping, [[Goblin Instigator]], [[Goblin Matron]], [[Volley Veteran]], [[Searslicer Goblin]]. Krenko's ability is activated: Throne does nothing for it. |
| 5 | [[Hexing Squelcher]] | "Spells you control can't be countered. / Other creatures you control have 'Ward—Pay 2 life.'" | Blue decks must pay 2 life to target Krenko. [[Cavern of Souls]] on Goblin makes Krenko uncounterable too. |
| 6 | [[Goblin Matron]] / [[Gamble]] / [[Goblin Engineer]] | Matron tutors a Goblin card; Engineer puts an artifact in the graveyard and returns MV ≤ 3 | Matron finds Warchief, Prospector, Sharpshooter or Squelcher. Engineer: Greaves, Boots, Bombardment is not an artifact. Gamble with a full hand of tokens-to-be is safe; with two cards it is a coin flip. |
| 7 | [[Blasphemous Act]] | "costs {1} less to cast for each creature on the battlefield" | Costs {R} on a full board, yours included. Sacrifice everything to Prospector, Altar or Bombardment in response to your own Act or theirs: mana, damage, no card lost. |
| 8 | Redirects | [[Redirect Lightning]], [[Untimely Malfunction]], [[Return the Favor]] ("Change the target of target spell or ability with a single target") | Point the removal at their creature or at a token. Return the Favor's copy mode copies Krenko's activation: X tokens twice. |
| 9 | [[The One Ring]] | "{T}: Put a burden counter on The One Ring, then draw a card for each burden counter" | Refill after a wipe; the protection turn buys the recast of Krenko. |
| 10 | [[Valakut, the Molten Pinnacle]] | "Whenever a Mountain you control enters, if you control at least five other Mountains, Valakut deals 3 damage to any target." | 21 Mountains: live from turn 6 onward, 3 per land drop. |

**Does NOT work the way it looks**
- ❌ [[Goblin Bombardment]] is not a Goblin and not an artifact: Collective Inferno (Goblin) and Goblin Engineer ignore it. Inferno doubles Sharpshooter, Grenade (a sorcery, not a Goblin: no), Volley Veteran and combat damage from Goblins only.
- ❌ [[Krenko's Command]] and [[Dragon Fodder]] tokens are Goblins; [[Stadium Headliner]]'s mobilize token is a Warrior, Sokenzan's channel tokens are Spirits.
- ⚠️ [[Raid Bombardment]] counts power 2 or less: Trashmaster's +1/+1 keeps tokens at 2, Banner of Kinship with 3+ counters switches it off.
- ⚠️ [[Lightning Greaves]] on Krenko means your own Torch Courier, Motivator and Expedite cannot target him either. Equip Greaves to Krenko, Boots to Warchief.
- ⚠️ [[Tibalt's Trickery]] gives them a free random spell. Use it only on a wipe or a counterspell aimed at Krenko.

## 3. Turn by turn
| Turn | Ideal | Realistic |
|---|---|---|
| T1 | Mountain, [[Skirk Prospector]] or [[Fanatical Firebrand]] | [[Reckless Lackey]], [[Torch Courier]], [[Goblin Motivator]] |
| T2 | [[Lightning Greaves]] or [[Arcane Signet]] | [[Goblin Instigator]], [[Dragon Fodder]], [[Impact Tremors]] |
| T3 | [[Goblin Warchief]] | [[Goblin Matron]] for Warchief, or **Krenko** off a rock with Greaves ready |
| T4 | **Krenko**, equip Greaves, tap: 2–4 tokens | **Krenko** + Warchief haste, tap |
| T5 | [[Purphoros, God of the Forge]], tap Krenko: 8+ damage, attack | Tap Krenko, hold [[Lightning Bolt]] / [[Abrade]] for a blocker or [[Redirect Lightning]] for removal |
| T6 | Tap again: lethal through Tremors / Purphoros or the swing | [[Aggravated Assault]] or [[Blasphemous Act]] depending on who is ahead |

## 4. Mulligan (Arena best-of-one, London mulligan)
Keep 2–4 lands with a haste source or a 1–2 drop Goblin. Krenko is the plan; the hand only needs to reach turn 4 with mana and haste.

| Keep | Why |
|---|---|
| Mountain, Mountain, [[Great Furnace]], [[Skirk Prospector]], [[Goblin Warchief]], [[Lightning Greaves]], [[Impact Tremors]] | Krenko T4 with haste twice over, a payoff down |
| Mountain, [[Command Tower]], [[Arcane Signet]], [[Goblin Instigator]], [[Purphoros, God of the Forge]], [[Dragon Fodder]], [[Lightning Bolt]] | Krenko T3 off the Signet, Purphoros T4, Bolt for their blocker |
| Mountain, Mountain, Mountain, [[Goblin Matron]], [[Krenko's Command]], [[Swiftfoot Boots]], [[Expedite]] | Matron fetches Warchief; Boots and Expedite both give Krenko haste |

| Mulligan | Why |
|---|---|
| Mountain, [[Blasphemous Act]], [[Aggravated Assault]], [[Banner of Kinship]], [[Roaming Throne]], [[Boneclub Berserker]], [[The One Ring]] | 1 land, nothing before turn 4 |
| [[Rogue's Passage]], [[Buried Ruin]], [[Ash Barrens]], [[Hidden Volcano]], [[Scalding Tarn]], [[Tibalt's Trickery]], [[Seething Song]] | 5 lands, two colourless, no Goblin |
| Mountain, Mountain, [[Empty the Warrens]], [[Grapeshot]], [[Guttersnipe]], [[Thrill of Possibility]], [[Tormenting Voice]] | The storm half without the army; Krenko arrives with no haste and no payoff |

## 5. How to play each turn
- **Before casting Krenko:** have haste on the table (Warchief, Fervor, Heavy) or Greaves / Boots in play with {0} / {1} spare. If the opponent holds up mana and you have Squelcher or Cavern, cast him through it.
- **Tap Krenko every main phase, before combat.** The tokens have haste with Warchief or Heavy; without haste they still trigger Tremors, Purphoros, Kreat and Roastmaster.
- **Removal pointed at Krenko:** Redirect Lightning, Untimely Malfunction or Return the Favor onto a token. If it resolves anyway, sacrifice Goblins to Prospector first and recast him next turn: the tax is {2} more each time, so keep Prospector mana.
- **Wipe coming (they pass with 5+ mana open, or you see red/white):** keep Krenko back and spread the Goblins between the board and your hand (Fodder, Command, Surprise). Sacrifice everything to Bombardment / Altar in response.
- **Blocking:** 1/1 Goblins chump; Trashmaster, Boneclub Berserker ("+2/+0 for each other Goblin") and Volley Veteran kill real creatures. Sharpshooter pings X/1s.
- **Counting lethal:** opponent's life ÷ (Goblins you will make this turn) tells you whether Tremors + Purphoros alone finish it. Purphoros 2 + Tremors 1 + Kreat 1 + Roastmaster 1 = 5 per token at full engine.

## 6. Misplays to avoid
1. Casting Krenko turn 4 into open mana with no haste source: he eats removal before he taps once.
2. Greaves on Krenko, then trying to Expedite or Courier him.
3. Blasphemous Act without sacrificing your own board first.
4. Equipping Boots to a token instead of Warchief or Krenko.
5. Casting Empty the Warrens or Grapeshot as the first spell of the turn.
6. Forgetting Howlsquad Heavy's combat-step token must attack ("That token attacks this combat if able").
7. Choosing a type other than Goblin for Cavern, Unclaimed Territory, Roaming Throne, Collective Inferno, Banner of Kinship, Dawn-Blessed Pennant.
8. Activating Aggravated Assault with Krenko tapped: the untap is the point, tap him first in the main phase, then Assault.

## 7. Weak spots and how to play around them
| Threat | Why it hurts | Play-around |
|---|---|---|
| Spot removal on Krenko | The deck's engine is one card | Haste first, Squelcher ward, Greaves / Boots, three redirects; Matron and Gamble refill with Goblins so the recast still has a board |
| Board wipes (-X/-X, damage, exile) | 1/1 tokens die to everything | Keep half the fodder in hand, sacrifice in response, Krenko back behind a wipe; The One Ring and Looting / Thrill / Voice refill |
| Lifegain / high-toughness blockers | The alpha stalls | Raid Bombardment and Tremors go face regardless; Frenzied Goblin and Untimely Malfunction stop two blockers; Rogue's Passage for Berserker |
| Counterspells | Krenko and Purphoros are the targets | Cavern of Souls, Hexing Squelcher, Tibalt's Trickery on their counter |
| Fast aggro | 1/1 tokens trade poorly early | Volley Veteran, Bolt, Abrade, Sharpshooter; Trashmaster turns tokens into 2/2 blockers |
