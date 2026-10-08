# Tazri, Beacon of Unity — review (2026-10-09)

**Base for the swaps: `verify-2026-10-09/tazri/tazri-final.txt`** (the judgment list). Result: `tazri-proposed.txt` (100 cards, singleton, all in W/U/B/R/G, all owned).

## Scores (score.ts, 300 games)
| List | Objective | Deck Score | win | adv | Penalty | Tazri on curve | Dig hits* |
|---|---|---|---|---|---|---|---|
| Sleeved | 62.61 | 75.0 | 69 | 65 | 12 (ramp 17, removal 6, wipes 1) | .56 | 42 |
| Model climb `tazri-model.txt` | 97.86 | 86.1 | 83 | 75 | 0 | .64 | 34 |
| `tazri-final.txt` (base) | 88.94 | 77.5 | 72 | 70 | 0 | .53 | 23 |
| **Proposed (final + 8 swaps)** | **88.92** | **77.5** | 72 | 70 | 0 | .51 | **30** |

*Creatures Tazri's dig can take (Cleric/Rogue/Warrior/Wizard, changeling, "also a Cleric, Rogue, Warrior, and Wizard").

Sleeved → final (+26) is window repair (ramp 17→11, removal 6→11, wipes 1→3) and better lands. The model scores the 8 swaps as flat (−0.02): it can't see party density or dig hits, so these swaps are a judgment call. The model list's +9 over final comes from the win component's close-turn step (83 vs 72), not from better cards.

