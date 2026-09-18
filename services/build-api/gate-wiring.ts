/**
 * Build API — deck-gate wiring.
 *
 * The service runs the same gate the desktop CLI runs, with one difference: it
 * must never read the desktop `collection` table, so ownership comes from the
 * request's `ownedCards` array or is skipped.
 */
import {
  gateDeck,
  commanderClosers,
  DEFAULT_LOCKS,
  type GateOptions,
  type GateVerdict,
} from '../../src/lib/deck-gate';

export const MAX_LOCKS = 50;

/** `locks` from a request body: up to 50 non-empty strings. */
export function readLocks(parsed: Record<string, unknown>): string[] {
  if (!Array.isArray(parsed.locks)) return [];
  return (parsed.locks as unknown[])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 200))
    .slice(0, MAX_LOCKS);
}

/** `ownedCards` from a request body, as plain names. Null when the caller sent none. */
export function readOwnedCardNames(parsed: Record<string, unknown>): string[] | null {
  if (!Array.isArray(parsed.ownedCards)) return null;
  return (parsed.ownedCards as unknown[])
    .map((e) => (typeof e === 'string' ? e : String((e as { name?: unknown })?.name || '')))
    .map((n) => n.trim())
    .filter(Boolean);
}

export interface DeckTextLine {
  name: string;
  quantity: number;
  board?: string;
}

/**
 * Render lines as a decklist the gate can parse. Commander section first, and
 * front-face names only — the service controls this rendering, so it must emit
 * what Arena's importer accepts rather than the DB's "Front // Back" name.
 */
export function deckText(lines: DeckTextLine[]): string {
  const commanders = lines.filter((l) => l.board === 'commander');
  const main = lines.filter((l) => l.board !== 'commander' && l.board !== 'sideboard');
  const side = lines.filter((l) => l.board === 'sideboard');
  const block = (rows: DeckTextLine[]): string =>
    rows.map((r) => `${r.quantity} ${r.name.split(' // ')[0]}`).join('\n');
  return [
    commanders.length ? `Commander\n${block(commanders)}` : '',
    `Deck\n${block(main)}`,
    side.length ? `Sideboard\n${block(side)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface CutLike {
  name: string;
  quantity: number;
  reasons: string[];
  category: string;
  cmc: number;
}

/**
 * Every cut must say why. `reasons` can come back empty when a card is cut on a
 * hard legality issue with no detail, and the site shipped blank rows because of
 * it — so fall back to the facts we always have.
 */
export function cutReason(cut: CutLike, offPlan: boolean): string {
  const parts = [...cut.reasons.filter((r) => r && r.trim())];
  if (offPlan) parts.push("Never satisfies the commander's trigger condition");
  if (!parts.length) {
    parts.push(`Weakest ${cut.category} slot at ${cut.cmc} mana — nothing else earns this card its place`);
  }
  return parts.join('; ');
}

/** Names the gate's `locks` check would fail on if they were cut. */
export function lockedNames(
  deckNames: string[],
  locks: string[],
  closers: Set<string>
): Set<string> {
  const patterns = [...DEFAULT_LOCKS, ...locks];
  const plain = new Set(patterns.filter((p) => !p.startsWith('/')).map((p) => p.toLowerCase()));
  const regexes = patterns
    .filter((p) => p.startsWith('/'))
    .map((p) => {
      const m = p.match(/^\/(.+)\/([a-z]*)$/);
      return m ? new RegExp(m[1], m[2] || 'i') : null;
    })
    .filter((r): r is RegExp => r !== null);
  const out = new Set(closers);
  for (const name of deckNames) {
    if (plain.has(name.toLowerCase()) || regexes.some((r) => r.test(name))) out.add(name);
  }
  return out;
}

export { commanderClosers, gateDeck };
export type { GateOptions, GateVerdict };
