import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';

// Outcome events join their CF impression on (hash(deck_cards, commander), card_name).
// /api/ai-suggest sends main + commander names to /recommend, so every outcome must
// send that same set, read BEFORE the change. In-memory DB; the live DB is never opened.

let memDb: Database.Database;
vi.mock('@/lib/db', () => ({ getDb: () => memDb }));
vi.mock('@/lib/deck-versioning', () => ({ createVersionSnapshot: vi.fn(() => ({ versionNumber: 1 })) }));

import { trackCFEvent, getCFDeckContext } from '@/lib/cf-api-client';
import { cfDeckCardNames, type DeckData } from '@/hooks/use-deck-editor';
import { buildDismissPayload } from '@/components/command-center/consultant/SuggestionCard';

const CF_URL = 'http://cf.test/cf-api';
const fetchMock = vi.fn();

function seed() {
  memDb = new Database(':memory:');
  memDb.exec(`
    CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE cards (id TEXT PRIMARY KEY, name TEXT, color_identity TEXT, cmc REAL, type_line TEXT);
    CREATE TABLE decks (id INTEGER PRIMARY KEY, format TEXT, user_id INTEGER, updated_at TEXT);
    CREATE TABLE deck_cards (id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER, card_id TEXT,
      quantity INTEGER, board TEXT, sort_order INTEGER DEFAULT 0);
    CREATE TABLE collection (user_id INTEGER, card_id TEXT, quantity INTEGER);
    INSERT INTO app_state VALUES ('cf_api_url', '${CF_URL}'), ('cf_api_key', 'test-key');
    INSERT INTO cards VALUES
      ('k', 'Krenko, Mob Boss', '["R"]', 4, 'Legendary Creature'),
      ('b', 'Lightning Bolt', '["R"]', 1, 'Instant'),
      ('m', 'Mountain', '["R"]', 0, 'Basic Land'),
      ('g', 'Goblin Bombardment', '["R"]', 2, 'Enchantment');
    INSERT INTO decks VALUES (1, 'commander', NULL, NULL), (2, 'commander', NULL, NULL);
    INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES
      (1, 'k', 1, 'commander'), (1, 'b', 1, 'main'), (1, 'm', 30, 'main'), (2, 'b', 1, 'main');
  `);
}

