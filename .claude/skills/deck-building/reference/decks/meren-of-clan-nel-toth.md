# Meren of Clan Nel Toth — pilot guide (paper, 4-player pod, 40 life)

List: `decks/paper/decks/meren-of-clan-nel-toth.txt` (100). 35 lands + Revitalizing Repast MDFC. Ramp: Sol Ring, Arcane Signet, Talisman, Llanowar Elves, Elvish Mystic, Sakura-Tribe Elder, Springbloom Druid, Solemn. Oracle from the DB. Rulings: Scryfall API, CR at https://yawgatog.com/resources/magic-rules/.

## 1. Plan in 3 lines
- Feed sacrifice outlets with fodder (tokens and ETB creatures). Every death is an experience counter plus a drain.
- Meren: "At the beginning of your end step, choose target creature card in your graveyard. If that card's mana value is less than or equal to the number of experience counters you have, return it to the battlefield. Otherwise, put it into your hand." That is one creature back every turn.
- Close with drain attrition, Gray Merchant loops, or the two-card Spawn loop.

| # | Win line (most frequent first) | Closer text (DB) |
|---|---|---|
| 1 | Aristocrat attrition | Zulaport Cutthroat: "Whenever this creature or another creature you control dies, each opponent loses 1 life and you gain 1 life." · Cauldron of Essence: "Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life." · Blood Artist: "target player loses 1 life" · Syr Konrad: "Whenever another creature dies, or a creature card is put into a graveyard from anywhere other than the battlefield, or a creature card leaves your graveyard, Syr Konrad deals 1 damage to each opponent." |
| 2 | Gray Merchant recursion | "When this creature enters, each opponent loses X life, where X is your devotion to black." Re-buy it with Meren (MV 5), Saw in Half, Mikaeus undying (it is a Zombie), Junji, Reanimate, Victimize. |
| 3 | Spawn loop (unbounded) | Basking Broodscale + Long Feng or Mazirek (§2, rows 1–2). The deaths kill through line 1. With Mazirek, Jarad also kills: "{1}{B}{G}, Sacrifice another creature: Each opponent loses life equal to the sacrificed creature's power." |
| 4 | Edict lock | Butcher of Malakir: "Whenever this creature or another creature you control dies, each opponent sacrifices a creature of their choice." · Massacre Wurm: "Whenever a creature an opponent controls dies, that player loses 2 life." · Braids, Cabal Minion every upkeep. |

