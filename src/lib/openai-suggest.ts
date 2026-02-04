/**
 * OpenAI-powered card suggestion engine.
 *
 * Uses the user's OpenAI API key (stored in app_state) to get GPT-powered
 * deck improvement suggestions. Falls back gracefully if no key is set.
 */

import { getDb } from '@/lib/db';
import { COMMANDER_FORMATS } from '@/lib/constants';
import type { DbCard } from '@/lib/types';
import type { AISuggestion } from '@/lib/types';

interface OpenAISuggestionResult {
  suggestions: Array<{
    cardName: string;
    reason: string;
    action: 'add' | 'cut';
  }>;
  deckColors: string[];
  isCommanderLike: boolean;
}

function getOpenAIKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_openai_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

/**
 * Get AI-powered suggestions using OpenAI GPT.
 * Returns null if no API key is configured.
 */
export async function getOpenAISuggestions(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string,
  collectionCardNames?: string[]
): Promise<OpenAISuggestionResult | null> {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;

  const mainCards = deckCards.filter((c) => c.board === 'main' || c.board === 'commander');
  const commanderCards = deckCards.filter((c) => c.board === 'commander');
  const isCommanderLike = COMMANDER_FORMATS.includes(
    format as (typeof COMMANDER_FORMATS)[number]
  );

  // Build deck summary for the prompt — include oracle text so GPT knows what cards actually do
  const deckSummary = mainCards
    .map((c) => {
      const oracle = c.oracle_text ? `\n   Text: ${c.oracle_text.replace(/\n/g, '; ')}` : '';
      return `${c.quantity}x ${c.name} (${c.type_line}, CMC ${c.cmc})${oracle}`;
    })
    .join('\n');

  const commanderInfo = commanderCards.length > 0
    ? `Commander: ${commanderCards.map((c) => {
        const oracle = c.oracle_text ? ` — ${c.oracle_text.replace(/\n/g, '; ')}` : '';
        return `${c.name} (${c.type_line}, CMC ${c.cmc})${oracle}`;
      }).join('\n')}\n`
    : '';

  // Detect color identity — commander defines it for commander formats
  const colorSet = new Set<string>();
  if (commanderCards.length > 0) {
    for (const card of commanderCards) {
      try {
        const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
        ci.forEach((c) => colorSet.add(c));
      } catch {}
    }
  } else {
    for (const card of mainCards) {
      try {
        const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
        ci.forEach((c) => colorSet.add(c));
      } catch {}
    }
  }
  const deckColors = Array.from(colorSet);
  const colors = deckColors.join('');

  // Count lands
  const landCount = mainCards
    .filter((c) => (c.type_line || '').includes('Land'))
    .reduce((s, c) => s + c.quantity, 0);

  // Check format legality issues
  const illegalCards: string[] = [];
  for (const card of mainCards) {
    if (!card.legalities) continue;
    try {
      const legalities = JSON.parse(card.legalities);
      const status = legalities[format];
      if (status && status !== 'legal' && status !== 'restricted') {
        illegalCards.push(`${card.name} (${status})`);
      }
    } catch {}
  }

  const collectionNote = collectionCardNames
    ? `\nIMPORTANT: The user only owns these cards in their collection. Only suggest cards from this list:\n${collectionCardNames.slice(0, 200).join(', ')}`
    : '';

  const illegalNote = illegalCards.length > 0
    ? `\nWARNING: These cards are NOT LEGAL in ${format} and must be replaced: ${illegalCards.join(', ')}`
    : '';

  // Color identity rule only applies to commander/brawl formats
  const colorRule = isCommanderLike
    ? `1. ONLY suggest ADD cards within color identity {${colors}}. Cards containing colors outside {${colors}} are FORBIDDEN.`
    : `1. Suggest cards that work well in a ${colors || 'any color'} deck.`;

  const sizeRule = isCommanderLike
    ? `4. Commander/brawl: suggest equal numbers of ADDs and CUTs to maintain deck size.`
    : `4. You may suggest more ADDs than CUTs if the deck is under 60 cards.`;

  const prompt = `You are an expert Magic: The Gathering deck builder. Analyze this ${format} deck and suggest improvements.

${commanderInfo}Format: ${format}
${isCommanderLike ? `Color identity: {${colors}} — ONLY these colors allowed` : `Colors used: ${colors || 'Colorless'}`}
Total cards: ${mainCards.reduce((s, c) => s + c.quantity, 0)}
Lands: ${landCount}

Decklist:
${deckSummary}
${illegalNote}${collectionNote}

Provide exactly 5 suggestions as ADD/CUT pairs.

HARD RULES — NEVER violate:
${colorRule}
2. Never suggest cutting lands unless the deck has significantly more than needed.
3. Prioritize replacing illegal cards first.
${sizeRule}

Respond in JSON format only:
{"suggestions": [{"cardName": "Card Name", "reason": "Brief reason", "action": "add|cut"}]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { suggestions: OpenAISuggestionResult['suggestions'] };
    return { suggestions: parsed.suggestions, deckColors, isCommanderLike };
  } catch (error) {
    console.error('OpenAI suggestion error:', error);
    return null;
  }
}

/**
 * Check if a card fits within the deck's color identity.
 */
function fitsColorIdentity(card: DbCard, deckColors: Set<string>): boolean {
  if (deckColors.size === 0) return true;
  try {
    const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    if (ci.length === 0) return true;
    return ci.every((c) => deckColors.has(c));
  } catch {
    return true;
  }
}

/**
 * Resolve OpenAI suggestion card names to actual DbCard objects from the database.
 * Validates color identity (commander formats only) and format legality server-side.
 */
export function resolveOpenAISuggestions(
  result: OpenAISuggestionResult,
  existingCardIds: Set<string>,
  format?: string
): { adds: AISuggestion[]; cutNames: string[] } {
  const db = getDb();
  const adds: AISuggestion[] = [];
  const cutNames: string[] = [];
  const deckColorSet = new Set(result.deckColors);
  const enforceColorIdentity = result.isCommanderLike;

  for (const suggestion of result.suggestions) {
    if (suggestion.action === 'cut') {
      cutNames.push(suggestion.cardName);
      continue;
    }

    // Look up the card in our database
    const card = db
      .prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1')
      .get(suggestion.cardName) as DbCard | undefined;

    if (!card || existingCardIds.has(card.id)) continue;

    // Color identity validation — only for commander/brawl formats
    if (enforceColorIdentity && !fitsColorIdentity(card, deckColorSet)) continue;

    // Format legality check — always applies
    if (format && card.legalities) {
      try {
        const legalities = JSON.parse(card.legalities);
        const status = legalities[format];
        if (status && status !== 'legal' && status !== 'restricted') continue;
      } catch {}
    }

    adds.push({
      card,
      reason: suggestion.reason,
      score: 95,
    });
  }

  return { adds, cutNames };
}
