/**
 * Background file watcher for MTG Arena Player.log.
 * Port of scripts/arena_watcher.py.
 *
 * Polls the log file for new content and emits parsed match/collection events.
 * Handles log rotation (inode change) and truncation (file reset).
 *
 * v2: Added streaming mode with GameStateEngine for real-time overlay support.
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import {
  parseArenaLogFile,
  extractJsonBlocks,
  type ArenaMatch,
  type JsonBlock,
} from '../src/lib/arena-log-reader';
import {
  extractGameEventsWithContext,
  createContext,
  type ArenaGameEvent,
  type ExtractionContext,
} from '../src/lib/arena-game-events';
import { GameStateEngine, type GameStateSnapshot } from '../src/lib/game-state-engine';
import { GrpIdResolver } from '../src/lib/grp-id-resolver';
import { MatchTelemetryLogger, type TelemetryFlushData } from '../src/lib/match-telemetry';

// ── Game Log Entry ───────────────────────────────────────────────────────────

export interface GameLogEntry {
  type: 'system' | 'turn' | 'phase' | 'action' | 'life' | 'damage' | 'result';
  text: string;
  player?: 'self' | 'opponent' | null;
}

// File-based debug log (Electron stdout not captured reliably on Windows)
const DEBUG_LOG = path.join(process.env.APPDATA || '.', 'the-black-grimoire', 'telemetry-debug.log');
function debugLog(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${msg}\n`;
  try { fs.appendFileSync(DEBUG_LOG, line); } catch { /* ignore */ }
  console.log(`[Telemetry] ${msg}`);
}

