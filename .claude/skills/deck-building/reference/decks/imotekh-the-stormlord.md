# Imotekh the Stormlord — pilot guide (paper, 4-player pod, 40 life)

Review 2026-10-09: proposed swaps in verify-2026-10-09/color-best/eval/imotekh-the-stormlord/REVIEW.md (refuted: REFUTE.md), not yet applied.

List: `decks/paper/decks/imotekh-the-stormlord.txt` (100). 35 lands (32 Swamp, Crypt of Agadeem, Mortuary Mire, Myriad Landscape). Ramp: Sol Ring, Arcane Signet, Thought Vessel, Gilded Lotus, The Soul Stone, Wayfarer's Bauble, Charcoal Diamond, Solemn, Crypt Ghast, Culling the Weak, Illuminor Szeras. Oracle from the DB. Rulings: Scryfall API, CR at https://yawgatog.com/resources/magic-rules/.

## 1. Plan in 3 lines
- Fill the graveyard with artifact creatures (mill, sacrifice), then pull them back out. Imotekh: "Whenever one or more artifact cards leave your graveyard, create two 2/2 black Necron Warrior artifact creature tokens."
- Biotransference makes "creature cards you own that aren't on the battlefield" artifacts, so every reanimation, unearth and rebuy counts. Warriors feed Zealot, Woe Strider and Szeras.
- Each sacrificed Warrior drains. Close with drain attrition, Necron Overlord, Marionette Master, a Legion swing, or the Metalwork Colossus loop.

| # | Win line (most frequent first) | Closer text (DB) |
|---|---|---|
| 1 | Drain attrition off token deaths | Marionette Apprentice: "Whenever another creature or artifact you control is put into a graveyard from the battlefield, each opponent loses 1 life." · Mirkwood Bats: "Whenever you create or sacrifice a token, each opponent loses 1 life." · Syr Konrad (also "a creature card leaves your graveyard") · Psychomancer: "target opponent loses 1 life and you gain 1 life" |
| 2 | Necron Overlord | "{X}, {T}, Tap X untapped artifacts you control: Target opponent loses X life." Summoning-sick Warriors can pay this, because CR 302.6 restricts only a creature's own {T} abilities. |
| 3 | Marionette Master | "Whenever an artifact you control is put into a graveyard from the battlefield, target opponent loses life equal to this creature's power." Take Fabricate 3 as counters (power 4). Under Biotransference, Imotekh's "+2/+2" can target it. |
| 4 | Metalwork Colossus loop | §2 row 6: unbounded drains with Konrad/Apprentice/Bats on board |
| 5 | Legion swing | Their Number Is Legion: "Create X tapped 2/2 … You may cast this card from your graveyard." Crypt Ghast doubles the X. |
| 6 | Portal to Phyrexia | "each opponent sacrifices three creatures", then a reanimation every upkeep. Anrakyr casts it "by paying life equal to its mana value" (9). |

