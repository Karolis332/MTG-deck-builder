import { app, BrowserWindow, dialog } from 'electron';
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
  dialog.showErrorBox('MTG Deck Builder - Fatal Error', err.message || String(err));
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logCrash('unhandledRejection', reason);
});

let mainWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;
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

async function startNextServer(): Promise<void> {
  // Kill any existing Next.js server first
  if (nextServer) {
    try {
      nextServer.kill('SIGTERM');
      // Give it a moment to clean up
      await new Promise((r) => setTimeout(r, 1000));
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

    logCrash('next-appDir', `App directory: ${appDir}`);
    logCrash('next-server-script', `Next server script: ${nextServerScript}`);

    const spawnEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      MTG_DB_DIR: getUserDataDir(),
      PORT,
      NODE_ENV: 'production',
      APP_DIR: appDir,
      NODE_PATH: path.join(appDir, 'node_modules'),
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
