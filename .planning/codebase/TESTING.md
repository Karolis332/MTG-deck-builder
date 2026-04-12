# Testing Patterns

**Analysis Date:** 2026-04-12

## Test Framework

**Runner:**
- Vitest (configured in `vitest.config.ts`)
- Environment: `node`
- Test files: `src/**/*.test.ts`, `tests/**/*.test.ts`
- Test timeout: 15 seconds

**Assertion Library:**
- Vitest built-in `expect()` and matchers

**Run Commands:**
```bash
npm test              # Run all tests once (Vitest run mode)
npm run test:watch   # Watch mode, re-run on file changes
npm run test:python  # Python tests only (pytest)
npm run test:all     # Both Vitest and pytest
```

**Python Testing:**
- Framework: pytest
- Location: `scripts/tests/`
- Run: `py -m pytest scripts/tests/ -v`

## Test File Organization

**Location:**
- Co-located with source: `src/lib/__tests__/` parallel to implementation
- Integration tests: `tests/` at project root
- Pattern: Feature file `src/lib/deck-validation.ts` → Test file `src/lib/__tests__/deck-validation.test.ts`

**Naming:**
- Test files: `{module}.test.ts` or `{module}.spec.ts`
- Test suites: `describe('{feature name}', () => { ... })`
- Individual tests: `it('{assertion}', () => { ... })`

**Count:**
- 18 test files in `src/lib/__tests__/`
- 3 integration test files in `tests/`
- Total: 391 tests across ~21 files

**Structure:**
```
src/lib/__tests__/
├── utils.test.ts          # Utility function tests
├── arena-parser.test.ts   # Arena format parsing
├── deck-validation.test.ts # Format legality
├── game-state-engine.test.ts # Game state tracking
├── grp-id-resolver.test.ts # GrpId resolution pipeline
├── mulligan-advisor.test.ts # Keep/mull heuristics
├── sideboard-guide.test.ts # Sideboard plan generation
└── ... (11 more)

tests/
├── db.test.ts           # Database schema & migrations
├── analytics-api.test.ts # Analytics computations
└── edhrec.test.ts       # EDHREC integration
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ModuleName', () => {
  // Setup fixtures
  let state: SomeState;

  beforeEach(() => {
    state = createInitialState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature/Method Name', () => {
    it('should perform expected behavior', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(...);
    });
  });
});
```

**Patterns:**
- Nested `describe()` blocks organize by method/feature
- `beforeEach()` / `afterEach()` for test isolation
- Arrange-Act-Assert (AAA) pattern within test body
- Clear, descriptive test names: "should {behavior} when {condition}"
- Early returns for null/error cases before main assertions

## Mocking

**Framework:** Vitest `vi` mock utilities

**Patterns - Mock Functions:**
```typescript
const mockFn = vi.fn();
const mockFnWithReturnValue = vi.fn().mockReturnValue(42);

// Assertions on mock
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledOnce();
```

**Patterns - Module Mocks:**
```typescript
vi.mock('@/lib/db', () => ({
  getDb: () => testDb,
}));

// Mock setup BEFORE import of module under test
import { functionThatUsesDb } from '../sideboard-guide';
```

**Patterns - Fetch Mocking:**
```typescript
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url: string | URL | Request) => {
  if (typeof url === 'string' && url.includes('/cards/arena/')) {
    return new Response(JSON.stringify({ ... }), { status: 200 });
  }
  return new Response('Not found', { status: 404 });
};

try {
  // Test code
} finally {
  globalThis.fetch = originalFetch;
}
```

**Patterns - Timer Mocking:**
```typescript
vi.useFakeTimers();
const debounced = debounce(fn, 100);
debounced();
expect(fn).not.toHaveBeenCalled();
vi.advanceTimersByTime(100);
expect(fn).toHaveBeenCalledOnce();
vi.useRealTimers(); // Restore in afterEach
```

**What to Mock:**
- External API calls (Scryfall, EDHREC, etc.)
- `globalThis.fetch` for HTTP testing
- Database calls when testing logic independent of DB
- Timers for debounce/throttle functions

**What NOT to Mock:**
- Database schema/migrations (use test DB instead)
- Core business logic (test real behavior)
- Utility functions (test as-is)
- Framework APIs (Next.js, React)

## Fixtures and Factories

**Test Data Patterns:**

Factory function for building test objects:
```typescript
function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{1}{R}',
    cmc: 2,
    type_line: 'Instant',
    oracle_text: null,
    colors: '["R"]',
    color_identity: '["R"]',
    // ... full default, then apply overrides
    ...overrides,
  };
}
```

Arrays of test data:
```typescript
const sampleDeckCards = [
  { name: 'Lightning Bolt', quantity: 4, board: 'main', typeLine: 'Instant' },
  { name: 'Mountain', quantity: 18, board: 'main', typeLine: 'Basic Land — Mountain' },
];
```

**Location:**
- Fixtures at top of test file or in `__tests__/fixtures/` if shared
- Factories as module-level functions in test file
- Seed data functions for database tests: `function seedTestData() { ... }`

## Database Testing

