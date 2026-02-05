# Arena Data Enrichment: Ready-to-Use Code Snippets

**Purpose:** Copy-paste code to implement missing data extraction

---

## Quick Win #1: Opponent Color Inference (1 hour)

### Step 1: Update TypeScript Type

**File:** `src/lib/arena-log-reader.ts`

```typescript
export interface ArenaMatch {
  matchId: string;
  playerName: string | null;
  opponentName: string | null;
  result: 'win' | 'loss' | 'draw';
  format: string | null;
  turns: number;
  deckCards: Array<{ id: string; qty: number }> | null;
  cardsPlayed: string[];
  opponentCardsSeen: string[];
  opponentColors?: string;  // NEW: e.g., "WUB"
}
```

### Step 2: Add Inference Function

```typescript
/**
 * Infer opponent color identity from cards seen.
 * Returns sorted color string, e.g., "WUB"
 */
function inferOpponentColors(
  cardIds: string[],
  cardDb: Record<string, any>
): string {
  const colorSet = new Set<string>();

  for (const cardId of cardIds) {
    const card = cardDb[cardId];
    if (!card || !card.color_identity) continue;

    // color_identity is a string like "WUB" or "G"
    for (const color of card.color_identity) {
      colorSet.add(color);
    }
  }

  // Return sorted: W, U, B, R, G order
  const colorOrder = ['W', 'U', 'B', 'R', 'G'];
  return colorOrder.filter(c => colorSet.has(c)).join('');
}
```

### Step 3: Call in Match Extraction

In `extractMatches()` function, before finalizing match:

```typescript
// Before pushing to matches array
if (currentMatch) {
  currentMatch.opponentColors = inferOpponentColors(
    Array.from(currentMatch.opponentCards),
    CARD_DATABASE  // Assume this is available
  );

  matches.push({
    matchId: currentMatch.matchId,
    playerName: currentMatch.playerName,
    opponentName: currentMatch.opponentName,
    result: currentMatch.result,
    format: currentMatch.format,
    turns: currentMatch.turns,
    deckCards: currentMatch.deck,
    cardsPlayed: Array.from(currentMatch.cardsPlayed),
    opponentCardsSeen: Array.from(currentMatch.opponentCards),
    opponentColors: currentMatch.opponentColors,  // NEW
  });
}
```

### Step 4: Database Migration

**File:** `src/db/schema.ts`

Add to `MIGRATIONS` array:

```typescript
{
  version: 15,
  name: 'add_opponent_colors',
  sql: `
    ALTER TABLE arena_parsed_matches ADD COLUMN opponent_colors TEXT;
    CREATE INDEX idx_arena_opponent_colors ON arena_parsed_matches(opponent_colors);
  `,
}
```

---

## Quick Win #2: Play Order Extraction (1 hour)

### Step 1: Update Type

**File:** `src/lib/arena-log-reader.ts`

```typescript
interface MatchContext {
  matchId: string;
  playerName: string | null;
  opponentName: string | null;
  playerSeatId: number;
  playerTeamId: number;
  playerPlayOrder: 'play' | 'draw' | null;  // NEW
  format: string | null;
  deck: DeckCard[] | null;
  turns: number;
  cardsPlayed: Set<string>;
  opponentCards: Set<string>;
  result: 'win' | 'loss' | 'draw' | null;
}

export interface ArenaMatch {
  // ... existing fields ...
  playerPlayOrder?: 'play' | 'draw';  // NEW
}
```

### Step 2: Extract from Game Room Config

In `extractMatches()`, when processing `matchGameRoomStateChangedEvent`:

