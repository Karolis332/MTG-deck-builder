import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

let testDb: Database.Database;
vi.mock('@/lib/db', () => ({ getDb: () => testDb }));
vi.mock('../db', () => ({ getDb: () => testDb }));

import {
  getArchetypeStats,
  getArchetypeConsensus,
  getMetaCardStats,
  searchMetaDecks,
  getMetaDeck,
  getCorpusFreshness,
} from '../meta-queries';

/** Insert a deck plus its cards. `cards` entries may repeat a name on purpose. */
function addDeck(
  d: {
    id: number;
    source?: string;
    format?: string;
    archetype?: string;
    eventDate?: string | null;
    wins?: number | null;
    losses?: number | null;
    player?: string;
  },
  cards: Array<[name: string, qty: number, board?: string]>
): void {
  testDb
    .prepare(
      `INSERT INTO community_decks
       (id, source, source_id, format, archetype, deck_name, placement, event_name,
        event_date, wins, losses, draws, record, tournament_type, player_name)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'Test Event', ?, ?, ?, 0, NULL, 'league', ?)`
    )
    .run(
      d.id,
      d.source ?? 'mtgo',
      `src-${d.id}`,
      d.format ?? 'standard',
      d.archetype ?? 'Izzet',
      `Deck ${d.id}`,
      d.eventDate === undefined ? '2026-09-01' : d.eventDate,
      d.wins === undefined ? 5 : d.wins,
      d.losses === undefined ? 0 : d.losses,
      d.player ?? `player${d.id}`
    );
  const ins = testDb.prepare(
    'INSERT INTO community_deck_cards (community_deck_id, card_name, quantity, board) VALUES (?, ?, ?, ?)'
  );
  for (const [name, qty, board] of cards) ins.run(d.id, name, qty, board ?? 'main');
}

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.exec(`
    CREATE TABLE community_decks (
      id INTEGER PRIMARY KEY, source TEXT, source_id TEXT, format TEXT, archetype TEXT,
      deck_name TEXT, placement INTEGER, meta_share REAL, event_name TEXT, event_date TEXT,
      scraped_at TEXT, wins INTEGER, losses INTEGER, draws INTEGER, record TEXT,
      tournament_type TEXT, player_name TEXT);
    CREATE TABLE community_deck_cards (
      community_deck_id INTEGER, card_name TEXT, quantity INTEGER, board TEXT);
  `);
});

