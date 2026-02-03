/**
 * Preload script for the setup wizard window.
 * Exposes setup-specific IPC methods to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('setupAPI', {
  // Database init
  initDatabase: () => ipcRenderer.invoke('setup:init-database'),

  // Account creation
  createAccount: (data: { username: string; email: string; password: string }) =>
    ipcRenderer.invoke('setup:create-account', data),

  // Card seeding
  seedCards: () => ipcRenderer.invoke('setup:seed-cards'),
  onSeedProgress: (callback: (progress: { percent: number; message: string }) => void) => {
    ipcRenderer.on('setup:seed-progress', (_event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('setup:seed-progress');
  },

  // Arena log
  getDefaultArenaLogPath: () => ipcRenderer.invoke('setup:get-default-arena-path'),
  selectArenaLogPath: () => ipcRenderer.invoke('setup:select-arena-log'),

  // Config
  saveSetupConfig: (config: Record<string, unknown>) =>
    ipcRenderer.invoke('setup:save-config', config),

  // Launch
  launchMainApp: () => ipcRenderer.invoke('setup:launch-app'),
});
