/**
 * Post-Match Statistics Generator.
 *
 * Produces detailed stats after each Arena match by analyzing the final
 * GameStateSnapshot against the submitted deck list.
 *
 * Stats include cards drawn/played/unseen, mana curve hit rate, removal usage,
 * missed land drops, average mana spent per turn, and MVP card detection.
 */

import type { GameStateSnapshot, DeckCardEntry, ResolvedCard } from './game-state-engine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CardEntry {
  grpId: number;
  name: string;
  cmc: number;
  typeLine: string | null;
}

export interface TurnAction {
  turnNumber: number;
  cardsPlayed: CardEntry[];
  landPlayed: boolean;
  manaSpent: number;
}

export interface PostMatchStats {
  /** Cards drawn during the game (by name, in draw order) */
  cardsDrawn: string[];
  /** Cards played from hand to battlefield or stack (by name) */
  cardsPlayed: string[];
  /** Cards in the deck that were never drawn */
  cardsNotSeen: string[];
  /** Fraction of turns where a card matching that turn's CMC was played (0-1) */
  manaCurveHitRate: number;
  /** Number of removal spells cast during the game */
  removalUsed: number;
  /** Number of turns where no land was played */
  landDropsMissed: number;
  /** Average mana spent per turn (total CMC of spells cast / turns elapsed) */
  avgTurnManaSpent: number;
  /** Card that appeared most across played cards (highest play frequency in the game) */
  mvpCard: string | null;
  /** Total turns in the game */
  totalTurns: number;
  /** Final life totals */
  playerLifeFinal: number;
  opponentLifeFinal: number;
  /** Mulligan count */
  mulliganCount: number;
  /** Game result */
  result: 'win' | 'loss';
}

// ── Removal Detection ────────────────────────────────────────────────────────

const REMOVAL_ORACLE_PATTERNS = [
  /destroy target (?!all)(?!each)/i,
  /exile target/i,
  /deals? \d+ damage to (?:target|any target)/i,
  /target creature gets? [+-]\d+\/[+-]\d+/i,
  /return target .* to (?:its|their) owner/i,
  /target player sacrifices/i,
  /fights? target/i,
  /target .* fights?/i,
];

const REMOVAL_NAMES = new Set([
  'swords to plowshares', 'path to exile', 'beast within', 'chaos warp',
  'generous gift', "assassin's trophy", 'anguished unmaking', 'vindicate',
  'abrupt decay', 'fateful absence', 'lightning bolt', 'prismatic ending',
  "kenrith's transformation", 'rabid bite', 'rocky rebuke', 'bushwhack',
  'horrific assault', 'fatal push', 'doom blade', 'terminate',
  'heartless act', 'infernal grasp', 'go for the throat', 'murder',
  'power word kill', 'cut down', 'torch the tower', 'lightning strike',
  'unholy heat', 'leyline binding', 'march of otherworldly light',
]);

