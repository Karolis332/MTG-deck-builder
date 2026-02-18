/**
 * Match Telemetry Logger — Arena Tutor-style action recording.
 *
 * Accumulates game actions in memory during a match and provides
 * flush() to batch-write them to the DB via the API.
 *
 * Data flow:
 *   ArenaLogWatcher → handleStreamingEvent()
 *     → MatchTelemetryLogger (accumulates actions)
 *       → On turn change: batch POST to /api/arena-telemetry
 *       → On match_complete: final flush with full match summary
 */

export interface TelemetryAction {
  match_id: string;
  game_number: number;
  turn_number: number;
  phase: string;
  action_type: string;
  player: 'self' | 'opponent';
  grp_id: number | null;
  card_name: string | null;
  details: string | null;
  action_order: number;
}

export interface MatchTelemetrySummary {
  match_id: string;
  opening_hand: number[];
  mulligan_count: number;
  on_play: boolean | null;
  match_start_time: string;
  match_end_time: string;
  game_count: number;
  life_progression: Array<{ turn: number; player: number; opponent: number }>;
  draw_order: number[];
  sideboard_changes: Array<{ game: number; in: number[]; out: number[] }>;
  opponent_cards_by_turn: Record<number, number[]>;
}

export interface TelemetryFlushData {
  actions: TelemetryAction[];
  summary?: MatchTelemetrySummary;
}

const FLUSH_INTERVAL_TURNS = 3;

export class MatchTelemetryLogger {
  private matchId = '';
  private format: string | null = null;
  private playerName: string | null = null;
  private opponentName: string | null = null;
  private gameNumber = 1;
  private actionCounter = 0;
  private pendingActions: TelemetryAction[] = [];
  private flushedActions: TelemetryAction[] = [];

  // Summary data
  private openingHand: number[] = [];
  private mulliganCount = 0;
  private onPlay: boolean | null = null;
  private matchStartTime = '';
  private matchEndTime = '';
  private drawOrder: number[] = [];
  private lifeProgression: Array<{ turn: number; player: number; opponent: number }> = [];
  private sideboardChanges: Array<{ game: number; in: number[]; out: number[] }> = [];
  private opponentCardsByTurn: Record<number, number[]> = {};

  private lastPlayerLife = 20;
  private lastOpponentLife = 20;
  private lastFlushTurn = 0;
  private currentTurn = 0;
  private currentPhase = '';

  // Pre-sideboard deck snapshot for diffing
  private preSideboardDeck: number[] = [];

  startMatch(matchId: string, format: string | null, playerName: string | null, opponentName: string | null): void {
    this.matchId = matchId;
    this.format = format;
    this.playerName = playerName;
    this.opponentName = opponentName;
    this.matchStartTime = new Date().toISOString();
    this.gameNumber = 1;

    this.addAction('match_start', 0, '', 'self', null, null,
      JSON.stringify({ format, playerName, opponentName }));
  }

  onDeckSubmission(deckCards: Array<{ grpId: number; qty: number }>, sideboardCards: Array<{ grpId: number; qty: number }>): void {
    // Snapshot deck for sideboard diff
    this.preSideboardDeck = [];
    for (const c of deckCards) {
      for (let i = 0; i < c.qty; i++) this.preSideboardDeck.push(c.grpId);
    }

    this.addAction('deck_submitted', this.currentTurn, this.currentPhase, 'self', null, null,
      JSON.stringify({ mainCount: deckCards.length, sideboardCount: sideboardCards.length }));
  }

  onMulligan(mulliganCount: number, handGrpIds: number[]): void {
    this.mulliganCount = mulliganCount;

    if (mulliganCount === 0) {
      // Keeping — this is the opening hand
      this.openingHand = [...handGrpIds];
      this.addAction('mulligan_keep', 0, '', 'self', null, null,
        JSON.stringify({ handSize: handGrpIds.length, hand: handGrpIds }));
    } else {
      this.addAction('mulligan_mull', 0, '', 'self', null, null,
        JSON.stringify({ mulliganCount, handSize: handGrpIds.length }));
    }
  }

  onKeep(handGrpIds: number[]): void {
    this.openingHand = [...handGrpIds];
    this.addAction('mulligan_keep', 0, '', 'self', null, null,
      JSON.stringify({ handSize: handGrpIds.length, hand: handGrpIds, mulliganCount: this.mulliganCount }));
  }

  onCardDrawn(grpId: number, turnNumber: number, cardName?: string): void {
    this.drawOrder.push(grpId);
    this.addAction('card_drawn', turnNumber, this.currentPhase, 'self', grpId, cardName ?? null, null);
  }

  onCardPlayed(grpId: number, ownerSeatId: number, playerSeatId: number, turnNumber: number, cardName?: string): void {
    const player = ownerSeatId === playerSeatId ? 'self' : 'opponent';
    this.addAction('card_played', turnNumber, this.currentPhase, player, grpId, cardName ?? null, null);

    if (player === 'opponent') {
      if (!this.opponentCardsByTurn[turnNumber]) {
        this.opponentCardsByTurn[turnNumber] = [];
      }
      this.opponentCardsByTurn[turnNumber].push(grpId);
    }
  }

