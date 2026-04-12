# Coding Conventions

**Analysis Date:** 2026-04-12

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `CardDetailModal`, `DeckList`)
- Utilities/helpers: camelCase (e.g., `arena-parser.ts`, `grp-id-resolver.ts`)
- Test files: suffix with `.test.ts` or `.spec.ts` (e.g., `utils.test.ts`)
- API routes: lowercase, kebab-case (e.g., `/api/ai-suggest/apply/route.ts`)

**Functions:**
- camelCase exclusively: `parseArenaExport()`, `validateDeck()`, `generateSideboardGuide()`
- Getter/accessor functions use `get` prefix: `getDb()`, `getCachedGuides()`
- Setup/teardown functions use descriptive names: `setupDb()`, `teardownDb()`, `setupTestDb()`

**Variables:**
- camelCase: `playerLife`, `opponentName`, `deckCards`
- Constants: UPPER_SNAKE_CASE: `MANA_COLORS`, `FORMAT_LABELS`, `RARITY_COLORS`
- Private/internal: underscore prefix (e.g., `_db` for global singleton)
- Boolean flags: `is*`, `has*`, `can*` prefix: `isActive`, `hasMore`, `canDraw`

**Types:**
- Interfaces: PascalCase, descriptive nouns: `DbCard`, `ScryfallCard`, `ValidationIssue`, `SideboardPlan`
- Type aliases: PascalCase: `CardIdentifier`, `ArenaImportLine`
- Database column names: snake_case (e.g., `image_uri_normal`, `type_line`, `oracle_text`)
- Generic type parameters: single uppercase letters (T, K, V) or descriptive PascalCase

## Code Style

**Formatting:**
- 2-space indentation (enforced across entire codebase)
- Line length: no hard limit enforced, but aim for readability
- Trailing commas in multiline objects/arrays (ES5 convention)
- Space before opening brace in function definitions: `function foo() {`

**Linting:**
- ESLint: configured via `next lint` with "next/core-web-vitals" preset (`.eslintrc.json`)
- No Prettier config found — formatting is freestyle but must be valid TypeScript/TSX
- Key rules: no unused variables, proper module imports

**Type Strictness:**
- TypeScript strict mode enabled: `"strict": true` in `tsconfig.json`
- All non-primitive types must be explicitly typed
- Use `as unknown as Type` pattern for type assertions when crossing boundaries (e.g., database rows)
- Function parameters always typed; return types optional for simple functions but recommended for exported APIs

## Import Organization

**Order:**
1. External libraries (Node.js, npm packages): `import Database from 'better-sqlite3'`, `import { NextRequest } from 'next/server'`
2. Relative imports from `@/*` alias: `import { cn } from '@/lib/utils'`, `import { MIGRATIONS } from '@/db/schema'`
3. Type imports: `import type { DbCard } from '@/lib/types'`, `import type { SideboardPlan } from '../sideboard-guide'`

**Path Aliases:**
- `@/*` → `./src/*` (defined in `tsconfig.json` and `vitest.config.ts`)
- All imports from `src/` must use alias, not relative paths

**Module organization:**
- Barrel files not used; direct imports encouraged
- Type imports separated from value imports on own line

## Error Handling

**Patterns:**
- API routes: wrap main logic in try/catch, return `NextResponse.json({ error: string }, { status: number })`
  ```typescript
  try {
    // logic
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
  ```
- Validation: use Zod schemas with `safeParse()`, return validation errors before processing
  ```typescript
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  ```
- Database operations: parameterized queries always, never string interpolation
- Async/await: preferred over `.then()` chains
- No silent failures: log and propagate errors, or handle explicitly

**User-facing errors:**
- Validation errors: descriptive messages from Zod schema
- HTTP status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)
- Server-side errors: log full context, return generic "Operation failed" to client

## Logging

**Framework:** `console` methods (no logging library currently in use)

**Patterns:**
- Development: minimal logging; use debugger instead
- Production errors: Log to stderr with full error context (message, stack, relevant data)
- Performance: no logging in hot paths
- Example: `console.error('Failed to resolve grpId', grpId, error);`

## Comments

