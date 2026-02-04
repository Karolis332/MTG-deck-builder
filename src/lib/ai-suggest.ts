import { getDb } from './db';
import type { DbCard, AISuggestion } from './types';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE } from './constants';

interface DeckAnalysis {
  format: string;
  colorIdentity: string[];
  cards: Array<{ card: DbCard; quantity: number; board: string }>;
  totalMain: number;
  landCount: number;
  creatureCount: number;
  avgCmc: number;
  manaCurve: Record<number, number>;
  typeBreakdown: Record<string, number>;
}

function analyzeDeck(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string
): DeckAnalysis {
  const mainCards = deckCards.filter((c) => c.board === 'main' || c.board === 'commander');
  const colorSet = new Set<string>();
  let totalCmc = 0;
  let nonLandCount = 0;
  let landCount = 0;
  let creatureCount = 0;
  const manaCurve: Record<number, number> = {};
  const typeBreakdown: Record<string, number> = {};

  for (const card of mainCards) {
    const colors: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    colors.forEach((c) => colorSet.add(c));

    const isLand = card.type_line.includes('Land');
    if (isLand) {
      landCount += card.quantity;
    } else {
      nonLandCount += card.quantity;
      totalCmc += card.cmc * card.quantity;
      const bucket = Math.min(Math.floor(card.cmc), 7);
      manaCurve[bucket] = (manaCurve[bucket] || 0) + card.quantity;
    }

    if (card.type_line.includes('Creature')) creatureCount += card.quantity;

    const mainType = card.type_line.split('—')[0].trim().split(' ').pop() || 'Other';
    typeBreakdown[mainType] = (typeBreakdown[mainType] || 0) + card.quantity;
  }

  return {
    format,
    colorIdentity: Array.from(colorSet),
    cards: mainCards.map((c) => ({ card: c, quantity: c.quantity, board: c.board })),
    totalMain: mainCards.reduce((sum, c) => sum + c.quantity, 0),
    landCount,
    creatureCount,
    avgCmc: nonLandCount > 0 ? totalCmc / nonLandCount : 0,
    manaCurve,
    typeBreakdown,
  };
}

