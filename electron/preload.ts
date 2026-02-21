import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectArenaLogPath: () => ipcRenderer.invoke('select-arena-log-path'),
  readArenaLog: (filePath: string) => ipcRenderer.invoke('read-arena-log', filePath),
  getDefaultArenaLogPath: () => ipcRenderer.invoke('get-default-arena-log-path'),
  parseFullLog: (filePath: string) => ipcRenderer.invoke('parse-full-log', filePath),

  // Watcher controls
  startWatcher: (logPath: string) => ipcRenderer.invoke('start-watcher', logPath),
  stopWatcher: () => ipcRenderer.invoke('stop-watcher'),
  getWatcherStatus: () => ipcRenderer.invoke('get-watcher-status'),

  // Event listeners from main process
  onWatcherMatch: (callback: (match: unknown) => void) => {
    ipcRenderer.on('watcher-new-match', (_event, match) => callback(match));
    return () => ipcRenderer.removeAllListeners('watcher-new-match');
  },
  onWatcherCollection: (callback: (data: unknown) => void) => {
    ipcRenderer.on('watcher-collection', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('watcher-collection');
  },
  onWatcherError: (callback: (error: string) => void) => {
    ipcRenderer.on('watcher-error', (_event, error) => callback(error));
    return () => ipcRenderer.removeAllListeners('watcher-error');
  },

  // ML Pipeline
  runMLPipeline: (options: { steps?: string; target?: string }) =>
    ipcRenderer.invoke('run-ml-pipeline', options),
  cancelMLPipeline: () => ipcRenderer.invoke('cancel-ml-pipeline'),
  onMLPipelineOutput: (callback: (data: { type: string; line: string; code?: number }) => void) => {
    ipcRenderer.on('ml-pipeline-output', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('ml-pipeline-output');
  },

  // ── Overlay / Live Game Events ──────────────────────────────────────────

  onGameStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on('game-state-update', (_event, state) => callback(state));
    return () => ipcRenderer.removeAllListeners('game-state-update');
  },

  onMatchStarted: (callback: (data: unknown) => void) => {
    ipcRenderer.on('match-started', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('match-started');
  },

  onMatchEnded: (callback: (data: unknown) => void) => {
    ipcRenderer.on('match-ended', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('match-ended');
  },

  onMulliganPrompt: (callback: (data: unknown) => void) => {
    ipcRenderer.on('mulligan-prompt', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('mulligan-prompt');
  },

  onIntermissionStart: (callback: (data: unknown) => void) => {
    ipcRenderer.on('intermission-start', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('intermission-start');
  },

  onGameLogEntry: (callback: (entry: unknown) => void) => {
    ipcRenderer.on('game-log-entry', (_event, entry) => callback(entry));
    return () => ipcRenderer.removeAllListeners('game-log-entry');
  },

  onGameLogUpdate: (callback: (entry: unknown) => void) => {
    ipcRenderer.on('game-log-update', (_event, entry) => callback(entry));
    return () => ipcRenderer.removeAllListeners('game-log-update');
  },

  // Game controls
  getMulliganAdvice: (data: unknown) => ipcRenderer.invoke('get-mulligan-advice', data),
  getSideboardGuide: (data: unknown) => ipcRenderer.invoke('get-sideboard-guide', data),
  getGameState: () => ipcRenderer.invoke('get-game-state'),
  getGameLog: () => ipcRenderer.invoke('get-game-log'),
  getLastMatchInfo: () => ipcRenderer.invoke('get-last-match-info'),
  resolveGrpIds: (grpIds: number[]) => ipcRenderer.invoke('resolve-grp-ids', grpIds),

  // Arena Card DB CDN Update
  updateArenaCardDb: () => ipcRenderer.invoke('update-arena-card-db'),
  onArenaCardDbUpdate: (callback: (data: unknown) => void) => {
    ipcRenderer.on('arena-card-db-update', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('arena-card-db-update');
  },

  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,
});
