# Beledros Witherbloom — pilot guide (paper, 4-player pod, 40 life)

List: `verify-2026-10-08/best-deck/beledros-recommended.txt` — **FINAL, score-decided 2026-10-08** (climb converged, EDHREC pass found nothing above +0.13; sleeve it as is). 36 lands + Revitalizing Repast MDFC. On the check page every card shows its source deck; click it for the donor backfill and 3 model-scored backups. Built by the collection-wide search (`scripts/collection-best-deck.ts`, objective 100.8) and hand-adjusted so Tam, Tazri and Bumi give nothing. Oracle quotes are DB text.

## 1. Plan in 3 lines
- [[Beledros Witherbloom]] is a fodder faucet: "At the beginning of each upkeep, create a 1/1 black and green Pest creature token with 'When this token dies, you gain 1 life.'" In a 4-pod that is four Pests per round without spending a card.
- Every Pest death is a drain ([[Zulaport Cutthroat]], [[Blood Artist]], [[Cauldron of Essence]], [[Mirkwood Bats]]) and a life-gain event ([[Dina, Soul Steeper]], [[Vito, Thorn of the Dusk Rose]], [[Sanguine Bond]] turn each gain into more loss).
- Close by attrition, by one [[Gray Merchant of Asphodel]] burst through Vito or Sanguine Bond, or by a pumped alpha strike ([[Thunderfoot Baloth]]). No infinite combo: the deck wins by never running out of deaths.

| # | Win line (most frequent first) | Closer text (DB) |
|---|---|---|
| 1 | Pest attrition | Zulaport: "Whenever this creature or another creature you control dies, each opponent loses 1 life and you gain 1 life." Dina: "Whenever you gain life, each opponent loses 1 life." One Pest death with both out = 3 life from each opponent (Zulaport 1, Dina 1 for the Pest's life, Dina 1 for Zulaport's life). |
| 2 | Gray Merchant burst | "When this creature enters, each opponent loses X life, where X is your devotion to black. You gain life equal to the life lost this way." Vito: "Whenever you gain life, target opponent loses that much life." Rebuy Merchant with [[Cauldron of Essence]], [[Veinwitch Coven]], [[Witch of the Moors]], [[Eternal Witness]] or [[Mikaeus, the Unhallowed]] undying (Merchant is a Zombie). |
| 3 | Pumped alpha | Baloth: "As long as you control your commander, this creature gets +2/+2 and other creatures you control get +2/+2 and have trample." Six Pests at 3/3 trample with Beledros out; [[Mikaeus, the Unhallowed]] adds +1/+1 and undying. |
| 4 | Edict and wipe grind | [[Priest of Forgotten Gods]] every turn, [[Massacre Wurm]] (one-sided: "Creatures your opponents control get -2/-2" and "that player loses 2 life" per death), [[Culling Ritual]] with [[Blood Artist]] or [[Zulaport Cutthroat]] out (every small creature on the table dies at once, each one drains, the mana recasts Gray Merchant), [[Liliana, Dreadhorde General]] -4. |

=> [[Beledros Witherbloom]] makes a Pest on every upkeep → sacrifice it to [[Viscera Seer]] or [[Priest of Forgotten Gods]] → [[Zulaport Cutthroat]] drains 1, two life-gain events → [[Dina, Soul Steeper]] drains 2 more → **3 life from each opponent per Pest, 12 per round**

