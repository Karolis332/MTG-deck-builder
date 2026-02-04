import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from '@/db/schema';

const DB_DIR = process.env.MTG_DB_DIR || path.join(process.cwd(), 'data');
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

// ── User operations ──────────────────────────────────────────────────────

export function createUser(username: string, email: string, passwordHash: string) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
    .run(username, email, passwordHash);
  return { id: Number(result.lastInsertRowid), username, email };
}

export function getUserByUsername(username: string) {
  return getDb()
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; email: string; password_hash: string; created_at: string } | undefined;
}

export function getUserByEmail(email: string) {
  return getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as { id: number; username: string; email: string; password_hash: string; created_at: string } | undefined;
}

export function getUserById(id: number) {
  return getDb()
    .prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
    .get(id) as { id: number; username: string; email: string; created_at: string } | undefined;
}

// ── Deck operations ───────────────────────────────────────────────────────

export function getAllDecks(userId?: number) {
  const db = getDb();
  const whereClause = userId != null ? 'WHERE d.user_id = ?' : '';
  const queryParams = userId != null ? [userId] : [];

  const decks = db
    .prepare(`SELECT d.* FROM decks d ${whereClause} ORDER BY d.updated_at DESC`)
    .all(...queryParams);

  return decks.map((deck: unknown) => {
    const d = deck as { id: number };
    const cardCount = (
      db
        .prepare(
          "SELECT COALESCE(SUM(quantity), 0) as count FROM deck_cards WHERE deck_id = ? AND board = 'main'"
        )
        .get(d.id) as { count: number }
    ).count;
    const dd = d as { id: number; cover_card_id: string | null; format: string | null };
    // Priority: 1) user-chosen cover card, 2) commander card, 3) first main card by edhrec rank
    let coverCard = null;
    if (dd.cover_card_id) {
      coverCard = db
        .prepare('SELECT image_uri_art_crop, image_uri_normal FROM cards WHERE id = ?')
        .get(dd.cover_card_id);
    }
    if (!coverCard) {
      // For commander/brawl formats, use the commander card
      coverCard = db
        .prepare(
          `SELECT c.image_uri_art_crop, c.image_uri_normal FROM deck_cards dc
           JOIN cards c ON dc.card_id = c.id
           WHERE dc.deck_id = ? AND dc.board = 'commander'
           LIMIT 1`
        )
        .get(dd.id);
    }
    if (!coverCard) {
      coverCard = db
        .prepare(
          `SELECT c.image_uri_art_crop, c.image_uri_normal FROM deck_cards dc
           JOIN cards c ON dc.card_id = c.id
           WHERE dc.deck_id = ? AND dc.board = 'main'
           ORDER BY c.edhrec_rank ASC NULLS LAST
           LIMIT 1`
        )
        .get(dd.id);
    }
    return { ...d, cardCount, coverCard };
  });
}

export function getDeckWithCards(deckId: number, userId?: number) {
  const db = getDb();
  const whereClause = userId != null
    ? 'WHERE id = ? AND user_id = ?'
    : 'WHERE id = ?';
  const queryParams = userId != null ? [deckId, userId] : [deckId];

  const deck = db.prepare(`SELECT * FROM decks ${whereClause}`).get(...queryParams);
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

export function createDeck(name: string, format?: string, description?: string, userId?: number) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO decks (name, format, description, user_id) VALUES (?, ?, ?, ?)')
    .run(name, format || null, description || null, userId || null);
  return { id: result.lastInsertRowid, name, format, description };
}

export function updateDeck(
  id: number,
  data: { name?: string; format?: string; description?: string; cover_card_id?: string | null },
  userId?: number
) {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.format !== undefined) { sets.push('format = ?'); vals.push(data.format); }
  if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
  if (data.cover_card_id !== undefined) { sets.push('cover_card_id = ?'); vals.push(data.cover_card_id); }
  sets.push("updated_at = datetime('now')");
  vals.push(id);

  let whereClause = 'WHERE id = ?';
  if (userId != null) {
    whereClause += ' AND user_id = ?';
    vals.push(userId);
  }

  db.prepare(`UPDATE decks SET ${sets.join(', ')} ${whereClause}`).run(...vals);
}

