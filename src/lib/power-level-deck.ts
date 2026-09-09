/**
 * Pure DB-row -> power-level-input mapping, split out of the API route so it
 * is testable without a database. See power-level-edhpl.ts for the algorithm
 * itself (credit: EDHPowerLevel.com).
 */

import type { PowerLevelCardInput } from './power-level-edhpl';

export interface DeckCardRow {
  name: string;
  quantity: number;
  board: string;
}

/** Per-card metadata resolved from the local `cards` table, keyed by lowercase name. */
export interface CardLookupEntry {
  minPrice: number | null;
  edhrecRank: number | null;
  cmc: number | null;
  typeLine: string;
  layout: string;
  manaCost: string | null;
  oracleText: string | null;
  gameChanger: boolean;
  producedMana: string[] | null;
  colors: string[] | null;
}

export interface BuildPowerLevelInputsResult {
  inputs: PowerLevelCardInput[];
  commanders: string[];
  cardsWithoutPrice: string[];
}

/** Only board zones that count toward power level: commander + main deck. */
const SCORED_BOARDS = new Set(['commander', 'main']);

export function buildPowerLevelInputs(
  cards: DeckCardRow[],
  lookup: Map<string, CardLookupEntry>,
): BuildPowerLevelInputsResult {
  const commanders = cards.filter((c) => c.board === 'commander').map((c) => c.name);
  const cardsWithoutPrice: string[] = [];

  const inputs = cards
    .filter((c) => SCORED_BOARDS.has(c.board))
    .map((c): PowerLevelCardInput => {
      const entry = lookup.get(c.name.toLowerCase());
      if (!entry || entry.minPrice == null) cardsWithoutPrice.push(c.name);
      return {
        name: c.name,
        quantity: c.quantity,
        price: entry?.minPrice ?? null,
        edhrecRank: entry?.edhrecRank ?? null,
        cmc: entry?.cmc ?? null,
        typeLine: entry?.typeLine ?? '',
        layout: entry?.layout ?? '',
        manaCost: entry?.manaCost ?? undefined,
        oracleText: entry?.oracleText ?? null,
        gameChanger: entry?.gameChanger ?? false,
        producedMana: entry?.producedMana ?? undefined,
        colors: entry?.colors ?? undefined,
        reserved: false, // ponytail: no `reserved` column in cards table; RL price penalty never applies.
      };
    });

  return { inputs, commanders, cardsWithoutPrice };
}
