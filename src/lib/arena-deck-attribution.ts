/**
 * Pure logic for attributing an Arena match to a saved deck (no DB access).
 * DB glue lives in db.ts: matchArenaDeckToSavedDeck / attributeArenaMatch / autoLinkArenaMatches.
 */
import { isBrawlFormat, normalizeQueue } from './arena-log-reader';

/** Share of the match's resolved cards (by quantity) that must be in a saved deck to link it. */
export const DECK_MATCH_THRESHOLD = 0.7;

export interface CandidateDeck {
  id: number;
  name: string;
  /** Card name → quantity, all boards. */
  cards: Map<string, number>;
  commander: string | null;
}

/**
 * Arena queue id (the raw `format` column, e.g. "Play_Brawl_Historic") → app deck format.
 * null for limited / unknown queues: those decks are never saved, so there is nothing to attribute.
 */
export function arenaQueueToDeckFormat(queue: string | null | undefined): string | null {
  const fmt = normalizeQueue(queue);
  if (fmt === 'competitivebrawl') return 'brawl';
  if (fmt === 'draft' || fmt === 'sealed' || fmt === 'other') return null;
  return fmt;
}

export function isArenaBrawlQueue(queue: string | null | undefined): boolean {
  return isBrawlFormat(normalizeQueue(queue));
}

/**
 * Comparison key for a card name: paper name of an Arena rebalance ("A-Name") and front face of a
 * double-faced card (grp_id_cache stores "Front", cards.name stores "Front // Back").
 */
export function normCardName(name: string): string {
  return (name.startsWith('A-') ? name.slice(2) : name).split(' // ')[0];
}

/** Best saved deck at or above the threshold; a known commander on both sides must agree. */
export function bestDeckMatch(
  played: Map<string, number>,
  playedCommander: string | null,
  decks: CandidateDeck[],
  threshold = DECK_MATCH_THRESHOLD
): { deckId: number; deckName: string; confidence: number } | null {
  let total = 0;
  played.forEach((qty) => { total += qty; });
  if (total === 0) return null;

  let best: { deckId: number; deckName: string; confidence: number } | null = null;
  for (const deck of decks) {
    if (playedCommander && deck.commander && normCardName(playedCommander) !== normCardName(deck.commander)) continue;
    let matching = 0;
    played.forEach((qty, name) => { matching += Math.min(qty, deck.cards.get(name) ?? 0); });
    const confidence = matching / total;
    if (confidence >= threshold && (!best || confidence > best.confidence)) {
      best = { deckId: deck.id, deckName: deck.name, confidence };
    }
  }
  return best;
}
