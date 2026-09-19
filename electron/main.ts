import './register-aliases'; // MUST be first: enables '@/...' requires in the main process
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import { autoUpdater } from 'electron-updater';
import { registerIpcHandlers, ensureWatcherRunning, isWatcherRunning, markServerReady, checkArenaCardDbUpdate } from './ipc-handlers';
import { setupBackgroundRecording, destroyTray, isQuitting, markQuitting, startedHidden } from './background-recording';
import { registerSetupHandlers } from './setup-handlers';
import { runFirstBootActions, seedArenaCardCache, setFirstBootLogger } from '../src/lib/first-boot';
import { isOverwolfRuntime } from './platform-detect';
import type { OverwolfOverlayManager } from './overwolf-overlay';
import type { OverwolfGepHandler } from './overwolf-gep';

let overwolfOverlay: OverwolfOverlayManager | null = null;
let overwolfGep: OverwolfGepHandler | null = null;

// Immediate startup trace — verifies our compiled code is running
const _TRACE = path.join(process.env.APPDATA || '.', 'the-black-grimoire', 'telemetry-debug.log');
function mainTrace(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  try { fs.appendFileSync(_TRACE, `[${ts}] MAIN: ${msg}\n`); } catch { /* */ }
}
mainTrace('main.ts loaded — module init');

// ── Crash logging ────────────────────────────────────────────────────────
// Capture uncaught errors to a log file before anything else runs.
function getCrashLogPath(): string {
  try {
    return path.join(app.getPath('userData'), 'crash.log');
  } catch {
    return path.join(path.dirname(process.execPath), 'crash.log');
  }
}

function logCrash(label: string, err: unknown): void {
  const msg = `[${new Date().toISOString()}] ${label}: ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
  try {
    fs.appendFileSync(getCrashLogPath(), msg);
  } catch {
    // Last resort: write next to the exe
    try {
      fs.appendFileSync(path.join(path.dirname(process.execPath), 'crash.log'), msg);
    } catch { /* truly nothing we can do */ }
  }
}

process.on('uncaughtException', (err) => {
  logCrash('uncaughtException', err);
  dialog.showErrorBox('The Black Grimoire - Fatal Error', err.message || String(err));
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logCrash('unhandledRejection', reason);
});

let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

// Allow running as root on Linux (e.g. WSL, Docker)
app.commandLine.appendSwitch('no-sandbox');

const isDev = !app.isPackaged;
let PORT = process.env.PORT || '3000';

// ── Data directories ────────────────────────────────────────────────────

function getUserDataDir(): string {
  return path.join(app.getPath('userData'), 'data');
}

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'app-config.json');
}

export function loadConfig(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveConfig(data: Record<string, unknown>): void {
  const existing = loadConfig();
  const merged = { ...existing, ...data };
  fs.writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2), 'utf-8');
}

function isFirstRun(): boolean {
  const config = loadConfig();
  return config.setupComplete !== true;
}

// ── Port utilities ──────────────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${startPort + 9}`);
}

// ── Windows ─────────────────────────────────────────────────────────────

function createSetupWindow(): void {
  setupWindow = new BrowserWindow({
    width: 640,
    height: 580,
    resizable: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'setup-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'The Black Grimoire - Setup',
    show: false,
    backgroundColor: '#0a0a0f',
  });

  setupWindow.once('ready-to-show', () => {
    setupWindow?.show();
  });

  // Load setup HTML from resources
  const setupHtmlPath = isDev
    ? path.join(__dirname, '..', 'electron', 'resources', 'setup.html')
    : path.join(process.resourcesPath, 'setup.html');

  setupWindow.loadFile(setupHtmlPath);

  setupWindow.on('closed', () => {
    setupWindow = null;
  });
}

