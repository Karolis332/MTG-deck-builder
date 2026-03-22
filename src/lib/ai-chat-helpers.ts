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

  // Match "- ❌ Already in deck: Card1, Card2" or plain "Already in deck: Card1, Card2"
  const alreadyMatch = assistantMessage.match(/(?:-\s*)?(?:❌\s*)?Already in deck:\s*(.+?)(?:\n|$)/i);
  if (alreadyMatch) {
    result.alreadyInDeck = parseCardList(alreadyMatch[1]);
  }

  // Match "- ❌ Wrong color identity: Card1, Card2 (deck is {W, U})" or plain format
  const colorsMatch = assistantMessage.match(/(?:-\s*)?(?:❌\s*)?Wrong color identity:\s*(.+?)(?:\s*\(deck is|$|\n)/i);
  if (colorsMatch) {
    result.wrongColors = parseCardList(colorsMatch[1]);
  }

  // Match "- ❌ Not legal in format: Card1, Card2" or plain format
  const legalMatch = assistantMessage.match(/(?:-\s*)?(?:❌\s*)?Not legal(?:\s+in\s+\w+)?:\s*(.+?)(?:\n|$)/i);
  if (legalMatch) {
    result.notLegal = parseCardList(legalMatch[1]);
  }

  // Match "- ❌ Not found in database: Card1, Card2" or plain format
  const notFoundMatch = assistantMessage.match(/(?:-\s*)?(?:❌\s*)?Not found(?:\s+in\s+database)?:\s*(.+?)(?:\n|$)/i);
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

/**
 * Extract applied actions from conversation history.
 * Parses [APPLIED BY USER: Cut X, Y. Added A, B.] markers appended by the UI.
 */
export function extractAppliedActions(
  history: Array<{ role: string; content: string }>
): { recentlyAdded: Set<string>; recentlyCut: Set<string> } {
  const recentlyAdded = new Set<string>();
  const recentlyCut = new Set<string>();

  for (const msg of history) {
    if (msg.role !== 'assistant') continue;
    const markers = Array.from(msg.content.matchAll(/\[APPLIED BY USER:\s*(.+?)\]/gi));
    for (const m of markers) {
      const body = m[1];

      const cutMatch = body.match(/Cut\s+(.+?)(?:\.\s*Added|\.$|\]|$)/i);
      if (cutMatch && cutMatch[1].trim()) {
        for (const name of cutMatch[1].split(',').map(s => s.trim()).filter(Boolean)) {
          recentlyCut.add(name.toLowerCase());
        }
      }

      const addMatch = body.match(/Added\s+(.+?)(?:\.\s*|\]|$)/i);
      if (addMatch && addMatch[1].trim()) {
        for (const name of addMatch[1].split(',').map(s => s.trim()).filter(Boolean)) {
          recentlyAdded.add(name.toLowerCase());
        }
      }
    }
  }

  return { recentlyAdded, recentlyCut };
}

/**
 * Build anti-oscillation rules for the system prompt.
 * Prevents the AI from reversing recently applied changes (guarantees fixed-point convergence).
 */
export function buildAntiOscillationRules(
  recentlyAdded: Set<string>,
  recentlyCut: Set<string>,
): string {
  if (recentlyAdded.size === 0 && recentlyCut.size === 0) return '';

  const lines: string[] = [
    '═══ ANTI-OSCILLATION — APPLIED CHANGES ARE FINAL ═══',
    'The user has already applied these changes. They are LOCKED IN. Do NOT reverse them:',
  ];

  if (recentlyAdded.size > 0) {
    lines.push(`\nRECENTLY ADDED (do NOT suggest cutting these):`);
    recentlyAdded.forEach((name) => lines.push(`  - ${name}`));
  }
  if (recentlyCut.size > 0) {
    lines.push(`\nRECENTLY CUT (do NOT suggest re-adding these):`);
    recentlyCut.forEach((name) => lines.push(`  - ${name}`));
  }

  lines.push('');
  lines.push('If you have no NEW improvements beyond these applied changes, respond with:');
  lines.push('{"message":"Your deck is well-optimized! The recent changes have addressed the main areas for improvement.","actions":[]}');

  return lines.join('\n');
}
