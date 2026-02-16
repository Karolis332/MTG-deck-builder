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

let watcher: ArenaLogWatcher | null = null;
let mlProcess: ChildProcess | null = null;
let resolver: GrpIdResolver | null = null;

/**
 * Ensure the Arena log watcher is running.
 * Called from main.ts when the overlay opens.
 * Uses the default log path if no watcher is active.
 */
export function ensureWatcherRunning(): void {
  if (watcher) return; // Already running

  const logPath = getDefaultLogPath();
  if (!fs.existsSync(logPath)) {
    console.log('[Watcher] Arena log not found at:', logPath);
    return;
  }

  console.log('[Watcher] Auto-starting for overlay:', logPath);
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
  try {
    if (watcher) {
      watcher.stop();
      watcher.removeAllListeners();
    }

    if (!fs.existsSync(logPath)) {
      return { ok: false, error: `Log file not found: ${logPath}` };
    }

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

    watcher.start();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
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
