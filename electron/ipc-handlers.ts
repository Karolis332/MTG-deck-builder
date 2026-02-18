import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { ArenaLogWatcher } from './arena-log-watcher';
import { parseArenaLogFile } from '../src/lib/arena-log-reader';
import { GrpIdResolver } from '../src/lib/grp-id-resolver';
import { analyzeMulligan } from '../src/lib/mulligan-advisor';
import type { GameStateSnapshot, ResolvedCard } from '../src/lib/game-state-engine';
import type { TelemetryFlushData } from '../src/lib/match-telemetry';

let watcher: ArenaLogWatcher | null = null;
let mlProcess: ChildProcess | null = null;
let resolver: GrpIdResolver | null = null;
let arenaDbUpdateInProgress = false;

// ── Telemetry retry queue ────────────────────────────────────────────────
// Flushes that fail (server not ready during catch-up) are queued and retried.
let serverReady = false;
const telemetryQueue: TelemetryFlushData[] = [];
let retryTimer: ReturnType<typeof setInterval> | null = null;

function markServerReady(): void {
  if (serverReady) return;
  serverReady = true;
  traceLog(`server marked ready, draining ${telemetryQueue.length} queued telemetry flushes`);
  drainTelemetryQueue();
}

function drainTelemetryQueue(): void {
  while (telemetryQueue.length > 0) {
    const item = telemetryQueue.shift()!;
    postToApi('/api/arena-telemetry', item);
  }
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

function queueTelemetryFlush(data: TelemetryFlushData): void {
  if (serverReady) {
    postToApi('/api/arena-telemetry', data);
    return;
  }
  traceLog(`server not ready, queuing telemetry flush (${data.actions.length} actions, queue size: ${telemetryQueue.length + 1})`);
  telemetryQueue.push(data);
  // Start a retry timer to periodically check if server is up
  if (!retryTimer) {
    retryTimer = setInterval(() => {
      probeServerReady();
    }, 2000);
  }
}

function probeServerReady(): void {
  const port = process.env.PORT || '3000';
  const req = http.request(
    { hostname: 'localhost', port, path: '/api/cards/search?q=_healthcheck_', method: 'GET', timeout: 2000 },
    (res) => {
      res.resume();
      // Any response means server is up
      markServerReady();
    }
  );
  req.on('error', () => { /* server still not ready */ });
  req.on('timeout', () => { req.destroy(); });
  req.end();
}

// File-based trace log for debugging watcher startup
const TRACE_LOG = path.join(process.env.APPDATA || '.', 'the-black-grimoire', 'telemetry-debug.log');
function traceLog(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  try { fs.appendFileSync(TRACE_LOG, `[${ts}] IPC: ${msg}\n`); } catch { /* ignore */ }
  console.log(`[IPC] ${msg}`);
}

/**
 * Ensure the Arena log watcher is running.
 * Called from main.ts when the overlay opens.
 * Uses the default log path if no watcher is active.
 */
export { markServerReady };

export function ensureWatcherRunning(): void {
  traceLog(`ensureWatcherRunning called, watcher=${!!watcher}`);
  if (watcher) return; // Already running

  const logPath = getDefaultLogPath();
  traceLog(`logPath=${logPath}, exists=${fs.existsSync(logPath)}`);
  if (!fs.existsSync(logPath)) {
    traceLog('Arena log not found — aborting');
    return;
  }

  traceLog('Auto-starting watcher with catchUp=true');
  startWatcherInternal(logPath, true);
}

function getDefaultLogPath(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || '';
    return path.join(
      appData, '..', 'LocalLow',
      'Wizards Of The Coast', 'MTGA', 'Player.log'
    );
  }

  if (process.platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library', 'Logs', 'Wizards Of The Coast', 'MTGA', 'Player.log'
    );
  }

  // Linux — try Steam/Proton first, then Wine
  const steamPath = path.join(
    os.homedir(),
    '.steam', 'steam', 'steamapps', 'compatdata', '2141910',
    'pfx', 'drive_c', 'users', 'steamuser', 'AppData',
    'LocalLow', 'Wizards Of The Coast', 'MTGA', 'Player.log'
  );
  if (fs.existsSync(steamPath)) return steamPath;

  // Wine fallback
  return path.join(
    os.homedir(),
    '.wine', 'drive_c', 'users',
    os.userInfo().username, 'AppData',
    'LocalLow', 'Wizards Of The Coast', 'MTGA', 'Player.log'
  );
}

