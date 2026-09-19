/**
 * Background recording — keeps the Arena log watcher alive without a window.
 *
 * The watcher runs in the main process (see ipc-handlers.ts), so match history
 * is only captured while Electron is running. Before this module the app quit
 * the moment the window closed, which meant games played with the window shut
 * were silently never recorded.
 *
 * Three pieces, all opt-out-able from the tray menu:
 *   1. Closing the window hides it instead of quitting.
 *   2. A tray icon is the only way back to the window, and to a real Quit.
 *   3. Optionally launch at login with `--hidden` so recording starts with Windows.
 */
import { app, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

/** Set once the user picks Quit, so the close handler stops intercepting. */
let quitting = false;
let tray: Tray | null = null;

export function isQuitting(): boolean {
  return quitting;
}

export function markQuitting(): void {
  quitting = true;
}

/**
 * True when Windows launched us at login. The login item is registered with
 * `--hidden` so a boot-time start records in the background instead of
 * throwing a window in the user's face.
 */
export function startedHidden(): boolean {
  return process.argv.includes('--hidden');
}

function trayIcon(): Electron.NativeImage {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'build', 'icon.png'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
  ];
  for (const file of candidates) {
    if (file && fs.existsSync(file)) {
      const img = nativeImage.createFromPath(file);
      if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
    }
  }
  // An empty image still yields a clickable tray entry, so a missing asset
  // degrades to "no picture" rather than "no way to reopen the app".
  return nativeImage.createEmpty();
}

export interface BackgroundRecordingOptions {
  /** Bring the main window back, creating it if it was never opened. */
  showWindow: () => void;
  /** Whether the Arena log watcher is currently attached. */
  isRecording: () => boolean;
  log?: (message: string) => void;
}

function loginItemEnabled(): boolean {
  try {
    return app.getLoginItemSettings({ args: ['--hidden'] }).openAtLogin;
  } catch {
    return false;
  }
}

function setLoginItem(enabled: boolean): void {
  try {
    app.setLoginItemSettings({ openAtLogin: enabled, args: ['--hidden'] });
  } catch {
    // Unsupported platform / locked-down policy — the tray still works.
  }
}

/**
 * Install the tray and its menu. Safe to call once, after app.whenReady().
 */
export function setupBackgroundRecording(opts: BackgroundRecordingOptions): void {
  if (tray) return;
  const log = opts.log ?? (() => {});

  try {
    tray = new Tray(trayIcon());
  } catch (err) {
    log(`tray unavailable, background recording disabled: ${err}`);
    return;
  }

  const rebuild = (): void => {
    if (!tray) return;
    const recording = opts.isRecording();
    tray.setToolTip(
      recording
        ? 'The Black Grimoire — recording Arena matches'
        : 'The Black Grimoire — not recording'
    );
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: recording ? 'Recording Arena matches' : 'Not recording', enabled: false },
        { type: 'separator' },
        { label: 'Open The Black Grimoire', click: () => opts.showWindow() },
        {
          label: 'Start with Windows',
          type: 'checkbox',
          checked: loginItemEnabled(),
          click: (item) => {
            setLoginItem(item.checked);
            log(`start with Windows = ${item.checked}`);
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            markQuitting();
            app.quit();
          },
        },
      ])
    );
  };

  rebuild();
  // Recording state can flip after launch (log file appears, watcher restarts),
  // so refresh the menu each time it is opened rather than snapshotting once.
  tray.on('click', () => opts.showWindow());
  tray.on('right-click', rebuild);
  setInterval(rebuild, 30_000).unref?.();

  log('background recording active (tray installed)');
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
