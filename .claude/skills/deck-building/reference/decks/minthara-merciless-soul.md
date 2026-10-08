# Minthara, Merciless Soul — Orzhov experience aristocrats (paper, 2026-10-08)

List: `verify-2026-10-08/best-deck/second-best/minthara-v2.txt`. The second-strongest paper commander from the second-best report (model objective 89.9 with raids), rebuilt on the operator's rules: Tam gives nothing, the Silverquill Influence precon (SOC, in hand) is gutted for it, its land base first. Swap table: `minthara-v2-swaps.md` (23 swaps vs the model's raid list).

| | Model objective | Deck Score | Raids |
|---|---|---|---|
| Model's raid list | 89.5 | 77.5 | 45 cards from 6 sleeved decks (Tam 10) |
| **v2 (this list)** | 87.4 | 77.5 | 22 (Imotekh 10, Inspirit 7, Tazri 3, Cabbage 1, Bumi 1), Tam 0 |

Deck Score identical; the −2.1 is the role-window penalty (wipes 3 → 2, ramp 12 → 11) plus goldfish noise. Gate: all PASS except paper `arenaNames` and the known `plan` false negative. Sources: 21 precon cards, 42 loose, 22 raided, 14 basics.

## 1. Plan

**Commander.** [[Minthara, Merciless Soul]]: *"At the beginning of your end step, if a permanent you controlled left the battlefield this turn, you get an experience counter. / Creatures you control get +1/+0 for each experience counter you have."* One counter per turn, never more — so the deck needs one permanent to leave every turn, cheaply: a decayed Zombie that attacked, a Treasure, a Goat into Woe Strider, a Cloudshift. Ward X keeps her on the table once the counters pile up.

