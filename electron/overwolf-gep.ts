/**
 * Overwolf Game Events Provider (GEP) Handler
 * Routes MTGA game events to the renderer via IPC broadcast.
 *
 * GEP for MTGA provides:
 * - scene detection (home, draft table, match, etc.)
 * - inventory/collection data
 * - draft pack/cards/picks
 *
 * NOTE: GEP does NOT provide match events (life, turns, cards played).
 * ArenaLogWatcher remains the primary match engine.
 */

import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

const MTGA_CLASS_ID = 21308;

// File-based trace log (same pattern as ipc-handlers)
const TRACE_LOG = path.join(process.env.APPDATA || '.', 'the-black-grimoire', 'telemetry-debug.log');
function traceLog(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  try { fs.appendFileSync(TRACE_LOG, `[${ts}] GEP: ${msg}\n`); } catch { /* ignore */ }
}

function broadcast(channel: string, ...args: unknown[]): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
}

export interface OverwolfGepHandler {
  init(): void;
  destroy(): void;
}

export function createOverwolfGepHandler(): OverwolfGepHandler {
  let initialized = false;

  function handleInfoUpdate(
    _event: unknown,
    _gameId: number,
    data: { feature: string; key: string; value: unknown; category?: string }
  ): void {
    traceLog(`info-update: ${data.feature}/${data.key}`);

    switch (data.key) {
      case 'scene':
        broadcast('gep-scene-change', data.value);
        break;

      case 'inventory_cards':
        broadcast('gep-inventory', data.value);
        break;

      case 'draft_pack':
        broadcast('gep-draft-pack', data.value);
        break;

      case 'draft_cards':
      case 'draft_picked':
        broadcast('gep-draft-pick', { key: data.key, value: data.value });
        break;
    }
  }

  function handleGameEvent(
    _event: unknown,
    _gameId: number,
    data: { feature: string; key: string; value: unknown }
  ): void {
    traceLog(`game-event: ${data.feature}/${data.key}`);

    if (data.key === 'draft_start' || data.key === 'draft_end') {
      broadcast(`gep-${data.key}`, data.value);
    }
  }

  return {
    init() {
      if (initialized) return;

      const packages = (app as any).overwolf?.packages;
      if (!packages) {
        traceLog('No Overwolf packages available — GEP skipped');
        return;
      }

      packages.on('ready', (_event: unknown, packageName: string) => {
        if (packageName !== 'gep') return;
        traceLog('GEP package ready');

        const gep = packages.gep;
        if (!gep) return;

        // Register for MTGA events
        gep.on('game-detected', (event: any, gameId: number, name: string) => {
          if (gameId === MTGA_CLASS_ID) {
            traceLog(`Game detected: ${name} (${gameId})`);
            event.enable();

            // Request MTGA features
            gep.setRequiredFeatures(gameId, ['game_info', 'match_info'])
              .then(() => traceLog('Required features set'))
              .catch((err: unknown) => traceLog(`setRequiredFeatures error: ${err}`));
          }
        });

        gep.on('new-info-update', handleInfoUpdate);
        gep.on('new-game-event', handleGameEvent);

        gep.on('game-exit', (_evt: unknown, gameId: number) => {
          if (gameId === MTGA_CLASS_ID) {
            traceLog('MTGA exited');
          }
        });

        gep.on('error', (_evt: unknown, gameId: number, error: string) => {
          traceLog(`GEP error for game ${gameId}: ${error}`);
        });
      });

      packages.on('failed-to-initialize', (_event: unknown, packageName: string) => {
        if (packageName === 'gep') {
          traceLog('GEP failed to initialize');
        }
      });

      initialized = true;
      traceLog('GEP handler initialized — waiting for package ready');
    },

    destroy() {
      initialized = false;
    },
  };
}
