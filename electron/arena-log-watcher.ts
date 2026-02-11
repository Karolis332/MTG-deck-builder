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
import { EventEmitter } from 'events';
import {
  parseArenaLogFile,
  extractJsonBlocks,
  type ArenaMatch,
  type JsonBlock,
} from '../src/lib/arena-log-reader';
import { extractGameEvents, type ArenaGameEvent } from '../src/lib/arena-game-events';
import { GameStateEngine, type GameStateSnapshot } from '../src/lib/game-state-engine';
import { GrpIdResolver } from '../src/lib/grp-id-resolver';

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
  private streamingBuffer = '';

  constructor(logPath: string, pollInterval = 500) {
    super();
    this.logPath = logPath;
    this.pollInterval = pollInterval;
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

    try {
      const stat = fs.statSync(this.logPath);
      // Seek to end — only process new content
      this.lastPosition = stat.size;
      this.lastInode = stat.ino;
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
    this.streamingBuffer = '';
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
      }

      // Truncation detection (file smaller than last read position)
      if (stat.size < this.lastPosition) {
        this.lastPosition = 0;
        this.buffer = [];
        this.streamingBuffer = '';
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
   */
  private processContentStreaming(content: string): void {
    this.streamingBuffer += content;

    // Extract JSON blocks from the accumulated streaming buffer
    const blocks = extractJsonBlocks(this.streamingBuffer);
    if (blocks.length === 0) return;

    // Extract granular events
    const events = extractGameEvents(blocks);

    for (const event of events) {
      this.handleStreamingEvent(event);
    }

    // Keep only the last portion of the buffer to handle split blocks
    // Trim to last 50KB to prevent unbounded growth
    if (this.streamingBuffer.length > 50000) {
      this.streamingBuffer = this.streamingBuffer.slice(-25000);
    }
  }

  private handleStreamingEvent(event: ArenaGameEvent): void {
    switch (event.type) {
      case 'match_start': {
        // Create new engine for this match
        this.gameEngine = new GameStateEngine();
        this.gameEngine.processEvent(event);
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
          this.emit('match-end', {
            matchId: event.matchId,
            result: event.result,
          });
          this.gameEngine = null;
        }
        break;
      }

      case 'mulligan_prompt': {
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
          const state = this.gameEngine.getState();
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
          // Resolve card names for the deck
          this.resolveDecklist(event.deckCards.map(c => c.grpId));
        }
        break;
      }

      default: {
        // Feed all other events to the engine
        if (this.gameEngine) {
          this.gameEngine.processEvent(event);
        }
        break;
      }
    }

    // Emit raw event for anything that wants granular updates
    this.emit('game-event', event);
  }

  /**
   * Resolve card names for a list of grpIds and update the engine.
   */
  private async resolveDecklist(grpIds: number[]): Promise<void> {
    if (!this.resolver || !this.gameEngine) return;

    const uniqueGrpIds = Array.from(new Set(grpIds));
    const resolved = await this.resolver.resolveMany(uniqueGrpIds);

    Array.from(resolved.entries()).forEach(([grpId, card]) => {
      this.gameEngine!.resolveCard(grpId, card);
    });

    // Emit updated state with resolved names
    this.emit('game-state', this.gameEngine.getState());
  }

  /**
   * Get current game state (if a match is active).
   */
  getGameState(): GameStateSnapshot | null {
    return this.gameEngine?.getState() ?? null;
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
