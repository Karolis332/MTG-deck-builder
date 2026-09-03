import { validateDeck } from '@/lib/deck-validation';
import type { LiveRailCard } from './types';

const ARENA_FORMATS = new Set(['brawl', 'competitivebrawl', 'standard']);

export interface CoverageStats {
  ownedPct: number;
  totalValueUsd: number;
  illegalCardNames: string[];
  notOnArenaCount: number;
}

/** Pure — no DB/network. Distinct-card ownership % and $ total over quantity. */
export function computeCoverageStats(cards: LiveRailCard[], format: string | null): CoverageStats {
  const playCards = cards.filter((c) => c.board === 'main' || c.board === 'commander');
  const distinct = playCards.length;
  const owned = playCards.filter((c) => (c.owned_qty ?? 0) > 0).length;
  const ownedPct = distinct > 0 ? Math.round((owned / distinct) * 100) : 0;

  const totalValueUsd = playCards.reduce((sum, c) => sum + (parseFloat(c.price_usd ?? '0') || 0) * c.quantity, 0);

  const issues = validateDeck(
    playCards.map((c) => ({ card_id: c.card_id ?? c.id, quantity: c.quantity, board: c.board, card: c })),
    format
  );
  const illegalCardNames = [...new Set(issues.filter((i) => i.level === 'error').flatMap((i) => i.cardNames ?? []))];

  const fmt = (format ?? '').toLowerCase();
  const notOnArenaCount = ARENA_FORMATS.has(fmt) ? playCards.filter((c) => c.arena_id == null).length : 0;

  return { ownedPct, totalValueUsd, illegalCardNames, notOnArenaCount };
}
