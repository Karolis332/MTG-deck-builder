---
name: Active paper Commander builds
description: User's current paper Commander decks plus the workflow for evaluating new card pulls against existing builds.
type: project
originSessionId: b9a5eeb4-e573-4c8e-8822-d9746090660f
---
## Active paper builds (Desktop/MTG decks/, with space)
- `1 Meren of Clan Nel Toth.txt` — BG sacrifice/recursion, bracket 2-3, no cEDH staples
- `1 Tazri, Beacon of Unity.txt` — 5C allies
- **Krenko, Mob Boss** (mono-R goblins, 2026-05-20 build) — derived from cut Grenzo Rakdos "grub" deck after removing all black + lands; rebuilt with Foundations/Strixhaven/MH3/Red.txt/Manabox pulls.

## Card-pull workflow
Pulls arrive as plain-text scans in `~/Downloads/` (e.g. `manabox-scan-YYYY-MM-DD.txt`, `Red.txt`, `foundtaions.txt`, `strixhaven.txt`). Format: `<count> <name> (<set>) <number>`.

**Why:** User actively expands paper decks from physical pulls and wants Claude to evaluate them against existing builds.

**How to apply:**
1. When user references a Downloads file, read it directly — don't search.
2. Filter pulls by target deck's color identity before suggesting.
3. Cross-check against existing decklist to avoid recommending duplicates.
4. For mono-color decks, flag any card whose color identity is unverified (especially multi-set reprints, DFCs, Phyrexian-mana cards).

## Krenko deck identity (for future reference)
- Bracket 2-3 power level (per `feedback_deck_power_level.md`)
- 37 lands, ~9 ramp, goblin-heavy curve
- Key engines: Krenko + Mirrormind Crown, Goblin Goliath, Mirror March, Leyline of Resonance
- Wincons: Impact Tremors damage, Devouring Hellion sac finisher, Avatar of Slaughter, Fling

## Meren upgrades pending paper update (2026-05-21)
Five swaps to apply to `1 Meren of Clan Nel Toth.txt`:

| Cut | Add |
|-----|-----|
| Wake the Dead | Invasion of Ikoria |
| Witherbloom Charm | Saw in Half |
| Elvish Mystic | Ashnod's Altar |
| Llanowar Elves | Victimize |
| Priest of Forgotten Gods | Boggart Trawler |

**Why these:** Invasion of Ikoria = tutor-to-battlefield. Saw in Half = death-trigger multiplier. Ashnod's Altar = top-5 Meren staple. Victimize = upgrade over Wake/Dread Return. Boggart Trawler = ETB sac + draw.

## Reference: MTG color identity rule (UB sets)
CR 903.4: color identity = mana cost colors + all mana symbols in rules text (excluding reminder text and "any color" wording).

**Trap cases in Universes Beyond sets:**
- A solid-black-framed card with `{R}` in its rules text (e.g., a mana-producing ability) is **B/R color identity**, not mono-B
- Fire Lord Ozai (TLA) is the canonical example — Rakdos despite all-black frame
- Always verify CI on Scryfall's "Color Identity" field before sleeving, especially for UB legendaries