/** POST JSON to a local API route */
function postToApi(route: string, body: unknown): void {
  const data = JSON.stringify(body);
  const port = process.env.PORT || '3000';

  const req = http.request(
    {
      hostname: 'localhost',
      port,
      path: route,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    },
    (res) => {
      // Consume response to free memory
      res.resume();
    }
  );

  req.on('error', (err) => {
    console.error(`Failed to POST to ${route}:`, err.message);
  });

  req.write(data);
  req.end();
}

/** Broadcast to all windows */
function broadcast(channel: string, ...args: unknown[]): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
}

/** Get or create GrpIdResolver with DB */
function getResolver(): GrpIdResolver {
  if (!resolver) {
    resolver = new GrpIdResolver();
    // Try to set DB — will be available after Next.js server starts
    try {
      const dbPath = process.env.MTG_DB_DIR
        ? path.join(process.env.MTG_DB_DIR, 'mtg-deck-builder.db')
        : path.join(process.cwd(), 'data', 'mtg-deck-builder.db');
      if (fs.existsSync(dbPath)) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Database = require('better-sqlite3');
        const db = new Database(dbPath, { readonly: false });
        resolver.setDb(db);
      }
    } catch {
      // DB not available yet — resolver will use API fallback
    }
  }
  return resolver;
}

function startWatcherInternal(logPath: string, catchUp = false): { ok: boolean; error?: string } {
  traceLog(`startWatcherInternal: logPath=${logPath}, catchUp=${catchUp}`);
  try {
    if (watcher) {
      traceLog('stopping existing watcher');
      watcher.stop();
      watcher.removeAllListeners();
    }

    if (!fs.existsSync(logPath)) {
      traceLog('log file not found');
      return { ok: false, error: `Log file not found: ${logPath}` };
    }

    traceLog('creating ArenaLogWatcher');
    watcher = new ArenaLogWatcher(logPath, 500, catchUp);
    watcher.setResolver(getResolver());

    // Legacy match/collection events
    watcher.on('match', (match) => {
      broadcast('watcher-new-match', match);
      postToApi('/api/arena-matches', match);
    });

    watcher.on('collection', (collection) => {
      broadcast('watcher-collection', collection);
      postToApi('/api/arena-collection', { collection });
    });

    watcher.on('error', (err) => {
      broadcast('watcher-error', err);
    });

    // ── Overlay events ──────────────────────────────────────────────────

    watcher.on('game-state', (state: GameStateSnapshot) => {
      broadcast('game-state-update', state);
    });

    watcher.on('match-start', (data: { matchId: string; format: string | null; playerName: string | null; opponentName: string | null }) => {
      broadcast('match-started', data);
    });

    watcher.on('match-end', (data: { matchId: string; result: string }) => {
      broadcast('match-ended', data);
    });

    watcher.on('mulligan', (data: { hand: number[]; mulliganCount: number; seatId: number }) => {
      broadcast('mulligan-prompt', data);
    });

    watcher.on('intermission', (data: { matchId: string | null; gameNumber: number; opponentCardsSeen: number[] }) => {
      broadcast('intermission-start', data);
    });

    // ── Telemetry persistence ───────────────────────────────────────────────
    watcher.on('telemetry-flush', (data: TelemetryFlushData) => {
      queueTelemetryFlush(data);
    });

    traceLog('calling watcher.start()');
    watcher.start();
    traceLog('watcher.start() completed OK');
    return { ok: true };
  } catch (err) {
    traceLog(`startWatcherInternal ERROR: ${err}`);
    return { ok: false, error: String(err) };
  }
}