**When to Comment:**
- Complex regex patterns: inline comment explaining what it matches
- Database query logic: explain intent, especially for joins/aggregations
- Game-specific rules: document card mechanics or format restrictions
- Non-obvious algorithms: explain the approach (e.g., Jaccard similarity for deck fingerprinting)

**JSDoc/TSDoc:**
- Used for exported functions and complex types
- Format: `/** Docstring here */` above definition
- Example:
  ```typescript
  /**
   * Resolve a card name through the alias table.
   * If the name has an alias (e.g., "Cam and Farrik" -> "Hobgoblin"),
   * returns the canonical name. Otherwise returns the original name.
   */
  export function resolveCardAlias(name: string): string { ... }
  ```

**Block Comments:**
- Section dividers: `// ── Section Name ────────────────────────────`
- Setup/teardown boundaries: `// ── Setup ────`, `// ── Test Fixtures ────`

## Function Design

**Size:**
- Keep functions under 50 lines (at 50, consider extracting helper)
- Test functions can be longer if test structure is clear
- Getters/setters: 1–5 lines

**Parameters:**
- Maximum 3 positional parameters; use object/record for 4+
- Optional parameters use `?` marker or object spread
- Type all parameters explicitly

**Return Values:**
- Explicitly typed for all exported functions
- Void functions: use for side effects only (logging, state mutations)
- Return error objects (not throw) for expected failures in computation functions
- Use union types for success/error cases: `{ error: string } | { data: T }`

**Pure Functions:**
- Prefer immutability: don't mutate parameters or external state
- For array/object transformations: use `.map()`, `.filter()`, spread operator
- Database operations are inherently side-effectful; mark clearly in function name

## Module Design

**Exports:**
- Named exports preferred over default exports
- Export types separately: `export type DbCard = { ... }`
- Group related exports: functions first, then types, then constants

**Organization within files:**
- Types/interfaces at top (after imports)
- Constants next
- Helper functions
- Main/exported functions at bottom
- Tests in separate file with `.test.ts` suffix

**Barrel Files:**
- Not used; direct imports are standard

## File Size & Structure

**Target:**
- 200–400 lines typical
- Maximum 800 lines; refactor above that
- Each file should have a single clear responsibility

**Example structure for a feature file** (`src/lib/deck-validation.ts`):
1. Imports (external, then `@/*`)
2. Type definitions
3. Constants
4. Helper functions
5. Main exported functions
6. Error classes (if any)

## Database Conventions

**Connection:**
- Singleton pattern via `globalThis`: `export function getDb(): Database.Database { ... }`
- Ensures single DB instance survives Next.js HMR reloads
- All functions that query DB must call `getDb()` fresh

**Query style:**
- Prepared statements exclusively: `db.prepare('SELECT * FROM cards WHERE id = ?').get(id)`
- Parameter binding: `?` placeholders, pass values as array/args
- Type casts for query results: `as { name: string }[]`
- Transactions for multi-step operations: `db.transaction(() => { ... })()`

**Schema:**
- Migrations in `src/db/schema.ts` as array of versioned SQL objects
- Run automatically on app startup
- Column names: snake_case
- Foreign keys enabled: `db.pragma('foreign_keys = ON')`
- WAL mode: `db.pragma('journal_mode = WAL')`

## Component Conventions (React/TSX)

**Structure:**
- Client components: `'use client'` directive at top
- Props interface: name ending in `Props` (e.g., `CardDetailModalProps`)
- Fragment wrapping: use explicit `<>...</>` or `<>` fragment syntax
- Conditional rendering: ternary or early return

**Styling:**
- Tailwind CSS utility classes exclusively
- `cn()` helper for conditional classes: `cn('base', condition && 'hidden')`
- No inline styles; CSS-in-JS modules not used
- Theme colors via CSS custom properties or Tailwind tokens (dark theme: "Black Grimoire" palette)

**Event handlers:**
- Name: `on*` prefix (e.g., `onClose`, `onAddToDeck`)
- Type: explicitly typed (e.g., `() => void`, `(card: DbCard) => void`)

---

*Convention analysis: 2026-04-12*
