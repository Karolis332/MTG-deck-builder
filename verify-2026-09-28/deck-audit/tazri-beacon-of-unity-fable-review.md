# Tazri, Beacon of Unity — Fable review (2026-09-28)

Inputs: `tazri-beacon-of-unity-{final.txt,deck.md,pool.md,fra-assumed.md}`, `final-swaps.json`, `HISTORY.md` v1–v14.
Gate on `-final.txt` (read-only, `/tmp/tazri-final-gate.txt`): 100 cards, 34 lands (34.8 eff.), 65 nonland, avg MV 3.18,
curve 1:3 2:17 3:24 4:13 5:5 6:2 9:1, wincons 5, locks 8 intact. FAIL only on ownership (Samut, Rescue Girl = ASSUMED,
unregistered) and the known `plan` FAIL. WARN lands (Karsten 39 ±2).

## 1. Verdict

The final 100 is better than the current deck: hard creature removal 2 → 5, draw spells 1 → 2 plus Realmwalker, and
Springleaf Parade turns Najeela into an infinite-combat line the current list lacks. It is still 34 lands in five colours
with a 26-W-pip spread, so the mana is the ceiling, not the spells. Of the two held swaps: **Grand Abolisher YES** (but for
Acererak, not Stick Together); **Growth Spiral for Explore the Underdark NO**. Two clear misses: Blade Historian and The
Destined Thief.

## 2. Health (current → final)

| Area | Current | Final | Note |
|---|---|---|---|
| Lands | 34 (+2 MDFC) | 34 (+2 MDFC) | Gate WARN both. Pips W26 G20 B18 U11 R8; sources counting fetches ≈ W20 G17 R15 U13 B13. B is the tightest ratio. 10 basics, no Mountain. |
| Ramp | 9 (Sol Ring, Signet, Fellwar, Lantern, Packbeast, Farseek, Nature's Lore, Kodama's, Explore) + Undermountain/Lotho/Safana/Burakos | 10 (+Springleaf tokens) | Explore kept (see §3). |
| Draw | 1 spell (Spoils) + Imoen/Trapfinder/Harper/Vizier/Nalia engines | 2 spells (+Syphon Mind) + Realmwalker | Still thin; Destined Thief (§5) is the fix. |
| Spot removal | 2 creature (Swords, Stump Stomp) + Vandal/Idol art-ench + 2 soft counters | 5 creature (+Gift, Putrefy, Grasp) + Vandal/Chomping art-ench | Counters out, answers in. |
| Wipes | 2 (Blasphemous Act, Stick Together) | 2 | Stick Together is the deck's asymmetric wipe — keep. |
| Protection | 6 (Heroic Intervention, Selfless Spirit, Linvala, Mariner, Squad Commander, Baldric) | 5 (−Baldric) | +Grand Abolisher → 6 with §7. |
| Win lines | Karlach 2nd combat, Najeela (one activation per WUBRG), Mirror Entity X, Destined Warrior/Nalia/Zagras alpha, Pathlighter evasion | + Najeela × Springleaf infinite combats, + Samut haste | Gate wincons 7 → 5 is a category count; the actual lines got stronger. |

Plan check: full party → combat with anthems, extra combats, initiative value. Redundancy is fine: 6 initiative sources after
Caretaker leaves (Ravenloft, Rilsa, Seasoned Dungeoneer, Undermountain, White Plume, Explore), 14 changeling/multi-role
bodies. Weak spot is card flow and the 34-land count; do not cut lands or land-fetching ramp.

## 3. Swap review

