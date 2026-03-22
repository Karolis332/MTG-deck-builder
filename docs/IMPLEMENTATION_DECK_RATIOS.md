# Implementation Guide: Using Deck Ratios in AI Deck Building

**Technical guide for MTG Deck Builder AI to enforce and validate deck construction ratios.**

---

## Overview

This document provides implementation details for:
1. Enforcing deck ratios in AI-generated suggestions
2. Validating deck composition against format standards
3. Adjusting ratios based on commander/archetype
4. Calculating optimal mana bases

---

## 1. Core Ratio Constants

### Standard Brawl (60-card)

```javascript
const STANDARD_BRAWL_RATIOS = {
  format: 'standard_brawl',
  deckSize: 60,
  commander: 1,

  targets: {
    lands: { min: 24, max: 26, target: 25 },
    ramp: { min: 5, max: 8, target: 6 },
    draw: { min: 5, max: 8, target: 6 },
    removal: { min: 5, max: 8, target: 6 },
    boardWipes: { min: 1, max: 3, target: 2 },
    synergy: { min: 3, max: 6, target: 4 },
    winConditions: { min: 3, max: 6, target: 4 },
    interaction: { min: 2, max: 4, target: 3 },
  },

  avgCMC: { min: 2.5, max: 3.2, target: 2.8 },
  manaDistribution: {
    '1': { min: 2, max: 4 },
    '2': { min: 10, max: 14 },
    '3': { min: 10, max: 12 },
    '4': { min: 6, max: 8 },
    '5': { min: 2, max: 4 },
    '6': { min: 1, max: 3 },
  },
};
```

### Historic Brawl (100-card)

```javascript
const HISTORIC_BRAWL_RATIOS = {
  format: 'historic_brawl',
  deckSize: 100,
  commander: 1,

  targets: {
    lands: { min: 35, max: 40, target: 38 },
    ramp: { min: 8, max: 12, target: 10 },
    draw: { min: 8, max: 12, target: 10 },
    removal: { min: 8, max: 12, target: 10 },
    boardWipes: { min: 2, max: 4, target: 3 },
    synergy: { min: 5, max: 10, target: 8 },
    winConditions: { min: 5, max: 10, target: 7 },
    interaction: { min: 3, max: 6, target: 4 },
  },

  avgCMC: { min: 2.8, max: 3.5, target: 3.1 },
  manaDistribution: {
    '1': { min: 4, max: 6 },
    '2': { min: 12, max: 16 },
    '3': { min: 12, max: 16 },
    '4': { min: 10, max: 12 },
    '5': { min: 6, max: 8 },
    '6': { min: 4, max: 6 },
  },
};
```

### Commander/EDH (100-card)

```javascript
const COMMANDER_RATIOS = {
  format: 'commander',
  deckSize: 100,
  commander: 1,

  targets: {
    lands: { min: 35, max: 38, target: 37 },
    ramp: { min: 10, max: 12, target: 11 },
    draw: { min: 10, max: 12, target: 11 },
    removal: { min: 10, max: 12, target: 11 },
    boardWipes: { min: 3, max: 4, target: 3 },
    synergy: { min: 8, max: 12, target: 10 },
    winConditions: { min: 4, max: 6, target: 5 },
    interaction: { min: 5, max: 8, target: 6 },
  },

  avgCMC: { min: 2.8, max: 3.2, target: 3.0 },
  manaDistribution: {
    '1': { min: 3, max: 5 },
    '2': { min: 12, max: 14 },
    '3': { min: 12, max: 14 },
    '4': { min: 8, max: 10 },
    '5': { min: 6, max: 8 },
    '6': { min: 4, max: 6 },
  },
};
```

---

## 2. Archetype Modifiers

Apply to base ratios depending on deck archetype:

```javascript
const ARCHETYPE_MODIFIERS = {
  aggro: {
    lands: -2,      // Fewer lands
    creatures: +8,  // More creatures
    removal: -3,    // Less removal
    draw: -4,       // Less card draw
    ramp: -4,       // Less ramp
    avgCMC: -0.7,   // Lower curve
  },
  control: {
    lands: +2,      // More lands
    removal: +4,    // More removal
    creatures: -12, // Fewer creatures
    draw: +3,       // More draw
    boardWipes: +1, // More board wipes
    avgCMC: +0.8,   // Higher curve
  },
  midrange: {
    lands: 0,       // Standard
    creatures: -2,  // Slight adjustment
    removal: 0,
    draw: 0,
    avgCMC: 0,      // Standard curve
  },
  combo: {
    lands: -2,
    ramp: +3,       // More ramp
    tutors: +3,     // More tutors
    draw: +2,
    interaction: +2, // Protection
    avgCMC: -0.3,
  },
  ramp: {
    lands: 0,
    ramp: +4,       // Heavy ramp
    creatures: -4,
    draw: +1,
    removal: -2,    // Less removal
    avgCMC: +0.2,
  },
  tempo: {
    lands: -2,
    creatures: +4,  // More creatures
    removal: +2,
    draw: -2,
    avgCMC: -0.4,
  },
};
```

---

## 3. Color Identity Adjustments

Adjust for mana consistency based on color count:

```javascript
function getColorIdentityManaAdjustment(colorCount) {
  const adjustments = {
    1: { lands: -3, manaRocks: 0 },      // Mono: easier
    2: { lands: -1, manaRocks: +1 },     // 2-color: slight help
    3: { lands: +1, manaRocks: +2 },     // 3-color: more fixing
    4: { lands: +2, manaRocks: +3 },     // 4-color: heavy fixing
    5: { lands: +3, manaRocks: +4 },     // 5-color: maximum fixing
  };
  return adjustments[colorCount] || adjustments[3];
}
```

---

## 4. Card Classification Logic

Categorize cards to enforce ratios:

```javascript
function classifyCard(card, commander) {
  const classifications = [];

  // Check for ramp
  if (isRamp(card)) classifications.push('ramp');

  // Check for draw
  if (isDraw(card)) classifications.push('draw');

  // Check for removal
  if (isRemoval(card)) classifications.push('removal');

  // Check for board wipe
  if (isBoardWipe(card)) classifications.push('boardWipes');

  // Check for synergy
  if (isSynergy(card, commander)) classifications.push('synergy');

  // Check for win condition
  if (isWinCondition(card)) classifications.push('winConditions');

  // Check for interaction/protection
  if (isInteraction(card)) classifications.push('interaction');

  // Land
  if (card.type_line.includes('Land')) classifications.push('lands');

  // Creature (default; can be multiple)
  if (card.type_line.includes('Creature')) classifications.push('creatures');

  return classifications;
}

function isRamp(card) {
  // Check for: mana dorks, mana rocks, land ramp
  const rampKeywords = ['mana', 'ramp', 'llanowar', 'dork', 'cultivate', 'farseek'];
  return rampKeywords.some(kw => card.oracle_text.toLowerCase().includes(kw))
    || card.type_line.includes('Creature') && card.oracle_text.toLowerCase().includes('add {');
}

function isDraw(card) {
  const drawKeywords = ['draw', 'search', 'tutor', 'scry', 'transmute'];
  return drawKeywords.some(kw => card.oracle_text.toLowerCase().includes(kw));
}

function isRemoval(card) {
  const removalKeywords = ['destroy', 'exile', 'return.*hand', 'sacrifice', 'bounce'];
  return removalKeywords.some(kw => card.oracle_text.toLowerCase().includes(kw));
}

function isBoardWipe(card) {
  const wipeKeywords = ['all creatures', 'each creature', 'every creature', 'wrath'];
  return wipeKeywords.some(kw => card.oracle_text.toLowerCase().includes(kw));
}

function isSynergy(card, commander) {
  // Check if card references commander's mechanics
  if (!commander) return false;

  const commanderMechanics = extractMechanics(commander);
  const cardMechanics = extractMechanics(card);

  return commanderMechanics.some(m => cardMechanics.includes(m));
}

function isWinCondition(card) {
  const winKeywords = ['deal damage', 'combat damage', 'creature', 'planeswalker', 'ultimate'];
  return winKeywords.some(kw => card.oracle_text.toLowerCase().includes(kw))
    && !isRemoval(card) && !isRamp(card);
}

function isInteraction(card) {
  const interactionKeywords = ['counter', 'can\'t', 'prevent', 'protection', 'hexproof'];
  return interactionKeywords.some(kw => card.oracle_text.toLowerCase().includes(kw));
}
```