## Model cuts / adds (model list vs final)
- **Cuts I reject:** Sol Ring, Arcane Signet, Command Tower (operator rule). Blade Historian, Jazal, Karlach, Panharmonicon, Terror of the Peaks (the model can't see these).
- **Adds I take:** the sleeved party bodies it kept: Squad Commander, Linvala, Harper Recruiter, Nimble Trapfinder, Tajuru Paragon, Undermountain Adventurer.
- **Filler adds I reject:** The Echoverse Fulcrum, Reliquary Tower, Simic Guildgate, Manor Gate, Basilisk Gate, Commander's Sphere, Dread Presence (a Swamp payoff in a deck with 3 Swamps), and basics in place of duals.

## Main flaw in tazri-final
The final dropped Tazri's dig hits from 42 to 23. Top six: about 1.4 expected hits, down from 2.5. Its adds were non-party: Varis (Ranger), Caves of Chaos (Barbarian), Triumphant (Knight), Toski (Squirrel), Channeler (Druid). Acererak never stays on the battlefield: "When Acererak enters, if you haven't completed Tomb of Annihilation, return Acererak to its owner's hand". The 8 swaps bring dig hits back to 30, cost 0 points on the score and return both Cabbage raids.

## Swaps (relative to tazri-final.txt)
Δ = each swap alone (`swaps-2.log`, `swaps-3.log`). All 8 together (`score-proposed.txt`): −0.02.

| # | Out | In | Why (oracle) | Source | Δ |
|---|---|---|---|---|---|
| 1 | Toski, Bearer of Secrets | Squad Commander | "create a 1/1 white Kor Warrior creature token for each creature in your party" + full party: "+1/+0 and gain indestructible". Panharmonicon doubles the ETB, Terror pings, the tokens are Warriors for Najeela. Toski repeats Recon Mission | free (Toski back to Cabbage) | −2.01 alone = draw window; 0 in the set |
| 2 | Return of the Wildspeaker | Harper Recruiter | Return counts "non-Human creatures" and most of the party is Human. Harper: "Whenever this creature attacks, look at the top four … reveal a Cleric … Rogue … Warrior … Wizard card" | free (Return back to Cabbage) | +0.01 |
| 3 | Varis, Silverymoon Ranger | Tajuru Paragon | Paragon "is also a Cleric, Rogue, Warrior, and Wizard": a 2-drop that fills any slot. Kicked: "reveal the top six … a card that shares a creature type" | free | +0.02 |
| 4 | Acererak the Archlich | Linvala, Shield of Sea Gate | Wizard that stays. Full party: "it can't attack or block, and its activated abilities can't be activated". "Sacrifice Linvala: … hexproof or indestructible" | free | −0.01 |
| 5 | Caves of Chaos Adventurer | Undermountain Adventurer | Same "you take the initiative", plus a Warrior and "{T}: Add {G}{G}" (six with a completed dungeon) | free | +0.08 |
| 6 | Triumphant Adventurer | Nimble Trapfinder | Rogue 2-drop. Full party: creatures gain "Whenever this creature deals combat damage to a player, draw a card" | free | +0.02 |
| 7 | Bident of Thassa | Mindblade Render | Bident is a second UU Recon Mission. Render is a 2-mana Warrior: "if any of that damage was dealt by a Warrior, you draw a card" | free | −0.01 |
| 8 | Channeler Initiate | Samut, Voice of Dissent | Alpha enabler and Warrior: "Flash / Double strike, vigilance, haste / Other creatures you control have haste". Ramp stays at 11 through Undermountain | free | −0.12 |

All 8 adds are free (in the Tazri file or loose). Rejected: Pyrewood Gearhulk → Samut read −7.43 (win 72→63, the close-turn step), so Gearhulk stays as a Gilanra raid. Counterspell → Squad Commander read −1.17 (interaction). Boros Charm → Squad Commander read −1.18.

## Raids left in the proposed list (operator: all decks except Beledros are free game)
- **Tam 11:** Bloom Tender, Faeburrow Elder, Path to Exile, Anguished Unmaking, Assassin's Trophy, Mana Confluence, Breeding Pool, Nomad Outpost, Opulent Palace, Seaside Citadel, + Shivan Reef shared with Inspirit.
- **Inspirit 5:** Cyclonic Rift, Boros Charm, Panharmonicon, Battlefield Forge, Adarkar Wastes.
- **Gilanra 2:** Pyrewood Gearhulk, Terror of the Peaks.
- **One Mountain:** all 26 registered copies are already in decks.
- **Cabbage:** 0 (was 2).

## Plan and win lines
- **Primary: full-party alpha.** Tazri dig → full party → The Destined Warrior ("If you have a full party, creatures you control get +3/+0"), Blade Historian ("Attacking creatures you control have double strike"), Squad Commander indestructible, Jazal ("+X/+X … where X is the number of attacking creatures"), Samut haste. Extra combats from Karlach ("untap all attacking creatures … additional combat phase"), Najeela (WUBRG) and Moraug. Beginning-of-combat triggers (Destined Warrior, Squad Commander, Nalia, Linvala, Trapfinder, Archpriest) trigger again in each extra combat. ✅ Verified against oracle.
- **Backup: initiative/dungeon value** (White Plume, Seasoned Dungeoneer, Ravenloft, Undermountain, Hama Pashar "Room abilities … trigger an additional time", Nadaar "+1/+1 as long as you've completed a dungeon"). This is card flow, not a kill. ⚠️ Treat it as a grind plan, not a second win line.
- Najeela + Springleaf Parade infinite combats (guide line 3) is valid by oracle, but ❌ Parade is not in tazri-final or the proposed list. Ingris (line 4) and Siegebreaker (engine #7) are also gone.

## Guide errors (`.claude/skills/deck-building/reference/decks/tazri-beacon-of-unity.md`)
1. §4 hand 1 says "T4 Tazri at {1}{W}". Weathered Wayfarer ("Human Nomad Cleric") and Torens ("Human Cleric") are both Clerics, so the party is 2 (Cleric + Trapfinder's Rogue) and Tazri costs {2}{W}.
2. §4 hand 3 says Tazri costs "{W} on T4" with three party bodies. Tazri "costs {1} less … for each creature in your party", so 3 → {1}{W}.
3. §2 #6 says Mirror Entity is "X² damage per token". The card gives each creature "base power and toughness X/X", so it's X per creature and about X² in total.
4. §2 #10 says "Fetch Najeela … to hard-cast". Najeela is MV 3, so Coveted Prize can cast it free ("mana value 4 or less").
5. Stale against tazri-final/proposed: the header (43 creatures, 41 party); §7 "there are no counterspells" (final runs Counterspell); and the cut cards it still names (Grand Abolisher, Springleaf Parade, Ingris, Siegebreaker, Kamiz, Zagras, Stick Together, Wayfarer, Torens, Chromatic Lantern). Rewrite the guide after the list is chosen.

## Risks
- The score can't see these swaps (77.5 flat). The case for them is judgment: dig density 23→30, which also feeds Archpriest, Burakos, Veteran Adventurer and Coveted Prize.
- Tam is top priority and gives up 11 cards, its removal and mana core included. Back those slots before sleeving.
- Gilanra's stompy redraft wants Gearhulk and Terror. If both decks are sleeved, Tazri needs a replacement for each (Samut or Mirri, Weatherlight Duelist).
- No refuter pass. 300-game noise is about ±0.1.
