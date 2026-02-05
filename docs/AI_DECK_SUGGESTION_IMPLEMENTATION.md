# AI Deck Suggestion Implementation Guide
## Using Construction Ratios for Optimal Deck Building

**Last Updated:** February 5, 2026
**Purpose:** Guide for implementing deck construction ratios into the AI suggestion engine

---

## OVERVIEW

This document outlines how to integrate the comprehensive deck construction ratios from `DECK_CONSTRUCTION_RATIOS.md` into the MTG Deck Builder's AI suggestion system.

The AI should use these ratios as:
1. **Validation constraints** - Check decks against known-good ratios
2. **Suggestion generation** - Recommend cards based on ratio gaps
3. **Optimization feedback** - Identify under/over-represented categories
4. **Format-specific tuning** - Adjust recommendations per format

---

## DATA STRUCTURE

### Ratio Template (TypeScript)

```typescript
interface DeckRatio {
  format: 'Commander' | 'Brawl' | 'Standard';
  archetype: ArchetypeType;
  colorIdentity: string; // 'w', 'u', 'b', 'r', 'g', 'wu', 'ub', etc.
  budget: 'casual' | 'midrange' | 'optimized' | 'cedh';

  // Land ratios
  lands: {
    total: number; // 37-38 for Commander, 23-25 for Brawl/Standard
    basicLands: { min: number; max: number };
    dualLands: { min: number; max: number };
    fetchLands: { min: number; max: number };
    utilityLands: { min: number; max: number };
  };

  // Mana acceleration
  ramp: {
    total: { min: number; max: number }; // 10-13 for Commander
    rocks: { min: number; max: number; byColor?: Record<string, { min: number; max: number }> };
    dorks: { min: number; max: number; byColor?: Record<string, { min: number; max: number }> };
    spells: { min: number; max: number };
    rituals: { min: number; max: number };
    costReducers: { min: number; max: number };
  };

  // Card draw
  cardDraw: {
    total: { min: number; max: number }; // 8-12 for Commander
    cantrips: { min: number; max: number };
    effectiveDraws: { min: number; max: number };
    engines: { min: number; max: number };
    wheels: { min: number; max: number };
  };

  // Removal
  removal: {
    total: { min: number; max: number }; // 8-15 for Commander
    spotRemoval: { min: number; max: number };
    boardWipes: { min: number; max: number };
    creatureRemoval: { min: number; max: number };
    artifactEnchantmentRemoval: { min: number; max: number };
  };

  // Interaction
  interaction: {
    counterspells: { min: number; max: number };
    discard: { min: number; max: number };
    total: { min: number; max: number };
  };

  // Creatures vs non-creatures
  creatures: {
    total: { min: number; max: number };
    byCmc?: Record<number, { min: number; max: number }>;
  };

  // Mana curve
  manaCurve: {
    average: { target: number; range: { min: number; max: number } };
    distribution: Record<number, { percentage: number; count?: number }>;
  };

  // Other categories
  tutors: { min: number; max: number };
  protection: { min: number; max: number };
  recursion: { min: number; max: number };
  winConditions: { min: number; max: number };
  synergy: { percentage: { min: number; max: number } };
}

type ArchetypeType =
  | 'Aggro'
  | 'Tempo'
  | 'Midrange'
  | 'Control'
  | 'Combo'
  | 'Voltron'
  | 'Tribal'
  | 'Reanimator'
  | 'Spellslinger'
  | 'Aristocrats'
  | 'Stax';
```

---

## VALIDATION ENGINE

### Deck Validation Function

