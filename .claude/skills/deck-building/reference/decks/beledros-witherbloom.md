# Beledros Witherbloom — pilot guide (paper, 4-player pod, 40 life)

List: `verify-2026-10-08/best-deck/beledros-recommended.txt` (100, draft until sleeved). 35 lands + Revitalizing Repast MDFC. Built by the collection-wide search (`scripts/collection-best-deck.ts`, objective 100.8) and hand-adjusted so Tam, Tazri and Bumi give nothing. Oracle quotes are DB text.

## 1. Plan in 3 lines
- [[Beledros Witherbloom]] is a fodder faucet: "At the beginning of each upkeep, create a 1/1 black and green Pest creature token with 'When this token dies, you gain 1 life.'" In a 4-pod that is four Pests per round without spending a card.
- Every Pest death is a drain ([[Zulaport Cutthroat]], [[Blood Artist]], [[Cauldron of Essence]], [[Mirkwood Bats]]) and a life-gain event ([[Dina, Soul Steeper]], [[Vito, Thorn of the Dusk Rose]], [[Sanguine Bond]] turn each gain into more loss).
- Close by attrition, by one [[Gray Merchant of Asphodel]] burst through Vito or Sanguine Bond, or by a pumped alpha strike ([[Thunderfoot Baloth]], [[Blossoming Bogbeast]]). No infinite combo: the deck wins by never running out of deaths.

| # | Win line (most frequent first) | Closer text (DB) |
|---|---|---|
| 1 | Pest attrition | Zulaport: "Whenever this creature or another creature you control dies, each opponent loses 1 life and you gain 1 life." Dina: "Whenever you gain life, each opponent loses 1 life." One Pest death with both out = 3 life from each opponent (Zulaport 1, Dina 1 for the Pest's life, Dina 1 for Zulaport's life). |
| 2 | Gray Merchant burst | "When this creature enters, each opponent loses X life, where X is your devotion to black. You gain life equal to the life lost this way." Vito: "Whenever you gain life, target opponent loses that much life." Rebuy Merchant with [[Cauldron of Essence]], [[Veinwitch Coven]], [[Witch of the Moors]], [[Eternal Witness]] or [[Mikaeus, the Unhallowed]] undying (Merchant is a Zombie). |
| 3 | Pumped alpha | Baloth: "As long as you control your commander, this creature gets +2/+2 and other creatures you control get +2/+2 and have trample." Bogbeast: "Whenever this creature attacks, you gain 2 life. Then creatures you control gain trample and get +X/+X until end of turn, where X is the amount of life you gained this turn." |
| 4 | Edict and wipe grind | [[Priest of Forgotten Gods]] every turn, [[Massacre Wurm]] (one-sided: "Creatures your opponents control get -2/-2" and "that player loses 2 life" per death), [[Deadly Tempest]] with your drains out, [[Liliana, Dreadhorde General]] -4. |

=> [[Beledros Witherbloom]] makes a Pest on every upkeep → sacrifice it to [[Viscera Seer]] or [[Priest of Forgotten Gods]] → [[Zulaport Cutthroat]] drains 1, two life-gain events → [[Dina, Soul Steeper]] drains 2 more → **3 life from each opponent per Pest, 12 per round**