```typescript
if ('matchGameRoomStateChangedEvent' in data) {
  const event = data.matchGameRoomStateChangedEvent as Record<string, unknown>;
  const roomInfo = (event.gameRoomInfo ?? event) as Record<string, unknown>;
  const config = roomInfo.gameRoomConfig as Record<string, unknown> | undefined;

  if (config) {
    const matchId = config.matchId as string | undefined;
    const reservedPlayers = (config.reservedPlayers ?? []) as Array<Record<string, unknown>>;

    if (matchId && !currentMatch) {
      // Initialize match context
      let pName = playerName;
      let oName: string | null = null;
      let pSeatId = 1;
      let pTeamId = 1;
      let pPlayOrder: 'play' | 'draw' | null = null;  // NEW
      let format: string | null = null;

      for (const rp of reservedPlayers) {
        const rpName = rp.playerName as string | undefined;
        const rpSeatId = rp.systemSeatId as number | undefined;
        const rpTeamId = rp.teamId as number | undefined;
        const rpPlayOrder = rp.playOrder as ('play' | 'draw') | undefined;  // NEW
        const rpEventId = rp.eventId as string | undefined;

        if (rpName === playerName || (!playerName && rpSeatId === 1)) {
          pName = rpName ?? pName;
          pSeatId = rpSeatId ?? 1;
          pTeamId = rpTeamId ?? 1;
          pPlayOrder = rpPlayOrder ?? pPlayOrder;  // NEW
          if (rpEventId) format = rpEventId;
        } else {
          oName = rpName ?? null;
        }
      }

      // Fallback: infer from seat order if playOrder not provided
      if (!pPlayOrder) {
        pPlayOrder = pSeatId === 1 ? 'play' : 'draw';
      }

      currentMatch = {
        matchId,
        playerName: pName,
        opponentName: oName,
        playerSeatId: pSeatId,
        playerTeamId: pTeamId,
        playerPlayOrder: pPlayOrder,  // NEW
        format,
        deck: null,
        turns: 0,
        cardsPlayed: new Set(),
        opponentCards: new Set(),
        result: null,
      };
    }
  }
}
```

### Step 3: Return in Match Object

When pushing to matches:

```typescript
matches.push({
  matchId: currentMatch.matchId,
  playerName: currentMatch.playerName,
  opponentName: currentMatch.opponentName,
  result: currentMatch.result,
  format: currentMatch.format,
  turns: currentMatch.turns,
  deckCards: currentMatch.deck,
  cardsPlayed: Array.from(currentMatch.cardsPlayed),
  opponentCardsSeen: Array.from(currentMatch.opponentCards),
  opponentColors: currentMatch.opponentColors,
  playerPlayOrder: currentMatch.playerPlayOrder,  // NEW
});
```

### Step 4: Database Migration

```typescript
{
  version: 16,
  name: 'add_player_play_order',
  sql: `
    ALTER TABLE arena_parsed_matches ADD COLUMN player_play_order TEXT CHECK(player_play_order IN ('play', 'draw'));
    CREATE INDEX idx_arena_play_order ON arena_parsed_matches(player_play_order);
  `,
}
```

---

## Quick Win #3: Opening Hand Size (1 hour)

### Step 1: Update MatchContext

```typescript
interface MatchContext {
  // ... existing fields ...
  openingHandSize: number;
  opponentOpeningHandSize: number;
  firstGameStateReceived: boolean;  // Guard to capture only once
}
```

### Step 2: Extract from First Game State

In `extractMatches()`, in the `greToClientEvent` processing:

```typescript
if ('greToClientEvent' in data) {
  const gre = data.greToClientEvent as Record<string, unknown>;
  const messages = (gre.greToClientMessages ?? []) as Array<Record<string, unknown>>;

  for (const msg of messages) {
    // ... existing code ...

    // Extract opening hand size from first game state
    const gsm = msg.gameStateMessage as Record<string, unknown> | undefined;
    if (gsm && !currentMatch.firstGameStateReceived) {
      const gameObjects = (gsm.gameObjects ?? []) as Array<Record<string, unknown>>;

      let playerHand = 0;
      let opponentHand = 0;

      for (const go of gameObjects) {
        const zone = go.zoneType as string | undefined;
        const ownerSeat = go.ownerSeatId as number | undefined;

        if (zone === 'ZoneType_Hand') {
          if (ownerSeat === currentMatch.playerSeatId) {
            playerHand++;
          } else if (ownerSeat && ownerSeat !== currentMatch.playerSeatId) {
            opponentHand++;
          }
        }
      }

      currentMatch.openingHandSize = playerHand || 7;
      currentMatch.opponentOpeningHandSize = opponentHand || 7;
      currentMatch.firstGameStateReceived = true;
    }

    // ... rest of game state processing ...
  }
}
```

