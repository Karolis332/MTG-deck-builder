/**
 * Highlight Detector — identifies clip-worthy moments from live game state.
 *
 * Consumes ArenaGameEvents (via ArenaLogWatcher) and emits timestamped
 * highlight markers. Each highlight has a type, severity (1-10), a
 * human-readable caption, and a time window for clip extraction.
 *
 * Highlight categories:
 *   - life_swing: Large life delta in a single turn (combat blowout, burn)
 *   - board_wipe: Mass removal clearing 3+ creatures
 *   - spell_flurry: 3+ spells cast in a single turn (storm/combo)
 *   - lethal_turn: The turn that kills the opponent
 *   - comeback: Player recovers from <5 life to win or stabilize
 *   - close_game: Final life totals within 5 of each other
 *   - commander_kill: Commander damage lethal (21+)
 *   - topdeck: Card drawn then immediately played when at 0-1 cards in hand
 */

import type { GameStateSnapshot } from './game-state-engine';
import type { ArenaGameEvent } from './arena-game-events';

// ── Types ────────────────────────────────────────────────────────────────────

export type HighlightType =
  | 'life_swing'
  | 'board_wipe'
  | 'spell_flurry'
  | 'lethal_turn'
  | 'comeback'
  | 'close_game'
  | 'commander_kill'
  | 'topdeck';

export interface Highlight {
  id: string;
  type: HighlightType;
  severity: number;        // 1-10, higher = more clip-worthy
  caption: string;         // Human-readable description for overlay/title
  timestamp: number;       // Date.now() when detected
  turnNumber: number;
  /** Seconds before the highlight moment to start the clip */
  leadIn: number;
  /** Seconds after the highlight moment to end the clip */
  leadOut: number;
  /** Cards involved (for thumbnail/overlay) */
  involvedCards: string[];
  /** Player perspective */
  perspective: 'self' | 'opponent' | 'both';
  /** Game context at the moment */
  context: {
    playerLife: number;
    opponentLife: number;
    playerBoardSize: number;
    opponentBoardSize: number;
    turnNumber: number;
    format: string | null;
  };
}

export type HighlightListener = (highlight: Highlight) => void;

// ── Thresholds ───────────────────────────────────────────────────────────────

const LIFE_SWING_THRESHOLD = 8;       // Min life change in one turn to trigger
const BOARD_WIPE_THRESHOLD = 3;       // Min creatures removed to count as wipe
const SPELL_FLURRY_THRESHOLD = 3;     // Min spells in one turn
const LOW_LIFE_THRESHOLD = 5;         // "Danger zone" for comeback detection
const CLOSE_GAME_THRESHOLD = 5;       // Max life diff at game end for "close game"
const TOPDECK_HAND_MAX = 1;           // Max hand size to qualify as topdeck

// ── Detector ─────────────────────────────────────────────────────────────────

export class HighlightDetector {
  private listeners: HighlightListener[] = [];
  private highlights: Highlight[] = [];
  private highlightCount = 0;

  // Per-turn tracking
  private turnSpellCount = 0;
  private turnSpellNames: string[] = [];
  private currentTurn = 0;
  private turnLifeStart: { player: number; opponent: number } = { player: 20, opponent: 20 };
  private turnBoardStart: { player: number; opponent: number } = { player: 0, opponent: 0 };

  // Cross-turn tracking
  private playerMinLife = 20;
  private wasInDangerZone = false;
  private matchActive = false;
  private lastDrawnGrpId: number | null = null;
  private lastDrawnName: string | null = null;
  private handSizeAtDraw = 0;
  private format: string | null = null;
  private matchId: string | null = null;

  // Card name resolver (injected)
  private cardNameFn: ((grpId: number) => string) | null = null;

  setCardNameResolver(fn: (grpId: number) => string): void {
    this.cardNameFn = fn;
  }

