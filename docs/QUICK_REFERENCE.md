# MTG Deck Construction Ratios - Quick Reference
## One-Page Cheat Sheet

---

## COMMANDER (100 CARD, 99+1)

### Baseline Midrange / Balanced
```
Lands:      37-38  (includes: 6-8 basics, 10-14 duals, 0-5 fetches, 8-12 utility)
Ramp:       10-13  sources
  - Rocks:  5-8    (2-3 CMC, mix of 1-2 CMC acceleration)
  - Dorks:  2-4    (creatures)
  - Spells: 2-4    (Cultivate, Kodama's Reach)
Draw:       8-12   sources (mix of cantrips, engines, one-shots)
Removal:    8-15   total
  - Spot:   3-7
  - Wipes:  3-5
  - Others: 2-3
Creatures:  20-30  (archetype-dependent)
Tutors:     5-8
Average CMC: 3.0-3.2
```

### By Archetype (Quick Deltas from Baseline)
```
AGGRO:      -4 lands, +8 creatures, -4 ramp, -6 removal → 1.9-2.2 CMC
CONTROL:    +2 lands, -8 creatures, +6 removal, +3 draw → 3.3-3.8 CMC
COMBO:      = lands, +3 tutors, +2 counterspells, -4 creatures
VOLTRON:    -8 creatures, +8 equipment, +2 protection
TRIBAL:     = lands, +5 creatures, +2 lords, +2 tutors
REANIMATOR: = lands, +6 reanimate spells, -4 creatures → 3.5-4.5 CMC
STAX:       -2 creatures, +8 stax artifacts/enchantments
```

### By Color Identity (Land Adjustments)
```
Mono:       34 lands, 8-10 basics
2-color:    34-35 lands, 4-6 basics
3-color:    35-36 lands, 3-5 basics (use 3-3-9 mana base rule)
4-color:    36 lands, 2-3 basics
5-color:    37 lands, 2-3 basics (need 10+ omnilands)
```

### By Budget Tier
```
Budget ($0-100):        34 lands, 3 rocks, 2-3 tutors, basics > duals
Mid ($100-300):         37 lands, 5-6 rocks, 3-4 tutors, 1-2 fetches
Optimized ($300-1000):  37 lands, 8 rocks, 4-5 tutors, 3-5 fetches
cEDH ($1000+):          27-30 lands, 8+ zero-mana accelerants, 5-8+ tutors
```

---

## BRAWL (60 CARD, 59+1)

```
Lands:      23-25  (40% of deck)
  - Basics: 4-6
  - Duals:  8-12
  - Utility: 4-6
Ramp:       5-8    sources
Draw:       4-6    sources
Removal:    4-8    total
Creatures:  8-20   (archetype-dependent)
Creatures:  14-18  for tempo, 12-18 for midrange, 18-22 for aggro
Average CMC: 2.5-3.2
Game Length: 15-25 min
```

**Key Difference:** 40 fewer cards than Commander forces tighter card selection.

---

## STANDARD (60 CARD + 15 SIDEBOARD)

### Main Deck
```
Lands:      23-25  (exactly 60 cards total)
  - Basics: 4-8
  - Duals:  8-12
  - Fetches: 2-4 (if available)
Ramp:       4-8    sources
Draw:       2-6    sources
Removal:    4-10   total
Creatures:  12-24  (archetype-dependent)
  - Aggro: 20-24, Tempo: 14-18, Control: 0-4
Average CMC: 2.3-3.0

Sideboard:  15 cards (must have exactly 15)
  - 2-3 cards vs aggro (life gain, wipes)
  - 2-3 cards vs control (counterspell hate)
  - 2-3 cards vs midrange (more removal)
  - 3-5 meta-specific cards
  - 2-3 flex slots
```

---

## MANA CURVE REFERENCE

### By Archetype (CMC Distribution %)
```
            0-1   2-3   4-5   6+    AVG CMC
AGGRO:      10%   40%   30%   10%   1.9-2.2
TEMPO:      5%    35%   35%   15%   2.4-2.8
MIDRANGE:   3%    30%   40%   15%   2.8-3.2
CONTROL:    2%    20%   40%   20%   3.2-3.8
COMBO:      5%    35%   35%   10%   2.5-3.0
```

