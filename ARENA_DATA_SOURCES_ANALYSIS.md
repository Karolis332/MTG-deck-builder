# MTG Arena Data Sources Analysis: Player.log vs Arena Tutor

**Date:** February 5, 2026
**Status:** Comprehensive Data Inventory & Double-Tracking Assessment
**Scope:** Current parser implementation + Arena Tutor capabilities + ML training requirements

---

## Executive Summary

This project currently extracts game event data from **MTG Arena's Player.log file** via TypeScript (`arena-log-reader.ts`) and Python (`scripts/arena_log_parser.py`). The data is stored in `arena_parsed_matches` table. Arena Tutor (by Draftsim) is a third-party tracker that **also reads from the same Player.log file** but provides additional UI/UX features and structured enrichment.

**Key Finding:** There is **NO inherent double-tracking** because both sources originate from the same Player.log file. However, **significant opportunities exist** to augment Player.log data with enrichment that Arena Tutor provides (but doesn't export programmatically), and to collect game-event granularity that Arena Tutor tracks but we don't capture.

---

## Part 1: Data Extracted from MTG Arena Player.log (Current Implementation)

### What Your Parsers Extract

#### File: `src/lib/arena-log-reader.ts` (TypeScript) + `scripts/arena_log_parser.py` (Python)

**Match-Level Data:**
| Field | Type | Source | Status |
|-------|------|--------|--------|
| `match_id` | STRING | `matchGameRoomStateChangedEvent.gameRoomConfig.matchId` | ✓ Extracted |
| `player_name` | STRING | `authenticateResponse.screenName` OR `reservedPlayers[0].playerName` | ✓ Extracted |
| `opponent_name` | STRING | `reservedPlayers[1].playerName` (seat ID != player) | ✓ Extracted |
| `result` | ENUM: win/loss/draw | `finalMatchResult.resultList[...].result` ("ResultType_Win", etc.) | ✓ Extracted |
| `format` | STRING | `reservedPlayers[...].eventId` (e.g., "Play_Brawl_Historic", "Ladder") | ✓ Extracted (normalized) |
| `turns` | INT | `gameStateMessage.turnInfo.turnNumber` (highest turn seen) | ✓ Extracted |

**Deck Composition Data:**
| Field | Type | Source | Status |
|-------|------|--------|--------|
| `deck_cards` | JSON Array | `EventSetDeckV2.Deck.MainDeck` + `CommandZone` | ✓ Extracted |
| Deck cards format | `[{id: "67890", qty: 4}, ...]` | `cardId` + `quantity` | ✓ Extracted |
| Commander cards | Flagged separately in some fields | `Deck.CommandZone` entries | ✓ Extracted (grouped with main) |

**Game-Level Data (Per Match):**
| Field | Type | Source | Status |
|-------|------|--------|--------|
| `cards_played` | STRING[] | `gameStateMessage.gameObjects[...].grpId` (where `ownerSeatId == player`) | ✓ Extracted |
| `opponent_cards_seen` | STRING[] | `gameStateMessage.gameObjects[...].grpId` (where `ownerSeatId != player`) | ✓ Extracted |

**Metadata:**
| Field | Type | Source | Status |
|-------|------|--------|--------|
| `parsed_at` | TIMESTAMP | Auto-generated at parse time | ✓ Auto-set |

### What Your Parsers DO NOT Extract (Currently Ignored)

These are present in Player.log but **discarded** by current implementation:

| Data | Why It's in Log | Location | Value for ML? |
|------|-----------------|----------|-----------------|
| **Turn-by-turn events** | GRE (Game Rule Engine) messages | `greToClientMessages[].type` | VERY HIGH (phase sequencing) |
| **Card cast/played timing** | Game action sequencing | `gameStateMessage` updates per turn | HIGH (play order matters) |
| **Mana spent per turn** | Mana usage tracking | Game object state changes | MEDIUM (resource tracking) |
| **Hand state per turn** | Cards drawn/discarded | Game object ownership snapshots | HIGH (decision context) |
| **Life totals per turn** | Game state progression | `lifeTotal` in game state | MEDIUM (win conditions) |
| **Stack/ability usage** | Complex interactions | GRE events for stack management | MEDIUM (interaction complexity) |
| **Mulligan count** | Starting hand quality | Likely in auth/game init | LOW-MEDIUM |
| **Play order (first/draw)** | Match advantage | `reservedPlayers[...].playOrder` or similar | MEDIUM (game theory) |
| **Game time duration** | Performance/pacing | Timestamps from log entries | LOW |
| **Sideboard changes** | Limited in Constructed | `Sideboard` zone in deck submission | LOW (mostly Draft/Sealed) |
| **Decksubmit timestamp** | When deck was locked | `EventSetDeckV2` or `DeckSubmit` line timestamp | LOW (meta context) |

---

## Part 2: Arena Tutor Data Enrichment & Features

### What Arena Tutor Provides (Beyond Raw Player.log)

**Arena Tutor** (by Draftsim) reads the same Player.log file but adds:

#### User-Facing Features (Not Programmatically Exported)
| Feature | Data Captured | Source | Export? |
|---------|---------------|--------|---------|
| **Postgame Summary** | Card performance in that match | UI aggregation of `cards_played` + win/loss | NO (closed UI) |
| **Opponent Deck Visualization** | Opponent's cards seen (visual UI) | Same as `opponent_cards_seen` in logs | NO (UI only) |
| **Win Rate by Deck** | Aggregated W-L counts per deck | Meta_snapshots equivalent | PARTIAL (via CSV export) |
| **Win Rate by Card** | Cards with win %, inclusion rate | Aggregation of card presence + results | PARTIAL (via CSV export) |
| **Metagame Identification** | Archetype classification of opponents | AI inference from opponent deck | **NO (proprietary)** |
| **Win Prediction (at deck submission)** | Pre-game win rate estimate | ML model (proprietary) | NO |
| **Achievement Tracking** | Streaks, milestones, etc. | Custom database | NO |
| **Draft AI Recommendations** | Card ratings during draft | External draft bot (proprietary) | NO |
| **In-Game Overlay** | Real-time stats during match | Live parsing during gameplay | NO |

#### Data Actually Available for Export from Arena Tutor
(Based on public documentation and community reports):
- **Deck lists** played (with timestamps)
- **Match results** (W/L/D with date)
- **Opponent names** and colors (if tracked)
- **Event types** played in
- **Win rates** by deck/format/time period
- **Card inclusion/win rates** (aggregated, not per-match)

**NOT AVAILABLE FOR EXPORT:**
- Opponent archetype classifications
- Turn-by-turn game state
- Detailed card timing data
- Mulligan counts
- Play order/first-hand advantage
- Game event sequencing

---

## Part 3: Data Comparison Matrix

### Field-by-Field Comparison

| **Data Field** | **Player.log Direct** | **Arena Tutor Export** | **ML Value** | **Overlap Risk** | **Notes** |
|---|:---:|:---:|:---:|:---:|---|
| **Match ID** | ✓ (via log parsing) | ✓ (via Arena) | HIGH | NONE | Both get same value from Arena |
| **Player Name** | ✓ | ✓ | LOW | NONE | Identifier only |
| **Opponent Name** | ✓ | ✓ | LOW | NONE | Identifier only |
| **Match Result** (W/L/D) | ✓ | ✓ | CRITICAL | **RISK: DUPLICATE** | Both report same outcome; dedup by matchId needed |
| **Format** | ✓ (via eventId) | ✓ | MEDIUM | NONE | Slightly different normalization; Player.log more reliable |
| **Turn Count** | ✓ | Limited* | MEDIUM | MINOR | Turn count reliable in both; Arena Tutor may round |
| **Deck Composition** | ✓ (cards + qty) | ✓ (if exported) | CRITICAL | **RISK: DUPLICATE** | Same deck list but different JSON format |
| **Cards Played (Player)** | ✓ (grpIds) | ✓ (card names in UI) | HIGH | MINOR | Arena Tutor shows names; you have IDs; needs translation |
| **Cards Seen (Opponent)** | ✓ (grpIds) | ✓ (card names in UI) | HIGH | MINOR | Same risk as above |
| **Opponent Archetype** | ✗ | ✓ (classified) | **CRITICAL** | N/A | **ARENA TUTOR UNIQUE** — No way to get from Player.log alone |
| **Opponent Colors** | PARTIAL (infer from seen cards) | ✓ (explicit) | HIGH | NONE | Arena Tutor provides explicit; you infer; Arena Tutor better |
| **Mana Curve (Opponent)** | POSSIBLE (infer from seen cards) | POSSIBLE (infer from archetype) | MEDIUM | NONE | Both require inference; not in raw data |
| **Opening Hand** | ✗ | ✗ | MEDIUM | N/A | Neither captures mulligan count or opening 7 |
| **Mulligan Count** | POSSIBLE (look for hand resets) | ✗ | MEDIUM | N/A | Difficult to extract; neither does reliably |
| **Play Order (First/Draw)** | POSSIBLE (via seat order) | ✗ | MEDIUM | N/A | In gameRoomConfig but not extracted yet |
| **Timestamp (Match Start)** | ✓ (infer from first log line) | ✓ | LOW | NONE | Arena Tutor has explicit timestamps |
| **Timestamp (Match End)** | ✓ (infer from finalMatchResult) | ✓ | LOW | NONE | Arena Tutor likely more precise |
| **Creature Count (Deck)** | POSSIBLE (parse deck_cards) | Possible (post-process) | HIGH | NONE | Simple post-processing from deck |
| **Avg CMC (Deck)** | ✓ (requires card data lookup) | ✓ (lookup from deck) | HIGH | NONE | Needs card reference data |
| **Turn-by-Turn State** | ✓ (in greToClientMessages) | ✗ | **CRITICAL** | N/A | **YOU HAVE THIS, NOT CAPTURING** |
| **Card Cast Ordering** | ✓ (in game events) | ✗ | HIGH | N/A | **YOU HAVE THIS, NOT CAPTURING** |
| **Mana Spent Per Turn** | ✓ (infer from game state) | ✗ | MEDIUM | N/A | Possible but complex extraction |
| **Life Totals Per Turn** | ✓ (in game state snapshots) | ✗ | MEDIUM | N/A | **YOU HAVE THIS, NOT CAPTURING** |
| **Sideboard Changes** | ✓ (in EventSetDeckV2) | ✗ | LOW | N/A | Rare in Constructed; mostly Draft/Sealed |
| **First-Hand Quality Metric** | ✗ | ✗ | MEDIUM-HIGH | N/A | Neither captures; could infer from hand size |
| **Play Decision Confidence** | ✗ | ✗ | MEDIUM | N/A | Not in any log; subjective |

---

## Part 4: Double-Tracking Risk Assessment

### Current Double-Tracking Scenarios

#### Scenario 1: Match Result Duplication
**Risk Level:** HIGH ✓ Can Mitigate

**How It Happens:**
- You import match from Player.log into `arena_parsed_matches`
- User also has Arena Tutor running, which imports same match
- If both write to same table, you have 2 records for 1 match

**Current Safeguard:**
```sql
CREATE TABLE arena_parsed_matches (
  match_id TEXT UNIQUE NOT NULL,  -- ← UNIQUE constraint prevents duplicates
  ...
)
```

**Status:** ✓ **PROTECTED** — The `UNIQUE` constraint on `match_id` prevents insertion of duplicate records. SQLite will reject or ignore the second insert.

**Risk if Merged with match_logs Table:**
If you ever merge `arena_parsed_matches` into the user-created `match_logs` table (migration 2), ensure you:
1. Check for existing `match_id` before inserting
2. Update existing record if only metadata differs
3. Flag conflicts in a `data_source` column

---

#### Scenario 2: Deck Card List Duplication
**Risk Level:** HIGH ✓ Easy to Mitigate

**How It Happens:**
- Player submits deck in Arena
- Player.log captures deck via `EventSetDeckV2` → stored in `arena_parsed_matches.deck_cards`
- Arena Tutor exports same deck to CSV
- If you import both sources into deck library, you have 2 identical decks

**Current Safeguard:**
- `deck_cards` is stored as JSON string in `arena_parsed_matches` table
- No automatic import of these into `decks` table
- Manual deck creation is separate workflow

**Mitigation:**
```sql
-- When linking arena_parsed_matches to decks (migration 13):
ALTER TABLE arena_parsed_matches ADD COLUMN deck_id INTEGER REFERENCES decks(id);
ALTER TABLE arena_parsed_matches ADD COLUMN deck_match_confidence REAL;

-- Implement a deck deduplication function:
-- Hash the deck_cards JSON + commander + format
-- Upsert (insert or skip if hash matches)
```

**Status:** ✓ **MANAGEABLE** — Add a `deck_hash` column to identify identical decklists across sources.

---

#### Scenario 3: Win-Rate Statistics Duplication
**Risk Level:** MEDIUM (if you add Arena Tutor support)

**How It Happens:**
- You aggregate `arena_parsed_matches` into `card_performance` table (migration 5)
- Arena Tutor also tracks card win rates independently
- You try to merge both sources' statistics

**Current Safeguard:**
- Currently only reading Player.log; no Arena Tutor integration yet

**Mitigation if Adding Arena Tutor:**
```sql
-- Add a source_id column to disambiguate:
ALTER TABLE card_performance ADD COLUMN source_type TEXT DEFAULT 'player_log';
-- Values: 'player_log', 'arena_tutor_export', 'merged'

-- Aggregate with UNION:
SELECT card_name, format, SUM(games_played) as total_games,
       WEIGHTED_AVG(rating) as merged_rating
FROM card_performance
WHERE is_training = 1
GROUP BY card_name, format
ORDER BY merged_rating DESC;
```

**Status:** ✓ **PREVENTABLE** — Add source tracking before merging external data.

---

## Part 5: What's Missing for ML Model Training

### Critical Gaps in Current Player.log Extraction

Your ML training table (`ml_training_data`, migration 14) expects:

```sql
deck_snapshot TEXT,              -- ✓ From deck_cards
deck_format TEXT,                -- ✓ From format
deck_colors TEXT,                -- ✓ Infer from deck_cards + card data
game_outcome TEXT,               -- ✓ From result
turn_count INTEGER,              -- ✓ From turns
opponent_archetype TEXT,         -- ✗ NOT IN PLAYER.LOG
opponent_colors TEXT,            -- PARTIAL (infer from cards_seen)
mana_curve TEXT,                 -- ✓ Calculate from deck_cards
avg_cmc REAL,                    -- ✓ Calculate from deck_cards
land_count INTEGER,              -- ✓ Count from deck_cards
creature_count INTEGER,          -- ✓ Count from deck_cards
spell_count INTEGER,             -- ✓ Count from deck_cards
```

### What You SHOULD Be Capturing (But Aren't)

#### Tier 1: High-Value, Medium Effort
| Field | Source | Extraction Method | Impact on Model |
|-------|--------|-------------------|-----------------|
| **Play Order (First/Draw)** | `reservedPlayers[...].playOrder` | Add to match parser | MEDIUM — First player advantage is real |
| **Opening Hand Size** | Infer from initial game state | Count initial hand cards | MEDIUM-LOW — Mulligan correlates with outcome |
| **Opponent Deck Size** | Count from `cards_seen` (incomplete!) | If available in game state | LOW — Always ~60-100 |
| **Life Totals (Final)** | `gameInfo.results[...].lifeTotal` | Last game state message | LOW — Always 0 or ≤20 normally |
| **Average Turns** | Already capturing | Normalize to format (avg Standard = 8 turns) | LOW |

#### Tier 2: Critical, High Effort (Requires Turn-by-Turn Reconstruction)
| Field | Source | Extraction Method | Impact on Model |
|-------|--------|-------------------|-----------------|
| **Turn-by-Turn Play Sequence** | `gameStateMessage` per turn | Parse turn deltas | CRITICAL — Sequencing matters for Combo/Control |
| **Mana Spent Per Turn** | Game state CMC tracking | Sum CMC of played cards per turn | HIGH — Tempo analysis |
| **Card Order Played** | Game object order in state | Sort by `objectInstanceId` or timestamp | HIGH — Combo enablement |
| **Mana Screw/Flood** | Infer from land/hand state | Count turns with 0 or >5 mana | MEDIUM — Mana distribution matters |

#### Tier 3: Arena Tutor Only
| Field | How Arena Tutor Gets It | Extraction if Exporting | Impact on Model |
|-------|-------------------------|--------------------------|-----------------|
| **Opponent Archetype** | ML classification (proprietary) | Export CSV/JSON from Arena Tutor | CRITICAL — Matchup data is huge |
| **Opponent Explicit Colors** | Card color inference + naming | Export opponent deck list | HIGH — Color identity affects matchups |
| **Pre-Match Win Prediction** | Arena Tutor's draft AI | Manual export per match | LOW-MEDIUM — Post-hoc analysis only |

---

## Part 6: Recommended Data Pipeline

### Architecture Decision: Single Source vs. Dual Source

#### Option A: Player.log Only (Current Path)
✓ **Pros:**
- No external dependency
- Complete control over parsing
- No licensing/ToS issues
- Turn-by-turn game events available
- Real-time via log watcher

✗ **Cons:**
- Opponent archetype requires custom ML inference
- Opponent colors must be inferred (incomplete data)
- No postgame enrichment from Arena Tutor
- More complex game-event parsing needed

**Best For:** Self-contained system, deep game analysis, privacy-focused

---

#### Option B: Player.log + Arena Tutor Export (Hybrid)
✓ **Pros:**
- Get opponent archetype (reduces ML burden)
- Arena Tutor handles UI/display; you focus on data
- Can validate your parsing against Arena Tutor's import
- Fill gaps in Opponent data
- Community-tested, proven reliable

✗ **Cons:**
- User dependency (Arena Tutor must be running)
- Export format from Arena Tutor unknown (undocumented)
- Potential ToS issues with Draftsim
- Double-tracking requires careful deduplication
- Loss of control over opponent classification logic

**Best For:** User convenience, community tools integration, faster MVP

---

#### Option C: Player.log + Smart Enrichment (RECOMMENDED)
✓ **Pros:**
- Self-contained, no external dependencies
- Capture all available Player.log data (including game events)
- Build custom opponent archetype classifier (fun ML problem!)
- Future-proof: can export Arena Tutor data if needed
- Zero double-tracking risk
- Better for ML training data quality

✗ **Cons:**
- More engineering work upfront
- Need to build archetype classifier
- Opponent color inference is probabilistic

**Best For:** Long-term value, full control, ML research

---

### Recommended Implementation (Option C)

#### Phase 1: Maximize Player.log Extraction (Immediate)

**1. Capture Turn-by-Turn Game State**

Current: Extract only final match data
**New:** Extract per-turn snapshots

```typescript
// In arena-log-reader.ts

interface TurnState {
  turnNumber: number;
  playerSeatId: number;
  cardsInHand: number;
  cardsPlayed: string[];
  manaspent: number;
  lifeTotal: number;
  timestamp: string;
}

// Store in arena_parsed_matches as:
turn_states: TurnState[]  // JSON array

// Example:
[
  { "turnNumber": 1, "playerSeatId": 1, "cardsInHand": 7, "cardsPlayed": ["67890"], "manaSpent": 2, "lifeTotal": 20, "timestamp": "2026-02-05T10:00:01Z" },
  { "turnNumber": 2, "playerSeatId": 2, "cardsInHand": 7, "cardsPlayed": ["99999"], "manaSpent": 3, "lifeTotal": 20, "timestamp": "2026-02-05T10:00:05Z" },
  ...
]
```

**2. Extract Play Order & Mulligan**

```typescript
interface MatchContext {
  // ... existing fields
  playerPlayOrder: 'play' | 'draw';  // From gameRoomConfig
  openingHandSize: number;            // Initial hand count from first game state
  opponentOpeningHandSize: number;
}
```

**3. Add Opponent Deck/Color Inference**

```typescript
// opponent_cards_seen → infer colors
function inferOpponentColors(cardIds: string[]): string {
  const colorSet = new Set<string>();
  for (const cardId of cardIds) {
    const card = cardDatabase.get(cardId);
    if (card?.color_identity) {
      card.color_identity.split('').forEach(c => colorSet.add(c));
    }
  }
  return Array.from(colorSet).sort().join('');
}
```

**4. Schema Migration: Extend `arena_parsed_matches`**

```sql
ALTER TABLE arena_parsed_matches ADD COLUMN turn_states TEXT;        -- JSON
ALTER TABLE arena_parsed_matches ADD COLUMN player_play_order TEXT;  -- 'play' | 'draw'
ALTER TABLE arena_parsed_matches ADD COLUMN opponent_colors TEXT;    -- Inferred from cards_seen
ALTER TABLE arena_parsed_matches ADD COLUMN opening_hand_size INT;
ALTER TABLE arena_parsed_matches ADD COLUMN opponent_opening_hand_size INT;
```

---

#### Phase 2: Build Opponent Archetype Classifier (Week 2-3)

**Goal:** Given `opponent_cards_seen`, predict archetype (Aggro/Midrange/Control/Combo/Ramp)

**Input Data:**
- Cards seen during match
- Opponent deck size estimate
- Turn count (faster = more aggressive)
- Color identity

**Approach:**
1. **Signature Card Detection:** Each archetype has tells
   - Aggro: `Goblin`, `Llanowar Elves`, 1-2 drops
   - Control: `Counterspell`, `Wrath`, draw spells
   - Combo: Tutors, card draw, mana acceleration
   - Midrange: Mix of 2-4 drops
   - Ramp: `Mana Dorks`, `Cultivate`

2. **Card Database Enrichment:** Tag each card with archetype affinity
   ```sql
   ALTER TABLE cards ADD COLUMN archetype_tags TEXT;  -- JSON: {"Aggro": 0.8, "Control": 0.2, ...}
   ```

3. **Classifier Logic:**
   ```typescript
   function classifyOpponentArchetype(cardIds: string[]): string {
     const archetypeScores = {
       Aggro: 0, Midrange: 0, Control: 0, Combo: 0, Ramp: 0
     };

     for (const cardId of cardIds) {
       const card = cardDatabase.get(cardId);
       const tags = JSON.parse(card.archetype_tags || '{}');
       Object.entries(tags).forEach(([arch, score]) => {
         archetypeScores[arch] += score;
       });
     }

     return Object.entries(archetypeScores)
       .sort(([,a], [,b]) => b - a)[0][0];
   }
   ```

4. **Validation:** Compare against Arena Tutor's classification (if user exports data) to tune weights

---

#### Phase 3: Optional Arena Tutor Integration (Future)

**If User Chooses to Import Arena Tutor Data:**

```typescript
// Import Arena Tutor CSV export
async function importArenaTutorMatches(csvPath: string) {
  const rows = await parseCsv(csvPath);

  for (const row of rows) {
    const matchId = row['Match ID'];

    // Check if already in arena_parsed_matches
    const existing = db.query(
      'SELECT id FROM arena_parsed_matches WHERE match_id = ?',
      [matchId]
    );

    if (existing) {
      // Merge: update opponent_archetype if Arena Tutor provided it
      if (row['Opponent Archetype']) {
        db.query(
          'UPDATE arena_parsed_matches SET opponent_archetype = ? WHERE match_id = ?',
          [row['Opponent Archetype'], matchId]
        );
      }
    } else {
      // Insert new match (shouldn't happen if Arena Log Watcher is running)
      insertArenaTutorMatch(row);
    }
  }
}
```

---

## Part 7: Data Quality & Deduplication Strategy

### Deduplication Key

**Primary Key:** `match_id` (unique per Arena match)
**Secondary Key:** `(player_name, opponent_name, format, timestamp)`

```sql
-- Prevent duplicates across any data source
CREATE TABLE arena_parsed_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT UNIQUE NOT NULL,      -- ← Primary dedup key
  player_name TEXT,
  opponent_name TEXT,
  result TEXT,
  format TEXT,
  turns INTEGER,
  deck_cards TEXT,
  cards_played TEXT,
  opponent_cards_seen TEXT,
  opponent_archetype TEXT,            -- NEW: from classifier or Arena Tutor
  opponent_colors TEXT,               -- NEW: inferred or Arena Tutor
  turn_states TEXT,                   -- NEW: game-by-game state
  player_play_order TEXT,             -- NEW: first vs draw
  opening_hand_size INT,              -- NEW
  data_source TEXT DEFAULT 'player_log',  -- Track origin: 'player_log', 'arena_tutor_export', 'hybrid'
  data_quality REAL DEFAULT 1.0,      -- 0-1 confidence score
  parsed_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for fast lookups
CREATE INDEX idx_arena_source ON arena_parsed_matches(data_source, parsed_at);
CREATE INDEX idx_arena_quality ON arena_parsed_matches(data_quality DESC);
```

### Data Quality Scoring

```typescript
function scoreMatchDataQuality(match: ArenaMatch): number {
  let score = 1.0;

  // Penalties for missing data
  if (!match.deckCards) score -= 0.3;           // Critical: can't train without deck
  if (!match.opponentCardsSeen || match.opponentCardsSeen.length < 3) score -= 0.2;  // Incomplete opponent data
  if (match.turns < 2) score -= 0.1;            // Very short game (possible desync)
  if (!match.playerName) score -= 0.1;          // Player ID mismatch risk
  if (match.cardsPlayed.length < match.turns) score -= 0.05;  // Missing game events (possible truncation)

  return Math.max(0, Math.min(1, score));
}

// In ml_training_data, use this score to filter training samples
SELECT * FROM ml_training_data
WHERE (SELECT data_quality FROM arena_parsed_matches WHERE id = arena_match_id) >= 0.8
  AND is_training = 1;
```

---

## Part 8: Migration Path for ML Training

### Current State
- `match_logs` table (user-created, manual entries)
- `arena_parsed_matches` table (auto-captured from Player.log)
- `ml_training_data` table (consolidated, references either source)

### Issue
```sql
ml_training_data has a CHECK constraint:
CONSTRAINT only_one_match CHECK (
  (match_id IS NOT NULL AND arena_match_id IS NULL) OR
  (match_id IS NULL AND arena_match_id IS NOT NULL)
)
```

This prevents linking a single Arena match to both tables. **This is good** — prevents confusion.

### New Rule
**For each match, choose source of truth:**

1. **Auto-captured (Player.log)** → Use `arena_match_id` in `ml_training_data`
2. **Manual entry (match_logs)** → Use `match_id` in `ml_training_data`
3. **Never mix** — One record, one source per match

### Implementation

```typescript
// When creating ml_training_data entry:

async function createTrainingDataFromMatch(
  matchSource: 'arena_log' | 'manual',
  matchOrArenaMatchId: number | string
) {
  const { deck, outcome, turnCount, opponent } =
    matchSource === 'arena_log'
      ? await getArenaMatchData(matchOrArenaMatchId)
      : await getManualMatchData(matchOrArenaMatchId);

  const deckSnapshot = {
    cards: deck.map(c => ({
      name: cardDb.get(c.id).name,
      quantity: c.qty,
      cmc: cardDb.get(c.id).cmc,
      colors: cardDb.get(c.id).color_identity
    })),
    commander: deck.find(c => c.zone === 'commander')?.name || null,
  };

  const trainingRecord = {
    ...(matchSource === 'arena_log'
      ? { arena_match_id: matchOrArenaMatchId, match_id: null }
      : { match_id: matchOrArenaMatchId, arena_match_id: null }
    ),
    deck_snapshot: JSON.stringify(deckSnapshot),
    game_outcome: outcome,
    turn_count: turnCount,
    opponent_colors: opponent.colors || '',
    opponent_archetype: opponent.archetype || 'Unknown',
    // ... other fields
  };

  return db.insert('ml_training_data', trainingRecord);
}
```

---

## Part 9: Summary Table: Data Source Roadmap

| Phase | Component | Source | Status | Effort | Value |
|-------|-----------|--------|--------|--------|-------|
| **Now** | Match results (W/L/D) | Player.log | ✓ Done | 0 | CRITICAL |
| **Now** | Deck composition | Player.log | ✓ Done | 0 | CRITICAL |
| **Now** | Cards played | Player.log | ✓ Done | 0 | HIGH |
| **Now** | Cards seen (opponent) | Player.log | ✓ Done | 0 | HIGH |
| **Phase 1** | Turn-by-turn state | Player.log | TODO | EASY | CRITICAL |
| **Phase 1** | Play order (first/draw) | Player.log | TODO | EASY | MEDIUM |
| **Phase 1** | Opening hand size | Player.log | TODO | EASY | MEDIUM |
| **Phase 1** | Opponent colors (inferred) | Player.log + card DB | TODO | EASY | HIGH |
| **Phase 2** | Opponent archetype | Custom classifier | TODO | MEDIUM | CRITICAL |
| **Phase 2** | Archetype validation | Arena Tutor export (optional) | TODO | EASY | MEDIUM |
| **Phase 3** | Arena Tutor import | Arena Tutor CSV | TODO | MEDIUM | LOW (nice-to-have) |
| **Phase 3** | Mulligan detection | Player.log + heuristics | TODO | HARD | MEDIUM |
| **Future** | Live in-game overlay | (Out of scope) | N/A | HARD | LOW |

---

## Part 10: Immediate Action Items

### For Double-Tracking Prevention (Do This First)
1. ✓ Verify `match_id UNIQUE` constraint is enforced in `arena_parsed_matches`
2. Add `data_source` column to track origin (Player.log vs Arena Tutor)
3. Add `data_quality` score function and column
4. Create `VIEW arena_matches_with_quality` for training data selection

### For ML Data Enrichment (High Impact)
1. **Extract turn states** from `greToClientMessages`
2. **Add opponent color inference** from `opponent_cards_seen`
3. **Build archetype classifier** (signature card detection)
4. **Update ml_training_data** population logic to use new fields

### For Future Integration (Low Priority)
1. Document Arena Tutor export format (if user wants to import)
2. Create import function with deduplication
3. Add archetype validation against Arena Tutor's classification

---

## References & Sources

- [Arena Tutor - MTGA Tracker and Draft Assistant by Draftsim](https://draftsim.com/arenatutor/)
- [Arena Tutor Help and Resources - Draftsim](https://draftsim.com/arenatutor/help/)
- [New to Arena Tutor: Postgame Summary, Achievements, Better Tracker, & More - Draftsim](https://draftsim.com/arena-tutor-version-2-update/)
- [Here's Exactly How to Get Your Match History in MTG Arena - Draftsim](https://draftsim.com/mtg-arena-match-history/)
- [How to Enable Full/Detailed Logging in MTG Arena - Draftsim](https://draftsim.com/enable-detailed-logging-in-mtg-arena/)
- [How to Find Your Win Rate in MTG Arena - Draftsim](https://draftsim.com/mtg-arena-win-rate/)
- [Introducing the Arena Tutor Win Prediction App - Draftsim](https://draftsim.com/win-predictor-methodology-faq/)
- [MTG Arena Tool - MTG Arena deck tracker and statistics manager](https://mtgatool.com/docs/logs)
- [MTGA Pro Tracker: track collection, matches, draft, progress](https://mtgarena.pro/mtga-pro-tracker/)

---

## Appendix: Code Locations

**Current Parser Files:**
- `C:\Users\QuLeR\MTG-deck-builder\src\lib\arena-log-reader.ts` — TypeScript parser (331 lines)
- `C:\Users\QuLeR\MTG-deck-builder\scripts\arena_log_parser.py` — Python parser (576 lines)
- `C:\Users\QuLeR\MTG-deck-builder\electron\arena-log-watcher.ts` — Live file watcher (140 lines)

**Database Schema:**
- `C:\Users\QuLeR\MTG-deck-builder\src\db\schema.ts` — All 14 migrations (450+ lines)
  - Migration 9: `arena_parsed_matches` (table)
  - Migration 14: `ml_training_data` (table with training flags)

**ML Training Data Location:**
- `C:\Users\QuLeR\MTG-deck-builder\ml-training\README.md` — Training setup docs

---

**Document Generated:** 2026-02-05
**Analysis Scope:** Current codebase + 2025 MTG Arena Player.log format + Arena Tutor v2.x capabilities
