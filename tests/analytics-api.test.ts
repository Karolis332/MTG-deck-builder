import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from '@/db/schema';

// Test the analytics computation logic directly against a test DB
let db: Database.Database;
const TEST_DB = path.join(process.cwd(), 'data', 'test-analytics.db');

function setupDb() {
  const dir = path.dirname(TEST_DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  db = new Database(TEST_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

function seedTestData() {
  // Cards
  const insertCard = db.prepare(`
    INSERT INTO cards (id, oracle_id, name, cmc, type_line, color_identity, set_code, set_name, collector_number, rarity, oracle_text)
    VALUES (?, ?, ?, ?, ?, ?, 'TST', 'Test', '1', 'common', ?)
  `);
  insertCard.run('c1', 'o1', 'Lightning Bolt', 1, 'Instant', '["R"]', 'Deal 3 damage');
  insertCard.run('c2', 'o2', 'Counterspell', 2, 'Instant', '["U"]', 'Counter target spell');
  insertCard.run('c3', 'o3', 'Llanowar Elves', 1, 'Creature — Elf Druid', '["G"]', 'T: Add G');
  insertCard.run('c4', 'o4', 'Wrath of God', 4, 'Sorcery', '["W"]', 'Destroy all creatures');
  insertCard.run('c5', 'o5', 'Sol Ring', 0, 'Artifact', '[]', 'T: Add CC');
  insertCard.run('c6', 'o6', 'Forest', 0, 'Basic Land — Forest', '[]', '');

  // Decks
  db.prepare("INSERT INTO decks (id, name, format) VALUES (1, 'Goblin Rush', 'commander')").run();
  db.prepare("INSERT INTO decks (id, name, format) VALUES (2, 'UW Control', 'standard')").run();

  // Deck cards
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c1', 1, 'main')").run();
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c3', 1, 'main')").run();
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c5', 1, 'main')").run();
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c6', 10, 'main')").run();
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (2, 'c2', 4, 'main')").run();
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (2, 'c4', 3, 'main')").run();

  // Match logs
  db.prepare("INSERT INTO match_logs (deck_id, result, game_format) VALUES (1, 'win', 'commander')").run();
  db.prepare("INSERT INTO match_logs (deck_id, result, game_format) VALUES (1, 'win', 'commander')").run();
  db.prepare("INSERT INTO match_logs (deck_id, result, game_format) VALUES (1, 'loss', 'commander')").run();
  db.prepare("INSERT INTO match_logs (deck_id, result, game_format) VALUES (2, 'loss', 'standard')").run();
  db.prepare("INSERT INTO match_logs (deck_id, result, game_format) VALUES (2, 'win', 'standard')").run();
}

describe('Analytics Live Computation', () => {
  beforeEach(() => {
    setupDb();
    seedTestData();
  });
  afterEach(() => teardownDb());

  it('computes win rates per format from match_logs', () => {
    const rows = db.prepare(`
      SELECT game_format, result, COUNT(*) as cnt
      FROM match_logs
      GROUP BY game_format, result
    `).all() as Array<{ game_format: string; result: string; cnt: number }>;

    const winRates: Record<string, { total: number; wins: number }> = {};
    for (const row of rows) {
      const fmt = row.game_format || 'unknown';
      if (!winRates[fmt]) winRates[fmt] = { total: 0, wins: 0 };
      winRates[fmt].total += row.cnt;
      if (row.result === 'win') winRates[fmt].wins += row.cnt;
    }

    expect(winRates.commander.total).toBe(3);
    expect(winRates.commander.wins).toBe(2);
    expect(winRates.standard.total).toBe(2);
    expect(winRates.standard.wins).toBe(1);
  });

  it('computes mana curve excluding lands', () => {
    const curveRows = db.prepare(`
      SELECT
        CASE WHEN c.cmc > 7 THEN 7 ELSE CAST(c.cmc AS INTEGER) END as cmc_bucket,
        SUM(dc.quantity) as total
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.board = 'main' AND c.type_line NOT LIKE '%Land%'
      GROUP BY cmc_bucket
      ORDER BY cmc_bucket
    `).all() as Array<{ cmc_bucket: number; total: number }>;

    const curve: Record<number, number> = {};
    for (const r of curveRows) curve[r.cmc_bucket] = r.total;

    // Sol Ring (CMC 0), Bolt+Elves (CMC 1), Counterspell (CMC 2), Wrath (CMC 4)
    expect(curve[0]).toBe(1);
    expect(curve[1]).toBe(2);  // Bolt (1) + Elves (1)
    expect(curve[2]).toBe(4);  // Counterspell (4)
    expect(curve[4]).toBe(3);  // Wrath (3)
  });

  it('computes color distribution', () => {
    const colorRows = db.prepare(`
      SELECT c.color_identity, SUM(dc.quantity) as qty
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.board IN ('main', 'commander')
      GROUP BY c.color_identity
    `).all() as Array<{ color_identity: string | null; qty: number }>;

    const colors: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    for (const r of colorRows) {
      const ci = r.color_identity || '';
      if (!ci || ci === '[]') {
        colors.C += r.qty;
      } else {
        for (const c of ['W', 'U', 'B', 'R', 'G']) {
          if (ci.includes(c)) colors[c] += r.qty;
        }
      }
    }

    expect(colors.R).toBe(1);   // Lightning Bolt
    expect(colors.G).toBe(1);   // Llanowar Elves
    expect(colors.U).toBe(4);   // Counterspell x4
    expect(colors.W).toBe(3);   // Wrath x3
    expect(colors.C).toBe(11);  // Sol Ring (1) + Forest (10)
  });

  it('computes type distribution', () => {
    const typeRows = db.prepare(`
      SELECT c.type_line, SUM(dc.quantity) as qty
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.board = 'main'
      GROUP BY c.type_line
    `).all() as Array<{ type_line: string; qty: number }>;

    const types: Record<string, number> = {};
    for (const r of typeRows) {
      for (const t of ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Land']) {
        if (r.type_line.includes(t)) {
          types[t] = (types[t] || 0) + r.qty;
          break;
        }
      }
    }

    expect(types.Instant).toBe(5);   // Bolt (1) + Counterspell (4)
    expect(types.Creature).toBe(1);  // Elves
    expect(types.Sorcery).toBe(3);   // Wrath
    expect(types.Artifact).toBe(1);  // Sol Ring
    expect(types.Land).toBe(10);     // Forest
  });

  it('reads from analytics_snapshots when available', () => {
    const data = JSON.stringify({ commander: { total_games: 100, wins: 60, win_rate: 60.0 } });
    db.prepare(`
      INSERT INTO analytics_snapshots (snapshot_type, format, data)
      VALUES ('win_rates', '', ?)
    `).run(data);

    const row = db.prepare(
      "SELECT data FROM analytics_snapshots WHERE snapshot_type = 'win_rates'"
    ).get() as { data: string };

    const parsed = JSON.parse(row.data);
    expect(parsed.commander.total_games).toBe(100);
    expect(parsed.commander.win_rate).toBe(60.0);
  });

  it('deck performance query returns correct win rates', () => {
    const rows = db.prepare(`
      SELECT ml.deck_id, d.name as deck_name,
             COUNT(*) as total_games,
             SUM(CASE WHEN ml.result = 'win' THEN 1 ELSE 0 END) as wins
      FROM match_logs ml
      LEFT JOIN decks d ON ml.deck_id = d.id
      WHERE ml.deck_id IS NOT NULL
      GROUP BY ml.deck_id
    `).all() as Array<{ deck_id: number; deck_name: string; total_games: number; wins: number }>;

    const goblin = rows.find((r) => r.deck_name === 'Goblin Rush')!;
    expect(goblin.total_games).toBe(3);
    expect(goblin.wins).toBe(2);

    const control = rows.find((r) => r.deck_name === 'UW Control')!;
    expect(control.total_games).toBe(2);
    expect(control.wins).toBe(1);
  });
});
