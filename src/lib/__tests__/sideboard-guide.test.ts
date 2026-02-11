import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MIGRATIONS } from '@/db/schema';

// We need to mock getDb before importing the module under test
let testDb: Database.Database;

vi.mock('@/lib/db', () => ({
  getDb: () => testDb,
}));

// Import after mock setup
import { generateSideboardGuide, getCachedGuides, invalidateGuides } from '../sideboard-guide';
import type { SideboardPlan } from '../sideboard-guide';

// ── Test Fixtures ────────────────────────────────────────────────────────────

const sampleDeckCards = [
  { name: 'Lightning Bolt', quantity: 4, board: 'main', typeLine: 'Instant' },
  { name: 'Goblin Guide', quantity: 4, board: 'main', typeLine: 'Creature — Goblin Scout' },
  { name: 'Monastery Swiftspear', quantity: 4, board: 'main', typeLine: 'Creature — Human Monk' },
  { name: 'Lava Spike', quantity: 4, board: 'main', typeLine: 'Sorcery' },
  { name: 'Mountain', quantity: 18, board: 'main', typeLine: 'Basic Land — Mountain' },
  { name: 'Searing Blood', quantity: 2, board: 'sideboard', typeLine: 'Instant' },
  { name: 'Roiling Vortex', quantity: 2, board: 'sideboard', typeLine: 'Enchantment' },
  { name: 'Smash to Smithereens', quantity: 3, board: 'sideboard', typeLine: 'Instant' },
];

