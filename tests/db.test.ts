import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from '@/db/schema';

// Use a temp DB for each test
let db: Database.Database;
const TEST_DB = path.join(process.cwd(), 'data', 'test-unit.db');

function setupDb() {
  const dir = path.dirname(TEST_DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  db = new Database(TEST_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run all migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  for (const migration of MIGRATIONS) {
    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(
        migration.version, migration.name
      );
    })();
  }
}

function teardownDb() {
  if (db) db.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
}

describe('Database Schema & Migrations', () => {
  beforeEach(() => setupDb());
  afterEach(() => teardownDb());

  it('runs all migrations without error', () => {
    const applied = db.prepare('SELECT COUNT(*) as count FROM _migrations').get() as { count: number };
    expect(applied.count).toBe(MIGRATIONS.length);
  });

  it('creates cards table with required columns', () => {
    const columns = db.prepare("PRAGMA table_info(cards)").all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('cmc');
    expect(names).toContain('type_line');
    expect(names).toContain('color_identity');
    expect(names).toContain('edhrec_rank');
    expect(names).toContain('subtypes');
    expect(names).toContain('arena_id');
  });

  it('creates decks and deck_cards tables', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('decks', 'deck_cards')"
    ).all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain('decks');
    expect(names).toContain('deck_cards');
  });

  it('creates commander_synergies table (migration 8)', () => {
    const columns = db.prepare("PRAGMA table_info(commander_synergies)").all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('commander_name');
    expect(names).toContain('card_name');
    expect(names).toContain('synergy_score');
    expect(names).toContain('inclusion_rate');
  });

  it('creates arena_parsed_matches table (migration 9)', () => {
    const columns = db.prepare("PRAGMA table_info(arena_parsed_matches)").all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('match_id');
    expect(names).toContain('result');
    expect(names).toContain('deck_cards');
    expect(names).toContain('cards_played');
  });

  it('creates analytics_snapshots table (migration 10)', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='analytics_snapshots'"
    ).get() as { name: string } | undefined;
    expect(row).toBeDefined();
  });

  it('creates personalized_suggestions table (migration 11)', () => {
    const columns = db.prepare("PRAGMA table_info(personalized_suggestions)").all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('deck_id');
    expect(names).toContain('card_name');
    expect(names).toContain('predicted_score');
    expect(names).toContain('reason');
  });
});

describe('Card CRUD Operations', () => {
  beforeEach(() => setupDb());
  afterEach(() => teardownDb());

  it('inserts and retrieves a card', () => {
    db.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, type_line, set_code, set_name, collector_number, rarity)
      VALUES ('test-id', 'oracle-1', 'Lightning Bolt', 1, 'Instant', 'LEA', 'Alpha', '1', 'common')
    `).run();

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get('test-id') as Record<string, unknown>;
    expect(card).toBeDefined();
    expect(card.name).toBe('Lightning Bolt');
    expect(card.cmc).toBe(1);
    expect(card.type_line).toBe('Instant');
  });

  it('enforces unique primary key on cards', () => {
    const insert = db.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, type_line, set_code, set_name, collector_number, rarity)
      VALUES ('dup-id', 'oracle-1', 'Card A', 1, 'Instant', 'SET', 'Set', '1', 'common')
    `);
    insert.run();
    expect(() => insert.run()).toThrow();
  });
});

