/**
 * IPC handlers for the first-run setup wizard.
 * These handle database init, account creation, card seeding,
 * and arena log configuration during the setup flow.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { saveConfig, transitionToMainApp } from './main';

function getDbDir(): string {
  return process.env.MTG_DB_DIR || path.join(process.cwd(), 'data');
}

function getDefaultArenaLogPath(): string {
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

  // Linux — try Steam/Proton first
  const steamPath = path.join(
    os.homedir(),
    '.steam', 'steam', 'steamapps', 'compatdata', '2141910',
    'pfx', 'drive_c', 'users', 'steamuser', 'AppData',
    'LocalLow', 'Wizards Of The Coast', 'MTGA', 'Player.log'
  );
  if (fs.existsSync(steamPath)) return steamPath;

  return path.join(
    os.homedir(),
    '.wine', 'drive_c', 'users',
    os.userInfo().username, 'AppData',
    'LocalLow', 'Wizards Of The Coast', 'MTGA', 'Player.log'
  );
}

export function registerSetupHandlers(): void {
  // ── Database initialization ─────────────────────────────────────────────

  ipcMain.handle('setup:init-database', async () => {
    const dbDir = getDbDir();

    // Ensure data directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // The database and migrations are created automatically when the Next.js
    // server starts (via getDb() → createDatabase() → runMigrations()).
    // For the setup wizard, we just ensure the directory is ready.
    return { ok: true, dbDir };
  });

  // ── Account creation ────────────────────────────────────────────────────

  ipcMain.handle('setup:create-account', async (_event, data: {
    username: string;
    email: string;
    password: string;
  }) => {
    // We need to create the account via the Next.js API once the server is running.
    // For now, store the credentials so the app can auto-register on first boot.
    saveConfig({
      pendingAccount: {
        username: data.username,
        email: data.email,
        password: data.password,
      },
    });
    return { ok: true };
  });

  // ── Card database seeding ───────────────────────────────────────────────

  ipcMain.handle('setup:seed-cards', async (event) => {
    // Mark that seeding is requested — it will happen when the Next.js server starts
    saveConfig({ seedOnBoot: true });

    // Send progress updates to the setup window
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.send('setup:seed-progress', {
        percent: 10,
        message: 'Card seeding will begin when the app launches...',
      });
    }

    // We can't seed directly from here because the DB is managed by Next.js API routes.
    // Instead, flag it and the main app will trigger /api/cards/seed on first load.
    return { ok: true };
  });

  // ── Arena log path ──────────────────────────────────────────────────────

  ipcMain.handle('setup:get-default-arena-path', () => {
    return getDefaultArenaLogPath();
  });

  ipcMain.handle('setup:select-arena-log', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Arena Player.log',
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
      defaultPath: getDefaultArenaLogPath(),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // ── CF recommendation engine connectivity probe ─────────────────────────

  ipcMain.handle('setup:test-cf-api', async (_event, data: { url: string; apiKey: string }) => {
    const base = data.url.replace(/\/+$/, '');
    const healthUrl = `${base}/health`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const headers: Record<string, string> = {};
      if (data.apiKey) headers['x-api-key'] = data.apiKey;

      const res = await fetch(healthUrl, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        return { ok: false, error: `${res.status} ${res.statusText}` };
      }

      const body = await res.json() as {
        status?: string;
        deck_count?: number;
        model_version?: string;
      };

      return {
        ok: true,
        modelVersion: body.model_version ?? 'unknown',
        deckCount: body.deck_count ?? 0,
        requiresAuth: false,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : 'unknown error';
      return { ok: false, error: message };
    }
  });

  // ── Save config ─────────────────────────────────────────────────────────

  ipcMain.handle('setup:save-config', async (_event, config: Record<string, unknown>) => {
    saveConfig(config);
    return { ok: true };
  });

  // ── Launch main app (transition from setup) ─────────────────────────────

  ipcMain.handle('setup:launch-app', async () => {
    await transitionToMainApp();
    return { ok: true };
  });
}