=> [[Gray Merchant of Asphodel]] enters with devotion X → each opponent loses X, you gain 3X → [[Vito, Thorn of the Dusk Rose]] makes one opponent lose 3X (4X on that player with the Merchant's own X) → with [[Sanguine Bond]] out as well it is 7X → **X = 6 is lethal from 40 through both, X = 10 through Vito alone**


## 2. Engine map
| # | Interaction | Text (DB) | Why it works / caveat |
|---|---|---|---|
| 1 | Beledros untap | "Pay 10 life: Untap all lands you control. Activate only once each turn." | A second main phase of mana every turn. Pay it only when a drain refunds it the same turn (Merchant, Priest, Pest sacrifices). Never pay it below 20 with an open board against you. |
| 2 | [[Idol of Oblivion]] draws once per round | "{T}: Draw a card. Activate only if you created a token this turn." | Beledros makes a Pest on each player's upkeep, but Idol untaps only in your untap step: one card per round, not four. Tap it at the first Pest of the round (your upkeep) so removal cannot waste the activation. |
| 3 | [[Mirkwood Bats]] double-dips | "Whenever you create or sacrifice a token, each opponent loses 1 life." | Each upkeep Pest is a drain on creation and again when sacrificed. Treasure from [[Deadly Dispute]] and Insects from [[Scute Swarm]] count too. |
| 4 | [[Mikaeus, the Unhallowed]] | "Other non-Human creatures you control get +1/+1 and have undying." | Pests, Saprolings, Snakes and Worms are non-Human: every token dies twice. Humans get nothing: Zulaport, Priest, Eternal Witness, Morbid Opportunist, Ophiomancer, Witch of the Moors. A creature with a +1/+1 counter does not return (CR 702.93a). |
| 5 | [[Witch of the Moors]] | "At the beginning of your end step, if you gained life this turn, each opponent sacrifices a creature of their choice and you return up to one target creature card from your graveyard to your hand." | One Pest death in your turn switches it on: a table edict plus a rebuy every turn. |
| 6 | [[Veinwitch Coven]] | "Whenever you gain life, you may pay {B}. If you do, return target creature card from your graveyard to your hand." | Every life-gain event is a {B} rebuy. Hold {B} open for Merchant or Blood Artist. |
| 7 | [[Pest Rescuer]] | "If you would gain life, you gain that much life plus 1 instead." | Bigger Vito and Sanguine Bond hits; also a Pest on each upkeep when you have none. |
| 8 | [[Mortality Spear]] | "This spell costs {2} less to cast if you gained life this turn." | Almost always a 2-mana "Destroy target nonland permanent" because a Pest died or Dina triggered. |
| 9 | [[Eccentric Pestfinder]] | "At the beginning of each end step, if you gained life this turn, this creature becomes prepared." | Turn Stones copy: "For each opponent, you create a 1/1 black and green Pest creature token." Three Pests a turn once life is flowing. |
| 10 | [[Braids, Arisen Nightmare]] | "At the beginning of your end step, you may sacrifice an artifact, creature, enchantment, land, or planeswalker. If you do, each opponent may sacrifice a permanent of their choice that shares a card type with it. For each opponent who doesn't, that player loses 2 life and you draw a card." | Sacrifice the upkeep Pest: an opponent either loses a creature or loses 2 and gives you a card. |
| 11 | [[Omnipresence]] | "You may cast spells with mana value less than or equal to the number of creatures you control from your hand without paying their mana costs." | Eight mana once; with eight creatures (Pests count) every spell in hand is free — Gray Merchant, Massacre Wurm, Casualties of War. Operator's pick 2026-10-08 over the unconfirmed Archive; the model scores it flat (−0.03). |
| 12 | [[Ashnod's Altar]] + [[Priest of Forgotten Gods]] | Altar: "Sacrifice a creature: Add {C}{C}." Priest: "{T}, Sacrifice two other creatures: Any number of target players each lose 2 life and sacrifice a creature of their choice. You add {B}{B} and draw a card." | Two Pests = {B}{B}, a card, a table edict and 2 life from each targeted player. Altar turns spare Pests into mana for Beledros' untap turn. |

**Does NOT work the way it looks**
- ❌ [[Culling Ritual]] destroys your own permanents with mana value 2 or less too: Pests, dorks, [[Sol Ring]], Signet, Talisman, [[Blood Artist]], [[Zulaport Cutthroat]], [[Viscera Seer]] (13 of ours). Artist and Zulaport see every simultaneous death including their own (leaves-the-battlefield look-back), so with either on board each creature destroyed drains and the mana recasts [[Gray Merchant of Asphodel]]. Without them it is a self-wipe.
- ⚠️ [[Lightning Greaves]] gives Beledros shroud: your own [[Tyvar's Stand]], [[Feral Appetite]] and [[Vesuva]]/[[Thespian's Stage]] copies cannot target him either; [[Guardian Augmenter]] hexproof lets your spells through.
- ❌ [[Toxic Deluge]] life is paid, not gained: no Vito, Dina or Sanguine Bond triggers.
- ⚠️ [[Blood Artist]] says "target player loses 1 life": one opponent, not each. Zulaport and Cauldron are the table drains.
- ⚠️ [[Morbid Opportunist]] "triggers only once each turn"; [[Midnight Reaper]] is "nontoken". Token deaths draw through Moldervine, Liliana and Village Rites only.
- ⚠️ Lifegain hate (Erebos, Tainted Remedy) switches off lines 1 and 2 through Dina, Vito and Bond. Zulaport, Cauldron, Bats and Merchant's own loss still work.

## 3. Where the cards come from
Meren is dismantled: 44 of its cards move over, the other 38 become open or backfill the donors below.

| Donor deck | Cards Beledros takes | Backfill for the donor (from Meren's leftovers unless noted) |
|---|---|---|
| Meren of Clan Nel Toth (dismantled) | 37 shared cards + Revitalizing Repast, Festering Thicket, Infernal Grasp, Massacre Wurm, Sakura-Tribe Elder, Veil of Summer, Midnight Reaper | — |
| Omo precon box (Tricky Terrain, dismantled 2026-10-07) | [[Yavimaya, Cradle of Growth]], [[Beast Within]], [[Scute Swarm]], [[Vesuva]], [[Thespian's Stage]] | — (the box stays open) |
| Witherbloom Witchcraft precon box (C21, Willowdusk's deck) — the part scanned into ManaBox on 2026-09-08 | [[Blight Mound]], [[Sanguine Bond]], [[Dina, Soul Steeper]], [[Veinwitch Coven]], [[Witherbloom Campus]], [[Mortality Spear]], [[Cultivate]], [[Jungle Hollow]], [[Temple of the False God]] | — |
| Witherbloom Witchcraft precon — ❓ UNCONFIRMED: registered on 2026-09-09 from the Archidekt C21 decklist (`verify-2026-09-09/precon-witherbloom.json`), never scanned; 4 of those 54 cards have already proved missing (Witch's Clinic, Well of Lost Dreams, Tainted Wood, Ob Nixilis Reignited) | [[Golgari Rot Farm]], [[Blighted Woodland]] (Alhammarret's Archive and Deadly Tempest left the list on 2026-10-08) | check the box before sleeving; the check page panel gives 3 scored backups each (either land → a basic, +0.04 / +0.00) |
| Quandrix precon leftovers (Tam build) | [[Temple of the False God]], [[Terramorphic Expanse]], [[Three Visits]], [[Tyvar's Stand]], [[Guardian Augmenter]] | — |
| Loose collection (ManaBox scan 2026-09-08 or a typed batch; printing set on the check page) | the rest, incl. Beledros himself (STX mythic, scanned 2026-09-08 — not a precon card), Vito, Witch of the Moors, Casualties of War, Blooming Marsh | — |
| The Cabbage Merchant (G) | [[Pest Infestation]], [[Idol of Oblivion]], [[Ribtruss Roaster]], [[Kodama's Reach]] | Haywire Mite, Ramunap Excavator (Cabbage already runs Llanowar Elves), Basking Broodscale, Springbloom Druid |
| Imotekh the Stormlord (B) | [[Ashnod's Altar]], [[Skorpekh Lord]], [[Phyrexian Arena]], [[Imp's Mischief]] | Woe Strider, Grim Haruspex (Imotekh already runs Solemn Simulacrum and Syr Konrad), Rune-Scarred Demon, Ravenous Chupacabra |
| Gilanra + Alena (GR) | [[Thunderfoot Baloth]] | Domri, Anarch of Bolas (loose; a 2026-10-07 near-tie for that deck) |
| Tam, Tazri, Bumi, Inspirit, Urza | nothing | — |

Lands 2026-10-08: [[Witch's Clinic]] was a precon-list registration the operator does not have (removed from the collection, like Well of Lost Dreams on 09-26); [[Vesuva]] takes its slot and [[Thespian's Stage]] replaces [[Radiant Fountain]] — the lab scored every owned land within 0.05 in both slots (a tie under the 0.25 bar), so the operator's pick stands. Both copy a dual for colour or an opponent's Coffers/Cradle/Urborg for value. The same 2026-09-09 batch registered Alhammarret's Archive and Deadly Tempest (both swapped out by the operator on 2026-10-08) and Golgari Rot Farm and Blighted Woodland — the two lands stay in the list and are unconfirmed until the Witherbloom box is checked (the check page badges them `WITHERBLOOM ?`).

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

## 5. Mulligan: what to do with a bad hand

Beledros is a 7-drop that makes fodder from the command zone, so the hand only has to do two things: hit land drops to seven and put one drain or outlet on the table by T3. Everything else arrives with the Pests. [[Revitalizing Repast]] counts as a land; [[Sol Ring]], [[Arcane Signet]], [[Talisman of Resilience]], [[Elvish Mystic]], [[Paradise Druid]] count as half a land each.

=> Count lands (3–4 is the window; 2 + a rock on the draw is the floor) → Both colours by T2? (a Swamp and a Forest, a dual, a fetch or Cultivate) → One action by T3? (drain, outlet, fodder maker, ramp spell) → **KEEP** → otherwise **MULL** and bottom from the top of the curve

| Hand | Verdict | What to bottom at 6 | Why |
|---|---|---|---|
| 1 land, any spells | Mull | — | Even with a dork you need two more lands in three draws; the deck has 36 lands + Repast, the odds are against it |
| 2 lands + rock/dork + a 1–2 drop drain or outlet | Keep on the draw, mull on the play | the most expensive card | On the draw two looks at 34 lands in 92 cards find the third land about 60 % of the time; on the play it is 37 % |
| 3–4 lands, both colours, one of Dina / Zulaport / Blood Artist / Seer / Priest / Ophiomancer / Pest Rescuer / a ramp spell | **Keep** | — | This is the deck's hand: the engine starts before Beledros and he adds the fodder |
| 3–4 lands, one colour only, black spells | Mull unless a fetch, Cultivate, Kodama's Reach or Three Visits is in hand | a Forest or a Swamp you cannot use | Dina, Vito, Zulaport and Merchant are black-heavy; a Forest-only hand casts nothing |
| 5–6 lands + 1–2 spells | Keep only if the spells are a drain plus an outlet/engine; otherwise mull | the 6th land | Beledros will supply the fodder; two engine pieces and seven lands is a real game, two random spells is not |
| 3 lands, nothing under 5 mana (Merchant, Wurm, Mikaeus, Casualties, Tempest) | Mull | — | Nothing happens until T5; the table will be ahead |
| Reactive only (Deluge, Beast Within, Veil, Trophy + lands) | Mull at 7; keep at 6 only with 3–4 lands | a second answer | No plan: Beledros alone makes Pests but nothing drains |
| Vito + Sanguine Bond + Archive, no fodder, no outlet | Mull | — | Payoffs without an engine; they do nothing until a Pest dies |
| Any 5-card hand with 2–3 lands and one drain or outlet | Keep | — | At 5 the bar is lands + one action; stop mulling |

**London bottoming order at 6:** (1) the most expensive card that is not an engine piece (Casualties, Tempest, Massacre Wurm before Merchant); (2) the fifth or sixth land; (3) a second protection spell; never a 1–2 mana drain, never the only outlet, never the only green source.

| Keep | Why |
|---|---|
| Swamp, Forest, [[Woodland Cemetery]], [[Elvish Mystic]], [[Zulaport Cutthroat]], [[Viscera Seer]], [[Deadly Dispute]] | Drain + outlet by T2, Dispute refuels |
| Swamp, [[Llanowar Wastes]], [[Sol Ring]], [[Dina, Soul Steeper]], [[Ophiomancer]], [[Mortality Spear]], [[Cultivate]] | Fodder each upkeep, cheap removal, ramp to Beledros T5 |
| Forest, Swamp, [[Command Tower]], [[Arcane Signet]], [[Blood Artist]], [[Pest Rescuer]], [[Kodama's Reach]] | Rescuer makes the Pest Beledros would, two turns early |
| Swamp, Swamp, [[Golgari Rot Farm]], [[Talisman of Resilience]], [[Priest of Forgotten Gods]], [[Tendershoot Dryad]], [[Infernal Grasp]] | Rot Farm is the 4th land; Priest + Dryad is the T4 engine with an answer up |

| Mulligan | Why |
|---|---|
| Swamp, Forest, [[Gray Merchant of Asphodel]], [[Massacre Wurm]], [[Mikaeus, the Unhallowed]], [[Casualties of War]], [[Culling Ritual]] | 2 lands, nothing under 4 mana |
| [[Bojuka Bog]], [[High Market]], [[Thespian's Stage]], [[Temple of the False God]], Swamp, [[Toxic Deluge]], [[Beast Within]] | 5 lands, three make no colour, only reactive spells |
| [[Elvish Mystic]], [[Paradise Druid]], Forest, [[Sanguine Bond]], [[Omnipresence]], [[Vito, Thorn of the Dusk Rose]], [[Village Rites]] | 1 land; Bond and Omnipresence do nothing without a board |
| Forest, Forest, [[Yavimaya, Cradle of Growth]], [[Dina, Soul Steeper]], [[Vito, Thorn of the Dusk Rose]], [[Zulaport Cutthroat]], [[Moldervine Reclamation]] | Three green sources, four black cards; keep only if the 6 has a Swamp or a fetch |

## 6. Piloting for consistency

The deck is consistent because every role has 8+ copies and the commander supplies the fodder. The job of the pilot is to put the pieces down in the right order and to spend life only when it comes back the same turn.

**Priority ladder (what to cast first when the hand offers two things)**
1. Land drop, then mana (dork, rock, ramp spell) until you have four sources — Beledros on T5–6 is worth more than any single drain on T3.
2. A table drain before an outlet: [[Zulaport Cutthroat]], [[Cauldron of Essence]], [[Mirkwood Bats]], then [[Dina, Soul Steeper]]. The first Pest that dies should already count.
3. An outlet before a fodder maker: [[Viscera Seer]], [[Priest of Forgotten Gods]], [[Ashnod's Altar]]. A Pest you cannot kill at instant speed is a 1/1 that dies to a wipe for nothing.
4. Then fodder ([[Ophiomancer]], [[Tendershoot Dryad]], [[Pest Rescuer]], [[Creakwood Liege]]) and draw ([[Moldervine Reclamation]], [[Midnight Reaper]], [[Phyrexian Arena]]).
5. Beledros when seven mana and a drain are on the table; put [[Lightning Greaves]] or [[Guardian Augmenter]] on him the same turn if the table has shown spot removal.
6. [[Mikaeus, the Unhallowed]] and [[Gray Merchant of Asphodel]] last: they are the multipliers, they do nothing on an empty board.

=> Upkeep: a Pest arrives ([[Mirkwood Bats]] drains on creation) → Is [[Priest of Forgotten Gods]] untapped with a second body? → yes: hold both for Priest on your turn (BB, a card, a table edict) → no: is a wipe or an edict threatened? → yes: sacrifice now to [[Viscera Seer]] / [[Ashnod's Altar]] / [[High Market]] → no: keep it as a blocker and feed [[Braids, Arisen Nightmare]] at your end step

**Life is a resource, not a score**
- Pay 10 to Beledros only when (a) the untapped lands are spent this turn and (b) a drain refunds at least half of it this turn. [[Gray Merchant of Asphodel]] and a Priest activation do; a lone Pest sacrifice does not.
- Stay above 20 against an open board with fliers or a combat deck; above 12 against everything else. [[Toxic Deluge]] costs life; [[Culling Ritual]] costs your own small permanents.
- Never tap out below the cost of [[Veil of Summer]] or [[Imp's Mischief]] on the turn you cast Merchant or Mikaeus.

| Removal target | Priority | Answer |
|---|---|---|
| Lifegain hate: Erebos, Tainted Remedy, Rampaging Ferocidon, Knight of Dusk's Shadow | 1 — on sight | [[Assassin's Trophy]], [[Mortality Spear]], [[Beast Within]], [[Casualties of War]] |
| Token hate: Authority of the Consuls, Blind Obedience, Elesh Norn, Torpor Orb-style effects | 2 | Trophy, Spear, [[Binding the Old Gods]] |
| A commander that combos or a planeswalker that ticks up | 3 | [[Infernal Grasp]], Priest edict, [[Liliana, Dreadhorde General]] −4 |
| Big attackers | 4 — only if they point at you | Pests chump; [[Massacre Wurm]], or [[Culling Ritual]] against a wide board of small creatures when the drains are out |

**Closing checklist (count before you commit)**
- Attrition: Pests you can kill this turn × drains per death (Zulaport 1 + Dina 1 + Bats 1 + Cauldron 1 + Dina again for each gain) ≥ the lowest life total → go.
- Merchant: devotion to black X; each opponent loses X, you gain 3X; [[Vito, Thorn of the Dusk Rose]] or [[Sanguine Bond]] sends 3X at one target on top of the Merchant's X; both together 7X. X = 10 is lethal from 40 through one of them, X = 6 through both.
- Alpha: Pests × ([[Thunderfoot Baloth]] +2, [[Mikaeus, the Unhallowed]] +1) with trample; add the Zulaport triggers from blocks.
- Never present lethal into open mana without [[Veil of Summer]] or [[Imp's Mischief]] if a single counter or fog undoes it.

| Role | Count | Cards |
|---|---|---|
| Fodder makers (besides the commander) | 10 | [[Ophiomancer]], [[Tendershoot Dryad]], [[Creakwood Liege]], [[Pest Rescuer]], [[Scute Swarm]], [[Eccentric Pestfinder]], [[Pest Infestation]], [[Blight Mound]], [[Ribtruss Roaster]], [[Liliana, Dreadhorde General]] |
| Sacrifice outlets | 8 | [[Viscera Seer]], [[Priest of Forgotten Gods]], [[Ashnod's Altar]], [[High Market]], [[Braids, Arisen Nightmare]], [[Deadly Dispute]], [[Village Rites]], [[Grim Backwoods]] |
| Drains and lifegain payoffs | 9 | [[Zulaport Cutthroat]], [[Blood Artist]], [[Cauldron of Essence]], [[Mirkwood Bats]], [[Dina, Soul Steeper]], [[Vito, Thorn of the Dusk Rose]], [[Sanguine Bond]], [[Gray Merchant of Asphodel]], [[Massacre Wurm]] |
| Draw on death | 8 | [[Moldervine Reclamation]], [[Midnight Reaper]], [[Morbid Opportunist]], [[Liliana, Dreadhorde General]], [[Priest of Forgotten Gods]], [[Braids, Arisen Nightmare]], [[Village Rites]], [[Deadly Dispute]] |
| Mana | 9 + 36 lands | [[Elvish Mystic]], [[Paradise Druid]], [[Sakura-Tribe Elder]], [[Sol Ring]], [[Arcane Signet]], [[Talisman of Resilience]], [[Cultivate]], [[Kodama's Reach]], [[Three Visits]] |
| Rebuy | 5 | [[Eternal Witness]], [[Veinwitch Coven]], [[Witch of the Moors]], [[Cauldron of Essence]], [[Mikaeus, the Unhallowed]] |
| Protection | 5 | [[Veil of Summer]], [[Tyvar's Stand]], [[Imp's Mischief]], [[Lightning Greaves]], [[Guardian Augmenter]] |

## 7. Lines to visualise each turn
- **Upkeep (every player's):** a Pest arrives. Bats drain on creation. Decide at once whether it dies now (Seer/Altar/High Market) or waits for Priest or Braids.
- **Your end step:** Witch of the Moors needs a life-gain event this turn; Pestfinder prepares; Braids sacrifices the Pest.
- **Hold up:** [[Veil of Summer]] on the Merchant or Mikaeus turn; [[Imp's Mischief]] against the removal aimed at Vito or Mikaeus; [[Tyvar's Stand]] for a single piece; [[Saw in Half]] in response to removal on [[Gray Merchant of Asphodel]] (two Merchants enter: two drains); [[Infernal Grasp]] and [[Assassin's Trophy]] at instant speed.
- **Wipes:** sacrifice the board in response for drains and Mikaeus returns. Massacre Wurm is one-sided: your Pests survive. Deluge kills your Pests too, so cast it with Zulaport or Cauldron out.
- **Beledros untap:** only when the lands untapped are spent the same turn and the life returns the same turn (Merchant, Priest, Pest sacrifices into Dina/Vito).

## 8. Misplays to avoid
1. Casting Culling Ritual with Sol Ring, the Signets and the drain creatures out but no Blood Artist or Zulaport Cutthroat to pay for it.
2. Activating [[Thespian's Stage]] on your own [[Golgari Rot Farm]] with the bounce trigger still on the stack (it returns a land) — copy a dual or an opponent's utility land instead.
3. Expecting Humans (Zulaport, Priest, Witness, Opportunist, Ophiomancer, Witch) to return from Mikaeus undying.
4. Paying 10 life for the untap with nothing to cast or no drain to refund it.
5. Holding Idol untapped "for later": it untaps once per round, so tap it at the first Pest of the round (your upkeep, or an opponent's if you missed it).
6. Casting Omnipresence with fewer than six creatures out: eight mana that frees nothing. Count Pests first.
7. Bojuka Bog "exile target player's graveyard" on yourself with Merchant and Witness in the yard.
8. Killing your own Pests into Blood Artist alone (one opponent) when Zulaport or Cauldron (each opponent) is a turn away.

## 9. Weak spots and how to play around them
| Threat | Why it hurts | Play-around |
|---|---|---|
| Lifegain hate (Erebos, Tainted Remedy, Rampaging Ferocidon) | Dina, Vito and Sanguine Bond go dead | Kill it first: Trophy, Spear, Beast Within, Casualties. Keep draining with Zulaport, Cauldron, Bats, Merchant |
| Exile wipes (Farewell) | No Mikaeus or Cauldron rebuy | Beledros rebuilds four Pests a round; hold Veil for your own wipe turn, not theirs |
| Commander removal / tax | He costs 7 and the untap stops | The deck makes fodder without him; Guardian Augmenter gives hexproof, Greaves gives shroud and haste |
| Fast combo | Interaction is mostly sorcery-speed | Hold Grasp, Trophy, Mischief and Veil; Priest edicts at instant speed |
| Fliers over a Pest wall | Pests are 1/1 ground tokens | Feral Appetite deathtouch, Mikaeus +1/+1, Beledros blocks 4/4 in the air |

## 10. Maybeboard (28 cards, kept in the box) and between-game swaps

All free after Meren is dismantled (Meren leftovers), except where noted. Swaps happen between games, never mid-game. Operator swaps applied 2026-10-08: [[Saw in Half]], [[Culling Ritual]], [[Yahenni, Undying Partisan]], [[Omnipresence]] and [[Village Rites]] are in the list (model −5.08 together at 300 games for the first four, Village Rites −0.03: wipe and removal windows plus free casting, all blind spots); their predecessors sit at the top of the table. **Operator rule (2026-10-08): the model's score decides the final 99; proposed synergies live here until a climb accepts them.** The 2026-10-08 climb (`verify-2026-10-08/best-deck/beledros-climb-2.ndjson`, 1,646 evaluations, converged) rejected every card in the last block and put [[Blooming Marsh]] in the 99 instead.

| Card | In for | When |
|---|---|---|
| [[Warg Tactics]] (model +1.05 back) | [[Saw in Half]] | Only if you want the mode-2 protection back; Saw in Half on your own [[Gray Merchant of Asphodel]] (death trigger plus two Merchants) is the operator's pick. Never Saw on Beledros (command zone = did not die). |
| [[Deadly Tempest]] (❓ unconfirmed; model +3.98 back, its wipe window) | [[Culling Ritual]] | Big-creature tables where nothing of theirs has mana value 2 or less. "Each player loses life equal to the number of creatures they controlled that were destroyed this way" — count your own. |
| [[Golgari Charm]] | [[Tyvar's Stand]] | Rest in Peace / Blind Obedience / Authority of the Consuls tables (mode 2), 1/1 swarms (mode 1 kills our Pests too), destroy-wraths (mode 3 regenerates). |
| [[Argentum Masticore]] (model +2.01 back, its removal window) | [[Yahenni, Undying Partisan]] | Tables with one big threat per turn: a repeatable destroy at upkeep. Yahenni (indestructible sacrifice outlet through wipes) is the operator's pick. |
| [[Butcher of Malakir]] | [[Casualties of War]] | Voltron / hexproof commanders: an edict on every Pest death. |
| [[Plaguecrafter]] | [[Ophiomancer]] | Few-big-creature tables: edict on entry, and a Pest is our sacrifice. |
| [[Jarad, Golgari Lich Lord]] | [[Mirkwood Bats]] | Lifegain tables: sacrifice Gray Merchant or Massacre Wurm for a 5–6 point drain to each opponent, uncounterable at instant speed. |
| [[Syr Konrad, the Grim]] (second copy; the first stays in Imotekh) | [[Witch of the Moors]] | Mill / reanimator tables; also turns [[Culling Ritual]] into a second drain. |
| [[Mazirek, Kraul Death Priest]] | [[Creakwood Liege]] | Slow tables: every Pest sacrificed by anyone puts a counter on the team. |
| [[Victimize]] | [[Revitalizing Repast // Old-Growth Grove]] | Slow tables: Gray Merchant + Massacre Wurm back for one Pest. |
| [[Reanimate]] (2 owned, one in Meren; model-neutral, rejected by the climb) | [[Feral Appetite]] | Any table once something has died: "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card's mana value" — any graveyard, so an opponent's dead fatty too. The deck has no self-mill or discard, so the target must have died first: a wiped Wurm or Merchant back for {B}. |
| [[Plumb the Forbidden]] (model +0.03 back) | [[Village Rites]] | Wide Pest boards with a drain out: sacrifice three Pests, draw three, drain three at instant speed; castable with no creature as a plain cantrip. Village Rites ({B}, one creature, two cards; the sacrifice is mandatory) is the operator's pick 2026-10-08. |
| [[Wight of the Reliquary]] | [[Scute Swarm]] | Any table short on outlets: a fifth sacrifice outlet that fetches [[High Market]] or [[Yavimaya, Cradle of Growth]]. |
| [[Braids, Cabal Minion]] | [[Binding the Old Gods]] | Durdle control tables only; Pests feed her every upkeep, the table hates you for it. |
| [[Massacre Girl, Most Wanted]] (loose, registered 2026-10-08) | [[Pest Rescuer]] | 1v1 or two-player tables: "Whenever another creature or planeswalker you control dies, Massacre Girl deals 1 damage to target opponent and you gain 1 life" — one opponent, not each, so a 5-mana Blood Artist in a pod; every Artist/Dina ping grows her (+1/+1 counter per noncombat damage). Rescuer's upkeep Pest is dead once Beledros is out. |
| [[Alhammarret's Archive]] (❓ unconfirmed; model +0.03 back) | [[Omnipresence]] | Long games: doubles Vito / Bond drains and every non-first draw. Out on 2026-10-08 for Omnipresence (operator). |
| [[Verdant Kraken]] (in Cabbage; needs a backfill there) | [[Ribtruss Roaster]] | Long games: a 3/3 Forest Tentacle land creature on every player's upkeep = fodder plus mana, [[Ashnod's Altar]] makes each one {C}{C}. Costs 7 and competes with Beledros for the turn; Cabbage's Tireless Provisioner and Gingerbread Cabin like it more. |
| [[Blossoming Bogbeast]] (cut by the climb for a land) | [[Blooming Marsh]] | Tables with no removal where the alpha is the plan: attack, gain 2, X = life gained this turn, team +X/+X trample — six Pests at +8/+8 after sacrificing before combat. |
| [[Vilis, Broker of Blood]] (loose, registered 2026-10-08; climb −4.2: a window overflow the model cannot value) | [[Blooming Marsh]] | Beledros "Pay 10 life: Untap all lands you control" + Vilis "Whenever you lose life, draw that many cards" = draw 10 and untap; "{B}, Pay 2 life: -1/-1" on your own Pest is a drain trigger and two cards; [[Alhammarret's Archive]] doubles to 20. Slow tables with a drain to refund the life. |
| [[Meren of Clan Nel Toth]] (loose once her deck is dismantled; model-neutral, rejected) | [[Veinwitch Coven]] | "Whenever another creature you control dies, you get an experience counter" — four Pests a round = four counters; the end step returns Merchant (5) or Wurm (6) from the second end step on. Sacrifice Merchant to Altar in main 2, Meren returns him: a drain every turn. |
| [[Blech, Loafing Pest]] (loose, registered 2026-10-08; model-neutral, rejected) | [[Pest Rescuer]] | "Whenever you gain life, put a +1/+1 counter on each Pest, Bat, Insect, Snake, and Spider you control" — every Pest death grows the swarm. ⚠️ Pests with counters lose Mikaeus undying (CR 702.93a). Alpha tables. |
| [[Harrow]] (registered 2026-10-08; lab +0.11 for Priest, below 0.25) | [[Priest of Forgotten Gods]] | "Sacrifice a land. Search your library for up to two basic land cards, put them onto the battlefield" — both untapped, instant speed: the deck's best tempo ramp. Fast tables. |
| [[Dina, Essence Brewer]] (registered; lab +0.00) | [[Village Rites]] | "Whenever you sacrifice a creature, draw a card. This ability triggers only once each turn" + "{2}, {T}, Sacrifice another creature: You gain X life and put X +1/+1 counters" — a sac outlet that draws once a turn and gains. |
| [[Font of Agonies]] (loose; lab +0.00, model-blind; EDHREC 47x lift) | [[Pest Infestation]] | "Whenever you pay life, put that many blood counters on this enchantment. {1}{B}, Remove four blood counters: Destroy target creature" — one Beledros activation = two removals for {B}. Removal-light tables. |
| [[Arnyn, Deathbloom Botanist]] (loose; lab +0.04) | [[Viscera Seer]] | "Whenever a creature you control with power or toughness 1 or less dies, target opponent loses 2 life and you gain 2 life" — a double Blood Artist for Pests. Drain-race tables. |
| [[Insidious Roots]] (loose, owned; operator proposal 2026-10-08; lab +0.07 for Priest at 300 games, below 0.25) | [[Priest of Forgotten Gods]] | "Creature tokens you control have '{T}: Add one mana of any color.' Whenever one or more creature cards leave your graveyard, create a 0/1 green Plant creature token, then put a +1/+1 counter on each Plant you control." — every Pest becomes a Birds of Paradise and each Victimize / Eternal Witness / Pestfinder rebuy adds a Plant; the model files it as a 13th ramp piece in a full ramp window, so the score is flat. Try it when the table lets you untap with Pests (slow pods). |
| [[Dark Ritual]] (owned, but sleeved in Imotekh; operator proposal 2026-10-08; lab −0.01) | — | "Add {B}{B}{B}." — a turn-2 Beledros or a turn-1 Priest, once. Needs a trade with Imotekh (one copy) and the model sees no gain; the deck already has 9 mana pieces plus Beledros. |
| [[Snakeskin Veil]] (owned ×2, both sleeved: Bumi and Cabbage; operator proposal 2026-10-08; lab 0.00) | [[Tyvar's Stand]] | "Put a +1/+1 counter on target creature you control. It gains hexproof until end of turn." — one mana, but hexproof only. Tyvar's Stand adds indestructible, which is what saves Beledros from the wrath (§9); the score is flat, so Stand stays. |

Not available as maybes: Ramunap Excavator (goes to Cabbage) and Grim Haruspex (goes to Imotekh) are the donor backfills.

**Swap recipes (between games):**

| Table | In | Out |
|---|---|---|
| Wrath-heavy control | Golgari Charm | Tyvar's Stand or Feral Appetite |
| Token / dork swarm | Golgari Charm | Tyvar's Stand |
| Voltron / hexproof commander | Butcher of Malakir, Plaguecrafter | Casualties of War, Ophiomancer |
| Lifegain | Jarad | Mirkwood Bats |
| Graveyard hate (Rest in Peace, Bojuka Bog) | Golgari Charm, Jarad | Mikaeus, the Unhallowed (undying is exile under Rest in Peace), Cauldron of Essence |
| Slow / durdle | Victimize, Reanimate, Mazirek | Revitalizing Repast, Moldervine Reclamation, Creakwood Liege |

## 11. Buy list from the EDHREC pass (2026-10-08)

Full oracle analysis: `verify-2026-10-08/best-deck/beledros-edhrec-analysis.md`. Prices Cardmarket, EDHREC lifegain page (33 decks).

Buy lab (`buy-lab.ts`, `buy-lab.md`): all 138 unowned cards from both EDHREC pages and the CF corpus stats, each tried in every slot of the 99, ownership bypassed. One card clears the 0.25 bar — [[Golgari Signet]] +0.30, and only by replacing the locked [[Ashnod's Altar]], which the model cannot value. Every card below is flat for the model (it does not see lifegain, drain or sacrifice roles); the ranking here is the oracle analysis, the Δ column is the model's view for the record.

| Card | € | Model Δ, best slot (buy lab 2026-10-08, 100 games) | Why |
|---|---|---|---|
| [[Skullclamp]] | 4,30 | +0.01 (Liliana slot) | "Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards. Equip {1}" — a 1/1 Pest dies on equip: draw 2, gain 1, every death trigger, for {1}. |
| [[Exquisite Blood]] | 27,75 | +0.08 (Viscera Seer slot) | "Whenever an opponent loses life, you gain that much life" — infinite with [[Sanguine Bond]] or [[Vito, Thorn of the Dusk Rose]] (both in the 99). [[Bloodthirsty Conqueror]] (25,01) is the same loop on a body. |
| [[Ayara, First of Locthwain]] | 3,62 | +0.03 (Liliana slot) | "Whenever Ayara or another black creature you control enters, each opponent loses 1 life and you gain 1 life. {T}, Sacrifice another black creature: Draw a card" — Pests are black. |
| [[Marauding Blight-Priest]] | 0,11 | +0.05 (Viscera Seer slot) | "Whenever you gain life, each opponent loses 1 life" — a second Dina, Soul Steeper. |
| [[Bastion of Remembrance]] | — | +0.05 (Viscera Seer slot) | "Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life" — Zulaport as an enchantment. |
| [[Prosperous Innkeeper]] | 0,23 | +0.16 (Altar slot) | "Whenever another creature you control enters, you gain 1 life" + a Treasure — every Pest entering drains. |
| [[Savra, Queen of the Golgari]] | 1,53 | +0.09 (Viscera Seer slot) | Pests are black and green: each sacrifice is an edict ("pay 2 life… each other player sacrifices a creature") and "gain 2 life". |