### Step 3: Return in Match Object

```typescript
matches.push({
  // ... other fields ...
  openingHandSize: currentMatch.openingHandSize,      // NEW
  opponentOpeningHandSize: currentMatch.opponentOpeningHandSize,  // NEW
});
```

### Step 4: Database Migration

```typescript
{
  version: 17,
  name: 'add_opening_hand_sizes',
  sql: `
    ALTER TABLE arena_parsed_matches ADD COLUMN opening_hand_size INTEGER;
    ALTER TABLE arena_parsed_matches ADD COLUMN opponent_opening_hand_size INTEGER;
  `,
}
```

---

## Medium Effort: Turn-by-Turn Snapshots (3 hours)

### Step 1: Define Type

```typescript
export interface TurnSnapshot {
  turnNumber: number;
  playerSeatId: number;
  cardsInHand: number;
  cardsPlayed: string[];  // grpIds played THIS turn
  lifeTotal: number;
  timestamp?: string;
}

interface MatchContext {
  // ... existing ...
  turnSnapshots: TurnSnapshot[];
  lastTurnNumber: number;
}
```

### Step 2: Capture Turn Snapshots

In game state message processing:

```typescript
if (gsm) {
  // Turn info
  const turnInfo = gsm.turnInfo as Record<string, unknown> | undefined;
  const t = (turnInfo?.turnNumber as number) || 0;

  // NEW: Capture turn snapshot
  if (t > currentMatch.lastTurnNumber && currentMatch.firstGameStateReceived) {
    const gameObjects = (gsm.gameObjects ?? []) as Array<Record<string, unknown>>;

    let playerHand = 0;
    const cardsPlayedThisTurn: string[] = [];
    let playerLife = 20;

    for (const go of gameObjects) {
      const grpId = String(go.grpId);
      const zone = go.zoneType as string | undefined;
      const ownerSeat = go.ownerSeatId as number | undefined;
      const life = go.lifeTotal as number | undefined;

      if (ownerSeat === currentMatch.playerSeatId) {
        if (zone === 'ZoneType_Hand') playerHand++;
        if (life) playerLife = life;

        // Track cards newly played (not in hand/deck/graveyard)
        if (
          zone &&
          !['ZoneType_Hand', 'ZoneType_Deck', 'ZoneType_Graveyard', 'ZoneType_Library'].includes(zone) &&
          !currentMatch.cardsPlayed.has(grpId)
        ) {
          cardsPlayedThisTurn.push(grpId);
        }
      }
    }

    currentMatch.turnSnapshots.push({
      turnNumber: t,
      playerSeatId: currentMatch.playerSeatId,
      cardsInHand: playerHand,
      cardsPlayed: cardsPlayedThisTurn,
      lifeTotal: playerLife,
    });

    currentMatch.lastTurnNumber = t;
  }

  // ... rest of game state processing ...
}
```

### Step 3: Serialize and Store

```typescript
matches.push({
  // ... other fields ...
  turnSnapshots: JSON.stringify(currentMatch.turnSnapshots),  // NEW
});
```

### Step 4: Database Migration

```typescript
{
  version: 18,
  name: 'add_turn_snapshots',
  sql: `
    ALTER TABLE arena_parsed_matches ADD COLUMN turn_snapshots TEXT;
  `,
}
```