  onHighlight(listener: HighlightListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  getHighlights(): Highlight[] {
    return [...this.highlights];
  }

  /**
   * Feed a game event + current snapshot. Call this from the log watcher's
   * event handler after the GameStateEngine has processed the event.
   */
  processEvent(event: ArenaGameEvent, state: GameStateSnapshot): void {
    switch (event.type) {
      case 'match_start':
        this.resetMatch();
        this.matchActive = true;
        this.matchId = event.matchId;
        this.format = event.format;
        const startLife = this.getStartingLife(event.format);
        this.turnLifeStart = { player: startLife, opponent: startLife };
        this.playerMinLife = startLife;
        break;

      case 'turn_change':
        this.onTurnEnd(state);
        this.currentTurn = event.turnNumber;
        this.turnSpellCount = 0;
        this.turnSpellNames = [];
        this.turnLifeStart = {
          player: state.playerLife,
          opponent: state.opponentLife,
        };
        this.turnBoardStart = {
          player: state.battlefield.length,
          opponent: state.opponentBattlefield.length,
        };
        break;

      case 'card_played':
        this.turnSpellCount++;
        const spellName = this.resolveName(event.grpId);
        this.turnSpellNames.push(spellName);
        // Check topdeck: card was just drawn into near-empty hand then immediately played
        if (
          event.ownerSeatId === state.playerSeatId &&
          event.grpId === this.lastDrawnGrpId &&
          this.handSizeAtDraw <= TOPDECK_HAND_MAX
        ) {
          this.emit({
            type: 'topdeck',
            severity: 7,
            caption: `Topdeck ${this.lastDrawnName || spellName}!`,
            turnNumber: this.sharedTurn(state.turnNumber),
            leadIn: 5,
            leadOut: 8,
            involvedCards: [this.lastDrawnName || spellName],
            perspective: 'self',
            context: this.buildContext(state),
          });
          this.lastDrawnGrpId = null;
        }
        break;

      case 'card_drawn':
        if (event.ownerSeatId === state.playerSeatId) {
          this.lastDrawnGrpId = event.grpId;
          this.lastDrawnName = this.resolveName(event.grpId);
          // Hand size BEFORE this draw (state already includes the drawn card)
          this.handSizeAtDraw = Math.max(0, state.hand.length - 1);
        }
        break;

      case 'life_total_change':
        if (event.seatId === state.playerSeatId) {
          this.playerMinLife = Math.min(this.playerMinLife, event.lifeTotal);
          if (event.lifeTotal <= LOW_LIFE_THRESHOLD && event.lifeTotal > 0) {
            this.wasInDangerZone = true;
          }
        }
        break;

      case 'zone_change':
        // Detect board wipe: multiple creatures leaving battlefield in quick succession
        // Handled in onTurnEnd by comparing board sizes
        break;

      case 'match_complete': {
        this.onTurnEnd(state);
        this.checkMatchEndHighlights(event, state);
        this.matchActive = false;
        break;
      }
    }
  }

  // ── Turn boundary checks ─────────────────────────────────────────────────

  private onTurnEnd(state: GameStateSnapshot): void {
    if (!this.matchActive || this.currentTurn === 0) return;

    const sharedTurn = this.sharedTurn(state.turnNumber);

    // Life swing check
    const playerLifeDelta = Math.abs(state.playerLife - this.turnLifeStart.player);
    const opponentLifeDelta = Math.abs(state.opponentLife - this.turnLifeStart.opponent);
    const maxDelta = Math.max(playerLifeDelta, opponentLifeDelta);

    if (maxDelta >= LIFE_SWING_THRESHOLD) {
      const who = playerLifeDelta >= opponentLifeDelta ? 'opponent' : 'self';
      const severity = Math.min(10, Math.floor(maxDelta / 3) + 4);
      this.emit({
        type: 'life_swing',
        severity,
        caption: `${maxDelta} life swing on turn ${sharedTurn}!`,
        turnNumber: sharedTurn,
        leadIn: 10,
        leadOut: 5,
        involvedCards: this.turnSpellNames.slice(0, 5),
        perspective: who === 'self' ? 'self' : 'opponent',
        context: this.buildContext(state),
      });
    }

    // Board wipe check
    const playerBoardLoss = this.turnBoardStart.player - state.battlefield.length;
    const opponentBoardLoss = this.turnBoardStart.opponent - state.opponentBattlefield.length;
    const totalBoardLoss = Math.max(playerBoardLoss, opponentBoardLoss);

    if (totalBoardLoss >= BOARD_WIPE_THRESHOLD) {
      const severity = Math.min(10, totalBoardLoss + 3);
      // Try to identify the wipe spell (usually the first spell cast this turn)
      const wipeSpell = this.turnSpellNames[0] || 'Board wipe';
      this.emit({
        type: 'board_wipe',
        severity,
        caption: `${wipeSpell} clears ${totalBoardLoss} creatures!`,
        turnNumber: sharedTurn,
        leadIn: 8,
        leadOut: 5,
        involvedCards: [wipeSpell],
        perspective: playerBoardLoss >= opponentBoardLoss ? 'opponent' : 'self',
        context: this.buildContext(state),
      });
    }

    // Spell flurry check
    if (this.turnSpellCount >= SPELL_FLURRY_THRESHOLD) {
      const severity = Math.min(10, this.turnSpellCount + 2);
      this.emit({
        type: 'spell_flurry',
        severity,
        caption: `${this.turnSpellCount} spells in one turn!`,
        turnNumber: sharedTurn,
        leadIn: 15,
        leadOut: 5,
        involvedCards: this.turnSpellNames.slice(0, 6),
        perspective: 'self',
        context: this.buildContext(state),
      });
    }
  }

  // ── Match-end checks ─────────────────────────────────────────────────────

  private checkMatchEndHighlights(
    event: Extract<ArenaGameEvent, { type: 'match_complete' }>,
    state: GameStateSnapshot,
  ): void {
    const sharedTurn = this.sharedTurn(state.turnNumber);

    // Lethal turn
    if (event.result === 'win') {
      this.emit({
        type: 'lethal_turn',
        severity: 8,
        caption: `Lethal on turn ${sharedTurn}!`,
        turnNumber: sharedTurn,
        leadIn: 15,
        leadOut: 8,
        involvedCards: this.turnSpellNames.slice(0, 5),
        perspective: 'self',
        context: this.buildContext(state),
      });
    }

    // Comeback: was in danger zone (<5 life) but won
    if (event.result === 'win' && this.wasInDangerZone) {
      const severity = this.playerMinLife <= 1 ? 10 : this.playerMinLife <= 3 ? 9 : 7;
      this.emit({
        type: 'comeback',
        severity,
        caption: `Comeback from ${this.playerMinLife} life!`,
        turnNumber: sharedTurn,
        leadIn: 20,
        leadOut: 10,
        involvedCards: [],
        perspective: 'self',
        context: this.buildContext(state),
      });
    }

    // Close game: both players' life totals near each other at end
    const lifeDiff = Math.abs(state.playerLife - state.opponentLife);
    if (lifeDiff <= CLOSE_GAME_THRESHOLD && state.turnNumber >= 6) {
      this.emit({
        type: 'close_game',
        severity: 6,
        caption: `Nail-biter! ${state.playerLife} vs ${state.opponentLife} life`,
        turnNumber: sharedTurn,
        leadIn: 10,
        leadOut: 8,
        involvedCards: [],
        perspective: 'both',
        context: this.buildContext(state),
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private emit(partial: Omit<Highlight, 'id' | 'timestamp'>): void {
    const highlight: Highlight = {
      ...partial,
      id: `hl_${++this.highlightCount}_${Date.now()}`,
      timestamp: Date.now(),
    };
    this.highlights.push(highlight);
    for (const listener of this.listeners) {
      try {
        listener(highlight);
      } catch {
        // Don't let listener errors crash the detector
      }
    }
  }

  private buildContext(state: GameStateSnapshot): Highlight['context'] {
    return {
      playerLife: state.playerLife,
      opponentLife: state.opponentLife,
      playerBoardSize: state.battlefield.length,
      opponentBoardSize: state.opponentBattlefield.length,
      turnNumber: this.sharedTurn(state.turnNumber),
      format: state.format,
    };
  }

  private resolveName(grpId: number): string {
    if (this.cardNameFn) return this.cardNameFn(grpId);
    return `Card #${grpId}`;
  }

  private sharedTurn(rawTurn: number): number {
    return Math.ceil(rawTurn / 2);
  }

  private getStartingLife(format: string | null): number {
    if (!format) return 20;
    const f = format.toLowerCase();
    if (f.includes('brawl')) return 25;
    if (f.includes('commander') || f.includes('edh')) return 40;
    return 20;
  }

  private resetMatch(): void {
    this.highlights = [];
    this.highlightCount = 0;
    this.turnSpellCount = 0;
    this.turnSpellNames = [];
    this.currentTurn = 0;
    this.turnLifeStart = { player: 20, opponent: 20 };
    this.turnBoardStart = { player: 0, opponent: 0 };
    this.playerMinLife = 20;
    this.wasInDangerZone = false;
    this.lastDrawnGrpId = null;
    this.lastDrawnName = null;
    this.handSizeAtDraw = 0;
    this.matchId = null;
    this.format = null;
  }

  reset(): void {
    this.resetMatch();
    this.matchActive = false;
    this.listeners = [];
  }
}