=> [[Gray Merchant of Asphodel]] enters with devotion X → each opponent loses X, you gain 3X → [[Vito, Thorn of the Dusk Rose]] makes one opponent lose 3X → with [[Alhammarret's Archive]] the gain is 6X → **X = 7 kills the Vito target from 40**

=> sacrifice Pests before combat for life → [[Blossoming Bogbeast]] attacks, gains 2, X = life gained this turn → team gets +X/+X and trample → **six Pests at +8/+8 end the table**

## 2. Engine map
| # | Interaction | Text (DB) | Why it works / caveat |
|---|---|---|---|
| 1 | Beledros untap | "Pay 10 life: Untap all lands you control. Activate only once each turn." | A second main phase of mana every turn. Pay it only when a drain refunds it the same turn (Merchant, Priest, Pest sacrifices). Never pay it below 20 with an open board against you. |
| 2 | [[Idol of Oblivion]] draws on every turn | "{T}: Draw a card. Activate only if you created a token this turn." | Beledros makes a Pest on each player's upkeep, so Idol taps on all four turns: 4 cards per round. |
| 3 | [[Mirkwood Bats]] double-dips | "Whenever you create or sacrifice a token, each opponent loses 1 life." | Each upkeep Pest is a drain on creation and again when sacrificed. Treasure from [[Deadly Dispute]] and Insects from [[Scute Swarm]] count too. |
| 4 | [[Mikaeus, the Unhallowed]] | "Other non-Human creatures you control get +1/+1 and have undying." | Pests, Saprolings, Snakes and Worms are non-Human: every token dies twice. Humans get nothing: Zulaport, Priest, Eternal Witness, Morbid Opportunist, Ophiomancer, Witch of the Moors. A creature with a +1/+1 counter does not return (CR 702.93a). |
| 5 | [[Witch of the Moors]] | "At the beginning of your end step, if you gained life this turn, each opponent sacrifices a creature of their choice and you return up to one target creature card from your graveyard to your hand." | One Pest death in your turn switches it on: a table edict plus a rebuy every turn. |
| 6 | [[Veinwitch Coven]] | "Whenever you gain life, you may pay {B}. If you do, return target creature card from your graveyard to your hand." | Every life-gain event is a {B} rebuy. Hold {B} open for Merchant or Blood Artist. |
| 7 | [[Pest Rescuer]] | "If you would gain life, you gain that much life plus 1 instead." | Bigger Vito and Sanguine Bond hits; also a Pest on each upkeep when you have none. |
| 8 | [[Mortality Spear]] | "This spell costs {2} less to cast if you gained life this turn." | Almost always a 2-mana "Destroy target nonland permanent" because a Pest died or Dina triggered. |
| 9 | [[Eccentric Pestfinder]] | "At the beginning of each end step, if you gained life this turn, this creature becomes prepared." | Turn Stones copy: "For each opponent, you create a 1/1 black and green Pest creature token." Three Pests a turn once life is flowing. |
| 10 | [[Braids, Arisen Nightmare]] | "At the beginning of your end step, you may sacrifice an artifact, creature, enchantment, land, or planeswalker. If you do, each opponent may sacrifice a permanent of their choice that shares a card type with it. For each opponent who doesn't, that player loses 2 life and you draw a card." | Sacrifice the upkeep Pest: an opponent either loses a creature or loses 2 and gives you a card. |
| 11 | [[Alhammarret's Archive]] | "If you would gain life, you gain twice that much life instead. / If you would draw a card except the first one you draw in each of your draw steps, draw two cards instead." | Doubles Vito and Sanguine Bond. Also doubles Idol, Moldervine and Liliana draws: count your library in long turns. |
| 12 | [[Ashnod's Altar]] + [[Priest of Forgotten Gods]] | Altar: "Sacrifice a creature: Add {C}{C}." Priest: "{T}, Sacrifice two other creatures: Any number of target players each lose 2 life and sacrifice a creature of their choice. You add {B}{B} and draw a card." | Two Pests = {B}{B}, a card, a table edict and 2 life from each targeted player. Altar turns spare Pests into mana for Beledros' untap turn. |

**Does NOT work the way it looks**
- ❌ [[Deadly Tempest]] hits you too: "Each player loses life equal to the number of creatures they controlled that were destroyed this way." Pests refund 1 each, nontoken creatures do not. Count before casting.
- ❌ [[Lightning Greaves]] shroud stops [[Witch's Clinic]] ("{2}, {T}: Target commander you control gains lifelink") from targeting Beledros. [[Guardian Augmenter]] hexproof does not.
- ❌ [[Toxic Deluge]] life is paid, not gained: no Vito, Dina or Sanguine Bond triggers.
- ⚠️ [[Blood Artist]] says "target player loses 1 life": one opponent, not each. Zulaport and Cauldron are the table drains.
- ⚠️ [[Morbid Opportunist]] "triggers only once each turn"; [[Midnight Reaper]] is "nontoken". Token deaths draw through Moldervine, Liliana and Plumb only.
- ⚠️ Lifegain hate (Erebos, Tainted Remedy) switches off lines 1 and 2 through Dina, Vito and Bond. Zulaport, Cauldron, Bats and Merchant's own loss still work.

## 3. Where the cards come from
Meren is dismantled: 44 of its cards move over, the other 38 become open or backfill the donors below.

| Donor deck | Cards Beledros takes | Backfill for the donor (from Meren's leftovers unless noted) |
|---|---|---|
| Meren of Clan Nel Toth (dismantled) | 37 shared cards + Revitalizing Repast, Festering Thicket, Infernal Grasp, Massacre Wurm, Sakura-Tribe Elder, Veil of Summer, Midnight Reaper | — |
| Loose collection | 38, incl. Beledros, Dina, Vito, Sanguine Bond, Cultivate, Three Visits, Tyvar's Stand | — |
| The Cabbage Merchant (G) | [[Pest Infestation]], [[Idol of Oblivion]], [[Ribtruss Roaster]], [[Kodama's Reach]] | Haywire Mite, Llanowar Elves, Basking Broodscale, Springbloom Druid |
| Imotekh the Stormlord (B) | [[Ashnod's Altar]], [[Skorpekh Lord]], [[Phyrexian Arena]], [[Imp's Mischief]] | Woe Strider, Solemn Simulacrum, Rune-Scarred Demon, Ravenous Chupacabra |
| Gilanra + Alena (GR) | [[Thunderfoot Baloth]] | Domri, Anarch of Bolas (loose; a 2026-10-07 near-tie for that deck) |
| Tam, Tazri, Bumi, Inspirit, Urza | nothing | — |

Substitutes already made so the top decks stay whole: Festering Thicket for Overgrown Tomb, Infernal Grasp for Putrefy, Tyvar's Stand for Heroic Intervention, Massacre Wurm for Final Act, Three Visits for Nature's Lore, Sakura-Tribe Elder for Farseek, Midnight Reaper for Shamanic Revelation, Veil of Summer for Autumn's Veil.

## 4. Turn by turn
| Turn | Ideal | Realistic |
|---|---|---|
| T1 | Swamp, [[Elvish Mystic]] or [[Viscera Seer]] | Tapped dual or [[Witherbloom Campus]] |
| T2 | [[Dina, Soul Steeper]] or [[Blood Artist]] + hold Seer | [[Arcane Signet]] / [[Talisman of Resilience]] / [[Sakura-Tribe Elder]] |
| T3 | [[Vito, Thorn of the Dusk Rose]] or [[Priest of Forgotten Gods]] + [[Ophiomancer]] | [[Cultivate]], [[Kodama's Reach]], [[Three Visits]] |
| T4 | [[Tendershoot Dryad]] or [[Witch of the Moors]] | [[Liliana, Dreadhorde General]] on an empty board, or [[Moldervine Reclamation]] |
| T5 | [[Mikaeus, the Unhallowed]] with 3+ tokens down | [[Gray Merchant of Asphodel]] for value, rebuy later |
| T6–7 | **Beledros** with 7 lands; untap with the Pest drains refunding | **Beledros**; from here every upkeep is a Pest and every end step a Witch or Braids trigger |

Beledros costs 7: the deck runs its own fodder until he lands ([[Ophiomancer]], [[Tendershoot Dryad]], [[Creakwood Liege]], [[Pest Rescuer]], [[Scute Swarm]], Pestfinder). Do not hold the drains waiting for him.

## 5. Mulligan
Keep 3–4 lands (or 2 + Sol Ring/dork) with both colours and one of: a drain, an outlet, a fodder maker. The commander is slow, so the hand must act on T1–T3.

| Keep | Why |
|---|---|
| Swamp, Forest, [[Woodland Cemetery]], [[Elvish Mystic]], [[Zulaport Cutthroat]], [[Viscera Seer]], [[Deadly Dispute]] | Drain + outlet by T2, Dispute refuels |
| Swamp, [[Llanowar Wastes]], [[Sol Ring]], [[Dina, Soul Steeper]], [[Ophiomancer]], [[Mortality Spear]], [[Cultivate]] | Fodder each upkeep, cheap removal, ramp to Beledros T5 |
| Forest, Swamp, [[Command Tower]], [[Arcane Signet]], [[Blood Artist]], [[Pest Rescuer]], [[Kodama's Reach]] | Rescuer makes the Pest Beledros would, two turns early |

| Mulligan | Why |
|---|---|
| Swamp, Forest, [[Gray Merchant of Asphodel]], [[Massacre Wurm]], [[Mikaeus, the Unhallowed]], [[Casualties of War]], [[Deadly Tempest]] | 2 lands, nothing under 5 mana |
| [[Bojuka Bog]], [[High Market]], [[Radiant Fountain]], [[Temple of the False God]], Swamp, [[Toxic Deluge]], [[Beast Within]] | 5 lands, two make no colour, only reactive spells |
| [[Elvish Mystic]], [[Paradise Druid]], Forest, [[Sanguine Bond]], [[Alhammarret's Archive]], [[Vito, Thorn of the Dusk Rose]], [[Plumb the Forbidden]] | 1 land; Bond and Archive do nothing without a board |

## 6. Lines to visualise each turn
- **Upkeep (every player's):** a Pest arrives. Bats drain on creation. Decide at once whether it dies now (Seer/Altar/High Market) or waits for Priest or Braids.
- **Your end step:** Witch of the Moors needs a life-gain event this turn; Pestfinder prepares; Braids sacrifices the Pest.
- **Hold up:** [[Veil of Summer]] on the Merchant or Mikaeus turn; [[Imp's Mischief]] against the removal aimed at Vito or Mikaeus; [[Tyvar's Stand]] and [[Warg Tactics]] mode 2 for a single piece; [[Infernal Grasp]] and [[Assassin's Trophy]] at instant speed.
- **Wipes:** sacrifice the board in response for drains and Mikaeus returns. Massacre Wurm is one-sided: your Pests survive. Deluge kills your Pests too, so cast it with Zulaport or Cauldron out.
- **Beledros untap:** only when the lands untapped are spent the same turn and the life returns the same turn (Merchant, Priest, Pest sacrifices into Dina/Vito).

## 7. Misplays to avoid
1. Casting Deadly Tempest with eight nontoken creatures and 12 life.
2. Equipping Greaves to Beledros and then trying to give him lifelink with Witch's Clinic.
3. Expecting Humans (Zulaport, Priest, Witness, Opportunist, Ophiomancer, Witch) to return from Mikaeus undying.
4. Paying 10 life for the untap with nothing to cast or no drain to refund it.
5. Tapping Idol only in your own turn. Any upkeep Pest unlocks it.
6. Letting Alhammarret's Archive double a long Plumb or Moldervine chain into an empty library.
7. Bojuka Bog "exile target player's graveyard" on yourself with Merchant and Witness in the yard.
8. Killing your own Pests into Blood Artist alone (one opponent) when Zulaport or Cauldron (each opponent) is a turn away.

## 8. Weak spots and how to play around them
| Threat | Why it hurts | Play-around |
|---|---|---|
| Lifegain hate (Erebos, Tainted Remedy, Rampaging Ferocidon) | Dina, Vito and Sanguine Bond go dead | Kill it first: Trophy, Spear, Beast Within, Casualties. Keep draining with Zulaport, Cauldron, Bats, Merchant |
| Exile wipes (Farewell) | No Mikaeus or Cauldron rebuy | Beledros rebuilds four Pests a round; hold Veil for your own wipe turn, not theirs |
| Commander removal / tax | He costs 7 and the untap stops | The deck makes fodder without him; Guardian Augmenter gives hexproof, Greaves gives shroud and haste |
| Fast combo | Interaction is mostly sorcery-speed | Hold Grasp, Trophy, Mischief and Veil; Priest edicts at instant speed |
| Fliers over a Pest wall | Pests are 1/1 ground tokens | Warg Tactics mode 1, Feral Appetite deathtouch, Mikaeus +1/+1, Beledros blocks 4/4 in the air |
