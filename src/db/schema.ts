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
  {
    version: 9,
    name: 'add_arena_parsed_matches',
    sql: `
      CREATE TABLE IF NOT EXISTS arena_parsed_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT UNIQUE NOT NULL,
        player_name TEXT,
        opponent_name TEXT,
        result TEXT,
        format TEXT,
        turns INTEGER,
        deck_cards TEXT,
        cards_played TEXT,
        opponent_cards_seen TEXT,
        raw_events TEXT,
        parsed_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_arena_match_id ON arena_parsed_matches(match_id);
    `,
  },
  {
    version: 10,
    name: 'add_analytics_snapshots',
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_type TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(snapshot_type, format)
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_snapshots(snapshot_type);
    `,
  },
  {
    version: 11,
    name: 'add_personalized_suggestions',
    sql: `
      CREATE TABLE IF NOT EXISTS personalized_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER,
        commander_name TEXT,
        format TEXT NOT NULL DEFAULT '',
        card_name TEXT NOT NULL,
        predicted_score REAL NOT NULL,
        card_id TEXT,
        reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(deck_id, card_name)
      );

      CREATE INDEX IF NOT EXISTS idx_pers_sugg_deck ON personalized_suggestions(deck_id);
      CREATE INDEX IF NOT EXISTS idx_pers_sugg_score ON personalized_suggestions(predicted_score DESC);
    `,
  },
  {
    version: 12,
    name: 'add_users_and_ownership',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

      ALTER TABLE decks ADD COLUMN user_id INTEGER REFERENCES users(id);
      ALTER TABLE collection ADD COLUMN user_id INTEGER REFERENCES users(id);

      CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
      CREATE INDEX IF NOT EXISTS idx_collection_user_id ON collection(user_id);
    `,
  },
  {
    version: 13,
    name: 'add_arena_deck_linking',
    sql: `
      ALTER TABLE arena_parsed_matches ADD COLUMN deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL;
      ALTER TABLE arena_parsed_matches ADD COLUMN deck_match_confidence REAL;

      CREATE INDEX IF NOT EXISTS idx_arena_deck_id ON arena_parsed_matches(deck_id);
    `,
  },
  {
    version: 14,
    name: 'add_ml_training_data',
    sql: `
      CREATE TABLE IF NOT EXISTS ml_training_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        match_id INTEGER REFERENCES match_logs(id) ON DELETE CASCADE,
        arena_match_id INTEGER REFERENCES arena_parsed_matches(id) ON DELETE CASCADE,

        -- Snapshot of deck at match time
        deck_snapshot TEXT NOT NULL, -- JSON: {cards: [{name, quantity, cmc, colors}], commander: "..."}
        deck_format TEXT NOT NULL,
        deck_colors TEXT NOT NULL, -- JSON: ["W", "U", "B", "R", "G"]

        -- Match outcome
        game_outcome TEXT NOT NULL CHECK(game_outcome IN ('win', 'loss', 'draw')),
        turn_count INTEGER,
        opponent_archetype TEXT, -- "Aggro", "Control", "Combo", "Midrange", etc.
        opponent_colors TEXT, -- JSON array

        -- Deck statistics
        mana_curve TEXT NOT NULL, -- JSON: {0: count, 1: count, ...}
        avg_cmc REAL NOT NULL,
        land_count INTEGER NOT NULL,
        creature_count INTEGER NOT NULL,
        spell_count INTEGER NOT NULL,

        -- ML training flags
        is_training INTEGER NOT NULL DEFAULT 1,      -- 1 = training set, 0 = not training
        is_validation INTEGER NOT NULL DEFAULT 0,    -- 1 = validation set
        is_test INTEGER NOT NULL DEFAULT 0,          -- 1 = test set
        quality_score INTEGER DEFAULT 50 CHECK(quality_score BETWEEN 0 AND 100),
        reviewed INTEGER NOT NULL DEFAULT 0,         -- 1 = human reviewed
        notes TEXT,

        -- Metadata
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        CONSTRAINT only_one_match CHECK (
          (match_id IS NOT NULL AND arena_match_id IS NULL) OR
          (match_id IS NULL AND arena_match_id IS NOT NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS idx_ml_deck_id ON ml_training_data(deck_id);
      CREATE INDEX IF NOT EXISTS idx_ml_outcome ON ml_training_data(game_outcome);
      CREATE INDEX IF NOT EXISTS idx_ml_training_flag ON ml_training_data(is_training);
      CREATE INDEX IF NOT EXISTS idx_ml_validation_flag ON ml_training_data(is_validation);
      CREATE INDEX IF NOT EXISTS idx_ml_test_flag ON ml_training_data(is_test);
      CREATE INDEX IF NOT EXISTS idx_ml_quality ON ml_training_data(quality_score);
      CREATE INDEX IF NOT EXISTS idx_ml_created ON ml_training_data(created_at);
    `,
  },
  {
    version: 15,
    name: 'add_edhrec_knowledge_and_avg_decks',
    sql: `
      CREATE TABLE IF NOT EXISTS edhrec_knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        category TEXT,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content_hash TEXT,
        tags TEXT,
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(source_url, chunk_index)
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS edhrec_knowledge_fts
        USING fts5(title, chunk_text, tags, content='edhrec_knowledge', content_rowid='id');

      CREATE TRIGGER IF NOT EXISTS edhrec_knowledge_ai AFTER INSERT ON edhrec_knowledge BEGIN
        INSERT INTO edhrec_knowledge_fts(rowid, title, chunk_text, tags)
        VALUES (new.id, new.title, new.chunk_text, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS edhrec_knowledge_ad AFTER DELETE ON edhrec_knowledge BEGIN
        INSERT INTO edhrec_knowledge_fts(edhrec_knowledge_fts, rowid, title, chunk_text, tags)
        VALUES ('delete', old.id, old.title, old.chunk_text, old.tags);
      END;

      CREATE TABLE IF NOT EXISTS edhrec_avg_decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commander_name TEXT NOT NULL,
        card_name TEXT NOT NULL,
        card_type TEXT,
        category_tag TEXT,
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(commander_name, card_name)
      );

      CREATE INDEX IF NOT EXISTS idx_edhrec_avg_commander ON edhrec_avg_decks(commander_name);
    `,
  },
  {
    version: 16,
    name: 'add_ai_build_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_build_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL,
        commander_name TEXT,
        format TEXT NOT NULL,
        strategy TEXT,
        model_used TEXT,
        role_breakdown TEXT,
        strategy_explanation TEXT,
        card_reasons TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        build_time_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_build_deck ON ai_build_logs(deck_id);
    `,
  },
  {
    version: 17,
    name: 'add_community_meta_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS community_decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        source_id TEXT,
        format TEXT NOT NULL,
        archetype TEXT,
        deck_name TEXT,
        placement INTEGER,
        meta_share REAL,
        event_name TEXT,
        event_date TEXT,
        scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(source, source_id)
      );

      CREATE INDEX IF NOT EXISTS idx_community_decks_format ON community_decks(format);
      CREATE INDEX IF NOT EXISTS idx_community_decks_source ON community_decks(source);

      CREATE TABLE IF NOT EXISTS community_deck_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        community_deck_id INTEGER NOT NULL,
        card_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        board TEXT NOT NULL DEFAULT 'main',
        FOREIGN KEY (community_deck_id) REFERENCES community_decks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_cdc_deck ON community_deck_cards(community_deck_id);
      CREATE INDEX IF NOT EXISTS idx_cdc_card ON community_deck_cards(card_name);

      CREATE TABLE IF NOT EXISTS meta_card_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_name TEXT NOT NULL,
        format TEXT NOT NULL,
        meta_inclusion_rate REAL NOT NULL DEFAULT 0,
        placement_weighted_score REAL NOT NULL DEFAULT 0,
        archetype_core_rate REAL NOT NULL DEFAULT 0,
        avg_copies REAL NOT NULL DEFAULT 0,
        num_decks_in INTEGER NOT NULL DEFAULT 0,
        total_decks_sampled INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(card_name, format)
      );

      CREATE INDEX IF NOT EXISTS idx_mcs_format ON meta_card_stats(format);
      CREATE INDEX IF NOT EXISTS idx_mcs_card ON meta_card_stats(card_name);
    `,
  },
  {
    version: 18,
    name: 'add_win_loss_and_archetype_stats',
    sql: `
      -- Add win-loss columns to community_decks
      ALTER TABLE community_decks ADD COLUMN wins INTEGER;
      ALTER TABLE community_decks ADD COLUMN losses INTEGER;
      ALTER TABLE community_decks ADD COLUMN draws INTEGER;
      ALTER TABLE community_decks ADD COLUMN record TEXT;
      ALTER TABLE community_decks ADD COLUMN tournament_type TEXT;
      ALTER TABLE community_decks ADD COLUMN player_name TEXT;

      -- Archetype-level win/loss aggregation
      CREATE TABLE IF NOT EXISTS archetype_win_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        archetype TEXT NOT NULL,
        format TEXT NOT NULL,
        total_wins INTEGER NOT NULL DEFAULT 0,
        total_losses INTEGER NOT NULL DEFAULT 0,
        total_draws INTEGER NOT NULL DEFAULT 0,
        total_entries INTEGER NOT NULL DEFAULT 0,
        avg_placement REAL,
        best_placement INTEGER,
        league_5_0_count INTEGER NOT NULL DEFAULT 0,
        tournament_top8_count INTEGER NOT NULL DEFAULT 0,
        sample_size INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(archetype, format)
      );

      CREATE INDEX IF NOT EXISTS idx_aws_format ON archetype_win_stats(format);
      CREATE INDEX IF NOT EXISTS idx_aws_archetype ON archetype_win_stats(archetype);

      -- Add archetype_win_rate to meta_card_stats
      ALTER TABLE meta_card_stats ADD COLUMN archetype_win_rate REAL;
    `,
  },
  {
    version: 19,
    name: 'add_versioning_lands_ml_features',
    sql: `
      -- Phase 1: Enhanced version tracking
      ALTER TABLE deck_versions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
      ALTER TABLE deck_versions ADD COLUMN change_type TEXT;

      CREATE INDEX IF NOT EXISTS idx_deck_versions_deck_created
        ON deck_versions(deck_id, created_at DESC);

      -- Phase 3: Land classification
      CREATE TABLE IF NOT EXISTS land_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_name TEXT NOT NULL UNIQUE,
        card_id TEXT REFERENCES cards(id),
        land_category TEXT NOT NULL,
        produces_colors TEXT,
        enters_untapped INTEGER NOT NULL DEFAULT 0,
        enters_untapped_condition TEXT,
        tribal_types TEXT,
        synergy_tags TEXT,
        tier INTEGER NOT NULL DEFAULT 3,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Phase 4: Per-turn Arena match data
      ALTER TABLE arena_parsed_matches ADD COLUMN cards_played_by_turn TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN commander_cast_turns TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN lands_played_by_turn TEXT;

      -- Phase 4: ML feature extraction per match
      CREATE TABLE IF NOT EXISTS match_ml_features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER REFERENCES arena_parsed_matches(id) ON DELETE CASCADE,
        deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
        deck_version_id INTEGER REFERENCES deck_versions(id),
        avg_cmc_played REAL,
        curve_efficiency REAL,
        first_play_turn INTEGER,
        cards_drawn_per_turn REAL,
        unique_cards_played INTEGER,
        deck_penetration REAL,
        commander_cast_count INTEGER,
        commander_first_cast_turn INTEGER,
        removal_played_count INTEGER,
        counterspell_count INTEGER,
        version_age_days INTEGER,
        changes_since_last_version INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(match_id)
      );
    `,
  },
  {
    version: 20,
    name: 'add_mtggoldfish_knowledge',
    sql: `
      CREATE TABLE IF NOT EXISTS mtggoldfish_knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_url TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        category TEXT,
        article_type TEXT,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content_hash TEXT,
        tags TEXT,
        published_date TEXT,
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(source_url, chunk_index)
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS mtggoldfish_knowledge_fts
        USING fts5(title, chunk_text, tags, content='mtggoldfish_knowledge', content_rowid='id');

      CREATE TRIGGER IF NOT EXISTS mtggoldfish_knowledge_ai AFTER INSERT ON mtggoldfish_knowledge BEGIN
        INSERT INTO mtggoldfish_knowledge_fts(rowid, title, chunk_text, tags)
        VALUES (new.id, new.title, new.chunk_text, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS mtggoldfish_knowledge_ad AFTER DELETE ON mtggoldfish_knowledge BEGIN
        INSERT INTO mtggoldfish_knowledge_fts(mtggoldfish_knowledge_fts, rowid, title, chunk_text, tags)
        VALUES ('delete', old.id, old.title, old.chunk_text, old.tags);
      END;

      CREATE INDEX IF NOT EXISTS idx_mgk_category ON mtggoldfish_knowledge(category);
      CREATE INDEX IF NOT EXISTS idx_mgk_article_type ON mtggoldfish_knowledge(article_type);
      CREATE INDEX IF NOT EXISTS idx_mgk_published ON mtggoldfish_knowledge(published_date);
    `,
  },
  {
    version: 21,
    name: 'add_overlay_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS grp_id_cache (
        grp_id INTEGER PRIMARY KEY,
        card_name TEXT NOT NULL,
        scryfall_id TEXT,
        image_uri_small TEXT,
        image_uri_normal TEXT,
        mana_cost TEXT,
        cmc REAL,
        type_line TEXT,
        oracle_text TEXT,
        resolved_at TEXT DEFAULT (datetime('now')),
        source TEXT DEFAULT 'scryfall'
      );

      CREATE TABLE IF NOT EXISTS sideboard_guides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        opponent_archetype TEXT NOT NULL,
        opponent_colors TEXT,
        cards_in TEXT NOT NULL,
        cards_out TEXT NOT NULL,
        reasoning TEXT,
        source TEXT DEFAULT 'ai',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(deck_id, opponent_archetype)
      );

      CREATE INDEX IF NOT EXISTS idx_sb_guides_deck ON sideboard_guides(deck_id);

      CREATE TABLE IF NOT EXISTS live_game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT UNIQUE NOT NULL,
        deck_id INTEGER REFERENCES decks(id),
        format TEXT,
        started_at TEXT DEFAULT (datetime('now')),
        ended_at TEXT,
        mulligan_decisions TEXT,
        sideboard_changes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_lgs_match ON live_game_sessions(match_id);
    `,
  },
];