function createSplashWindow(): void {
  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #08060d;
          color: #d4c4a8;
          font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
          -webkit-app-region: drag;
          background-image:
            radial-gradient(ellipse at 50% 30%, rgba(90,50,20,0.15) 0%, transparent 70%),
            radial-gradient(ellipse at 50% 80%, rgba(40,20,60,0.1) 0%, transparent 60%);
        }
        .grimoire-icon {
          font-size: 42px;
          margin-bottom: 12px;
          filter: drop-shadow(0 0 8px rgba(180,140,60,0.4));
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-bottom: 6px;
          background: linear-gradient(135deg, #c9a84c, #8b6914, #c9a84c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 11px;
          letter-spacing: 4px;
          color: #6b5a3e;
          margin-bottom: 28px;
          text-transform: uppercase;
        }
        .rune-spinner {
          width: 36px;
          height: 36px;
          border: 2px solid rgba(180,140,60,0.15);
          border-top-color: #c9a84c;
          border-radius: 50%;
          animation: spin 1.2s linear infinite;
          margin-bottom: 14px;
          box-shadow: 0 0 12px rgba(180,140,60,0.1);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status {
          font-size: 12px;
          color: #5a4e3a;
          letter-spacing: 1px;
        }
        .border-line {
          position: absolute;
          top: 8px; left: 8px; right: 8px; bottom: 8px;
          border: 1px solid rgba(180,140,60,0.12);
          border-radius: 2px;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <div class="border-line"></div>
      <div class="grimoire-icon">&#128214;</div>
      <div class="title">The Black Grimoire</div>
      <div class="subtitle">Deck Architect</div>
      <div class="rune-spinner"></div>
      <div class="status">Channeling mana...</div>
    </body>
    </html>`;

  splashWindow = new BrowserWindow({
    width: 380,
    height: 280,
    frame: false,
    transparent: false,
    resizable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
  splashWindow.center();
  splashWindow.show();

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'The Black Grimoire',
    show: false,
    backgroundColor: '#08060d',
  });

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow?.show();
  });

  installZoomControls(mainWindow);
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Suppress Electron's native context menu so the app can handle right-click
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Closing the window must not stop match recording — the Arena log watcher
  // lives in this process. Hide instead, and let the tray's Quit really quit.
  mainWindow.on('close', (e) => {
    if (!isQuitting()) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ── Overwolf overlay ────────────────────────────────────────────────────

export function getOverwolfOverlay(): OverwolfOverlayManager | null {
  return overwolfOverlay;
}

async function initOverwolfOverlay(): Promise<void> {
  if (!isOverwolfRuntime()) return;
  try {
    const { createOverwolfOverlayManager } = await import('./overwolf-overlay');
    overwolfOverlay = createOverwolfOverlayManager();
    overwolfOverlay.init(PORT);
    mainTrace('Overwolf overlay manager initialized');
  } catch (err) {
    mainTrace(`Overwolf overlay init failed: ${err}`);
  }

  try {
    const { createOverwolfGepHandler } = await import('./overwolf-gep');
    overwolfGep = createOverwolfGepHandler();
    overwolfGep.init();
    mainTrace('Overwolf GEP handler initialized');
  } catch (err) {
    mainTrace(`Overwolf GEP init failed: ${err}`);
  }
}

// ── Auto-start watcher ──────────────────────────────────────────────────

function autoStartWatcher(): void {
  ensureWatcherRunning();
}

/** Reopen (or create) the main window from the tray. */
function showMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  createMainWindow();
}

function installTray(): void {
  setupBackgroundRecording({
    showWindow: showMainWindow,
    isRecording: isWatcherRunning,
    log: mainTrace,
  });
}

// ── Next.js server ──────────────────────────────────────────────────────

async function startNextServer(): Promise<void> {
  // Kill any existing Next.js server first
  if (nextServer) {
    try {
      nextServer.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      logCrash('next-kill-error', err);
    }
    nextServer = null;
  }

  // Find an available port
  const startPort = parseInt(PORT);
  const availablePort = await findAvailablePort(startPort);
  PORT = availablePort.toString();
  // Sync process.env.PORT so IPC handlers (postToApi) use the correct port
  process.env.PORT = PORT;

  logCrash('next-server-port', `Using port ${PORT}`);

  return new Promise((resolve, reject) => {
    // Run our custom Next.js server script using Electron as Node.js runtime
    // In production, __dirname is electron-dist/electron/ where next-server.js is located
    const nextServerScript = path.join(__dirname, 'next-server.js');

    const appDir = app.getAppPath();
    // In packaged app, standalone is in extraResources; in dev, it's in .next/
    const standaloneDir = isDev
      ? path.join(appDir, '.next', 'standalone')
      : path.join(process.resourcesPath, 'standalone');

    logCrash('next-appDir', `App directory: ${appDir}`);
    logCrash('next-standaloneDir', `Standalone directory: ${standaloneDir}`);
    logCrash('next-server-script', `Next server script: ${nextServerScript}`);

    const spawnEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      MTG_DB_DIR: getUserDataDir(),
      ELECTRON_USER_DATA: app.getPath('userData'),
      PORT,
      NODE_ENV: 'production',
      APP_DIR: appDir,
      STANDALONE_DIR: standaloneDir,
      // Everything (traced deps + better-sqlite3) is in standalone's node_modules
      NODE_PATH: path.join(standaloneDir, 'node_modules'),
    };

    // Ensure system directories are in PATH so child_process can find
    // cmd.exe / ComSpec and other OS utilities on Windows.
    if (process.platform === 'win32') {
      const system32 = process.env.SystemRoot
        ? path.join(process.env.SystemRoot, 'System32')
        : 'C:\\WINDOWS\\system32';
      const currentPath = (spawnEnv as Record<string, string | undefined>).PATH || '';
      if (!currentPath.includes(system32)) {
        (spawnEnv as Record<string, string | undefined>).PATH = system32 + ';' + currentPath;
      }
    }

    // Change process working directory before spawning to ensure relative paths work
    const originalCwd = process.cwd();
    try {
      process.chdir(appDir);
    } catch (err) {
      logCrash('chdir-error', err);
    }
    nextServer = spawn(
      process.execPath,
      [nextServerScript],
      {
        cwd: appDir,
        env: spawnEnv,
      },
    );

    // Restore original cwd
    try {
      process.chdir(originalCwd);
    } catch (err) {
      logCrash('chdir-restore-error', err);
    }

    nextServer.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      logCrash('next-stdout', output.trim());
      if (output.includes('Ready') || output.includes('started')) {
        markServerReady();
        resolve();
      }
    });

    nextServer.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      logCrash('next-stderr', output.trim());
      console.error('[Next.js]', output);
    });

    nextServer.on('error', (err) => {
      logCrash('next-spawn-error', err);
      reject(err);
    });

    nextServer.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        logCrash('next-exit', `Process exited with code ${code}, signal ${signal}`);
      }
    });

    // Fallback resolve after 8s — standalone production server starts in 2-4s
    setTimeout(resolve, 8000);
  });
}

// ── Transition from setup to main app ───────────────────────────────────

export async function transitionToMainApp(): Promise<void> {
  // Close setup window
  if (setupWindow) {
    setupWindow.close();
    setupWindow = null;
  }

  // Start Next.js server if in production mode
  if (!isDev) {
    createSplashWindow();
    try {
      await startNextServer();
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
    }
  }

  // Register main app IPC handlers
  registerIpcHandlers();

  // In dev mode, Next.js dev server is already running
  if (isDev) {
    markServerReady();
  }

  createMainWindow();
  installTray();
  setupAutoUpdater();

  // Auto-start the Arena log watcher for telemetry
  mainTrace('Auto-starting watcher on app launch');
  autoStartWatcher();

  // Initialize Overwolf overlay if running in Overwolf mode
  initOverwolfOverlay();

  // Run first-boot actions (account creation, card seeding) after server is ready
  setFirstBootLogger({ log: mainTrace, error: (m) => { mainTrace(m); logCrash('first-boot', m); } });
  setTimeout(async () => {
    try {
      await runFirstBootActions();
    } catch (err) {
      mainTrace(`[FirstBoot] Error running first-boot actions: ${err instanceof Error ? err.stack : String(err)}`);
    }

    // Seed Arena grpId cache from bundled JSON, then check CDN for updates
    try {
      await seedArenaCardCache();
    } catch (err) {
      console.error('[ArenaCardCache] Seed error:', err);
    }
    checkArenaCardDbUpdate().catch((err) => {
      console.error('[ArenaCardCache] Background update error:', err);
    });
  }, 2000);
}

// ── Auto-updater ─────────────────────────────────────────────────────────

function setupAutoUpdater(): void {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainTrace(`Update available: ${info.version}`);
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainTrace('No updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainTrace(`Update downloaded: ${info.version}`);
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    mainTrace(`Auto-update error: ${err.message}`);
    logCrash('auto-update-error', err);
  });

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      mainTrace(`Update check failed: ${err.message}`);
    });
  }, 5000);
}

// IPC handlers for update actions
ipcMain.handle('update-download', () => {
  autoUpdater.downloadUpdate().catch((err) => {
    logCrash('update-download-error', err);
  });
});

ipcMain.handle('update-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('update-check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo ? { version: result.updateInfo.version } : null;
  } catch {
    return null;
  }
});

// ── Set DB dir env for Electron mode ────────────────────────────────────

if (!isDev) {
  process.env.MTG_DB_DIR = getUserDataDir();
}
// Also set for dev so setup-handlers can use it
process.env.MTG_DB_DIR = getUserDataDir();
// first-boot.ts (in the Next.js child + this main process) reads this to
// locate app-config.json — see resolveAppConfigPath in src/lib/first-boot.ts
process.env.ELECTRON_USER_DATA = app.getPath('userData');

// ── App lifecycle ───────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Register setup IPC handlers (always available)
  registerSetupHandlers();

  if (isFirstRun()) {
    // Show setup wizard
    createSetupWindow();
  } else {
    // Normal launch — show splash, start Next.js, then open main window.
    // A login-item launch (--hidden) still starts the server, because the
    // watcher POSTs matches to it; it just skips the splash and the window.
    const hidden = startedHidden();
    if (!isDev) {
      if (!hidden) createSplashWindow();
      try {
        await startNextServer();
      } catch (err) {
        console.error('Failed to start Next.js server:', err);
      }
    }

    registerIpcHandlers();
    if (!hidden) createMainWindow();
    installTray();
    setupAutoUpdater();

    // Auto-start the Arena log watcher for telemetry
    mainTrace('Auto-starting watcher on app launch (dev mode)');
    autoStartWatcher();

    // Initialize Overwolf overlay if running in Overwolf mode
    initOverwolfOverlay();

    // Seed Arena grpId cache + check for CDN updates (non-blocking)
    setTimeout(async () => {
      // Idempotent: consumes any leftover pendingAccount/seedOnBoot from a
      // profile whose first boot never ran (pre-2026-09-02 builds), otherwise no-op.
      setFirstBootLogger({ log: mainTrace, error: (m) => { mainTrace(m); logCrash('first-boot', m); } });
      try { await runFirstBootActions(); } catch (err) {
        mainTrace(`[FirstBoot] Error: ${err instanceof Error ? err.stack : String(err)}`);
      }
      try { await seedArenaCardCache(); } catch (err) {
        console.error('[ArenaCardCache] Seed error:', err);
      }
      checkArenaCardDbUpdate().catch((err) => {
        console.error('[ArenaCardCache] Background update error:', err);
      });
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isFirstRun()) {
        createSetupWindow();
      } else {
        createMainWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  // Keep running: the tray is the UI and the log watcher is the point.
  // Quit is only ever reached via the tray menu (which sets the flag first).
  if (process.platform !== 'darwin' && isQuitting()) {
    app.quit();
  }
});

app.on('before-quit', () => {
  markQuitting();
  destroyTray();
});

app.on('will-quit', () => {
  if (overwolfGep) {
    overwolfGep.destroy();
    overwolfGep = null;
  }
  if (overwolfOverlay) {
    overwolfOverlay.destroy();
    overwolfOverlay = null;
  }
  if (nextServer) {
    try {
      nextServer.kill('SIGTERM');
      // Force kill after 2 seconds if still running
      setTimeout(() => {
        if (nextServer) {
          nextServer.kill('SIGKILL');
        }
      }, 2000);
    } catch (err) {
      logCrash('quit-kill-error', err);
    }
    nextServer = null;
  }
});

// ── UI zoom (Ctrl+= / Ctrl+- / Ctrl+0), persisted per profile ────────────────
// The HUD editor packs a lot of small type; a remembered zoom factor is the
// simplest readability control that survives restarts (operator request 2026-09-08).
const ZOOM_FILE = 'ui-zoom.json';
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.8;
const ZOOM_STEP = 0.1;
// First-run default: the HUD editor was designed at 1400 px; on the operator's
// wide window everything read too small even after the type bump.
const ZOOM_DEFAULT = 1.1;

function zoomFilePath(): string {
  return path.join(app.getPath('userData'), ZOOM_FILE);
}

function readZoomFactor(): number {
  try {
    const parsed = JSON.parse(fs.readFileSync(zoomFilePath(), 'utf8')) as { zoomFactor?: number };
    const z = Number(parsed.zoomFactor);
    return Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) : ZOOM_DEFAULT;
  } catch {
    return ZOOM_DEFAULT;
  }
}

function writeZoomFactor(zoomFactor: number): void {
  try {
    fs.writeFileSync(zoomFilePath(), JSON.stringify({ zoomFactor }));
  } catch (err) {
    logCrash('zoom-write-error', err);
  }
}

function installZoomControls(win: BrowserWindow): void {
  const { webContents } = win;
  webContents.on('did-finish-load', () => {
    webContents.setZoomFactor(readZoomFactor());
  });
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta)) return;
    const current = webContents.getZoomFactor();
    let next: number | null = null;
    if (input.key === '=' || input.key === '+') next = Math.min(ZOOM_MAX, current + ZOOM_STEP);
    else if (input.key === '-') next = Math.max(ZOOM_MIN, current - ZOOM_STEP);
    else if (input.key === '0') next = 1;
    if (next === null) return;
    event.preventDefault();
    const rounded = Math.round(next * 100) / 100;
    webContents.setZoomFactor(rounded);
    writeZoomFactor(rounded);
  });
}
