/**
 * Validates AI-generated card claims against local Scryfall data.
 *
 * Detects hallucinations like "Escape Tunnel is a Lesson card" when the
 * card's actual type_line is "Land". If a claim is contradicted by the
 * card's real type/oracle text, the suggestion is rejected.
 */

import type { DbCard } from './types';

export interface ClaimCheckResult {
  /** Whether all type/keyword claims in the reason text are consistent with card data. */
  valid: boolean;
  /** Specific false claims detected, e.g. "claimed 'is a Lesson' but type_line is Land". */
  falseClaims: string[];
}

interface ClaimRule {
  /** Regex matching the claim phrase. Use case-insensitive. */
  pattern: RegExp;
  /** Returns true if the card actually satisfies the claim. */
  satisfies: (card: DbCard) => boolean;
  /** Human-readable description of the claim for reporting. */
  description: string;
}

/**
 * Each rule encodes one fact-checkable assertion the LLM might make.
 * Add new rules here as new hallucination patterns surface.
 */
const CLAIM_RULES: ClaimRule[] = [
  {
    pattern: /\bis\s+(?:a|an)\s+lesson(?:\s+card)?\b/i,
    satisfies: (c) => /\bLesson\b/i.test(c.type_line || ''),
    description: 'is a Lesson',
  },
  {
    pattern: /\bhas\s+flashback\b/i,
    satisfies: (c) =>
      /\bflashback\b/i.test(c.oracle_text || '') ||
      /\bflashback\b/i.test(c.keywords || ''),
    description: 'has flashback',
  },
  {
    pattern: /\bcreates?\s+treasure(?:\s+tokens?)?\b/i,
    satisfies: (c) => /\btreasure\b/i.test(c.oracle_text || ''),
    description: 'creates treasure',
  },
  {
    pattern: /\bis\s+a\s+(?:land\s+)?ramp(?:\s+spell|\s+card)?\b/i,
    satisfies: (c) => {
      const t = (c.type_line || '').toLowerCase();
      const o = (c.oracle_text || '').toLowerCase();
      // Lands don't count as ramp spells; ramp = produces mana or fetches a land
      if (t.startsWith('land')) return false;
      return /\b(add\s+\{[wubrgc]|search.+library.+for.+land|put.+land.+onto)/i.test(o);
    },
    description: 'is ramp',
  },
  {
    pattern: /\bis\s+(?:a\s+)?board\s+wipe\b/i,
    satisfies: (c) =>
      /\bdestroy\s+all\s+creatures\b|\bexile\s+all\s+creatures\b|each\s+creature\s+gets\s+-x\/-x|deals?\s+\d+\s+damage\s+to\s+each\s+creature/i.test(
        c.oracle_text || ''
      ),
    description: 'is a board wipe',
  },
  {
    pattern: /\bis\s+(?:a\s+)?counterspell\b/i,
    satisfies: (c) => /\bcounter\s+target\b/i.test(c.oracle_text || ''),
    description: 'is a counterspell',
  },
];

/**
 * Validate claims about a specific card in the AI's reason text.
 *
 * @param reasonText The AI-generated reasoning string
 * @param card      The card the claim is about (resolved from DB)
 * @returns         Validation result with any false claims
 */
export function validateCardClaims(
  reasonText: string,
  card: DbCard | null | undefined
): ClaimCheckResult {
  if (!card || !reasonText) {
    return { valid: true, falseClaims: [] };
  }

  const falseClaims: string[] = [];
  for (const rule of CLAIM_RULES) {
    if (rule.pattern.test(reasonText) && !rule.satisfies(card)) {
      falseClaims.push(
        `Claimed "${card.name} ${rule.description}" but card data contradicts this (type: ${card.type_line || '?'})`
      );
    }
  }
  return { valid: falseClaims.length === 0, falseClaims };
}

/**
 * Convenience: check claims for the ADD card in a swap action.
 * AI typically claims things about the card being added, less often about the cut card.
 */
export function validateSwapClaims(
  reason: string,
  addCard: DbCard | null | undefined
): ClaimCheckResult {
  return validateCardClaims(reason, addCard);
}