describe('getArchetypeStats', () => {
  it('aggregates wins and losses into a win rate', () => {
    addDeck({ id: 1, archetype: 'Izzet', wins: 5, losses: 0 }, [['Opt', 4]]);
    addDeck({ id: 2, archetype: 'Izzet', wins: 3, losses: 2 }, [['Opt', 4]]);
    addDeck({ id: 3, archetype: 'Dimir', wins: 1, losses: 4 }, [['Duress', 2]]);

    const stats = getArchetypeStats({ format: 'standard', since: '2026-08-01' });
    const izzet = stats.find((s) => s.archetype === 'Izzet');

    expect(izzet).toBeDefined();
    expect(izzet!.decks).toBe(2);
    expect(izzet!.wins).toBe(8);
    expect(izzet!.losses).toBe(2);
    expect(izzet!.winRate).toBeCloseTo(0.8, 5);
    // sorted by deck count, most-played first
    expect(stats[0].archetype).toBe('Izzet');
  });

  it('reports winRate null (not zero) when the source carries no W/L', () => {
    addDeck({ id: 1, source: 'mtggoldfish', wins: null, losses: null }, [['Opt', 4]]);

    const [stat] = getArchetypeStats({ format: 'standard', since: '2026-08-01' });

    expect(stat.decks).toBe(1);
    expect(stat.winRate).toBeNull();
  });

  it('excludes decks with no event_date once a window is requested', () => {
    addDeck({ id: 1, archetype: 'Izzet', eventDate: '2026-09-01' }, [['Opt', 4]]);
    addDeck({ id: 2, archetype: 'Ghost', eventDate: null }, [['Opt', 4]]);

    const windowed = getArchetypeStats({ format: 'standard', since: '2026-08-01' });
    expect(windowed.map((s) => s.archetype)).toEqual(['Izzet']);

    const all = getArchetypeStats({ format: 'standard', since: '2026-08-01', includeUndated: true });
    expect(all.map((s) => s.archetype).sort()).toEqual(['Ghost', 'Izzet']);
  });

  it('honours the date window and the source filter', () => {
    addDeck({ id: 1, archetype: 'Recent', eventDate: '2026-09-05' }, [['Opt', 4]]);
    addDeck({ id: 2, archetype: 'Old', eventDate: '2026-03-01' }, [['Opt', 4]]);
    addDeck({ id: 3, archetype: 'Goldfish', source: 'mtggoldfish', eventDate: '2026-09-05' }, [['Opt', 4]]);

    const recent = getArchetypeStats({ format: 'standard', since: '2026-08-01' });
    expect(recent.map((s) => s.archetype).sort()).toEqual(['Goldfish', 'Recent']);

    const mtgoOnly = getArchetypeStats({ format: 'standard', since: '2026-08-01', sources: ['mtgo'] });
    expect(mtgoOnly.map((s) => s.archetype)).toEqual(['Recent']);
  });

  it('filters by format', () => {
    addDeck({ id: 1, format: 'standard', archetype: 'Izzet' }, [['Opt', 4]]);
    addDeck({ id: 2, format: 'modern', archetype: 'Burn' }, [['Bolt', 4]]);

    const stats = getArchetypeStats({ format: 'standard', since: '2026-08-01' });
    expect(stats.map((s) => s.archetype)).toEqual(['Izzet']);
  });
});

describe('archetype spelling variants', () => {
  it('merges punctuation and case variants into one row, keeping the common label', () => {
    addDeck({ id: 1, source: 'mtgtop8', archetype: 'Mono Green Landfall' }, [['Opt', 4]]);
    addDeck({ id: 2, source: 'mtgtop8', archetype: 'Mono Green Landfall' }, [['Opt', 4]]);
    addDeck({ id: 3, source: 'mtgtop8', archetype: 'Mono-green Landfall' }, [['Opt', 4]]);
    addDeck({ id: 4, source: 'mtgtop8', archetype: 'Monogreen Landfall' }, [['Opt', 4]]);

    const stats = getArchetypeStats({ format: 'standard', since: '2026-08-01' });

    expect(stats).toHaveLength(1);
    expect(stats[0].decks).toBe(4);
    expect(stats[0].archetype).toBe('Mono Green Landfall');
  });

  it('does not merge genuinely different granularity', () => {
    addDeck({ id: 1, archetype: 'Mono-Green' }, [['Opt', 4]]);
    addDeck({ id: 2, archetype: 'Mono-Green Landfall' }, [['Opt', 4]]);

    expect(getArchetypeStats({ format: 'standard', since: '2026-08-01' })).toHaveLength(2);
  });

  it('finds a consensus regardless of which spelling the caller asks for', () => {
    addDeck({ id: 1, archetype: 'Mono Green Landfall' }, [['Opt', 4]]);
    addDeck({ id: 2, archetype: 'Monogreen Landfall' }, [['Opt', 4]]);

    const c = getArchetypeConsensus({
      format: 'standard', since: '2026-08-01', archetype: 'Mono-Green Landfall',
    });
    expect(c.deckCount).toBe(2);
    expect(c.main.find((x) => x.name === 'Opt')!.inclusion).toBeCloseTo(1, 5);
  });

  it('matches deck search across spelling variants too', () => {
    addDeck({ id: 1, archetype: 'Mono Green Landfall' }, [['Opt', 4]]);
    addDeck({ id: 2, archetype: 'Monogreen Landfall' }, [['Opt', 4]]);

    expect(searchMetaDecks({
      format: 'standard', since: '2026-08-01', archetype: 'monogreenlandfall',
    })).toHaveLength(2);
  });
});