export function getRuleBasedSuggestions(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string,
  collectionOnly?: boolean
): AISuggestion[] {
  const db = getDb();
  const analysis = analyzeDeck(deckCards, format);
  const suggestions: AISuggestion[] = [];
  const existingCardIds = new Set(deckCards.map((c) => c.id));
  const existingCardNames = new Set(deckCards.map((c) => c.name));
  const suggestedNames = new Set<string>();
  const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
  const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;

  // Collection-only mode: INNER JOIN to only suggest owned cards
  const colJoin = collectionOnly ? 'INNER JOIN collection col ON c.id = col.card_id' : '';
  // Format legality filter
  const legalFilter = format ? `AND c.legalities LIKE '%"${format}":"legal"%'` : '';

  // 1. Land count suggestions
  if (analysis.totalMain < targetSize && analysis.landCount < targetLands) {
    const landsNeeded = targetLands - analysis.landCount;
    const colorFilter =
      analysis.colorIdentity.length > 0
        ? analysis.colorIdentity.map(() => `c.color_identity LIKE ?`).join(' OR ')
        : '1=1';
    const colorParams = analysis.colorIdentity.map((col) => `%${col}%`);

    const lands = db
      .prepare(
        `SELECT c.* FROM cards c
         ${colJoin}
         WHERE c.type_line LIKE '%Land%'
         AND (${colorFilter})
         ${legalFilter}
         AND c.id NOT IN (${Array.from(existingCardIds).map(() => '?').join(',') || "''"})
         ORDER BY c.edhrec_rank ASC NULLS LAST
         LIMIT 5`
      )
      .all(...colorParams, ...Array.from(existingCardIds)) as DbCard[];

    for (const land of lands) {
      if (existingCardNames.has(land.name) || suggestedNames.has(land.name)) continue;
      suggestedNames.add(land.name);
      suggestions.push({
        card: land,
        reason: `Deck needs ~${landsNeeded} more lands to reach the recommended ${targetLands} for ${format}`,
        score: 90,
      });
    }
  }

  // 2. Mana curve gap filling
  const idealCurve: Record<number, number> = { 1: 6, 2: 8, 3: 7, 4: 5, 5: 3, 6: 2 };
  for (const [cmcStr, idealCount] of Object.entries(idealCurve)) {
    const cmc = parseInt(cmcStr);
    const currentCount = analysis.manaCurve[cmc] || 0;
    if (currentCount < idealCount * 0.5) {
      const colorConditions =
        analysis.colorIdentity.length > 0
          ? analysis.colorIdentity.map(() => `c.colors LIKE ?`).join(' OR ')
          : '1=1';
      const colorParams = analysis.colorIdentity.map((col) => `%${col}%`);

      const fillers = db
        .prepare(
          `SELECT c.* FROM cards c
           ${colJoin}
           WHERE c.cmc = ?
           AND c.type_line NOT LIKE '%Land%'
           AND (${colorConditions})
           ${legalFilter}
           AND c.id NOT IN (${Array.from(existingCardIds).map(() => '?').join(',') || "''"})
           ORDER BY c.edhrec_rank ASC NULLS LAST
           LIMIT 3`
        )
        .all(cmc, ...colorParams, ...Array.from(existingCardIds)) as DbCard[];

      for (const card of fillers) {
        if (existingCardNames.has(card.name) || suggestedNames.has(card.name)) continue;
        suggestedNames.add(card.name);
        suggestions.push({
          card,
          reason: `Fill ${cmc}-CMC gap in mana curve (only ${currentCount} cards vs recommended ~${idealCount})`,
          score: 70 - cmc * 2,
        });
      }
    }
  }

  // 3. Card draw / ramp suggestions if deck lacks them
  if (analysis.colorIdentity.length > 0) {
    const hasDrawOrRamp = deckCards.some(
      (c) =>
        c.oracle_text?.toLowerCase().includes('draw a card') ||
        c.oracle_text?.toLowerCase().includes('search your library for a')
    );

    if (!hasDrawOrRamp && analysis.totalMain > 10) {
      const drawCards = db
        .prepare(
          `SELECT c.* FROM cards c
           ${colJoin}
           WHERE c.oracle_text LIKE '%draw%card%'
           AND c.type_line NOT LIKE '%Land%'
           AND c.cmc <= 3
           ${legalFilter}
           AND c.id NOT IN (${Array.from(existingCardIds).map(() => '?').join(',') || "''"})
           ORDER BY c.edhrec_rank ASC NULLS LAST
           LIMIT 3`
        )
        .all(...Array.from(existingCardIds)) as DbCard[];

      for (const card of drawCards) {
        if (existingCardNames.has(card.name) || suggestedNames.has(card.name)) continue;
        suggestedNames.add(card.name);
        suggestions.push({
          card,
          reason: 'Add card draw to improve consistency',
          score: 75,
        });
      }
    }
  }

  // 4. Removal suggestions
  const hasRemoval = deckCards.some(
    (c) =>
      c.oracle_text?.toLowerCase().includes('destroy target') ||
      c.oracle_text?.toLowerCase().includes('exile target') ||
      c.oracle_text?.toLowerCase().includes('deals')
  );

  if (!hasRemoval && analysis.totalMain > 15) {
    const colorConditions =
      analysis.colorIdentity.length > 0
        ? analysis.colorIdentity.map(() => `c.colors LIKE ?`).join(' OR ')
        : '1=1';
    const colorParams = analysis.colorIdentity.map((col) => `%${col}%`);

    const removal = db
      .prepare(
        `SELECT c.* FROM cards c
         ${colJoin}
         WHERE (c.oracle_text LIKE '%destroy target%' OR c.oracle_text LIKE '%exile target%')
         AND c.type_line NOT LIKE '%Land%'
         AND (${colorConditions})
         ${legalFilter}
         AND c.id NOT IN (${Array.from(existingCardIds).map(() => '?').join(',') || "''"})
         ORDER BY c.edhrec_rank ASC NULLS LAST
         LIMIT 3`
      )
      .all(...colorParams, ...Array.from(existingCardIds)) as DbCard[];

    for (const card of removal) {
      if (existingCardNames.has(card.name) || suggestedNames.has(card.name)) continue;
      suggestedNames.add(card.name);
      suggestions.push({
        card,
        reason: 'Add removal spells for interaction',
        score: 65,
      });
    }
  }

  // Sort by score and deduplicate by name (not ID — same card has many printings)
  const seenNames = new Set<string>();
  return suggestions
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      if (seenNames.has(s.card.name)) return false;
      seenNames.add(s.card.name);
      return true;
    })
    .slice(0, 15);
}

export async function getOllamaSuggestions(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string
): Promise<AISuggestion[] | null> {
  try {
    // Check if Ollama is running
    const healthCheck = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    if (!healthCheck.ok) return null;

    const models = await healthCheck.json();
    if (!models.models?.length) return null;

    const modelName = models.models[0].name;
    const mainCards = deckCards.filter((c) => c.board === 'main');
    const deckList = mainCards
      .map((c) => {
        const oracle = c.oracle_text ? ` — ${c.oracle_text.replace(/\n/g, '; ')}` : '';
        return `${c.quantity}x ${c.name} (${c.type_line}, CMC ${c.cmc})${oracle}`;
      })
      .join('\n');

    const prompt = `You are an expert Magic: The Gathering deck builder. Analyze this ${format} deck and suggest exactly 10 cards to add or swap. For each suggestion, give the exact card name and a brief reason.

Current deck (with full card text):
${deckList}

Respond in JSON format:
[{"name": "Card Name", "reason": "Brief reason"}, ...]

Only suggest real, existing MTG cards. Use the card text above to understand synergies and gaps. Focus on improving the deck's power level, consistency, and mana base.`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        options: { temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const responseText = data.response || '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ name: string; reason: string }>;
    const db = getDb();
    const suggestions: AISuggestion[] = [];

    for (const suggestion of parsed) {
      const card = db
        .prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE')
        .get(suggestion.name) as DbCard | undefined;
      if (card) {
        suggestions.push({
          card,
          reason: suggestion.reason,
          score: 80,
        });
      }
    }

    return suggestions.length > 0 ? suggestions : null;
  } catch {
    return null;
  }
}
