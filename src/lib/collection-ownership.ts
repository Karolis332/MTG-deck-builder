/**
 * Shared collection-ownership lookups used by every builder/analysis path
 * that asks "does this user own this card": the pool query, the land
 * builder, and the commander arsenal. One place, so they can't disagree.
 *
 * Arena rebalances a card under a name prefixed "A-" (e.g. "A-Thran
 * Portal"). Ownership and dedupe treat "A-X" and "X" as the same card —
 * the user owns one iff they own the other.
 */
import type Database from 'better-sqlite3';

export function stripArenaPrefix(name: string): string {
  return name.startsWith('A-') ? name.slice(2) : name;
}

/** SQL CASE expression that strips a leading "A-" from a column/expression, for name-equality joins. */
function normalizedNameExpr(column: string): string {
  return `(CASE WHEN ${column} LIKE 'A-%' THEN substr(${column}, 3) ELSE ${column} END)`;
}

export interface OwnershipFilter {
  userId?: number;
  /** e.g. 'arena' | 'paper' | 'web-build'. Omitted = every source the user owns. */
  source?: string;
}

/**
 * Quantity owned per card name, keyed under every printed-name variant
 * (with or without "A-") that shares a card with an owned entry — so a
 * plain `ownedQty.get(card.name)` finds it whichever name variant the pool
 * card or the collection row used.
 */
export function buildOwnedQtyMap(db: Database.Database, filter: OwnershipFilter): Map<string, number> {
  const ownedQty = new Map<string, number>();
  if (filter.userId === undefined || !Number.isInteger(filter.userId)) return ownedQty;

  const params: Array<number | string> = [filter.userId];
  let sourceFilter = '';
  if (filter.source) {
    sourceFilter = ' AND col.source = ?';
    params.push(filter.source);
  }
  const rows = db.prepare(
    `SELECT ${normalizedNameExpr('c.name')} as norm, SUM(col.quantity) as total
     FROM collection col JOIN cards c ON col.card_id = c.id
     WHERE col.user_id = ?${sourceFilter}
     GROUP BY norm`
  ).all(...params) as Array<{ norm: string; total: number }>;
  if (rows.length === 0) return ownedQty;

  const normTotals = new Map(rows.map((r) => [r.norm, r.total]));
  const placeholders = rows.map(() => '?').join(',');
  const variantRows = db.prepare(
    `SELECT DISTINCT name, ${normalizedNameExpr('name')} as norm FROM cards WHERE ${normalizedNameExpr('name')} IN (${placeholders})`
  ).all(...rows.map((r) => r.norm)) as Array<{ name: string; norm: string }>;
  for (const v of variantRows) {
    ownedQty.set(v.name, normTotals.get(v.norm) ?? 0);
  }
  return ownedQty;
}

/**
 * "Owned" name subquery (A--stripped, always includes basics) for
 * name-equality JOINs. Join against it with
 * `normalizedNameExpr('c.name') = owned.cname` (exported below) so both
 * sides compare stripped names.
 */
export function ownedNamesSubquery(filter: OwnershipFilter): { sql: string; params: Array<number | string> } {
  if (filter.userId === undefined || !Number.isInteger(filter.userId)) {
    return {
      sql: `SELECT 'Plains' AS cname UNION SELECT 'Island' UNION SELECT 'Swamp' UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'`,
      params: [],
    };
  }
  const params: Array<number | string> = [filter.userId];
  let sourceFilter = '';
  if (filter.source) {
    sourceFilter = ' AND col.source = ?';
    params.push(filter.source);
  }
  const sql = `SELECT DISTINCT ${normalizedNameExpr('c.name')} AS cname
    FROM collection col JOIN cards c ON col.card_id = c.id
    WHERE col.user_id = ?${sourceFilter}
    UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp'
    UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'`;
  return { sql, params };
}

/**
 * Same "owned" subquery as {@link ownedNamesSubquery}, but with userId/source
 * inlined as SQL literals instead of `?` placeholders. For splicing into a
 * larger prepared statement that has its own positional params — threading
 * this subquery's params through every such call site isn't worth it.
 * `userId` is validated `Number.isInteger` before inlining; `source` is
 * quote-escaped.
 */
export function ownedNamesSubqueryInline(filter: OwnershipFilter): string {
  if (filter.userId === undefined || !Number.isInteger(filter.userId)) {
    return `SELECT 'Plains' AS cname UNION SELECT 'Island' UNION SELECT 'Swamp' UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'`;
  }
  const sourceFilter = filter.source ? ` AND col.source = '${filter.source.replace(/'/g, "''")}'` : '';
  return `SELECT DISTINCT ${normalizedNameExpr('c.name')} AS cname
    FROM collection col JOIN cards c ON col.card_id = c.id
    WHERE col.user_id = ${filter.userId}${sourceFilter}
    UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp'
    UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'`;
}

export { normalizedNameExpr };