function isRemovalCard(card: ResolvedCard | null): boolean {
  if (!card) return false;
  if (REMOVAL_NAMES.has(card.name.toLowerCase())) return true;
  if (!card.oracleText) return false;
  return REMOVAL_ORACLE_PATTERNS.some(p => p.test(card.oracleText!));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isLandType(typeLine: string | null): boolean {
  if (!typeLine) return false;
  return /\bLand\b/i.test(typeLine);
}

/**
 * Resolve a grpId to a CardEntry using the deck list.
 * Returns a minimal entry with name "Unknown" if not found in deck.
 */
function resolveFromDeck(grpId: number, deckList: DeckCardEntry[]): CardEntry {
  const entry = deckList.find(d => d.grpId === grpId);
  if (entry?.card) {
    return {
      grpId,
      name: entry.card.name,
      cmc: entry.card.cmc,
      typeLine: entry.card.typeLine,
    };
  }
  return { grpId, name: `Card #${grpId}`, cmc: 0, typeLine: null };
}

/**
 * Determine which cards were "played" (moved from hand to battlefield or stack).
 * Uses the snapshot's battlefield + graveyard + exile (all zones cards end up
 * after being played) intersected with cards that were drawn.
 *
 * We approximate by looking at drawn cards that are no longer in hand and
 * not still in the library — they were played at some point.
 */
function computeCardsPlayed(
  snapshot: GameStateSnapshot,
): number[] {
  // Cards that were drawn but are no longer in hand = they were played or discarded
  const handSet = new Set(snapshot.hand);
  const played: number[] = [];
  for (const grpId of snapshot.cardsDrawn) {
    if (!handSet.has(grpId)) {
      played.push(grpId);
    }
  }

  // Also include cards on battlefield that came from the opening hand
  // (opening hand cards that aren't in cardsDrawn but are on battlefield)
  const drawnSet = new Set(snapshot.cardsDrawn);
  for (const grpId of snapshot.battlefield) {
    if (!drawnSet.has(grpId)) {
      played.push(grpId);
    }
  }

  return played;
}

/**
 * Build per-turn action timeline from the snapshot.
 * Uses heuristics since we don't have per-turn action logs in the snapshot:
 * - totalTurns from snapshot.turnNumber
 * - Distributes played cards across turns based on CMC
 */
function buildTurnTimeline(
  totalTurns: number,
  playedCards: CardEntry[],
): TurnAction[] {
  if (totalTurns <= 0) return [];

  const turns: TurnAction[] = [];
  for (let t = 1; t <= totalTurns; t++) {
    turns.push({
      turnNumber: t,
      cardsPlayed: [],
      landPlayed: false,
      manaSpent: 0,
    });
  }

  // Distribute cards across turns heuristically:
  // Cards with CMC <= turn number get assigned to the earliest matching turn.
  // This is an approximation — real per-turn data requires telemetry integration.
  const assigned = new Set<number>();
  const sortedCards = [...playedCards].sort((a, b) => a.cmc - b.cmc);

  for (const card of sortedCards) {
    if (isLandType(card.typeLine)) {
      // Assign land to earliest turn without a land drop
      for (const turn of turns) {
        if (!turn.landPlayed) {
          turn.landPlayed = true;
          turn.cardsPlayed.push(card);
          assigned.add(sortedCards.indexOf(card));
          break;
        }
      }
    } else {
      // Assign spell to earliest turn where CMC <= turn number
      const startTurn = Math.max(1, Math.ceil(card.cmc));
      for (let t = startTurn; t <= totalTurns; t++) {
        const turn = turns[t - 1];
        // Allow one land + spells per turn
        const spellsThisTurn = turn.cardsPlayed.filter(c => !isLandType(c.typeLine));
        if (spellsThisTurn.length < 2) { // max 2 spells per turn heuristic
          turn.cardsPlayed.push(card);
          turn.manaSpent += card.cmc;
          break;
        }
      }
    }
  }

  return turns;
}

// ── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generate comprehensive post-match statistics from a game state snapshot.
 *
 * @param snapshot - Final game state snapshot from GameStateEngine
 * @param deckCards - List of card names in the deck (for computing unseen cards)
 * @param result - Match outcome
 */
export function generatePostMatchStats(
  snapshot: GameStateSnapshot,
  deckCards: string[],
  result: 'win' | 'loss',
): PostMatchStats {
  // Use shared turn (both players' turns under one number)
  const totalTurns = Math.ceil(snapshot.turnNumber / 2);

  // ── Cards drawn (by name, in draw order) ──────────────────────────────
  const cardsDrawnNames = snapshot.cardsDrawn.map(
    grpId => resolveFromDeck(grpId, snapshot.deckList).name
  );

  // ── Cards played ──────────────────────────────────────────────────────
  const playedGrpIds = computeCardsPlayed(snapshot);
  const playedEntries = playedGrpIds.map(grpId => resolveFromDeck(grpId, snapshot.deckList));
  const cardsPlayedNames = playedEntries.map(e => e.name);

  // ── Cards not seen ────────────────────────────────────────────────────
  const drawnNameSet = new Set(cardsDrawnNames.map(n => n.toLowerCase()));
  // Also count cards on battlefield from opening hand as "seen"
  const battlefieldNames = snapshot.battlefield.map(
    grpId => resolveFromDeck(grpId, snapshot.deckList).name.toLowerCase()
  );
  const seenSet = new Set(Array.from(drawnNameSet).concat(battlefieldNames));

  const cardsNotSeen = deckCards.filter(
    name => !seenSet.has(name.toLowerCase())
  );

  // ── Mana curve hit rate ───────────────────────────────────────────────
  // % of turns where at least one spell matching that turn's available mana was played
  const turnTimeline = buildTurnTimeline(totalTurns, playedEntries);
  let curveHits = 0;
  for (const turn of turnTimeline) {
    const spells = turn.cardsPlayed.filter(c => !isLandType(c.typeLine));
    // A "curve hit" = played a spell with CMC <= turn number
    const hasOnCurveSpell = spells.some(s => s.cmc > 0 && s.cmc <= turn.turnNumber);
    if (hasOnCurveSpell) curveHits++;
  }
  const manaCurveHitRate = totalTurns > 0 ? curveHits / totalTurns : 0;

  // ── Removal used ──────────────────────────────────────────────────────
  let removalUsed = 0;
  for (const entry of playedEntries) {
    const deckEntry = snapshot.deckList.find(d => d.grpId === entry.grpId);
    if (isRemovalCard(deckEntry?.card ?? null)) {
      removalUsed++;
    }
  }

  // ── Land drops missed ─────────────────────────────────────────────────
  let landDropsMissed = 0;
  for (const turn of turnTimeline) {
    if (!turn.landPlayed && turn.turnNumber <= totalTurns) {
      landDropsMissed++;
    }
  }

  // ── Average mana spent per turn ───────────────────────────────────────
  const totalManaSpent = playedEntries
    .filter(e => !isLandType(e.typeLine))
    .reduce((sum, e) => sum + e.cmc, 0);
  const avgTurnManaSpent = totalTurns > 0
    ? Math.round((totalManaSpent / totalTurns) * 100) / 100
    : 0;

  // ── MVP card ──────────────────────────────────────────────────────────
  // Card that was played most (by name). Ties broken by higher CMC.
  const playCountMap = new Map<string, { count: number; maxCmc: number }>();
  for (const entry of playedEntries) {
    if (isLandType(entry.typeLine)) continue;
    const existing = playCountMap.get(entry.name);
    if (existing) {
      existing.count++;
      existing.maxCmc = Math.max(existing.maxCmc, entry.cmc);
    } else {
      playCountMap.set(entry.name, { count: 1, maxCmc: entry.cmc });
    }
  }

  let mvpCard: string | null = null;
  let maxCount = 0;
  let maxCmc = 0;
  playCountMap.forEach((val, name) => {
    if (val.count > maxCount || (val.count === maxCount && val.maxCmc > maxCmc)) {
      mvpCard = name;
      maxCount = val.count;
      maxCmc = val.maxCmc;
    }
  });

  return {
    cardsDrawn: cardsDrawnNames,
    cardsPlayed: cardsPlayedNames,
    cardsNotSeen,
    manaCurveHitRate,
    removalUsed,
    landDropsMissed,
    avgTurnManaSpent,
    mvpCard,
    totalTurns,
    playerLifeFinal: snapshot.playerLife,
    opponentLifeFinal: snapshot.opponentLife,
    mulliganCount: snapshot.mulliganCount,
    result,
  };
}