```typescript
import { Deck, DeckCard } from '@/lib/types';

interface DeckAnalysis {
  format: 'Commander' | 'Brawl' | 'Standard';
  deckSize: number;
  lands: number;
  creatures: number;
  averageCmc: number;
  categories: {
    lands: number;
    ramp: number;
    cardDraw: number;
    removal: number;
    interaction: number;
    protection: number;
    tutors: number;
    recursion: number;
    winConditions: number;
    synergy: number;
  };
  issues: ValidationIssue[];
  suggestions: SuggestionItem[];
}

interface ValidationIssue {
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  current: number;
  recommended: { min: number; max: number };
}

interface SuggestionItem {
  type: 'add' | 'remove' | 'replace';
  category: string;
  count: number;
  reasoning: string;
  cardExamples?: string[]; // Scryfall names
}

export function analyzeDeck(
  deck: Deck,
  format: 'Commander' | 'Brawl' | 'Standard',
  archetype: string,
  colorIdentity: string,
  budget?: string
): DeckAnalysis {
  const ratio = getDeckRatio(format, archetype, colorIdentity, budget);

  // Count cards by category
  const lands = countByType(deck, 'Land');
  const creatures = countByType(deck, 'Creature');
  const ramp = countByCategory(deck, 'ramp');
  const cardDraw = countByCategory(deck, 'draw');
  const removal = countByCategory(deck, 'removal');
  const interaction = countByCategory(deck, 'interaction');
  const tutors = countByCategory(deck, 'tutor');
  const protection = countByCategory(deck, 'protection');
  const recursion = countByCategory(deck, 'recursion');

  // Calculate average CMC
  const averageCmc = calculateAverageCmc(deck);

  // Generate validation issues
  const issues: ValidationIssue[] = [];

  if (lands < ratio.lands.total - 2) {
    issues.push({
      category: 'Lands',
      severity: 'error',
      message: `Too few lands (${lands}). Recommended: ${ratio.lands.total}`,
      current: lands,
      recommended: { min: ratio.lands.total - 2, max: ratio.lands.total + 2 }
    });
  }

  if (ramp < ratio.ramp.total.min) {
    issues.push({
      category: 'Ramp',
      severity: 'warning',
      message: `Insufficient ramp sources (${ramp}). Recommended: ${ratio.ramp.total.min}-${ratio.ramp.total.max}`,
      current: ramp,
      recommended: ratio.ramp.total
    });
  }

  // Similar checks for other categories...

  // Generate suggestions
  const suggestions = generateSuggestions(deck, ratio, issues);

  return {
    format,
    deckSize: deck.cards.length,
    lands,
    creatures,
    averageCmc,
    categories: {
      lands,
      ramp,
      cardDraw,
      removal,
      interaction,
      protection,
      tutors,
      recursion,
      winConditions: countByCategory(deck, 'win-condition'),
      synergy: calculateSynergyPercentage(deck, archetype)
    },
    issues,
    suggestions
  };
}

function getDeckRatio(
  format: string,
  archetype: string,
  colorIdentity: string,
  budget?: string
): DeckRatio {
  // Fetch from ratio database
  // Apply color identity modifiers
  // Apply budget modifiers
  // Apply archetype modifiers
  return buildAdjustedRatio(...);
}

function countByCategory(
  deck: Deck,
  category: string
): number {
  // Use card tags/types to count
  // Consult Scryfall data for card classification
  return deck.cards.filter(card =>
    hasCategory(card, category)
  ).reduce((sum, card) => sum + (card.quantity || 1), 0);
}

function generateSuggestions(
  deck: Deck,
  ratio: DeckRatio,
  issues: ValidationIssue[]
): SuggestionItem[] {
  const suggestions: SuggestionItem[] = [];

  // For each issue, generate 2-3 suggestion items
  for (const issue of issues) {
    const cards = findCardsByCategory(
      issue.category,
      deck.colorIdentity,
      deck.budget,
      deck.archetype
    );

    const deficit = issue.recommended.min - issue.current;

    suggestions.push({
      type: 'add',
      category: issue.category,
      count: Math.max(1, Math.ceil(deficit / 2)),
      reasoning: issue.message,
      cardExamples: cards.slice(0, 5).map(c => c.name)
    });
  }

  return suggestions;
}

function calculateAverageCmc(deck: Deck): number {
  const nonLandCards = deck.cards.filter(card => !isLand(card));
  const totalCmc = nonLandCards.reduce(
    (sum, card) => sum + ((card.cmc || 0) * (card.quantity || 1)),
    0
  );
  return nonLandCards.length > 0
    ? totalCmc / nonLandCards.length
    : 0;
}
```

