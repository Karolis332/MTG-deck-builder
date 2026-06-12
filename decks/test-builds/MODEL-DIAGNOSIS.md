# Deck-Builder Model Diagnosis — 2026-06-12

Baseline: 18 builds (9 commanders × commander/brawl), default power level, compared against
EDHREC consensus (json.edhrec.com, 4.9K-41K decks per commander). Overlap = share of EDHREC
average-deck nonlands present in our build.

## Scoreboard (baseline)

| Build | Overlap | Real lands (ours/EDHREC) | Fake lands | Verdict |
|---|---|---|---|---|
| Krenko commander/brawl | 74% / 81% | 29/34 | 9 | Best — tribal path works |
| Sheoldred commander/brawl | 59% / 83% | 32/35 | 8 | Good |
| Ghalta commander/brawl | 62% / 69% | 30/35 | 10 | Good, ramp bloat (21) |
| Magus Lucea Kane cmd/brawl | 52% / 69% | 22/36 | 20 | No X-theme, 42 lands, brawl ILLEGAL (3 cards + commander) |
| Vivi Ornitier cmd/brawl | 51% / 56% | 24/31 | 15 | Proliferate filler; brawl = banned commander, built anyway |
| Heliod cmd/brawl | 49% / 48% | 29/33 | 9 | OK; 1 illegal brawl card |
| Thrasios+Tymna | 49% / 58% | 24/27 | 16 | Partner ignored (GU only), ramp=28 |
| Orvar cmd/brawl | 43% / 72% | 30/33 | 9 | removal=16-19 (bounce overcount) |
| **Ramos 5c** | **4.7% / 6.8%** | **18/36** | **20** | Catastrophic — wrong archetype, no 5c identity, unplayable manabase |

## Root causes (ranked by impact)

1. **Land Intelligence starved**: `land_classifications` table is EMPTY in the production DB —
   `scripts/classify_lands.py` defaults to the legacy `./data/` path and was never run against
   `%APPDATA%/the-black-grimoire`. With it empty: tier defaults to 3, the +30/color match bonus
   never fires (reads `lc.produces_colors` only, ignores `cards.produced_mana`), and the blanket
   `type_line LIKE '%//%'` +25 "MDFC bonus" dominates → manabases fill with modal/transform cards.
2. **Transform cards counted as lands**: `type_line LIKE '%Land%'` matches "Artifact // Land"
   transforms (Dowsing Dagger, Primal Amulet, Growing Rites, Ojer gods) which can never be played
   as lands. 8-20 fake lands per deck; Ramos has 18 real lands.
3. **No commander-legality check**: Vivi (banned in Brawl) and Magus Lucea Kane (not on Arena)
   both produced "successful" Brawl decks.
4. **Arsenal/stat-injection bypasses format legality**: Elementalist's Palette, Tervigon,
   Broodlord (40K, not on Arena) injected into Magus Brawl build; Aura of Silence into Heliod
   brawl; Access Denied into Orvar brawl.
5. **Partner commanders unsupported**: `BuildOptions.commanderName` is a single string;
   `mergeProfiles()` exists in commander-synergy.ts but is never called. Thrasios+Tymna built
   as mono-Thrasios GU.
6. **Missing commander mechanics**: no X-spell detection (Vivi, Magus Lucea Kane), no
   "colors of mana spent / 5-color matters" detection (Ramos → resolved archetype
   "spellslinger", missed Door to Nothingness 38%, Maelstrom Nexus 30%, Omnath 25%, charms),
   no devotion detection (Vivi, Nykthos lines).
7. **Self-only counter text over-triggers themes**: Vivi's "+1/+1 counter on Vivi" pulled a
   proliferate package (Contagion Clasp, Tekuthal, Inexorable Tide, Thrummingbird, Tezzeret's
   Gambit) that 34K EDHREC decks don't play.
8. **Role quota overfill**: removal 16-19 in mono-U (every bounce spell), ramp 21-28
   (Thrasios/Ghalta), lands drift to 40-42; win_condition starves to 1-3.
9. **Staple guarantee gaps**: Ramos build missing Arcane Signet AND Command Tower (5-color!).
10. **Stats-driven cEDH bleed**: default-power Thrasios got Chrome Mox/Mana Vault/Mox Diamond
    because commander_card_stats for cEDH commanders reflect cEDH lists; no power-level damping.

## Infrastructure faults fixed during this session

- **CF API down (502, 1094 restart loops)**: work-hours resource scheduler capped the container
  at 1200MB/0.3cpu (written for the old 4GB VPS; box now has 16GB) — model load needs ~1.4GB.
  Raised to 3G/1cpu work-hours, fixed stale hardcoded container ID, restarted Docker daemon to
  clear wedged host→container TCP path. Health: 200, 2.23M decks, retrained 2026-06-10.
- **Alembic migrations never run on deploy**: `alembic.ini` hardcodes `localhost:5433`
  (grimoire-cf-api repo; needs image rebuild — left as TODO).
- **Card DB 5 weeks stale**: refreshed from Scryfall bulk (+1,189 cards incl. Marvel/TMNT/SOS
  sets; legalities/prices/EDHREC ranks updated). New `scripts/update-card-data.ts` resolves the
  APPDATA production DB correctly.
