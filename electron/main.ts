import { app, BrowserWindow, dialog, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import { registerIpcHandlers } from './ipc-handlers';
import { registerSetupHandlers } from './setup-handlers';
import { runFirstBootActions } from '../src/lib/first-boot';

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
let overlayWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;
let overlayClickThrough = false;

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

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Suppress Electron's native context menu so the app can handle right-click
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ── Overlay window ──────────────────────────────────────────────────────

function createOverlayWindow(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show();
    return;
  }

  overlayWindow = new BrowserWindow({
    width: 320,
    height: 720,
    x: 20,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#00000000',
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.loadURL(`http://localhost:${PORT}/overlay`);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  // Start in click-through mode
  overlayClickThrough = true;
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
}

function toggleOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
    } else {
      overlayWindow.show();
    }
  } else {
    createOverlayWindow();
  }
}

function toggleClickThrough(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayClickThrough = !overlayClickThrough;
  if (overlayClickThrough) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    overlayWindow.setIgnoreMouseEvents(false);
  }
}

function registerGlobalShortcuts(): void {
  globalShortcut.register('Alt+O', toggleOverlay);
  globalShortcut.register('Alt+L', toggleClickThrough);
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

  createMainWindow();
  registerGlobalShortcuts();

  // Run first-boot actions (account creation, card seeding) after server is ready
  setTimeout(async () => {
    try {
      await runFirstBootActions();
    } catch (err) {
      console.error('[FirstBoot] Error running first-boot actions:', err);
    }
  }, 2000);
}

// ── Set DB dir env for Electron mode ────────────────────────────────────

if (!isDev) {
  process.env.MTG_DB_DIR = getUserDataDir();
}
// Also set for dev so setup-handlers can use it
process.env.MTG_DB_DIR = getUserDataDir();

// ── App lifecycle ───────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Register setup IPC handlers (always available)
  registerSetupHandlers();

  if (isFirstRun()) {
    // Show setup wizard
    createSetupWindow();
  } else {
    // Normal launch — show splash, start Next.js, then open main window
    if (!isDev) {
      createSplashWindow();
      try {
        await startNextServer();
      } catch (err) {
        console.error('Failed to start Next.js server:', err);
      }
    }

    registerIpcHandlers();
    createMainWindow();
    registerGlobalShortcuts();
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
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