---

## 5. Deck Validation Function

```javascript
function validateDeckRatios(deck, format) {
  const targetRatios = getFormatRatios(format);
  const deckComposition = calculateDeckComposition(deck);

  const validation = {
    format,
    totalCards: deck.length,
    composition: deckComposition,
    violations: [],
    warnings: [],
    score: 0, // 0-100
  };

  // Check each category
  Object.entries(targetRatios.targets).forEach(([category, target]) => {
    const actual = deckComposition[category] || 0;
    const percentDeviation = ((actual - target.target) / target.target) * 100;

    if (actual < target.min) {
      validation.violations.push(
        `${category}: ${actual} cards (min ${target.min} required)`
      );
    } else if (actual > target.max) {
      validation.violations.push(
        `${category}: ${actual} cards (max ${target.max} allowed)`
      );
    } else if (Math.abs(percentDeviation) > 20) {
      validation.warnings.push(
        `${category}: ${actual} cards (target ${target.target}, ${percentDeviation.toFixed(0)}% deviation)`
      );
    }
  });

  // Check mana curve
  const actualAvgCMC = calculateAvgCMC(deck);
  if (actualAvgCMC < targetRatios.avgCMC.min || actualAvgCMC > targetRatios.avgCMC.max) {
    validation.warnings.push(
      `Avg CMC: ${actualAvgCMC.toFixed(2)} (target ${targetRatios.avgCMC.target.toFixed(2)})`
    );
  }

  // Calculate score (0 violations = higher score)
  validation.score = Math.max(0, 100 - (validation.violations.length * 10));

  return validation;
}
```

---

## 6. Mana Base Calculation (Frank Karsten)

```javascript
function calculateColoredSources(colorIdentity, deckSize = 100) {
  // Based on hypergeometric probability
  // Returns: number of colored sources needed for 90% certainty by turn 3

  const colorCount = colorIdentity.length;

  const sourcesByColorCount = {
    1: 16,  // Mono-color
    2: 24,  // 2-color (12 per color)
    3: 28,  // 3-color (9-10 per color)
    4: 32,  // 4-color (8 per color)
    5: 36,  // 5-color (7-8 per color)
  };

  const baseSources = sourcesByColorCount[colorCount] || sourcesByColorCount[3];

  // Adjust for deck size (100-card vs 60-card)
  if (deckSize === 60) {
    return Math.ceil(baseSources * 0.65); // Rough scaling
  }

  return baseSources;
}

function suggestManaBase(colorIdentity, lands, rocks, dorks) {
  const targetSources = calculateColoredSources(colorIdentity);
  const currentSources = lands + rocks + dorks;
  const deficit = targetSources - currentSources;

  const suggestion = {
    targetColoredSources: targetSources,
    currentSources,
    deficit,
    recommendations: [],
  };

  if (deficit > 0) {
    if (rocks < 6) {
      suggestion.recommendations.push(
        `Add ${Math.ceil(deficit * 0.6)} more mana rocks (currently ${rocks})`
      );
    }
    if (dorks < 4) {
      suggestion.recommendations.push(
        `Add ${Math.ceil(deficit * 0.3)} more mana dorks (currently ${dorks})`
      );
    }
    if (lands < 38) {
      suggestion.recommendations.push(
        `Add ${Math.ceil(deficit * 0.1)} more utility lands (currently ${lands})`
      );
    }
  }

  return suggestion;
}
```

---

## 7. Integration with AI Suggestion System

