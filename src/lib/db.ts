import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MIGRATIONS } from '@/db/schema';
import { getLegalityKey } from '@/lib/constants';

function resolveDbDir(): string {
  // Explicit env var takes priority
  if (process.env.MTG_DB_DIR) return process.env.MTG_DB_DIR;

  // In non-Electron dev mode, use the Electron app's data dir if it exists
  // so dev server and packaged app share the same database
  if (process.env.APPDATA) {
    const electronDir = path.join(process.env.APPDATA, 'the-black-grimoire', 'data');
    if (fs.existsSync(path.join(electronDir, 'mtg-deck-builder.db'))) {
      return electronDir;
    }
  }

  // Fallback to project-local data dir
  return path.join(process.cwd(), 'data');
}

const DB_DIR = resolveDbDir();
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

// ── Card alias helpers (Universes Beyond <-> Universe Within) ─────────────

/**
 * Resolve a card name through the alias table.
 * If the name has an alias (e.g., "Cam and Farrik, Havoc Duo" -> "Hobgoblin, Mantled Marauder"),
 * returns the canonical name. Otherwise returns the original name.
 */
export function resolveCardAlias(name: string): string {
  const db = getDb();
  const row = db.prepare(
    'SELECT canonical_name FROM card_aliases WHERE alias_name = ? COLLATE NOCASE'
  ).get(name) as { canonical_name: string } | undefined;
  return row?.canonical_name ?? name;
}

/**
 * Resolve multiple card names through the alias table.
 * Returns a Map of original name -> canonical name (only for names that have aliases).
 */
export function resolveCardAliases(names: string[]): Map<string, string> {
  const db = getDb();
  const result = new Map<string, string>();
  const stmt = db.prepare(
    'SELECT alias_name, canonical_name FROM card_aliases WHERE alias_name = ? COLLATE NOCASE'
  );
  for (const name of names) {
    const row = stmt.get(name) as { alias_name: string; canonical_name: string } | undefined;
    if (row) {
      result.set(name, row.canonical_name);
    }
  }
  return result;
}

/**
 * Insert or update card aliases in bulk.
 */
