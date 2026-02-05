# Arena Data Enrichment: Implementation Checklist

**Quick Reference for Adding Missing Data Extraction from Player.log**

---

## Status: Double-Tracking Assessment

| Aspect | Status | Action |
|--------|--------|--------|
| **Duplicate Prevention** | ✓ SAFE | `match_id UNIQUE` constraint protects against duplicates |
| **Current Data Coverage** | ~60% of available | Missing turn-by-turn events + opponent metadata |
| **ML Training Readiness** | PARTIAL | Have deck + result; missing archetype + game events |
| **Arena Tutor Conflict** | NO CONFLICT | Both read same Player.log; dedup is automatic |

**TL;DR:** No double-tracking risk. You're extracting only 60% of available Player.log data. Add the missing 40% for ML model quality.

---

## Quick Wins (2-3 Hours Each)

### 1. Add Opponent Color Inference
**File:** `src/lib/arena-log-reader.ts`
**Impact:** Enables matchup analysis without Arena Tutor

```typescript
// Add to ArenaMatch interface
opponentColors?: string;  // e.g., "WUB" (sorted)

// Add function
function inferOpponentColors(cardIds: string[]): string {
  const colorSet = new Set<string>();
  for (const cardId of cardIds) {
    const card = CARD_DATABASE[cardId];  // or fetch from db
    if (card?.color_identity) {
      for (const color of card.color_identity) {
        colorSet.add(color);
      }
    }
  }
  return Array.from(colorSet).sort().join('');
}

// Call in extractMatches() before finalizing match
if (currentMatch) {
  currentMatch.opponentColors = inferOpponentColors(
    Array.from(currentMatch.opponentCards)
  );
}
```

**Schema Change:**
```sql
ALTER TABLE arena_parsed_matches ADD COLUMN opponent_colors TEXT;
```

**Database Update Function:**
```typescript
export async function enrichOpponentColors(db: Database) {
  const matches = db.prepare(
    'SELECT id, opponent_cards_seen FROM arena_parsed_matches WHERE opponent_colors IS NULL'
  ).all();

  for (const match of matches) {
    const cardIds = JSON.parse(match.opponent_cards_seen || '[]');
    const colors = inferOpponentColors(cardIds);
    db.prepare('UPDATE arena_parsed_matches SET opponent_colors = ? WHERE id = ?')
      .run(colors, match.id);
  }
}
```

---

### 2. Extract Play Order (First/Draw)
**File:** `src/lib/arena-log-reader.ts`
**Impact:** Enables win-rate analysis by play advantage

```typescript
// In MatchContext interface
playerPlayOrder: 'play' | 'draw' | null;

// In extractMatches(), when processing matchGameRoomStateChangedEvent
if (config && currentMatch) {
  const reservedPlayers = (config.reservedPlayers ?? []) as Array<Record<string, unknown>>;

  for (const rp of reservedPlayers) {
    const rpName = rp.playerName as string | undefined;
    const rpPlayOrder = rp.playOrder as ('play' | 'draw') | undefined;  // May be in Arena JSON

    if (rpName === playerName && rpPlayOrder) {
      currentMatch.playerPlayOrder = rpPlayOrder;
    }
  }
}
```

**Fallback if Arena doesn't provide `playOrder`:**
```typescript
// Infer from seat ID if first player always has seatId=1
if (currentMatch.playerSeatId === 1) {
  currentMatch.playerPlayOrder = 'play';
} else {
  currentMatch.playerPlayOrder = 'draw';
}
```

**Schema Change:**
```sql
ALTER TABLE arena_parsed_matches ADD COLUMN player_play_order TEXT CHECK(player_play_order IN ('play', 'draw'));
```

---

### 3. Extract Opening Hand Size
**File:** `src/lib/arena-log-reader.ts`
**Impact:** Detect mulligans (correlates with outcome)

```typescript
// In MatchContext interface
openingHandSize: number | null;
opponentOpeningHandSize: number | null;
firstGameStateReceived: boolean;

// In greToClientEvent processing
if (msg.gameStateMessage && !currentMatch.firstGameStateReceived) {
  const gsm = msg.gameStateMessage as Record<string, unknown>;
  const gameObjects = (gsm.gameObjects ?? []) as Array<Record<string, unknown>>;

  // Count cards in each player's hand
  let playerHand = 0, opponentHand = 0;
  for (const go of gameObjects) {
    const zone = go.zoneType as string;
    const ownerSeat = go.ownerSeatId as number;

    if (zone === 'ZoneType_Hand') {
      if (ownerSeat === currentMatch.playerSeatId) {
        playerHand++;
      } else {
        opponentHand++;
      }
    }
  }

  currentMatch.openingHandSize = playerHand || 7;  // Default to 7 if not found
  currentMatch.opponentOpeningHandSize = opponentHand || 7;
  currentMatch.firstGameStateReceived = true;
}
```