| IN | OUT | Verdict | Reason (oracle) |
|---|---|---|---|
| Springleaf Parade | Solemn Doomguide | Agree | Parade: "create X 1/1 … Shapeshifter creature tokens with changeling … Creature tokens you control have '{T}: Add one mana of any color.'" Najeela: "{W}{U}{B}{R}{G}: Untap all attacking creatures. They gain trample, lifelink, and haste … additional combat phase." Attacking tokens untap with haste, tap for WUBRG, repeat. X=4 is a full party in one card. Doomguide only grants "unearth {1}{B}" to dead party cards. |
| Generous Gift | Concerted Defense | Agree | "Destroy target permanent" at instant speed vs "Counter target noncreature spell unless its controller pays {1} plus …" — a soft counter in a proactive deck. |
| Realmwalker | Archpriest of Iona | Agree (mild) | Changeling body + "cast creature spells of the chosen type from the top of your library." Note it reads the same top card as Vizier and Nalia, so it is a third copy of one effect, not additive. Archpriest's "+1/+1 and flying" needs a full party. |
| Putrefy | Bar the Gate | Agree | "Destroy target artifact or creature. It can't be regenerated." Bar the Gate's venture is on-plan, but holding {2}{U} for "Counter target creature or planeswalker spell" fights the curve. |
| Infernal Grasp | Multiclass Baldric | Agree | "Destroy target creature. You lose 2 life." Collection has 2 Grasp, 1 sleeved in Meren, 1 open. Baldric's keywords are tied to controlling each role. |
| Syphon Mind | Thwart the Grave | Agree | "Each other player discards a card. You draw a card for each card discarded" = 3 cards for 4 mana in a pod. Thwart is {B}{B} with a full party but needs targets and the deck has no self-mill. |
| Chomping Changeling | You Find a Cursed Idol | Agree | Changeling body + "destroy up to one target artifact or enchantment"; the Idol is a sorcery with no body. |
| Samut, Hazoret's Champion | Feywild Caretaker | Agree | {1}{R} Human Warrior Cleric, "Creatures you control have haste": Squad Commander tokens, Springleaf tokens and Mutavault attack the turn they land. Caretaker is a 5-mana initiative source; 6 remain. ASSUMED — confirm owned. |
| Rescue Girl, First Responder | Yuan-Ti Malison | Agree | Flying Cleric, "{T}: Return another target permanent you control to its owner's hand" re-buys "you take the initiative" ETBs (Dungeoneer, White Plume, Ravenloft, Undermountain, Rilsa) and Nadaar's venture. Malison is "can't be blocked as long as it's attacking alone" in a go-wide deck. ASSUMED — confirm owned. |
| Grand Abolisher | Stick Together | **YES to IN, NO to OUT** | Abolisher {W}{W} Human Cleric: "During your turn, your opponents can't cast spells or activate abilities of artifacts, creatures, or enchantments." It makes the Najeela/Parade turn and every Karlach alpha uncounterable and un-foggable, and it is a party Cleric. v4 cut it inside a 60-card rebuild, not on quality. But Stick Together is not the slot: "Each player chooses a party … then sacrifices the rest" — every non-Cleric/Rogue/Warrior/Wizard an opponent controls dies and they keep at most 4, while you keep Tazri plus a full party. It is the deck's only wipe that spares its engine. Cut **Acererak** instead (§6). |
| Growth Spiral | Explore the Underdark | **NO** | Explore: "Search your library for up to two basic land cards … put them onto the battlefield tapped … You take the initiative." Two lands in a 34-land WARN deck plus the initiative that turns on Imoen ("if you have the initiative, draw a card"), Safana ("if you have the initiative, create a Treasure") and every "if you've completed a dungeon" payoff (Nadaar, Rilsa, Undermountain, White Plume, Ravenloft, Sefris, Varis), doubled by Hama Pashar. It also retakes the initiative after an opponent steals it. Growth Spiral: "Draw a card. You may put a land card from your hand onto the battlefield" — a cantrip that ramps only when a land is already in hand and fetches nothing. The v6 add stands. |

## 4. Overturned rejects

None. Selvala (no party type; "may draw a card if its power is greater than each other creature's power" rarely fires off
1/1 party bodies), Traxos (Dragon Construct, no party text) and Enlightened Confidant (IF-OWNED, lifegain-gated) stay out.

## 5. Misses