describe('getArchetypeConsensus', () => {
  it('sums duplicate rows for the same card before averaging', () => {
    // The corpus stores one card as several rows per deck. 3 + 1 must read as a 4-of,
    // never as two separate entries or an average of 2.
    addDeck({ id: 1 }, [
      ['Opt', 3],
      ['Opt', 1],
    ]);
    addDeck({ id: 2 }, [['Opt', 4]]);

    const consensus = getArchetypeConsensus({
      format: 'standard',
      since: '2026-08-01',
      archetype: 'Izzet',
    });
    const opt = consensus.main.find((c) => c.name === 'Opt');

    expect(opt).toBeDefined();
    expect(opt!.avgQty).toBeCloseTo(4, 5);
    expect(opt!.inclusion).toBeCloseTo(1, 5);
    expect(consensus.main.filter((c) => c.name === 'Opt')).toHaveLength(1);
  });

  it('computes inclusion as a share of decks in the window', () => {
    addDeck({ id: 1 }, [['Opt', 4], ['Sear', 2]]);
    addDeck({ id: 2 }, [['Opt', 4]]);
    addDeck({ id: 3 }, [['Opt', 2]]);
    addDeck({ id: 4 }, [['Opt', 4]]);

    const { main, deckCount } = getArchetypeConsensus({
      format: 'standard',
      since: '2026-08-01',
      archetype: 'Izzet',
      minInclusion: 0,
    });

    expect(deckCount).toBe(4);
    expect(main.find((c) => c.name === 'Opt')!.inclusion).toBeCloseTo(1, 5);
    expect(main.find((c) => c.name === 'Sear')!.inclusion).toBeCloseTo(0.25, 5);
    // avgQty is averaged across the decks that PLAY it, not all decks
    expect(main.find((c) => c.name === 'Sear')!.avgQty).toBeCloseTo(2, 5);
    expect(main.find((c) => c.name === 'Opt')!.avgQty).toBeCloseTo(3.5, 5);
  });

  it('drops cards below minInclusion and keeps main and sideboard apart', () => {
    addDeck({ id: 1 }, [['Opt', 4], ['Negate', 2, 'sideboard']]);
    addDeck({ id: 2 }, [['Opt', 4]]);
    addDeck({ id: 3 }, [['Fringe', 1]]);

    const { main, sideboard } = getArchetypeConsensus({
      format: 'standard',
      since: '2026-08-01',
      archetype: 'Izzet',
      minInclusion: 0.5,
    });

    expect(main.map((c) => c.name)).toEqual(['Opt']);
    expect(sideboard.map((c) => c.name)).toEqual([]);

    const loose = getArchetypeConsensus({
      format: 'standard',
      since: '2026-08-01',
      archetype: 'Izzet',
      minInclusion: 0,
    });
    expect(loose.sideboard.map((c) => c.name)).toEqual(['Negate']);
  });

  it('returns an empty consensus rather than throwing for an unknown archetype', () => {
    addDeck({ id: 1 }, [['Opt', 4]]);

    const consensus = getArchetypeConsensus({
      format: 'standard',
      since: '2026-08-01',
      archetype: 'Nonexistent',
    });

    expect(consensus.deckCount).toBe(0);
    expect(consensus.main).toEqual([]);
  });
});