export function upsertCardAliases(aliases: Array<{ alias_name: string; canonical_name: string; oracle_id?: string; source?: string }>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO card_aliases (alias_name, canonical_name, oracle_id, source)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(alias_name) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      oracle_id = excluded.oracle_id,
      source = excluded.source
  `);
  db.transaction(() => {
    for (const a of aliases) {
      stmt.run(a.alias_name, a.canonical_name, a.oracle_id ?? null, a.source ?? 'scryfall');
    }
  })();
}

// ── Query helpers ─────────────────────────────────────────────────────────

export function searchCards(
  query: string,
  limit = 20,
  offset = 0,
  options?: { format?: string; collectionOnly?: boolean; userId?: number; colorIdentity?: string[] }
): { cards: unknown[]; total: number } {
  const db = getDb();

  // Build optional filter clauses
  const extraJoins: string[] = [];
  const extraConditions: string[] = [];
  const extraParams: unknown[] = [];

  if (options?.format && options.format !== '1v1') {
    const legalKey = getLegalityKey(options.format);
    extraConditions.push(`json_extract(c.legalities, '$.${legalKey}') IN ('legal', 'restricted')`);
  }

  if (options?.colorIdentity?.length) {
    const allColors = ['W', 'U', 'B', 'R', 'G'];
    const excluded = allColors.filter((c) => !options.colorIdentity!.includes(c));
    for (const color of excluded) {
      extraConditions.push(`c.color_identity NOT LIKE ?`);
      extraParams.push(`%${color}%`);
    }
  }

  if (options?.collectionOnly && options?.userId != null) {
    extraJoins.push(`INNER JOIN (
      SELECT DISTINCT c2.name AS cname FROM collection col2 JOIN cards c2 ON col2.card_id = c2.id WHERE col2.user_id = ?
      UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp'
      UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'
    ) owned ON c.name = owned.cname`);
    extraParams.push(options.userId);
  }

  const joinClause = extraJoins.length > 0 ? extraJoins.join(' ') : '';
  const whereExtra = extraConditions.length > 0 ? ' AND ' + extraConditions.join(' AND ') : '';

  if (!query.trim()) {
    const total = (db.prepare(
      `SELECT COUNT(*) as count FROM cards c ${joinClause} WHERE 1=1${whereExtra}`
    ).get(...extraParams) as { count: number }).count;
    const cards = db
      .prepare(
        `SELECT c.* FROM cards c ${joinClause} WHERE 1=1${whereExtra} ORDER BY c.edhrec_rank ASC NULLS LAST LIMIT ? OFFSET ?`
      )
      .all(...extraParams, limit, offset);
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
          `SELECT COUNT(*) as count FROM cards c
           INNER JOIN cards_fts fts ON c.rowid = fts.rowid
           ${joinClause}
           WHERE cards_fts MATCH ?${whereExtra}`
        )
        .get(ftsQuery, ...extraParams) as { count: number }
    ).count;

    const cards = db
      .prepare(
        `SELECT c.* FROM cards c
         INNER JOIN cards_fts fts ON c.rowid = fts.rowid
         ${joinClause}
         WHERE cards_fts MATCH ?${whereExtra}
         ORDER BY rank
         LIMIT ? OFFSET ?`
      )
      .all(ftsQuery, ...extraParams, limit, offset);

    return { cards, total };
  } catch {
    const likeQuery = `%${query}%`;
    const total = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM cards c ${joinClause} WHERE c.name LIKE ?${whereExtra}`
        )
        .get(likeQuery, ...extraParams) as { count: number }
    ).count;
    const cards = db
      .prepare(
        `SELECT c.* FROM cards c ${joinClause} WHERE c.name LIKE ?${whereExtra} ORDER BY c.edhrec_rank ASC NULLS LAST LIMIT ? OFFSET ?`
      )
      .all(likeQuery, ...extraParams, limit, offset);
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
  const tx = db.transaction(() => {
    // Nullify FKs that lack ON DELETE CASCADE/SET NULL
    db.prepare('UPDATE live_game_sessions SET deck_id = NULL WHERE deck_id = ?').run(id);
    // deck_version_id → deck_versions has no ON DELETE action in match_logs and match_ml_features
    // Must nullify before CASCADE deletes deck_versions rows
    const versionIds = (db.prepare('SELECT id FROM deck_versions WHERE deck_id = ?').all(id) as Array<{ id: number }>).map(r => r.id);
    if (versionIds.length > 0) {
      const placeholders = versionIds.map(() => '?').join(',');
      db.prepare(`UPDATE match_logs SET deck_version_id = NULL WHERE deck_version_id IN (${placeholders})`).run(...versionIds);
      db.prepare(`UPDATE match_ml_features SET deck_version_id = NULL WHERE deck_version_id IN (${placeholders})`).run(...versionIds);
    }
    if (userId != null) {
      db.prepare('DELETE FROM decks WHERE id = ? AND user_id = ?').run(id, userId);
    } else {
      db.prepare('DELETE FROM decks WHERE id = ?').run(id);
    }
  });
  tx();
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
    source?: 'paper' | 'arena';
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
  if (filters?.source) {
    // Match both canonical source and legacy 'arena_csv' variant
    if (filters.source === 'arena') {
      conditions.push("(col.source = 'arena' OR col.source = 'arena_csv')");
    } else {
      conditions.push('col.source = ?');
      params.push(filters.source);
    }
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

export function getCollectionStats(userId?: number, source?: 'paper' | 'arena') {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (userId != null) {
    conditions.push('col.user_id = ?');
    params.push(userId);
  }
  if (source) {
    // Match both canonical source and legacy 'arena_csv' variant
    if (source === 'arena') {
      conditions.push("(col.source = 'arena' OR col.source = 'arena_csv')");
    } else {
      conditions.push('col.source = ?');
      params.push(source);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

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

  const valueConditions = [...conditions];
  const valueParams = [...params];
  valueConditions.push('c.price_usd IS NOT NULL');
  const valueWhere = valueConditions.length ? `WHERE ${valueConditions.join(' AND ')}` : '';

  const totalValue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(CAST(c.price_usd AS REAL) * col.quantity), 0) as value
         FROM collection col JOIN cards c ON col.card_id = c.id
         ${valueWhere}`
      )
      .get(...valueParams) as { value: number }
  ).value;

  return { totalCards, uniqueCards, totalValue: Math.round(totalValue * 100) / 100 };
}

export function upsertCollectionCard(
  cardId: string,
  quantity: number,
  foil: boolean,
  userId?: number,
  source: 'paper' | 'arena' = 'paper'
) {
  const db = getDb();
  if (userId != null) {
    const existing = db
      .prepare('SELECT id FROM collection WHERE card_id = ? AND foil = ? AND source = ? AND user_id = ?')
      .get(cardId, foil ? 1 : 0, source, userId) as { id: number } | undefined;

    if (existing) {
      db.prepare('UPDATE collection SET quantity = ? WHERE id = ?').run(quantity, existing.id);
    } else {
      db.prepare(
        'INSERT INTO collection (card_id, quantity, foil, source, user_id) VALUES (?, ?, ?, ?, ?)'
      ).run(cardId, quantity, foil ? 1 : 0, source, userId);
    }
  } else {
    const existing = db
      .prepare('SELECT id FROM collection WHERE card_id = ? AND foil = ? AND source = ? AND COALESCE(user_id, 0) = 0')
      .get(cardId, foil ? 1 : 0, source) as { id: number } | undefined;

    if (existing) {
      db.prepare('UPDATE collection SET quantity = ? WHERE id = ?').run(quantity, existing.id);
    } else {
      db.prepare(
        'INSERT INTO collection (card_id, quantity, foil, source) VALUES (?, ?, ?, ?)'
      ).run(cardId, quantity, foil ? 1 : 0, source);
    }
  }
}

export function clearCollection(userId?: number, source?: 'paper' | 'arena') {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (userId != null) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  if (source) {
    // Clear both canonical and legacy source variants
    if (source === 'arena') {
      conditions.push("(source = 'arena' OR source = 'arena_csv')");
    } else {
      conditions.push('source = ?');
      params.push(source);
    }
  }

  if (conditions.length) {
    db.prepare(`DELETE FROM collection WHERE ${conditions.join(' AND ')}`).run(...params);
  } else {
    db.prepare('DELETE FROM collection').run();
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
  cardsPlayedByTurn?: string | null;
  commanderCastTurns?: string | null;
  landsPlayedByTurn?: string | null;
}): { success: boolean; id?: number } {
  const db = getDb();
  try {
    const result = db.prepare(
      `INSERT OR IGNORE INTO arena_parsed_matches
       (match_id, player_name, opponent_name, result, format, turns,
        deck_cards, cards_played, opponent_cards_seen,
        cards_played_by_turn, commander_cast_turns, lands_played_by_turn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      match.matchId,
      match.playerName,
      match.opponentName,
      match.result,
      match.format,
      match.turns,
      match.deckCards,
      match.cardsPlayed,
      match.opponentCardsSeen,
      match.cardsPlayedByTurn || null,
      match.commanderCastTurns || null,
      match.landsPlayedByTurn || null
    );
    return { success: true, id: Number(result.lastInsertRowid) || undefined };
  } catch {
    return { success: false };
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
 * Update live_game_sessions deck assignment (user-selected).
 */
export function updateLiveSessionDeck(matchId: string, deckId: number): boolean {
  const db = getDb();
  try {
    const r = db.prepare(
      'UPDATE live_game_sessions SET deck_id = ? WHERE match_id = ?'
    ).run(deckId, matchId);
    return r.changes > 0;
  } catch {
    return false;
  }
}

/**
 * Update live_game_sessions result on match end.
 */
export function updateLiveSessionResult(
  matchId: string,
  result: string,
  opponentName: string | null
): boolean {
  const db = getDb();
  try {
    const r = db.prepare(
      "UPDATE live_game_sessions SET result = ?, opponent_name = ?, ended_at = datetime('now') WHERE match_id = ?"
    ).run(result, opponentName, matchId);
    return r.changes > 0;
  } catch {
    return false;
  }
}

/**
 * Get all decks with their card names (for fingerprinting).
 * Returns lightweight deck objects: id, name, and flat array of card names.
 */
export function getDecksWithCardNames(): Array<{ id: number; name: string; cards: string[] }> {
  const db = getDb();
  const decks = db.prepare('SELECT id, name FROM decks').all() as Array<{ id: number; name: string }>;
  const stmtCards = db.prepare(`
    SELECT c.name
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = ? AND dc.board IN ('main', 'sideboard', 'commander', 'companion')
  `);

  return decks.map(deck => {
    const rows = stmtCards.all(deck.id) as Array<{ name: string }>;
    return {
      id: deck.id,
      name: deck.name,
      cards: rows.map(r => r.name),
    };
  });
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

// ── Telemetry operations ──────────────────────────────────────────────────

export function insertTelemetryActions(actions: Array<{
  match_id: string;
  game_number: number;
  turn_number: number;
  phase: string;
  action_type: string;
  player: string;
  grp_id: number | null;
  card_name: string | null;
  details: string | null;
  action_order: number;
}>): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO arena_game_actions
      (match_id, game_number, turn_number, phase, action_type, player, grp_id, card_name, details, action_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  db.transaction(() => {
    for (const a of actions) {
      stmt.run(
        a.match_id, a.game_number, a.turn_number, a.phase,
        a.action_type, a.player, a.grp_id, a.card_name, a.details, a.action_order
      );
      inserted++;
    }
  })();

  return inserted;
}

export function updateMatchTelemetry(matchId: string, summary: {
  opening_hand: number[];
  mulligan_count: number;
  on_play: boolean | null;
  match_start_time: string;
  match_end_time: string;
  game_count: number;
  life_progression: unknown[];
  draw_order: number[];
  sideboard_changes: unknown[];
  opponent_cards_by_turn: Record<number, number[]>;
}): boolean {
  const db = getDb();
  try {
    db.prepare(`
      UPDATE arena_parsed_matches SET
        opening_hand = ?,
        mulligan_count = ?,
        on_play = ?,
        match_start_time = ?,
        match_end_time = ?,
        game_count = ?,
        life_progression = ?,
        draw_order = ?,
        sideboard_changes = ?,
        opponent_cards_by_turn = ?
      WHERE match_id = ?
    `).run(
      JSON.stringify(summary.opening_hand),
      summary.mulligan_count,
      summary.on_play === null ? null : summary.on_play ? 1 : 0,
      summary.match_start_time,
      summary.match_end_time,
      summary.game_count,
      JSON.stringify(summary.life_progression),
      JSON.stringify(summary.draw_order),
      JSON.stringify(summary.sideboard_changes),
      JSON.stringify(summary.opponent_cards_by_turn),
      matchId
    );
    return true;
  } catch {
    return false;
  }
}

export function getMatchTimeline(matchId: string) {
  return getDb()
    .prepare('SELECT * FROM arena_game_actions WHERE match_id = ? ORDER BY action_order')
    .all(matchId);
}

export function getMatchTelemetrySummary(matchId: string) {
  return getDb()
    .prepare(`
      SELECT match_id, opening_hand, mulligan_count, on_play,
             match_start_time, match_end_time, game_count,
             life_progression, draw_order, sideboard_changes, opponent_cards_by_turn,
             player_name, opponent_name, result, format, turns
      FROM arena_parsed_matches
      WHERE match_id = ?
    `)
    .get(matchId);
}

/**
 * Bulk-lookup cards by name. Returns a map of name → { image_uri_small, image_uri_normal }.
 */
export function getCardsByNames(names: string[]): Map<string, { image_uri_small: string | null; image_uri_normal: string | null }> {
  const db = getDb();
  const result = new Map<string, { image_uri_small: string | null; image_uri_normal: string | null }>();
  if (names.length === 0) return result;

  const stmt = db.prepare('SELECT name, image_uri_small, image_uri_normal FROM cards WHERE name = ? COLLATE NOCASE');
  for (const name of names) {
    const row = stmt.get(name) as { name: string; image_uri_small: string | null; image_uri_normal: string | null } | undefined;
    if (row) {
      result.set(row.name, { image_uri_small: row.image_uri_small, image_uri_normal: row.image_uri_normal });
    }
  }
  return result;
}

/**
 * Bulk-resolve grpIds to card data via grp_id_cache joined with cards table.
 */
export function resolveGrpIdsToCards(grpIds: number[]): Map<number, { card_name: string; image_uri_small: string | null; image_uri_normal: string | null }> {
  const db = getDb();
  const result = new Map<number, { card_name: string; image_uri_small: string | null; image_uri_normal: string | null }>();
  if (grpIds.length === 0) return result;

  // Layer 1: grp_id_cache → cards join
  const stmt = db.prepare(`
    SELECT gc.grp_id, gc.card_name, c.image_uri_small, c.image_uri_normal
    FROM grp_id_cache gc
    LEFT JOIN cards c ON c.name = gc.card_name COLLATE NOCASE
    WHERE gc.grp_id = ?
  `);
  for (const grpId of grpIds) {
    const row = stmt.get(grpId) as { grp_id: number; card_name: string; image_uri_small: string | null; image_uri_normal: string | null } | undefined;
    // Skip entries where card_name is a numeric localization ID (stale data)
    if (row && !/^\d+$/.test(row.card_name)) {
      result.set(grpId, { card_name: row.card_name, image_uri_small: row.image_uri_small, image_uri_normal: row.image_uri_normal });
    }
  }

  // Layer 2: For unresolved grpIds, try cards.arena_id match
  const unresolved = grpIds.filter(id => !result.has(id));
  if (unresolved.length > 0) {
    const arenaStmt = db.prepare(`
      SELECT arena_id, name, image_uri_small, image_uri_normal
      FROM cards
      WHERE arena_id = ?
    `);
    for (const grpId of unresolved) {
      const row = arenaStmt.get(grpId) as { arena_id: number; name: string; image_uri_small: string | null; image_uri_normal: string | null } | undefined;
      if (row) {
        result.set(grpId, { card_name: row.name, image_uri_small: row.image_uri_small, image_uri_normal: row.image_uri_normal });
      }
    }
  }

  return result;
}

/**
 * Auto-link unlinked arena matches using cards_played (resolved card names).
 * Fallback for matches where deck_cards is NULL (95% of matches).
 */
// ── cEDH staples ─────────────────────────────────────────────────────────

/**
 * Get cEDH staples whose color identity is a subset of the deck's colors.
 * Empty color_identity matches any deck (colorless cards).
 */
export function getCedhStaples(
  colorIdentity: string[],
  format: string = 'historic_brawl'
): Array<{ card_name: string; category: string; power_tier: string }> {
  const db = getDb();
  try {
    const allStaples = db.prepare(
      `SELECT card_name, color_identity, category, power_tier
       FROM cedh_staples WHERE format = ?`
    ).all(format) as Array<{ card_name: string; color_identity: string; category: string; power_tier: string }>;

    const colorSet = new Set(colorIdentity);
    return allStaples.filter(s => {
      // Empty color_identity = colorless, always fits
      if (!s.color_identity) return true;
      // Each color in the staple's identity must be in the deck's colors
      return s.color_identity.split('').every(c => colorSet.has(c));
    }).map(({ card_name, category, power_tier }) => ({ card_name, category, power_tier }));
  } catch {
    return []; // table may not exist yet
  }
}

// ── Meta card stats ──────────────────────────────────────────────────────

/**
 * Bulk-load meta_card_stats for a set of card names in a given format.
 */
// Brawl is a subset of Commander — use commander data as fallback
const FORMAT_FALLBACK: Record<string, string[]> = {
  brawl: ['brawl', 'commander'],
  standardbrawl: ['standardbrawl', 'standard', 'brawl', 'commander'],
  historic_brawl: ['historic_brawl', 'brawl', 'commander'],
  historicbrawl: ['historicbrawl', 'historic_brawl', 'brawl', 'commander'],
};

function getFormatChain(format: string): string[] {
  return FORMAT_FALLBACK[format] || [format];
}

export function getMetaCardStatsMap(
  cardNames: string[],
  format: string
): Map<string, { inclusionRate: number; placementScore: number; coreRate: number; winRate: number }> {
  const db = getDb();
  const result = new Map<string, { inclusionRate: number; placementScore: number; coreRate: number; winRate: number }>();
  if (cardNames.length === 0) return result;

  const formatChain = getFormatChain(format);

  try {
    const stmt = db.prepare(
      `SELECT card_name, meta_inclusion_rate, placement_weighted_score,
              archetype_core_rate, COALESCE(archetype_win_rate, 0) as archetype_win_rate
       FROM meta_card_stats
       WHERE card_name = ? COLLATE NOCASE AND format = ?`
    );
    for (const name of cardNames) {
      // Try each format in the fallback chain until we find data
      for (const fmt of formatChain) {
        const row = stmt.get(name, fmt) as {
          card_name: string;
          meta_inclusion_rate: number;
          placement_weighted_score: number;
          archetype_core_rate: number;
          archetype_win_rate: number;
        } | undefined;
        if (row) {
          result.set(row.card_name, {
            inclusionRate: row.meta_inclusion_rate,
            placementScore: row.placement_weighted_score,
            coreRate: row.archetype_core_rate,
            winRate: row.archetype_win_rate,
          });
          break; // found data, stop searching fallback chain
        }
      }
    }
  } catch {
    // table may not exist
  }
  return result;
}

/**
 * Get the top meta-ranked card names for a format from tournament data.
 * Returns a Map of card_name → composite meta score (0..1).
 * Used by the synergy engine to rank cards by competitive viability
 * instead of EDHREC rank for 60-card formats.
 */
export function getMetaRankedCardNames(
  format: string,
  limit: number = 500
): Map<string, number> {
  const db = getDb();
  const result = new Map<string, number>();
  const formatChain = getFormatChain(format);
  const formatPlaceholders = formatChain.map(() => '?').join(',');

  try {
    const rows = db.prepare(`
      SELECT card_name, meta_inclusion_rate, placement_weighted_score,
             archetype_core_rate, num_decks_in
      FROM meta_card_stats
      WHERE format IN (${formatPlaceholders})
      AND num_decks_in >= 2
      ORDER BY (meta_inclusion_rate * 0.5 + placement_weighted_score * 0.3 + archetype_core_rate * 0.2) DESC
      LIMIT ?
    `).all(...formatChain, limit) as Array<{
      card_name: string;
      meta_inclusion_rate: number;
      placement_weighted_score: number;
      archetype_core_rate: number;
      num_decks_in: number;
    }>;

    for (const row of rows) {
      const score = row.meta_inclusion_rate * 0.5
        + row.placement_weighted_score * 0.3
        + row.archetype_core_rate * 0.2;
      result.set(row.card_name, score);
    }
  } catch {
    // table may not exist
  }
  return result;
}

/**
 * Get format staples — cards with high inclusion rate across community decks.
 * Uses cross-format fallback (brawl → commander) to ensure coverage.
 * Returns cards sorted by inclusion rate, filtered by color identity.
 */
export function getFormatStaples(
  format: string,
  colorIdentity: string[],
  limit: number = 40
): Array<{ cardName: string; inclusionRate: number; coreRate: number; deckCount: number; totalDecks: number }> {
  const db = getDb();
  const formatChain = getFormatChain(format);

  // Enforce legality against the ORIGINAL format, not the fallback format
  // (e.g. brawl→commander fallback must still only return brawl-legal cards)
  const legalityKey = getLegalityKey(format);
  const legalityFilter = `AND json_extract(c.legalities, '$.${legalityKey}') IN ('legal', 'restricted')`;

  // Build color exclusion: cards whose color_identity contains colors NOT in the deck
  const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter(c => !colorIdentity.includes(c));
  const colorClauses = excludeColors.map(c => `c.color_identity NOT LIKE '%${c}%'`);
  const colorFilter = colorClauses.length > 0 ? `AND ${colorClauses.join(' AND ')}` : '';

  const seen = new Map<string, { cardName: string; inclusionRate: number; coreRate: number; deckCount: number; totalDecks: number }>();

  try {
    for (const fmt of formatChain) {
      const rows = db.prepare(`
        SELECT m.card_name, m.meta_inclusion_rate, m.archetype_core_rate,
               m.num_decks_in, m.total_decks_sampled
        FROM meta_card_stats m
        JOIN cards c ON c.name = m.card_name COLLATE NOCASE
        WHERE m.format = ?
        AND m.meta_inclusion_rate >= 0.15
        AND c.type_line NOT LIKE '%Basic Land%'
        ${legalityFilter}
        ${colorFilter}
        ORDER BY m.meta_inclusion_rate DESC
        LIMIT ?
      `).all(fmt, limit * 2) as Array<{
        card_name: string;
        meta_inclusion_rate: number;
        archetype_core_rate: number;
        num_decks_in: number;
        total_decks_sampled: number;
      }>;

      for (const row of rows) {
        if (!seen.has(row.card_name)) {
          seen.set(row.card_name, {
            cardName: row.card_name,
            inclusionRate: row.meta_inclusion_rate,
            coreRate: row.archetype_core_rate,
            deckCount: row.num_decks_in,
            totalDecks: row.total_decks_sampled,
          });
        }
      }

      if (seen.size >= limit) break;
    }
  } catch {
    // table may not exist
  }

  return Array.from(seen.values())
    .sort((a, b) => b.inclusionRate - a.inclusionRate)
    .slice(0, limit);
}

/**
 * Get per-commander card inclusion stats from community deck data.
 * Returns cards sorted by inclusion rate for a specific commander,
 * with synergy scores (how much more/less common vs global baseline).
 */
export function getCommanderCardStats(
  commanderName: string,
  limit: number = 200
): Array<{
  cardName: string;
  inclusionRate: number;
  avgCopies: number;
  synergyScore: number;
  deckCount: number;
  totalDecks: number;
}> {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT card_name, inclusion_rate, avg_copies, synergy_score,
             deck_count, total_commander_decks
      FROM commander_card_stats
      WHERE commander_name = ? COLLATE NOCASE
      ORDER BY inclusion_rate DESC
      LIMIT ?
    `).all(commanderName, limit) as Array<{
      card_name: string;
      inclusion_rate: number;
      avg_copies: number;
      synergy_score: number;
      deck_count: number;
      total_commander_decks: number;
    }>;

    return rows.map(r => ({
      cardName: r.card_name,
      inclusionRate: r.inclusion_rate,
      avgCopies: r.avg_copies,
      synergyScore: r.synergy_score,
      deckCount: r.deck_count,
      totalDecks: r.total_commander_decks,
    }));
  } catch {
    return [];
  }
}

/**
 * Inverted index lookup: which commanders run a given card?
 * Uses the card_deck_index table populated by sync_commander_stats.py.
 * Sub-1ms response for "who plays Sol Ring?" queries.
 */
export function getCardCommanders(
  cardName: string,
  limit: number = 50
): Array<{
  commanderName: string;
  inclusionRate: number;
}> {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT commander_name, inclusion_rate
      FROM card_deck_index
      WHERE card_name = ? COLLATE NOCASE
      ORDER BY inclusion_rate DESC
      LIMIT ?
    `).all(cardName, limit) as Array<{
      commander_name: string;
      inclusion_rate: number;
    }>;

    return rows.map(r => ({
      commanderName: r.commander_name,
      inclusionRate: r.inclusion_rate,
    }));
  } catch {
    return [];
  }
}

/**
 * Community co-occurrence recommendations.
 * Given a deck's card names, finds community decks sharing the most cards,
 * then returns the most popular cards from those similar decks that aren't
 * already in the input deck.
 *
 * Uses "signature" cards (non-basic-lands) to find similar decks efficiently.
 */
export function getCommunityRecommendations(
  deckCardNames: string[],
  format: string,
  limit: number = 50
): Array<{ cardName: string; deckCount: number; totalSimilarDecks: number; score: number }> {
  const db = getDb();

  // Use up to 20 signature cards (non-basic-lands) for similarity matching
  const basics = new Set(['plains', 'island', 'swamp', 'mountain', 'forest',
    'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
    'snow-covered mountain', 'snow-covered forest', 'wastes']);
  const signatureCards = deckCardNames
    .filter(n => !basics.has(n.toLowerCase()))
    .slice(0, 20);

  if (signatureCards.length < 2) return [];

  const formatChain = getFormatChain(format);
  const formatPlaceholders = formatChain.map(() => '?').join(',');
  const cardPlaceholders = signatureCards.map(() => '?').join(',');
  const excludePlaceholders = deckCardNames.map(() => '?').join(',');

  // Minimum shared cards scales with signature count
  const minShared = Math.max(2, Math.floor(signatureCards.length * 0.15));

  try {
    const rows = db.prepare(`
      WITH similar_decks AS (
        SELECT cdc.community_deck_id, COUNT(*) as shared_count
        FROM community_deck_cards cdc
        JOIN community_decks cd ON cd.id = cdc.community_deck_id
        WHERE cdc.card_name IN (${cardPlaceholders})
        AND cd.format IN (${formatPlaceholders})
        GROUP BY cdc.community_deck_id
        HAVING COUNT(*) >= ${minShared}
        ORDER BY shared_count DESC
        LIMIT 500
      )
      SELECT cdc2.card_name,
             COUNT(DISTINCT cdc2.community_deck_id) as deck_count,
             (SELECT COUNT(*) FROM similar_decks) as total_similar
      FROM community_deck_cards cdc2
      JOIN similar_decks sd ON cdc2.community_deck_id = sd.community_deck_id
      WHERE cdc2.card_name NOT IN (${excludePlaceholders})
      AND cdc2.board = 'main'
      GROUP BY cdc2.card_name
      ORDER BY deck_count DESC
      LIMIT ?
    `).all(
      ...signatureCards,
      ...formatChain,
      ...deckCardNames,
      limit
    ) as Array<{ card_name: string; deck_count: number; total_similar: number }>;

    const totalSimilar = rows.length > 0 ? (rows[0].total_similar || 1) : 1;

    return rows.map(r => ({
      cardName: r.card_name,
      deckCount: r.deck_count,
      totalSimilarDecks: totalSimilar,
      score: r.deck_count / totalSimilar, // 0..1 co-occurrence rate
    }));
  } catch {
    return [];
  }
}

export function autoLinkByCardsPlayed(): { linked: number; total: number } {
  const db = getDb();
  const unlinked = db.prepare(
    "SELECT id, match_id, cards_played, format FROM arena_parsed_matches WHERE deck_id IS NULL AND cards_played IS NOT NULL AND cards_played != '[]' AND cards_played != ''"
  ).all() as Array<{ id: number; match_id: string; cards_played: string; format: string | null }>;

  // Get all decks with their card names
  const decks = db.prepare('SELECT id, name, format FROM decks').all() as Array<{ id: number; name: string; format: string | null }>;
  if (decks.length === 0) return { linked: 0, total: unlinked.length };

  const stmtDeckCards = db.prepare(`
    SELECT c.name FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = ? AND dc.board IN ('main', 'sideboard', 'commander', 'companion')
  `);

  // Pre-load deck card name sets
  const deckCardSets = new Map<number, { name: string; format: string | null; cardNames: Set<string> }>();
  for (const deck of decks) {
    const cards = stmtDeckCards.all(deck.id) as Array<{ name: string }>;
    deckCardSets.set(deck.id, {
      name: deck.name,
      format: deck.format,
      cardNames: new Set(cards.map(c => c.name)),
    });
  }

  let linked = 0;
  for (const match of unlinked) {
    try {
      const cardsPlayed = JSON.parse(match.cards_played) as string[];
      if (!Array.isArray(cardsPlayed) || cardsPlayed.length === 0) continue;

      // Deduplicate and filter out raw grpId numbers
      const uniquePlayed = new Set(cardsPlayed.filter(c => typeof c === 'string' && isNaN(Number(c))));
      if (uniquePlayed.size < 3) continue; // need at least 3 named cards

      let bestDeckId = -1;
      let bestConfidence = 0;

      deckCardSets.forEach((deckInfo, dId) => {
        // Optional format filter
        if (match.format && deckInfo.format && match.format !== deckInfo.format) return;

        let matching = 0;
        uniquePlayed.forEach(cardName => {
          if (deckInfo.cardNames.has(cardName)) matching++;
        });

        const confidence = matching / uniquePlayed.size;
        if (matching >= 8 && confidence >= 0.60 && confidence > bestConfidence) {
          bestDeckId = dId;
          bestConfidence = confidence;
        }
      });

      if (bestDeckId >= 0) {
        linkArenaMatchToDeck(match.match_id, bestDeckId, bestConfidence);
        linked++;
      }
    } catch {
      // skip invalid JSON
    }
  }

  return { linked, total: unlinked.length };
}

/**
 * Log an AI suggestion call for quality/cost tracking.
 */
export function logAISuggestion(entry: {
  deckId?: number;
  source: string;
  model?: string;
  format?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  suggestionCount?: number;
  cardsSuggested?: string[];
  latencyMs?: number;
  error?: string;
}): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO ai_suggestion_log
      (deck_id, source, model, format, prompt_tokens, completion_tokens, total_tokens,
       suggestion_count, cards_suggested, latency_ms, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.deckId ?? null,
    entry.source,
    entry.model ?? null,
    entry.format ?? null,
    entry.promptTokens ?? 0,
    entry.completionTokens ?? 0,
    entry.totalTokens ?? 0,
    entry.suggestionCount ?? 0,
    entry.cardsSuggested ? JSON.stringify(entry.cardsSuggested) : null,
    entry.latencyMs ?? null,
    entry.error ?? null,
  );
  return result.lastInsertRowid as number;
}

/**
 * Record that the user accepted/rejected suggestions from a log entry.
 */
export function updateSuggestionAcceptance(logId: number, accepted: string[], rejected: string[]) {
  const db = getDb();
  db.prepare(`
    UPDATE ai_suggestion_log
    SET accepted_count = ?, rejected_count = ?,
        cards_accepted = ?
    WHERE id = ?
  `).run(accepted.length, rejected.length, JSON.stringify(accepted), logId);
}

/**
 * Get AI suggestion quality stats by model/source.
 */
export function getAISuggestionStats(): Array<{
  source: string;
  model: string | null;
  totalCalls: number;
  totalSuggestions: number;
  totalAccepted: number;
  totalRejected: number;
  acceptRate: number;
  avgLatencyMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
}> {
  const db = getDb();
  return db.prepare(`
    SELECT
      source,
      model,
      COUNT(*) as totalCalls,
      SUM(suggestion_count) as totalSuggestions,
      SUM(accepted_count) as totalAccepted,
      SUM(rejected_count) as totalRejected,
      CASE WHEN SUM(accepted_count) + SUM(rejected_count) > 0
        THEN ROUND(CAST(SUM(accepted_count) AS REAL) / (SUM(accepted_count) + SUM(rejected_count)) * 100, 1)
        ELSE 0 END as acceptRate,
      ROUND(AVG(latency_ms)) as avgLatencyMs,
      SUM(prompt_tokens) as totalPromptTokens,
      SUM(completion_tokens) as totalCompletionTokens,
      SUM(total_tokens) as totalTokens
    FROM ai_suggestion_log
    WHERE error IS NULL
    GROUP BY source, model
    ORDER BY totalCalls DESC
  `).all() as Array<{
    source: string;
    model: string | null;
    totalCalls: number;
    totalSuggestions: number;
    totalAccepted: number;
    totalRejected: number;
    acceptRate: number;
    avgLatencyMs: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
  }>;
}
