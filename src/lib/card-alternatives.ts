/**
 * Card alternatives — cheaper same-role candidates for one card in a deck
 * context. Pure ranking: no DB/network calls of its own (the caller resolves
 * names and passes rows); nonland scoring reuses local-only signals
 * (per-commander synergy table, global edhrec_rank) — the same cheap inputs
 * buildScoredCandidatePool falls back to when there is no live EDHREC/CF
 * data, kept deliberately local so this stays fast (no network round trip)
 * per the brief's <=300ms budget. Land alternatives defer entirely to
 * land-intelligence.ts's own scorer, which already applies the fetch/
 * conditional-producer discounts.
 */
import { getDb } from '@/lib/db';
import { classifyCard, getPrimaryCategory } from '@/lib/card-classifier';
import { getLegalityKey } from '@/lib/constants';
import { analyzeManaDemands, scoreLandsForDeck } from '@/lib/land-intelligence';
import type { DbCard } from '@/lib/types';

export interface AlternativeCandidate {
  name: string;
  priceUsd: number | null;
  role: string;
  score: number;
  reasons: string[];
  owned: boolean;
}

export interface AlternativesQuery {
  format: string;
  /** Resolved commander (+ partner) rows, if any. */
  commanders: DbCard[];
  /** Resolved deck rows, one entry per copy (main board only matters here). */
  deckCards: DbCard[];
  /** The resolved target card — must be a member of deckCards by name. */
  card: DbCard;
  /** USD price ceiling; unknown price excluded only when this is set. */
  maxPrice?: number;
  limit: number;
  ownedNames: Set<string>;
}

export interface AlternativesResult {
  card: { name: string; priceUsd: number | null; role: string };
  alternatives: AlternativeCandidate[];
}

function isLand(card: DbCard): boolean {
  return (card.type_line || '').split('//')[0].includes('Land');
}

function priceOf(card: DbCard): number | null {
  return card.price_usd != null ? parseFloat(card.price_usd) : null;
}

function colorIdentityOf(card: DbCard): string[] {
  try {
    return card.color_identity ? (JSON.parse(card.color_identity) as string[]) : [];
  } catch {
    return [];
  }
}

function primaryRoleOf(card: DbCard, commanderOracle?: string): string {
  return getPrimaryCategory(
    classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc || 0, commanderOracle)
  );
}

/**
 * Rank cheaper (or just alternative) same-role candidates for `query.card`.
 * Caller is responsible for the "card not in deck" 404 check before calling.
 */
