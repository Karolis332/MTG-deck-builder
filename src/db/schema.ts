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
  {
    version: 22,
    name: 'dual_collections',
    sql: `
      CREATE TABLE collection_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT NOT NULL REFERENCES cards(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        foil INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'paper',
        imported_at TEXT NOT NULL DEFAULT (datetime('now')),
        user_id INTEGER REFERENCES users(id)
      );

      INSERT INTO collection_new (id, card_id, quantity, foil, source, imported_at, user_id)
      SELECT id, card_id, quantity, foil, 'paper', imported_at, user_id FROM collection;

      DROP TABLE collection;
      ALTER TABLE collection_new RENAME TO collection;

      CREATE INDEX idx_collection_card_id ON collection(card_id);
      CREATE INDEX idx_collection_user_id ON collection(user_id);
      CREATE INDEX idx_collection_source ON collection(source);
      CREATE UNIQUE INDEX idx_collection_unique ON collection(card_id, foil, source, COALESCE(user_id, 0));
    `,
  },
  {
    version: 23,
    name: 'add_spellbook_topdeck_tables',
    sql: `
      -- Commander Spellbook combo variants
      CREATE TABLE IF NOT EXISTS spellbook_combos (
        id TEXT PRIMARY KEY,
        identity TEXT,
        description TEXT,
        prerequisites TEXT,
        mana_needed TEXT,
        popularity INTEGER,
        bracket_tag TEXT,
        legal_commander INTEGER DEFAULT 1,
        legal_brawl INTEGER DEFAULT 0,
        price_tcgplayer REAL,
        fetched_at TEXT DEFAULT (datetime('now'))
      );

      -- Cards in each combo
      CREATE TABLE IF NOT EXISTS spellbook_combo_cards (
        combo_id TEXT NOT NULL REFERENCES spellbook_combos(id) ON DELETE CASCADE,
        card_name TEXT NOT NULL,
        card_oracle_id TEXT,
        quantity INTEGER DEFAULT 1,
        zone_locations TEXT,
        must_be_commander INTEGER DEFAULT 0,
        UNIQUE(combo_id, card_name)
      );

      CREATE INDEX IF NOT EXISTS idx_scc_card_name ON spellbook_combo_cards(card_name);
      CREATE INDEX IF NOT EXISTS idx_scc_combo_id ON spellbook_combo_cards(combo_id);

      -- What combos produce (results/features)
      CREATE TABLE IF NOT EXISTS spellbook_combo_results (
        combo_id TEXT NOT NULL REFERENCES spellbook_combos(id) ON DELETE CASCADE,
        feature_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        UNIQUE(combo_id, feature_name)
      );

      CREATE INDEX IF NOT EXISTS idx_scr_combo_id ON spellbook_combo_results(combo_id);

      -- Deck-specific combo findings (from find-my-combos API)
      CREATE TABLE IF NOT EXISTS spellbook_deck_combos (
        deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        combo_id TEXT NOT NULL REFERENCES spellbook_combos(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(deck_id, combo_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sdc_deck_id ON spellbook_deck_combos(deck_id);

      -- TopDeck.gg tournament metadata
      CREATE TABLE IF NOT EXISTS topdeck_tournaments (
        tid TEXT PRIMARY KEY,
        name TEXT,
        format TEXT,
        start_date TEXT,
        swiss_rounds INTEGER,
        top_cut INTEGER,
        participant_count INTEGER,
        city TEXT,
        state_region TEXT,
        location TEXT
      );

      -- Player standings per tournament
      CREATE TABLE IF NOT EXISTS topdeck_standings (
        tid TEXT NOT NULL REFERENCES topdeck_tournaments(tid) ON DELETE CASCADE,
        player_id TEXT,
        player_name TEXT NOT NULL,
        standing INTEGER,
        wins INTEGER,
        losses INTEGER,
        draws INTEGER,
        win_rate REAL,
        opponent_win_rate REAL,
        wins_swiss INTEGER,
        wins_bracket INTEGER,
        byes INTEGER,
        decklist_url TEXT,
        commander TEXT,
        UNIQUE(tid, player_name)
      );

      CREATE INDEX IF NOT EXISTS idx_ts_tid ON topdeck_standings(tid);

      -- Structured decklists from TopDeck
      CREATE TABLE IF NOT EXISTS topdeck_deck_cards (
        tid TEXT NOT NULL,
        player_id TEXT,
        section TEXT NOT NULL,
        card_name TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        UNIQUE(tid, player_id, section, card_name)
      );

      CREATE INDEX IF NOT EXISTS idx_tdc_card_name ON topdeck_deck_cards(card_name);

      -- Round pairings for matchup analysis
      CREATE TABLE IF NOT EXISTS topdeck_rounds (
        tid TEXT NOT NULL REFERENCES topdeck_tournaments(tid) ON DELETE CASCADE,
        round_number INTEGER,
        table_number INTEGER,
        player_names TEXT,
        winner TEXT,
        status TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tr_tid ON topdeck_rounds(tid);

      -- Add combo_score to meta_card_stats for ML feature #26
      ALTER TABLE meta_card_stats ADD COLUMN combo_score REAL;
    `,
  },
  {
    version: 24,
    name: 'add_cf_cache_table',
    sql: `
      -- Local cache for Collaborative Filtering API responses
      CREATE TABLE IF NOT EXISTS cf_cache (
        deck_hash TEXT NOT NULL,
        card_name TEXT NOT NULL,
        cf_score REAL NOT NULL,
        similar_deck_count INTEGER,
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(deck_hash, card_name)
      );
    `,
  },
  {
    version: 25,
    name: 'add_card_aliases_table',
    sql: `
      -- Alias table for Universes Beyond <-> Universe Within name mappings
      -- e.g., "Hobgoblin, Mantled Marauder" (Spiderman) <-> "Cam and Farrik, Havoc Duo" (Magic-native)
      CREATE TABLE IF NOT EXISTS card_aliases (
        alias_name TEXT NOT NULL,
        canonical_name TEXT NOT NULL,
        oracle_id TEXT,
        source TEXT DEFAULT 'scryfall',
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (alias_name)
      );
      CREATE INDEX IF NOT EXISTS idx_card_aliases_canonical ON card_aliases(canonical_name);
      CREATE INDEX IF NOT EXISTS idx_card_aliases_oracle_id ON card_aliases(oracle_id);
    `,
  },
  {
    version: 26,
    name: 'add_arena_telemetry',
    sql: `
      -- Per-action telemetry log for Arena matches (Arena Tutor-style)
      CREATE TABLE IF NOT EXISTS arena_game_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT NOT NULL,
        game_number INTEGER DEFAULT 1,
        turn_number INTEGER,
        phase TEXT,
        action_type TEXT NOT NULL,
        player TEXT NOT NULL DEFAULT 'self',
        grp_id INTEGER,
        card_name TEXT,
        details TEXT,
        action_order INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_aga_match ON arena_game_actions(match_id);
      CREATE INDEX IF NOT EXISTS idx_aga_match_turn ON arena_game_actions(match_id, turn_number);

      -- Enrich arena_parsed_matches with telemetry summary columns
      ALTER TABLE arena_parsed_matches ADD COLUMN opening_hand TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN mulligan_count INTEGER DEFAULT 0;
      ALTER TABLE arena_parsed_matches ADD COLUMN on_play INTEGER;
      ALTER TABLE arena_parsed_matches ADD COLUMN match_start_time TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN match_end_time TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN game_count INTEGER DEFAULT 1;
      ALTER TABLE arena_parsed_matches ADD COLUMN life_progression TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN draw_order TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN sideboard_changes TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN opponent_cards_by_turn TEXT;
    `,
  },
  {
    version: 27,
    name: 'add_cedh_staples',
    sql: `
      CREATE TABLE IF NOT EXISTS cedh_staples (
        card_name TEXT NOT NULL,
        color_identity TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        power_tier TEXT NOT NULL DEFAULT 'high',
        format TEXT NOT NULL DEFAULT 'historic_brawl',
        notes TEXT,
        PRIMARY KEY (card_name, format)
      );

      CREATE INDEX IF NOT EXISTS idx_cedh_staples_category ON cedh_staples(category);
      CREATE INDEX IF NOT EXISTS idx_cedh_staples_tier ON cedh_staples(power_tier);

      -- Colorless fast mana
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Sol Ring', '', 'fast_mana', 'cedh'),
        ('Mana Crypt', '', 'fast_mana', 'cedh'),
        ('Chrome Mox', '', 'fast_mana', 'cedh'),
        ('Mox Amber', '', 'fast_mana', 'cedh'),
        ('Jeweled Lotus', '', 'fast_mana', 'cedh'),
        ('Mana Vault', '', 'fast_mana', 'cedh'),
        ('Mox Opal', '', 'fast_mana', 'high'),
        ('Lotus Petal', '', 'fast_mana', 'high'),
        ('Arcane Signet', '', 'mana_rock', 'cedh'),
        ('Fellwar Stone', '', 'mana_rock', 'high'),
        ('Mind Stone', '', 'mana_rock', 'high'),
        ('Thought Vessel', '', 'mana_rock', 'medium'),
        ('Liquimetal Torque', '', 'mana_rock', 'medium'),
        ('Everflowing Chalice', '', 'mana_rock', 'medium');

      -- Blue interaction
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Force of Negation', 'U', 'free_interaction', 'cedh'),
        ('Fierce Guardianship', 'U', 'free_interaction', 'cedh'),
        ('Pact of Negation', 'U', 'free_interaction', 'cedh'),
        ('Swan Song', 'U', 'efficient_removal', 'cedh'),
        ('Mental Misstep', '', 'free_interaction', 'cedh'),
        ('Counterspell', 'U', 'efficient_removal', 'cedh'),
        ('Negate', 'U', 'efficient_removal', 'high'),
        ('An Offer You Can''t Refuse', 'U', 'efficient_removal', 'high'),
        ('Delay', 'U', 'efficient_removal', 'high'),
        ('Flusterstorm', 'U', 'efficient_removal', 'cedh'),
        ('Spell Pierce', 'U', 'efficient_removal', 'high'),
        ('Dispel', 'U', 'efficient_removal', 'medium'),
        ('Mana Drain', 'U', 'efficient_removal', 'cedh'),
        ('Arcane Denial', 'U', 'efficient_removal', 'medium');

      -- Blue card advantage
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Brainstorm', 'U', 'cantrip', 'cedh'),
        ('Ponder', 'U', 'cantrip', 'cedh'),
        ('Preordain', 'U', 'cantrip', 'cedh'),
        ('Consider', 'U', 'cantrip', 'high'),
        ('Gitaxian Probe', '', 'cantrip', 'cedh'),
        ('Treasure Cruise', 'U', 'card_advantage', 'high'),
        ('Dig Through Time', 'U', 'card_advantage', 'high'),
        ('Rhystic Study', 'U', 'card_advantage', 'cedh'),
        ('Mystic Remora', 'U', 'card_advantage', 'cedh'),
        ('Frantic Search', 'U', 'cantrip', 'high');

      -- Blue tutors
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Mystical Tutor', 'U', 'tutor', 'cedh'),
        ('Personal Tutor', 'U', 'tutor', 'high'),
        ('Intuition', 'U', 'tutor', 'high');

      -- Multicolor blue
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Dovin''s Veto', 'WU', 'efficient_removal', 'cedh'),
        ('Narset''s Reversal', 'U', 'efficient_removal', 'high');

      -- Red interaction
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Deflecting Swat', 'R', 'free_interaction', 'cedh'),
        ('Pyroblast', 'R', 'efficient_removal', 'cedh'),
        ('Red Elemental Blast', 'R', 'efficient_removal', 'cedh'),
        ('Abrade', 'R', 'efficient_removal', 'high'),
        ('Chaos Warp', 'R', 'efficient_removal', 'high'),
        ('Vandalblast', 'R', 'efficient_removal', 'high'),
        ('By Force', 'R', 'efficient_removal', 'medium'),
        ('Lightning Bolt', 'R', 'efficient_removal', 'high');

      -- Red value
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Dockside Extortionist', 'R', 'value_engine', 'cedh'),
        ('Ragavan, Nimble Pilferer', 'R', 'value_engine', 'cedh'),
        ('Underworld Breach', 'R', 'win_condition', 'cedh'),
        ('Jeska''s Will', 'R', 'card_advantage', 'cedh');

      -- White
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Swords to Plowshares', 'W', 'efficient_removal', 'cedh'),
        ('Path to Exile', 'W', 'efficient_removal', 'high'),
        ('Silence', 'W', 'protection', 'cedh'),
        ('Grand Abolisher', 'W', 'protection', 'cedh'),
        ('Esper Sentinel', 'W', 'card_advantage', 'cedh'),
        ('Teferi''s Protection', 'W', 'protection', 'cedh'),
        ('Smothering Tithe', 'W', 'value_engine', 'cedh'),
        ('Enlightened Tutor', 'W', 'tutor', 'cedh'),
        ('Drannith Magistrate', 'W', 'hatebear', 'cedh'),
        ('Ranger-Captain of Eos', 'W', 'protection', 'high');

      -- Black
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Demonic Tutor', 'B', 'tutor', 'cedh'),
        ('Vampiric Tutor', 'B', 'tutor', 'cedh'),
        ('Imperial Seal', 'B', 'tutor', 'cedh'),
        ('Thoughtseize', 'B', 'efficient_removal', 'high'),
        ('Fatal Push', 'B', 'efficient_removal', 'high'),
        ('Deadly Rollick', 'B', 'free_interaction', 'cedh'),
        ('Necropotence', 'B', 'card_advantage', 'cedh'),
        ('Ad Nauseam', 'B', 'card_advantage', 'cedh'),
        ('Dark Confidant', 'B', 'card_advantage', 'high'),
        ('Bolas''s Citadel', 'B', 'value_engine', 'high'),
        ('Toxic Deluge', 'B', 'efficient_removal', 'cedh'),
        ('Feed the Swarm', 'B', 'efficient_removal', 'medium'),
        ('Entomb', 'B', 'tutor', 'cedh'),
        ('Dark Ritual', 'B', 'fast_mana', 'cedh'),
        ('Cabal Ritual', 'B', 'fast_mana', 'high'),
        ('Opposition Agent', 'B', 'hatebear', 'cedh');

      -- Green
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Worldly Tutor', 'G', 'tutor', 'cedh'),
        ('Green Sun''s Zenith', 'G', 'tutor', 'cedh'),
        ('Finale of Devastation', 'G', 'tutor', 'cedh'),
        ('Chord of Calling', 'G', 'tutor', 'high'),
        ('Nature''s Claim', 'G', 'efficient_removal', 'cedh'),
        ('Beast Within', 'G', 'efficient_removal', 'high'),
        ('Collector Ouphe', 'G', 'hatebear', 'cedh'),
        ('Sylvan Library', 'G', 'card_advantage', 'cedh'),
        ('Birds of Paradise', 'G', 'ramp', 'cedh'),
        ('Elvish Mystic', 'G', 'ramp', 'high'),
        ('Llanowar Elves', 'G', 'ramp', 'high'),
        ('Elves of Deep Shadow', 'BG', 'ramp', 'high'),
        ('Carpet of Flowers', 'G', 'ramp', 'cedh'),
        ('Wild Growth', 'G', 'ramp', 'high'),
        ('Utopia Sprawl', 'G', 'ramp', 'high');

      -- Win conditions
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Thassa''s Oracle', 'U', 'win_condition', 'cedh'),
        ('Aetherflux Reservoir', '', 'win_condition', 'high'),
        ('Isochron Scepter', '', 'win_condition', 'cedh'),
        ('Dramatic Reversal', 'U', 'win_condition', 'cedh'),
        ('Brain Freeze', 'U', 'win_condition', 'high'),
        ('Demonic Consultation', 'B', 'win_condition', 'cedh'),
        ('Tainted Pact', 'B', 'win_condition', 'cedh'),
        ('Thoracle', 'U', 'win_condition', 'cedh');

      -- Multicolor staples
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Orcish Bowmasters', 'B', 'value_engine', 'cedh'),
        ('Notion Thief', 'UB', 'hatebear', 'high'),
        ('Aven Mindcensor', 'W', 'hatebear', 'high'),
        ('Lavinia, Azorius Renegade', 'WU', 'hatebear', 'high'),
        ('Dauthi Voidwalker', 'B', 'hatebear', 'cedh'),
        ('Hullbreaker Horror', 'U', 'win_condition', 'high'),
        ('Ledger Shredder', 'U', 'value_engine', 'high'),
        ('Malcator, Purity Overseer', 'WU', 'value_engine', 'medium');

      -- Utility lands (colorless identity)
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier) VALUES
        ('Command Tower', '', 'ramp', 'cedh'),
        ('Mana Confluence', '', 'ramp', 'cedh'),
        ('City of Brass', '', 'ramp', 'cedh'),
        ('Exotic Orchard', '', 'ramp', 'high'),
        ('Gemstone Caverns', '', 'fast_mana', 'cedh'),
        ('Ancient Tomb', '', 'fast_mana', 'cedh'),
        ('Strip Mine', '', 'efficient_removal', 'high'),
        ('Wasteland', '', 'efficient_removal', 'high');
    `,
  },
  {
    version: 28,
    name: 'seed_cf_api_defaults',
    sql: `
      -- Seed Collaborative Filtering API connection defaults
      INSERT OR IGNORE INTO app_state (key, value) VALUES
        ('cf_api_url', 'http://187.77.110.100/cf-api'),
        ('cf_api_key', '97c1d0df913335761afde8d86ac568a061416fa96fdb467e6597e6d9cd9436c1'),
        ('cf_enabled', 'true');
    `,
  },
  {
    version: 29,
    name: 'live_session_result_columns',
    sql: `
      ALTER TABLE live_game_sessions ADD COLUMN result TEXT;
      ALTER TABLE live_game_sessions ADD COLUMN opponent_name TEXT;
    `,
  },
  {
    version: 30,
    name: 'fix_live_game_sessions_fk',
    sql: `
      CREATE TABLE IF NOT EXISTS live_game_sessions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT UNIQUE NOT NULL,
        deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
        format TEXT,
        started_at TEXT DEFAULT (datetime('now')),
        ended_at TEXT,
        mulligan_decisions TEXT,
        sideboard_changes TEXT,
        result TEXT,
        opponent_name TEXT
      );
      INSERT OR IGNORE INTO live_game_sessions_new
        SELECT id, match_id, deck_id, format, started_at, ended_at,
               mulligan_decisions, sideboard_changes, result, opponent_name
        FROM live_game_sessions;
      DROP TABLE live_game_sessions;
      ALTER TABLE live_game_sessions_new RENAME TO live_game_sessions;
      CREATE INDEX IF NOT EXISTS idx_lgs_match ON live_game_sessions(match_id);
    `,
  },
  {
    version: 31,
    name: 'fix_deck_version_fk_cascade',
    sql: `
      -- Fix match_logs.deck_version_id missing ON DELETE
      CREATE TABLE IF NOT EXISTS match_logs_new (
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deck_version_id INTEGER REFERENCES deck_versions(id) ON DELETE SET NULL
      );
      INSERT OR IGNORE INTO match_logs_new
        SELECT id, deck_id, result, play_draw, opponent_name,
               opponent_deck_colors, opponent_deck_archetype, turns,
               my_life_end, opponent_life_end, my_cards_seen, opponent_cards_seen,
               notes, raw_log, game_format, created_at, deck_version_id
        FROM match_logs;
      DROP TABLE match_logs;
      ALTER TABLE match_logs_new RENAME TO match_logs;
      CREATE INDEX IF NOT EXISTS idx_match_logs_deck_id ON match_logs(deck_id);
      CREATE INDEX IF NOT EXISTS idx_match_logs_result ON match_logs(result);

      -- Fix match_ml_features.deck_version_id missing ON DELETE
      CREATE TABLE IF NOT EXISTS match_ml_features_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER REFERENCES arena_parsed_matches(id) ON DELETE CASCADE,
        deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
        deck_version_id INTEGER REFERENCES deck_versions(id) ON DELETE SET NULL,
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
      INSERT OR IGNORE INTO match_ml_features_new
        SELECT id, match_id, deck_id, deck_version_id,
               avg_cmc_played, curve_efficiency, first_play_turn,
               cards_drawn_per_turn, unique_cards_played, deck_penetration,
               commander_cast_count, commander_first_cast_turn,
               removal_played_count, counterspell_count,
               version_age_days, changes_since_last_version, created_at
        FROM match_ml_features;
      DROP TABLE match_ml_features;
      ALTER TABLE match_ml_features_new RENAME TO match_ml_features;
    `,
  },
  {
    version: 32,
    name: 'add_stripe_billing',
    sql: `
      ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
      ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
      ALTER TABLE users ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';
      ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'inactive';
      ALTER TABLE users ADD COLUMN subscription_ends_at TEXT;

      CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
    `,
  },
  {
    version: 33,
    name: 'add_ai_suggestion_log',
    sql: `
      -- Track every AI suggestion call: model, tokens, quality, cost
      CREATE TABLE IF NOT EXISTS ai_suggestion_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
        source TEXT NOT NULL,
        model TEXT,
        format TEXT,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        suggestion_count INTEGER DEFAULT 0,
        accepted_count INTEGER DEFAULT 0,
        rejected_count INTEGER DEFAULT 0,
        cards_suggested TEXT,
        cards_accepted TEXT,
        latency_ms INTEGER,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_aisl_source ON ai_suggestion_log(source);
      CREATE INDEX IF NOT EXISTS idx_aisl_model ON ai_suggestion_log(model);
      CREATE INDEX IF NOT EXISTS idx_aisl_deck ON ai_suggestion_log(deck_id);
      CREATE INDEX IF NOT EXISTS idx_aisl_created ON ai_suggestion_log(created_at);
    `,
  },
  {
    version: 34,
    name: 'commander_card_stats',
    sql: `
      -- Per-commander card inclusion rates from 506K+ community decks.
      -- Tracks how often each card appears alongside a specific commander,
      -- enabling data-driven deck building: "In 2800 Ur-Dragon decks, 72% run Sol Ring"
      CREATE TABLE IF NOT EXISTS commander_card_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commander_name TEXT NOT NULL,
        card_name TEXT NOT NULL,
        inclusion_rate REAL NOT NULL DEFAULT 0,
        avg_copies REAL NOT NULL DEFAULT 1,
        synergy_score REAL NOT NULL DEFAULT 0,
        deck_count INTEGER NOT NULL DEFAULT 0,
        total_commander_decks INTEGER NOT NULL DEFAULT 0,
        color_identity TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(commander_name, card_name)
      );

      CREATE INDEX IF NOT EXISTS idx_ccs_commander ON commander_card_stats(commander_name);
      CREATE INDEX IF NOT EXISTS idx_ccs_card ON commander_card_stats(card_name);
      CREATE INDEX IF NOT EXISTS idx_ccs_incl ON commander_card_stats(commander_name, inclusion_rate DESC);
    `,
  },
  {
    version: 35,
    name: 'card_deck_index',
    sql: `
      -- Inverted index: card_name -> which commanders run it.
      -- Enables sub-1ms "which commanders run Sol Ring?" lookups.
      -- Populated by sync_commander_stats.py from CF API data.
      CREATE TABLE IF NOT EXISTS card_deck_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_name TEXT NOT NULL,
        commander_name TEXT NOT NULL,
        inclusion_rate REAL NOT NULL DEFAULT 0,
        UNIQUE(card_name, commander_name)
      );

      CREATE INDEX IF NOT EXISTS idx_cdi_card ON card_deck_index(card_name);
      CREATE INDEX IF NOT EXISTS idx_cdi_commander ON card_deck_index(commander_name);
    `,
  },
  {
    version: 36,
    name: 'deck_built_by',
    sql: `
      -- Which engine produced the deck: 'engine' (local auto-build),
      -- 'claude' (AI chat build). NULL = built by hand.
      ALTER TABLE decks ADD COLUMN built_by TEXT;
    `,
  },
  {
    version: 37,
    name: 'cards_game_changer',
    sql: `
      -- Scryfall's official Commander-bracket "Game Changer" flag (~53 cards).
      -- Native Scryfall field (is:gamechanger) — synced by update-card-data.ts,
      -- used by the bracket estimator (0 allowed in B1/B2, <=3 in B3).
      ALTER TABLE cards ADD COLUMN game_changer INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 38,
    name: 'cards_name_nocase_index',
    sql: `
      -- idx_cards_name is BINARY-collated, so every "name = ? COLLATE NOCASE"
      -- lookup was a full 37K-row SCAN (incident 2026-08-25: 400-name batches
      -- blocked the build-api event loop until the watchdog killed it).
      -- A NOCASE index serves both exact NOCASE equality and prefix LIKE.
      CREATE INDEX IF NOT EXISTS idx_cards_name_nocase ON cards(name COLLATE NOCASE);
    `,
  },
  {
    version: 39,
    name: 'decks_target_bracket',
    sql: `
      -- Commander bracket (2-5) the user is building toward, for the reference-deck
      -- benchmark comparison. NULL = unset; code treats NULL as bracket 3 default.
      ALTER TABLE decks ADD COLUMN target_bracket INTEGER;
    `,
  },
  {
    version: 40,
    name: 'deck_cards_role_override',
    sql: `
      -- Manual role pin set via the command-center role view (dropdown or drag-onto-section).
      -- NULL = auto-classified by classifyCard/getPrimaryCategory; non-null pins the card to
      -- one CardCategory (src/lib/card-classifier.ts) regardless of oracle-text classification.
      ALTER TABLE deck_cards ADD COLUMN role_override TEXT;
    `,
  },
  {
    version: 41,
    name: 'cf_cache_reason',
    sql: `
      -- Formalizes the reason column lazily added at runtime by cf-api-client.ts's
      -- ensureReasonColumn() guard (guard stays in place for DBs that pre-date this migration).
      ALTER TABLE cf_cache ADD COLUMN reason TEXT;
    `,
  },
  {
    version: 43,
    name: 'commander_card_stats_lift',
    sql: `
      -- EDHREC-style lift (Dec 2025 successor to synergy_score):
      -- LN(P(card | commander decks) / P(card | decks sharing the commander's colour identity)).
      -- Populated by sync-commander-stats.ts from the CF API /commander-stats 'lift' field.
      -- NULL until the next sync; nothing in the engine reads it yet (T4 hook point:
      -- deck-builder-ai.ts commander_card_stats query). synergy_score is unchanged.
      ALTER TABLE commander_card_stats ADD COLUMN lift REAL;
    `,
  },
  {
    version: 42,
    name: 'arena_parsed_matches_contract_fields',
    sql: `
      -- Match-history field contract (orchestration/desktop-overhaul-2026-09/spec.md §1.5).
      -- Derived from raw_events by POST /api/arena-matches/reparse; existing columns keep their meaning.
      ALTER TABLE arena_parsed_matches ADD COLUMN player_screen_name TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN player_seat INTEGER;
      ALTER TABLE arena_parsed_matches ADD COLUMN winner_seat INTEGER;
      ALTER TABLE arena_parsed_matches ADD COLUMN opponent_commander TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN player_commander TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN format_normalized TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN queue_raw TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN game_results TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN duration_seconds INTEGER;
      CREATE INDEX IF NOT EXISTS idx_arena_format_normalized ON arena_parsed_matches(format_normalized);
    `,
  },
  {
    version: 44,
    name: 'deck_ingest_idempotency_and_runs',
    sql: `
      -- Ingest idempotency is already guaranteed: community_decks declares
      -- UNIQUE(source, source_id) inline, which is what the scrapers' ON CONFLICT
      -- clauses bind to. An extra unique index on the same columns was briefly added
      -- here and is dropped again -- it only duplicated the constraint.
      DROP INDEX IF EXISTS idx_community_decks_source_key;

      -- One row per scraper run so /ingest/status can answer "how stale is each source"
      -- without guessing from event_date, and so a failing source is visible instead of
      -- silently returning nothing.
      CREATE TABLE IF NOT EXISTS ingest_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        format TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL DEFAULT 'running',   -- running | ok | partial | failed
        decks_seen INTEGER NOT NULL DEFAULT 0,
        decks_inserted INTEGER NOT NULL DEFAULT 0,
        decks_updated INTEGER NOT NULL DEFAULT 0,
        decks_skipped INTEGER NOT NULL DEFAULT 0,
        newest_event_date TEXT,
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_ingest_runs_source ON ingest_runs(source, started_at DESC);

      -- event_date drives every recency window; without this index the meta queries
      -- table-scan 9K+ rows per request.
      CREATE INDEX IF NOT EXISTS idx_community_decks_window
        ON community_decks(format, event_date, source);
    `,
  },
  {
    version: 45,
    name: 'arena_parsed_matches_web_sync',
    sql: `
      -- Desktop -> web match sync (match-sync-contract-2026-09-19.md). NULL = not yet
      -- synced (or eligible for retry); src/lib/web-sync.ts sets these after each attempt.
      ALTER TABLE arena_parsed_matches ADD COLUMN web_synced_at TEXT;
      ALTER TABLE arena_parsed_matches ADD COLUMN web_sync_error TEXT;
    `,
  },
  {
    version: 46,
    name: 'add_commander_cedh_staples',
    sql: `
      -- Commander-format cEDH staples. cedh_staples' primary key is
      -- (card_name, format) (migration 27, add_cedh_staples) -- NOT card_name
      -- alone -- so these coexist with the existing historic_brawl rows for
      -- the same card_name without conflict; no schema change needed.
      --
      -- color_identity is left '' (unfiltered) here: getCedhStaples() derives
      -- the real color identity from the cards table at query time for
      -- format in (commander, brawl, standardbrawl) rather than trusting a
      -- hand-maintained column (src/lib/db.ts).
      -- fast_mana (Commander cEDH)
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier, format) VALUES
        ('Sol Ring', '', 'fast_mana', 'cedh', 'commander'),
        ('Mana Vault', '', 'fast_mana', 'cedh', 'commander'),
        ('Grim Monolith', '', 'fast_mana', 'cedh', 'commander'),
        ('Chrome Mox', '', 'fast_mana', 'cedh', 'commander'),
        ('Mox Diamond', '', 'fast_mana', 'cedh', 'commander'),
        ('Mox Opal', '', 'fast_mana', 'cedh', 'commander'),
        ('Mox Amber', '', 'fast_mana', 'cedh', 'commander'),
        ('Lotus Petal', '', 'fast_mana', 'cedh', 'commander'),
        ('Lion''s Eye Diamond', '', 'fast_mana', 'cedh', 'commander'),
        ('Ancient Tomb', '', 'fast_mana', 'cedh', 'commander'),
        ('Gemstone Caverns', '', 'fast_mana', 'cedh', 'commander'),
        ('Simian Spirit Guide', '', 'fast_mana', 'cedh', 'commander'),
        ('Elvish Spirit Guide', '', 'fast_mana', 'cedh', 'commander'),
        ('Dark Ritual', '', 'fast_mana', 'cedh', 'commander'),
        ('Cabal Ritual', '', 'fast_mana', 'cedh', 'commander'),
        ('Rite of Flame', '', 'fast_mana', 'cedh', 'commander'),
        ('Seething Song', '', 'fast_mana', 'cedh', 'commander'),
        ('Jeska''s Will', '', 'fast_mana', 'cedh', 'commander'),
        ('Culling the Weak', '', 'fast_mana', 'cedh', 'commander'),
        ('Mana Confluence', '', 'fast_mana', 'cedh', 'commander'),
        ('City of Brass', '', 'fast_mana', 'cedh', 'commander'),
        ('Arcane Signet', '', 'fast_mana', 'cedh', 'commander'),
        ('Fellwar Stone', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Dominance', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Progress', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Creativity', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Curiosity', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Hierarchy', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Impulse', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Indulgence', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Resilience', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Unity', '', 'fast_mana', 'cedh', 'commander'),
        ('Talisman of Conviction', '', 'fast_mana', 'cedh', 'commander'),
        ('Springleaf Drum', '', 'fast_mana', 'cedh', 'commander'),
        ('Wild Growth', '', 'fast_mana', 'cedh', 'commander'),
        ('Utopia Sprawl', '', 'fast_mana', 'cedh', 'commander'),
        ('Carpet of Flowers', '', 'fast_mana', 'cedh', 'commander'),
        ('Llanowar Elves', '', 'fast_mana', 'cedh', 'commander'),
        ('Elvish Mystic', '', 'fast_mana', 'cedh', 'commander'),
        ('Fyndhorn Elves', '', 'fast_mana', 'cedh', 'commander'),
        ('Birds of Paradise', '', 'fast_mana', 'cedh', 'commander'),
        ('Deathrite Shaman', '', 'fast_mana', 'cedh', 'commander'),
        ('Noble Hierarch', '', 'fast_mana', 'cedh', 'commander'),
        ('Ignoble Hierarch', '', 'fast_mana', 'cedh', 'commander'),
        ('Bloom Tender', '', 'fast_mana', 'cedh', 'commander'),
        ('Delighted Halfling', '', 'fast_mana', 'cedh', 'commander'),
        ('Arbor Elf', '', 'fast_mana', 'cedh', 'commander'),
        ('Boreal Druid', '', 'fast_mana', 'cedh', 'commander'),
        ('Elves of Deep Shadow', '', 'fast_mana', 'cedh', 'commander'),
        ('Priest of Titania', '', 'fast_mana', 'cedh', 'commander'),
        ('Gaea''s Cradle', '', 'fast_mana', 'cedh', 'commander'),
        ('Urza''s Saga', '', 'fast_mana', 'cedh', 'commander'),
        ('Command Tower', '', 'fast_mana', 'cedh', 'commander'),
        ('Exotic Orchard', '', 'fast_mana', 'cedh', 'commander'),
        ('Forbidden Orchard', '', 'fast_mana', 'cedh', 'commander'),
        ('Dryad Arbor', '', 'fast_mana', 'cedh', 'commander'),
        ('Boseiju, Who Endures', '', 'fast_mana', 'cedh', 'commander'),
        ('Otawara, Soaring City', '', 'fast_mana', 'cedh', 'commander'),
        ('Yavimaya, Cradle of Growth', '', 'fast_mana', 'cedh', 'commander'),
        ('Ragavan, Nimble Pilferer', '', 'fast_mana', 'cedh', 'commander'),
        ('Wild Cantor', '', 'fast_mana', 'cedh', 'commander'),
        ('Mishra''s Workshop', '', 'fast_mana', 'cedh', 'commander');

      -- tutor (Commander cEDH)
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier, format) VALUES
        ('Demonic Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Vampiric Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Imperial Seal', '', 'tutor', 'cedh', 'commander'),
        ('Diabolic Intent', '', 'tutor', 'cedh', 'commander'),
        ('Grim Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Mystical Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Personal Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Enlightened Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Worldly Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Sylvan Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Green Sun''s Zenith', '', 'tutor', 'cedh', 'commander'),
        ('Finale of Devastation', '', 'tutor', 'cedh', 'commander'),
        ('Natural Order', '', 'tutor', 'cedh', 'commander'),
        ('Eldritch Evolution', '', 'tutor', 'cedh', 'commander'),
        ('Neoform', '', 'tutor', 'cedh', 'commander'),
        ('Gamble', '', 'tutor', 'cedh', 'commander'),
        ('Wishclaw Talisman', '', 'tutor', 'cedh', 'commander'),
        ('Tainted Pact', '', 'tutor', 'cedh', 'commander'),
        ('Final Parting', '', 'tutor', 'cedh', 'commander'),
        ('Intuition', '', 'tutor', 'cedh', 'commander'),
        ('Merchant Scroll', '', 'tutor', 'cedh', 'commander'),
        ('Transmute Artifact', '', 'tutor', 'cedh', 'commander'),
        ('Reshape', '', 'tutor', 'cedh', 'commander'),
        ('Whir of Invention', '', 'tutor', 'cedh', 'commander'),
        ('Fabricate', '', 'tutor', 'cedh', 'commander'),
        ('Inventors'' Fair', '', 'tutor', 'cedh', 'commander'),
        ('Scheming Symmetry', '', 'tutor', 'cedh', 'commander'),
        ('Beseech the Mirror', '', 'tutor', 'cedh', 'commander'),
        ('Praetor''s Grasp', '', 'tutor', 'cedh', 'commander'),
        ('Chord of Calling', '', 'tutor', 'cedh', 'commander'),
        ('Survival of the Fittest', '', 'tutor', 'cedh', 'commander'),
        ('Birthing Pod', '', 'tutor', 'cedh', 'commander'),
        ('Entomb', '', 'tutor', 'cedh', 'commander'),
        ('Buried Alive', '', 'tutor', 'cedh', 'commander'),
        ('Crop Rotation', '', 'tutor', 'cedh', 'commander'),
        ('Sterling Grove', '', 'tutor', 'cedh', 'commander'),
        ('Idyllic Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Ranger-Captain of Eos', '', 'tutor', 'cedh', 'commander'),
        ('Recruiter of the Guard', '', 'tutor', 'cedh', 'commander'),
        ('Imperial Recruiter', '', 'tutor', 'cedh', 'commander'),
        ('Muddle the Mixture', '', 'tutor', 'cedh', 'commander'),
        ('Spellseeker', '', 'tutor', 'cedh', 'commander'),
        ('Trinket Mage', '', 'tutor', 'cedh', 'commander'),
        ('Tribute Mage', '', 'tutor', 'cedh', 'commander'),
        ('Long-Term Plans', '', 'tutor', 'cedh', 'commander'),
        ('Profane Tutor', '', 'tutor', 'cedh', 'commander'),
        ('Solve the Equation', '', 'tutor', 'cedh', 'commander'),
        ('Lim-Dûl''s Vault', '', 'tutor', 'cedh', 'commander'),
        ('Fauna Shaman', '', 'tutor', 'cedh', 'commander'),
        ('Eladamri''s Call', '', 'tutor', 'cedh', 'commander'),
        ('Sylvan Scrying', '', 'tutor', 'cedh', 'commander');

      -- interaction (Commander cEDH)
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier, format) VALUES
        ('Force of Will', '', 'interaction', 'cedh', 'commander'),
        ('Force of Negation', '', 'interaction', 'cedh', 'commander'),
        ('Pact of Negation', '', 'interaction', 'cedh', 'commander'),
        ('Mental Misstep', '', 'interaction', 'cedh', 'commander'),
        ('Swan Song', '', 'interaction', 'cedh', 'commander'),
        ('Flusterstorm', '', 'interaction', 'cedh', 'commander'),
        ('Mindbreak Trap', '', 'interaction', 'cedh', 'commander'),
        ('Fierce Guardianship', '', 'interaction', 'cedh', 'commander'),
        ('Deflecting Swat', '', 'interaction', 'cedh', 'commander'),
        ('Deadly Rollick', '', 'interaction', 'cedh', 'commander'),
        ('Flawless Maneuver', '', 'interaction', 'cedh', 'commander'),
        ('An Offer You Can''t Refuse', '', 'interaction', 'cedh', 'commander'),
        ('Dispel', '', 'interaction', 'cedh', 'commander'),
        ('Spell Pierce', '', 'interaction', 'cedh', 'commander'),
        ('Miscast', '', 'interaction', 'cedh', 'commander'),
        ('Counterspell', '', 'interaction', 'cedh', 'commander'),
        ('Mana Drain', '', 'interaction', 'cedh', 'commander'),
        ('Delay', '', 'interaction', 'cedh', 'commander'),
        ('Daze', '', 'interaction', 'cedh', 'commander'),
        ('Memory Lapse', '', 'interaction', 'cedh', 'commander'),
        ('Arcane Denial', '', 'interaction', 'cedh', 'commander'),
        ('Negate', '', 'interaction', 'cedh', 'commander'),
        ('Dovin''s Veto', '', 'interaction', 'cedh', 'commander'),
        ('Red Elemental Blast', '', 'interaction', 'cedh', 'commander'),
        ('Pyroblast', '', 'interaction', 'cedh', 'commander'),
        ('Blue Elemental Blast', '', 'interaction', 'cedh', 'commander'),
        ('Hydroblast', '', 'interaction', 'cedh', 'commander'),
        ('Abrupt Decay', '', 'interaction', 'cedh', 'commander'),
        ('Assassin''s Trophy', '', 'interaction', 'cedh', 'commander'),
        ('Nature''s Claim', '', 'interaction', 'cedh', 'commander'),
        ('Chain of Vapor', '', 'interaction', 'cedh', 'commander'),
        ('Snap', '', 'interaction', 'cedh', 'commander'),
        ('Cyclonic Rift', '', 'interaction', 'cedh', 'commander'),
        ('Swords to Plowshares', '', 'interaction', 'cedh', 'commander'),
        ('Path to Exile', '', 'interaction', 'cedh', 'commander'),
        ('Silence', '', 'interaction', 'cedh', 'commander'),
        ('Veil of Summer', '', 'interaction', 'cedh', 'commander'),
        ('Autumn''s Veil', '', 'interaction', 'cedh', 'commander'),
        ('Force of Vigor', '', 'interaction', 'cedh', 'commander'),
        ('Endurance', '', 'interaction', 'cedh', 'commander'),
        ('Dress Down', '', 'interaction', 'cedh', 'commander'),
        ('Stern Scolding', '', 'interaction', 'cedh', 'commander'),
        ('Flare of Denial', '', 'interaction', 'cedh', 'commander'),
        ('Snuff Out', '', 'interaction', 'cedh', 'commander'),
        ('Dismember', '', 'interaction', 'cedh', 'commander'),
        ('Toxic Deluge', '', 'interaction', 'cedh', 'commander'),
        ('Fire Covenant', '', 'interaction', 'cedh', 'commander'),
        ('Krosan Grip', '', 'interaction', 'cedh', 'commander'),
        ('Tale''s End', '', 'interaction', 'cedh', 'commander'),
        ('Orcish Bowmasters', '', 'interaction', 'cedh', 'commander'),
        ('Fatal Push', '', 'interaction', 'cedh', 'commander'),
        ('Lightning Bolt', '', 'interaction', 'cedh', 'commander'),
        ('Vandalblast', '', 'interaction', 'cedh', 'commander'),
        ('Rakdos Charm', '', 'interaction', 'cedh', 'commander');

      -- engine (Commander cEDH)
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier, format) VALUES
        ('Rhystic Study', '', 'engine', 'cedh', 'commander'),
        ('Mystic Remora', '', 'engine', 'cedh', 'commander'),
        ('Necropotence', '', 'engine', 'cedh', 'commander'),
        ('Ad Nauseam', '', 'engine', 'cedh', 'commander'),
        ('Peer into the Abyss', '', 'engine', 'cedh', 'commander'),
        ('Sylvan Library', '', 'engine', 'cedh', 'commander'),
        ('Esper Sentinel', '', 'engine', 'cedh', 'commander'),
        ('Sensei''s Divining Top', '', 'engine', 'cedh', 'commander'),
        ('Dark Confidant', '', 'engine', 'cedh', 'commander'),
        ('Bolas''s Citadel', '', 'engine', 'cedh', 'commander'),
        ('Yawgmoth''s Will', '', 'engine', 'cedh', 'commander'),
        ('Underworld Breach', '', 'engine', 'cedh', 'commander'),
        ('Brainstorm', '', 'engine', 'cedh', 'commander'),
        ('Ponder', '', 'engine', 'cedh', 'commander'),
        ('Preordain', '', 'engine', 'cedh', 'commander'),
        ('Gitaxian Probe', '', 'engine', 'cedh', 'commander'),
        ('Windfall', '', 'engine', 'cedh', 'commander'),
        ('Wheel of Fortune', '', 'engine', 'cedh', 'commander'),
        ('Timetwister', '', 'engine', 'cedh', 'commander'),
        ('Time Spiral', '', 'engine', 'cedh', 'commander'),
        ('Narset, Parter of Veils', '', 'engine', 'cedh', 'commander'),
        ('Faerie Mastermind', '', 'engine', 'cedh', 'commander'),
        ('Archivist of Oghma', '', 'engine', 'cedh', 'commander'),
        ('Smothering Tithe', '', 'engine', 'cedh', 'commander'),
        ('Wheel of Misfortune', '', 'engine', 'cedh', 'commander'),
        ('Scroll Rack', '', 'engine', 'cedh', 'commander'),
        ('Land Tax', '', 'engine', 'cedh', 'commander'),
        ('Tymna the Weaver', '', 'engine', 'cedh', 'commander'),
        ('Thrasios, Triton Hero', '', 'engine', 'cedh', 'commander'),
        ('Kraum, Ludevic''s Opus', '', 'engine', 'cedh', 'commander'),
        ('Rograkh, Son of Rohgahh', '', 'engine', 'cedh', 'commander'),
        ('Malcolm, Keen-Eyed Navigator', '', 'engine', 'cedh', 'commander'),
        ('Tevesh Szat, Doom of Fools', '', 'engine', 'cedh', 'commander'),
        ('Kinnan, Bonder Prodigy', '', 'engine', 'cedh', 'commander'),
        ('Talion, the Kindly Lord', '', 'engine', 'cedh', 'commander'),
        ('Notion Thief', '', 'engine', 'cedh', 'commander'),
        ('Spirit of the Labyrinth', '', 'engine', 'cedh', 'commander'),
        ('Sheoldred, the Apocalypse', '', 'engine', 'cedh', 'commander'),
        ('Elite Spellbinder', '', 'engine', 'cedh', 'commander');

      -- stax (Commander cEDH)
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier, format) VALUES
        ('Drannith Magistrate', '', 'stax', 'cedh', 'commander'),
        ('Opposition Agent', '', 'stax', 'cedh', 'commander'),
        ('Collector Ouphe', '', 'stax', 'cedh', 'commander'),
        ('Null Rod', '', 'stax', 'cedh', 'commander'),
        ('Stony Silence', '', 'stax', 'cedh', 'commander'),
        ('Cursed Totem', '', 'stax', 'cedh', 'commander'),
        ('Rule of Law', '', 'stax', 'cedh', 'commander'),
        ('Deafening Silence', '', 'stax', 'cedh', 'commander'),
        ('Grafdigger''s Cage', '', 'stax', 'cedh', 'commander'),
        ('Aven Mindcensor', '', 'stax', 'cedh', 'commander'),
        ('Blind Obedience', '', 'stax', 'cedh', 'commander'),
        ('Torpor Orb', '', 'stax', 'cedh', 'commander'),
        ('Archon of Emeria', '', 'stax', 'cedh', 'commander'),
        ('Linvala, Keeper of Silence', '', 'stax', 'cedh', 'commander'),
        ('Rest in Peace', '', 'stax', 'cedh', 'commander'),
        ('Dauthi Voidwalker', '', 'stax', 'cedh', 'commander'),
        ('Trinisphere', '', 'stax', 'cedh', 'commander'),
        ('Thorn of Amethyst', '', 'stax', 'cedh', 'commander'),
        ('Sphere of Resistance', '', 'stax', 'cedh', 'commander'),
        ('Winter Orb', '', 'stax', 'cedh', 'commander'),
        ('Static Orb', '', 'stax', 'cedh', 'commander'),
        ('Tangle Wire', '', 'stax', 'cedh', 'commander'),
        ('Back to Basics', '', 'stax', 'cedh', 'commander'),
        ('Blood Moon', '', 'stax', 'cedh', 'commander'),
        ('Magus of the Moon', '', 'stax', 'cedh', 'commander'),
        ('Ethersworn Canonist', '', 'stax', 'cedh', 'commander'),
        ('Eidolon of Rhetoric', '', 'stax', 'cedh', 'commander'),
        ('Hushbringer', '', 'stax', 'cedh', 'commander'),
        ('Tocatli Honor Guard', '', 'stax', 'cedh', 'commander'),
        ('Containment Priest', '', 'stax', 'cedh', 'commander'),
        ('Sanctum Prelate', '', 'stax', 'cedh', 'commander'),
        ('Lavinia, Azorius Renegade', '', 'stax', 'cedh', 'commander'),
        ('Root Maze', '', 'stax', 'cedh', 'commander'),
        ('Damping Sphere', '', 'stax', 'cedh', 'commander'),
        ('Chalice of the Void', '', 'stax', 'cedh', 'commander'),
        ('Leonin Arbiter', '', 'stax', 'cedh', 'commander'),
        ('Ashiok, Dream Render', '', 'stax', 'cedh', 'commander');

      -- wincon (Commander cEDH)
      INSERT OR IGNORE INTO cedh_staples (card_name, color_identity, category, power_tier, format) VALUES
        ('Thassa''s Oracle', '', 'wincon', 'cedh', 'commander'),
        ('Laboratory Maniac', '', 'wincon', 'cedh', 'commander'),
        ('Jace, Wielder of Mysteries', '', 'wincon', 'cedh', 'commander'),
        ('Demonic Consultation', '', 'wincon', 'cedh', 'commander'),
        ('Walking Ballista', '', 'wincon', 'cedh', 'commander'),
        ('Aetherflux Reservoir', '', 'wincon', 'cedh', 'commander'),
        ('Isochron Scepter', '', 'wincon', 'cedh', 'commander'),
        ('Dramatic Reversal', '', 'wincon', 'cedh', 'commander'),
        ('Basalt Monolith', '', 'wincon', 'cedh', 'commander'),
        ('Rings of Brighthearth', '', 'wincon', 'cedh', 'commander'),
        ('Power Artifact', '', 'wincon', 'cedh', 'commander'),
        ('Kiki-Jiki, Mirror Breaker', '', 'wincon', 'cedh', 'commander'),
        ('Zealous Conscripts', '', 'wincon', 'cedh', 'commander'),
        ('Pestermite', '', 'wincon', 'cedh', 'commander'),
        ('Deceiver Exarch', '', 'wincon', 'cedh', 'commander'),
        ('Felidar Guardian', '', 'wincon', 'cedh', 'commander'),
        ('Splinter Twin', '', 'wincon', 'cedh', 'commander'),
        ('Devoted Druid', '', 'wincon', 'cedh', 'commander'),
        ('Vizier of Remedies', '', 'wincon', 'cedh', 'commander'),
        ('Swift Reconfiguration', '', 'wincon', 'cedh', 'commander'),
        ('Brain Freeze', '', 'wincon', 'cedh', 'commander'),
        ('Angel''s Grace', '', 'wincon', 'cedh', 'commander'),
        ('Sickening Dreams', '', 'wincon', 'cedh', 'commander'),
        ('Tendrils of Agony', '', 'wincon', 'cedh', 'commander'),
        ('Temur Sabertooth', '', 'wincon', 'cedh', 'commander'),
        ('Food Chain', '', 'wincon', 'cedh', 'commander'),
        ('Eternal Scourge', '', 'wincon', 'cedh', 'commander'),
        ('Misthollow Griffin', '', 'wincon', 'cedh', 'commander'),
        ('Squee, the Immortal', '', 'wincon', 'cedh', 'commander'),
        ('Worldgorger Dragon', '', 'wincon', 'cedh', 'commander'),
        ('Animate Dead', '', 'wincon', 'cedh', 'commander'),
        ('Necromancy', '', 'wincon', 'cedh', 'commander'),
        ('Reanimate', '', 'wincon', 'cedh', 'commander'),
        ('Dance of the Dead', '', 'wincon', 'cedh', 'commander'),
        ('Razaketh, the Foulblooded', '', 'wincon', 'cedh', 'commander'),
        ('Hermit Druid', '', 'wincon', 'cedh', 'commander'),
        ('Exquisite Blood', '', 'wincon', 'cedh', 'commander'),
        ('Sanguine Bond', '', 'wincon', 'cedh', 'commander'),
        ('Vito, Thorn of the Dusk Rose', '', 'wincon', 'cedh', 'commander'),
        ('Heliod, Sun-Crowned', '', 'wincon', 'cedh', 'commander'),
        ('Palinchron', '', 'wincon', 'cedh', 'commander'),
        ('Selvala, Heart of the Wilds', '', 'wincon', 'cedh', 'commander'),
        ('Umbral Mantle', '', 'wincon', 'cedh', 'commander'),
        ('Staff of Domination', '', 'wincon', 'cedh', 'commander'),
        ('Sword of the Paruns', '', 'wincon', 'cedh', 'commander'),
        ('Freed from the Real', '', 'wincon', 'cedh', 'commander'),
        ('Pemmin''s Aura', '', 'wincon', 'cedh', 'commander'),
        ('Marwyn, the Nurturer', '', 'wincon', 'cedh', 'commander'),
        ('Ashaya, Soul of the Wild', '', 'wincon', 'cedh', 'commander'),
        ('Quirion Ranger', '', 'wincon', 'cedh', 'commander'),
        ('Scryb Ranger', '', 'wincon', 'cedh', 'commander'),
        ('Wirewood Symbiote', '', 'wincon', 'cedh', 'commander'),
        ('Duskwatch Recruiter // Krallenhorde Howler', '', 'wincon', 'cedh', 'commander'),
        ('Craterhoof Behemoth', '', 'wincon', 'cedh', 'commander'),
        ('Godo, Bandit Warlord', '', 'wincon', 'cedh', 'commander'),
        ('Helm of the Host', '', 'wincon', 'cedh', 'commander'),
        ('Approach of the Second Sun', '', 'wincon', 'cedh', 'commander'),
        ('Emergent Ultimatum', '', 'wincon', 'cedh', 'commander'),
        ('Breach the Multiverse', '', 'wincon', 'cedh', 'commander'),
        ('Mnemonic Betrayal', '', 'wincon', 'cedh', 'commander');
    `,
  },
];
