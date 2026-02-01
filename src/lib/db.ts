import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from '@/db/schema';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'mtg-deck-builder.db');

function createDatabase(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  runMigrations(db);

  return db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM _migrations')
      .all()
      .map((r: unknown) => (r as { version: number }).version)
  );

  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.version)) {
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(
          migration.version,
          migration.name
        );
      })();
    }
  }
}

// Singleton pattern for Next.js HMR safety
const globalForDb = globalThis as unknown as { _db: Database.Database | undefined };

export function getDb(): Database.Database {
  if (!globalForDb._db) {
    globalForDb._db = createDatabase();
  }
  return globalForDb._db;
}

// ── Query helpers ─────────────────────────────────────────────────────────

export function searchCards(
  query: string,
  limit = 20,
  offset = 0
): { cards: unknown[]; total: number } {
  const db = getDb();

  if (!query.trim()) {
    const total = (db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number })
      .count;
    const cards = db
      .prepare('SELECT * FROM cards ORDER BY edhrec_rank ASC NULLS LAST LIMIT ? OFFSET ?')
      .all(limit, offset);
    return { cards, total };
  }

  const ftsQuery = query
    .split(/\s+/)
    .map((w) => `"${w}"*`)
    .join(' ');

  try {
    const total = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM cards_fts WHERE cards_fts MATCH ?`
        )
        .get(ftsQuery) as { count: number }
    ).count;

    const cards = db
      .prepare(
        `SELECT c.* FROM cards c
         INNER JOIN cards_fts fts ON c.rowid = fts.rowid
         WHERE cards_fts MATCH ?
         ORDER BY rank
         LIMIT ? OFFSET ?`
      )
      .all(ftsQuery, limit, offset);

    return { cards, total };
  } catch {
    const likeQuery = `%${query}%`;
    const total = (
      db
        .prepare('SELECT COUNT(*) as count FROM cards WHERE name LIKE ?')
        .get(likeQuery) as { count: number }
    ).count;
    const cards = db
      .prepare(
        'SELECT * FROM cards WHERE name LIKE ? ORDER BY edhrec_rank ASC NULLS LAST LIMIT ? OFFSET ?'
      )
      .all(likeQuery, limit, offset);
    return { cards, total };
  }
}

export function getCardById(id: string) {
  return getDb().prepare('SELECT * FROM cards WHERE id = ?').get(id);
}

export function getCardByName(name: string) {
  return getDb().prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE').get(name);
}

export function getCardCount(): number {
  return (getDb().prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number }).count;
}

// ── Deck operations ───────────────────────────────────────────────────────

export function getAllDecks() {
  const db = getDb();
  const decks = db.prepare('SELECT * FROM decks ORDER BY updated_at DESC').all();
  return decks.map((deck: unknown) => {
    const d = deck as { id: number };
    const cardCount = (
      db
        .prepare(
          "SELECT COALESCE(SUM(quantity), 0) as count FROM deck_cards WHERE deck_id = ? AND board = 'main'"
        )
        .get(d.id) as { count: number }
    ).count;
    const coverCard = db
      .prepare(
        `SELECT c.image_uri_art_crop, c.image_uri_normal FROM deck_cards dc
         JOIN cards c ON dc.card_id = c.id
         WHERE dc.deck_id = ? AND dc.board = 'main'
         ORDER BY c.edhrec_rank ASC NULLS LAST
         LIMIT 1`
      )
      .get(d.id);
    return { ...d, cardCount, coverCard };
  });
}

export function getDeckWithCards(deckId: number) {
  const db = getDb();
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
  if (!deck) return null;

  const cards = db
    .prepare(
      `SELECT dc.*, c.*,
              dc.id as entry_id, dc.quantity, dc.board, dc.sort_order
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.id
       WHERE dc.deck_id = ?
       ORDER BY dc.board, dc.sort_order, c.cmc, c.name`
    )
    .all(deckId);

  return { ...(deck as object), cards };
}

export function createDeck(name: string, format?: string, description?: string) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO decks (name, format, description) VALUES (?, ?, ?)')
    .run(name, format || null, description || null);
  return { id: result.lastInsertRowid, name, format, description };
}

export function updateDeck(id: number, data: { name?: string; format?: string; description?: string }) {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.format !== undefined) { sets.push('format = ?'); vals.push(data.format); }
  if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
  sets.push("updated_at = datetime('now')");
  vals.push(id);
  db.prepare(`UPDATE decks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function deleteDeck(id: number) {
  getDb().prepare('DELETE FROM decks WHERE id = ?').run(id);
}

export function addCardToDeck(deckId: number, cardId: string, quantity: number, board: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO deck_cards (deck_id, card_id, quantity, board)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(deck_id, card_id, board) DO UPDATE SET
       quantity = quantity + excluded.quantity`
  ).run(deckId, cardId, quantity, board);
  db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?").run(deckId);
}

export function removeCardFromDeck(deckId: number, cardId: string, board: string) {
  const db = getDb();
  db.prepare('DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ? AND board = ?').run(
    deckId,
    cardId,
    board
  );
  db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?").run(deckId);
}

export function setCardQuantityInDeck(
  deckId: number,
  cardId: string,
  quantity: number,
  board: string
) {
  const db = getDb();
  if (quantity <= 0) {
    removeCardFromDeck(deckId, cardId, board);
    return;
  }
  db.prepare(
    'UPDATE deck_cards SET quantity = ? WHERE deck_id = ? AND card_id = ? AND board = ?'
  ).run(quantity, deckId, cardId, board);
  db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?").run(deckId);
}

// ── Collection operations ─────────────────────────────────────────────────

export function getCollection(limit = 50, offset = 0, filters?: {
  colors?: string[];
  types?: string[];
  rarities?: string[];
  query?: string;
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.query) {
    conditions.push('c.name LIKE ?');
    params.push(`%${filters.query}%`);
  }
  if (filters?.rarities?.length) {
    conditions.push(`c.rarity IN (${filters.rarities.map(() => '?').join(',')})`);
    params.push(...filters.rarities);
  }
  if (filters?.types?.length) {
    const typeConditions = filters.types.map(() => 'c.type_line LIKE ?');
    conditions.push(`(${typeConditions.join(' OR ')})`);
    params.push(...filters.types.map((t) => `%${t}%`));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM collection col JOIN cards c ON col.card_id = c.id ${where}`
      )
      .get(...params) as { count: number }
  ).count;

  const cards = db
    .prepare(
      `SELECT col.*, c.*,
              col.id as collection_id, col.quantity, col.foil, col.source
       FROM collection col
       JOIN cards c ON col.card_id = c.id
       ${where}
       ORDER BY c.name
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return { cards, total };
}

export function getCollectionStats() {
  const db = getDb();
  const totalCards = (
    db.prepare('SELECT COALESCE(SUM(quantity), 0) as count FROM collection').get() as {
      count: number;
    }
  ).count;
  const uniqueCards = (
    db.prepare('SELECT COUNT(*) as count FROM collection').get() as { count: number }
  ).count;
  const totalValue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(CAST(c.price_usd AS REAL) * col.quantity), 0) as value
         FROM collection col JOIN cards c ON col.card_id = c.id
         WHERE c.price_usd IS NOT NULL`
      )
      .get() as { value: number }
  ).value;

  return { totalCards, uniqueCards, totalValue: Math.round(totalValue * 100) / 100 };
}

export function upsertCollectionCard(cardId: string, quantity: number, foil: boolean) {
  const db = getDb();
  db.prepare(
    `INSERT INTO collection (card_id, quantity, foil)
     VALUES (?, ?, ?)
     ON CONFLICT(card_id, foil) DO UPDATE SET
       quantity = excluded.quantity`
  ).run(cardId, quantity, foil ? 1 : 0);
}

export function clearCollection() {
  getDb().prepare('DELETE FROM collection').run();
}
