import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getDeckWithCards = vi.fn();
const getFormatStaples = vi.fn(() => []);
const logAISuggestion = vi.fn();
const getDb = vi.fn(() => ({ prepare: () => ({ all: () => [], get: () => undefined }) }));

vi.mock('@/lib/db', () => ({ getDb, getDeckWithCards, getFormatStaples, logAISuggestion }));

type SuggestionFixture = { card: FixtureCard; reason: string; score: number };

const getRuleBasedSuggestions = vi.fn((): SuggestionFixture[] => []);
const getOllamaSuggestions = vi.fn(async () => []);
vi.mock('@/lib/ai-suggest', () => ({ getRuleBasedSuggestions, getOllamaSuggestions }));

const getSynergySuggestions = vi.fn((): SuggestionFixture[] => []);
vi.mock('@/lib/deck-builder-ai', () => ({
  getSynergySuggestions,
  detectDeckThemes: vi.fn(() => []),
  SYNERGY_GROUPS: {},
}));

vi.mock('@/lib/global-learner', () => ({
  getCardGlobalScore: vi.fn(() => ({ confidence: 0, playedWinRate: 0, gamesPlayed: 0 })),
}));

const getOpenAISuggestions = vi.fn(async () => null);
vi.mock('@/lib/openai-suggest', () => ({
  getOpenAISuggestions,
  resolveOpenAISuggestions: vi.fn(() => ({ adds: [], cutNames: [] })),
}));

const getCFRecommendations = vi.fn();
const resolveCFToDbCards = vi.fn((): SuggestionFixture[] => []);
const trackCFEvent = vi.fn(async () => {});
vi.mock('@/lib/cf-api-client', () => ({ getCFRecommendations, resolveCFToDbCards, trackCFEvent }));

vi.mock('@/lib/deck-templates', () => ({
  validateAgainstTemplate: vi.fn(() => ({ warnings: [], score: 100 })),
}));

vi.mock('@/lib/commander-synergy', () => ({ analyzeCommander: vi.fn(() => null) }));
vi.mock('@/lib/collection-coverage', () => ({ computeCollectionCoverage: vi.fn(() => null) }));

interface FixtureCard {
  id: string;
  name: string;
  board: string;
  quantity: number;
  color_identity: string;
  legalities: string;
  type_line: string;
  oracle_text: string;
  cmc: number;
  edhrec_rank: number | null;
  image_uri_small: string | null;
}

function makeCard(id: string, name: string, board: string): FixtureCard {
  return {
    id,
    name,
    board,
    quantity: 1,
    color_identity: '["R"]',
    legalities: '{"commander":"legal"}',
    type_line: 'Creature — Goblin',
    oracle_text: '',
    cmc: 2,
    edhrec_rank: 1000,
    image_uri_small: null,
  };
}

const deckFixture = {
  format: 'commander',
  cards: [
    makeCard('cmd-1', 'Krenko, Mob Boss', 'commander'),
    makeCard('main-1', 'Lightning Bolt', 'main'),
  ],
};

describe('POST /api/ai-suggest passive mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeckWithCards.mockReturnValue(deckFixture);
  });

  it('returns CF recommendations tagged source: collaborative-filtering and never calls an LLM', async () => {
    const { POST } = await import('@/app/api/ai-suggest/route');
    const cfRecs = [
      { card_name: 'Goblin Bombardment', cf_score: 0.9, similar_deck_count: 40, reason: 'Found in 40 similar decks' },
      { card_name: 'Skirk Prospector', cf_score: 0.8, similar_deck_count: 30, reason: 'Found in 30 similar decks' },
      { card_name: 'Reckless Fireweaver', cf_score: 0.7, similar_deck_count: 20, reason: 'Found in 20 similar decks' },
    ];
    getCFRecommendations.mockResolvedValue(cfRecs);
    resolveCFToDbCards.mockReturnValue(
      cfRecs.map((r) => ({ card: makeCard(r.card_name, r.card_name, 'main'), reason: r.reason, score: r.cf_score }))
    );

    const req = new NextRequest('http://localhost/api/ai-suggest', {
      method: 'POST',
      body: JSON.stringify({ deck_id: 1, mode: 'passive' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.source).toBe('collaborative-filtering');
    expect(json.suggestions).toHaveLength(3);
    expect(json.impression_id).toBeTruthy();
    expect(getOllamaSuggestions).not.toHaveBeenCalled();
    expect(getOpenAISuggestions).not.toHaveBeenCalled();
    expect(trackCFEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'suggestions_shown', mode: 'passive', source: 'collaborative-filtering' })
    );
  });

  it('falls back to synergy/rules when CF is empty, and lists both sources_tried, never calling an LLM', async () => {
    const { POST } = await import('@/app/api/ai-suggest/route');
    getCFRecommendations.mockResolvedValue([]);
    getSynergySuggestions.mockReturnValue([
      { card: makeCard('syn-1', 'Goblin Chieftain', 'main'), reason: 'Synergy pick', score: 5 },
    ]);

    const req = new NextRequest('http://localhost/api/ai-suggest', {
      method: 'POST',
      body: JSON.stringify({ deck_id: 1, mode: 'passive' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.source).toBe('synergy');
    expect(json.sources_tried).toEqual(['collaborative-filtering', 'synergy', 'rules']);
    expect(getOllamaSuggestions).not.toHaveBeenCalled();
    expect(getOpenAISuggestions).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai-suggest/dismiss', () => {
  it('posts a suggestion_dismissed event with the right payload', async () => {
    trackCFEvent.mockClear();
    const { POST } = await import('@/app/api/ai-suggest/dismiss/route');
    const req = new NextRequest('http://localhost/api/ai-suggest/dismiss', {
      method: 'POST',
      body: JSON.stringify({
        impression_id: 'imp-1',
        card_name: 'Goblin Bombardment',
        commander: 'Krenko, Mob Boss',
        deck_cards: ['Lightning Bolt'],
        candidates_shown: ['Goblin Bombardment'],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(trackCFEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'suggestion_dismissed',
        impression_id: 'imp-1',
        card_name: 'Goblin Bombardment',
        commander: 'Krenko, Mob Boss',
      })
    );
  });
});
