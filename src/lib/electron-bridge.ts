/**
 * Client-side typed bridge for Electron IPC.
 * Returns null when not running in Electron (regular web browser).
 */

export interface ElectronAPI {
  selectArenaLogPath: () => Promise<string | null>;
  readArenaLog: (filePath: string) => Promise<string>;
  getDefaultArenaLogPath: () => Promise<string>;
  parseFullLog: (filePath: string) => Promise<{
    matches: unknown[];
    collection: Record<string, number> | null;
  }>;

  startWatcher: (logPath: string) => Promise<{ ok: boolean; error?: string }>;
  stopWatcher: () => Promise<void>;
  getWatcherStatus: () => Promise<{
    running: boolean;
    logPath: string | null;
    matchCount: number;
  }>;

  onWatcherMatch: (callback: (match: unknown) => void) => () => void;
  onWatcherCollection: (data: unknown) => () => void;
  onWatcherError: (callback: (error: string) => void) => () => void;

  getPlatform: () => Promise<string>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

export function getElectronAPI(): ElectronAPI | null {
  if (isElectron()) return window.electronAPI!;
  return null;
}
