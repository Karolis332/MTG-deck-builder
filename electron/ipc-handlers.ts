import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { ArenaLogWatcher } from './arena-log-watcher';
import { parseArenaLogFile } from '../src/lib/arena-log-reader';

let watcher: ArenaLogWatcher | null = null;

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
}
