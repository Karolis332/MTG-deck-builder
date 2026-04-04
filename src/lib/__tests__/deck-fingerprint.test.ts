import { describe, it, expect } from 'vitest';
import {
  fingerprint,
  matchScore,
  findBestMatch,
  AUTO_LINK_THRESHOLD,
  SUGGEST_THRESHOLD,
  type UserDeck,
} from '../deck-fingerprint';

// ── fingerprint() ─────────────────────────────────────────────────────────

describe('fingerprint', () => {
  it('should normalize card names to lowercase set', () => {
    const result = fingerprint(['Lightning Bolt', 'Counterspell', 'Lightning Bolt']);
    expect(result).toEqual(new Set(['lightning bolt', 'counterspell']));
  });

  it('should handle double-faced cards by taking front face', () => {
    const result = fingerprint(['Fable of the Mirror-Breaker // Reflection of Kiki-Jiki']);
    expect(result).toEqual(new Set(['fable of the mirror-breaker']));
  });

  it('should skip empty and falsy entries', () => {
    const result = fingerprint(['', 'Bolt', '', 'Snap']);
    expect(result).toEqual(new Set(['bolt', 'snap']));
  });

  it('should return empty set for empty input', () => {
    const result = fingerprint([]);
    expect(result.size).toBe(0);
  });

  it('should handle cards with special characters', () => {
    const result = fingerprint(["Lim-Dul's Vault", "Elesh Norn, Grand Cenobite"]);
    expect(result).toEqual(new Set(["lim-dul's vault", 'elesh norn, grand cenobite']));
  });
});

// ── matchScore() ──────────────────────────────────────────────────────────

describe('matchScore', () => {
  it('should return 1.0 for identical sets', () => {
    const a = new Set(['bolt', 'snap', 'force']);
    const b = new Set(['bolt', 'snap', 'force']);
    expect(matchScore(a, b)).toBe(1.0);
  });

  it('should return 0 for disjoint sets', () => {
    const a = new Set(['bolt', 'snap']);
    const b = new Set(['wrath', 'path']);
    expect(matchScore(a, b)).toBe(0);
  });

  it('should return 0 for two empty sets', () => {
    expect(matchScore(new Set(), new Set())).toBe(0);
  });

  it('should return 0 for one empty set', () => {
    const a = new Set(['bolt']);
    expect(matchScore(a, new Set())).toBe(0);
    expect(matchScore(new Set(), a)).toBe(0);
  });

  it('should compute correct Jaccard for partial overlap', () => {
    // observed: {bolt, snap, force} (3 cards)
    // deck: {bolt, snap, path, wrath, brainstorm} (5 cards)
    // intersection = 2 (bolt, snap), union = 6
    const observed = new Set(['bolt', 'snap', 'force']);
    const deck = new Set(['bolt', 'snap', 'path', 'wrath', 'brainstorm']);
    expect(matchScore(observed, deck)).toBeCloseTo(2 / 6, 5);
  });

  it('should handle observed being subset of deck', () => {
    // Typical real scenario: we drew 10 cards from a 60-card deck
    // observed: {a, b, c} all in deck: {a, b, c, d, e, f, g, h, i, j}
    // intersection = 3, union = 10
    const observed = new Set(['a', 'b', 'c']);
    const deck = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
    expect(matchScore(observed, deck)).toBeCloseTo(3 / 10, 5);
  });

  it('should be symmetric', () => {
    const a = new Set(['bolt', 'snap', 'force']);
    const b = new Set(['bolt', 'path', 'wrath']);
    expect(matchScore(a, b)).toBe(matchScore(b, a));
  });
});

// ── findBestMatch() ───────────────────────────────────────────────────────