// ── Arena Card DB CDN Update ────────────────────────────────────────────

function getAppDb(): ReturnType<typeof import('better-sqlite3')> | null {
  try {
    const dbPath = process.env.MTG_DB_DIR
      ? path.join(process.env.MTG_DB_DIR, 'mtg-deck-builder.db')
      : path.join(process.cwd(), 'data', 'mtg-deck-builder.db');
    if (!fs.existsSync(dbPath)) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    return new Database(dbPath, { readonly: false });
  } catch {
    return null;
  }
}

/**
 * Check Wizards CDN for a newer Arena card database and update grp_id_cache if found.
 * Non-blocking — logs progress to trace log.
 * Skips if already checked within the last 24 hours.
 */
export async function checkArenaCardDbUpdate(): Promise<{ updated: boolean; version?: string; count?: number; error?: string }> {
  if (arenaDbUpdateInProgress) {
    return { updated: false, error: 'Update already in progress' };
  }

  arenaDbUpdateInProgress = true;
  traceLog('checkArenaCardDbUpdate: starting');

  try {
    const db = getAppDb();
    if (!db) {
      traceLog('checkArenaCardDbUpdate: database not available');
      return { updated: false, error: 'Database not available' };
    }

    // Check last update time — skip if <24h
    let lastCheck = '';
    let storedVersion = '';
    try {
      const checkRow = db.prepare("SELECT value FROM app_state WHERE key = 'arena_card_db_last_check'").get() as { value: string } | undefined;
      lastCheck = checkRow?.value || '';
      const verRow = db.prepare("SELECT value FROM app_state WHERE key = 'arena_card_db_version'").get() as { value: string } | undefined;
      storedVersion = verRow?.value || '';
    } catch {
      // app_state may not exist yet
    }

    if (lastCheck) {
      const elapsed = Date.now() - new Date(lastCheck).getTime();
      if (elapsed < 24 * 60 * 60 * 1000) {
        traceLog(`checkArenaCardDbUpdate: checked ${(elapsed / 3600000).toFixed(1)}h ago — skipping`);
        db.close();
        return { updated: false };
      }
    }

    // Fetch current Arena version from CDN
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchText, parseVersionResponse, VERSION_URL: versionUrl, downloadArenaCardDb } = require('../scripts/download_arena_card_db.js');
    let cdnVersion: string;
    try {
      const raw = await fetchText(versionUrl);
      const parsed = parseVersionResponse(raw);
      cdnVersion = parsed.version;
    } catch (err) {
      traceLog(`checkArenaCardDbUpdate: version fetch failed: ${err}`);
      // Record check time even on failure to avoid hammering
      try {
        db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES ('arena_card_db_last_check', ?)").run(new Date().toISOString());
      } catch { /* ignore */ }
      db.close();
      return { updated: false, error: `Version check failed: ${err}` };
    }

    traceLog(`checkArenaCardDbUpdate: CDN version=${cdnVersion}, stored=${storedVersion}`);

    // Record check time
    try {
      db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES ('arena_card_db_last_check', ?)").run(new Date().toISOString());
    } catch { /* ignore */ }

    if (cdnVersion === storedVersion) {
      traceLog('checkArenaCardDbUpdate: version unchanged — no update needed');
      db.close();
      return { updated: false, version: cdnVersion };
    }

    // Version changed — download and update
    traceLog(`checkArenaCardDbUpdate: new version detected, downloading...`);
    broadcast('arena-card-db-update', { status: 'downloading', version: cdnVersion });

    const tmpOutput = path.join(os.tmpdir(), `arena_grp_ids_${Date.now()}.json`);
    let result: { version: string; count: number; cards: Record<string, string> };
    try {
      result = await downloadArenaCardDb(tmpOutput);
    } catch (err) {
      traceLog(`checkArenaCardDbUpdate: download failed: ${err}`);
      broadcast('arena-card-db-update', { status: 'error', error: String(err) });
      db.close();
      return { updated: false, error: `Download failed: ${err}` };
    }

    // Bulk insert into grp_id_cache
    traceLog(`checkArenaCardDbUpdate: inserting ${result.count} cards into grp_id_cache`);
    broadcast('arena-card-db-update', { status: 'importing', count: result.count });

    // Ensure grp_id_cache table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS grp_id_cache (
        grp_id INTEGER PRIMARY KEY,
        card_name TEXT NOT NULL,
        scryfall_id TEXT,
        image_uri_small TEXT,
        image_uri_normal TEXT,
        mana_cost TEXT,
        cmc REAL,
        type_line TEXT,
        oracle_text TEXT,
        source TEXT DEFAULT 'arena_cdn',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    const insert = db.prepare(
      `INSERT OR IGNORE INTO grp_id_cache (grp_id, card_name, source) VALUES (?, ?, 'arena_cdn')`
    );

    const bulkInsert = db.transaction(() => {
      let inserted = 0;
      for (const [grpId, name] of Object.entries(result.cards)) {
        const res = insert.run(parseInt(grpId, 10), name);
        if (res.changes > 0) inserted++;
      }
      return inserted;
    });

    const inserted = bulkInsert();

    // Store version and check time
    db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES ('arena_card_db_version', ?)").run(result.version);
    db.close();

    // Also update the bundled file if in dev mode
    const isDev = !app.isPackaged;
    if (isDev) {
      const devOutput = path.join(path.resolve(__dirname, '..'), 'data', 'arena_grp_ids.json');
      try {
        fs.copyFileSync(tmpOutput, devOutput);
        traceLog(`checkArenaCardDbUpdate: updated dev file at ${devOutput}`);
      } catch { /* non-critical */ }
    }

    // Clean up temp file
    try { fs.unlinkSync(tmpOutput); } catch { /* ignore */ }

    traceLog(`checkArenaCardDbUpdate: done — inserted ${inserted} new, version ${result.version}`);
    broadcast('arena-card-db-update', { status: 'complete', version: result.version, inserted, total: result.count });

    return { updated: true, version: result.version, count: inserted };
  } catch (err) {
    traceLog(`checkArenaCardDbUpdate: unexpected error: ${err}`);
    return { updated: false, error: String(err) };
  } finally {
    arenaDbUpdateInProgress = false;
  }
}

