# Paper Tazri — precon + cross-deck fixed point (2026-10-02)

**Verdict.** 19 swaps (17 spells, 2 lands) → `tazri-proposed.txt`. Sources: 13 from the open pool, 6 from the precons,
0 from donor decks, so there are no backfill files. The fixed point holds: after the last swap, the best remaining
candidate (5.0) does not beat the weakest kept card (5.0). See §5.
Before sleeving, register the 6 precon cards (Land Tax, Mangara, Keen Duelist, Ingenious Prodigy, Eclipsed Steppe,
Sodden Verdure). They are the only ownership FAIL.

Scale: value to Tazri, 1–10, one scale for every card. It includes party density, because Tazri's cost and its
`{2/U}{2/B}{2/R}{2/G}` dig both scale with Cleric/Rogue/Warrior/Wizard count. It also includes curve and diminishing
returns per role: the 4th draw engine or 5th spot removal is worth less than the 1st.

## 1. Swaps, ranked (best candidate ↔ weakest kept)

| # | IN (score) | OUT (score) | Source | Why (oracle) |
|---|---|---|---|---|
| 1 | Blade Historian (7.5) | Concerted Defense (2.5) | open | Human **Cleric**: "Attacking creatures you control have double strike". It doubles every Karlach/Najeela combat. Defense is "Counter target noncreature spell unless its controller pays {1}…": a soft counter in a proactive deck. |
| 2 | Springleaf Parade (7.5) | Bar the Gate (3) | open | "create X 1/1 … Shapeshifter creature tokens with changeling … Creature tokens you control have '{T}: Add one mana of any color.'" Full party + ramp, and infinite combats with Najeela's WUBRG untap. Bar the Gate holds up {2}{U} for "Counter target creature or planeswalker spell". |
| 3 | Generous Gift (7) | Solemn Doomguide (3) | open | "Destroy target permanent" at instant speed. Doomguide is a 5-drop that only grants "unearth {1}{B}" to dead party cards. |
| 4 | Infernal Grasp (7) | Acererak the Archlich (3.5) | open (2nd copy; Meren keeps its own) | "Destroy target creature. You lose 2 life." Acererak: "return Acererak to its owner's hand and venture". 3 mana per venture, never a body. |
| 5 | Grand Abolisher (7) | Multiclass Baldric (3.5) | open (registered) | Human **Cleric**: "During your turn, your opponents can't cast spells or activate abilities of artifacts, creatures, or enchantments." Shields the alpha turn. Baldric's keywords depend on which roles you control. |
| 6 | Land Tax (7) | Yuan-Ti Malison (3.5) | precon [S] | "if an opponent controls more lands than you, you may search … up to three basic land cards … into your hand". 10 basics and 34 lands in five colours, so it fixes the land WARN without a land slot. Yuan-Ti: "can't be blocked as long as it's attacking alone" in a go-wide deck. |
| 7 | Twilight Prophet (6.5) | You Find a Cursed Idol (3.5) | open | Vampire **Cleric**, flying, ascend: "reveal the top card … put it into your hand. Each opponent loses X life". Ten permanents is easy with tokens. The Idol is a sorcery with no body. Its art/ench job moves to Chomping (#15). |
| 8 | The Destined Thief (6.5) | Thwart the Grave (3.5) | open | Human **Rogue**: "can't be blocked … If you have a full party, instead draw three cards" on combat damage. Thwart needs dead targets, and the deck has no self-mill. |
| 9 | Putrefy (6.5) | Shadowheart, Dark Justiciar (3.5) | open | "Destroy target artifact or creature." Shadowheart's "{1}{B}, {T}, Sacrifice another creature: Draw X" draws 1 off 1/1 tokens. |
| 10 | Kamiz, Obscura Oculus (5.5) | Safana, Calimport Cutthroat (4) | open | Octopus **Rogue**: "Whenever you attack, target attacking creature can't be blocked … It connives. Then … another attacking creature with lesser power … gains double strike". That fires on every combat, Karlach's extra one included. Safana makes one Treasure while you hold the initiative. Rogue for Rogue. |
| 11 | Mangara, the Diplomat (5.5) | Hama Pashar, Ruin Seeker (4) | precon [S] | Human **Cleric**, lifelink: "Whenever an opponent casts their second spell each turn, draw a card" plus a draw when attacked by 2+. Hama is a 2/3 whose only text is "Room abilities … trigger an additional time". |
| 12 | Keen Duelist (5.5) | Feywild Caretaker (4.5) | precon [S] | 2-mana Human **Wizard**: "you and target opponent each reveal the top card … each put the card you revealed into your hand", +1 card a turn. Caretaker is a 5-drop for initiative plus a 1/1. Wizard for Wizard, 3 MV cheaper. |
| 13 | Weathered Wayfarer (5.5) | Varis, Silverymoon Ranger (4.5) | open | 1-drop Human **Cleric**: "{W}, {T}: Search your library for a land card … Activate only if an opponent controls more lands than you." It finds a shock, a fetch or Command Tower. Varis (Elf Ranger) is not a party type. |
| 14 | Ingenious Prodigy (5.5) | Sefris of the Hidden Ways (4.5) | precon [Q] | Human **Wizard**, "{X}{U} … enters with X +1/+1 counters … remove a +1/+1 counter … draw a card". A 1-drop Wizard early, a draw engine late. Sefris ventures only when creature cards hit your graveyard. Wizard for Wizard. |
| 15 | Chomping Changeling (5.5) | Triumphant Adventurer (4.5) | open | Changeling + "destroy up to one target artifact or enchantment". Body plus the Idol's job. Triumphant is a Human Knight, not a party type. |
| 16 | Realmwalker (5.0) | Archpriest of Iona (4.5) | open | Changeling + "cast creature spells of the chosen type from the top of your library" (name Human: ~30 hits). Overlaps Vizier/Nalia, hence only 5.0. Archpriest's "+1/+1 and flying" needs a full party at combat. |
| 17 | Torens, Fist of the Angels (5.5) | Nadaar, Selfless Paladin (5.0) | open | Human **Cleric**: "Whenever you cast a creature spell, create a 1/1 … Human Soldier creature token with training". With 43 creatures that is a token a turn for Mirror Entity, Blade Historian and ascend. Nadaar (Dragon Knight) is not a party type: Tazri's dig, Harper and Nalia never see it. |
| L1 | Eclipsed Steppe | Bojuka Bog | precon [S] | Plains Swamp: "enters tapped unless you control two or more basic lands". Untapped in Tazri (10 basics plus basic fetchers), and the 3 fetches and Farseek can find it. Bog is a tapped mono-B land. |
| L2 | Sodden Verdure | Ash Barrens | precon [Q] | Forest Island, same clause. Fetchable by Heath, Foothills, Nature's Lore and Farseek. Adds a U source, the tightest colour. Ash Barrens is {C} or a basic landcycler. |

Cost of the swaps: Bojuka Bog was the only graveyard hate. Wizards drop from 7 to 5 dedicated (plus 10 changelings).

**Role ledger (current → proposed):**

| Role | Current | Proposed |
|---|---|---|
| Creatures | 43 (4 non-party: Karlach, Nadaar, Varis, Triumphant) | 43 (1 non-party: Karlach) |
| Dedicated Clerics / Rogues / Warriors / Wizards | 7 / 10 / 8 / 7 | 10 / 10 / 8 / 5 |
| Changeling / all-types | 8 | 10 (+ Springleaf tokens) |
| Hard creature removal | 2 (Swords, Stump Stomp) | 5 (+ Gift, Grasp, Putrefy) |
| Art/ench removal | Vandal, Idol | Vandal, Chomping, Gift, Putrefy |
| Counters | 2 soft | 0 (Grand Abolisher instead) |
| Wipes | Blasphemous Act, Stick Together | same |
| Draw engines | Spoils, Imoen, Trapfinder, Harper, Vizier, Nalia, Durnan, Tajuru, Shadowheart | − Shadowheart + Prophet, Thief, Mangara, Duelist, Prodigy, Kamiz (connive), Realmwalker |
| Land help | 10 ramp | 10 ramp + Springleaf + Land Tax + Wayfarer |
| Initiative sources | 7 | 6 (Caretaker out) |

**Colour sources after the land swaps** (fetch, Tower, Orchard, Path and Base Camp count for every colour; tri-lands
and basic-fetchers count per colour they produce or fetch):

| | W | U | B | R | G |
|---|---|---|---|---|---|
| Current (Bog, Ash Barrens) | 20 | 14 | 14 | 15 | 17 |
| Proposed (Steppe, Verdure) | **21** | **15** | 14 | 15 | **18** |

B stays at 14 against new B pips (Twilight Prophet BB, Kamiz, Putrefy, Grasp, Keen Duelist). Both new duals have basic
land types, so the three fetches and Farseek now reach 7 dual-typed lands (5 shocks plus Steppe and Verdure).

## 2. The 12 unapplied 09-28 swaps (fable review §7)

| # | 09-28 swap | Owned? | Verdict |
|---|---|---|---|
| 1 | Springleaf Parade ← Solemn Doomguide | ✅ open | **Keep.** Both sides stand (rows 2/3). |
| 2 | Generous Gift ← Concerted Defense | ✅ open (Tam cut it 09-28) | **Keep.** |
| 3 | Infernal Grasp ← Multiclass Baldric | ✅ open 2nd copy | **Keep.** |
| 4 | Putrefy ← Bar the Gate | ✅ open | **Keep.** |
| 5 | Blade Historian ← Shadowheart | ✅ open | **Keep.** |
| 6 | The Destined Thief ← Safana | ✅ open | **Keep.** |
| 7 | Grand Abolisher ← Acererak | ✅ open (registered; not ASSUMED) | **Keep.** |
| 8 | Syphon Mind ← Thwart the Grave | ✅ open | **Drop the IN.** Thwart still goes (row 8). Syphon is a 4-MV sorcery in a list that now has 15 four-drops and 7 new draw sources, so it scores 5.0 and ties the weakest kept card. |
| 9 | Samut, Hazoret's Champion ← Feywild Caretaker | ❌ not in collection, precons or donors | **Drop.** Caretaker still goes, for Keen Duelist. |
| 10 | Chomping Changeling ← You Find a Cursed Idol | ✅ open | **Keep.** |
| 11 | Realmwalker ← Archpriest of Iona | ✅ open | **Keep.** |
| 12 | Rescue Girl ← Yuan-Ti Malison | ❌ not owned | **Drop.** Yuan-Ti still goes, for Land Tax. |
| — | Growth Spiral ← Explore the Underdark | ✅ open | **Drop** (fable verdict stands: Explore is 2 lands plus initiative). |
| — | Vraska Joins Up ← Hama Pashar (optional) | ✅ open | **Drop.** Hama goes for Mangara; with 7 new draw sources a 4th is not needed (4.5). |

## 3. Donor backfills

**None.** No donor-deck card beats the weakest kept card once the donor's loss is counted:

| Donor card | Tazri value | Why not moved |
|---|---|---|
| Sylvan Library (Meren) | 6.0 | Would beat Nadaar/Realmwalker, but Tam's proposal takes it (`meren-of-clan-nel-toth-proposed.txt`: −Sylvan Library −Llanowar Wastes +Greed +Haunted Mire). Tam has priority on donor cards the operator named for Tam. |
| Assassin's Trophy (Meren), Bitter Triumph (Imotekh), Dismember (Imotekh) | 5.0 / 5.0 / 4.5 | It would be the 6th hard removal spell, and Meren/Imotekh lose a key card for a tie. |
| Lightning Greaves (Meren), Seedborn Muse / Chord of Calling (Cabbage) | 4.5 | Chord's {G}{G}{G} is hard in five colours and few creatures convoke green. Greaves and Muse are not party types. |
| Zulaport Cutthroat, Morbid Opportunist, Grim Haruspex, Priest of Forgotten Gods (Meren) | 4–4.5 | Party bodies, but aristocrat text that Tazri does not use. |

No `*-tazri-backfill.txt` written.

## 4. Contested precon cards (Tam could also want)

| Precon card | Tam's use | Value to Tazri | Tazri's next-best if Tam takes it |
|---|---|---|---|
| Land Tax [S] | Low. Tam has 4 basics, so the operator says it does not work there, and Tam's proposal skips it. | **High** (7) | Syphon Mind (open, 5.0) |
| Mangara, the Diplomat [S] | Med–high: lifelink, and it draws when 2+ creatures attack "you and/or planeswalkers you control". Not in Tam's proposal. | **Med** (5.5) | Rankle, Master of Pranks (open, 5.0) |
| Keen Duelist [S] | Low (symmetric draw and life loss) | **Med** (5.5) | Terra, Herald of Hope (open Wizard Warrior, 5.0) |
| Ingenious Prodigy [Q] | Low–med (X-cost draw creature) | **Med** (5.5) | keep Sefris (4.5) or Terra (5.0) |
| Eclipsed Steppe [S] | Low (enters tapped with Tam's 4 basics) | **Med** | Shineshadow Snarl [S], else keep Bojuka Bog |
| Sodden Verdure [Q] | Low (same reason) | **Med** | Hinterland Harbor [Q], else keep Ash Barrens |

**Left for Tam on purpose** (Tazri value ≤ 5.0): Anguished Unmaking and Turbulent Moor (both in Tam's proposal),
Yavimaya Coast (Tam), Vanishing Verse, Beast Within, Combat Calligrapher, Nils, Three Visits, Ghostly Prison,
Hinterland Harbor, Shineshadow Snarl.
Overlap check: no card in `tazri-proposed.txt` is in `tam-the-possibility-proposed.txt` except each deck's own
registered copies of Sol Ring, Arcane Signet, Command Tower, Exotic Orchard and Farseek. Tam's Path of Ancestry and
Caves of Koilos are the precon extra copies.

## 5. Stop proof

After swap 17, the weakest kept non-locked cards are Realmwalker (5.0), then a band at 5.5: Explore the Underdark,
Ravenloft, Rilsa, Lotho, Changeling Outcast, Glasspool Mimic, Tajuru Paragon, Nimble Trapfinder, Durnan, Masked Vandal,
Stump Stomp, Blasphemous Act, Chomping, Kamiz, Mangara, Keen Duelist, Prodigy, Wayfarer, Torens.
Blasphemous Act stays at 5.5 because Heroic Intervention, Selfless Spirit and Linvala's sacrifice turn it one-sided.

Best remaining candidate from every source, each **≤ 5.0**:

| Source | Best remaining (score) — reason it stops |
|---|---|
| Open pool, party types (all 85 BGRUW party/changeling cards checked against `open-cards.txt`) | Rankle (5.0: Rogues already 10, symmetric draw), Terra (5.0), Omni-Changeling (5.0: 5-MV clone), Tam Mindful First-Year (5.0), Firdoch Core / Alms Collector / Dawnbringer Cleric / Teyo (4.5), Vito, Minthara, Alesha, Gonti, Aven Interrupter (≤ 4.5) |
| Open pool, spells | Syphon Mind (5.0), Vindictive Triumph (4.5: WBB, 6th removal), Vraska Joins Up (4.5), Growth Spiral (4), Stingerquill Charm (4) |
| Precons | Anguished Unmaking / Three Visits / Combat Calligrapher (5.0), Vanishing Verse / Beast Within / Guardian Augmenter (4.5), Nils / Starfield Mystic / Talisman of Hierarchy / Secret Rendezvous (4). The other 150 precon cards are X-spell, Aura or counters text with no party type (≤ 3.5). |
| Precon land as a 35th land (gate WARN 34.8 vs 37 ±2) | Shineshadow Snarl / Hinterland Harbor (5.0). Ties Realmwalker. Land Tax and Wayfarer already cover missed land drops. |
| Donors | Assassin's Trophy, Bitter Triumph (5.0 before the donor's loss); Sylvan Library (6.0) reserved for Tam |

5.0 does not beat 5.0, so this is a fixed point. Two coin flips at the tie, for the operator: Realmwalker vs a 35th
land (Shineshadow Snarl), and Realmwalker vs Syphon Mind.

## 6. Gate lines

`MTG_DB_DIR=<APPDATA>/the-black-grimoire/data npx tsx scripts/deck-gate.ts <Commander/Deck-headed copy of tazri-proposed.txt> --format commander --owner 1 --source paper --lock "Swords to Plowshares" --lock "Fellwar Stone" --lock "Inspiring Vantage"`

```
totals    : 100 cards | 34 lands (34.8 eff.) | 65 nonland | avg MV 3.12
curve     : 1:6 2:17 3:19 4:15 5:5 6:2 7:1
  PASS  size        100 cards
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in commander
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BGRUW
  FAIL  ownership   6 not in the paper collection: Land Tax, Mangara, Keen Duelist, Ingenious Prodigy, Eclipsed Steppe, Sodden Verdure  (= the 6 precon cards; expected until registered)
  WARN  arenaNames  Glasspool Mimic, Stump Stomp front-face only (MDFC, unchanged)
  WARN  lands       34 lands (+2 MDFC = 34.8 eff.); Karsten wants 37 ±2  (unchanged from current deck)
  FAIL  plan        0/65 nonland interact — gate has no plan for Tazri (known, same as current deck)
  PASS  curve       avg MV 3.12
  PASS  wincons     8 win condition(s)/closer(s)
  PASS  locks       11 locked (8 default fetch/shock + Swords, Fellwar, Vantage) present and intact
```

I checked ownership by hand. All 13 open-pool INs are in `decks/paper/open-cards.txt` (1 copy each; Infernal Grasp
×2 in the collection, one sleeved in Meren). The 6 precon INs are in `SilverquillInfluence_SOC.txt` (Land Tax, Mangara,
Keen Duelist, Eclipsed Steppe) or `QuandrixUnlimited_SOC.txt` (Ingenious Prodigy, Sodden Verdure). Without a
`Commander` header the gate reports "No commander designated"; `tazri-proposed.txt` keeps the plain `1 Name` format
from the brief, with the commander first.
