/**
 * Game State Engine — consumes ArenaGameEvents and maintains a live GameStateSnapshot.
 *
 * This is the core state machine for the live overlay. It processes events
 * from the Arena log parser and maintains a complete picture of the current game.
 */

import type {
  ArenaGameEvent,
  GameObjectInfo,
  ZoneInfo,
} from './arena-game-events';
import { ZONE_TYPES } from './arena-game-events';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResolvedCard {
  grpId: number;
  name: string;
  manaCost: string | null;
  cmc: number;
  typeLine: string | null;
  oracleText: string | null;
  imageUriSmall: string | null;
  imageUriNormal: string | null;
}

export interface DeckCardEntry {
  grpId: number;
  qty: number;
  remaining: number;
  card: ResolvedCard | null;
}

export interface GameStateSnapshot {
  matchId: string | null;
  gameNumber: number;
  playerSeatId: number;
  playerName: string | null;
  opponentName: string | null;
  format: string | null;

  // Deck tracking
  deckList: DeckCardEntry[];
  sideboardList: DeckCardEntry[];
  commanderGrpIds: number[];
  librarySize: number;

  // Zone contents (grpIds)
  hand: number[];
  battlefield: number[];
  graveyard: number[];
  exile: number[];
  opponentBattlefield: number[];
  opponentGraveyard: number[];

  // Life totals
  playerLife: number;
  opponentLife: number;

  // Turn tracking
  turnNumber: number;
  phase: string;
  step: string;
  activePlayer: number;

  // Cards seen
  opponentCardsSeen: number[];
  cardsDrawn: number[];

  // Mulligan state
  mulliganCount: number;
  openingHand: number[];

  // Game state
  isActive: boolean;
  isSideboarding: boolean;

  // Draw probabilities (plain object for IPC serialization safety)
  drawProbabilities: Record<number, number>;
}

export type StateChangeListener = (state: GameStateSnapshot) => void;

// ── Engine ───────────────────────────────────────────────────────────────────

export class GameStateEngine {
  private state: GameStateSnapshot;
  private listeners: StateChangeListener[] = [];
  private zoneMap: Map<number, ZoneInfo> = new Map();
  private objectZones: Map<number, number> = new Map(); // instanceId → zoneId
  private objectGrpIds: Map<number, number> = new Map(); // instanceId → grpId
  private objectOwners: Map<number, number> = new Map(); // instanceId → ownerSeatId
  private objectNames: Map<number, string> = new Map(); // grpId → card name from gameObjects
  private opponentSeatId = 2;

  constructor() {
    this.state = this.createEmptyState();
  }

  private createEmptyState(): GameStateSnapshot {
    return {
      matchId: null,
      gameNumber: 1,
      playerSeatId: 1,
      playerName: null,
      opponentName: null,
      format: null,
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
      opponentLife: 20,
      turnNumber: 0,
      phase: '',
      step: '',
      activePlayer: 0,
      opponentCardsSeen: [],
      cardsDrawn: [],
      mulliganCount: 0,
      openingHand: [],
      isActive: false,
      isSideboarding: false,
      drawProbabilities: {},
    };
  }

  /**
   * Process a single game event and update internal state.
   */
  processEvent(event: ArenaGameEvent): void {
    switch (event.type) {
      case 'match_start':
        this.handleMatchStart(event);
        break;
      case 'deck_submission':
        this.handleDeckSubmission(event);
        break;
      case 'game_state_update':
        this.handleGameStateUpdate(event);
        break;
      case 'mulligan_prompt':
        this.handleMulliganPrompt(event);
        break;
      case 'card_drawn':
        this.handleCardDrawn(event);
        break;
      case 'card_played':
        this.handleCardPlayed(event);
        break;
      case 'zone_change':
        this.handleZoneChange(event);
        break;
      case 'life_total_change':
        this.handleLifeChange(event);
        break;
      case 'turn_change':
        this.handleTurnChange(event);
        break;
      case 'phase_change':
        this.handlePhaseChange(event);
        break;
      case 'damage_dealt':
        // Damage events are informational — life changes handled by life_total_change
        break;
      case 'intermission':
        this.handleIntermission(event);
        break;
      case 'match_complete':
        this.handleMatchComplete(event);
        break;
    }

    this.updateDrawProbabilities();
    this.notifyListeners();
  }

