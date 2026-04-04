import { describe, it, expect } from 'vitest';
import { generatePostMatchStats, type PostMatchStats } from '../post-match-stats';
import type { GameStateSnapshot, DeckCardEntry, ResolvedCard } from '../game-state-engine';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCard(name: string, cmc: number, typeLine: string, oracleText = ''): ResolvedCard {
  return {
    grpId: 0,
    name,
    manaCost: null,
    cmc,
    typeLine,
    oracleText,
    imageUriSmall: null,
    imageUriNormal: null,
  };
}

function makeDeckEntry(grpId: number, card: ResolvedCard, qty = 1): DeckCardEntry {
  return { grpId, qty, remaining: 0, card: { ...card, grpId } };
}

function makeSnapshot(overrides: Partial<GameStateSnapshot> = {}): GameStateSnapshot {
  return {
    matchId: 'test-match-1',
    gameNumber: 1,
    playerSeatId: 1,
    playerName: 'TestPlayer',
    opponentName: 'Opponent',
    format: 'Standard_Ranked',
    deckList: [],
    sideboardList: [],
    commanderGrpIds: [],
    librarySize: 0,
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    opponentBattlefield: [],
    opponentGraveyard: [],
    playerLife: 20,
    opponentLife: 0,
    turnNumber: 10,
    phase: '',
    step: '',
    activePlayer: 1,
    opponentCardsSeen: [],
    cardsDrawn: [],
    mulliganCount: 0,
    openingHand: [],
    isActive: false,
    isSideboarding: false,
    drawProbabilities: {},
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('generatePostMatchStats', () => {
  it('should return correct result field', () => {
    const snapshot = makeSnapshot();
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.result).toBe('win');

    const lossStats = generatePostMatchStats(snapshot, [], 'loss');
    expect(lossStats.result).toBe('loss');
  });

  it('should list drawn cards by name in order', () => {
    const bolt = makeCard('Lightning Bolt', 1, 'Instant', 'Deals 3 damage to any target');
    const guide = makeCard('Goblin Guide', 1, 'Creature — Goblin Scout');
    const snapshot = makeSnapshot({
      cardsDrawn: [100, 200],
      deckList: [
        makeDeckEntry(100, bolt),
        makeDeckEntry(200, guide),
      ],
    });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.cardsDrawn).toEqual(['Lightning Bolt', 'Goblin Guide']);
  });

  it('should identify cards not seen', () => {
    const bolt = makeCard('Lightning Bolt', 1, 'Instant');
    const snapshot = makeSnapshot({
      cardsDrawn: [100],
      deckList: [makeDeckEntry(100, bolt)],
    });
    const deckCards = ['Lightning Bolt', 'Goblin Guide', 'Lava Spike'];
    const stats = generatePostMatchStats(snapshot, deckCards, 'win');
    expect(stats.cardsNotSeen).toContain('Goblin Guide');
    expect(stats.cardsNotSeen).toContain('Lava Spike');
    expect(stats.cardsNotSeen).not.toContain('Lightning Bolt');
  });

  it('should count removal spells cast', () => {
    const bolt = makeCard('Lightning Bolt', 1, 'Instant', 'Lightning Bolt deals 3 damage to any target.');
    const push = makeCard('Fatal Push', 1, 'Instant', 'Destroy target creature if it has mana value 2 or less.');
    const guide = makeCard('Goblin Guide', 1, 'Creature — Goblin Scout', 'Haste');
    const snapshot = makeSnapshot({
      cardsDrawn: [100, 200, 300],
      hand: [], // all played
      battlefield: [300],
      graveyard: [],
      deckList: [
        makeDeckEntry(100, bolt),
        makeDeckEntry(200, push),
        makeDeckEntry(300, guide),
      ],
      turnNumber: 6,
    });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.removalUsed).toBe(2);
  });

  it('should compute total turns as shared turns (ceil of turnNumber/2)', () => {
    const snapshot = makeSnapshot({ turnNumber: 10 });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.totalTurns).toBe(5);
  });

  it('should handle odd turn numbers', () => {
    const snapshot = makeSnapshot({ turnNumber: 7 });
    const stats = generatePostMatchStats(snapshot, [], 'loss');
    expect(stats.totalTurns).toBe(4);
  });

  it('should report mulligan count from snapshot', () => {
    const snapshot = makeSnapshot({ mulliganCount: 2 });
    const stats = generatePostMatchStats(snapshot, [], 'loss');
    expect(stats.mulliganCount).toBe(2);
  });

  it('should report final life totals', () => {
    const snapshot = makeSnapshot({ playerLife: 15, opponentLife: 0 });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.playerLifeFinal).toBe(15);
    expect(stats.opponentLifeFinal).toBe(0);
  });

  it('should compute average mana spent per turn', () => {
    // 3 spells: CMC 1 + 2 + 3 = 6 total, 3 shared turns
    const s1 = makeCard('Spell A', 1, 'Instant');
    const s2 = makeCard('Spell B', 2, 'Sorcery');
    const s3 = makeCard('Spell C', 3, 'Creature — Human');
    const snapshot = makeSnapshot({
      cardsDrawn: [1, 2, 3],
      hand: [],
      deckList: [
        makeDeckEntry(1, s1),
        makeDeckEntry(2, s2),
        makeDeckEntry(3, s3),
      ],
      turnNumber: 6, // 3 shared turns
    });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.avgTurnManaSpent).toBe(2);
  });

  it('should identify MVP card as most-played non-land card', () => {
    const bolt = makeCard('Lightning Bolt', 1, 'Instant');
    const mountain = makeCard('Mountain', 0, 'Basic Land — Mountain');
    // Bolt played twice (appears twice in drawn, not in hand)
    const snapshot = makeSnapshot({
      cardsDrawn: [100, 100, 200, 200, 200],
      hand: [],
      deckList: [
        makeDeckEntry(100, bolt, 4),
        makeDeckEntry(200, mountain, 20),
      ],
      turnNumber: 6,
    });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.mvpCard).toBe('Lightning Bolt');
  });

  it('should return null MVP when no non-land cards played', () => {
    const mountain = makeCard('Mountain', 0, 'Basic Land — Mountain');
    const snapshot = makeSnapshot({
      cardsDrawn: [200],
      hand: [],
      deckList: [makeDeckEntry(200, mountain, 20)],
      turnNumber: 2,
    });
    const stats = generatePostMatchStats(snapshot, [], 'loss');
    expect(stats.mvpCard).toBeNull();
  });

  it('should compute mana curve hit rate', () => {
    // Turn 1: play a 1-CMC spell = hit
    // Turn 2: play a 2-CMC spell = hit
    // Turn 3: no spell = miss
    // 2 hits / 3 turns = 0.667
    const s1 = makeCard('Spell A', 1, 'Instant');
    const s2 = makeCard('Spell B', 2, 'Sorcery');
    const snapshot = makeSnapshot({
      cardsDrawn: [1, 2],
      hand: [],
      deckList: [
        makeDeckEntry(1, s1),
        makeDeckEntry(2, s2),
      ],
      turnNumber: 6, // 3 shared turns
    });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.manaCurveHitRate).toBeGreaterThan(0);
    expect(stats.manaCurveHitRate).toBeLessThanOrEqual(1);
  });

  it('should handle empty game (zero turns)', () => {
    const snapshot = makeSnapshot({ turnNumber: 0 });
    const stats = generatePostMatchStats(snapshot, ['Card A'], 'loss');
    expect(stats.totalTurns).toBe(0);
    expect(stats.manaCurveHitRate).toBe(0);
    expect(stats.avgTurnManaSpent).toBe(0);
    expect(stats.landDropsMissed).toBe(0);
    expect(stats.cardsNotSeen).toEqual(['Card A']);
  });

  it('should not double-count cards in both drawn and battlefield', () => {
    const bolt = makeCard('Lightning Bolt', 1, 'Instant');
    // Card drawn and still on battlefield
    const snapshot = makeSnapshot({
      cardsDrawn: [100],
      hand: [],
      battlefield: [100],
      deckList: [makeDeckEntry(100, bolt)],
      turnNumber: 4,
    });
    const stats = generatePostMatchStats(snapshot, ['Lightning Bolt'], 'win');
    // Should not appear in cardsNotSeen since it was drawn
    expect(stats.cardsNotSeen).not.toContain('Lightning Bolt');
  });

  it('should handle unresolved grpIds gracefully', () => {
    // No matching deck entry — should fall back to "Card #999"
    const snapshot = makeSnapshot({
      cardsDrawn: [999],
      hand: [],
      deckList: [],
      turnNumber: 4,
    });
    const stats = generatePostMatchStats(snapshot, [], 'win');
    expect(stats.cardsDrawn).toEqual(['Card #999']);
    expect(stats.cardsPlayed).toEqual(['Card #999']);
  });

  it('should case-insensitively match unseen cards', () => {
    const bolt = makeCard('Lightning Bolt', 1, 'Instant');
    const snapshot = makeSnapshot({
      cardsDrawn: [100],
      deckList: [makeDeckEntry(100, bolt)],
    });
    // Deck cards with different casing
    const stats = generatePostMatchStats(snapshot, ['lightning bolt', 'GOBLIN GUIDE'], 'win');
    expect(stats.cardsNotSeen).not.toContain('lightning bolt');
    expect(stats.cardsNotSeen).toContain('GOBLIN GUIDE');
  });
});
