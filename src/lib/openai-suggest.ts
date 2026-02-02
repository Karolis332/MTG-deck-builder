/**
 * OpenAI-powered card suggestion engine.
 *
 * Uses the user's OpenAI API key (stored in app_state) to get GPT-powered
 * deck improvement suggestions. Falls back gracefully if no key is set.
 */

import { getDb } from '@/lib/db';
import type { DbCard } from '@/lib/types';
import type { AISuggestion } from '@/lib/types';

interface OpenAISuggestionResult {
  suggestions: Array<{
    cardName: string;
    reason: string;
    action: 'add' | 'cut';
  }>;
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

  // Build deck summary for the prompt
  const deckSummary = mainCards
    .map((c) => `${c.quantity}x ${c.name} (${c.type_line}, CMC ${c.cmc})`)
    .join('\n');

  const commanderInfo = commanderCards.length > 0
    ? `Commander: ${commanderCards.map((c) => c.name).join(', ')}\n`
    : '';

  // Detect colors
  const colorSet = new Set<string>();
  for (const card of mainCards) {
    try {
      const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
      ci.forEach((c) => colorSet.add(c));
    } catch {}
  }
  const colors = Array.from(colorSet).join('');

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

  const prompt = `You are an expert Magic: The Gathering deck builder. Analyze this ${format} deck and suggest improvements.

${commanderInfo}Format: ${format}
Colors: ${colors || 'Colorless'}
Total cards: ${mainCards.reduce((s, c) => s + c.quantity, 0)}
Lands: ${landCount}

Decklist:
${deckSummary}
${illegalNote}${collectionNote}

Provide exactly 5 suggestions. For each, specify whether to ADD a new card or CUT an existing card, the card name, and a brief reason why (focusing on synergy, win rate improvement, or format legality).

IMPORTANT RULES:
- Never suggest cutting lands unless the deck has significantly more than needed
- Prioritize replacing illegal cards first
- Consider mana curve, color balance, and deck synergy
- For commander/brawl decks, 36-38 lands is standard for 100-card decks

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

    const parsed = JSON.parse(content) as OpenAISuggestionResult;
    return parsed;
  } catch (error) {
    console.error('OpenAI suggestion error:', error);
    return null;
  }
}

/**
 * Resolve OpenAI suggestion card names to actual DbCard objects from the database.
 */
export function resolveOpenAISuggestions(
  result: OpenAISuggestionResult,
  existingCardIds: Set<string>
): { adds: AISuggestion[]; cutNames: string[] } {
  const db = getDb();
  const adds: AISuggestion[] = [];
  const cutNames: string[] = [];

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

    adds.push({
      card,
      reason: suggestion.reason,
      score: 95, // High score for GPT suggestions
    });
  }

  return { adds, cutNames };
}
