# Ramos Deck Comparison — Mine vs Model vs Hybrid

## Files in this folder
- `ramos-mine.txt` — My optimal 99 — **Grade 85/100**
- `ramos-model.txt` — Model's implicit 99 (extrapolated from commander_card_stats) — **Grade 72/100**
- `ramos-best-of-both.txt` — Hybrid — **Grade 93/100**

## Import to Arena
1. Open MTG Arena → Decks → Import
2. Paste contents of any `.txt` (lines starting with `//` are ignored by Arena)
3. Arena will flag missing cards as wildcards to craft

## Card-by-card diff: Mine vs Best-of-Both

### Removed from Mine → Added to Best-of-Both
| Removed | Why removed | Added | Why added |
|---|---|---|---|
| Mox Amber | Few legendaries to enable it (only Ramos, Kenrith, Omnath, Aragorn) | **Door to Nothingness** | Alt-win exiles opponent for WUBRG = Ramos colors literally |
| Mox Opal | Metalcraft needs 3 artifacts; not reliable | **Maelstrom Archangel** | Free cast spells off combat damage; flier evades |
| Deflecting Palm | Situational, narrow vs creature combat in 1v1 | **Maelstrom Nexus** | Cascade first spell each turn — turns a charm into a free 2-3-cost spell |
| Bramble Familiar | 3-CMC 2/1 that fetches land is filler in 5C | **Aragorn, the Uniter** | 5-mana cascade + scry, real beater |
| Erode | Conditional counterspell vs creatures only | **Hardened Scales** ★★ | DOUBLES every Ramos counter trigger — single most impactful add |

### Card-by-card diff: Model vs Best-of-Both

**Model picks I rejected:**
- Mystic Monastery, Sandsteppe Citadel, Seaside Citadel, Jungle Shrine, Opulent Palace, Arcane Sanctum, Crumbling Necropolis, Savage Lands — 8 tri-lands that all ETB tapped. Replaced with 9 shocks + 2 fetches.
- Bloom Tender, Faeburrow Elder, Swords to Plowshares — paper-only, not on Arena
- Chromatic Lantern — 3 CMC for fixing; my 5 Talismans are 2 CMC and add Ramos triggers
- Reliquary Tower, Lightning Greaves, Swiftfoot Boots — generic EDH staples, low Ramos signal
- Ruinous Ultimatum, Eerie Ultimatum, Duneblast — too top-heavy for 1v1 Brawl tempo
- Whirlwind of Thought, Tome of the Guildpact — slot fillers vs my Kaito + IGS
- Settle the Wreckage, Crackling Doom — narrow removal vs my Helix/Dreadbore/Fell the Profane

**Model picks I accepted (and added):**
- ★ Door to Nothingness — biggest miss in my original
- ★ Maelstrom Archangel
- ★ Maelstrom Nexus
- ★ Aragorn, the Uniter
- ★ Hardened Scales (the model under-weighted this; raw inclusion is only 16%)

**Model picks worth considering but not added (already at 99):**
- Cultivate — slightly better than Farseek but Farseek is in your pool
- Mirari's Wake — anthem + double mana; good but no room
- Conflux — 8-mana tutor; slower than Bring to Light
- Dryad of the Ilysian Grove — ramp + 5C fix; redundant with Leyline of the Guildpact

## Wildcards needed for the Best-of-Both upgrades
(assuming you already have the cards in `ramos-mine.txt`)
- **Door to Nothingness** — rare (1 rare wildcard)
- **Maelstrom Archangel** — rare
- **Maelstrom Nexus** — rare
- **Aragorn, the Uniter** — mythic
- **Hardened Scales** — uncommon

Total: 3 rare + 1 mythic + 1 uncommon = **5 wildcards to push deck from 85 → 93**.

## Why the grades

| Category | Mine | Model | Hybrid | Notes |
|---|---|---|---|---|
| Mana base | 18 / 20 | 13 / 20 | 18 / 20 | Hybrid keeps fast shocks |
| Ramp | 13 / 15 | 14 / 15 | 13 / 15 | Hybrid same as mine |
| Draw | 11 / 15 | 8 / 15 | 11 / 15 | Hybrid same as mine |
| Removal | 11 / 15 | 10 / 15 | 11 / 15 | -1 piece (Erode) acceptable |
| Synergy | 14 / 15 | 12 / 15 | 15 / 15 | Hybrid gains Hardened Scales |
| Wincons | 8 / 10 | 9 / 10 | 10 / 10 | Hybrid gets all of model's finishers |
| Curve | 5 / 5 | 3 / 5 | 5 / 5 | Hybrid stays low-curve |
| Format fit | 5 / 5 | 3 / 5 | 5 / 5 | 1v1 Brawl optimized |
| **TOTAL** | **85** | **72** | **93** | |