## 2. Engine map
| # | Interaction | Text (DB) | Why it works / caveat |
|---|---|---|---|
| 1 | Broodscale + Long Feng = loop | Broodscale: "Whenever one or more +1/+1 counters are put on this creature, you may create a 0/1 colorless Eldrazi Spawn creature token with 'Sacrifice this token: Add {C}.'" Long Feng: "Whenever another creature you control or a land you control is put into a graveyard from the battlefield, put a +1/+1 counter on target creature you control." | The Spawn is its own free outlet. A token reaches the graveyard before it ceases to exist (CR 111.7), so Long Feng triggers. Each pass: +{C}, one death, one experience counter. The "may" lets you stop. To start: any death or land (Fabled Passage, Sakura-Tribe Elder), Repast's counter, or Adapt ({1}{G}). |
| 2 | Broodscale + Mazirek = loop | Mazirek: "Whenever a player sacrifices another permanent, put a +1/+1 counter on each creature you control." | Sacrificing a Spawn counts. Ruling: a sacrifice paid as a cost resolves Mazirek first ([Mazirek rulings](https://api.scryfall.com/cards/940ae3c2-7ac2-412b-afd0-c8b0099bc3aa/rulings)). Output: unbounded counters on your whole team, so Jarad's sacrifice or The Gitrog ("Trample, haste") kills. |
| 3 | Meren threshold in response | Ruling: the count is "the number of experience counters you have as the ability resolves" ([Meren rulings](https://api.scryfall.com/cards/508b1442-bf2c-4ad6-9bcf-bd894e081ab6/rulings)) | With Meren's trigger on the stack, sacrifice fodder to reach the target's MV. Experience belongs to you, so it survives Meren dying. |
| 4 | Braids, Cabal Minion + Ophiomancer | Braids: "At the beginning of each player's upkeep, that player sacrifices an artifact, creature, or land of their choice." Ophiomancer: "At the beginning of each upkeep, if you control no Snakes, create a 1/1 black Snake creature token with deathtouch." | The Snake made in the last opponent's upkeep pays your Braids tax. Opponents pay with real permanents. Other fodder: Jadar's decayed Zombie, the Creakwood Liege Worm, Woe Strider's Goat. |
| 5 | Saw in Half on your own value creature | "Destroy target creature. If that creature dies this way, its controller creates two tokens that are copies of that creature, except their power is half that creature's power and their toughness is half that creature's toughness. Round up each time." | On Gray Merchant: two ETB drains, and the copies keep {3}{B}{B}, so devotion rises (copiable values, CR 707.2). On Chupacabra or Plaguecrafter: two more removal ETBs. It is also a death (experience counter). |
| 6 | Mikaeus undying | "Other non-Human creatures you control get +1/+1 and have undying." | Loops Chupacabra, Gray Merchant, Accursed Marauder, Woe Strider, Solemn, Butcher, Blood Artist and Viscera Seer once each through a free outlet. |
| 7 | Free tutors | Emeritus of Woe: "if two or more creatures died this turn, this creature becomes prepared" → Demonic Tutor copy. Grave Researcher: "if there are three or more creature cards in your graveyard, this creature becomes prepared" → Reanimate copy. | Both re-prepare after Meren returns them. Tutor targets: Broodscale / Long Feng / Mazirek, Zulaport. |
| 8 | Chthonian Nightmare | "Pay X {E}, Sacrifice a creature, Return this enchantment to its owner's hand: Return target creature card with mana value X" | Each cast gives "{E}{E}{E}". Recast it to bank energy. The sacrifice is also an experience counter. It needs a target to activate ([rulings](https://api.scryfall.com/cards/ce5dd2c1-b6e0-4914-b5c9-7dd451c29e22/rulings)). |
| 9 | Culling Ritual + Golgari Charm | Culling: "Destroy each nonland permanent with mana value 2 or less. Add {B} or {G} for each permanent destroyed this way." Charm: "Regenerate each creature you control." | Regeneration protects your creatures only, not Sol Ring, Signet, Talisman, Greaves or Chthonian Nightmare. A regenerated creature is not destroyed, so it adds no mana and triggers no drain. |

**Does NOT work the way it looks**
- ❌ **Braids, Arisen Nightmare or Jadar + Meren in the same end step.** Meren's target is chosen when the trigger goes on the stack (CR 603.3d → 601.2c), before Braids resolves. The creature Braids sacrifices cannot be returned until next turn.
- ❌ **Mikaeus gives no undying to Humans:** Meren, Plaguecrafter, Priest, Zulaport, Eternal Witness, Ophiomancer, Haruspex, Opportunist, Syr Konrad, Jadar, Long Feng, Braids CM.
  - Tokens cannot come back (CR 111.7).
  - A creature with a +1/+1 counter does not return (CR 702.93a "if it had no +1/+1 counters on it"). Long Feng, Mazirek and Repast counters therefore switch undying off.
- ⚠️ **Lightning Greaves "shroud" blocks your own targeting.** Long Feng and Repast cannot target a creature wearing Greaves. Move Greaves (Equip {0}) off Broodscale before you loop.
- ⚠️ **Mandatory draws during the loop.** Liliana ("Whenever a creature you control dies, draw a card.") and Moldervine ("you gain 1 life and draw a card") draw on every Spawn death.
  - Blood Artist alone needs 120 deaths, which decks you.
  - Kill with "each opponent" payoffs instead (Zulaport, Cauldron, Konrad: 40 deaths) or with Jarad/Butcher.
- ⚠️ **Some draw engines ignore tokens:** Grim Haruspex and Midnight Reaper say "nontoken". Morbid Opportunist "triggers only once each turn".
- ⚠️ **Victimize:** "The creature you sacrifice isn't chosen until Victimize resolves", so it can't be one of the two targets ([rulings](https://api.scryfall.com/cards/ee008d81-df28-49a8-917d-44f66527e469/rulings)).

## 3. Turn by turn
| Turn | Ideal (combo draw) | Realistic (average hand) |
|---|---|---|
| T1 | Swamp, Llanowar Elves | Tapped dual (Temple, Thicket), or Swamp + Viscera Seer |
| T2 | Woodland Cemetery, Basking Broodscale + Viscera Seer | Arcane Signet / Talisman, or Sakura-Tribe Elder |
| T3 | Land, **Meren** | Ophiomancer / Plaguecrafter / Blood Artist + outlet |
| T4 | Land, Long Feng + Zulaport; sacrifice Seer to itself → loop → 40 drains each | **Meren** with an outlet and fodder already down; end step returns your best creature card to hand |
| T5 | — | Second payoff (Cauldron, Midnight Reaper, Grave Researcher); edicts each turn via Plaguecrafter/Marauder recursion |
| T6 | — | Experience ≥ 3–5: Meren returns Chupacabra / Gray Merchant to the battlefield every end step; tutor for the loop with Emeritus |

## 4. Mulligan
Keep: 3–4 lands (or 2 + Sol Ring/dork) that make both colours, plus one cheap play. You want an outlet, fodder, or the combo. Meren costs 4 in the command zone: you need turns 1–3 covered, not the top end.

| Keep | Why |
|---|---|
| Swamp, Woodland Cemetery, Forest, Llanowar Elves, Viscera Seer, Blood Artist, Deadly Dispute | Meren on T3 with an outlet and a payoff down; Dispute refuels |
| Swamp, Swamp, Blooming Marsh, Sol Ring, Basking Broodscale, Long Feng, Infernal Grasp | Two-card loop by T3; Marsh provides the G; Grasp protects |
| Command Tower, Swamp, Myriad Landscape, Sakura-Tribe Elder, Plaguecrafter, Village Rites, Midnight Reaper | Ramp into Meren T4; Elder and Plaguecrafter are fodder that Meren rebuys |

| Mulligan | Why |
|---|---|
| Swamp, Forest, Gray Merchant, Massacre Wurm, Rune-Scarred Demon, Butcher of Malakir, Toxic Deluge | 2 lands, everything costs 5+; no play before T5 |
| Swamp, Forest, Bojuka Bog, Temple of Malady, Grim Backwoods, High Market, Toxic Deluge | 6 lands (2 colourless-only), one reactive spell |
| Llanowar Elves, Elvish Mystic, Swamp, Victimize, Reanimate, Chthonian Nightmare, Saw in Half | 1 land; every spell needs a full graveyard or a board |

## 5. Lines to visualise each turn
- **Before casting Meren:** have an outlet down (Seer, Carrion Feeder, Woe Strider, Yahenni, High Market). If Meren is answered, sacrifice in response for experience and drains.
- **Hold up:**
  - Veil of Summer ({G}): "Spells you control can't be countered this turn" plus hexproof from blue and black. Hold it on the Meren turn and the combo turn.
  - Infernal Grasp and Assassin's Trophy at instant speed.
  - Priest of Forgotten Gods: "(Activate only as an instant.)".
- **End step, every turn:**
  1. Count experience.
  2. Sacrifice in response to Meren to reach the threshold.
  3. Choose the target. Value order: Gray Merchant (5) > Chupacabra (4) > Plaguecrafter/Marauder (3/2) > fodder.
- **Wipes:**
  - Toxic Deluge ("All creatures get -X/-X until end of turn") only when behind. Before it resolves, sacrifice your board for experience and drains.
  - Undying returns arrive as new objects (CR 400.7) after Deluge or Massacre Wurm's -X/-X.
  - Culling Ritual: count your own MV ≤ 2 rocks and Seer/Artist first.
- **Protect the win turn:** Greaves on Meren or Mazirek (never on Broodscale), Repast for "indestructible until end of turn", Golgari Charm regenerate against a -1/-1 sweep, Yahenni "Sacrifice another creature: Yahenni gains indestructible".
- **Threat cues:**
  - Graveyard hate on the table is your top kill target (Assassin's Trophy, Haywire Mite: "Exile target noncreature artifact or noncreature enchantment").
  - Save Bojuka Bog for an opposing reanimator.
  - Edict-proof boards (tokens) make Braids and Butcher weak; switch to drains.

## 6. Misplays to avoid
1. Casting the loop with Liliana or Moldervine out and only Blood Artist as the payoff. You deck yourself first.
2. Equipping Greaves to Broodscale or Long Feng's target.
3. Expecting Meren to return the creature Braids, Arisen Nightmare sacrificed this end step.
4. Sacrificing Mikaeus targets that have +1/+1 counters, or Humans, and expecting undying.
5. Woe Strider escape ("Exile four other cards from your graveyard"): exile lands and spells, not creature cards Meren needs. Konrad pings for each creature card exiled, but you lose recursion targets.
6. Bojuka Bog: "exile target player's graveyard". Never target yourself by habit.
7. Braids, Cabal Minion with no spare fodder. It hits you on your own upkeep too.
8. Culling Ritual without Golgari Charm while your rocks carry the mana.
9. Picking the hand option when the threshold is one short. Sacrifice in response instead.
10. Saddling The Gitrog ("Saddle 1") with a creature you can't afford to lose. Its draw needs "a creature that saddled it this turn" sacrificed after combat damage.

## 7. Weak spots and how to play around them
| Threat | Why it hurts | Play-around |
|---|---|---|
| Graveyard exile (hate pieces, Bog effects) | Meren, Reanimate, Victimize, Chthonian and Junji all need the yard | Keep combo pieces in hand rather than Buried Alive into open hate; kill hate enchantments/artifacts with Trophy/Mite/Charm |
| Counterspells | Only Veil protects spells | Bait with Gray Merchant/Grave Researcher; cast Meren with Veil up |
| Exile removal on Meren | Tax +2; the death loop stops | Experience is kept, so a recast Meren returns big targets immediately; keep a second engine (Liliana, Moldervine) |
| Fliers and evasive beats | Bloodghast and Carrion Feeder "can't block"; few big blockers | Edict loops (Plaguecrafter, Marauder via Meren), Massacre Wurm, Ophiomancer deathtouch Snakes |
| Fast combo | Interaction is creature-based and sorcery-heavy | Hold Infernal Grasp/Trophy for the combo piece; race with the Spawn loop |
