import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, fork, ChildProcess } from 'child_process';
import { registerIpcHandlers } from './ipc-handlers';
import { registerSetupHandlers } from './setup-handlers';
import { runFirstBootActions } from '../src/lib/first-boot';

let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

// Allow running as root on Linux (e.g. WSL, Docker)
app.commandLine.appendSwitch('no-sandbox');

const isDev = !app.isPackaged;
const PORT = process.env.PORT || '3000';

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
    title: 'MTG Deck Builder - Setup',
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
    title: 'MTG Deck Builder',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ── Next.js server ──────────────────────────────────────────────────────

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use the Next.js CLI JS file directly instead of the .cmd wrapper.
    // On Windows, cmd.exe cannot read files inside an ASAR archive, so
    // spawning next.cmd via shell fails with ENOENT. fork() uses
    // Electron's built-in Node.js runtime and handles ASAR paths natively.
    const nextCli = path.join(
      app.getAppPath(),
      'node_modules',
      'next',
      'dist',
      'bin',
      'next'
    );

    nextServer = fork(nextCli, ['start', '-p', PORT], {
      cwd: app.getAppPath(),
      env: {
        ...process.env,
        MTG_DB_DIR: getUserDataDir(),
        PORT,
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    nextServer.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started')) {
        resolve();
      }
    });

    nextServer.stderr?.on('data', (data: Buffer) => {
      console.error('[Next.js]', data.toString());
    });

    nextServer.on('error', reject);

    // Fallback resolve after 15s in case "Ready" message is missed
    setTimeout(resolve, 15000);
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
    try {
      await startNextServer();
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
    }
  }

  // Register main app IPC handlers
  registerIpcHandlers();

  createMainWindow();

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
    // Normal launch — start Next.js and open main window
    if (!isDev) {
      try {
        await startNextServer();
      } catch (err) {
        console.error('Failed to start Next.js server:', err);
      }
    }

    registerIpcHandlers();
    createMainWindow();
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
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