### Step 5: Query Example

```sql
-- Get turn-by-turn hand progression
SELECT
  match_id,
  JSON_EXTRACT(turn_snapshots, '$[*].turnNumber') as turns,
  JSON_EXTRACT(turn_snapshots, '$[*].cardsInHand') as hand_sizes
FROM arena_parsed_matches
WHERE turn_snapshots IS NOT NULL
LIMIT 1;
```

---

## Advanced: Archetype Classifier (4 hours)

### Step 1: Create New File

**File:** `src/lib/opponent-archetype.ts`

```typescript
export interface ArchetypeScore {
  archetype: 'Aggro' | 'Midrange' | 'Control' | 'Combo' | 'Ramp' | 'Unknown';
  confidence: number;  // 0-1
  scores: Record<string, number>;
}

const SIGNATURE_CARDS: Record<string, string[]> = {
  Aggro: [
    '67890',   // Example: Goblin Leaders
    '67891',   // Example: 1-drops
    '67892',   // Example: Haste creatures
  ],
  Control: [
    '99001',   // Example: Counterspell
    '99002',   // Example: Wrath effects
    '99003',   // Example: Card draw
  ],
  Midrange: [
    '77001',   // Example: 4-mana creatures
    '77002',   // Example: Value creatures
  ],
  Combo: [
    '88001',   // Example: Tutors
    '88002',   // Example: Infinite loops
    '88003',   // Example: Card draw
  ],
  Ramp: [
    '55001',   // Example: Mana dorks
    '55002',   // Example: Cultivate effects
    '55003',   // Example: Mana rocks
  ],
};

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

  // Primary: use archetype_tags from card database
  for (const cardId of cardIds) {
    const card = cardDb[cardId];
    if (!card) continue;

    const tags = card.archetype_tags
      ? JSON.parse(card.archetype_tags)
      : {};

    for (const [arch, score] of Object.entries(tags)) {
      if (arch in archetypeScores) {
        archetypeScores[arch] += (score as number) || 0;
      }
    }
  }

  // Signature card bonus (x1.5 multiplier)
  for (const cardId of cardIds) {
    for (const [arch, sigCards] of Object.entries(SIGNATURE_CARDS)) {
      if ((sigCards as string[]).includes(cardId)) {
        archetypeScores[arch] *= 1.5;
      }
    }
  }

  // Heuristic: faster games = more aggressive
  // (Use turnCount if available)

  // Normalize scores
  const total = Object.values(archetypeScores).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const arch of Object.keys(archetypeScores)) {
      archetypeScores[arch] /= total;
    }
  }

  // Determine winner
  const entries = Object.entries(archetypeScores);
  if (entries.length === 0) {
    return {
      archetype: 'Unknown',
      confidence: 0,
      scores: archetypeScores,
    };
  }

  const [archetype, score] = entries.sort(([, a], [, b]) => b - a)[0];
  const confidence = score > 0.35 ? score : 0;  // Require >35% to be confident

  return {
    archetype: (archetype as any) || 'Unknown',
    confidence,
    scores: archetypeScores,
  };
}
```

### Step 2: Integrate into Parser

**File:** `src/lib/arena-log-reader.ts`

```typescript
import { classifyOpponentArchetype } from './opponent-archetype';

// In extractMatches(), before finalizing:
if (currentMatch) {
  const classification = classifyOpponentArchetype(
    Array.from(currentMatch.opponentCards),
    CARD_DATABASE
  );

  currentMatch.opponentArchetype = classification.archetype;
  currentMatch.archetypeConfidence = classification.confidence;
}
```

### Step 3: Database Migration