describe('getMetaCardStats', () => {
  it('ranks cards by inclusion and carries a win rate per card', () => {
    addDeck({ id: 1, wins: 5, losses: 0 }, [['Opt', 4], ['Sear', 2]]);
    addDeck({ id: 2, wins: 0, losses: 5 }, [['Opt', 4]]);
    addDeck({ id: 3, wins: 4, losses: 1 }, [['Opt', 2]]);

    const cards = getMetaCardStats({ format: 'standard', since: '2026-08-01' });
    const opt = cards.find((c) => c.name === 'Opt')!;
    const sear = cards.find((c) => c.name === 'Sear')!;

    expect(opt.decks).toBe(3);
    expect(opt.inclusion).toBeCloseTo(1, 5);
    expect(opt.wins).toBe(9);
    expect(opt.losses).toBe(6);
    expect(opt.winRate).toBeCloseTo(0.6, 5);
    // Sear only appears in the 5-0 deck
    expect(sear.winRate).toBeCloseTo(1, 5);
    expect(cards[0].name).toBe('Opt');
  });

  it('sums duplicate rows so avgQty cannot exceed a legal 4-of', () => {
    addDeck({ id: 1 }, [
      ['Opt', 2],
      ['Opt', 2],
    ]);

    const opt = getMetaCardStats({ format: 'standard', since: '2026-08-01' }).find(
      (c) => c.name === 'Opt'
    )!;

    expect(opt.avgQty).toBeCloseTo(4, 5);
    expect(opt.decks).toBe(1);
  });
});

describe('searchMetaDecks and getMetaDeck', () => {
  it('filters by archetype and orders newest first', () => {
    addDeck({ id: 1, archetype: 'Izzet', eventDate: '2026-09-01' }, [['Opt', 4]]);
    addDeck({ id: 2, archetype: 'Izzet', eventDate: '2026-09-08' }, [['Opt', 4]]);
    addDeck({ id: 3, archetype: 'Dimir', eventDate: '2026-09-09' }, [['Duress', 2]]);

    const decks = searchMetaDecks({ format: 'standard', since: '2026-08-01', archetype: 'Izzet' });

    expect(decks.map((d) => d.id)).toEqual([2, 1]);
    expect(decks[0].record).toBe('5-0');
  });

  it('caps the result set at the requested limit', () => {
    for (let i = 1; i <= 10; i++) addDeck({ id: i, eventDate: `2026-09-0${(i % 9) + 1}` }, [['Opt', 4]]);

    expect(searchMetaDecks({ format: 'standard', since: '2026-08-01', limit: 3 })).toHaveLength(3);
  });

  it('returns a full decklist with duplicate rows collapsed', () => {
    addDeck({ id: 7 }, [
      ['Opt', 1],
      ['Opt', 3],
      ['Negate', 2, 'sideboard'],
    ]);

    const deck = getMetaDeck(7)!;

    expect(deck.id).toBe(7);
    expect(deck.main).toEqual([{ name: 'Opt', quantity: 4 }]);
    expect(deck.sideboard).toEqual([{ name: 'Negate', quantity: 2 }]);
    expect(deck.mainCount).toBe(4);
  });

  it('returns null for a missing deck', () => {
    expect(getMetaDeck(999)).toBeNull();
  });
});

describe('getCorpusFreshness', () => {
  it('reports per-source coverage so callers can see what is trustworthy', () => {
    addDeck({ id: 1, source: 'mtgo', eventDate: '2026-09-08', wins: 5, losses: 0 }, [['Opt', 4]]);
    addDeck({ id: 2, source: 'mtgo', eventDate: '2026-09-01', wins: 3, losses: 2 }, [['Opt', 4]]);
    addDeck({ id: 3, source: 'mtgtop8', eventDate: null, wins: null, losses: null }, [['Opt', 4]]);

    const fresh = getCorpusFreshness('standard');
    const mtgo = fresh.find((f) => f.source === 'mtgo')!;
    const top8 = fresh.find((f) => f.source === 'mtgtop8')!;

    expect(mtgo.decks).toBe(2);
    expect(mtgo.withDate).toBe(2);
    expect(mtgo.withRecord).toBe(2);
    expect(mtgo.newestEvent).toBe('2026-09-08');
    expect(top8.withDate).toBe(0);
    expect(top8.withRecord).toBe(0);
    expect(top8.newestEvent).toBeNull();
  });
});
