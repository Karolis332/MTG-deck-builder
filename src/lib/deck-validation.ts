import type { DbCard } from '@/lib/types';
import { DEFAULT_DECK_SIZE, COMMANDER_FORMATS, getLegalityKey } from '@/lib/constants';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  cardNames?: string[];
}

interface DeckEntry {
  card_id: string;
  quantity: number;
  board: string;
  card: DbCard;
}

const UNLIMITED_COPIES = new Set([
  'Plains',
  'Island',
  'Swamp',
  'Mountain',
  'Forest',
  'Wastes',
  'Snow-Covered Plains',
  'Snow-Covered Island',
  'Snow-Covered Swamp',
  'Snow-Covered Mountain',
  'Snow-Covered Forest',
  'Relentless Rats',
  'Rat Colony',
  'Persistent Petitioners',
  'Dragon\'s Approach',
  'Shadowborn Apostle',
  'Seven Dwarves',
]);

function isCommanderFormat(format: string | null): boolean {
  return COMMANDER_FORMATS.includes(format as typeof COMMANDER_FORMATS[number]);
}

export function validateDeck(
  cards: DeckEntry[],
  format: string | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mainCards = cards.filter(
    (c) => c.board === 'main' || c.board === 'commander'
  );
  const sideCards = cards.filter((c) => c.board === 'sideboard');
  const mainTotal = mainCards.reduce((s, c) => s + c.quantity, 0);
  const sideTotal = sideCards.reduce((s, c) => s + c.quantity, 0);

  const expectedSize = DEFAULT_DECK_SIZE[format || 'default'] || 60;
  const isCmd = isCommanderFormat(format);
  const formatLabel = format === 'standardbrawl' ? 'Standard Brawl' : format === 'brawl' ? 'Brawl' : 'Commander';

  // Deck size check
  if (isCmd) {
    if (mainTotal !== expectedSize && mainTotal > 0) {
      issues.push({
        level: mainTotal > expectedSize ? 'error' : 'warning',
        message: `${formatLabel} decks require exactly ${expectedSize} cards (currently ${mainTotal})`,
      });
    }
  } else {
    if (mainTotal > 0 && mainTotal < expectedSize) {
      issues.push({
        level: 'warning',
        message: `Deck has ${mainTotal} cards, minimum is ${expectedSize}`,
      });
    }
  }

  // Sideboard size check (non-commander)
  if (!isCmd && sideTotal > 15) {
    issues.push({
      level: 'error',
      message: `Sideboard has ${sideTotal} cards, maximum is 15`,
    });
  }

  // Commander check
  if (isCmd) {
    const commanders = cards.filter((c) => c.board === 'commander');
    if (commanders.length === 0 && mainTotal > 0) {
      issues.push({
        level: 'warning',
        message: 'No commander designated',
      });
    }
  }

  // Copy limit check
  const maxCopies = isCmd ? 1 : 4;
  const cardsByName: Record<string, { total: number; boards: string[] }> = {};

  for (const entry of cards) {
    const name = entry.card.name;
    if (!cardsByName[name]) {
      cardsByName[name] = { total: 0, boards: [] };
    }
    cardsByName[name].total += entry.quantity;
    cardsByName[name].boards.push(entry.board);
  }

  const overLimitCards: string[] = [];
  for (const [name, info] of Object.entries(cardsByName)) {
    if (UNLIMITED_COPIES.has(name)) continue;
    if (info.total > maxCopies) {
      overLimitCards.push(`${name} (${info.total})`);
    }
  }

  if (overLimitCards.length > 0) {
    issues.push({
      level: 'error',
      message: isCmd
        ? `Singleton rule violated: ${overLimitCards.join(', ')}`
        : `More than 4 copies: ${overLimitCards.join(', ')}`,
      cardNames: overLimitCards,
    });
  }

  // Format legality check
  if (format && mainTotal > 0) {
    const illegalCards: string[] = [];
    for (const entry of cards) {
      if (!entry.card.legalities) continue;
      try {
        const legalities = JSON.parse(entry.card.legalities);
        const status = legalities[getLegalityKey(format)];
        if (status && status !== 'legal' && status !== 'restricted') {
          illegalCards.push(entry.card.name);
        }
      } catch {
        // skip malformed legalities
      }
    }

    const uniqueIllegal = Array.from(new Set(illegalCards));
    if (uniqueIllegal.length > 0) {
      const shown = uniqueIllegal.slice(0, 5);
      const more = uniqueIllegal.length > 5 ? ` and ${uniqueIllegal.length - 5} more` : '';
      issues.push({
        level: 'error',
        message: `Not legal in ${format}: ${shown.join(', ')}${more}`,
        cardNames: uniqueIllegal,
      });
    }
  }

  return issues;
}
