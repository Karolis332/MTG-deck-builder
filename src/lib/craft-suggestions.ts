/**
 * "What to craft" — the upgrade path from the deck you can build with your
 * collection to the best-possible build of the same commander.
 *
 * Builds the deck twice (ideal = full pool, owned = collection-constrained),
 * diffs them, and returns the unowned cards in the ideal build grouped by
 * Arena wildcard rarity and ranked by their score in the ideal pool — plus a
 * health-delta summary so the user sees what crafting actually unlocks.
 */

import { autoBuildDeck } from './deck-builder-ai';
import type { BuildOptions, BuildResult } from './deck-builder-ai';
import { getDb } from './db';

export interface CraftCard {
  name: string;
  rarity: string;
  score: number;
  role: string;
  cmc: number;
}

export interface CraftPath {
  commander: string;
  format: string;
  idealGrade: string;
  ownedGrade: string;
  totalToCraft: number;
  byRarity: Record<'mythic' | 'rare' | 'uncommon' | 'common', CraftCard[]>;
  /** human-readable lines describing what crafting unlocks */
  healthDelta: string[];
}

const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

function ownedNameSet(userId: number): Set<string> {
  const db = getDb();
  const rows = db.prepare(
    `SELECT DISTINCT c.name FROM collection col JOIN cards c ON col.card_id = c.id WHERE col.user_id = ?`
  ).all(userId) as Array<{ name: string }>;
  const set = new Set<string>();
  for (const r of rows) set.add(r.name.toLowerCase());
  for (const b of BASICS) set.add(b.toLowerCase());
  return set;
}

export async function getCraftPath(
  opts: BuildOptions & { userId: number }
): Promise<CraftPath> {
  const ideal = await autoBuildDeck({ ...opts, useCollection: false, captureComponents: true });
  const owned = await autoBuildDeck({ ...opts, useCollection: true });

  const ownedSet = ownedNameSet(opts.userId);
  const scoreByName = new Map<string, number>();
  for (const p of ideal.scoredPool ?? []) scoreByName.set(p.name, p.score);

  const byRarity: CraftPath['byRarity'] = { mythic: [], rare: [], uncommon: [], common: [] };
  const roleByName = new Map<string, string>();
  for (const r of ideal.reasoning ?? []) {
    if (!roleByName.has(r.cardName)) roleByName.set(r.cardName, r.role.replace(/^arsenal:/, ''));
  }

  for (const entry of ideal.cards) {
    if (entry.board !== 'main') continue;
    const card = entry.card as { name: string; rarity?: string; cmc?: number };
    const front = card.name.split(' // ')[0];
    if (BASICS.has(front)) continue;
    if (ownedSet.has(card.name.toLowerCase()) || ownedSet.has(front.toLowerCase())) continue;
    const rarity = (card.rarity || 'rare').toLowerCase();
    const bucket = rarity === 'mythic' ? 'mythic' : rarity === 'uncommon' ? 'uncommon' : rarity === 'common' ? 'common' : 'rare';
    byRarity[bucket].push({
      name: card.name,
      rarity: bucket,
      score: Math.round(scoreByName.get(card.name) ?? 0),
      role: roleByName.get(card.name) || 'card',
      cmc: card.cmc ?? 0,
    });
  }
  for (const k of Object.keys(byRarity) as Array<keyof typeof byRarity>) {
    byRarity[k].sort((a, b) => b.score - a.score);
  }

  const total = Object.values(byRarity).reduce((s, l) => s + l.length, 0);

  // Health delta — what crafting the upgrades unlocks
  const healthDelta: string[] = [];
  const ih = ideal.health;
  const oh = owned.health;
  if (ih && oh) {
    if (ih.grade !== oh.grade) healthDelta.push(`Deck grade ${oh.grade} → ${ih.grade}`);
    if (oh.tappedRatio - ih.tappedRatio > 0.1) {
      healthDelta.push(`Tapped lands ${Math.round(oh.tappedRatio * 100)}% → ${Math.round(ih.tappedRatio * 100)}%`);
    }
    if (ih.drawEngineCount - oh.drawEngineCount >= 2) {
      healthDelta.push(`Draw engines ${oh.drawEngineCount} → ${ih.drawEngineCount}`);
    }
    for (const color of opts.colors.length ? opts.colors : Object.keys(ih.sourcesByColor)) {
      const d = (ih.sourcesByColor[color] || 0) - (oh.sourcesByColor[color] || 0);
      if (d >= 3) healthDelta.push(`${color} sources ${oh.sourcesByColor[color] || 0} → ${ih.sourcesByColor[color] || 0}`);
    }
  }

  return {
    commander: opts.commanderName || '',
    format: opts.format,
    idealGrade: ideal.health?.grade ?? '?',
    ownedGrade: owned.health?.grade ?? '?',
    totalToCraft: total,
    byRarity,
    healthDelta,
  };
}