export function findAlternatives(query: AlternativesQuery): AlternativesResult {
  const { format, commanders, deckCards, card, maxPrice, limit, ownedNames } = query;
  const db = getDb();

  const commanderOracle = commanders.length
    ? commanders.map((c) => c.oracle_text || '').join('\n')
    : undefined;
  const role = primaryRoleOf(card, commanderOracle);
  const cardResult = { name: card.name, priceUsd: priceOf(card), role };

  const deckColors = Array.from(
    new Set([...commanders, ...deckCards].flatMap((c) => colorIdentityOf(c)))
  );
  const excludeNames = new Set<string>([
    card.name.toLowerCase(),
    ...commanders.map((c) => c.name.toLowerCase()),
    ...deckCards.map((c) => c.name.toLowerCase()),
  ]);

  const passesPriceCap = (price: number | null): boolean => {
    if (maxPrice == null) return true;
    if (price == null) return false; // unknown price excluded only when a cap is given
    return price <= maxPrice;
  };

  // ── Land alternatives: same-colour-coverage lands via land-intelligence ──
  if (isLand(card)) {
    const manaDemand = analyzeManaDemands(
      deckCards
        .filter((c) => !isLand(c))
        .map((c) => ({ mana_cost: c.mana_cost, quantity: 1 }))
    );
    const scored = scoreLandsForDeck({
      colors: deckColors,
      format,
      manaDemand,
      // land-intelligence's own cap excludes unknown prices too when set;
      // re-filter below anyway so behaviour matches passesPriceCap exactly.
      maxCardPrice: undefined,
    });
    const alternatives: AlternativeCandidate[] = [];
    for (const s of scored) {
      if (excludeNames.has(s.card.name.toLowerCase())) continue;
      const price = priceOf(s.card);
      if (!passesPriceCap(price)) continue;
      alternatives.push({
        name: s.card.name,
        priceUsd: price,
        role: 'land',
        score: s.score,
        reasons: s.reasons,
        owned: ownedNames.has(s.card.name),
      });
      if (alternatives.length >= limit) break;
    }
    return { card: cardResult, alternatives };
  }

  // ── Nonland alternatives: local-only pool + score ────────────────────────
  const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter((c) => !deckColors.includes(c));
  const colorExcludeFilter = excludeColors.map((c) => `c.color_identity NOT LIKE '%${c}%'`).join(' AND ');
  const legalityFilter = format && format !== '1v1'
    ? `AND json_extract(c.legalities, '$.${getLegalityKey(format)}') IN ('legal', 'restricted')`
    : '';

  const pool = db.prepare(`
    SELECT DISTINCT c.* FROM cards c
    WHERE (c.type_line NOT LIKE '%Land%' OR c.type_line LIKE '%//%')
    AND c.type_line != 'Card' AND c.type_line NOT LIKE 'Card //%'
    ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
    ${legalityFilter}
    ORDER BY c.edhrec_rank ASC NULLS LAST
    LIMIT 500
  `).all() as DbCard[];

  const commanderNamesLC = new Set(commanders.map((c) => c.name.toLowerCase()));
  let synergyMap = new Map<string, { synergy_score: number; inclusion_rate: number }>();
  if (commanders.length) {
    try {
      const rows = db.prepare(
        `SELECT card_name, synergy_score, inclusion_rate FROM commander_synergies
         WHERE commander_name = ? COLLATE NOCASE`
      ).all(commanders[0].name) as Array<{ card_name: string; synergy_score: number; inclusion_rate: number }>;
      synergyMap = new Map(rows.map((r) => [r.card_name, r]));
    } catch {
      // table may not exist — fall back to edhrec_rank only
    }
  }

  const candidates: AlternativeCandidate[] = [];
  for (const candidate of pool) {
    const nameLC = candidate.name.toLowerCase();
    if (excludeNames.has(nameLC) || commanderNamesLC.has(nameLC)) continue;
    if (primaryRoleOf(candidate, commanderOracle) !== role) continue;

    const price = priceOf(candidate);
    if (!passesPriceCap(price)) continue;

    const reasons: string[] = [];
    let score = 0;
    const synergy = synergyMap.get(candidate.name);
    if (synergy) {
      score += Math.max(0, (synergy.inclusion_rate || 0)) * 70;
      score += Math.max(0, (synergy.synergy_score || 0)) * 30;
      if (synergy.inclusion_rate >= 0.25) reasons.push(`in ${Math.round(synergy.inclusion_rate * 100)}% of ${commanders[0].name} decks`);
    } else if (candidate.edhrec_rank != null) {
      score += Math.max(0, 50 - candidate.edhrec_rank / 400);
      reasons.push('EDHREC-ranked staple');
    }
    if (price != null && cardResult.priceUsd != null && price < cardResult.priceUsd) {
      reasons.push(`cheaper: $${price.toFixed(2)} vs $${cardResult.priceUsd.toFixed(2)}`);
    }
    if (!reasons.length) reasons.push(`same-role (${role}) candidate`);

    candidates.push({
      name: candidate.name,
      priceUsd: price,
      role,
      score: Math.round(score * 100) / 100,
      reasons,
      owned: ownedNames.has(candidate.name),
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return { card: cardResult, alternatives: candidates.slice(0, limit) };
}
