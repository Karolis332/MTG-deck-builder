# Pearl-Ear, Imperial Advisor — mono-W Aura voltron (paper)

Model list `../../lists/W-pearl-ear-imperial-advisor.txt` (copy: `model.txt`) → `final.txt`.
Objective **77.53 → 83.23** (DS 68.4 → 72.1, role penalty 1 → 0) at 300 games (`score-model.log`, `score-final.log`).
Swap labs: `swaplab.log` (round 1, 12 candidates), `swaplab2.log` (round 2 on `base2.txt`). Applier: `apply.py`.

## Gate (`final.gate.txt`)
PASS size 100, singleton, legality, rules, identity W, ownership. FAIL arenaNames (paper-irrelevant: `//` names),
FAIL plan (known false negative). WARN lands 35 vs Karsten 39±2.

## Plan
Commander oracle: "Lifelink / Enchantment spells you cast have affinity for Auras / Whenever you cast an Aura spell
that targets a modified permanent you control, draw a card. (Equipment, Auras you control, and counters are modifications.)"
- **T1–3:** 1-mana Auras/Equipment (Sentinel's Eyes, Raffine's Guidance, Flickering Ward, Basilisk Collar, Lavaspur Boots),
  cost reducers (Starfield Mystic, Transcendent Envoy, Pearl Medallion), draw engines Sram and Kor Spiritdancer, Pearl-Ear T3.
- **T4–6:** every Aura onto an already-modified creature draws (Pearl-Ear + Sram + Spiritdancer stack); Sage's Reverie,
  Eidolon bestow, Angelic Destiny; Armored Skyhunter / Songbirds' Blessing / Herald of Amity dig Auras; Ajani's Chosen and
  Archon make bodies; Winds of Rath is the one-sided wipe ("Destroy all creatures that aren't enchanted").
- **Close:** Super State (affinity makes the {7} cheap) on a carrier that attacks alone with Yuriko out → double strike:
  9 first-strike + 9 regular, and Super State "deals that much damage to each other opponent" each time = 18 to every
  opponent per swing; Team Avatar adds +X/+X (creatures). Two swings kill the table.
- **Backup:** commander-damage voltron — Eldrazi Conscription (+10/+10, trample, annihilator 2) or Angelic Destiny on
  lifelinked Pearl-Ear; Rogue's Passage / Spirit Mantle for evasion; Shielded by Faith / Redemption Arc / Hammer for indestructible.

## Swaps (11; Δ = each swap alone on the model list, round 2 on base2)
| Out | In | Why | Source | Δ |
|---|---|---|---|---|
| Bloodstained Mire | Plains | fetches only Swamp/Mountain: dead in mono-W | free | +0.04 |
| Wooded Foothills | Plains | fetches only Mountain/Forest: dead | free | +0.06 |
| Riveteers Overlook | Plains | "basic Swamp, Mountain, or Forest": dead | free | +0.04 |
| Maestros Theater | Plains | "basic Island, Swamp, or Mountain": dead | free | +0.06 |
| Dark Depths | Fabled Passage | no Stage/Vesuva (Beledros): taps for nothing | free (3rd copy) | 0.00 |
| Sapphire Medallion | Journey to Nowhere | "Blue spells cost {1} less" is blank; Journey is an enchantment (affinity) removal | free | +1.99 |
| Panharmonicon | Yuriko, Blade of the Mighty | "attacks a player alone, it gains double strike" = closer with Super State; few ETBs to double | free | 0.00 (model blind) |
| Foundry Inspector | Eidolon of Countless Battles | artifact discount off-plan; Eidolon bestow is an Aura spell, +1/+1 per creature and per Aura | free | +3.64 |
| Academy Manufactor | Emeritus of Truce // Swords to Plowshares | Food/Clue engine off-plan; flyer token + prepared Swords (exile creature) | free | +1.97 |
| Giant's Boulder | Team Avatar | 4-mana rock filler; "attacks alone … +X/+X", enchantment (affinity) | free | −0.25 |
| The Echoverse Fulcrum | Shatter the Sky | operator filler; 4-mana one-shot wipe, our indestructible Auras keep the carrier | free | +0.02 |

Rejected by the lab: Fulcrum → Take Up the Shield −4.01 and Kozilek → Rustler Rampage −3.97 (wipe/draw windows drop),
Walking Ballista → Take Up the Shield −3.79 (removal window), Explorer's Scope → Rustler Rampage −5.13 (win step).
Yuriko 0.00: the goldfish has no "attacks alone" / Super State mirror damage — judgment keeps it (closer).

## Raids (kept from the model list; all adds are free)
| Card | Donor |
|---|---|
| All That Glitters, Ancient Den, Final Showdown, Inventors' Fair, Karn's Bastion, Spire of Industry | Inspirit |
| Brokers Hideout, Cabaretti Courtyard, Mangara the Diplomat, Windswept Heath | Tazri |
| Fellwar Stone, Generous Gift, Swords to Plowshares | Inspirit or Tazri (both owned copies sleeved) |
| Erode, Mana Confluence, Path to Exile | Tam |
| Lotus Field, Rogue's Passage, Strip Mine | Bumi |
| Gilded Lotus, Thought Vessel | Imotekh |
| Escape Tunnel, Walking Ballista | Cabbage Merchant |

23 raided cards from 6 decks; none from Beledros. Plains: 8 used here + 5 in Inspirit = 13 owned.

## Risks
- 23 raids: building it physically means backfilling six sleeved decks; land raids (Brokers, Cabaretti, Heath, Escape
  Tunnel, Ancient Den, Spire) could become Plains only after 8 more basics (all 13 owned Plains are used).
- Model is blind to Auras/voltron (Yuriko 0.00, Team Avatar at the −0.25 bar); the closer is judgment, not score.
- 35 lands vs Karsten 39; 10 colourless-only lands (Urza Tron, Lighthouse, Buried Ruin, Strip Mine, Rogue's, Bastion,
  Fair, Nesting Grounds, Reliquary) against a {1}{W}{W} commander — screwT3 14 %.
- Kozilek (10 MV) stays only as a model draw-window keep; voltron = one removal spell away from a reset
  (protection window only 3).