**Schema Change:**
```sql
ALTER TABLE arena_parsed_matches ADD COLUMN opening_hand_size INTEGER;
ALTER TABLE arena_parsed_matches ADD COLUMN opponent_opening_hand_size INTEGER;
```

---

## Medium Effort (4-6 Hours Each)

### 4. Extract Turn-by-Turn Game State
**File:** `src/lib/arena-log-reader.ts` (new function)
**Impact:** CRITICAL for ML — enables sequencing analysis

**New Type:**
```typescript
interface TurnSnapshot {
  turnNumber: number;
  phase: string;  // "Main1", "Combat", "Main2", etc. (if available)
  playerSeatId: number;
  cardsInHand: number;
  cardsPlayed: string[];  // grpIds played THIS turn
  lifeTotal: number;
  manaSpent?: number;
  timestamp?: string;
}
```

**Extraction Logic:**
```typescript
// In MatchContext interface
turnSnapshots: TurnSnapshot[] = [];
lastTurnNumber = 0;

// In gameStateMessage processing
if (gsm.turnInfo) {
  const turnNum = gsm.turnInfo.turnNumber as number;

  if (turnNum > currentMatch.lastTurnNumber) {
    // New turn — create snapshot
    const gameObjects = gsm.gameObjects as Record<string, unknown>[];

    // Count hand cards
    let playerHand = 0, opponentHand = 0;
    const cardsPlayedThisTurn: string[] = [];

    for (const go of gameObjects) {
      const grpId = String(go.grpId);
      const zone = go.zoneType as string;
      const ownerSeat = go.ownerSeatId as number;

      if (zone === 'ZoneType_Hand') {
        if (ownerSeat === currentMatch.playerSeatId) playerHand++;
        else opponentHand++;
      }

      // Track newly played cards (zone != hand/deck/graveyard)
      if (zone && !['ZoneType_Hand', 'ZoneType_Deck', 'ZoneType_Graveyard'].includes(zone)) {
        if (ownerSeat === currentMatch.playerSeatId && !currentMatch.cardsPlayed.has(grpId)) {
          cardsPlayedThisTurn.push(grpId);
          currentMatch.cardsPlayed.add(grpId);
        }
      }
    }

    currentMatch.turnSnapshots.push({
      turnNumber: turnNum,
      playerSeatId: currentMatch.playerSeatId,
      cardsInHand: playerHand,
      cardsPlayed: cardsPlayedThisTurn,
      lifeTotal: gsm.lifeTotal ?? 20,
    });

    currentMatch.lastTurnNumber = turnNum;
  }
}
```

**Store in Database:**
```sql
ALTER TABLE arena_parsed_matches ADD COLUMN turn_snapshots TEXT;  -- JSON array

-- JSON Example:
[
  {"turnNumber": 1, "playerSeatId": 1, "cardsInHand": 7, "cardsPlayed": ["67890"], "lifeTotal": 20},
  {"turnNumber": 2, "playerSeatId": 2, "cardsInHand": 7, "cardsPlayed": ["99999"], "lifeTotal": 20}
]
```

**Query for ML Training:**
```sql
SELECT
  id,
  match_id,
  turn_snapshots,
  JSON_EXTRACT(turn_snapshots, '$[*].cardsInHand') as hand_progression,
  JSON_ARRAY_LENGTH(turn_snapshots) as total_turns
FROM arena_parsed_matches
WHERE turn_snapshots IS NOT NULL
LIMIT 10;
```

---

### 5. Build Opponent Archetype Classifier
**File:** `src/lib/opponent-archetype.ts` (new file)
**Impact:** CRITICAL for ML — replaces proprietary Arena Tutor classification

**Step 1: Card Database Enrichment**

```typescript
// Add archetype_tags to cards table
ALTER TABLE cards ADD COLUMN archetype_tags TEXT;  -- JSON

// Example data:
{
  "67890": {"Aggro": 0.9, "Midrange": 0.2, "Control": 0.0, "Combo": 0.1, "Ramp": 0.0},
  "67891": {"Aggro": 0.0, "Midrange": 0.7, "Control": 0.4, "Combo": 0.0, "Ramp": 0.6},
  ...
}
```

**Step 2: Classifier Function**