const PRE_CHANGE = ['Krenko, Mob Boss', 'Lightning Bolt', 'Mountain'];
const sentBodies = () =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(() => {
  seed();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{"status":"ok"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('trackCFEvent', () => {
  it('POSTs to /events/track with the API key and the payload', async () => {
    await trackCFEvent({ event_type: 'card_added', commander: 'Krenko, Mob Boss', card_name: 'X' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${CF_URL}/events/track`);
    expect(init.method).toBe('POST');
    expect(init.headers['X-API-Key']).toBe('test-key');
    expect(JSON.parse(init.body)).toEqual({ event_type: 'card_added', commander: 'Krenko, Mob Boss', card_name: 'X' });
  });

  it('never throws when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(trackCFEvent({ event_type: 'card_added' })).resolves.toBeUndefined();
  });

  it('sends nothing when CF is disabled', async () => {
    memDb.prepare("INSERT INTO app_state VALUES ('cf_enabled', 'false')").run();
    await trackCFEvent({ event_type: 'card_added' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getCFDeckContext', () => {
  it('returns main + commander names, the set /recommend was called with', () => {
    const ctx = getCFDeckContext(1);
    expect(ctx?.commander).toBe('Krenko, Mob Boss');
    expect(ctx?.colorIdentity).toBe('R');
    expect([...(ctx?.deckCards ?? [])].sort()).toEqual(PRE_CHANGE);
  });

  it('is null for a deck without a commander', () => {
    expect(getCFDeckContext(2)).toBeNull();
  });
});

describe('POST /api/ai-suggest/apply', () => {
  it('reports card_added with the PRE-change deck, so it joins its impression', async () => {
    const { POST } = await import('@/app/api/ai-suggest/apply/route');
    const res = await POST(new NextRequest('http://localhost/api/ai-suggest/apply', {
      method: 'POST',
      body: JSON.stringify({
        deck_id: 1,
        changes: [{ action: 'add', cardId: 'g', cardName: 'Goblin Bombardment', quantity: 1 }],
        candidatesShown: ['Goblin Bombardment'],
        impression_id: 'imp-1',
        source: 'consultant',
      }),
    }));
    expect((await res.json()).ok).toBe(true);
    // The add landed in the DB …
    expect(memDb.prepare("SELECT 1 FROM deck_cards WHERE deck_id = 1 AND card_id = 'g'").get()).toBeTruthy();
    // … but the event carries the deck as it was when the rec was shown.
    const [body] = sentBodies();
    expect(fetchMock.mock.calls[0][0]).toBe(`${CF_URL}/events/track`);
    expect(body).toMatchObject({
      event_type: 'card_added', card_name: 'Goblin Bombardment', commander: 'Krenko, Mob Boss',
      impression_id: 'imp-1', card_cmc: 2, card_type: 'Enchantment',
    });
    expect([...body.deck_cards].sort()).toEqual(PRE_CHANGE);
  });

  it('still applies when the CF API is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const { POST } = await import('@/app/api/ai-suggest/apply/route');
    const res = await POST(new NextRequest('http://localhost/api/ai-suggest/apply', {
      method: 'POST',
      body: JSON.stringify({ deck_id: 1, changes: [{ action: 'add', cardId: 'g', cardName: 'Goblin Bombardment', quantity: 1 }] }),
    }));
    expect((await res.json()).ok).toBe(true);
  });
});

describe('POST /api/ai-suggest/dismiss', () => {
  const suggestion = { card: { name: 'Goblin Bombardment' } } as Parameters<typeof buildDismissPayload>[0];

  it('accepts the payload ModelFeed actually sends and reports card_ignored', async () => {
    const { POST } = await import('@/app/api/ai-suggest/dismiss/route');
    const payload = buildDismissPayload(suggestion, 1, 'imp-1', ['Goblin Bombardment', 'Skullclamp']);
    const res = await POST(new NextRequest('http://localhost/api/ai-suggest/dismiss', {
      method: 'POST', body: JSON.stringify(payload),
    }));
    expect(res.status).toBe(200);
    const [body] = sentBodies();
    expect(body).toMatchObject({
      event_type: 'card_ignored', card_name: 'Goblin Bombardment', commander: 'Krenko, Mob Boss',
      color_identity: 'R', impression_id: 'imp-1', candidates_shown: ['Goblin Bombardment', 'Skullclamp'],
    });
    expect(body.deck_id).toBeUndefined();
    expect([...body.deck_cards].sort()).toEqual(PRE_CHANGE);
  });

  it('rejects a body without deck_id and sends nothing for a commander-less deck', async () => {
    const { POST } = await import('@/app/api/ai-suggest/dismiss/route');
    const bad = await POST(new NextRequest('http://localhost/api/ai-suggest/dismiss', {
      method: 'POST', body: JSON.stringify({ card_name: 'X', commander: 'Krenko, Mob Boss' }),
    }));
    expect(bad.status).toBe(400);
    const noCmd = await POST(new NextRequest('http://localhost/api/ai-suggest/dismiss', {
      method: 'POST', body: JSON.stringify(buildDismissPayload(suggestion, 2, 'imp-2', [])),
    }));
    expect(noCmd.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('cfDeckCardNames (deck editor add/remove events)', () => {
  it('includes the commander, matching the /recommend card set', () => {
    const deck = { cards: [
      { name: 'Krenko, Mob Boss', board: 'commander' },
      { name: 'Lightning Bolt', board: 'main' },
      { name: 'Pyroblast', board: 'sideboard' },
    ] } as unknown as DeckData;
    expect(cfDeckCardNames(deck)).toEqual(['Krenko, Mob Boss', 'Lightning Bolt']);
  });
});