export function deleteDeck(id: number, userId?: number) {
  const db = getDb();
  if (userId != null) {
    db.prepare('DELETE FROM decks WHERE id = ? AND user_id = ?').run(id, userId);
  } else {
    db.prepare('DELETE FROM decks WHERE id = ?').run(id);
  }
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

export function getCollection(
  limit = 50,
  offset = 0,
  filters?: {
    colors?: string[];
    types?: string[];
    rarities?: string[];
    query?: string;
  },
  userId?: number
) {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (userId != null) {
    conditions.push('col.user_id = ?');
    params.push(userId);
  }
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
  if (filters?.colors?.length) {
    const colorConditions = filters.colors.map(() => 'c.color_identity LIKE ?');
    conditions.push(`(${colorConditions.join(' OR ')})`);
    params.push(...filters.colors.map((c) => `%${c}%`));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT col.card_id) as count FROM collection col JOIN cards c ON col.card_id = c.id ${where}`
      )
      .get(...params) as { count: number }
  ).count;

  const cards = db
    .prepare(
      `SELECT c.*,
              MIN(col.id) as collection_id,
              SUM(col.quantity) as quantity,
              MAX(col.foil) as foil,
              col.source
       FROM collection col
       JOIN cards c ON col.card_id = c.id
       ${where}
       GROUP BY col.card_id
       ORDER BY c.name
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return { cards, total };
}

export function getCollectionStats(userId?: number) {
  const db = getDb();
  const where = userId != null ? 'WHERE col.user_id = ?' : '';
  const params = userId != null ? [userId] : [];

  const totalCards = (
    db.prepare(`SELECT COALESCE(SUM(quantity), 0) as count FROM collection col ${where}`).get(
      ...params
    ) as { count: number }
  ).count;
  const uniqueCards = (
    db.prepare(`SELECT COUNT(*) as count FROM collection col ${where}`).get(...params) as {
      count: number;
    }
  ).count;
  const totalValue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(CAST(c.price_usd AS REAL) * col.quantity), 0) as value
         FROM collection col JOIN cards c ON col.card_id = c.id
         WHERE c.price_usd IS NOT NULL${userId != null ? ' AND col.user_id = ?' : ''}`
      )
      .get(...params) as { value: number }
  ).value;

  return { totalCards, uniqueCards, totalValue: Math.round(totalValue * 100) / 100 };
}

export function upsertCollectionCard(
  cardId: string,
  quantity: number,
  foil: boolean,
  userId?: number
) {
  const db = getDb();
  if (userId != null) {
    // For authenticated users, use a different conflict strategy
    const existing = db
      .prepare('SELECT id FROM collection WHERE card_id = ? AND foil = ? AND user_id = ?')
      .get(cardId, foil ? 1 : 0, userId) as { id: number } | undefined;

    if (existing) {
      db.prepare('UPDATE collection SET quantity = ? WHERE id = ?').run(quantity, existing.id);
    } else {
      db.prepare(
        'INSERT INTO collection (card_id, quantity, foil, user_id) VALUES (?, ?, ?, ?)'
      ).run(cardId, quantity, foil ? 1 : 0, userId);
    }
  } else {
    db.prepare(
      `INSERT INTO collection (card_id, quantity, foil)
       VALUES (?, ?, ?)
       ON CONFLICT(card_id, foil) DO UPDATE SET
         quantity = excluded.quantity`
    ).run(cardId, quantity, foil ? 1 : 0);
  }
}

export function clearCollection(userId?: number) {
  if (userId != null) {
    getDb().prepare('DELETE FROM collection WHERE user_id = ?').run(userId);
  } else {
    getDb().prepare('DELETE FROM collection').run();
  }
}

// ── Arena ID helpers ──────────────────────────────────────────────────────────

export function getCardByArenaId(arenaId: number) {
  return getDb()
    .prepare('SELECT * FROM cards WHERE arena_id = ?')
    .get(arenaId) as Record<string, unknown> | undefined;
}

export function resolveArenaIds(
  arenaIds: string[]
): Map<string, Record<string, unknown>> {
  const db = getDb();
  const result = new Map<string, Record<string, unknown>>();
  const stmt = db.prepare('SELECT * FROM cards WHERE arena_id = ?');
  for (const aid of arenaIds) {
    const num = parseInt(aid, 10);
    if (isNaN(num)) continue;
    const card = stmt.get(num) as Record<string, unknown> | undefined;
    if (card) {
      result.set(aid, card);
    }
  }
  return result;
}

export function getArenaIdCoverage(): { total: number; withArenaId: number } {
  const db = getDb();
  const total = (
    db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number }
  ).count;
  const withArenaId = (
    db
      .prepare('SELECT COUNT(*) as count FROM cards WHERE arena_id IS NOT NULL')
      .get() as { count: number }
  ).count;
  return { total, withArenaId };
}

export function storeArenaParsedMatch(match: {
  matchId: string;
  playerName: string | null;
  opponentName: string | null;
  result: string;
  format: string | null;
  turns: number;
  deckCards: string | null;
  cardsPlayed: string | null;
  opponentCardsSeen: string | null;
}): boolean {
  const db = getDb();
  try {
    db.prepare(
      `INSERT OR IGNORE INTO arena_parsed_matches
       (match_id, player_name, opponent_name, result, format, turns,
        deck_cards, cards_played, opponent_cards_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      match.matchId,
      match.playerName,
      match.opponentName,
      match.result,
      match.format,
      match.turns,
      match.deckCards,
      match.cardsPlayed,
      match.opponentCardsSeen
    );
    return true;
  } catch {
    return false;
  }
}