**Test Database Setup:**
```typescript
let db: Database.Database;
const TEST_DB = path.join(process.cwd(), 'data', 'test-{module}.db');

function setupDb() {
  const dir = path.dirname(TEST_DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  db = new Database(TEST_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run all migrations
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (...)`);
  for (const migration of MIGRATIONS) {
    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO _migrations (...) VALUES (?, ?)').run(...);
    })();
  }
}

function teardownDb() {
  if (db) db.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
}

describe('Database', () => {
  beforeEach(() => setupDb());
  afterEach(() => teardownDb());

  it('creates schema', () => {
    const columns = db.prepare("PRAGMA table_info(cards)").all() as Array<{ name: string }>;
    const names = columns.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('name');
  });
});
```

**Seed Data:**
```typescript
function seedTestData() {
  // Insert cards
  const insertCard = db.prepare(`
    INSERT INTO cards (id, oracle_id, name, cmc, type_line, ...)
    VALUES (?, ?, ?, ?, ?, ...)
  `);
  insertCard.run('c1', 'o1', 'Lightning Bolt', 1, 'Instant', ...);

  // Insert decks
  db.prepare("INSERT INTO decks (id, name, format) VALUES (?, ?, ?)").run(1, 'Red Deck Wins', 'standard');

  // Insert deck_cards
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, ?, ?)").run(1, 'c1', 4, 'main');
}
```

## Coverage

**Requirements:** No explicit coverage target enforced, but aiming for 80%+

**View Coverage:**
```bash
npm test -- --coverage
```

**Current State:**
- 391 tests across 21 files
- Key modules covered: utils, parsers, validators, game engines, database operations
- Gaps: Some UI components untested (client-side), optional scrapers

**Priority for coverage:**
1. Business logic (deck validation, card suggestions, game state) — HIGH
2. API routes — MEDIUM
3. Components — LOWER (rely on integration tests)

## Test Types

**Unit Tests:**
- Scope: Individual functions/classes in isolation
- Location: `src/lib/__tests__/{module}.test.ts`
- Mocking: External APIs, fetch, timers as needed
- Examples:
  - `utils.test.ts` — Tests `cn()`, `formatNumber()`, `slugify()`, etc.
  - `deck-validation.test.ts` — Tests validation rules per format
  - `arena-parser.test.ts` — Tests parsing of Arena export format

**Integration Tests:**
- Scope: Database operations, schema migrations, data flow
- Location: `tests/{feature}.test.ts`
- Mocking: Minimal; use real test DB
- Examples:
  - `db.test.ts` — Tests schema creation, migration application
  - `analytics-api.test.ts` — Tests win rate calculations across tables
  - `edhrec.test.ts` — Tests EDHREC API integration

**E2E Tests:**
- Currently: Not implemented
- Would test: Full user flows (deck creation → save → view → update)
- Candidate framework: Playwright or Cypress

## Common Test Patterns

**Testing Async Functions:**
```typescript
it('should resolve card from API', async () => {
  const resolver = new GrpIdResolver();
  const card = await resolver.resolve(12345);
  expect(card.name).not.toContain('Unknown');
});
```

**Testing Error Conditions:**
```typescript
it('should return Unknown when grpId not found', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Not found', { status: 404 });

  try {
    const card = await resolver.resolve(99999);
    expect(card.name).toContain('Unknown');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

**Testing Stateful Classes:**
```typescript
describe('GameStateEngine', () => {
  let engine: GameStateEngine;

  beforeEach(() => {
    engine = new GameStateEngine();
  });

  it('should start with empty state', () => {
    const state = engine.getState();
    expect(state.matchId).toBeNull();
  });

  it('should update state when event processed', () => {
    engine.processEvent({ type: 'match_start', matchId: 'test-123', ... });
    const state = engine.getState();
    expect(state.matchId).toBe('test-123');
  });
});
```

**Testing Database Transactions:**
```typescript
it('should insert and retrieve card', () => {
  db.prepare(
    'INSERT INTO cards (id, oracle_id, name, cmc, type_line, color_identity, set_code, set_name, collector_number, rarity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run('c1', 'o1', 'Test', 1, 'Instant', '[]', 'TST', 'Test', '1', 'common');

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get('c1') as DbCard;
  expect(card.name).toBe('Test');
});
```

**Testing with Type Assertions:**
```typescript
const result = db.prepare('SELECT COUNT(*) as count FROM _migrations').get() as { count: number };
expect(result.count).toBe(MIGRATIONS.length);

const names = columns.map((c) => c.name);
expect(names).toContain('id');
```

## Debugging Tests

**Run single test file:**
```bash
npx vitest src/lib/__tests__/utils.test.ts
```

**Run single test by name:**
```bash
npx vitest --grep "should parse arena export"
```

**Debug mode:**
```bash
node --inspect-brk ./node_modules/.bin/vitest src/lib/__tests__/utils.test.ts
```

**Common failures:**
- Mock not set up before import: Move `vi.mock()` to top of test file, before any imports
- Database locked: Ensure `db.close()` called in `afterEach()`
- Stale timers: Call `vi.useRealTimers()` in `afterEach()`
- Type assertion errors: Check that test data matches interface shape

---

*Testing analysis: 2026-04-12*