### EDHREC Verified Average (Commander)
```
CMC 1: 3-5 cards (3-5%)
CMC 2: 15-17 cards (15-17%)  ← PEAK
CMC 3: 15-16 cards (15-16%)  ← PEAK
CMC 4: 10-12 cards (10-12%)
CMC 5: 6-8 cards (6-8%)
CMC 6: 4-5 cards (4-5%)
CMC 7+: 3-4 cards (3-4%)
```

---

## CATEGORY QUICK COUNTS

### Removal Package (Commander)
```
Spot Removal:       3-7 cards
Board Wipes:        3-5 cards  (Control: 4-7, Tempo: 0-2)
Counterspells:      6-12 (blue only)
Total Interaction:  8-15 cards
```

### Card Draw (Commander)
```
Cantrips:           2-4 cards (1-2 CMC)
Effective Draws:    4-7 cards (net positive)
Card Engines:       2-4 cards (repeatable)
Wheels:             0-2 cards
Total:              8-12 sources
```

### Ramp Breakdown (Commander)
```
Rocks (artifacts):  5-8 total
  0-1 CMC: 1-2
  2 CMC:   3-4
  3 CMC:   2-3
  4+ CMC:  0-1
Dorks (creatures):  2-4 total
Land ramps:         2-4 spells
Rituals:            1-3 spells
```

### Creatures by CMC (Balanced Midrange)
```
1-drop:  2-3
2-drop:  4-6
3-drop:  6-8
4-drop:  4-6
5-drop:  2-4
6+ drop: 1-2
Total:   20-30 creatures
```

---

## PROTECTION/INTERACTION

```
Counterspells:  6-12 (blue decks only)
Hexproof/Shroud: 2-4 cards (voltron)
Indestructible: 1-2 cards
Tutors:         5-8 total
  - Creature:   1-2
  - Artifact:   1-2
  - Land:       1-2
  - General:    1-3
```

---

## WIN CONDITIONS

### By Archetype
```
CONTROL:     1-2 win conditions (minimal slots)
COMBO:       2-5 combos (each = 1 win condition)
VOLTRON:     1 primary (commander) + 2-3 backup
MIDRANGE:    4-8 threats (distributed)
AGGRO:       15-25 creatures (all are threats)
REANIMATOR:  3-5 big threats in graveyard
```

---

## LAND BASE FORMULA

Starting with 42 lands, subtract 1 land per 2.5 mana rocks:
```
42 - (rocks ÷ 2.5) = target lands

Example: 8 rocks
42 - (8 ÷ 2.5) = 42 - 3.2 = 39 lands
```

Or use **3-3-9 rule for 3-color**:
- 3 ABUR duals (if budget allows)
- 3 Shock lands
- 9 other fixing lands (checks, pain, tri-lands, omnilands)

---

## TUTOR HEURISTIC

**"If you're tutoring for the same non-land card more than once per game, you're running too many tutors."**

Exception: Combo decks (need consistency).

---

## RED FLAGS 🚩

```
TOO FEW:
- Lands < 35 (Commander) or < 22 (Standard) → mana problems
- Ramp < 8 (Commander) → slow deck
- Draw < 5 (Commander) → card advantage loss
- Removal < 4 → inability to deal with threats

TOO MANY:
- Lands > 40 (Commander) → clogs hand
- Ramp > 15 → dilutes deck effectiveness
- Tutors > 8 → reduces game variance
- Creatures > 40 (non-aggro) → deck unfocused
```

---

## QUICK VALIDATION (30 SECONDS)

1. **Lands:** 37-38? ✓ or flag
2. **Ramp:** 10-13 sources? ✓ or flag
3. **Draw:** 8-12 sources? ✓ or flag
4. **Removal:** 8-15 total? ✓ or flag
5. **CMC:** Between 2.8-3.2 (midrange)? ✓ or flag

If all check out, deck is likely sound. Any fails = needs investigation.

---

## SOURCES

- EDHREC (edhrec.com)
- Draftsim (draftsim.com)
- TCGPlayer (tcgplayer.com)
- cEDH Decklist Database (cedh-decklist-database.com)
- MTGDecks (mtgdecks.net)
- MTGGoldfish (mtggoldfish.com)

**Full Reference:** See DECK_CONSTRUCTION_RATIOS.md for detailed breakdown by archetype.