export function getArenaParsedMatches(limit = 100) {
  return getDb()
    .prepare(
      'SELECT * FROM arena_parsed_matches ORDER BY parsed_at DESC LIMIT ?'
    )
    .all(limit);
}

/**
 * Match an Arena match's deck cards to a saved deck.
 * Compares Arena card IDs from the match against deck_cards entries via cards.arena_id.
 * Returns { deckId, confidence } or null if no match above threshold.
 */
export function matchArenaDeckToSavedDeck(
  arenaDeckCards: Array<{ id: string; qty: number }>,
  format?: string | null
): { deckId: number; deckName: string; confidence: number } | null {
  const db = getDb();

  // Get all decks, optionally filtered by format
  const decks = format
    ? db.prepare('SELECT id, name, format FROM decks WHERE format = ?').all(format) as Array<{ id: number; name: string; format: string }>
    : db.prepare('SELECT id, name, format FROM decks').all() as Array<{ id: number; name: string; format: string }>;

  if (decks.length === 0) return null;

  // Resolve Arena IDs to card names for the match deck
  const arenaCardNames = new Map<string, number>();
  const stmtArena = db.prepare('SELECT name FROM cards WHERE arena_id = ?');
  for (const ac of arenaDeckCards) {
    const num = parseInt(ac.id, 10);
    if (isNaN(num)) continue;
    const card = stmtArena.get(num) as { name: string } | undefined;
    if (card) {
      arenaCardNames.set(card.name, (arenaCardNames.get(card.name) || 0) + ac.qty);
    }
  }

  if (arenaCardNames.size === 0) return null;

  // Compare against each saved deck
  const stmtDeckCards = db.prepare(`
    SELECT c.name, dc.quantity
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = ? AND dc.board IN ('main', 'sideboard', 'commander', 'companion')
  `);

  let bestMatch: { deckId: number; deckName: string; confidence: number } | null = null;

  for (const deck of decks) {
    const savedCards = stmtDeckCards.all(deck.id) as Array<{ name: string; quantity: number }>;
    if (savedCards.length === 0) continue;

    const savedCardMap = new Map<string, number>();
    for (const sc of savedCards) {
      savedCardMap.set(sc.name, sc.quantity);
    }

    // Calculate overlap
    let matchingCards = 0;
    let totalArenaCards = 0;
    for (const [name, qty] of Array.from(arenaCardNames.entries())) {
      totalArenaCards += qty;
      const savedQty = savedCardMap.get(name) || 0;
      matchingCards += Math.min(qty, savedQty);
    }

    const confidence = totalArenaCards > 0 ? matchingCards / totalArenaCards : 0;

    if (confidence >= 0.7 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { deckId: deck.id, deckName: deck.name, confidence };
    }
  }

  return bestMatch;
}

/**
 * Link an arena match to a deck (set deck_id and confidence).
 * Pass deckId=null to unlink.
 */
export function linkArenaMatchToDeck(
  matchId: string,
  deckId: number | null,
  confidence: number | null
): boolean {
  const db = getDb();
  try {
    db.prepare(
      'UPDATE arena_parsed_matches SET deck_id = ?, deck_match_confidence = ? WHERE match_id = ?'
    ).run(deckId, confidence, matchId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get unlinked arena matches (no deck_id).
 */
export function getUnlinkedArenaMatches(limit = 50) {
  return getDb()
    .prepare(
      'SELECT * FROM arena_parsed_matches WHERE deck_id IS NULL ORDER BY parsed_at DESC LIMIT ?'
    )
    .all(limit);
}

/**
 * Try to auto-link all unlinked arena matches to saved decks.
 */
export function autoLinkArenaMatches(): { linked: number; total: number } {
  const db = getDb();
  const unlinked = db.prepare(
    "SELECT id, match_id, deck_cards, format FROM arena_parsed_matches WHERE deck_id IS NULL AND deck_cards IS NOT NULL AND deck_cards != '[]' AND deck_cards != ''"
  ).all() as Array<{ id: number; match_id: string; deck_cards: string; format: string | null }>;

  let linked = 0;
  for (const match of unlinked) {
    try {
      const deckCards = JSON.parse(match.deck_cards) as Array<{ id: string; qty: number }>;
      if (deckCards.length === 0) continue;

      const result = matchArenaDeckToSavedDeck(deckCards, match.format);
      if (result) {
        linkArenaMatchToDeck(match.match_id, result.deckId, result.confidence);
        linked++;
      }
    } catch {
      // skip invalid JSON
    }
  }

  return { linked, total: unlinked.length };
}