```javascript
async function generateDeckSuggestions(commander, archetype, format, collection) {
  const baseRatios = getFormatRatios(format);
  const modifiedRatios = applyArchetypeModifiers(baseRatios, archetype);
  const colorIdentity = commander.color_identity;
  const colorAdjustment = getColorIdentityManaAdjustment(colorIdentity.length);

  // Start with basic land requirement
  let deck = [];
  const targetLands = modifiedRatios.targets.lands.target + colorAdjustment.lands;
  deck.push(...generateManaBase(commander, targetLands, collection));

  // Add ramp sources
  const targetRamp = modifiedRatios.targets.ramp.target;
  deck.push(...suggestRampCards(commander, targetRamp, colorIdentity, collection));

  // Add card draw
  const targetDraw = modifiedRatios.targets.draw.target;
  deck.push(...suggestDrawCards(commander, targetDraw, colorIdentity, collection));

  // Add removal
  const targetRemoval = modifiedRatios.targets.removal.target;
  deck.push(...suggestRemovalCards(commander, targetRemoval, colorIdentity, collection));

  // Add board wipes
  const targetWipes = modifiedRatios.targets.boardWipes.target;
  deck.push(...suggestBoardWipes(commander, targetWipes, colorIdentity, collection));

  // Add commander synergy
  const targetSynergy = modifiedRatios.targets.synergy.target;
  deck.push(...suggestSynergyCards(commander, targetSynergy, collection));

  // Add win conditions
  const targetWins = modifiedRatios.targets.winConditions.target;
  deck.push(...suggestWinConditions(commander, targetWins, collection));

  // Add interaction/protection
  const targetInteraction = modifiedRatios.targets.interaction.target;
  deck.push(...suggestInteractionCards(commander, targetInteraction, colorIdentity, collection));

  // Validate
  const validation = validateDeckRatios(deck, format);

  return {
    deck,
    validation,
    composition: calculateDeckComposition(deck),
    suggestions: generateOptimizationSuggestions(validation),
  };
}
```

---

## 8. Testing & QA

```javascript
// Test deck validation
const testDeck = [...]; // 100 cards
const result = validateDeckRatios(testDeck, 'historic_brawl');

console.log('Violations:', result.violations);
console.log('Warnings:', result.warnings);
console.log('Score:', result.score);

// Test archetype modifiers
const modifiedRatios = applyArchetypeModifiers(HISTORIC_BRAWL_RATIOS, 'control');
console.log('Control modifiers applied:', modifiedRatios);

// Test mana base calculation
const sources = calculateColoredSources(['U', 'R', 'B'], 100);
console.log('Colored sources for Izzet/Dimir:', sources);
```

---

## 9. Tolerance & Edge Cases

**When to allow violations:**
1. Limited card pool (budget decks, small collection)
2. Synergy-heavy decks may have fewer removal/draw
3. Creature-heavy decks (tribal) may exceed creature ratio
4. 2-3 cards ±tolerance for rounding

**Safe ranges (allow without complaint):**
- Lands: ±1 card
- Ramp/Draw: ±1 card
- Removal: ±1 card
- CMC: ±0.3

---

## 10. AI Prompt for Ratio Enforcement

For LLM integration (Claude API):

```
You are building a ${format} deck for ${commander.name}.

MANDATORY CONSTRAINTS:
- Deck size: ${deckSize} cards (including commander)
- Lands: ${targetLands.min}-${targetLands.max} (target: ${targetLands.target})
- Ramp: ${targetRamp.min}-${targetRamp.max} sources
- Card Draw: ${targetDraw.min}-${targetDraw.max} sources
- Removal: ${targetRemoval.min}-${targetRemoval.max} spells
- Board Wipes: ${targetWipes.min}-${targetWipes.max} spells
- Commander Synergy: ${targetSynergy.min}-${targetSynergy.max} cards
- Avg CMC: ${targetAvgCMC.min.toFixed(1)}-${targetAvgCMC.max.toFixed(1)}

ARCHETYPE MODIFIER (${archetype}):
- Adjust creatures ${MODIFIERS[archetype].creatures > 0 ? '+' : ''}${MODIFIERS[archetype].creatures}
- Adjust removal ${MODIFIERS[archetype].removal > 0 ? '+' : ''}${MODIFIERS[archetype].removal}
- Adjust lands ${MODIFIERS[archetype].lands > 0 ? '+' : ''}${MODIFIERS[archetype].lands}

CARD POOL RESTRICTION:
Only suggest cards from the user's collection: ${collection.map(c => c.name).join(', ')}

Output format: List each suggested card with its category (ramp, draw, removal, etc.)
```

---

**Last Updated:** March 22, 2026
**Status:** Ready for implementation