const sampleApiResponse: SideboardPlan[] = [
  {
    opponentArchetype: 'Aggro',
    opponentColors: 'RW',
    cardsIn: [{ name: 'Searing Blood', quantity: 2, reason: 'Removal + damage' }],
    cardsOut: [{ name: 'Lava Spike', quantity: 2, reason: 'Too slow on the draw' }],
    strategyNotes: 'Race plan, but interact with their creatures.',
  },
  {
    opponentArchetype: 'Control',
    opponentColors: 'UW',
    cardsIn: [{ name: 'Roiling Vortex', quantity: 2, reason: 'Punishes lifegain and free spells' }],
    cardsOut: [{ name: 'Lava Spike', quantity: 2, reason: 'Too easy to counter' }],
    strategyNotes: 'Resolve threats early. Save burn for face.',
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────

function setupTestDb() {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  for (const migration of MIGRATIONS) {
    testDb.transaction(() => {
      testDb.exec(migration.sql);
      testDb.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(
        migration.version, migration.name
      );
    })();
  }

  // Insert prerequisite rows for FK constraints (sideboard_guides → decks → users)
  testDb.prepare(
    "INSERT INTO users (id, username, email, password_hash) VALUES (1, 'test', 'test@test.com', 'hash')"
  ).run();
  testDb.prepare(
    "INSERT INTO decks (id, name, format, user_id) VALUES (1, 'Test Burn', 'standard', 1)"
  ).run();
  testDb.prepare(
    "INSERT INTO decks (id, name, format, user_id) VALUES (2, 'Test Control', 'standard', 1)"
  ).run();
}

describe('sideboard-guide', () => {
  beforeEach(() => {
    setupTestDb();
  });

  afterEach(() => {
    if (testDb) testDb.close();
    vi.restoreAllMocks();
  });

  // ── getCachedGuides ──────────────────────────────────────────────────────

  describe('getCachedGuides', () => {
    it('should return empty array when no guides cached', () => {
      const guides = getCachedGuides(999);
      expect(guides).toEqual([]);
    });

    it('should return cached guides for a deck', () => {
      // Insert test data directly
      testDb.prepare(
        `INSERT INTO sideboard_guides (deck_id, opponent_archetype, opponent_colors, cards_in, cards_out, reasoning)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        1, 'Aggro', 'RW',
        JSON.stringify([{ name: 'Searing Blood', quantity: 2, reason: 'removal' }]),
        JSON.stringify([{ name: 'Lava Spike', quantity: 2, reason: 'slow' }]),
        'Race plan'
      );

      const guides = getCachedGuides(1);
      expect(guides).toHaveLength(1);
      expect(guides[0].opponentArchetype).toBe('Aggro');
      expect(guides[0].opponentColors).toBe('RW');
      expect(guides[0].cardsIn).toHaveLength(1);
      expect(guides[0].cardsIn[0].name).toBe('Searing Blood');
      expect(guides[0].cardsOut).toHaveLength(1);
      expect(guides[0].cardsOut[0].name).toBe('Lava Spike');
      expect(guides[0].strategyNotes).toBe('Race plan');
    });

    it('should return guides ordered by archetype name', () => {
      const insert = testDb.prepare(
        `INSERT INTO sideboard_guides (deck_id, opponent_archetype, opponent_colors, cards_in, cards_out, reasoning)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      insert.run(1, 'Control', null, '[]', '[]', 'notes1');
      insert.run(1, 'Aggro', null, '[]', '[]', 'notes2');
      insert.run(1, 'Midrange', null, '[]', '[]', 'notes3');

      const guides = getCachedGuides(1);
      expect(guides).toHaveLength(3);
      expect(guides[0].opponentArchetype).toBe('Aggro');
      expect(guides[1].opponentArchetype).toBe('Control');
      expect(guides[2].opponentArchetype).toBe('Midrange');
    });

    it('should not return guides for a different deck', () => {
      testDb.prepare(
        `INSERT INTO sideboard_guides (deck_id, opponent_archetype, opponent_colors, cards_in, cards_out, reasoning)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(1, 'Aggro', 'RW', '[]', '[]', 'notes');

      const guides = getCachedGuides(2);
      expect(guides).toEqual([]);
    });

    it('should handle null reasoning as empty string', () => {
      testDb.prepare(
        `INSERT INTO sideboard_guides (deck_id, opponent_archetype, opponent_colors, cards_in, cards_out, reasoning)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(1, 'Combo', null, '[]', '[]', null);

      const guides = getCachedGuides(1);
      expect(guides[0].strategyNotes).toBe('');
    });
  });

  // ── invalidateGuides ─────────────────────────────────────────────────────

  describe('invalidateGuides', () => {
    it('should delete all cached guides for a deck', () => {
      const insert = testDb.prepare(
        `INSERT INTO sideboard_guides (deck_id, opponent_archetype, opponent_colors, cards_in, cards_out, reasoning)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      insert.run(1, 'Aggro', null, '[]', '[]', 'a');
      insert.run(1, 'Control', null, '[]', '[]', 'b');

      expect(getCachedGuides(1)).toHaveLength(2);

      invalidateGuides(1);
      expect(getCachedGuides(1)).toHaveLength(0);
    });

    it('should not delete guides for other decks', () => {
      const insert = testDb.prepare(
        `INSERT INTO sideboard_guides (deck_id, opponent_archetype, opponent_colors, cards_in, cards_out, reasoning)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      insert.run(1, 'Aggro', null, '[]', '[]', 'a');
      insert.run(2, 'Aggro', null, '[]', '[]', 'b');

      invalidateGuides(1);
      expect(getCachedGuides(1)).toHaveLength(0);
      expect(getCachedGuides(2)).toHaveLength(1);
    });

    it('should not throw when no guides exist', () => {
      expect(() => invalidateGuides(999)).not.toThrow();
    });
  });

  // ── generateSideboardGuide ───────────────────────────────────────────────

  describe('generateSideboardGuide', () => {
    it('should throw when no API key is configured', async () => {
      await expect(
        generateSideboardGuide(1, sampleDeckCards, 'standard')
      ).rejects.toThrow('Claude API key not configured');
    });

    it('should throw when no sideboard cards exist', async () => {
      // Set API key
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'test-key')").run();

      const mainOnly = sampleDeckCards.filter(c => c.board === 'main');
      await expect(
        generateSideboardGuide(1, mainOnly, 'standard')
      ).rejects.toThrow('No sideboard cards found');
    });

    it('should call Claude API and return parsed plans', async () => {
      // Set API key
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'test-key-123')").run();

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{
            type: 'text',
            text: JSON.stringify(sampleApiResponse),
          }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const plans = await generateSideboardGuide(1, sampleDeckCards, 'standard');

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledOnce();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.anthropic.com/v1/messages');
      const body = JSON.parse(callArgs[1].body);
      expect(body.messages[0].content).toContain('Lightning Bolt');
      expect(body.messages[0].content).toContain('Searing Blood');

      // Verify headers
      expect(callArgs[1].headers['x-api-key']).toBe('test-key-123');
      expect(callArgs[1].headers['anthropic-version']).toBe('2023-06-01');

      // Verify returned plans
      expect(plans).toHaveLength(2);
      expect(plans[0].opponentArchetype).toBe('Aggro');
      expect(plans[1].opponentArchetype).toBe('Control');
      expect(plans[0].cardsIn[0].name).toBe('Searing Blood');

      // Verify plans were cached to DB
      const cached = getCachedGuides(1);
      expect(cached).toHaveLength(2);
    });

    it('should handle Claude response wrapped in markdown code blocks', async () => {
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'key')").run();

      const wrappedResponse = '```json\n' + JSON.stringify(sampleApiResponse) + '\n```';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: wrappedResponse }],
        }),
      }));

      const plans = await generateSideboardGuide(1, sampleDeckCards, 'standard');
      expect(plans).toHaveLength(2);
    });

    it('should throw on API error response', async () => {
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'key')").run();

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limited',
      }));

      await expect(
        generateSideboardGuide(1, sampleDeckCards, 'standard')
      ).rejects.toThrow('Claude API error: 429');
    });

    it('should throw when AI response has no parseable JSON', async () => {
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'key')").run();

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Sorry, I cannot generate that.' }],
        }),
      }));

      await expect(
        generateSideboardGuide(1, sampleDeckCards, 'standard')
      ).rejects.toThrow('Failed to parse sideboard guide');
    });

    it('should use fallback archetypes when archetype_win_stats is empty', async () => {
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'key')").run();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify(sampleApiResponse) }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await generateSideboardGuide(1, sampleDeckCards, 'standard');

      // Verify the prompt includes fallback archetypes
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const prompt = body.messages[0].content;
      expect(prompt).toContain('Aggro');
      expect(prompt).toContain('Midrange');
      expect(prompt).toContain('Control');
      expect(prompt).toContain('Combo');
    });

    it('should use custom model from app_state', async () => {
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'key')").run();
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_claude_model', 'claude-opus-4-6')").run();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify(sampleApiResponse) }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await generateSideboardGuide(1, sampleDeckCards, 'standard');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('claude-opus-4-6');
    });

    it('should upsert guides on repeated generation (UNIQUE constraint)', async () => {
      testDb.prepare("INSERT INTO app_state (key, value) VALUES ('setting_anthropic_api_key', 'key')").run();

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify(sampleApiResponse) }],
        }),
      }));

      // Generate twice
      await generateSideboardGuide(1, sampleDeckCards, 'standard');
      await generateSideboardGuide(1, sampleDeckCards, 'standard');

      // Should still only have 2 rows (upserted, not duplicated)
      const cached = getCachedGuides(1);
      expect(cached).toHaveLength(2);
    });
  });
});
