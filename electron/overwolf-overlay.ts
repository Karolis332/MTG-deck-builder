/**
 * Overwolf Overlay Manager
 * Manages the in-game overlay window lifecycle using standard BrowserWindow
 * (ow-electron uses Electron's window system for overlays).
 *
 * In standalone Electron mode, this module is never loaded.
 */

import { BrowserWindow, globalShortcut, app } from 'electron';
import path from 'path';

// MTGA class ID from Overwolf's game registry
const MTGA_CLASS_ID = 21308;

let overlayWindow: BrowserWindow | null = null;
let isInteractive = false;
let isVisible = true;

export interface OverwolfOverlayManager {
  init(port: string): void;
  getOverlayWindow(): BrowserWindow | null;
  toggleVisibility(): void;
  toggleInteractive(): void;
  isOverlayVisible(): boolean;
  isOverlayInteractive(): boolean;
  destroy(): void;
}

export function createOverwolfOverlayManager(): OverwolfOverlayManager {
  let serverPort = '3000';

  function createOverlayWindow(): void {
    if (overlayWindow && !overlayWindow.isDestroyed()) return;

    overlayWindow = new BrowserWindow({
      width: 320,
      height: 800,
      x: 10,
      y: 60,
      frame: false,
      transparent: true,
      resizable: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      backgroundColor: '#00000000',
    });

    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.loadURL(`http://localhost:${serverPort}/overlay-game`);

    overlayWindow.on('closed', () => {
      overlayWindow = null;
    });
  }

  function destroyOverlayWindow(): void {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
      overlayWindow = null;
    }
  }

  function toggleVisibility(): void {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    isVisible = !isVisible;
    if (isVisible) {
      overlayWindow.show();
    } else {
      overlayWindow.hide();
    }
  }

  function toggleInteractive(): void {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    isInteractive = !isInteractive;
    if (isInteractive) {
      overlayWindow.setIgnoreMouseEvents(false);
      overlayWindow.setFocusable(true);
      overlayWindow.focus();
    } else {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      overlayWindow.setFocusable(false);
    }
  }

  function registerHotkeys(): void {
    // Alt+O: toggle overlay visibility
    globalShortcut.register('Alt+O', toggleVisibility);
    // Alt+L: toggle click-through / interactive mode
    globalShortcut.register('Alt+L', toggleInteractive);
  }

  function unregisterHotkeys(): void {
    globalShortcut.unregister('Alt+O');
    globalShortcut.unregister('Alt+L');
  }

  return {
    init(port: string) {
      serverPort = port;

      try {
        // Try to use GEP game detection for auto-launch
        const gep = (app as any).overwolf?.packages?.gep;
        if (gep) {
          gep.on('game-detected', (event: any, gameId: number) => {
            if (gameId === MTGA_CLASS_ID) {
              event.enable();
              createOverlayWindow();
              registerHotkeys();
            }
          });

          gep.on('game-exit', (_event: any, gameId: number) => {
            if (gameId === MTGA_CLASS_ID) {
              destroyOverlayWindow();
              unregisterHotkeys();
            }
          });
        } else {
          // No GEP — just create overlay on init and rely on watcher events
          createOverlayWindow();
          registerHotkeys();
        }
      } catch {
        // Fallback: always-on overlay
        createOverlayWindow();
        registerHotkeys();
      }
    },

    getOverlayWindow() {
      return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null;
    },

    toggleVisibility,
    toggleInteractive,

    isOverlayVisible() {
      return isVisible;
    },

    isOverlayInteractive() {
      return isInteractive;
    },

    destroy() {
      unregisterHotkeys();
      destroyOverlayWindow();
    },
  };
}