## 2. Engine map
| # | Interaction | Text (DB) | Why it works / caveat |
|---|---|---|---|
| 1 | Ways to trigger Imotekh | Unearth: Chronomancer {2}{B}, Royal Warden {3}{B}, Triarch Praetorian {4}{B}, Lokhust {5}{B}{B}{B} · Reanimate, Dread Return, Black Sun's Twilight (X ≥ 5), Lively Dirge, Technomancer, The War in Heaven III, Liliana the Repentant exhaust, Soul Stone ∞, Archenemy's Charm, Lychguard · Myr Retriever: "return another target artifact card from your graveyard to your hand" · Mortuary Mire · Colossus self-return · Anrakyr casting from the graveyard | Each is an artifact card leaving your yard. Without Biotransference only Necrons, Solemn, Myr Retriever, Colossus, Foundry Inspector and Canoptek Wraith are artifact creature cards. |
| 2 | One trigger per event | Ruling: "If multiple artifact cards leave your graveyard at the same time, the first ability triggers only once" ([Imotekh rulings](https://api.scryfall.com/cards/286ff901-1faf-4a02-a37a-fa165989112f/rulings)) | Lively Dirge (two cards), War in Heaven (three), Technomancer and Lychguard each give **2 tokens total**. Separate unearths give 2 tokens each. |
| 3 | Biotransference | "Creatures you control are artifacts … Whenever you cast an artifact spell, you lose 1 life and create a 2/2 black Necron Warrior artifact creature token." | Every creature spell becomes a Warrior. Konrad, Ghast, Bats, Apprentice, Master and Zealot become artifacts. Their Name Is Death ("Destroy all nonartifact creatures") and Scriptures II become one-sided. |
| 4 | Ghost Ark | "Whenever this Vehicle becomes crewed, each artifact creature card in your graveyard gains unearth {3} until end of turn. / Crew 2" | Crew taps "other untapped creatures" (CR 702.122a). That is a cost, not their {T}, so fresh Warriors can crew. The grant applies only to cards in the yard as the trigger resolves ([rulings](https://api.scryfall.com/cards/2c6865c1-8144-4b06-a599-a62382fe1124/rulings)). |
| 5 | Cryptek loop piece | "{1}{B}, {T}: Choose another target artifact creature you control. When that creature dies this turn, return it to the battlefield tapped" | Target Triarch Praetorian ("When this creature enters from a graveyard, you draw two cards"), Royal Warden (two Warriors) or Technomancer, then sacrifice it. You get the death drains, the ETB again, and an Imotekh trigger as it leaves the yard. |
| 6 | Metalwork Colossus loop | "This spell costs {X} less to cast, where X is the total mana value of noncreature artifacts you control. / Sacrifice two artifacts: Return this card from your graveyard to your hand." | 1. Cast Colossus. 2. Sacrifice it to Umbral Collar Zealot ("Sacrifice another creature or artifact: Surveil 1") or Woe Strider ("Sacrifice another creature: Scry 1"). 3. Sacrifice two Warriors to return it, which triggers Imotekh (+2 Warriors). 4. Repeat. Neither outlet makes mana, so the loop needs Colossus to cost {0}: ≥ 11 noncreature-artifact MV ([ruling](https://api.scryfall.com/cards/d7e2d686-1fbc-449a-9af4-f00a71ff7911/rulings)). Per loop, each opponent takes Konrad 4 (3 deaths + 1 card leaving), Apprentice 3 and Bats 4 (one per token, CR 603.2c). |
| 7 | Colossus as an instant-speed converter | same | Bin it with Buried Alive, Lively Dirge "+ {1}", or Bitter Triumph's "discard a card". Sacrificing two Warriors at any time then rebuilds two Warriors, and the sacrifices drain. |
| 8 | Trazyn | "it has all activated abilities of all artifact cards in your graveyard" | Szeras in the yard gives Trazyn a {T} mana outlet; Chronomancer gives it draw, Necron Overlord drain. Szeras is an artifact creature, so it counts in the yard anyway; under Bio, Zealot counts too and makes Trazyn a free outlet. Ruling: "this card" text refers to Trazyn ([rulings](https://api.scryfall.com/cards/1ae95cfb-1c3e-43cc-acfa-68f25b0f6e52/rulings)), so Colossus's return does nothing and Bauble's "Sacrifice this artifact" sacrifices Trazyn. Unearth works only from the graveyard (CR 702.84a). |
| 9 | Crypt Ghast mana | "Whenever you tap a Swamp for mana, add an additional {B}." | With 32 Swamps it doubles Legion X, Overlord X, unearth and Ark costs. |

**Does NOT work the way it looks**
- ❌ **Unearthed creatures don't die.** "If it would leave the battlefield, exile it instead" (CR 702.84a; the same applies to Ghost Ark grants).
  - No Konrad, Apprentice, Master, Myr Retriever or Cryptek on their death.
  - Only Psychomancer still fires ("or is put into exile from the battlefield").
  - Szeras still pays {B} equal to its mana value, because the sacrifice is the cost.
- ❌ **The Darkness Crystal:** "If a nontoken creature an opponent controls would die, instead exile it."
  - Konrad gets nothing from opposing creatures.
  - Portal, Reanimate and Dread Return lose opposing targets.
  - Phyrexian Scriptures III ("Exile all opponents' graveyards") does the same.
- ⚠️ **Liliana the Repentant decks you during loops.** "Whenever another creature or planeswalker you control enters, mill two cards" is mandatory. Each Colossus pass re-enters Colossus and makes 2–3 Warriors: 3–4 enters, 6–8 cards milled. The trigger cannot be skipped: sacrifice Liliana first, or stop the loop with library to spare.
- ⚠️ **Biotransference costs life during the loop.** "you lose 1 life" per Colossus cast. Psychomancer's +1 offsets it.
- ⚠️ **Wishclaw Talisman gives the opponent a tutor.** "An opponent gains control of this artifact". They may tutor on their turn and hand it to someone. Use it only for the winning piece.

## 3. Turn by turn
| Turn | Ideal | Realistic (average hand) |
|---|---|---|
| T1 | Swamp, Sol Ring | Swamp, Wayfarer's Bauble |
| T2 | Swamp, **Imotekh** (BB + Sol Ring) | Arcane Signet or Psychomancer / Umbral Collar Zealot |
| T3 | Biotransference | Ripples of Undeath; Flayed One milling 3 |
| T4 | Buried Alive (Royal Warden, Triarch Praetorian, Metalwork Colossus) | **Imotekh**; Deadly Dispute on a spare artifact |
| T5 | Unearth Royal Warden ({3}{B}): 2 Warriors from Imotekh + "create two tapped 2/2" from Warden; Grand Strategist on the hasty Warden | Reanimate / Lively Dirge / unearth one at a time for multiple triggers; Marionette Apprentice |
| T6 | Ghost Ark, Crew 2 with Warriors, unearth Praetorian ({3}): draw 2 + 2 Warriors; sacrifice two Warriors to return Colossus (+2 Warriors). Next turn: Master / Overlord, or the Colossus loop at noncreature-artifact MV ≥ 11 with Zealot or Woe Strider | Crypt Ghast or Royal Warden |

## 4. Mulligan
Keep: 3+ lands, or 2 + Sol Ring/Signet. You also need a cheap artifact body or a yard filler. Imotekh is in the command zone; the hand only needs to fuel him.

| Keep | Why |
|---|---|
| Swamp, Swamp, Swamp, Sol Ring, Psychomancer, Deadly Dispute, Buried Alive | Imotekh T3; Dispute sacrifices Psychomancer (drain + artifact in the yard); Buried Alive sets up Colossus |
| Swamp, Swamp, Crypt of Agadeem, Arcane Signet, Umbral Collar Zealot, Biotransference, Reanimate | Bio T3 then Imotekh; Zealot surveils targets for Reanimate |
| Swamp, Swamp, Swamp, Mortuary Mire, Flayed One, Marionette Apprentice, Insatiable Avarice | Lands, card flow, a yard filler and a payoff |

| Mulligan | Why |
|---|---|
| Swamp, Metalwork Colossus, Portal to Phyrexia, Technomancer, Their Name Is Death, The War in Heaven, Gilded Lotus | 1 land; everything costs 5+ (Colossus is not cheap without a board) |
| Swamp ×5, Myriad Landscape, Culling the Weak | Flood; Culling has nothing to cast or sacrifice |
| Swamp, Swamp, Dread Return, Reanimate, Black Sun's Twilight, Feed the Swarm, Dismember | No ramp, no bodies; graveyard spells with an empty yard |

## 5. Lines to visualise each turn
- **Sequence one return per event:** unearth one creature, resolve, then the next. Two cards back at once is one trigger (§2 row 2).
- **Hold up:**
  - Necron Deathmark (Flash, "destroy up to one target creature").
  - Bitter Triumph and Dismember (castable for {1} + 4 life).
- **Before the combo turn:** count noncreature-artifact MV for Colossus: Sol Ring 1, Bauble 1, Signet 2, Charcoal Diamond 2, Vessel 2, Soul Stone 2, Wishclaw 2, Crystal 4, Ghost Ark 4 (uncrewed), Lotus 5, Portal 9. Also check that no Liliana the Repentant is out (§2).
- **Wipes:** cast Their Name Is Death or Scriptures (II fires a turn later) only with Biotransference out, or when all your creatures are Necrons or Warriors. Without Bio, Konrad, Ghast, Bats, Apprentice, Master and Zealot die.
- **Combat:** Grand Strategist gives "another target artifact creature … +2/+2 and gains menace" at the start of combat. Put it on the creature that must connect (Szarekh "mill three … put an artifact creature card … into your hand") or on Master.
- **Life budget:** Ripples ("pay {1} and 3 life"), Bio, Reanimate, Dismember and Anrakyr all cost life. Stay above about 15 before going for Anrakyr or Portal lines.
- **Threat cues:**
  - Kill graveyard hate and artifact hate first.
  - Your yard being exiled still counts as "leave your graveyard": one Imotekh trigger, 2 Warriors.

## 6. Misplays to avoid
1. Casting Lively Dirge or War in Heaven for "two or three triggers". It is one.
2. Unearthing creatures to sacrifice for death drains. They are exiled; only Psychomancer and the Szeras mana count.
3. Their Name Is Death without Biotransference while your payoffs are non-artifacts.
4. Playing The Darkness Crystal when Konrad, Portal or Reanimate want opposing graveyards and creatures to die.
5. Going infinite with Liliana the Repentant on board.
6. Using Wishclaw early. It gives a tutor to the table.
7. Fabricate 3 as Servos on Marionette Master when it is the closer. Counters make its power 4.
8. Crewing Ghost Ark before the unearth targets are in the graveyard. The grant is fixed on resolution.
9. Forgetting Myr Retriever's death trigger. Target an artifact card for the extra Imotekh trigger, not just value.

## 7. Weak spots and how to play around them
| Threat | Why it hurts | Play-around |
|---|---|---|
| Graveyard exile / "cards can't enter from graveyards" pieces | Every Imotekh trigger and reanimation needs your yard | Bait the hate with a small target first; keep Colossus in hand (Bitter Triumph discard when ready); Feed the Swarm ("creature or enchantment") answers enchantment-based hate |
| Artifact wipes / artifact hate | Rocks, Warriors, Necrons and Bio-artifact creatures all die | Don't overextend Warriors before payoffs; Mortuary Mire and Archenemy's Charm rebuild |
| Counterspells on Bio / Colossus | No protection spells | Play Imotekh triggers through abilities (unearth, Ark, Cryptek), which cannot be countered by spell counters |
| Fast combo | Interaction is creature removal only | Hold Deathmark/Bitter Triumph for the combo creature; race with Overlord |
| Life loss | Many self-costs; low life invites attacks | Psychomancer, Bio-free turns, Their Number Is Legion "gain life equal to the number of artifacts you control" |