describe('findBestMatch', () => {
  const burndeck: UserDeck = {
    id: 1,
    name: 'Mono Red Burn',
    cards: [
      'Lightning Bolt', 'Lava Spike', 'Rift Bolt', 'Searing Blaze',
      'Goblin Guide', 'Monastery Swiftspear', 'Eidolon of the Great Revel',
      'Shard Volley', 'Skullcrack', 'Inspiring Vantage',
      'Mountain', 'Mountain', 'Mountain', 'Mountain',
    ],
  };

  const controldeck: UserDeck = {
    id: 2,
    name: 'UW Control',
    cards: [
      'Counterspell', 'Force of Will', 'Brainstorm', 'Swords to Plowshares',
      'Jace, the Mind Sculptor', 'Supreme Verdict', 'Snapcaster Mage',
      'Flooded Strand', 'Hallowed Fountain', 'Island', 'Plains',
    ],
  };

  const midrangedeck: UserDeck = {
    id: 3,
    name: 'Jund Midrange',
    cards: [
      'Thoughtseize', 'Fatal Push', "Liliana of the Veil", 'Tarmogoyf',
      'Bloodbraid Elf', "Dark Confidant", 'Verdant Catacombs', 'Overgrown Tomb',
      'Blackcleave Cliffs', 'Raging Ravine', 'Swamp', 'Forest',
    ],
  };

  const allDecks = [burndeck, controldeck, midrangedeck];

  it('should match burn cards to burn deck', () => {
    const observed = ['Lightning Bolt', 'Goblin Guide', 'Lava Spike', 'Mountain', 'Rift Bolt', 'Monastery Swiftspear'];
    const result = findBestMatch(observed, allDecks);
    expect(result).not.toBeNull();
    expect(result!.deckId).toBe(1);
    expect(result!.deckName).toBe('Mono Red Burn');
    expect(result!.score).toBeGreaterThan(AUTO_LINK_THRESHOLD);
  });

  it('should match control cards to control deck', () => {
    const observed = ['Counterspell', 'Force of Will', 'Brainstorm', 'Island', 'Jace, the Mind Sculptor'];
    const result = findBestMatch(observed, allDecks);
    expect(result).not.toBeNull();
    expect(result!.deckId).toBe(2);
    expect(result!.deckName).toBe('UW Control');
    expect(result!.score).toBeGreaterThan(AUTO_LINK_THRESHOLD);
  });

  it('should return null for no matches above threshold', () => {
    const observed = ['Totally Made Up Card', 'Another Fake'];
    const result = findBestMatch(observed, allDecks);
    expect(result).toBeNull();
  });

  it('should return null for empty observed cards', () => {
    expect(findBestMatch([], allDecks)).toBeNull();
  });

  it('should return null for empty deck list', () => {
    expect(findBestMatch(['Lightning Bolt'], [])).toBeNull();
  });

  it('should handle partial observation (10 out of 60 unique cards)', () => {
    // Simulate real scenario: 60-card deck, only ~10 unique cards observed
    const fullDeck: UserDeck = {
      id: 10,
      name: 'Full Deck',
      cards: Array.from({ length: 35 }, (_, i) => `Card ${i + 1}`),
    };
    // Observe 10 cards that are all in the deck
    // intersection=10, union=35 → Jaccard ≈ 0.286
    const observed = Array.from({ length: 10 }, (_, i) => `Card ${i + 1}`);
    const result = findBestMatch(observed, [fullDeck]);
    // 10/35 ≈ 0.286 > SUGGEST_THRESHOLD (0.15) but < AUTO_LINK_THRESHOLD (0.3)
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(SUGGEST_THRESHOLD);
    expect(result!.score).toBeLessThan(AUTO_LINK_THRESHOLD);
  });

  it('should pick the best match among multiple decks', () => {
    // Cards that overlap more with midrange than burn
    const observed = ['Thoughtseize', 'Fatal Push', 'Tarmogoyf', 'Bloodbraid Elf', 'Swamp'];
    const result = findBestMatch(observed, allDecks);
    expect(result).not.toBeNull();
    expect(result!.deckId).toBe(3);
    expect(result!.deckName).toBe('Jund Midrange');
  });

  it('should handle double-faced card names in observed list', () => {
    const deck: UserDeck = {
      id: 5,
      name: 'DFC Deck',
      cards: ['Fable of the Mirror-Breaker', 'Reckoner Bankbuster', 'Mountain'],
    };
    // Arena often sends the full DFC name
    const observed = ['Fable of the Mirror-Breaker // Reflection of Kiki-Jiki', 'Mountain'];
    const result = findBestMatch(observed, [deck]);
    expect(result).not.toBeNull();
    expect(result!.deckId).toBe(5);
  });

  it('should be case-insensitive', () => {
    const deck: UserDeck = {
      id: 6,
      name: 'Case Test',
      cards: ['Lightning Bolt', 'Goblin Guide', 'Mountain'],
    };
    const observed = ['LIGHTNING BOLT', 'goblin guide', 'mountain'];
    const result = findBestMatch(observed, [deck]);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(1.0);
  });

  it('should skip decks with empty card lists', () => {
    const emptyDeck: UserDeck = { id: 7, name: 'Empty', cards: [] };
    const observed = ['Lightning Bolt'];
    const result = findBestMatch(observed, [emptyDeck]);
    expect(result).toBeNull();
  });
});

// ── Threshold sanity checks ───────────────────────────────────────────────

describe('thresholds', () => {
  it('AUTO_LINK should be greater than SUGGEST', () => {
    expect(AUTO_LINK_THRESHOLD).toBeGreaterThan(SUGGEST_THRESHOLD);
  });

  it('SUGGEST should be positive', () => {
    expect(SUGGEST_THRESHOLD).toBeGreaterThan(0);
  });

  it('AUTO_LINK should be less than 1.0 (full match not required)', () => {
    expect(AUTO_LINK_THRESHOLD).toBeLessThan(1.0);
  });
});