```typescript
export interface ArchetypeScore {
  archetype: 'Aggro' | 'Midrange' | 'Control' | 'Combo' | 'Ramp' | 'Unknown';
  confidence: number;  // 0-1
  scores: Record<string, number>;
}

export function classifyOpponentArchetype(
  cardIds: string[],
  cardDb: Record<string, any>
): ArchetypeScore {
  const archetypeScores: Record<string, number> = {
    Aggro: 0,
    Midrange: 0,
    Control: 0,
    Combo: 0,
    Ramp: 0,
  };

  // Signature card detection
  const signatureCards = {
    Aggro: [
      '67890',  // Example: Goblin Leaders
      '67891',  // Example: 1-drop creatures
    ],
    Control: [
      '99001',  // Example: Counterspell
      '99002',  // Example: Wrath effects
    ],
    Ramp: [
      '88001',  // Example: Mana Dorks
      '88002',  // Example: Cultivate effects
    ],
    Combo: [
      '77001',  // Example: Tutors
      '77002',  // Example: Infinite loops
    ],
  };

  // Primary: archetype tags from card database
  for (const cardId of cardIds) {
    const card = cardDb[cardId];
    if (!card) continue;

    const tags = card.archetype_tags ? JSON.parse(card.archetype_tags) : {};
    for (const [arch, score] of Object.entries(tags)) {
      archetypeScores[arch] = (archetypeScores[arch] ?? 0) + (score as number);
    }
  }

  // Bonus: signature card matches (x2 multiplier)
  for (const cardId of cardIds) {
    for (const [arch, cards] of Object.entries(signatureCards)) {
      if ((cards as string[]).includes(cardId)) {
        archetypeScores[arch] *= 1.5;
      }
    }
  }

  // Normalize
  const total = Object.values(archetypeScores).reduce((a, b) => a + b, 0);
  for (const arch of Object.keys(archetypeScores)) {
    archetypeScores[arch] /= total || 1;
  }

  // Determine winner
  const [archetype, score] = Object.entries(archetypeScores).sort(([, a], [, b]) => b - a)[0] || ['Unknown', 0];
  const confidence = score > 0.4 ? score : 0;  // Low confidence if scores are balanced

  return {
    archetype: archetype as any,
    confidence,
    scores: archetypeScores,
  };
}
```

**Step 3: Integration in Parser**

```typescript
// In extractMatches(), before finalizing match
if (currentMatch) {
  const classification = classifyOpponentArchetype(
    Array.from(currentMatch.opponentCards),
    CARD_DATABASE
  );
  currentMatch.opponentArchetype = classification.archetype;
  currentMatch.archetypeConfidence = classification.confidence;
}
```

**Step 4: Schema**

```sql
ALTER TABLE arena_parsed_matches ADD COLUMN opponent_archetype TEXT;
ALTER TABLE arena_parsed_matches ADD COLUMN archetype_confidence REAL DEFAULT 0;
```

**Step 5: Validation Against Arena Tutor (Optional)**

```typescript
// If user exports Arena Tutor data, compare classifications
function validateArchetypeClassifier(
  arenaLogArchetype: string,
  arenaTutorArchetype: string
): number {
  // Return match score (0-1)
  return arenaLogArchetype === arenaTutorArchetype ? 1.0 : 0.0;
}
```

---

## Advanced (8+ Hours)

### 6. Extract Card Cast Ordering & Sequencing
**File:** `src/lib/arena-log-reader.ts`
**Impact:** High for Combo/Control analysis; enables play-ordering ML features

**Challenge:** GRE (Game Rule Engine) events come in real-time order, but you need to map them to turn number and game phase.

```typescript
interface CardCastEvent {
  turnNumber: number;
  phase: string;  // "Beginning", "Main1", "Combat", "Main2", "Ending"
  cardId: string;
  owner: 1 | 2;
  timestamp: string;
  orderInTurn: number;
}

// Would need to reconstruct from game events:
// - Each gameStateMessage update marks a new game action
// - Stack events show spell/ability casts
// - Resolve events show when cast resolved
```

**Complexity:** Requires mapping GRE event types to logical game actions. **Skip for now unless critical.**

---

## Implementation Priority Matrix

| Checklist Item | Difficulty | Value | Time | Priority |
|---|:---:|:---:|:---:|:---:|
| **1. Opponent Colors** | Easy | HIGH | 1h | P0 |
| **2. Play Order** | Easy | MEDIUM | 1h | P0 |
| **3. Opening Hand Size** | Easy | MEDIUM | 1h | P0 |
| **4. Turn-by-Turn Snapshots** | Medium | CRITICAL | 3h | P1 |
| **5. Archetype Classifier** | Medium | CRITICAL | 4h | P1 |
| **6. Card Cast Sequencing** | Hard | HIGH | 6h | P2 |

---

## Verification Checklist

After implementing each item:

- [ ] New columns added to schema migration
- [ ] Parser function written and tested
- [ ] Sample data generated and stored
- [ ] Database query validates new data
- [ ] ml_training_data table populates correctly
- [ ] No regressions in existing match parsing

---

## Testing Commands

```bash
# Run parser on sample log
npm run db:seed
node scripts/arena_log_parser.py --sample

# Verify new columns
sqlite3 data/mtg-deck-builder.db ".schema arena_parsed_matches"

# Check populated data
sqlite3 data/mtg-deck-builder.db "SELECT opponent_colors, player_play_order, opening_hand_size FROM arena_parsed_matches LIMIT 5;"

# Validate classifier
npm run test -- src/lib/__tests__/opponent-archetype.test.ts
```

---

**Last Updated:** 2026-02-05
**Next Review:** After completing Phase 1 implementation