---

## AI SUGGESTION ENGINE

### Integration with Claude/Ollama

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface DeckSuggestionRequest {
  deckId: string;
  format: 'Commander' | 'Brawl' | 'Standard';
  archetype: string;
  colorIdentity: string;
  budget?: 'casual' | 'midrange' | 'optimized' | 'cedh';
  specificGoal?: string; // e.g., "add more card draw"
}

interface DeckSuggestionResponse {
  analysis: DeckAnalysis;
  suggestions: DetailedSuggestion[];
  rationale: string;
  nextSteps: string[];
}

interface DetailedSuggestion {
  action: 'add' | 'remove' | 'replace';
  category: string;
  cards: SuggestedCard[];
  reasoning: string;
  expectedImpact: string;
}

interface SuggestedCard {
  name: string;
  scryId: string;
  quantity: number;
  reason: string;
  alternativeCost?: number; // Budget rank
  synergies: string[]; // How it synergizes with other cards
}

export async function suggestDeckImprovements(
  req: DeckSuggestionRequest
): Promise<DeckSuggestionResponse> {
  // 1. Analyze current deck
  const deck = await fetchDeck(req.deckId);
  const analysis = analyzeDeck(
    deck,
    req.format,
    req.archetype,
    req.colorIdentity,
    req.budget
  );

  // 2. Build prompt for AI
  const prompt = buildSuggestionPrompt(
    deck,
    analysis,
    req
  );

  // 3. Call Claude API
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 2048,
    system: DECK_SUGGESTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  // 4. Parse AI response
  const aiSuggestions = parseSuggestions(
    response.content[0].text
  );

  // 5. Validate suggestions against card database
  const validatedSuggestions = await validateAndEnrichSuggestions(
    aiSuggestions,
    deck.colorIdentity,
    req.format
  );

  // 6. Return formatted response
  return {
    analysis,
    suggestions: validatedSuggestions,
    rationale: response.content[0].text,
    nextSteps: generateNextSteps(analysis, validatedSuggestions)
  };
}

const DECK_SUGGESTION_SYSTEM_PROMPT = `You are an expert Magic: The Gathering deck builder with deep knowledge of:
- Optimal deck construction ratios for Commander, Brawl, and Standard
- Archetype-specific card selection and synergies
- Card interactions and combo potential
- Meta-game considerations
- Budget constraints and card alternatives

When suggesting deck improvements, prioritize:
1. Fixing fundamental ratio issues (lands, ramp, draw, removal)
2. Strengthening archetype synergies
3. Adding strategic protection/tutors
4. Optimizing mana curve
5. Budget-aware substitutions

Format your suggestions as structured JSON with:
- action (add/remove/replace)
- category (lands, ramp, draw, removal, etc.)
- cardNames (actual Magic card names)
- reasoning (why this improves the deck)
- synergies (how it works with existing cards)`;

function buildSuggestionPrompt(
  deck: Deck,
  analysis: DeckAnalysis,
  req: DeckSuggestionRequest
): string {
  const targetRatio = getDeckRatio(
    req.format,
    req.archetype,
    req.colorIdentity,
    req.budget
  );

  return `
Analyze and suggest improvements for this ${req.format} ${req.archetype} deck in ${req.colorIdentity}:

## Current Deck (${deck.cards.length} cards)
${formatDeckForAI(deck)}

## Current Analysis
- Average CMC: ${analysis.manaCurve.average.target}
- Lands: ${analysis.lands} (target: ${targetRatio.lands.total})
- Ramp: ${analysis.categories.ramp} (target: ${targetRatio.ramp.total.min}-${targetRatio.ramp.total.max})
- Card Draw: ${analysis.categories.cardDraw} (target: ${targetRatio.cardDraw.total.min}-${targetRatio.cardDraw.total.max})
- Removal: ${analysis.categories.removal} (target: ${targetRatio.removal.total.min}-${targetRatio.removal.total.max})

## Issues Found
${analysis.issues.map(i => `- ${i.severity}: ${i.message}`).join('\n')}

## Budget Tier
${req.budget || 'Optimized'}

## Specific Goals
${req.specificGoal || 'General optimization'}

Provide 3-5 concrete card suggestions that:
1. Fix the most critical ratio issues
2. Maintain archetype identity
3. Work within budget constraints
4. Synergize with existing cards

Return suggestions in this JSON format:
{
  "suggestions": [
    {
      "action": "add|remove|replace",
      "category": "lands|ramp|draw|removal|creatures|etc",
      "cards": [
        {
          "name": "Card Name",
          "quantity": 1,
          "reason": "Why this card",
          "synergies": ["Card A", "Card B"]
        }
      ],
      "reasoning": "Detailed explanation",
      "expectedImpact": "How this improves the deck"
    }
  ],
  "summary": "Overall deck assessment"
}
`;
}

