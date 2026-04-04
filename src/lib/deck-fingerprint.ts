/**
 * Deck Fingerprinting — matches observed in-game cards to saved decks.
 *
 * Uses Jaccard similarity to compare the set of cards drawn/played during
 * a match against each saved deck's card list. Works with partial observation
 * (typically only 10-20 cards seen out of 60-100) by using lower thresholds.
 *
 * Thresholds:
 *   AUTO_LINK  (0.3) — high confidence, link without prompting
 *   SUGGEST    (0.15) — moderate confidence, suggest to user for confirmation
 */

// ── Thresholds ────────────────────────────────────────────────────────────

/** Auto-link to deck without user prompt (Jaccard >= 0.3) */
export const AUTO_LINK_THRESHOLD = 0.3;

/** Suggest deck but ask user to confirm (Jaccard >= 0.15) */
export const SUGGEST_THRESHOLD = 0.15;

/** Minimum observed cards before running fingerprint (avoids noise from 1-2 cards) */
export const MIN_OBSERVED_CARDS = 5;

// ── Types ─────────────────────────────────────────────────────────────────

export interface UserDeck {
  id: number;
  name: string;
  cards: string[];
}

export interface FingerprintMatch {
  deckId: number;
  deckName: string;
  score: number;
}

// ── Core Functions ────────────────────────────────────────────────────────

/**
 * Normalize card names to a lowercase Set for comparison.
 * Handles double-faced cards by splitting on " // " and taking the front face.
 */
export function fingerprint(cardNames: string[]): Set<string> {
  const result = new Set<string>();
  for (const name of cardNames) {
    if (!name) continue;
    // Double-faced cards: "Fire // Ice" → "fire"
    const normalized = name.split(' // ')[0].trim().toLowerCase();
    if (normalized) {
      result.add(normalized);
    }
  }
  return result;
}

/**
 * Jaccard similarity: |intersection| / |union|.
 * Returns 0 if both sets are empty.
 */
export function matchScore(observed: Set<string>, deck: Set<string>): number {
  if (observed.size === 0 && deck.size === 0) return 0;

  let intersection = 0;
  // Iterate the smaller set for efficiency
  const smaller = observed.size <= deck.size ? observed : deck;
  const larger = observed.size <= deck.size ? deck : observed;

  smaller.forEach(card => {
    if (larger.has(card)) intersection++;
  });

  const union = observed.size + deck.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

/**
 * Find the best matching deck for a set of observed card names.
 *
 * Returns the highest-scoring deck above SUGGEST_THRESHOLD, or null.
 * Caller should check score against AUTO_LINK_THRESHOLD vs SUGGEST_THRESHOLD
 * to decide whether to auto-link or prompt the user.
 */
export function findBestMatch(
  observedCards: string[],
  userDecks: UserDeck[]
): FingerprintMatch | null {
  if (observedCards.length === 0 || userDecks.length === 0) return null;

  const observedSet = fingerprint(observedCards);
  if (observedSet.size === 0) return null;

  let best: FingerprintMatch | null = null;

  for (const deck of userDecks) {
    const deckSet = fingerprint(deck.cards);
    if (deckSet.size === 0) continue;

    const score = matchScore(observedSet, deckSet);

    if (score >= SUGGEST_THRESHOLD && (!best || score > best.score)) {
      best = {
        deckId: deck.id,
        deckName: deck.name,
        score,
      };
    }
  }

  return best;
}