export class ArenaLogWatcher extends EventEmitter {
  private logPath: string;
  private pollInterval: number;
  private running = false;
  private lastPosition = 0;
  private lastInode: number | null = null;
  private buffer: string[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private seenMatchIds = new Set<string>();
  public matchCount = 0;

  // Streaming mode
  private gameEngine: GameStateEngine | null = null;
  private resolver: GrpIdResolver | null = null;
  private telemetryLogger: MatchTelemetryLogger | null = null;
  private streamingBuffer = '';
  private streamingContext: ExtractionContext = createContext();
  private processedBlockCount = 0;

  private catchUp: boolean;
  private lastLoggedTurn = 0;
  private lastLoggedPhase = '';

  // Log persistence — survives match end and page navigation
  private logHistory: GameLogEntry[] = [];
  private lastMatchInfo: {
    matchId: string;
    format: string | null;
    playerName: string | null;
    opponentName: string | null;
    result?: string;
  } | null = null;
  private lastGameStateSnapshot: GameStateSnapshot | null = null;

  constructor(logPath: string, pollInterval = 500, catchUp = false) {
    super();
    this.logPath = logPath;
    this.pollInterval = pollInterval;
    this.catchUp = catchUp;
  }

  /**
   * Set a GrpIdResolver for resolving card names in real-time.
   */
  setResolver(resolver: GrpIdResolver): void {
    this.resolver = resolver;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    debugLog(`watcher.start() called, catchUp=${this.catchUp}, logPath=${this.logPath}`);

    try {
      const stat = fs.statSync(this.logPath);
      this.lastInode = stat.ino;

      if (this.catchUp) {
        // Catch-up mode: scan the last portion of the log to detect in-progress matches
        // Read last 5MB — a single game can generate several MB of log data,
        // and we need to find the matchGameRoomStateChangedEvent (Playing) at the start
        const catchUpSize = Math.min(stat.size, 5 * 1024 * 1024);
        const startPos = stat.size - catchUpSize;
        const fd = fs.openSync(this.logPath, 'r');
        const buf = Buffer.alloc(catchUpSize);
        fs.readSync(fd, buf, 0, catchUpSize, startPos);
        fs.closeSync(fd);

        const recentContent = buf.toString('utf-8');
        this.processContentStreaming(recentContent);
        this.lastPosition = stat.size;
      } else {
        // Normal mode: seek to end, only process new content
        this.lastPosition = stat.size;
      }
    } catch (err) {
      this.emit('error', `Cannot access log file: ${err}`);
      this.running = false;
      return;
    }

    this.timer = setInterval(() => this.poll(), this.pollInterval);
    this.emit('started', this.logPath);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.gameEngine = null;
    this.telemetryLogger = null;
    this.streamingBuffer = '';
    this.streamingContext = createContext();
    this.processedBlockCount = 0;
    this.emit('stopped');
  }

  private poll(): void {
    try {
      let stat: fs.Stats;
      try {
        stat = fs.statSync(this.logPath);
      } catch {
        // File not found — Arena may not be running
        return;
      }

      // Log rotation detection (inode changed = new file)
      if (this.lastInode !== null && stat.ino !== this.lastInode) {
        this.lastPosition = 0;
        this.lastInode = stat.ino;
        this.buffer = [];
        this.streamingBuffer = '';
        this.streamingContext = createContext();
        this.processedBlockCount = 0;
      }

      // Truncation detection (file smaller than last read position)
      if (stat.size < this.lastPosition) {
        this.lastPosition = 0;
        this.buffer = [];
        this.streamingBuffer = '';
        this.streamingContext = createContext();
        this.processedBlockCount = 0;
      }

      // No new content
      if (stat.size <= this.lastPosition) return;

      // Read new content from last position
      const fd = fs.openSync(this.logPath, 'r');
      const readSize = stat.size - this.lastPosition;
      const buf = Buffer.alloc(readSize);
      fs.readSync(fd, buf, 0, readSize, this.lastPosition);
      fs.closeSync(fd);

      this.lastPosition = stat.size;
      this.lastInode = stat.ino;

      const newContent = buf.toString('utf-8');

      // Process in both modes
      this.processContent(newContent);
      this.processContentStreaming(newContent);
    } catch (err) {
      this.emit('error', String(err));
    }
  }

  /**
   * Legacy match/collection processing — keeps backward compatibility.
   */
  private processContent(content: string): void {
    this.buffer.push(content);
    const fullText = this.buffer.join('');

    const { matches, collection } = parseArenaLogFile(fullText);

    // Emit new matches (dedup by matchId)
    let hasNewMatches = false;
    for (const match of matches) {
      if (!this.seenMatchIds.has(match.matchId)) {
        this.seenMatchIds.add(match.matchId);
        this.matchCount++;
        this.emit('match', match);
        hasNewMatches = true;
      }
    }

    // Emit collection data if found
    if (collection) {
      this.emit('collection', collection);
    }

    // Clear buffer if we successfully parsed something
    if (hasNewMatches || collection) {
      this.buffer = [];
    }
  }

  /**
   * Streaming game event processing for real-time overlay.
   * Extracts JSON blocks from new content, converts to events,
   * and feeds them into the GameStateEngine.
   *
   * Uses a persistent ExtractionContext so zone changes, life totals,
   * and seat assignments are tracked correctly across polls.
   */
  private processContentStreaming(content: string): void {
    debugLog(`processContentStreaming called, contentLen=${content.length}, bufferLen=${this.streamingBuffer.length}`);
    this.streamingBuffer += content;

    // Extract ALL JSON blocks from accumulated buffer
    const allBlocks = extractJsonBlocks(this.streamingBuffer);
    debugLog(`extracted ${allBlocks.length} total blocks, processed=${this.processedBlockCount}`);
    if (allBlocks.length === 0) return;

    // Only process blocks we haven't seen yet
    const newBlocks = allBlocks.slice(this.processedBlockCount);
    this.processedBlockCount = allBlocks.length;

    if (newBlocks.length === 0) return;

    // Extract events using persistent context (preserves seat IDs, zone map, etc.)
    const events = extractGameEventsWithContext(newBlocks, this.streamingContext);

    if (events.length > 0 || newBlocks.length > 0) {
      // Per-type event counts (not just unique types)
      const typeCounts: Record<string, number> = {};
      for (const e of events) {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      }
      const typeStr = Object.entries(typeCounts).map(([t, c]) => `${t}:${c}`).join(', ');
      const s = this.streamingContext.lastStats;
      debugLog(
        `streaming: ${newBlocks.length} blocks → ${events.length} events [${typeStr}] ` +
        `| gsm:${s.gsmCount} zt:${s.zoneTransfers}(hit:${s.grpIdHits}/miss:${s.grpIdMisses}) ` +
        `oid:${s.objectIdChanges} shuf:${s.shuffleRemaps} del:${s.diffDeleted} ` +
        `| ctx: grpIds=${this.streamingContext.objectGrpIds.size} zones=${this.streamingContext.zones.size} ` +
        `chains=${this.streamingContext.idChanges.size}`
      );
    }

    for (const event of events) {
      this.handleStreamingEvent(event);
    }

    // Trim buffer to prevent unbounded growth
    // Keep enough to span partial JSON blocks across polls
    if (this.streamingBuffer.length > 500000) {
      this.streamingBuffer = this.streamingBuffer.slice(-250000);
      this.processedBlockCount = extractJsonBlocks(this.streamingBuffer).length;
    }
  }

  private emitLog(entry: GameLogEntry): void {
    this.logHistory.push(entry);
    this.emit('game-log', entry);
  }

  private getPlayerLabel(seatId: number): 'self' | 'opponent' | null {
    if (!this.gameEngine) return null;
    const state = this.gameEngine.getState();
    if (seatId === state.playerSeatId) return 'self';
    return 'opponent';
  }

  private seatName(seatId: number): string {
    if (!this.gameEngine) return `Seat ${seatId}`;
    const state = this.gameEngine.getState();
    if (seatId === state.playerSeatId) return state.playerName || 'You';
    return state.opponentName || 'Opponent';
  }

  private cardName(grpId: number): string {
    if (!this.gameEngine) return `Card #${grpId}`;

    // Layer 1: gameObject names (grpId → cardName from Arena GRE)
    const objectNames = this.gameEngine.getObjectNames();
    const objName = objectNames.get(grpId);
    if (objName) return objName;

    // Layer 2: resolved deck list entries
    const state = this.gameEngine.getState();
    const entry = state.deckList.find(d => d.grpId === grpId);
    if (entry?.card?.name) return entry.card.name;

    // Layer 3: resolver memory/DB cache (sync, no API call)
    if (this.resolver) {
      const cached = this.resolver.getCached(grpId);
      if (cached && !cached.name.startsWith('Unknown')) return cached.name;
    }

    return `Card #${grpId}`;
  }

  private handleStreamingEvent(event: ArenaGameEvent): void {
    switch (event.type) {
      case 'match_start': {
        // Create new engine for this match
        this.gameEngine = new GameStateEngine();
        this.gameEngine.processEvent(event);

        // Start telemetry logging
        this.telemetryLogger = new MatchTelemetryLogger();
        this.telemetryLogger.startMatch(
          event.matchId, event.format,
          event.playerName, event.opponentName
        );
        debugLog(`match_start: logger created for ${event.matchId}`);

        this.lastLoggedTurn = 0;
        this.lastLoggedPhase = '';

        // Clear log history for new match
        this.logHistory = [];
        this.lastMatchInfo = {
          matchId: event.matchId,
          format: event.format,
          playerName: event.playerName,
          opponentName: event.opponentName,
        };

        const formatLabel = event.format || 'Match';
        this.emitLog({ type: 'system', text: `${formatLabel} — ${event.playerName || 'You'} vs ${event.opponentName || 'Opponent'}` });

        this.emit('match-start', {
          matchId: event.matchId,
          format: event.format,
          playerName: event.playerName,
          opponentName: event.opponentName,
        });

        // Subscribe to state changes
        this.gameEngine.onStateChange((state) => {
          this.emit('game-state', state);
        });
        break;
      }

      case 'match_complete': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);

          // Save last game state before nullifying engine
          this.lastGameStateSnapshot = this.gameEngine.getState();
          if (this.lastMatchInfo) {
            this.lastMatchInfo.result = event.result;
          }

          const resultText = event.result === 'win' ? 'Victory!' :
                             event.result === 'loss' ? 'Defeat.' : `Result: ${event.result}`;
          this.emitLog({ type: 'result', text: resultText, player: event.result === 'win' ? 'self' : 'opponent' });

          this.emit('match-end', {
            matchId: event.matchId,
            result: event.result,
          });
          this.gameEngine = null;
        }
        // Final telemetry flush with summary
        if (this.telemetryLogger) {
          this.telemetryLogger.endMatch(event.result);
          this.flushTelemetry(true);
          this.telemetryLogger = null;
        }
        break;
      }