function formatDeckForAI(deck: Deck): string {
  const categories = groupBy(deck.cards, card => getCategory(card));

  return Object.entries(categories)
    .map(([category, cards]) => {
      const cardList = cards
        .map(c => `${c.quantity}x ${c.name} (${c.cmc ? c.cmc + ' CMC' : 'variable'})`)
        .join('\n  ');
      return `${category}:\n  ${cardList}`;
    })
    .join('\n\n');
}

async function validateAndEnrichSuggestions(
  aiSuggestions: any[],
  colorIdentity: string,
  format: string
): Promise<DetailedSuggestion[]> {
  const validated: DetailedSuggestion[] = [];

  for (const suggestion of aiSuggestions) {
    const enriched: DetailedSuggestion = {
      ...suggestion,
      cards: []
    };

    for (const card of suggestion.cards) {
      // Validate card exists in database
      const scryCard = await searchScryfall(card.name);

      if (!scryCard) {
        console.warn(`Card not found: ${card.name}`);
        continue;
      }

      // Check color identity compatibility
      if (!isColorIdentityCompatible(scryCard, colorIdentity)) {
        console.warn(`Card ${card.name} not in color identity ${colorIdentity}`);
        continue;
      }

      // Check format legality
      if (!isLegalInFormat(scryCard, format)) {
        console.warn(`Card ${card.name} not legal in ${format}`);
        continue;
      }

      enriched.cards.push({
        name: scryCard.name,
        scryId: scryCard.id,
        quantity: card.quantity,
        reason: card.reason,
        synergies: card.synergies || []
      });
    }

    if (enriched.cards.length > 0) {
      validated.push(enriched);
    }
  }

  return validated;
}
```

---

## API ROUTE IMPLEMENTATION

### Updated `/api/ai-suggest/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { analyzeDeck, suggestDeckImprovements } from '@/lib/deck-analyzer';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      deckId,
      format = 'Commander',
      archetype = 'Midrange',
      colorIdentity,
      budget = 'optimized',
      specificGoal
    } = body;

    // Validate input
    if (!deckId || !colorIdentity) {
      return NextResponse.json(
        { error: 'Missing required fields: deckId, colorIdentity' },
        { status: 400 }
      );
    }

    // Fetch deck from database
    const db = getDb();
    const deck = db.prepare(`
      SELECT d.*, json_group_array(
        json_object('id', dc.id, 'cardId', dc.card_id, 'quantity', dc.quantity, 'section', dc.section)
      ) as cards
      FROM decks d
      LEFT JOIN deck_cards dc ON d.id = dc.deck_id
      WHERE d.id = ? AND d.user_id = ?
      GROUP BY d.id
    `).get(deckId, userId) as any;

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      );
    }

    // Generate suggestions
    const analysis = await suggestDeckImprovements({
      deckId,
      format,
      archetype,
      colorIdentity,
      budget,
      specificGoal
    });

    // Return response
    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error suggesting deck improvements:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
```

---

## RATIO DATABASE INITIALIZATION

### Create Ratio Seed Data

```typescript
// scripts/seed-deck-ratios.ts

import { getDb } from '@/lib/db';