```typescript
{
  version: 19,
  name: 'add_opponent_archetype',
  sql: `
    ALTER TABLE arena_parsed_matches ADD COLUMN opponent_archetype TEXT CHECK(
      opponent_archetype IN ('Aggro', 'Midrange', 'Control', 'Combo', 'Ramp', 'Unknown')
    );
    ALTER TABLE arena_parsed_matches ADD COLUMN archetype_confidence REAL DEFAULT 0;

    CREATE INDEX idx_arena_archetype ON arena_parsed_matches(opponent_archetype);
    CREATE INDEX idx_arena_confidence ON arena_parsed_matches(archetype_confidence DESC);
  `,
}
```

### Step 4: Validation Function

```typescript
// If user exports Arena Tutor data:
export function validateArchetypeClassification(
  yourArchetype: string,
  arenaTutorArchetype: string
): boolean {
  return yourArchetype === arenaTutorArchetype;
}

// Aggregate accuracy:
async function measureClassifierAccuracy(db: Database) {
  const matches = db.prepare(`
    SELECT opponent_archetype, arena_tutor_archetype
    FROM arena_parsed_matches
    WHERE arena_tutor_archetype IS NOT NULL
  `).all();

  const correct = matches.filter(m =>
    validateArchetypeClassification(
      m.opponent_archetype,
      m.arena_tutor_archetype
    )
  ).length;

  console.log(
    `Classifier Accuracy: ${((correct / matches.length) * 100).toFixed(1)}%`
  );
}
```

---

## Testing Each Implementation

### Test Opponent Colors

```bash
sqlite3 data/mtg-deck-builder.db \
  "SELECT opponent_colors, opponent_cards_seen FROM arena_parsed_matches LIMIT 3;"
```

Expected output: `"WUB"`, `"RG"`, etc.

### Test Play Order

```bash
sqlite3 data/mtg-deck-builder.db \
  "SELECT player_play_order, result FROM arena_parsed_matches LIMIT 5;"
```

Expected output: `play`, `draw` values

### Test Opening Hand

```bash
sqlite3 data/mtg-deck-builder.db \
  "SELECT opening_hand_size, opponent_opening_hand_size FROM arena_parsed_matches WHERE opening_hand_size IS NOT NULL LIMIT 3;"
```

Expected output: `7`, `6`, `7` (mulligan shown as smaller number)

### Test Turn Snapshots

```bash
sqlite3 data/mtg-deck-builder.db \
  "SELECT JSON_ARRAY_LENGTH(turn_snapshots) as turn_count FROM arena_parsed_matches WHERE turn_snapshots IS NOT NULL LIMIT 3;"
```

Expected output: Number of turns in match

### Test Archetype Classifier

```bash
sqlite3 data/mtg-deck-builder.db \
  "SELECT opponent_archetype, archetype_confidence FROM arena_parsed_matches ORDER BY archetype_confidence DESC LIMIT 10;"
```

Expected output: Archetypes with confidence scores

---

## Implementation Timeline

**This Week (P0):**
- Opponent Colors (1h)
- Play Order (1h)
- Opening Hand (1h)
- Test all three (1h)
- Commit and review (1h)
- **Total: 5 hours**

**Next Week (P1):**
- Turn Snapshots (3h)
- Archetype Classifier (4h)
- Integration & testing (2h)
- ML training data update (2h)
- **Total: 11 hours**

**Optional (P2):**
- Arena Tutor validation (2h)
- Card cast sequencing (6h)

---

## Commit Messages Template

```bash
# After each implementation:
git add src/lib/arena-log-reader.ts src/db/schema.ts
git commit -m "Extract opponent colors from cards_seen

Add inference function to derive opponent color identity from cards
they played during match. Enables matchup analysis without external
API calls.

- Add opponentColors field to ArenaMatch interface
- Implement inferOpponentColors() function (O(n) complexity)
- Call in extractMatches() before finalizing match
- Add db migration for opponent_colors column
- Tested with sample arena log

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

**Ready to copy-paste and implement!**

See `ARENA_DATA_ENRICHMENT_CHECKLIST.md` for detailed explanation of each step.