describe('Deck Operations', () => {
  beforeEach(() => setupDb());
  afterEach(() => teardownDb());

  it('creates a deck and adds cards', () => {
    // Insert a card first
    db.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, type_line, set_code, set_name, collector_number, rarity)
      VALUES ('c1', 'o1', 'Sol Ring', 0, 'Artifact', 'CMD', 'Commander', '1', 'uncommon')
    `).run();

    // Create deck
    const result = db.prepare(
      'INSERT INTO decks (name, format) VALUES (?, ?)'
    ).run('Test Deck', 'commander');
    const deckId = result.lastInsertRowid;

    // Add card to deck
    db.prepare(
      "INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, ?, ?)"
    ).run(deckId, 'c1', 1, 'main');

    // Verify
    const cards = db.prepare(
      'SELECT dc.*, c.name FROM deck_cards dc JOIN cards c ON dc.card_id = c.id WHERE dc.deck_id = ?'
    ).all(deckId) as Array<{ name: string; quantity: number }>;
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Sol Ring');
    expect(cards[0].quantity).toBe(1);
  });

  it('enforces unique card per deck per board', () => {
    db.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, type_line, set_code, set_name, collector_number, rarity)
      VALUES ('c2', 'o2', 'Bolt', 1, 'Instant', 'M21', 'M21', '1', 'common')
    `).run();

    const { lastInsertRowid: deckId } = db.prepare(
      'INSERT INTO decks (name) VALUES (?)'
    ).run('Deck 2');

    db.prepare(
      "INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, ?, ?)"
    ).run(deckId, 'c2', 2, 'main');

    // Duplicate should fail
    expect(() =>
      db.prepare(
        "INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, ?, ?)"
      ).run(deckId, 'c2', 1, 'main')
    ).toThrow();
  });

  it('cascades delete from deck to deck_cards', () => {
    db.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, type_line, set_code, set_name, collector_number, rarity)
      VALUES ('c3', 'o3', 'Forest', 0, 'Basic Land — Forest', 'M21', 'M21', '1', 'common')
    `).run();

    const { lastInsertRowid: deckId } = db.prepare(
      'INSERT INTO decks (name) VALUES (?)'
    ).run('Delete Me');

    db.prepare(
      "INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, ?, ?)"
    ).run(deckId, 'c3', 10, 'main');

    db.prepare('DELETE FROM decks WHERE id = ?').run(deckId);

    const remaining = db.prepare(
      'SELECT COUNT(*) as count FROM deck_cards WHERE deck_id = ?'
    ).get(deckId) as { count: number };
    expect(remaining.count).toBe(0);
  });
});

describe('Commander Synergies Table', () => {
  beforeEach(() => setupDb());
  afterEach(() => teardownDb());

  it('stores and retrieves synergy data', () => {
    db.prepare(`
      INSERT INTO commander_synergies (commander_name, card_name, synergy_score, inclusion_rate)
      VALUES ('Krenko, Mob Boss', 'Goblin Chieftain', 0.85, 0.72)
    `).run();

    const row = db.prepare(
      "SELECT * FROM commander_synergies WHERE commander_name = 'Krenko, Mob Boss'"
    ).get() as Record<string, unknown>;
    expect(row.card_name).toBe('Goblin Chieftain');
    expect(row.synergy_score).toBe(0.85);
  });

  it('enforces unique commander + card pair', () => {
    const insert = db.prepare(`
      INSERT INTO commander_synergies (commander_name, card_name, synergy_score, inclusion_rate)
      VALUES ('Krenko, Mob Boss', 'Goblin Chieftain', 0.85, 0.72)
    `);
    insert.run();
    expect(() => insert.run()).toThrow();
  });
});

describe('Analytics Snapshots', () => {
  beforeEach(() => setupDb());
  afterEach(() => teardownDb());

  it('stores and retrieves JSON snapshot data', () => {
    const data = JSON.stringify({ wins: 10, losses: 5 });
    db.prepare(`
      INSERT INTO analytics_snapshots (snapshot_type, format, data)
      VALUES ('win_rates', 'commander', ?)
    `).run(data);

    const row = db.prepare(
      "SELECT * FROM analytics_snapshots WHERE snapshot_type = 'win_rates'"
    ).get() as Record<string, unknown>;
    expect(JSON.parse(row.data as string)).toEqual({ wins: 10, losses: 5 });
  });

  it('upserts on conflict', () => {
    db.prepare(`
      INSERT INTO analytics_snapshots (snapshot_type, format, data)
      VALUES ('test', '', '{"v":1}')
      ON CONFLICT(snapshot_type, format) DO UPDATE SET data = excluded.data
    `).run();

    db.prepare(`
      INSERT INTO analytics_snapshots (snapshot_type, format, data)
      VALUES ('test', '', '{"v":2}')
      ON CONFLICT(snapshot_type, format) DO UPDATE SET data = excluded.data
    `).run();

    const rows = db.prepare(
      "SELECT * FROM analytics_snapshots WHERE snapshot_type = 'test'"
    ).all();
    expect(rows).toHaveLength(1);
    expect(JSON.parse((rows[0] as Record<string, unknown>).data as string)).toEqual({ v: 2 });
  });
});

describe('Personalized Suggestions', () => {
  beforeEach(() => setupDb());
  afterEach(() => teardownDb());

  it('stores ML predictions per deck', () => {
    db.prepare(`
      INSERT INTO personalized_suggestions (deck_id, commander_name, format, card_name, predicted_score, reason)
      VALUES (1, 'Krenko', 'commander', 'Goblin Warchief', 0.72, 'High predicted win rate')
    `).run();

    const rows = db.prepare(
      "SELECT * FROM personalized_suggestions WHERE deck_id = 1"
    ).all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].card_name).toBe('Goblin Warchief');
    expect(rows[0].predicted_score).toBe(0.72);
  });
});
