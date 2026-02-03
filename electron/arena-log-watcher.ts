/**
 * Background file watcher for MTG Arena Player.log.
 * Port of scripts/arena_watcher.py.
 *
 * Polls the log file for new content and emits parsed match/collection events.
 * Handles log rotation (inode change) and truncation (file reset).
 */

import fs from 'fs';
import { EventEmitter } from 'events';
import {
  parseArenaLogFile,
  type ArenaMatch,
} from '../src/lib/arena-log-reader';

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

  constructor(logPath: string, pollInterval = 500) {
    super();
    this.logPath = logPath;
    this.pollInterval = pollInterval;
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
      }

      // Truncation detection (file smaller than last read position)
      if (stat.size < this.lastPosition) {
        this.lastPosition = 0;
        this.buffer = [];
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
      this.processContent(newContent);
    } catch (err) {
      this.emit('error', String(err));
    }
  }

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

  getStatus() {
    return {
      running: this.running,
      logPath: this.logPath,
      matchCount: this.matchCount,
    };
  }
}