| # | IN (open, registered) | OUT | Why |
|---|---|---|---|
| 1 | **Blade Historian** {R/W}{R/W}{R/W}{R/W}, Human **Cleric** (#2715) | Shadowheart, Dark Justiciar | "Attacking creatures you control have double strike." Doubles every Karlach and Najeela combat on top of Destined Warrior's "+3/+0" and Nalia's counters; four hybrid pips are covered by ~20 W sources. The coverage pass rejected it as "off-plan goodstuff (Flying)" — wrong text, and it is a party type. Shadowheart's "{1}{B}, {T}, Sacrifice another creature: Draw X cards" draws 1 off the deck's 1/1 tokens. |
| 2 | **The Destined Thief** {2}{U}, Human **Rogue** (#11792, $3.82) | Safana, Calimport Cutthroat | "can't be blocked … {U}, {T}: Another target creature you control can't be blocked … Whenever one or more creatures you control deal combat damage to one or more players, draw a card, then discard a card. If you have a full party, instead draw three cards." Three cards per combat, per extra combat. Fell outside the coverage bar (rank > 3000, price < $4). Safana is one Treasure per end step while you hold the initiative. |
| 3 | Vraska Joins Up {B}{G} (#2616) | Hama Pashar, Ruin Seeker | Optional. "put a deathtouch counter on each creature you control. Whenever a legendary creature you control deals combat damage to a player, draw a card." 22 legendary creatures in the final list. Hama is a 2/3 whose only text is "Room abilities of dungeons you own trigger an additional time." Take it only if the operator wants a third draw source over a dungeon doubler. |

## 6. Weakest 5 in the final list

1. **Acererak the Archlich** — "return Acererak to its owner's hand and venture" every cast: 3 mana per venture, never a body, never a party member. Cut for Grand Abolisher.
2. **Safana, Calimport Cutthroat** — "if you have the initiative, create a Treasure token": one Treasure a turn on a 2/1. Cut for The Destined Thief.
3. **Shadowheart, Dark Justiciar** — taxed sac-draw ("{1}{B}, {T}, Sacrifice another creature: Draw X") in a deck of 1/1 tokens. Cut for Blade Historian.
4. **Hama Pashar, Ruin Seeker** — vanilla 2/3 Wizard outside a dungeon room; only the doubler text.
5. **Realmwalker** — still beats Archpriest, but it is the third "cast from the top of your library" effect (Vizier, Nalia) and they all see one card.

## 7. Recommended change list vs the CURRENT deck (IN → OUT), ranked

| # | IN | OUT | Source |
|---|---|---|---|
| 1 | Springleaf Parade | Solemn Doomguide | audit KEEP |
| 2 | Generous Gift | Concerted Defense | audit KEEP |
| 3 | Infernal Grasp | Multiclass Baldric | audit KEEP |
| 4 | Putrefy | Bar the Gate | audit KEEP |
| 5 | Blade Historian | Shadowheart, Dark Justiciar | miss |
| 6 | The Destined Thief | Safana, Calimport Cutthroat | miss |
| 7 | Grand Abolisher | Acererak the Archlich | audit IN, OUT changed (reverses v4 — operator yes needed) |
| 8 | Syphon Mind | Thwart the Grave | audit KEEP |
| 9 | Samut, Hazoret's Champion | Feywild Caretaker | audit KEEP — ASSUMED, confirm owned |
| 10 | Chomping Changeling | You Find a Cursed Idol | audit KEEP |
| 11 | Realmwalker | Archpriest of Iona | audit KEEP |
| 12 | Rescue Girl, First Responder | Yuan-Ti Malison | audit KEEP — ASSUMED, confirm owned |
| — | ~~Growth Spiral~~ | ~~Explore the Underdark~~ | rejected: Explore stays |
| — | (optional) Vraska Joins Up | Hama Pashar, Ruin Seeker | only if a third draw source is wanted |

Not touched: Stick Together, Explore the Underdark, all 34 lands, the 8 gate locks. Rows 9 and 12 need the two FRA cards
registered before sleeving; if either is not owned, keep Feywild Caretaker / Yuan-Ti Malison respectively.
