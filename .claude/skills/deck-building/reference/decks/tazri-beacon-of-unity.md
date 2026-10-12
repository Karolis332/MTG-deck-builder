# Tazri, Beacon of Unity — pilot guide (paper, 4-player pod, 40 life)

Review 2026-10-09: proposed swaps in verify-2026-10-09/color-best/eval/tazri-beacon-of-unity/REVIEW.md (refuted: REFUTE.md), not yet applied. This guide describes the sleeved deck file, not the draft `verify-2026-10-09/tazri/tazri-final.txt` the review used as its base.

List: `decks/paper/decks/tazri-beacon-of-unity.txt` (100 cards: 34 lands + 2 MDFC, 43 creatures, 41 of them party). Every quote is from the live card DB (`q.py`). Rulings come from Scryfall and the CR (https://magic.wizards.com/en/rules, 2026-09-25 text).

## 1. Plan in 3 lines
1. **T1–3:** fix five colours (Farseek, Nature's Lore, rocks, Land Tax, Weathered Wayfarer) and land 1–2 cheap party creatures.
2. **T3–5:** cast Tazri: "This spell costs {1} less to cast for each creature in your party", so {W}–{2}{W}. Refuel with "{2/U}{2/B}{2/R}{2/G}: Look at the top six cards … reveal up to two Cleric, Rogue, Warrior, Wizard, and/or Ally cards … put them into your hand."
3. **T5–7:** with a full party, attack with anthems, double strike and extra combats, behind Grand Abolisher or Heroic Intervention.

| Rank (est.) | Win line | Closer text (DB) | Needs |
|---|---|---|---|
| 1 | Full-party alpha | Destined Warrior "If you have a full party, creatures you control get +3/+0 until end of turn instead." · Blade Historian "Attacking creatures you control have double strike." · Squad Commander "if you have a full party, creatures you control get +1/+0 and gain indestructible until end of turn." · Nalia "put a +1/+1 counter on each creature you control and those creatures gain deathtouch" | Full party, 5+ bodies |
| 2 | Extra combats | Karlach "Whenever you attack, if it's the first combat phase of the turn, untap all attacking creatures … After this phase, there is an additional combat phase." · Najeela "{W}{U}{B}{R}{G}: Untap all attacking creatures. They gain trample, lifelink, and haste … additional combat phase. Activate only during combat." | Karlach or Najeela + WUBRG |
| 3 | Najeela + Springleaf Parade: infinite combats | Parade: "Creature tokens you control have '{T}: Add one mana of any color.'" Each changeling token is a Warrior, so Najeela's "Whenever a Warrior attacks … create a 1/1 white Warrior creature token that's tapped and attacking." | 5 creature tokens with haste or controlled since the turn began |
| 4 | Ping per attacker | Ingris "Whenever a creature you control attacks, that creature deals 1 damage to each opponent." · Burakos "defending player loses X life and you create X Treasure tokens, where X is the number of creatures in your party" | Wide board, several combats |
| 5 | Mirror Entity | "{X}: Until end of turn, creatures you control have base power and toughness X/X and gain all creature types." | Lots of mana (attacking Parade tokens) |

## 2. Engine map
| # | Interaction | Text (DB) | Why it works / ⚠️ flag |
|---|---|---|---|
| 1 | Party count | Changelings (Outcast, Chomping, Vandal, Mirror Entity, Mutable Explorer, Mariner) are "every creature type". Burakos, Stonework Packbeast and Tajuru Paragon are "also a Cleric, Rogue, Warrior, and Wizard". | Party is 0–4, and each creature fills one slot. With a multi-type creature, the highest possible count is used (Tazri ruling, https://scryfall.com/card/znr/44/tazri-beacon-of-unity). Tazri on the battlefield is the Warrior. The types work in every zone (Mirror Entity and Tajuru rulings), so Tazri's dig and Harper Recruiter can take changelings. |
| 2 | "Beginning of combat" stacks per combat | Destined Warrior, Squad Commander, Nalia, Linvala and Nimble Trapfinder all say "At the beginning of combat on your turn" | They trigger again in **every** extra combat: Destined Warrior's +3/+0 reaches +6/+0 in combat 2, and Nalia adds another counter. ⚠️ Squad Commander affects only creatures you control as it resolves (ruling, https://scryfall.com/card/clb/709/squad-commander). |
| 3 | Karlach + Blade Historian | Karlach's attackers "gain first strike" and get a second combat. Historian gives double strike. | 2 combats × 2 damage steps. Karlach "doesn't have to be among the attacking creatures" (ruling, https://scryfall.com/card/clb/186/karlach-fury-of-avernus), so keep her home. ⚠️ She works only "if it's the first combat phase". |
| 4 | Najeela + Warriors | Every changeling and Parade token is a Warrior, so each one makes a 1/1 when it attacks. | ⚠️ Ruling (https://scryfall.com/card/bbd/62/najeela-the-blade-blossom): her tokens "were never declared as attacking creatures", so they don't trigger Najeela, Ingris or Harper Recruiter. "There is no main phase before the additional combat phase." Activate in the end-of-combat step, after damage: "Untapping an attacking creature doesn't remove it from combat." Najeela needn't attack. |
| 5 | Infinite combats | Najeela WUBRG + Parade mana | Attacking tokens can tap for mana and still deal damage. Each activation gives haste to everything attacking, including that combat's Najeela tokens. ⚠️ Tokens made this turn can't use {T} without haste (CR 302.6), so the first WUBRG must come from lands or old tokens. Ingris "{4}: … Then creatures you control gain haste until end of turn" also unlocks new tokens. |
| 6 | Mirror Entity + Parade | Tap attacking tokens for X after blocks | Each unblocked creature deals X, so N attackers deal about N × X. ⚠️ Rulings (https://scryfall.com/card/otc/83/mirror-entity): "X = 0 will cause all creatures you control to become 0/0", and it overwrites base P/T, so a small X shrinks Tazri (4/6) and Zagras (4/4). Counters and anthems still apply on top. Activating before attacks makes everything a Warrior for Najeela. |
| 7 | Mardu Siegebreaker → Squad Commander | Siegebreaker: "for each opponent, create a tapped token that's a copy of the exiled card attacking that opponent". Commander ETB: "create a 1/1 white Kor Warrior creature token for each creature in your party" | 3 copies make up to 12 Kor Warriors, which stay after the copies are sacrificed. ⚠️ Rulings (https://scryfall.com/card/tdm/206/mardu-siegebreaker): an exiled token "will cease to exist", and the copies were never declared as attackers. Exiling a legendary creature gives 3 same-name copies, and the legend rule keeps 1 (CR 704.5j). |
| 8 | Initiative package | Ravenloft, Rilsa, Seasoned Dungeoneer, Undermountain, White Plume, Explore "you take the initiative". Imoen "if you have the initiative, draw a card". | You venture each upkeep while you hold it. A player takes it when their creatures deal combat damage to you (CR 726.2). Undermountain: "If you've completed a dungeon, add six {G} instead." |
| 9 | Spelunking | "Lands you control enter untapped." | Ruling (https://scryfall.com/card/lci/213/spelunking): lands "simply put onto the battlefield tapped" (Farseek, Kodama's Reach, Explore, Courtyards/Hideout, the Mutavault token) "always [enter] untapped". For self-tapping lands (tri-lands, Path, shocks) you choose the order, so they can enter untapped and you skip the shock's 2 life. |
| 10 | Coveted Prize | "If you have a full party, you may cast a spell with mana value 4 or less from your hand without paying its mana cost." | Ruling (https://scryfall.com/card/znr/95/coveted-prize): the free cast happens during resolution, not later, and X must be 0 (so no free Parade). Fetch Karlach/Parade to hard-cast, or a ≤4 card to cast free: Najeela (MV 3), Blade Historian, Grand Abolisher, Destined Warrior, Kamiz. |

## 3. Turn by turn
| Turn | Ideal | Realistic (3 lands incl. 1 tapped, 1 ramp, 2–3 party creatures) |
|---|---|---|
| T1 | Windswept Heath → Hallowed Fountain; Weathered Wayfarer or Land Tax | Tapped tri-land (Jetmir's Garden / Spara's HQ / Ziatora's PG) |
| T2 | Farseek (finds a shock or Eclipsed Steppe, tapped), or Sol Ring + Lotho/Mariner/Zimone | Farseek / Nature's Lore |
| T3 | Najeela or Torens + a 1-drop; Wayfarer activation if behind on lands | One party 3-drop (Torens, Imoen, Destined Thief, Harper Recruiter, Mirror Entity) |
| T4 | **Tazri** for {W}/{1}{W} + Destined Warrior or Kamiz | **Tazri** for {2}{W} + a 2-drop |
| T5 | Blade Historian or Karlach. Tazri dig at the end of an opponent's turn | Initiative creature (Seasoned Dungeoneer / White Plume) or Najeela, first attacks |
| T6 | Grand Abolisher → full-party alpha, Karlach's second combat | Dig every turn to complete the party. Alpha T7 with Heroic Intervention up |

## 4. Mulligan guide
The first mulligan is free (CR 103.5c).

**Keep if:**
- 3+ lands, including a W source (W pips: Grand Abolisher {W}{W}, Blade Historian {R/W}×4, Stick Together {3}{W}{W}) plus one other colour;
- at least 1 ramp/fixer;
- at least 2 party creatures at MV ≤ 3. Tazri is free card flow from the command zone, so one party creature plus dig mana is acceptable.

| Hand | Verdict | Reason |
|---|---|---|
| Windswept Heath, Hallowed Fountain, Command Tower, Weathered Wayfarer, Nimble Trapfinder, Torens, Fist of the Angels, Swords to Plowshares | ✅ Keep | Heath finds a G shock for Torens; curve 1-2-3 into a T4 Tazri at {2}{W} (Wayfarer and Torens are both Clerics: party 2); an answer |
| Overgrown Tomb, Plains, Forest, Farseek, Lotho, Corrupt Shirriff, Najeela, the Blade-Blossom, Generous Gift | ✅ Keep | Farseek finds Sacred Foundry (R for Najeela). 2 party bodies by T3, an instant answer |
| Command Tower, Cabaretti Courtyard, Sol Ring, Unsettled Mariner, Selfless Spirit, Mirror Entity, Infernal Grasp | ✅ Keep (draw) | 2 lands + Sol Ring. Three cheap party bodies (2 changelings + a Cleric) make Tazri cost {1}{W} on T4 |
| Jetmir's Garden, Ziatora's Proving Ground, Blasphemous Act, Stick Together, Coveted Prize, Karlach, Fury of Avernus, Spoils of Adventure | ❌ Mull | 2 tapped lands, nothing before T4, zero party creatures |
| Plains, Plains, Island, Swamp, Forest, Land Tax, Explore the Underdark | ❌ Mull | 5 lands + land spells, no creatures. Land Tax's "if an opponent controls more lands than you" turns off on T1 |
| Island, Steam Vents, Spirebluff Canal, The Destined Warrior, Kamiz, Obscura Oculus, Twilight Prophet, Rilsa Rael, Kingpin | ❌ Mull | No W and no B: zero castable spells |

## 5. Lines to visualise each turn
| Situation | Line |
|---|---|
| Tazri's dig | No timing restriction: activate at the end of the opponent's turn before yours. Base Camp mana pays for it ("an ability of a Cleric, Rogue, Warrior, or Wizard"). Take "up to two cards total" (ruling). Missing party slots first, then Najeela/Karlach/Historian. |
| Deploy vs hold | Commit 4–5 bodies; keep 1–2 party creatures in hand against a wipe. Tazri herself is the rebuild. Don't run out Mirror Entity/Historian before the alpha turn unless you need the party slot. |
| Hold up | Heroic Intervention {1}{G} ("hexproof and indestructible") once the board is committed. Selfless Spirit "Sacrifice this creature: Creatures you control gain indestructible". Linvala "Sacrifice Linvala: Choose hexproof or indestructible." Swords / Generous Gift / Grasp at instant speed. |
| Alpha turn | Grand Abolisher first ("During your turn, your opponents can't cast spells or activate abilities of artifacts, creatures, or enchantments"; walkers, lands and triggers still work). Linvala's full-party lock hits the best blocker or a mana rock. Pathlighter: "can't be blocked except by legendary creatures". Kamiz makes one attacker unblockable, and it connives. |
| Combat order | Combat triggers resolve → attack with everything except Najeela/Karlach/Ingris → Najeela tokens → blocks → Mirror Entity X → damage → Najeela WUBRG in end of combat → repeat. |
| When to wipe | Stick Together ("Each player chooses a party … then sacrifices the rest") when opponents have more or bigger creatures and you have a full party. Blasphemous Act ("costs {1} less … for each creature on the battlefield", usually {R}) only when you are losing the board, with Tazri ready to recast. |
| Threat cues | Instant wipes and fogs: alpha only with Intervention up. Initiative: take it only if you can defend it, because three opponents will swing to steal it (CR 726.2). Zagras turns your combat damage to walkers into "destroy that planeswalker". Burakos drains the defending player, so point him at the leader. |

## 6. Misplays to avoid
- Attacking with Najeela, Karlach or Ingris when they don't need to: all three trigger from home.
- Activating Najeela before combat damage (wasted untap), or in the main phase (it is "Activate only during combat").
- Tapping Parade or Najeela tokens made this turn for mana without haste (CR 302.6).
- Mirror Entity for X = 0 (your board dies), or a small X that shrinks Tazri and Zagras.
- Siegebreaker exiling a token (gone for good) or a legendary creature (3 copies → legend rule). Best target: Squad Commander. Seasoned Dungeoneer and White Plume are also good targets: each copy takes the initiative.
- Casting Coveted Prize without a full party at resolution, or to free-cast an X spell (X = 0).
- Land Tax: its intervening "if" is checked again on resolution (ruling, https://scryfall.com/card/soc/153/land-tax). With lands in hand, skip the land drop that would leave no opponent ahead of you at your next upkeep. Three basics beat one land drop.
- Stick Together while you are ahead on board: it is symmetric.
- Counting Najeela tokens or Siegebreaker copies as attackers for Ingris, Harper Recruiter or Najeela (never declared).
- Playing Spelunking after the fetched lands; it only untaps lands that enter later.
- Masked Vandal with no creature card in your graveyard (its exile is "If you do").

## 7. Weak spots
| Threat | Why it hurts | Play around |
|---|---|---|
| Sweepers (Toxic Deluge, Farewell, Cyclonic Rift, Blasphemous Act) | Go-wide board, few card-draw engines off the board | Heroic Intervention / Selfless Spirit / Linvala (destroy-based wipes only). Hold 2 party creatures; Tazri's dig rebuilds |
| Instant-speed blowouts (Settle the Wreckage, fogs) | Every win line is combat | Attack with enough to kill one player, not everything. Hold Intervention. Grand Abolisher on the alpha turn |
| Attack taxes (Ghostly Prison, Propaganda) | Turns off extra combats | Chomping Changeling ("destroy up to one target artifact or enchantment"), Generous Gift, Masked Vandal |
| Big fliers / blockers | Few fliers (Harper, Twilight Prophet, Ingris, Linvala, Zagras, Selfless Spirit) | Midnight Pathlighter, Kamiz, Destined Thief "can't be blocked", Zagras/Nalia deathtouch |
| Fast combo | Alpha comes T6–7, and there are no counterspells | Grand Abolisher only on your turn. Pressure the combo player first and use Linvala's lock on their engine |
| Mana: 5 colours, 34 lands, B and U thinnest | Double-B (Twilight Prophet) and WUB (Destined Warrior, Kamiz) cards strand | Fetch shocks for the missing colour first. Chromatic Lantern, Arcane Signet, Fellwar Stone, Command Tower, Exotic Orchard |