export function seedDeckRatios() {
  const db = getDb();

  const ratios = [
    // Commander Balanced Midrange
    {
      format: 'Commander',
      archetype: 'Midrange',
      colorIdentity: 'u',
      budget: 'optimized',
      landTotal: 37,
      rampMin: 10,
      rampMax: 13,
      drawMin: 8,
      drawMax: 12,
      removalMin: 8,
      removalMax: 10,
      creaturesMin: 18,
      creaturesMax: 24,
      cmcAverage: 3.2,
      tutorsMin: 2,
      tutorsMax: 4,
      notes: 'Blue midrange balanced build'
    },
    // ... more ratios
  ];

  const insertRatio = db.prepare(`
    INSERT INTO deck_ratios (
      format, archetype, color_identity, budget,
      land_total, ramp_min, ramp_max,
      draw_min, draw_max, removal_min, removal_max,
      creatures_min, creatures_max, cmc_average,
      tutors_min, tutors_max, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ratio of ratios) {
    insertRatio.run(
      ratio.format,
      ratio.archetype,
      ratio.colorIdentity,
      ratio.budget,
      ratio.landTotal,
      ratio.rampMin,
      ratio.rampMax,
      ratio.drawMin,
      ratio.drawMax,
      ratio.removalMin,
      ratio.removalMax,
      ratio.creaturesMin,
      ratio.creaturesMax,
      ratio.cmcAverage,
      ratio.tutorsMin,
      ratio.tutorsMax,
      ratio.notes
    );
  }
}
```

---

## UI INTEGRATION

### Deck Analyzer Component

```typescript
// src/components/deck-analyzer.tsx

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { DeckAnalysis, SuggestionItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DeckAnalyzerProps {
  deckId: string;
  format: 'Commander' | 'Brawl' | 'Standard';
  colorIdentity: string;
}

export function DeckAnalyzer({
  deckId,
  format,
  colorIdentity
}: DeckAnalyzerProps) {
  const [archetype, setArchetype] = useState('Midrange');
  const [budget, setBudget] = useState('optimized');

  const { mutate: analyzeDeck, isPending, data } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId,
          format,
          archetype,
          colorIdentity,
          budget
        })
      });

      if (!response.ok) throw new Error('Failed to analyze deck');
      return response.json();
    }
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4">
        <select
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option>Aggro</option>
          <option>Tempo</option>
          <option>Midrange</option>
          <option>Control</option>
          <option>Combo</option>
          <option>Voltron</option>
          <option>Tribal</option>
          <option>Reanimator</option>
          <option>Spellslinger</option>
        </select>

        <select
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="casual">Budget</option>
          <option value="midrange">Mid-range</option>
          <option value="optimized">Optimized</option>
          <option value="cedh">cEDH</option>
        </select>

        <button
          onClick={() => analyzeDeck()}
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isPending ? 'Analyzing...' : 'Analyze Deck'}
        </button>
      </div>

      {/* Analysis Results */}
      {data?.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              label="Lands"
              value={data.data.lands}
              target={data.data.analysis.lands}
            />
            <MetricCard
              label="Avg CMC"
              value={data.data.manaCurve.average.target.toFixed(2)}
              target="2.8-3.2"
            />
            <MetricCard
              label="Creatures"
              value={data.data.creatures}
              target={`18-24`}
            />
            <MetricCard
              label="Issues"
              value={data.data.issues.length}
              status={data.data.issues.length === 0 ? 'success' : 'warning'}
            />
          </div>

          {/* Issues List */}
          {data.data.issues.length > 0 && (
            <div className="border rounded p-4 space-y-2">
              <h3 className="font-bold">Issues Found:</h3>
              {data.data.issues.map((issue, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-2 rounded text-sm',
                    issue.severity === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  )}
                >
                  <strong>{issue.category}:</strong> {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {data.data.suggestions.length > 0 && (
            <div className="border rounded p-4 space-y-3">
              <h3 className="font-bold">Suggestions:</h3>
              {data.data.suggestions.map((suggestion, i) => (
                <SuggestionCard key={i} suggestion={suggestion} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  target,
  status
}: {
  label: string;
  value: string | number;
  target?: string | number;
  status?: 'success' | 'warning' | 'error';
}) {
  return (
    <div className="border rounded p-3 text-center">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {target && (
        <div className="text-xs text-gray-500 mt-1">Target: {target}</div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: SuggestionItem }) {
  return (
    <div className="border-l-4 border-blue-500 p-3 bg-blue-50">
      <div className="flex justify-between mb-2">
        <strong>{suggestion.category}</strong>
        <span className="text-sm bg-blue-200 px-2 py-1 rounded">
          {suggestion.type}
        </span>
      </div>
      <p className="text-sm mb-2">{suggestion.reasoning}</p>
      {suggestion.cardExamples && (
        <div className="text-xs text-gray-600">
          Examples: {suggestion.cardExamples.join(', ')}
        </div>
      )}
    </div>
  );
}
```

---

## TESTING

### Unit Tests for Ratio Validation

```typescript
// src/lib/__tests__/deck-analyzer.test.ts

import { describe, it, expect } from 'vitest';
import { analyzeDeck, validateDeck } from '@/lib/deck-analyzer';

describe('Deck Analyzer', () => {
  it('should validate Commander deck lands', () => {
    const deck = {
      cards: createMockDeck(35), // 35 lands
      format: 'Commander'
    };

    const analysis = analyzeDeck(deck, 'Commander', 'Midrange', 'u');

    expect(analysis.issues).toContainEqual(
      expect.objectContaining({
        category: 'Lands',
        severity: 'error'
      })
    );
  });

  it('should identify low ramp sources', () => {
    const deck = {
      cards: createMockDeck(37, { rampSources: 5 }), // 5 ramp sources
      format: 'Commander'
    };

    const analysis = analyzeDeck(deck, 'Commander', 'Midrange', 'g');

    expect(analysis.issues).toContainEqual(
      expect.objectContaining({
        category: 'Ramp',
        severity: 'warning'
      })
    );
  });

  it('should suggest improvements for low card draw', () => {
    const deck = {
      cards: createMockDeck(37, { drawSources: 3 }), // 3 draw sources
      format: 'Commander'
    };

    const analysis = analyzeDeck(deck, 'Commander', 'Control', 'u');
    const drawSuggestions = analysis.suggestions.filter(s => s.category === 'Draw');

    expect(drawSuggestions.length).toBeGreaterThan(0);
  });

  it('should validate Brawl deck constraints', () => {
    const deck = {
      cards: createMockDeck(62), // 62 cards
      format: 'Brawl'
    };

    const analysis = analyzeDeck(deck, 'Brawl', 'Midrange', 'wu');

    expect(analysis.issues).toContainEqual(
      expect.objectContaining({
        category: 'Deck Size',
        message: expect.stringContaining('60')
      })
    );
  });

  it('should apply color identity modifiers', () => {
    const monoUDeck = analyzeDeck(
      createMockDeck(37),
      'Commander',
      'Midrange',
      'u'
    );

    const duoDeck = analyzeDeck(
      createMockDeck(37),
      'Commander',
      'Midrange',
      'uw'
    );

    // Duo deck might have different land requirements
    expect(monoUDeck.categories.lands).toBeDifferent(duoDeck.categories.lands);
  });
});
```

---

## NEXT STEPS

1. **Create ratio database table** - Store all ratios in SQLite
2. **Implement card categorization** - Tag cards by type (ramp, draw, removal, etc.)
3. **Build Claude integration** - Test AI suggestion generation
4. **Create UI components** - Build analyzer and suggestion display
5. **Add analytics** - Track suggestion acceptance and deck improvement
6. **Validate against EDHREC** - Cross-reference with live EDHREC data
7. **Implement budget filters** - Suggest cards within price constraints
8. **Add meta-game awareness** - Adjust suggestions based on current meta

---

## REFERENCES

- [DECK_CONSTRUCTION_RATIOS.md](./DECK_CONSTRUCTION_RATIOS.md) - Primary reference
- [Scryfall API](https://scryfall.com/docs/api) - Card data
- [EDHREC](https://edhrec.com) - Live meta data
- [Claude API Docs](https://docs.anthropic.com/) - AI integration
