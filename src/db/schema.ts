export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        oracle_id TEXT NOT NULL,
        name TEXT NOT NULL,
        mana_cost TEXT,
        cmc REAL NOT NULL DEFAULT 0,
        type_line TEXT NOT NULL,
        oracle_text TEXT,
        colors TEXT,
        color_identity TEXT,
        keywords TEXT,
        set_code TEXT NOT NULL,
        set_name TEXT NOT NULL,
        collector_number TEXT NOT NULL,
        rarity TEXT NOT NULL,
        image_uri_small TEXT,
        image_uri_normal TEXT,
        image_uri_large TEXT,
        image_uri_art_crop TEXT,
        price_usd TEXT,
        price_usd_foil TEXT,
        legalities TEXT,
        power TEXT,
        toughness TEXT,
        loyalty TEXT,
        produced_mana TEXT,
        edhrec_rank INTEGER,
        layout TEXT NOT NULL DEFAULT 'normal',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
      CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id);
      CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
      CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
      CREATE INDEX IF NOT EXISTS idx_cards_type_line ON cards(type_line);
      CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
      CREATE INDEX IF NOT EXISTS idx_cards_edhrec_rank ON cards(edhrec_rank);

      CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
        name,
        oracle_text,
        type_line,
        content=cards,
        content_rowid=rowid
      );

      CREATE TRIGGER IF NOT EXISTS cards_ai AFTER INSERT ON cards BEGIN
        INSERT INTO cards_fts(rowid, name, oracle_text, type_line)
        VALUES (new.rowid, new.name, new.oracle_text, new.type_line);
      END;

      CREATE TRIGGER IF NOT EXISTS cards_ad AFTER DELETE ON cards BEGIN
        INSERT INTO cards_fts(cards_fts, rowid, name, oracle_text, type_line)
        VALUES ('delete', old.rowid, old.name, old.oracle_text, old.type_line);
      END;

      CREATE TRIGGER IF NOT EXISTS cards_au AFTER UPDATE ON cards BEGIN
        INSERT INTO cards_fts(cards_fts, rowid, name, oracle_text, type_line)
        VALUES ('delete', old.rowid, old.name, old.oracle_text, old.type_line);
        INSERT INTO cards_fts(rowid, name, oracle_text, type_line)
        VALUES (new.rowid, new.name, new.oracle_text, new.type_line);
      END;

      CREATE TABLE IF NOT EXISTS collection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT NOT NULL REFERENCES cards(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        foil INTEGER NOT NULL DEFAULT 0,
        source TEXT DEFAULT 'import',
        imported_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(card_id, foil)
      );

      CREATE INDEX IF NOT EXISTS idx_collection_card_id ON collection(card_id);

      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        format TEXT,
        commander_id TEXT REFERENCES cards(id),
        cover_card_id TEXT REFERENCES cards(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS deck_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL REFERENCES cards(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        board TEXT NOT NULL DEFAULT 'main',
        sort_order INTEGER DEFAULT 0,
        UNIQUE(deck_id, card_id, board)
      );

      CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id);

      CREATE TABLE IF NOT EXISTS meta_cache (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
        ttl_hours INTEGER NOT NULL DEFAULT 168
      );

      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

    `,
  },
  {
    version: 2,
    name: 'add_match_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS match_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
        result TEXT NOT NULL CHECK(result IN ('win', 'loss', 'draw')),
        play_draw TEXT CHECK(play_draw IN ('play', 'draw')),
        opponent_name TEXT,
        opponent_deck_colors TEXT,
        opponent_deck_archetype TEXT,
        turns INTEGER,
        my_life_end INTEGER,
        opponent_life_end INTEGER,
        my_cards_seen TEXT,
        opponent_cards_seen TEXT,
        notes TEXT,
        raw_log TEXT,
        game_format TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_match_logs_deck_id ON match_logs(deck_id);
      CREATE INDEX IF NOT EXISTS idx_match_logs_result ON match_logs(result);
    `,
  },
  {
    version: 3,
    name: 'add_deck_insights',
    sql: `
      CREATE TABLE IF NOT EXISTS deck_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        insight_type TEXT NOT NULL,
        card_name TEXT,
        data TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0,
        games_analyzed INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(deck_id, insight_type, card_name)
      );

      CREATE INDEX IF NOT EXISTS idx_deck_insights_deck_id ON deck_insights(deck_id);
      CREATE INDEX IF NOT EXISTS idx_deck_insights_type ON deck_insights(insight_type);
    `,
  },
  {
    version: 4,
    name: 'add_favourite_cards',
    sql: `
      CREATE TABLE IF NOT EXISTS favourite_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT NOT NULL REFERENCES cards(id),
        deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(card_id, deck_id)
      );

      CREATE INDEX IF NOT EXISTS idx_favourite_cards_deck ON favourite_cards(deck_id);
      CREATE INDEX IF NOT EXISTS idx_favourite_cards_card ON favourite_cards(card_id);
    `,
  },
  {
    version: 5,
    name: 'add_global_learning',
    sql: `
      CREATE TABLE IF NOT EXISTS card_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_name TEXT NOT NULL,
        format TEXT NOT NULL,
        opponent_colors TEXT NOT NULL DEFAULT '',
        games_played INTEGER NOT NULL DEFAULT 0,
        games_in_deck INTEGER NOT NULL DEFAULT 0,
        wins_when_played INTEGER NOT NULL DEFAULT 0,
        wins_when_in_deck INTEGER NOT NULL DEFAULT 0,
        total_drawn INTEGER NOT NULL DEFAULT 0,
        rating REAL NOT NULL DEFAULT 1500.0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(card_name, format, opponent_colors)
      );

      CREATE INDEX IF NOT EXISTS idx_card_perf_name ON card_performance(card_name);
      CREATE INDEX IF NOT EXISTS idx_card_perf_format ON card_performance(format);
      CREATE INDEX IF NOT EXISTS idx_card_perf_rating ON card_performance(rating DESC);

      CREATE TABLE IF NOT EXISTS meta_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        format TEXT NOT NULL,
        color_combination TEXT NOT NULL,
        archetype_id INTEGER,
        games_seen INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        window_start TEXT NOT NULL,
        window_end TEXT NOT NULL,
        UNIQUE(format, color_combination, window_start)
      );

      CREATE INDEX IF NOT EXISTS idx_meta_format ON meta_snapshots(format);
      CREATE INDEX IF NOT EXISTS idx_meta_window ON meta_snapshots(window_start);

      CREATE TABLE IF NOT EXISTS opening_hand_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_name TEXT NOT NULL,
        format TEXT NOT NULL,
        in_opening_hand INTEGER NOT NULL DEFAULT 0,
        wins_in_opening INTEGER NOT NULL DEFAULT 0,
        mulliganed_away INTEGER NOT NULL DEFAULT 0,
        wins_after_mulligan INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(card_name, format)
      );

      CREATE INDEX IF NOT EXISTS idx_opening_hand_format ON opening_hand_stats(format);
      CREATE INDEX IF NOT EXISTS idx_opening_hand_card ON opening_hand_stats(card_name);

      CREATE TABLE IF NOT EXISTS archetype_clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        format TEXT NOT NULL,
        name TEXT NOT NULL,
        color_combination TEXT NOT NULL,
        signature_cards TEXT NOT NULL,
        centroid TEXT NOT NULL,
        games_seen INTEGER NOT NULL DEFAULT 0,
        avg_win_rate REAL NOT NULL DEFAULT 0.5,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(format, name)
      );

      CREATE TABLE IF NOT EXISTS archetype_matchups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        format TEXT NOT NULL,
        archetype_a INTEGER NOT NULL REFERENCES archetype_clusters(id),
        archetype_b INTEGER NOT NULL REFERENCES archetype_clusters(id),
        a_wins INTEGER NOT NULL DEFAULT 0,
        b_wins INTEGER NOT NULL DEFAULT 0,
        total_games INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(format, archetype_a, archetype_b)
      );
    `,
  },
  {
    version: 6,
    name: 'add_deck_versions',
    sql: `
      CREATE TABLE IF NOT EXISTS deck_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        name TEXT,
        cards_snapshot TEXT NOT NULL,
        changes_from_previous TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(deck_id, version_number)
      );

      CREATE INDEX IF NOT EXISTS idx_deck_versions_deck ON deck_versions(deck_id);

      ALTER TABLE match_logs ADD COLUMN deck_version_id INTEGER REFERENCES deck_versions(id);
    `,
  },
  {
    version: 7,
    name: 'add_subtypes_and_arena_id',
    sql: `
      ALTER TABLE cards ADD COLUMN subtypes TEXT;
      ALTER TABLE cards ADD COLUMN arena_id INTEGER;

      CREATE INDEX IF NOT EXISTS idx_cards_arena_id ON cards(arena_id);
    `,
  },
  {
    version: 8,
    name: 'add_commander_synergies',
    sql: `
      CREATE TABLE IF NOT EXISTS commander_synergies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commander_name TEXT NOT NULL,
        card_name TEXT NOT NULL,
        synergy_score REAL NOT NULL DEFAULT 0,
        inclusion_rate REAL NOT NULL DEFAULT 0,
        card_type TEXT DEFAULT NULL,
        source TEXT NOT NULL DEFAULT 'edhrec',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(commander_name, card_name)
      );

      CREATE INDEX IF NOT EXISTS idx_cmd_syn_commander ON commander_synergies(commander_name);
      CREATE INDEX IF NOT EXISTS idx_cmd_syn_score ON commander_synergies(synergy_score DESC);
    `,
  },
];
