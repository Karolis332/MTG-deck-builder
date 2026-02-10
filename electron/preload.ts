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

  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,
});
