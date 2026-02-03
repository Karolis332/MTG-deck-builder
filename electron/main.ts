import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { registerIpcHandlers } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const isDev = !app.isPackaged;
const PORT = process.env.PORT || '3000';

function createWindow() {
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

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const nextBin = path.join(
      app.getAppPath(),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'next.cmd' : 'next'
    );

    nextServer = spawn(nextBin, ['start', '-p', PORT], {
      cwd: app.getAppPath(),
      env: {
        ...process.env,
        MTG_DB_DIR: path.join(app.getPath('userData'), 'data'),
        PORT,
      },
      shell: process.platform === 'win32',
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

    // Fallback resolve after 10s in case "Ready" message is missed
    setTimeout(resolve, 10000);
  });
}

// Set DB dir env for Electron mode
if (!isDev) {
  process.env.MTG_DB_DIR = path.join(app.getPath('userData'), 'data');
}

app.whenReady().then(async () => {
  registerIpcHandlers();

  if (!isDev) {
    try {
      await startNextServer();
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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