**Primary — aristocrats drain.** [[Syr Konrad, the Grim]] pings each opponent for every creature that dies (anyone's) and for every creature card that leaves our graveyard; [[Vraan, Executioner Thane]] drains 2 once a turn when our creatures die. Promise of Loyalty and Deadly Tempest with Konrad out are the table-wide burst.

**Backup — the anthem alpha.** Tokens from Jadar, Woe Strider, Elegy Acolyte, Baron Bertram, Squad Commander, Threefold Thunderhulk, Shadrix, Dreadhorde Invasion, each +X/+0 from experience; [[Squad Commander]] adds +1/+0 and indestructible with a full party, [[Vault of the Archangel]] adds deathtouch and lifelink.

**Engine — reanimation + Panharmonicon.** [[Buried Alive]] → [[Reanimate]] / [[Animate Dead]] / [[Victimize]]; [[Panharmonicon]] doubles every creature ETB (Thunderhulk, Chupacabra, Plaguecrafter, Marauder, Solemn, Squad Commander, Woe Strider).

## 2. Engine map

| Piece | Oracle (verbatim) | Role |
|---|---|---|
| Minthara, Merciless Soul | Minthara has ward {X}, where X is the number of experience counters you have. / At the beginning of your end step, if a permanent you controlled left the battlefield this turn, you get an experience counter. / Creatures you control get +1/+0 for each experience counter you have. | anthem |
| Jadar, Ghoulcaller of Nephalia | At the beginning of your end step, if you control no creatures with decayed, create a 2/2 black Zombie creature token with decayed. | a permanent leaves every turn, a death for Konrad / Vraan |
| Syr Konrad, the Grim | Whenever another creature dies, or a creature card is put into a graveyard from anywhere other than the battlefield, or a creature card leaves your graveyard, Syr Konrad deals 1 damage to each opponent. / {1}{B}: Each player mills a card. | primary drain |
| Vraan, Executioner Thane | Whenever one or more other creatures you control die, each opponent loses 2 life and you gain 2 life. This ability triggers only once each turn. | drain |
| Elegy Acolyte | Whenever one or more creatures you control deal combat damage to a player, you draw a card and lose 1 life. / Void — At the beginning of your end step, if a nonland permanent left the battlefield this turn or a spell was warped this turn, create a 2/2 colorless Robot artifact creature token. | same trigger condition as Minthara: one Robot a turn |
| Baron Bertram Graywater | Whenever one or more tokens you control enter, create a 1/1 black Vampire Rogue creature token with lifelink. This ability triggers only once each turn. / {1}{B}, Sacrifice another creature or artifact: Draw a card. | outlet + bodies |
| Shadowheart, Dark Justiciar | {1}{B}, {T}, Sacrifice another creature: Draw X cards, where X is that creature's power. | outlet: sacrifice a pumped body for X cards |
| Woe Strider / Carrion Feeder / Umbral Collar Zealot | Sacrifice another creature: Scry 1 / Sacrifice a creature: Put a +1/+1 counter on this creature / Sacrifice another creature or artifact: Surveil 1 | free outlets |
| Threefold Thunderhulk | This creature enters with three +1/+1 counters on it. / Whenever this creature enters or attacks, create a number of 1/1 colorless Gnome artifact creature tokens equal to its power. / {2}, Sacrifice another artifact: Put a +1/+1 counter on this creature. | wide; Panharmonicon = 6 Gnomes |
| Panharmonicon | If an artifact or creature entering causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time. | doubles ETBs |
| Squad Commander | When this creature enters, create a 1/1 white Kor Warrior creature token for each creature in your party. / At the beginning of combat on your turn, if you have a full party, creatures you control get +1/+0 and gain indestructible until end of turn. | alpha; party = Cleric (Minthara, Zealot, Shadowheart, Selfless Spirit, Teyo), Rogue (Zhentarim Bandit), Warrior (Marauder, Squad Commander), Wizard (Jadar) |
| Promise of Loyalty | Each player puts a vow counter on a creature they control and sacrifices the rest. Each of those creatures can't attack you or planeswalkers you control for as long as it has a vow counter on it. | Konrad burst + pillow |
| Deadly Tempest | Destroy all creatures. Each player loses life equal to the number of creatures they controlled that were destroyed this way. | Konrad burst |
| Contagion Clasp / Patrolling Peacemaker / Karn's Bastion | {4}, {T}: Proliferate / Whenever an opponent commits a crime, proliferate / {4}, {T}: Proliferate | extra experience counters (the only way past one a turn) |
| Shadrix Silverquill | At the beginning of combat on your turn, you may choose two. Each mode must target a different player. • Target player creates a 2/1 white and black Inkling creature token with flying. • Target player draws a card and loses 1 life. • Target player puts a +1/+1 counter on each creature they control. | an Inkling or counters every turn; politics |
| Buried Alive / Reanimate / Animate Dead / Victimize | Search your library for up to three creature cards, put them into your graveyard / Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card's mana value. | Thunderhulk or Konrad on T4; each reanimation = a Konrad ping |

## 3. Win lines — validated

Validation = oracle text (DB, verbatim), rules check, and `minsim.py` (3,000 goldfish games: 3 opponents at 40, no blockers, greedy casting; coarse — it ranks lines and lists, it does not predict a table).

### Line A — Konrad burst: Promise of Loyalty or Deadly Tempest
=> [[Syr Konrad, the Grim]] on the battlefield → [[Promise of Loyalty]] (everyone keeps one) or [[Deadly Tempest]] (everyone loses all) → 1 damage to each opponent per creature that dies, anyone's

- **Rules.** Konrad's first clause is "another creature dies" with no controller restriction. Deadly Tempest destroys Konrad at the same time: leaves-the-battlefield triggers look back, so Konrad still sees every other creature that died with him (CR 603.10a). Tempest's own clause then costs each player life equal to their destroyed creatures — ours too.
- **Arithmetic.** A table with 4 + 4 + 4 opposing creatures and 6 of ours: Promise kills 9 + 5 = 14 → 14 to each opponent, we keep our best body and lose nothing. Tempest kills 12 + 6 = 18 → 18 to each opponent + 4 each from Tempest, 6 to us. Either one after two turns of ordinary drain ends a 40-life table.
- **Redundancy.** One Konrad; Buried Alive puts him in the graveyard for Reanimate / Animate Dead / Victimize (three ways); Vraan is the second drain body. Two burst spells. Sim: Konrad damage per game is low (1.6) because the sim does not cast the two wipes — this line is the one the sim cannot see.
- **Verdict.** ✅ Legal and lethal; the deck's real finisher. Protect Konrad with Selfless Spirit / Flare of Fortitude / Take Up the Shield before the wipe.

### Line B — anthem alpha
=> one permanent leaves each turn → experience counters → every creature +X/+0 → [[Squad Commander]] full party +1/+0 indestructible → [[Vault of the Archangel]] deathtouch + lifelink → swing wide

- **Rules.** One counter a turn is the ceiling from Minthara herself; proliferate (Clasp {4}, Peacemaker on an opponent's crime, Karn's Bastion {4}) is the only way to add more. Decayed Zombies are sacrificed at end of combat on our turn → the end-step check passes. Tokens leaving count ("a permanent you controlled").
- **Arithmetic.** Sim: 1.6 counters on T6, 3.0 on T8; 3.5 creatures on T6, 5.0 on T8 → a T8 alpha of five bodies at base 2 + 3 = 25 power before Squad Commander, with Vault every blocker dies. The sim's table kill: median T12, 27 % by T10 (the sim swings at one opponent at a time and casts no wipes).
- **Verdict.** ✅ Works, slowly; it is the pressure that makes opponents block badly before Line A. Ghostly Prison and Promise keep the table off us meanwhile.

### Line C — reanimator / Panharmonicon
=> [[Buried Alive]] (Thunderhulk, Konrad, Elegy Acolyte) → [[Reanimate]] / [[Animate Dead]] T4 → Thunderhulk 3/3 + 3 Gnomes (6 with [[Panharmonicon]]) → every reanimation is a Konrad ping

- **Rules.** Reanimate costs life equal to mana value (7 for Thunderhulk). Animate Dead gives −1/−0. Victimize needs a creature to sacrifice (a permanent leaving → experience) and returns two tapped. Konrad's third clause triggers when the card leaves our graveyard.
- **Redundancy.** One Buried Alive, three reanimation spells, Woe Strider escapes itself. Thunderhulk's attack trigger makes power-many Gnomes every combat: with 3 experience counters it attacks as a 6/3 and makes six Gnomes.
- **Verdict.** ✅ Legal; T4 Thunderhulk is the fast start, Konrad on T4 is the drain start.

### Line D — Shadowheart card engine (value, not a kill)
=> pumped body (power base + X) → [[Shadowheart, Dark Justiciar]] {1}{B}, sacrifice it → draw X cards → the death pings Konrad / drains Vraan → a permanent left → experience

- With three experience counters any 2/2 token is 5 cards for 2 mana. Elegy Acolyte and Baron refill the fodder every turn.
- **Verdict.** ✅ Legal and repeatable; the deck's hand engine.

### Rejected / not a line
- Infinite combos: none in the free pool. Exquisite Blood / Sanguine Bond are in Beledros.
- Commander damage: Minthara 2/2 + X; not a line.
- The model's precon-land swap costs nothing (Deck Score 77.5 → 77.5); Tam's three walkers were the model's picks, and Shadrix / Vraan / Promise cost it nothing either.

## 4. Mana

36 lands: precon 11 (Isolated Chapel, Shineshadow Snarl, Temple of Silence, Silverquill Campus, Forum of Amity, Umbral Expanse, Sunlit Marsh, Fetid Heath, Desolate Mire, Study Hall, Arcane Lighthouse), loose (Vault of the Archangel, Forlorn Flats, Secluded Steppe, Riveteers Overlook, Talon Gates of Madara, Buried Ruin, Reliquary Tower, Temple of the False God, Boggart Bog MDFC), Karn's Bastion (Inspirit), 7 Plains / 8 Swamp. Rocks and dorks 11 (Talisman, Charcoal Diamond, Commander's Sphere, Decanter, Thran Dynamo, Noble's Purse, Ornithopter, Burnished Hart, Solemn, Sword of the Animist, Foundry Inspector). Avg MV 2.75; Minthara on T4 in 67 % of goldfish hands.

Precon lands not available: Caves of Koilos, Eclipsed Steppe, Turbulent Moor (Tam / Tazri), Command Tower, Exotic Orchard, Fabled Passage, Bojuka Bog, Terramorphic Expanse, Path of Ancestry (other decks), War Room (not owned).

## 5. Turn plan

| Turn | Play |
|---|---|
| T1 | Land; Carrion Feeder / Reanimate held |
| T2 | Jadar / Vraan / Zealot / Bandit / Talisman / Diamond; Buried Alive on T3 if Reanimate is in hand |
| T3 | Woe Strider / Plaguecrafter / Marauder / Buried Alive; first Zombie attacks from T3 → counter 1 |
| T4 | Minthara; or Reanimate Thunderhulk / Konrad; or Shadowheart / Baron / Elegy / Panharmonicon |
| T5–T6 | Konrad; Squad Commander; Shadrix; keep one permanent leaving every turn |
| T7+ | Promise of Loyalty / Deadly Tempest with Konrad out; Thunderhulk attacks; Vault alpha |

## 6. Keep / mulligan

- **Keep:** 3–4 lands + a 2-drop that makes a permanent leave (Jadar, Bandit, Zealot, Noble's Purse) + one payoff (Konrad, Vraan, Shadowheart, Elegy). Buried Alive + Reanimate with 3 lands is a keep.
- **Mull:** 2 lands without a rock; 5+ lands; no creature below 4 mana; a hand of removal only.

## 7. Traps

- Minthara's trigger checks at the beginning of the end step: a sacrifice during the end step is too late. Sacrifice in main phase 2 or combat.
- Only one counter a turn from Minthara; two permanents leaving is wasted unless a proliferate follows.
- Deadly Tempest kills Konrad too (he still triggers for the others) and costs us life for our own creatures: cast it only when it kills the table or when we are far ahead on life.
- Promise of Loyalty: our kept creature should be Konrad or Minthara; the sacrificed board is "permanents left" → one counter, not one per creature.
- Reanimate on Thunderhulk costs 7 life; Animate Dead first when life is low.
- Decayed Zombies cannot block.
- Elegy Acolyte's Robot needs a nonland permanent to have left: a Treasure counts, a land does not.

## 8. Changes vs the model's raid list (`minthara-v2-swaps.md`)

| Out | In | Why |
|---|---|---|
| Ajani Resolute, Elspeth Sun's Champion, Vraska Betrayal's Sting (Tam) | Shadrix Silverquill, Vraan Executioner Thane, Promise of Loyalty | Tam trades whole; a token a turn, the second drain body, the Konrad burst |
| Anguished Unmaking, Kaya's Ghostform, Path to Exile (Tam) | Vanishing Verse, Gift of Immortality, Darksteel Mutation (precon) | same roles from the precon |
| Bleachbone Verge, Caves of Koilos, Mana Confluence, Turbulent Moor (Tam); Ancient Den, Inventors' Fair, Spire of Industry, Path of Ancestry (Inspirit); Mortuary Mire (Imotekh); Bloodstained Mire, Concealed Courtyard, Eclipsed Steppe, Windswept Heath, Wooded Foothills (Tazri); Ash Barrens, Escape Tunnel (Cabbage); Rogue's Passage (Bumi) | Shineshadow Snarl, Silverquill Campus, Forum of Amity, Umbral Expanse, Study Hall, Arcane Lighthouse (precon); Forlorn Flats, Secluded Steppe, Riveteers Overlook, Talon Gates (loose); 4 Plains, 4 Swamp | the precon land base; the sleeved decks keep their duals and fetches |

## 9. Sourcing — 22 cards still from sleeved decks (each needs a backfill before sleeving)

| Donor | Cards | Backfill candidates (free) |
|---|---|---|
| Imotekh (10) | Buried Alive, Charcoal Diamond, Feed the Swarm, Foundry Inspector, Ravenous Chupacabra, Reanimate, Solemn Simulacrum, Syr Konrad, Umbral Collar Zealot, Woe Strider | Imotekh's guide lists none yet — the sacrifice package overlaps; Konrad / Reanimate / Buried Alive are the deck's core, so this is the real cost of Minthara |
| Inspirit (7) | Final Showdown, Generous Gift, Karn's Bastion, Ornithopter of Paradise, Panharmonicon, Swords to Plowshares, Threefold Thunderhulk | Inspirit guide: Panharmonicon and Thunderhulk are engine cards there |
| Tazri (3) | Grand Abolisher, Selfless Spirit, Squad Commander | Tazri trades whole |
| Cabbage (1) / Bumi (1) | Academy Manufactor / Commander's Sphere | loose rocks |

If the operator wants zero raids: the free pool replaces Konrad with nothing comparable (Vengeful Bloodwitch, Arnyn are 1-for-1 drains); the deck drops to the free-pool list's 80 objective. The 22 raids are what make it the second-strongest.

## 10. Maybeboard

| Card | Note |
|---|---|
| Eiganjo Dynastorian // Replenish, Defacing Duskmage | precon cards not registered — box check |
| Vengeful Bloodwitch, Arnyn Deathbloom Botanist, Massacre Girl Most Wanted (in Beledros maybeboard) | extra drain bodies if a raid is refused |
| Blood Artist-type backups | none free; Zulaport / Blood Artist are in Beledros |
| Killian, Decisive Mentor, Eriette, Breena, Scriv, Doomwake Giant | the precon's own engine; see `killian-decisive-mentor.md` (built by mistake, kept as reference) |
| Winds of Rath (precon) | only Promise / Tempest-adjacent if the table is Aura-heavy; otherwise no |