      case 'mulligan_prompt': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          const state = this.gameEngine.getState();

          const mulNum = event.mulliganCount > 0 ? ` (mulligan ${event.mulliganCount})` : '';
          // Show card names in opening hand
          const handNames = event.handGrpIds.map(id => this.cardName(id));
          const handStr = handNames.length > 0 ? `: ${handNames.join(', ')}` : '';
          this.emitLog({ type: 'system', text: `Opening hand${mulNum}${handStr}`, player: 'self' });

          // Log mulligan decision
          if (this.telemetryLogger) {
            this.telemetryLogger.onMulligan(event.mulliganCount, event.handGrpIds);
          }

          this.emit('mulligan', {
            hand: event.handGrpIds,
            mulliganCount: event.mulliganCount,
            seatId: event.seatId,
            deckList: state.deckList,
          });
        }
        break;
      }

      case 'intermission': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          const state = this.gameEngine.getState();

          // Log intermission (sideboard boundary)
          if (this.telemetryLogger) {
            this.telemetryLogger.onIntermission(event.gameNumber);
            // Flush before sideboarding
            this.flushTelemetry(false);
          }

          this.emit('intermission', {
            matchId: state.matchId,
            gameNumber: event.gameNumber,
            opponentCardsSeen: state.opponentCardsSeen,
          });
        }
        break;
      }

      case 'deck_submission': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);

          // Log deck submission for telemetry
          if (this.telemetryLogger) {
            this.telemetryLogger.onDeckSubmission(event.deckCards, event.sideboardCards);
          }

          // Resolve card names for the deck
          this.resolveDecklist(event.deckCards.map(c => c.grpId));
        }
        break;
      }

      case 'card_drawn': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          const who = this.getPlayerLabel(event.ownerSeatId ?? this.gameEngine.getState().playerSeatId);
          const name = this.cardName(event.grpId);
          if (who === 'self') {
            this.emitLog({ type: 'action', text: `${this.seatName(this.gameEngine.getState().playerSeatId)} drew ${name}`, player: 'self' });
          } else {
            this.emitLog({ type: 'action', text: `${this.seatName(event.ownerSeatId ?? 0)} drew a card`, player: 'opponent' });
          }
          if (this.telemetryLogger) {
            const state = this.gameEngine.getState();
            this.telemetryLogger.onCardDrawn(event.grpId, state.turnNumber, name !== `Card #${event.grpId}` ? name : undefined);
          }
        }
        break;
      }

      case 'card_played': {
        if (this.gameEngine) {
          const stateBefore = this.gameEngine.getState();
          this.gameEngine.processEvent(event);
          const who = this.getPlayerLabel(event.ownerSeatId);
          const name = this.cardName(event.grpId);
          const verb = event.toZoneType === 'ZoneType_Battlefield' && event.fromZoneType === 'ZoneType_Hand' ? 'played' : 'cast';
          this.emitLog({ type: 'action', text: `${this.seatName(event.ownerSeatId)} ${verb} ${name}`, player: who });
          if (this.telemetryLogger) {
            this.telemetryLogger.onCardPlayed(
              event.grpId, event.ownerSeatId, stateBefore.playerSeatId,
              stateBefore.turnNumber, name !== `Card #${event.grpId}` ? name : undefined
            );
          }
        }
        break;
      }

      case 'life_total_change': {
        if (this.gameEngine) {
          // Get previous life before engine processes
          const prevState = this.gameEngine.getState();
          const prevLife = event.seatId === prevState.playerSeatId
            ? prevState.playerLife
            : prevState.opponentLife;
          this.gameEngine.processEvent(event);
          const who = this.getPlayerLabel(event.seatId);
          const diff = event.lifeTotal - prevLife;
          const label = this.seatName(event.seatId);
          if (diff < 0) {
            this.emitLog({ type: 'life', text: `${label} took ${Math.abs(diff)} damage (${prevLife} → ${event.lifeTotal})`, player: who });
          } else if (diff > 0) {
            this.emitLog({ type: 'life', text: `${label} gained ${diff} life (${prevLife} → ${event.lifeTotal})`, player: who });
          } else {
            this.emitLog({ type: 'life', text: `${label}'s life is ${event.lifeTotal}`, player: who });
          }
          if (this.telemetryLogger) {
            const state = this.gameEngine.getState();
            this.telemetryLogger.onLifeChange(
              event.seatId, state.playerSeatId, event.lifeTotal, state.turnNumber
            );
          }
        }
        break;
      }

      case 'turn_change': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          if (event.turnNumber !== this.lastLoggedTurn) {
            this.lastLoggedTurn = event.turnNumber;
            this.lastLoggedPhase = '';
            const who = this.getPlayerLabel(event.activePlayer);
            this.emitLog({ type: 'turn', text: `Turn ${event.turnNumber}: ${this.seatName(event.activePlayer)}`, player: who });
          }
          debugLog(`turn_change T${event.turnNumber}, logger=${!!this.telemetryLogger}, actions=${this.telemetryLogger?.getActionCount() ?? 0}`);
          if (this.telemetryLogger) {
            const state = this.gameEngine.getState();
            this.telemetryLogger.onTurnChange(event.turnNumber, event.activePlayer, state.playerSeatId);
            if (this.telemetryLogger.shouldFlush()) {
              this.flushTelemetry(false);
            }
          }
        }
        break;
      }

      case 'phase_change': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          const PHASE_NAMES: Record<string, string> = {
            'Phase_Main1': 'Precombat Main',
            'Phase_Main2': 'Postcombat Main',
          };
          const STEP_NAMES: Record<string, string> = {
            'Step_Draw': 'Draw Step',
            'Step_DeclareAttack': 'Declare Attackers',
            'Step_DeclareBlock': 'Declare Blockers',
            'Step_CombatDamage': 'Combat Damage',
            'Step_End': 'End Step',
          };
          const SUPPRESSED = new Set(['Step_Upkeep', 'Step_BeginCombat', 'Step_EndCombat', 'Step_Cleanup', 'Step_Untap']);
          if (!SUPPRESSED.has(event.step)) {
            const label = PHASE_NAMES[event.phase] || STEP_NAMES[event.step] || '';
            if (label && label !== this.lastLoggedPhase) {
              this.lastLoggedPhase = label;
              this.emitLog({ type: 'phase', text: label });
            }
          }
          if (this.telemetryLogger) {
            this.telemetryLogger.onPhaseChange(event.phase, event.step, event.turnNumber);
          }
        }
        break;
      }

      case 'zone_change': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          const who = this.getPlayerLabel(event.ownerSeatId);
          const name = this.cardName(event.grpId);
          const playerLabel = this.seatName(event.ownerSeatId);

          // Emit rich log based on category
          const CATEGORY_VERBS: Record<string, string> = {
            Destroy: 'was destroyed',
            Exile: 'was exiled',
            Discard: 'discarded',
            Sacrifice: 'sacrificed',
            Counter: 'was countered',
            Mill: 'was milled',
            ReturnToHand: 'returned to hand',
          };

          const verb = event.category ? CATEGORY_VERBS[event.category] : null;
          if (verb) {
            if (event.category === 'Discard' || event.category === 'Sacrifice') {
              this.emitLog({ type: 'action', text: `${playerLabel} ${verb} ${name}`, player: who });
            } else {
              this.emitLog({ type: 'action', text: `${name} ${verb}`, player: who });
            }
          }
          // Don't log Draw/CastSpell/Resolve/PlayLand — already covered by card_drawn/card_played
        }
        break;
      }

      case 'damage_dealt': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          const sourceName = this.cardName(event.sourceGrpId);
          if (event.targetSeatId) {
            const targetName = this.seatName(event.targetSeatId);
            this.emitLog({
              type: 'damage',
              text: `${sourceName} dealt ${event.amount} damage to ${targetName}`,
              player: this.getPlayerLabel(event.targetSeatId) === 'self' ? 'opponent' : 'self',
            });
          } else if (event.targetGrpId) {
            const targetName = this.cardName(event.targetGrpId);
            this.emitLog({
              type: 'damage',
              text: `${sourceName} dealt ${event.amount} damage to ${targetName}`,
            });
          }
        }
        break;
      }

      default: {
        // Late-join fallback: if we receive game_state_update events but have no engine,
        // the watcher started mid-game and missed match_start. Bootstrap from context.
        if (!this.gameEngine && event.type === 'game_state_update') {
          debugLog('Late-join detected — bootstrapping engine from game_state_update');
          this.gameEngine = new GameStateEngine();
          this.gameEngine.onStateChange((state) => {
            this.emit('game-state', state);
          });

          // Create telemetry logger with whatever context we have
          const matchId = this.streamingContext.currentMatchId || `unknown-${Date.now()}`;
          this.telemetryLogger = new MatchTelemetryLogger();
          this.telemetryLogger.startMatch(
            matchId, null,
            this.streamingContext.playerName, null
          );
          debugLog(`Late-join logger created for match: ${matchId}`);

          this.emit('match-start', {
            matchId,
            format: null,
            playerName: this.streamingContext.playerName,
            opponentName: null,
          });
        }

        // Feed all other events to the engine
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);

          // Feed game object names into resolver as fallback hints
          // (handles Alchemy/digital-only cards that Scryfall 404s on)
          // Uses bulk setNameHints for efficient batch DB persistence
          if (this.resolver && event.type === 'game_state_update') {
            const objectNames = this.gameEngine.getObjectNames();
            this.resolver.setNameHints(objectNames);

            // Re-resolve unresolved deck cards from newly available game object names.
            // The CDN card DB doesn't cover older/Alchemy grpIds, so gameObjects
            // are often the only source of name data for these cards.
            const deckList = this.gameEngine.getState().deckList;
            let anyResolved = false;
            for (const entry of deckList) {
              if (!entry.card && objectNames.has(entry.grpId)) {
                const cardName = objectNames.get(entry.grpId)!;
                // Skip numeric localization IDs (Arena sends name as int, not string)
                if (/^\d+$/.test(cardName)) continue;
                this.gameEngine.resolveCard(entry.grpId, {
                  grpId: entry.grpId,
                  name: cardName,
                  manaCost: null,
                  cmc: 0,
                  typeLine: null,
                  oracleText: null,
                  imageUriSmall: null,
                  imageUriNormal: null,
                });
                anyResolved = true;
              }
            }
            if (anyResolved) {
              this.emit('game-state', this.gameEngine.getState());
            }
          }
        }
        break;
      }
    }

    // Emit raw event for anything that wants granular updates
    this.emit('game-event', event);
  }

  /**
   * Flush telemetry actions to the API for persistence.
   * @param final If true, includes the match summary for enriched columns.
   */
  private flushTelemetry(final: boolean): void {
    if (!this.telemetryLogger) {
      debugLog('flushTelemetry called but no logger');
      return;
    }
    const data: TelemetryFlushData = final
      ? this.telemetryLogger.flushFinal()
      : this.telemetryLogger.flush();
    debugLog(`flush(final=${final}): ${data.actions.length} actions, summary=${!!data.summary}`);
    if (data.actions.length > 0 || data.summary) {
      this.emit('telemetry-flush', data);
    }
  }

  /**
   * Resolve card names for a list of grpIds and update the engine.
   */
  private async resolveDecklist(grpIds: number[]): Promise<void> {
    if (!this.resolver || !this.gameEngine) return;

    const uniqueGrpIds = Array.from(new Set(grpIds));
    const resolved = await this.resolver.resolveMany(uniqueGrpIds);

    Array.from(resolved.entries()).forEach(([grpId, card]) => {
      // Skip entries with numeric localization ID names
      if (!/^\d+$/.test(card.name)) {
        this.gameEngine!.resolveCard(grpId, card);
      }
    });

    // Fallback: fill unresolved entries from gameObject names (covers Alchemy/older cards)
    const objectNames = this.gameEngine.getObjectNames();
    for (const grpId of uniqueGrpIds) {
      const existing = resolved.get(grpId);
      if (existing && !existing.name.startsWith('Unknown') && !/^\d+$/.test(existing.name)) continue;
      const name = objectNames.get(grpId);
      if (name && !/^\d+$/.test(name)) {
        this.gameEngine.resolveCard(grpId, {
          grpId,
          name,
          manaCost: null,
          cmc: 0,
          typeLine: null,
          oracleText: null,
          imageUriSmall: null,
          imageUriNormal: null,
        });
      }
    }

    // Emit updated state with resolved names
    this.emit('game-state', this.gameEngine.getState());
  }

  /**
   * Get current game state (if a match is active).
   * Falls back to last saved snapshot for post-match display.
   */
  getGameState(): GameStateSnapshot | null {
    return this.gameEngine?.getState() ?? this.lastGameStateSnapshot;
  }

  /**
   * Get accumulated game log entries for the current/last match.
   */
  getLogHistory(): GameLogEntry[] {
    return this.logHistory;
  }

  /**
   * Get match info even after match has ended.
   */
  getLastMatchInfo(): typeof this.lastMatchInfo {
    return this.lastMatchInfo;
  }

  getStatus() {
    return {
      running: this.running,
      logPath: this.logPath,
      matchCount: this.matchCount,
      hasActiveGame: this.gameEngine !== null,
    };
  }
}
