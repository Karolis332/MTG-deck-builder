import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';

// Outcome events join their CF impression on (hash(deck_cards, commander), card_name).
// /recommend gets main + commander names, so every outcome must send that same set,
// as it was when the suggestions were fetched. In-memory DB; the live DB is never opened.

let memDb: Database.Database;
vi.mock('@/lib/db', () => ({ getDb: () => memDb }));
vi.mock('@/lib/deck-versioning', () => ({ createVersionSnapshot: vi.fn(() => ({ versionNumber: 1 })) }));
const { getAuthUser } = vi.hoisted(() => ({ getAuthUser: vi.fn() }));
vi.mock('@/lib/auth-middleware', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-middleware')>()),
  getAuthUser,
}));

import { trackCFEvent, getCFDeckContext } from '@/lib/cf-api-client';
import { cfDeckCardNames, rememberCFImpression, recallCFImpression } from '@/lib/cf-impressions';
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
      ('g', 'Goblin Bombardment', '["R"]', 2, 'Enchantment'),
      ('s', 'Skullclamp', '[]', 1, 'Artifact');
    INSERT INTO decks VALUES (1, 'commander', 1, NULL), (2, 'commander', 1, NULL), (3, 'commander', 2, NULL);
    INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES
      (1, 'k', 1, 'commander'), (1, 'b', 1, 'main'), (1, 'm', 30, 'main'), (2, 'b', 1, 'main'),
      (3, 'k', 1, 'commander');
  `);
}

const PRE_CHANGE = ['Krenko, Mob Boss', 'Lightning Bolt', 'Mountain'];
const IMP = { deckId: 1, userId: 1, commander: 'Krenko, Mob Boss', colorIdentity: 'R', deckCards: PRE_CHANGE };
const sentBodies = () =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
const applyReq = (body: object) => new NextRequest('http://localhost/api/ai-suggest/apply', {
  method: 'POST', body: JSON.stringify(body),
});
const dismissReq = (body: object) => new NextRequest('http://localhost/api/ai-suggest/dismiss', {
  method: 'POST', body: JSON.stringify(body),
});
const add = (cardId: string, cardName: string) => ({ action: 'add', cardId, cardName, quantity: 1 });
const suggestion = { card: { name: 'Goblin Bombardment' } } as Parameters<typeof buildDismissPayload>[0];

beforeEach(() => {
  seed();
  getAuthUser.mockReset();
  getAuthUser.mockResolvedValue({ userId: 1, username: 'u' });
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
    const ctx = getCFDeckContext(1, 1);
    expect(ctx?.commander).toBe('Krenko, Mob Boss');
    expect(ctx?.colorIdentity).toBe('R');
    expect([...(ctx?.deckCards ?? [])].sort()).toEqual(PRE_CHANGE);
  });

  it("is null for a deck without a commander, or another user's deck", () => {
    expect(getCFDeckContext(2, 1)).toBeNull();
    expect(getCFDeckContext(3, 1)).toBeNull();
  });
});

describe('POST /api/ai-suggest/apply', () => {
  it('without a registered impression (chat), reports the PRE-change deck', async () => {
    const { POST } = await import('@/app/api/ai-suggest/apply/route');
    const res = await POST(applyReq({
      deck_id: 1, changes: [add('g', 'Goblin Bombardment')], candidatesShown: ['Goblin Bombardment'], source: 'consultant',
    }));
    expect((await res.json()).ok).toBe(true);
    expect(memDb.prepare("SELECT 1 FROM deck_cards WHERE deck_id = 1 AND card_id = 'g'").get()).toBeTruthy();
    const [body] = sentBodies();
    expect(fetchMock.mock.calls[0][0]).toBe(`${CF_URL}/events/track`);
    expect(body).toMatchObject({
      event_type: 'card_added', card_name: 'Goblin Bombardment', commander: 'Krenko, Mob Boss',
      card_cmc: 2, card_type: 'Enchantment',
    });
    expect([...body.deck_cards].sort()).toEqual(PRE_CHANGE);
  });

  it('still applies when the CF API is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const { POST } = await import('@/app/api/ai-suggest/apply/route');
    const res = await POST(applyReq({ deck_id: 1, changes: [add('g', 'Goblin Bombardment')] }));
    expect((await res.json()).ok).toBe(true);
  });

  it("401 without a session, 404 for another user's deck, nothing sent or written", async () => {
    const { POST } = await import('@/app/api/ai-suggest/apply/route');
    expect((await POST(applyReq({ deck_id: 3, changes: [add('g', 'Goblin Bombardment')] }))).status).toBe(404);
    getAuthUser.mockResolvedValue(null);
    expect((await POST(applyReq({ deck_id: 1, changes: [add('g', 'Goblin Bombardment')] }))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(memDb.prepare("SELECT 1 FROM deck_cards WHERE card_id = 'g'").get()).toBeUndefined();
  });
});

describe('Apply all / dismiss after apply (impression registry)', () => {
  it('every event in the batch carries the deck the suggestions were fetched for', async () => {
    rememberCFImpression('imp-all', IMP);
    const { POST: apply } = await import('@/app/api/ai-suggest/apply/route');
    const { POST: dismiss } = await import('@/app/api/ai-suggest/dismiss/route');
    // ModelFeed's handleApplyAll: one request per suggestion, same impression_id.
    const r1 = await apply(applyReq({ deck_id: 1, changes: [add('g', 'Goblin Bombardment')], impression_id: 'imp-all' }));
    const r2 = await apply(applyReq({ deck_id: 1, changes: [add('s', 'Skullclamp')], impression_id: 'imp-all' }));
    expect([(await r1.json()).ok, (await r2.json()).ok]).toEqual([true, true]);
    await dismiss(dismissReq(buildDismissPayload(suggestion, 1, 'imp-all', [])));
    const bodies = sentBodies();
    expect(bodies.map((b) => b.event_type)).toEqual(['card_added', 'card_added', 'card_ignored']);
    for (const b of bodies) expect([...b.deck_cards].sort()).toEqual(PRE_CHANGE);
  });

  it('binds an impression to its deck and user', () => {
    rememberCFImpression('imp-bound', IMP);
    expect(recallCFImpression('imp-bound', 1, 1)).toEqual(IMP);
    expect(recallCFImpression('imp-bound', 2, 1)).toBeNull();
    expect(recallCFImpression('imp-bound', 1, 2)).toBeNull();
    expect(recallCFImpression(undefined, 1, 1)).toBeNull();
  });
});

describe('POST /api/ai-suggest/dismiss', () => {
  it('reports card_ignored for a CF impression, from the payload ModelFeed actually sends', async () => {
    rememberCFImpression('imp-1', IMP);
    const { POST } = await import('@/app/api/ai-suggest/dismiss/route');
    const res = await POST(dismissReq(buildDismissPayload(suggestion, 1, 'imp-1', ['Goblin Bombardment', 'Skullclamp'])));
    expect(res.status).toBe(200);
    const [body] = sentBodies();
    expect(fetchMock.mock.calls[0][0]).toBe(`${CF_URL}/events/track`);
    expect(body).toMatchObject({
      event_type: 'card_ignored', card_name: 'Goblin Bombardment', commander: 'Krenko, Mob Boss',
      color_identity: 'R', impression_id: 'imp-1', candidates_shown: ['Goblin Bombardment', 'Skullclamp'],
    });
    expect(body.deck_id).toBeUndefined();
    expect([...body.deck_cards].sort()).toEqual(PRE_CHANGE);
  });

  it('sends nothing for a rules/LLM suggestion (never registered as a CF impression)', async () => {
    const { POST } = await import('@/app/api/ai-suggest/dismiss/route');
    const res = await POST(dismissReq(buildDismissPayload(suggestion, 1, 'imp-rules-feed', [])));
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401 without a session, 400 without deck_id', async () => {
    rememberCFImpression('imp-1', IMP);
    const { POST } = await import('@/app/api/ai-suggest/dismiss/route');
    expect((await POST(dismissReq({ card_name: 'X', impression_id: 'imp-1' }))).status).toBe(400);
    getAuthUser.mockResolvedValue(null);
    expect((await POST(dismissReq(buildDismissPayload(suggestion, 1, 'imp-1', [])))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('cfDeckCardNames (feed, chat and editor all use it for /recommend and events)', () => {
  it('is main + commander', () => {
    expect(cfDeckCardNames([
      { name: 'Krenko, Mob Boss', board: 'commander' },
      { name: 'Lightning Bolt', board: 'main' },
      { name: 'Pyroblast', board: 'sideboard' },
    ])).toEqual(['Krenko, Mob Boss', 'Lightning Bolt']);
  });
});

describe('getCFRecommendations log_impressions', () => {
  it('sends log_impressions:false only when an internal caller asks for it', async () => {
    const { getCFRecommendations } = await import('@/lib/cf-api-client');
    fetchMock.mockImplementation(async () => new Response('{"recommendations":[]}', { status: 200 }));
    await getCFRecommendations(['Lightning Bolt'], 'Krenko, Mob Boss', 50, { logImpressions: false });
    await getCFRecommendations(['Mountain'], 'Krenko, Mob Boss', 30);
    const [internal, displayed] = sentBodies();
    expect(fetchMock.mock.calls[0][0]).toBe(`${CF_URL}/recommend`);
    expect(internal).toEqual({ cards: ['Lightning Bolt'], commander: 'Krenko, Mob Boss', limit: 50, log_impressions: false });
    expect(displayed).toEqual({ cards: ['Mountain'], commander: 'Krenko, Mob Boss', limit: 30 });
  });
});
