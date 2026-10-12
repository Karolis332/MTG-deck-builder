# Magda, the Hoardmaster — mono-R build (2026-10-09)

**Result:** `final.txt` objective **79.00** (model list 78.62), Deck Score **66.5** (flat: model blind to every swap),
role penalty 0 (ramp 12 / draw 12 / removal 12 / wipes 4 / protection 4), commander on curve .69 → .84, lands by T4 .73 → .76.
**Gate:** all PASS except `plan` (known false negative) and lands WARN (38 vs Karsten 41±2). Output: `gate.txt`.

## Commander (q.py oracle)
> Whenever you commit a crime, create a tapped Treasure token. This ability triggers only once each turn. /
> Sacrifice three Treasures: Create a 4/4 red Scorpion Dragon creature token with flying and haste. Activate only as a sorcery.

No outlaw clause: the "outlaws" premise is wrong. The list has one outlaw (Deadeye Duelist, Assassin) and needs none.
What matters: one crime on **every player's turn** = up to 4 Treasures per round = a 4/4 flying haste Dragon most turns.

## Plan
- **T1–3:** Magda T2 (fast lands, Signet, Fellwar, Bauble). Instant-speed crimes on each opponent's turn:
  Deadeye Duelist (`{1},{T}: 1 damage to target opponent`), Unlicensed Hearse (`{T}: Exile up to two target cards from a single graveyard`),
  Mishra's Bauble, Mirage Mirror, Walking Ballista, Strip Mine / Volatile Fault → a Treasure every turn.
- **T4–6:** cash 3 Treasures into Dragons at sorcery speed; land Terror of the Peaks / Warstorm Surge
  (`Whenever another creature you control enters, this creature deals damage equal to that creature's power to any target`)
  — the trigger targeting an opponent is itself a crime. Jaya adds +1 to every red source.
- **Close (T7–9):** Dragon token = 4 flying haste + 4 burn (5 with Jaya); Karlach's extra combat, Sarkhan the Masterless,
  Drakuseth. Backup: Steel Hellkite / Hoard-Smelter one-sided removal grind.
- **Closer:** Terror of the Peaks (or Warstorm Surge) + Magda Dragon tokens.

## Swaps (11; swap lab `lab2.txt`, 300 games, each alone vs model list)
| Out | In | Why | Source | Δ |
|---|---|---|---|---|
| Emerald Medallion | Mazemind Tome | Medallion: "Green spells you cast cost {1} less" — dead in mono-R. Tome: "{2},{T}: Draw a card" | FREE | −2.00* |
| Decanter of Endless Water | Arcane Signet | 2-mana rock for a 3-mana rock (operator keep-list) | FREE | +0.01 |
| Pearl Medallion | Sarkhan, the Dragonspeaker | dead card → "−3: deals 4 damage to target creature" (crime) / "+1: becomes 4/4 Dragon" | FREE | 0.00 |
| Sapphire Medallion | Steel Hellkite | dead card → flying Dragon, "{X}: Destroy each nonland permanent with mana value X" of players it hit | FREE | +0.02 |
| Alhammarret's Archive | Jaya, Venerated Firemage | lifegain doubler off-plan → "another red source … deals that much damage plus 1" (Terror, Duelist, Drakuseth) | FREE | −0.01 |
| Winter, Team Player | Chandra, Fire Artisan | +1/+0 anthem → "+1: Exile the top card… You may play it", loyalty loss burns target opponent (crime) | FREE | −0.02 |
| Brokers Hideout | Mountain | fetches "Forest, Plains, or Island" — dead; frees a Tazri raid | basic | +0.07 |
| Windswept Heath | Mountain | fetches "Forest or Plains" — dead; frees a Tazri raid | basic | +0.07 |
| Reliquary Tower | Mountain | colourless filler | basic | +0.04 |
| Muraganda Raceway | Mountain | colourless filler | basic | +0.04 |
| Nesting Grounds | Mountain | colourless filler | basic | +0.06 |

\* Tome alone pushes draw to 13 (window penalty −2); with Archive out the set is back at draw 12, penalty 0.
Mountains 4 → 9: the model list ran 7 basic-fetchers (Mire, Courtyard, Theater, Overlook, Foothills, Escape Tunnel, Ash Barrens)
+ Hart/Solemn/Wayfarer's Bauble for 4 Mountains, and RR costs (Terror, Sarkhan ×2, Karlach, Return the Favor).
Dropped: Cloud Key → Skullcrack (removal 13 = window penalty; Skullcrack only hits players).
Kept on judgment: Descendants' Fury (sac a Dragon token that connected → put a Dragon card onto the battlefield: Terror, Drakuseth,
Hoard-Smelter, Steel Hellkite).

## Raids (41 cards, all inherited from the model list; my swaps removed 3: Emerald Medallion, Brokers Hideout, Windswept Heath)
| Donor | n | Cards |
|---|---|---|
| inspirit-flagship-vessel | 9 | Abrade, Chaos Warp, Fellwar Stone (2nd copy is in Tazri; take either), Great Furnace, Inventors' Fair, Karn's Bastion, Panharmonicon, Spire of Industry, Steel Overseer |
| gilanra-alena-partners | 7 | Combustible Gearhulk, Drakuseth, Etali, Hoard-Smelter Dragon, Spinerock Knoll, Terror of the Peaks, Warstorm Surge |
| tam-the-possibility | 6 | Ajani Unrelenting, Chandra Awakened Inferno, Chimil, Great Hall of the Citadel, Mana Confluence, Sarkhan the Masterless |
| tazri-beacon-of-unity | 6 | Blasphemous Act, Bloodstained Mire, Cabaretti Courtyard, Karlach, Wooded Foothills (+ Fellwar alt) |
| bumi-unleashed | 6 | Faithless Looting, Lotus Field, Rogue's Passage, Seize the Spoils, Strip Mine, Thrill of Possibility |
| the-cabbage-merchant | 5 | Academy Manufactor, Escape Tunnel, Ginger Queen of Sweets, Syr Ginger, Walking Ballista |
| imotekh-the-stormlord | 3 | Foundry Inspector, Gilded Lotus, Myr Retriever |
Beledros: none. Sol Ring and Command Tower: all copies sleeved — not raided (Signet added instead).

## Risks
- 41 raids from 7 sleeved decks: building this guts Gilanra (Terror, Warstorm, Drakuseth) and Inspirit; each needs backfills first.
- Model is blind to the crime/Treasure engine: every swap scored DS-flat; objective 79 ≈ Calamity 78.7 — no proven edge.
- Treasures arrive tapped and the Dragon is sorcery-speed: a wipe on the Treasure pile resets the clock; Magda is a 2/2 and dies to any sweeper or 2-damage ping.
- 38 lands with ~14 colourless utility lands; Karsten wants 41. Tron trio stays (model pick) but rarely assembles.
- Ajani's −3 (4 to each creature except my tokens) also kills Magda.
