import type { DbCard } from '@/lib/types';
import { getLegalityKey } from '@/lib/constants';

/**
 * Check if a card fits within the deck's color identity.
 */
export function fitsColorIdentity(card: DbCard, deckColors: Set<string>): boolean {
  if (deckColors.size === 0) return true;
  try {
    const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    return ci.every((c) => deckColors.has(c));
  } catch {
    return true;
  }
}

/**
 * Check if a card is legal in the given format.
 */
export function isLegalInFormat(card: DbCard, format: string): boolean {
  if (!format || !card.legalities) return true;
  try {
    const legalities = JSON.parse(card.legalities);
    const status = legalities[getLegalityKey(format)];
    return !status || status === 'legal' || status === 'restricted';
  } catch {
    return true;
  }
}

export interface RejectedCards {
  alreadyInDeck: string[];
  wrongColors: string[];
  notLegal: string[];
  notFound: string[];
}

/**
 * Scan assistant messages for rejection patterns and extract card names.
 * Looks for patterns like:
 *   "Already in deck: X, Y"
 *   "Wrong color identity: X, Y"
 *   "Not legal in format: X, Y"
 *   "Not found in database: X, Y"
 */
export function extractRejectedCards(assistantMessage: string): RejectedCards {
  const result: RejectedCards = {
    alreadyInDeck: [],
    wrongColors: [],
    notLegal: [],
    notFound: [],
  };

  if (!assistantMessage) return result;

  // Match "Already in deck: Card1, Card2"
  const alreadyMatch = assistantMessage.match(/Already in deck:\s*(.+?)(?:\n|$)/i);
  if (alreadyMatch) {
    result.alreadyInDeck = parseCardList(alreadyMatch[1]);
  }

  // Match "Wrong color identity: Card1, Card2" or "Wrong color identity: Card1 (deck is {W, U})"
  const colorsMatch = assistantMessage.match(/Wrong color identity:\s*(.+?)(?:\s*\(deck is|$|\n)/i);
  if (colorsMatch) {
    result.wrongColors = parseCardList(colorsMatch[1]);
  }

  // Match "Not legal in format: Card1, Card2" or "Not legal: Card1"
  const legalMatch = assistantMessage.match(/Not legal(?:\s+in\s+\w+)?:\s*(.+?)(?:\n|$)/i);
  if (legalMatch) {
    result.notLegal = parseCardList(legalMatch[1]);
  }

  // Match "Not found in database: Card1, Card2" or "Not found: Card1"
  const notFoundMatch = assistantMessage.match(/Not found(?:\s+in\s+database)?:\s*(.+?)(?:\n|$)/i);
  if (notFoundMatch) {
    result.notFound = parseCardList(notFoundMatch[1]);
  }

  return result;
}

/** Parse a comma-separated card list, stripping markers and whitespace */
function parseCardList(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== '—');
}

/**
 * Build a system message reminding the AI not to suggest previously rejected cards.
 */
export function buildRejectionReminder(rejected: RejectedCards): string {
  const lines: string[] = [];

  for (const name of rejected.alreadyInDeck) {
    lines.push(`- ${name} (already in deck)`);
  }
  for (const name of rejected.wrongColors) {
    lines.push(`- ${name} (wrong color identity)`);
  }
  for (const name of rejected.notLegal) {
    lines.push(`- ${name} (not legal in format)`);
  }
  for (const name of rejected.notFound) {
    lines.push(`- ${name} (not found in database)`);
  }

  if (lines.length === 0) return '';

  return `═══ REJECTED CARDS FROM LAST TURN ═══
DO NOT suggest these cards again:
${lines.join('\n')}
Suggest DIFFERENT cards instead.`;
}