  /**
   * Process multiple events in sequence.
   */
  processEvents(events: ArenaGameEvent[]): void {
    for (const event of events) {
      this.processEvent(event);
    }
  }

  getState(): GameStateSnapshot {
    return { ...this.state };
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Get draw probability for each unique card remaining in library.
   * Returns grpId → probability (0-1).
   */
  getDrawProbabilities(): Record<number, number> {
    return { ...this.state.drawProbabilities };
  }

  getCardsDrawn(): number[] {
    return [...this.state.cardsDrawn];
  }

  reset(): void {
    this.state = this.createEmptyState();
    this.zoneMap.clear();
    this.objectZones.clear();
    this.objectGrpIds.clear();
    this.objectOwners.clear();
    this.objectNames.clear();
    this.notifyListeners();
  }

  // ── Event Handlers ───────────────────────────────────────────────────────

  private handleMatchStart(event: Extract<ArenaGameEvent, { type: 'match_start' }>): void {
    this.state = this.createEmptyState();
    this.zoneMap.clear();
    this.objectZones.clear();
    this.objectGrpIds.clear();
    this.objectOwners.clear();
    this.objectNames.clear();

    this.state.matchId = event.matchId;
    this.state.playerSeatId = event.playerSeatId;
    this.state.playerName = event.playerName;
    this.state.opponentName = event.opponentName;
    this.state.format = event.format;
    this.state.isActive = true;
    this.opponentSeatId = event.playerSeatId === 1 ? 2 : 1;

    // Set starting life based on format
    const life = this.getStartingLife(event.format);
    this.state.playerLife = life;
    this.state.opponentLife = life;
  }

  private handleDeckSubmission(event: Extract<ArenaGameEvent, { type: 'deck_submission' }>): void {
    this.state.deckList = event.deckCards.map(c => ({
      grpId: c.grpId,
      qty: c.qty,
      remaining: c.qty,
      card: null,
    }));
    this.state.sideboardList = event.sideboardCards.map(c => ({
      grpId: c.grpId,
      qty: c.qty,
      remaining: c.qty,
      card: null,
    }));
    this.state.commanderGrpIds = [...event.commanderGrpIds];
    this.state.librarySize = event.deckCards.reduce((sum, c) => sum + c.qty, 0);
  }

  private handleGameStateUpdate(event: Extract<ArenaGameEvent, { type: 'game_state_update' }>): void {
    // Update zone map
    for (const z of event.zones) {
      this.zoneMap.set(z.zoneId, z);
    }

    // Update tracked objects
    for (const go of event.gameObjects) {
      this.objectGrpIds.set(go.instanceId, go.grpId);
      this.objectOwners.set(go.instanceId, go.ownerSeatId);
      this.objectZones.set(go.instanceId, go.zoneId);
      // Track grpId → name from game objects (Arena sometimes provides card names inline).
      // IMPORTANT: Arena's `name` field is often a numeric localization ID (e.g. 748691),
      // not an actual card name string. Only store actual string names.
      if (go.name && go.grpId && typeof go.name === 'string' && isNaN(Number(go.name))) {
        this.objectNames.set(go.grpId, go.name);
      }
    }

    // Rebuild zone contents from tracked objects
    this.rebuildZoneContents();

    // Populate opening hand from hand zone if mulligan prompt arrived with empty handGrpIds
    if (this.state.openingHand.length === 0 && this.state.turnNumber <= 1) {
      if (this.state.hand.length > 0) {
        this.state.openingHand = [...this.state.hand];
      }
    }

    // Update turn info
    if (event.turnInfo) {
      if (event.turnInfo.turnNumber > 0) {
        this.state.turnNumber = event.turnInfo.turnNumber;
      }
      this.state.activePlayer = event.turnInfo.activePlayer;
      if (event.turnInfo.phase) this.state.phase = event.turnInfo.phase;
      if (event.turnInfo.step) this.state.step = event.turnInfo.step;
    }

    // Life totals are handled by life_total_change events (from both ModifiedLife
    // annotations and the players array in extractGameEvents). Don't double-write
    // here — the game_state_update's players array can contain stale values that
    // overwrite correct values already set by handleLifeChange().
  }

  private handleMulliganPrompt(event: Extract<ArenaGameEvent, { type: 'mulligan_prompt' }>): void {
    if (event.seatId === this.state.playerSeatId) {
      this.state.mulliganCount = event.mulliganCount;
      if (event.handGrpIds.length > 0) {
        this.state.openingHand = [...event.handGrpIds];
      }
    }
  }

  private handleCardDrawn(event: Extract<ArenaGameEvent, { type: 'card_drawn' }>): void {
    if (event.ownerSeatId === this.state.playerSeatId) {
      this.state.cardsDrawn.push(event.grpId);
      // Decrement remaining count in deck list
      this.decrementDeckCard(event.grpId);
    }
  }

  private handleCardPlayed(event: Extract<ArenaGameEvent, { type: 'card_played' }>): void {
    // Track opponent cards
    if (event.ownerSeatId !== this.state.playerSeatId) {
      if (!this.state.opponentCardsSeen.includes(event.grpId)) {
        this.state.opponentCardsSeen.push(event.grpId);
      }
    }
  }

  private handleZoneChange(event: Extract<ArenaGameEvent, { type: 'zone_change' }>): void {
    this.objectZones.set(event.instanceId, event.toZoneId);

    // If our card left library (not via draw), still decrement
    if (
      event.ownerSeatId === this.state.playerSeatId &&
      event.fromZoneType === ZONE_TYPES.LIBRARY &&
      event.toZoneType !== ZONE_TYPES.HAND
    ) {
      this.decrementDeckCard(event.grpId);
    }
  }

  private handleLifeChange(event: Extract<ArenaGameEvent, { type: 'life_total_change' }>): void {
    if (event.seatId === this.state.playerSeatId) {
      this.state.playerLife = event.lifeTotal;
    } else {
      this.state.opponentLife = event.lifeTotal;
    }
  }

  private handleTurnChange(event: Extract<ArenaGameEvent, { type: 'turn_change' }>): void {
    this.state.turnNumber = event.turnNumber;
    this.state.activePlayer = event.activePlayer;
  }

  private handlePhaseChange(event: Extract<ArenaGameEvent, { type: 'phase_change' }>): void {
    this.state.phase = event.phase;
    this.state.step = event.step;
    this.state.turnNumber = event.turnNumber;
  }

  private handleIntermission(_event: Extract<ArenaGameEvent, { type: 'intermission' }>): void {
    this.state.isSideboarding = true;
    this.state.gameNumber++;
    // Reset game-specific state but keep deck/match info
    this.state.hand = [];
    this.state.battlefield = [];
    this.state.graveyard = [];
    this.state.exile = [];
    this.state.opponentBattlefield = [];
    this.state.opponentGraveyard = [];
    this.state.cardsDrawn = [];
    this.state.turnNumber = 0;
    this.state.phase = '';
    this.state.step = '';
    this.state.mulliganCount = 0;
    this.state.openingHand = [];
    // Reset deck remaining counts
    for (const entry of this.state.deckList) {
      entry.remaining = entry.qty;
    }
    const life = this.getStartingLife(this.state.format);
    this.state.playerLife = life;
    this.state.opponentLife = life;
  }

  private handleMatchComplete(_event: Extract<ArenaGameEvent, { type: 'match_complete' }>): void {
    this.state.isActive = false;
    this.state.isSideboarding = false;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private decrementDeckCard(grpId: number): void {
    for (const entry of this.state.deckList) {
      if (entry.grpId === grpId && entry.remaining > 0) {
        entry.remaining--;
        this.state.librarySize = Math.max(0, this.state.librarySize - 1);
        return;
      }
    }
    // Card not in known deck — could be created token, sideboard swap, etc.
    this.state.librarySize = Math.max(0, this.state.librarySize - 1);
  }

  private rebuildZoneContents(): void {
    const playerHand: number[] = [];
    const playerBattlefield: number[] = [];
    const playerGraveyard: number[] = [];
    const playerExile: number[] = [];
    const opponentBattlefield: number[] = [];
    const opponentGraveyard: number[] = [];

    for (const [instanceId, zoneId] of Array.from(this.objectZones.entries())) {
      const zone = this.zoneMap.get(zoneId);
      const grpId = this.objectGrpIds.get(instanceId);
      const owner = this.objectOwners.get(instanceId);
      if (!zone || !grpId) continue;

      const isPlayer = owner === this.state.playerSeatId;

      switch (zone.type) {
        case ZONE_TYPES.HAND:
          if (isPlayer) playerHand.push(grpId);
          break;
        case ZONE_TYPES.BATTLEFIELD:
          if (isPlayer) playerBattlefield.push(grpId);
          else opponentBattlefield.push(grpId);
          break;
        case ZONE_TYPES.GRAVEYARD:
          if (isPlayer) playerGraveyard.push(grpId);
          else opponentGraveyard.push(grpId);
          break;
        case ZONE_TYPES.EXILE:
          if (isPlayer) playerExile.push(grpId);
          break;
      }
    }

    this.state.hand = playerHand;
    this.state.battlefield = playerBattlefield;
    this.state.graveyard = playerGraveyard;
    this.state.exile = playerExile;
    this.state.opponentBattlefield = opponentBattlefield;
    this.state.opponentGraveyard = opponentGraveyard;

    // Update opponentCardsSeen from visible zones (battlefield + graveyard)
    // This ensures catch-up mode and zone rebuilds populate the seen list
    const seenSet = new Set(this.state.opponentCardsSeen);
    for (const grpId of [...opponentBattlefield, ...opponentGraveyard]) {
      if (!seenSet.has(grpId)) {
        seenSet.add(grpId);
        this.state.opponentCardsSeen.push(grpId);
      }
    }
  }

  private updateDrawProbabilities(): void {
    const probs: Record<number, number> = {};
    if (this.state.librarySize <= 0) {
      this.state.drawProbabilities = probs;
      return;
    }

    for (const entry of this.state.deckList) {
      if (entry.remaining > 0) {
        probs[entry.grpId] = entry.remaining / this.state.librarySize;
      }
    }
    this.state.drawProbabilities = probs;
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Don't let listener errors crash the engine
      }
    }
  }

  private getStartingLife(format: string | null): number {
    if (!format) return 20;
    const f = format.toLowerCase();
    // Brawl (both Historic and Standard) uses 25 life, not 40
    if (f.includes('brawl')) return 25;
    if (f.includes('commander') || f.includes('edh')) return 40;
    return 20;
  }

  /**
   * Get grpId → name mappings from game objects (for resolver name hints).
   */
  getObjectNames(): Map<number, string> {
    return this.objectNames;
  }

  /**
   * Resolve a card in the deck list with card info from the resolver.
   */
  resolveCard(grpId: number, card: ResolvedCard): void {
    for (const entry of this.state.deckList) {
      if (entry.grpId === grpId && !entry.card) {
        entry.card = card;
      }
    }
    for (const entry of this.state.sideboardList) {
      if (entry.grpId === grpId && !entry.card) {
        entry.card = card;
      }
    }
  }
}
