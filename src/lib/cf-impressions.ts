/**
 * Impression registry: impression_id → the exact deck state CF /recommend was
 * called with. Outcome events for a batch ("Apply all", a dismiss after an apply)
 * must carry the deck the suggestions were fetched for, not the deck as it is by
 * the time the event fires, or they never join their impression server-side.
 *
 * Only CF-sourced suggestion sets are registered, so a miss also means "not a CF
 * impression". The id is a server-generated UUID the client only echoes back;
 * entries are bound to deck + user and checked on recall.
 */

/**
 * The card set sent to CF /recommend and in every outcome event: main + commander
 * names. The server hashes it with the commander; one definition keeps the feed,
 * chat and editor events on the same hash.
 */
export function cfDeckCardNames(cards: ReadonlyArray<{ board: string; name: string }>): string[] {
  return cards.filter((c) => c.board === 'main' || c.board === 'commander').map((c) => c.name);
}

export interface CFImpressionContext {
  deckId: number;
  userId: number | null;
  commander: string;
  colorIdentity: string;
  deckCards: string[];
}

// ponytail: process memory, bounded FIFO; lost on restart (the feed refetches on load).
const MAX_ENTRIES = 500;
const g = globalThis as unknown as { __cfImpressions?: Map<string, CFImpressionContext> };
const store = (g.__cfImpressions ??= new Map());

export function rememberCFImpression(impressionId: string, ctx: CFImpressionContext): void {
  store.set(impressionId, ctx);
  if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string);
}

export function recallCFImpression(
  impressionId: string | undefined,
  deckId: number,
  userId: number
): CFImpressionContext | null {
  const ctx = impressionId ? store.get(impressionId) : undefined;
  return ctx && ctx.deckId === deckId && ctx.userId === userId ? ctx : null;
}
