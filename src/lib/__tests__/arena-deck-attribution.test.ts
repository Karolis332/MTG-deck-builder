import { describe, expect, it } from 'vitest';
import {
  arenaQueueToDeckFormat,
  bestDeckMatch,
  normCardName,
  type CandidateDeck,
} from '../arena-deck-attribution';

const deck = (id: number, cards: Record<string, number>, commander: string | null = null): CandidateDeck => ({
  id,
  name: `Deck ${id}`,
  cards: new Map(Object.entries(cards)),
  commander,
});

/** `n` distinct singletons + `basics` Mountains. */
const list = (prefix: string, n: number, basics = 0): Record<string, number> => {
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) out[`${prefix}${i}`] = 1;
  if (basics) out.Mountain = basics;
  return out;
};

describe('arenaQueueToDeckFormat', () => {
  it('maps raw Arena queue ids to app deck formats (the old filter compared them raw and matched nothing)', () => {
    expect(arenaQueueToDeckFormat('Play_Brawl_Historic')).toBe('brawl');
    expect(arenaQueueToDeckFormat('Brawl_Ladder')).toBe('brawl');
    expect(arenaQueueToDeckFormat('DirectGameBrawl')).toBe('brawl');
    expect(arenaQueueToDeckFormat('Ladder')).toBe('standard');
    expect(arenaQueueToDeckFormat('brawl')).toBe('brawl');
  });

  it('returns null for limited and unknown queues', () => {
    expect(arenaQueueToDeckFormat('PremierDraft_LTR_20260825')).toBeNull();
    expect(arenaQueueToDeckFormat('Trad_Sealed_FRA_20260929')).toBeNull();
    expect(arenaQueueToDeckFormat('DirectGame')).toBeNull();
    expect(arenaQueueToDeckFormat(null)).toBeNull();
  });
});

describe('bestDeckMatch', () => {
  const played = new Map(Object.entries(list('c', 10)));

  it('links an exact decklist with confidence 1', () => {
    expect(bestDeckMatch(played, null, [deck(1, list('c', 10))])).toEqual({ deckId: 1, deckName: 'Deck 1', confidence: 1 });
  });

  it('links a partial overlap at or above the threshold and picks the best deck', () => {
    const seven = { ...list('c', 7), x0: 1, x1: 1, x2: 1 };
    const eight = { ...list('c', 8), y0: 1, y1: 1 };
    expect(bestDeckMatch(played, null, [deck(1, seven), deck(2, eight)])).toMatchObject({ deckId: 2, confidence: 0.8 });
  });

  it('returns null below the threshold', () => {
    const six = { ...list('c', 6), x0: 1, x1: 1, x2: 1, x3: 1 };
    expect(bestDeckMatch(played, null, [deck(1, six)])).toBeNull();
  });

  it('counts quantities, so basic lands weigh by copies', () => {
    const arena = new Map(Object.entries(list('c', 2, 8)));
    expect(bestDeckMatch(arena, null, [deck(1, list('c', 2, 4))])).toBeNull(); // 6/10

    expect(bestDeckMatch(arena, null, [deck(1, list('c', 2, 6))])?.confidence).toBeCloseTo(0.8);
  });

  it('skips a deck whose known commander differs, even with full overlap', () => {
    expect(bestDeckMatch(played, 'Esika, God of the Tree', [deck(1, list('c', 10), 'Ashling, Flame Dancer')])).toBeNull();
    expect(bestDeckMatch(played, 'A-Vivi Ornitier', [deck(1, list('c', 10), 'Vivi Ornitier')])?.deckId).toBe(1);
  });

  it('returns null with no saved decks or no resolved cards (caller then creates the deck)', () => {
    expect(bestDeckMatch(played, null, [])).toBeNull();
    expect(bestDeckMatch(new Map(), null, [deck(1, list('c', 10))])).toBeNull();
  });
});

describe('normCardName', () => {
  it('strips the Arena rebalance prefix and the back face', () => {
    expect(normCardName('A-Vivi Ornitier')).toBe('Vivi Ornitier');
    expect(normCardName('Kuja, Genome Sorcerer // Trance Kuja, Fate Defied')).toBe('Kuja, Genome Sorcerer');
    expect(normCardName('Ashling, Flame Dancer')).toBe('Ashling, Flame Dancer');
  });
});