  onOpponentCardSeen(grpId: number, turnNumber: number, cardName?: string): void {
    const player: 'opponent' = 'opponent';
    this.addAction('opponent_card_played', turnNumber, this.currentPhase, player, grpId, cardName ?? null, null);

    if (!this.opponentCardsByTurn[turnNumber]) {
      this.opponentCardsByTurn[turnNumber] = [];
    }
    this.opponentCardsByTurn[turnNumber].push(grpId);
  }

  onLifeChange(seatId: number, playerSeatId: number, lifeTotal: number, turnNumber: number): void {
    const isSelf = seatId === playerSeatId;

    if (isSelf) {
      this.lastPlayerLife = lifeTotal;
    } else {
      this.lastOpponentLife = lifeTotal;
    }

    // Record life snapshot
    this.lifeProgression.push({
      turn: turnNumber,
      player: this.lastPlayerLife,
      opponent: this.lastOpponentLife,
    });

    this.addAction('life_change', turnNumber, this.currentPhase,
      isSelf ? 'self' : 'opponent', null, null,
      JSON.stringify({ lifeTotal, seatId }));
  }

  onTurnChange(turnNumber: number, activePlayer: number, playerSeatId: number): void {
    this.currentTurn = turnNumber;
    const player = activePlayer === playerSeatId ? 'self' : 'opponent';

    // Track on-play: if player is active on turn 1, they're on the play
    if (turnNumber === 1 && this.onPlay === null) {
      this.onPlay = activePlayer === playerSeatId;
    }

    this.addAction('turn_start', turnNumber, '', player, null, null, null);
  }

  onPhaseChange(phase: string, step: string, turnNumber: number): void {
    this.currentPhase = phase;
    this.addAction('phase_change', turnNumber, phase, 'self', null, null,
      JSON.stringify({ step }));
  }

  onIntermission(gameNumber: number, newDeckCards?: Array<{ grpId: number; qty: number }>): void {
    // Compute sideboard diff if we have both snapshots
    if (newDeckCards && this.preSideboardDeck.length > 0) {
      const newDeck: number[] = [];
      for (const c of newDeckCards) {
        for (let i = 0; i < c.qty; i++) newDeck.push(c.grpId);
      }

      const oldCounts = new Map<number, number>();
      for (const id of this.preSideboardDeck) {
        oldCounts.set(id, (oldCounts.get(id) ?? 0) + 1);
      }
      const newCounts = new Map<number, number>();
      for (const id of newDeck) {
        newCounts.set(id, (newCounts.get(id) ?? 0) + 1);
      }

      const boardedIn: number[] = [];
      const boardedOut: number[] = [];

      const allIds = new Set([...Array.from(oldCounts.keys()), ...Array.from(newCounts.keys())]);
      allIds.forEach((id) => {
        const oldQty = oldCounts.get(id) ?? 0;
        const newQty = newCounts.get(id) ?? 0;
        const diff = newQty - oldQty;
        if (diff > 0) {
          for (let i = 0; i < diff; i++) boardedIn.push(id);
        } else if (diff < 0) {
          for (let i = 0; i < -diff; i++) boardedOut.push(id);
        }
      });

      this.sideboardChanges.push({
        game: gameNumber,
        in: boardedIn,
        out: boardedOut,
      });
    }

    this.gameNumber = gameNumber;
    this.addAction('sideboard_start', this.currentTurn, '', 'self', null, null,
      JSON.stringify({ gameNumber }));

    // Reset per-game state
    this.lastPlayerLife = 20;
    this.lastOpponentLife = 20;
    this.currentTurn = 0;
  }

  endMatch(result: string): void {
    this.matchEndTime = new Date().toISOString();
    this.addAction('match_end', this.currentTurn, this.currentPhase, 'self', null, null,
      JSON.stringify({ result }));
  }

  shouldFlush(): boolean {
    return this.currentTurn - this.lastFlushTurn >= FLUSH_INTERVAL_TURNS
      && this.pendingActions.length > 0;
  }

  flush(): TelemetryFlushData {
    const actions = [...this.pendingActions];
    this.flushedActions.push(...actions);
    this.pendingActions = [];
    this.lastFlushTurn = this.currentTurn;
    return { actions };
  }

  flushFinal(): TelemetryFlushData {
    const actions = [...this.pendingActions];
    this.flushedActions.push(...actions);
    this.pendingActions = [];

    const summary: MatchTelemetrySummary = {
      match_id: this.matchId,
      opening_hand: this.openingHand,
      mulligan_count: this.mulliganCount,
      on_play: this.onPlay,
      match_start_time: this.matchStartTime,
      match_end_time: this.matchEndTime,
      game_count: this.gameNumber,
      life_progression: this.lifeProgression,
      draw_order: this.drawOrder,
      sideboard_changes: this.sideboardChanges,
      opponent_cards_by_turn: this.opponentCardsByTurn,
    };

    return { actions, summary };
  }

  getActionCount(): number {
    return this.flushedActions.length + this.pendingActions.length;
  }

  getMatchId(): string {
    return this.matchId;
  }

  private addAction(
    actionType: string,
    turnNumber: number,
    phase: string,
    player: 'self' | 'opponent',
    grpId: number | null,
    cardName: string | null,
    details: string | null
  ): void {
    this.pendingActions.push({
      match_id: this.matchId,
      game_number: this.gameNumber,
      turn_number: turnNumber,
      phase,
      action_type: actionType,
      player,
      grp_id: grpId,
      card_name: cardName,
      details,
      action_order: this.actionCounter++,
    });
  }
}