export function registerIpcHandlers(): void {
  // ── File operations ──────────────────────────────────────────────────────

  ipcMain.handle('select-arena-log-path', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Arena Player.log',
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
      defaultPath: getDefaultLogPath(),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('read-arena-log', async (_event, filePath: string) => {
    return fs.readFileSync(filePath, { encoding: 'utf-8' });
  });

  ipcMain.handle('get-default-arena-log-path', () => {
    return getDefaultLogPath();
  });

  ipcMain.handle('parse-full-log', async (_event, filePath: string) => {
    const text = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const result = parseArenaLogFile(text);
    return result;
  });

  // ── Platform ─────────────────────────────────────────────────────────────

  ipcMain.handle('get-platform', () => process.platform);

  // ── Watcher controls ─────────────────────────────────────────────────────

  ipcMain.handle('start-watcher', (_event, logPath: string) => {
    return startWatcherInternal(logPath);
  });

  ipcMain.handle('stop-watcher', async () => {
    if (watcher) {
      watcher.stop();
      watcher.removeAllListeners();
      watcher = null;
    }
  });

  ipcMain.handle('get-watcher-status', () => {
    if (!watcher) {
      return { running: false, logPath: null, matchCount: 0, hasActiveGame: false };
    }
    return watcher.getStatus();
  });

  // ── Overlay controls ────────────────────────────────────────────────────

  ipcMain.handle('toggle-overlay', (_event, { visible }: { visible: boolean }) => {
    // Handled in main.ts via the overlayWindow reference
    broadcast('overlay-toggle', visible);
  });

  ipcMain.handle('set-overlay-opacity', (_event, { opacity }: { opacity: number }) => {
    broadcast('overlay-opacity', opacity);
  });

  ipcMain.handle('get-mulligan-advice', async (_event, data: {
    hand: number[];
    deckList: Array<{ grpId: number; qty: number }>;
    format: string | null;
    archetype: string | null;
    commanderGrpIds?: number[];
    mulliganCount: number;
  }) => {
    const res = getResolver();
    const grpIds = [...data.hand, ...data.deckList.map(d => d.grpId)];
    const resolved = await res.resolveMany(grpIds);

    const cardMap = {
      get: (grpId: number) => resolved.get(grpId) ?? null,
    };

    // Build deck info
    const deckLandCount = data.deckList.reduce((count, entry) => {
      const card = resolved.get(entry.grpId);
      if (card?.typeLine && /\bland\b/i.test(card.typeLine)) {
        return count + entry.qty;
      }
      return count;
    }, 0);

    const totalCards = data.deckList.reduce((sum, e) => sum + e.qty, 0);
    const deckColors: string[] = [];
    // Infer colors from mana costs
    Array.from(resolved.values()).forEach((card) => {
      if (card.manaCost) {
        if (card.manaCost.includes('W') && !deckColors.includes('W')) deckColors.push('W');
        if (card.manaCost.includes('U') && !deckColors.includes('U')) deckColors.push('U');
        if (card.manaCost.includes('B') && !deckColors.includes('B')) deckColors.push('B');
        if (card.manaCost.includes('R') && !deckColors.includes('R')) deckColors.push('R');
        if (card.manaCost.includes('G') && !deckColors.includes('G')) deckColors.push('G');
      }
    });

    let commanderOracleText: string | undefined;
    if (data.commanderGrpIds && data.commanderGrpIds.length > 0) {
      const cmdCard = resolved.get(data.commanderGrpIds[0]);
      if (cmdCard) commanderOracleText = cmdCard.oracleText ?? undefined;
    }

    const deckInfo = {
      totalCards,
      landCount: deckLandCount,
      avgCmc: 0,
      colors: deckColors,
      commanderGrpIds: data.commanderGrpIds,
      commanderOracleText,
    };

    const advice = analyzeMulligan(
      data.hand,
      deckInfo,
      data.format,
      data.archetype as import('../src/lib/deck-templates').Archetype | null,
      cardMap,
      data.mulliganCount,
    );

    return advice;
  });

  ipcMain.handle('get-sideboard-guide', async (_event, data: { deckId: number }) => {
    // Delegate to API route
    const port = process.env.PORT || '3000';
    try {
      const resp = await fetch(`http://localhost:${port}/api/sideboard-guide?deckId=${data.deckId}`);
      const json = await resp.json();
      return json;
    } catch (err) {
      return { error: String(err) };
    }
  });

  ipcMain.handle('get-game-state', () => {
    return watcher?.getGameState() ?? null;
  });

  ipcMain.handle('resolve-grp-ids', async (_event, grpIds: number[]) => {
    const res = getResolver();
    const resolved = await res.resolveMany(grpIds);
    return Object.fromEntries(resolved);
  });

  // ── MTGA Card Data Import ───────────────────────────────────────────────

  ipcMain.handle('import-mtga-cards', async (_event, mtgaPath?: string) => {
    try {
      const candidates = process.platform === 'win32'
        ? ['py', 'python3', 'python']
        : ['python3', 'python'];

      let pythonCmd = '';
      for (const cmd of candidates) {
        try {
          execSync(`${cmd} --version`, { stdio: 'pipe', timeout: 5000 });
          pythonCmd = cmd;
          break;
        } catch { /* try next */ }
      }

      if (!pythonCmd) return { ok: false, error: 'Python not found' };

      const isDev = !app.isPackaged;
      const projectDir = isDev ? path.resolve(__dirname, '..') : process.resourcesPath;
      const scriptPath = path.join(projectDir, 'scripts', 'import_mtga_cards.py');
      const dbPath = isDev
        ? path.join(path.resolve(__dirname, '..'), 'data', 'mtg-deck-builder.db')
        : path.join(app.getPath('userData'), 'data', 'mtg-deck-builder.db');

      if (!fs.existsSync(scriptPath)) {
        return { ok: false, error: 'Import script not found' };
      }

      const args = [scriptPath, '--db', dbPath];
      if (mtgaPath) args.push('--mtga-path', mtgaPath);

      const result = execSync(`${pythonCmd} ${args.map(a => `"${a}"`).join(' ')}`, {
        cwd: isDev ? path.resolve(__dirname, '..') : app.getPath('userData'),
        timeout: 60000,
        encoding: 'utf-8',
      });

      return { ok: true, output: result };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('select-mtga-path', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select MTGA Installation Folder',
      properties: ['openDirectory'],
      defaultPath: 'C:\\Program Files\\Wizards of the Coast\\MTGA',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // ── Arena Card DB CDN Update ────────────────────────────────────────────

  ipcMain.handle('update-arena-card-db', async () => {
    return checkArenaCardDbUpdate();
  });

  // ── ML Pipeline ─────────────────────────────────────────────────────────

  ipcMain.handle('run-ml-pipeline', (_event, options: { steps?: string; target?: string }) => {
    if (mlProcess) {
      return { ok: false, error: 'Pipeline is already running' };
    }

    try {
      // Find Python executable
      const candidates = process.platform === 'win32'
        ? ['py', 'python3', 'python']
        : ['python3', 'python'];

      let pythonCmd = '';
      for (const cmd of candidates) {
        try {
          execSync(`${cmd} --version`, { stdio: 'pipe', timeout: 5000 });
          pythonCmd = cmd;
          break;
        } catch {
          // try next
        }
      }

      if (!pythonCmd) {
        return { ok: false, error: 'Python not found. Install Python 3.x.' };
      }

      // In production, scripts are bundled as extraResources and DB is in userData.
      // In dev, both live under the project root.
      const isDev = !app.isPackaged;
      const projectDir = isDev
        ? path.resolve(__dirname, '..')
        : process.resourcesPath;
      const scriptPath = path.join(projectDir, 'scripts', 'pipeline.py');
      const dbPath = isDev
        ? path.join(path.resolve(__dirname, '..'), 'data', 'mtg-deck-builder.db')
        : path.join(app.getPath('userData'), 'data', 'mtg-deck-builder.db');

      if (!fs.existsSync(scriptPath)) {
        return { ok: false, error: `Pipeline script not found at: ${scriptPath}` };
      }

      const args = [scriptPath, '--db', dbPath];

      switch (options.steps) {
        case 'aggregate-train-predict':
          args.push('--skip-scrape', '--skip-articles', '--skip-mtgjson', '--skip-edhrec', '--skip-arena');
          break;
        case 'train-predict':
          args.push('--skip-scrape', '--skip-articles', '--skip-mtgjson', '--skip-edhrec', '--skip-arena');
          break;
        case 'predict':
          args.push('--only', 'predict');
          break;
        // 'full' or undefined → no extra flags
      }

      const broadcastPipeline = (data: { type: string; line: string; code?: number }) => {
        broadcast('ml-pipeline-output', data);
      };

      broadcastPipeline({ type: 'info', line: `$ ${pythonCmd} scripts/pipeline.py ${args.slice(1).join(' ')}` });

      const child = spawn(pythonCmd, args, {
        cwd: isDev ? path.resolve(__dirname, '..') : app.getPath('userData'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      mlProcess = child;

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.trim()) broadcastPipeline({ type: 'stdout', line });
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.trim()) broadcastPipeline({ type: 'stderr', line });
        }
      });

      child.on('close', (code) => {
        mlProcess = null;
        broadcastPipeline({ type: 'exit', line: `Process exited with code ${code}`, code: code ?? -1 });
      });

      child.on('error', (err) => {
        mlProcess = null;
        broadcastPipeline({ type: 'error', line: err.message });
      });

      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('cancel-ml-pipeline', () => {
    if (mlProcess) {
      mlProcess.kill();
      mlProcess = null;
    }
  });
}
