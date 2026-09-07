/**
 * Deck-level tribal type from creature subtypes. Pure — the engine's own
 * detector (`detectTribalTheme` in deck-builder-ai.ts) needs the DB and a
 * commander name; this one works on any resolved list and feeds the synergy
 * graph's `tribalType` context so tribal edges (Krenko ↔ Goblins) are tagged.
 */

export interface TribalCardLike {
  type_line: string | null;
  quantity: number;
}

export interface TribalCommanderLike {
  oracle_text: string | null;
  type_line: string | null;
}

export const MIN_TRIBE_CARDS = 6;
const MIN_TRIBE_CARDS_WHEN_NAMED = 3;
const NON_TRIBE_SUBTYPES = new Set(['legendary', 'token', 'creature', 'artifact', 'enchantment']);

function subtypeCounts(cards: TribalCardLike[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { type_line, quantity } of cards) {
    const typeLine = type_line || '';
    if (!/\bCreature\b/.test(typeLine) || !typeLine.includes('—')) continue;
    const subtypes = typeLine.split('—')[1]?.split('//')[0]?.trim().split(/\s+/) ?? [];
    for (const sub of subtypes) {
      const key = sub.toLowerCase();
      if (!key || NON_TRIBE_SUBTYPES.has(key)) continue;
      counts.set(key, (counts.get(key) || 0) + Math.max(1, quantity));
    }
  }
  return counts;
}

/**
 * The most common creature subtype when it appears on at least MIN_TRIBE_CARDS
 * creatures, or on MIN_TRIBE_CARDS_WHEN_NAMED if the commander's text names it.
 * Returns the capitalised subtype ("Goblin") or null.
 */
export function detectTribalType(commander: TribalCommanderLike, cards: TribalCardLike[]): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [sub, n] of subtypeCounts(cards)) {
    if (n > bestCount) { best = sub; bestCount = n; }
  }
  if (!best) return null;
  const commanderText = `${commander.oracle_text || ''} ${commander.type_line || ''}`.toLowerCase();
  const namedByCommander = new RegExp(`\\b${best}s?\\b`).test(commanderText);
  const threshold = namedByCommander ? MIN_TRIBE_CARDS_WHEN_NAMED : MIN_TRIBE_CARDS;
  return bestCount >= threshold ? best.charAt(0).toUpperCase() + best.slice(1) : null;
}
