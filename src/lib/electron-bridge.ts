/**
 * Client-side typed bridge for Electron IPC.
 * Returns null when not running in Electron (regular web browser).
 */

import type { GameStateSnapshot } from './game-state-engine';
import type { MulliganAdvice } from './mulligan-advisor';
import type { SideboardPlan } from './sideboard-guide';

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
    hasActiveGame?: boolean;
  }>;

  onWatcherMatch: (callback: (match: unknown) => void) => () => void;
  onWatcherCollection: (data: unknown) => () => void;
  onWatcherError: (callback: (error: string) => void) => () => void;

  // ML Pipeline
  runMLPipeline: (options: { steps?: string; target?: string }) => Promise<{ ok: boolean; error?: string }>;
  cancelMLPipeline: () => Promise<void>;
  onMLPipelineOutput: (callback: (data: { type: string; line: string; code?: number }) => void) => () => void;

  // Overlay / Live Game Events
  onGameStateUpdate: (callback: (state: GameStateSnapshot) => void) => () => void;
  onMatchStarted: (callback: (data: { matchId: string; format: string | null; playerName: string | null; opponentName: string | null }) => void) => () => void;
  onMatchEnded: (callback: (data: { matchId: string; result: string }) => void) => () => void;
  onMulliganPrompt: (callback: (data: { hand: number[]; mulliganCount: number; seatId: number }) => void) => () => void;
  onIntermissionStart: (callback: (data: { matchId: string | null; gameNumber: number; opponentCardsSeen: number[] }) => void) => () => void;

  // Overlay controls
  toggleOverlay: (visible: boolean) => Promise<void>;
  setOverlayOpacity: (opacity: number) => Promise<void>;
  getMulliganAdvice: (data: {
    hand: number[];
    deckList: Array<{ grpId: number; qty: number }>;
    format: string | null;
    archetype: string | null;
    commanderGrpIds?: number[];
    mulliganCount: number;
  }) => Promise<MulliganAdvice>;
  getSideboardGuide: (data: { deckId: number }) => Promise<{ guides?: SideboardPlan[]; error?: string }>;
  getGameState: () => Promise<GameStateSnapshot | null>;
  resolveGrpIds: (grpIds: number[]) => Promise<Record<number, unknown>>;

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
