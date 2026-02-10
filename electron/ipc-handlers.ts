import { ipcMain, dialog, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { ArenaLogWatcher } from './arena-log-watcher';
import { parseArenaLogFile } from '../src/lib/arena-log-reader';

let watcher: ArenaLogWatcher | null = null;
let mlProcess: ChildProcess | null = null;

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

  ipcMain.handle('start-watcher', (event, logPath: string) => {
    try {
      if (watcher) {
        watcher.stop();
        watcher.removeAllListeners();
      }

      if (!fs.existsSync(logPath)) {
        return { ok: false, error: `Log file not found: ${logPath}` };
      }

      watcher = new ArenaLogWatcher(logPath);

      watcher.on('match', (match) => {
        // Forward to renderer
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send('watcher-new-match', match);
        }
        // Store via API
        postToApi('/api/arena-matches', match);
      });

      watcher.on('collection', (collection) => {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send('watcher-collection', collection);
        }
        // Store via API
        postToApi('/api/arena-collection', { collection });
      });

      watcher.on('error', (err) => {
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send('watcher-error', err);
        }
      });

      watcher.start();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
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
      return { running: false, logPath: null, matchCount: 0 };
    }
    return watcher.getStatus();
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

      const projectDir = path.resolve(__dirname, '..');
      const scriptPath = path.join(projectDir, 'scripts', 'pipeline.py');
      const dbPath = path.join(projectDir, 'data', 'mtg-deck-builder.db');

      const args = [scriptPath, '--db', dbPath];

      switch (options.steps) {
        case 'aggregate-train-predict':
          args.push('--skip-scrape', '--skip-mtgjson', '--skip-edhrec', '--skip-arena');
          break;
        case 'train-predict':
          args.push('--skip-scrape', '--skip-mtgjson', '--skip-edhrec', '--skip-arena');
          break;
        case 'predict':
          args.push('--only', 'predict');
          break;
        // 'full' or undefined → no extra flags
      }

      const broadcast = (data: { type: string; line: string; code?: number }) => {
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('ml-pipeline-output', data);
        });
      };

      broadcast({ type: 'info', line: `$ ${pythonCmd} scripts/pipeline.py ${args.slice(1).join(' ')}` });

      const child = spawn(pythonCmd, args, {
        cwd: projectDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      mlProcess = child;

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.trim()) broadcast({ type: 'stdout', line });
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.trim()) broadcast({ type: 'stderr', line });
        }
      });

      child.on('close', (code) => {
        mlProcess = null;
        broadcast({ type: 'exit', line: `Process exited with code ${code}`, code: code ?? -1 });
      });

      child.on('error', (err) => {
        mlProcess = null;
        broadcast({ type: 'error', line: err.message });
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
