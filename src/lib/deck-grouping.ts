/**
 * Pure role-grouping for the deck-list role view. Extracted from deck-list.tsx so it's
 * independently testable — the rule is a one-liner (role_override ?? auto-classified primary)
 * but the classification call has enough inputs (name/oracle/type/cmc/commander) that a
 * component-level test would be awkward to set up.
 */
import { classifyCard, getPrimaryCategory, type CardCategory } from './card-classifier';

export interface RoleGroupableEntry {
  role_override?: string | null;
  card: {
    name: string;
    oracle_text: string | null;
    type_line: string;
    cmc: number;
  };
}

/**
 * Groups entries by role: a manual role_override wins outright (cast to CardCategory —
 * the value only ever comes from a role chip/drop populated from CATEGORY_LABELS keys),
 * otherwise falls back to the auto-classified primary category.
 */
export function groupByRole<T extends RoleGroupableEntry>(
  entries: T[],
  commanderOracleText?: string
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const entry of entries) {
    let role: CardCategory;
    if (entry.role_override) {
      role = entry.role_override as CardCategory;
    } else {
      const categories = classifyCard(
        entry.card.name,
        entry.card.oracle_text || '',
        entry.card.type_line,
        entry.card.cmc,
        commanderOracleText
      );
      role = getPrimaryCategory(categories);
    }
    if (!groups[role]) groups[role] = [];
    groups[role].push(entry);
  }
  return groups;
}
