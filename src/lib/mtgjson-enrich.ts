/**
 * MTGJSON Arena ID Enrichment
 *
 * Fetches AtomicCards data from MTGJSON and populates the cards.arena_id column.
 * Supports progress tracking and cancellation.
 *
 * Downloads: https://mtgjson.com/api/v5/AtomicCards.json.gz
 * Extracts: identifiers.mtgArenaId for each card printing
 * Updates: cards SET arena_id = ? WHERE name = ?
 *
 * Uses streaming to temp file + worker thread parsing to avoid blocking
 * the event loop during the ~400MB JSON parse.
 */

import { getDb } from './db';
import { createGunzip } from 'zlib';
import { createWriteStream, unlinkSync, existsSync, mkdtempSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import https from 'https';
import { Worker } from 'worker_threads';
import type { IncomingMessage } from 'http';

const MTGJSON_URL = 'https://mtgjson.com/api/v5/AtomicCards.json.gz';

export interface EnrichmentProgress {
  phase: 'idle' | 'downloading' | 'parsing' | 'updating' | 'done' | 'error' | 'cancelled';
  downloadedBytes: number;
  totalBytes: number;
  mappingsFound: number;
  cardsUpdated: number;
  totalMappings: number;
  error?: string;
}

// Global state for tracking enrichment progress
let currentProgress: EnrichmentProgress = {
  phase: 'idle',
  downloadedBytes: 0,
  totalBytes: 0,
  mappingsFound: 0,
  cardsUpdated: 0,
  totalMappings: 0,
};

let cancelRequested = false;
let activeRequest: ReturnType<typeof https.get> | null = null;

export function getEnrichmentProgress(): EnrichmentProgress {
  return { ...currentProgress };
}

export function cancelEnrichment(): boolean {
  if (currentProgress.phase === 'idle' || currentProgress.phase === 'done') {
    return false;
  }
  cancelRequested = true;
  if (activeRequest) {
    activeRequest.destroy();
    activeRequest = null;
  }
  currentProgress.phase = 'cancelled';
  return true;
}

function resetProgress() {
  currentProgress = {
    phase: 'idle',
    downloadedBytes: 0,
    totalBytes: 0,
    mappingsFound: 0,
    cardsUpdated: 0,
    totalMappings: 0,
  };
  cancelRequested = false;
  activeRequest = null;
}

function cleanupTemp(filePath: string) {
  try {
    if (filePath && existsSync(filePath)) unlinkSync(filePath);
  } catch { /* ignore */ }
  try {
    const dir = dirname(filePath);
    if (dir.includes('mtgjson-')) rmdirSync(dir);
  } catch { /* ignore */ }
}

/**
 * Fetch and decompress MTGJSON AtomicCards.json.gz to a temp file.
 * Streams directly to disk — never holds the full decompressed data in memory.
 */
function fetchMtgjsonToFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mtgjson-'));
    const tempFile = join(tempDir, 'AtomicCards.json');

    function handleResponse(response: IncomingMessage) {
      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      currentProgress.totalBytes = totalBytes || 50_000_000;
      currentProgress.downloadedBytes = 0;

      const gunzip = createGunzip();
      const writeStream = createWriteStream(tempFile);

      response.on('data', (chunk: Buffer) => {
        currentProgress.downloadedBytes += chunk.length;
      });

      response.pipe(gunzip).pipe(writeStream);

      writeStream.on('finish', () => {
        if (cancelRequested) {
          cleanupTemp(tempFile);
          reject(new Error('Cancelled'));
          return;
        }
        resolve(tempFile);
      });

      writeStream.on('error', (err) => {
        cleanupTemp(tempFile);
        reject(err);
      });

      gunzip.on('error', (err) => {
        cleanupTemp(tempFile);
        if (cancelRequested) reject(new Error('Cancelled'));
        else reject(err);
      });
    }

    activeRequest = https.get(MTGJSON_URL, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          activeRequest = https.get(redirectUrl, handleResponse);
          activeRequest.on('error', (err) => {
            cleanupTemp(tempFile);
            reject(err);
          });
        } else {
          cleanupTemp(tempFile);
          reject(new Error('Redirect without location'));
        }
        return;
      }
      handleResponse(res);
    });
    activeRequest.on('error', (err) => {
      cleanupTemp(tempFile);
      if (cancelRequested) reject(new Error('Cancelled'));
      else reject(err);
    });
  });
}

/**
 * Parse the MTGJSON JSON file in a worker thread.
 * This avoids blocking the main event loop during the heavy JSON.parse
 * (~400MB file takes 10-30s to parse synchronously).
 */
function parseInWorker(filePath: string): Promise<Map<string, number>> {
  return new Promise((resolve, reject) => {
    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');
      const fs = require('fs');

      try {
        const text = fs.readFileSync(workerData.filePath, 'utf-8');
        const parsed = JSON.parse(text);
        const data = parsed.data || parsed;

        const mappings = {};
        let count = 0;

        for (const [name, printings] of Object.entries(data)) {
          if (!Array.isArray(printings)) continue;
          for (const p of printings) {
            const aid = p.identifiers && p.identifiers.mtgArenaId;
            if (aid != null) {
              const num = typeof aid === 'number' ? aid : parseInt(String(aid), 10);
              if (!isNaN(num) && num > 0) {
                mappings[name] = num;
                count++;
                break;
              }
            }
          }
        }

        parentPort.postMessage({ mappings, count });
      } catch (err) {
        parentPort.postMessage({ error: err.message });
      }
    `;

    const worker = new Worker(workerCode, {
      eval: true,
      workerData: { filePath },
      resourceLimits: {
        maxOldGenerationSizeMb: 2048,
      },
    });

    worker.on('message', (msg: { error?: string; mappings?: Record<string, number>; count?: number }) => {
      if (msg.error) {
        reject(new Error(`MTGJSON parse failed: ${msg.error}`));
      } else {
        const map = new Map<string, number>();
        for (const [name, id] of Object.entries(msg.mappings || {})) {
          map.set(name, id as number);
        }
        currentProgress.mappingsFound = map.size;
        resolve(map);
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0 && !cancelRequested) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

/**
 * Update the database cards table with arena_id values in batches.
 */
function updateDatabase(mapping: Map<string, number>): number {
  const db = getDb();
  let updated = 0;

  const updateByName = db.prepare(
    'UPDATE cards SET arena_id = ? WHERE name = ? AND arena_id IS NULL'
  );
  const updateByFrontFace = db.prepare(
    "UPDATE cards SET arena_id = ? WHERE name LIKE ? || ' // %' AND arena_id IS NULL"
  );

  const entries = Array.from(mapping.entries());
  const BATCH_SIZE = 500;
  currentProgress.totalMappings = entries.length;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    if (cancelRequested) break;

    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchTx = db.transaction(() => {
      for (const [name, arenaId] of batch) {
        const result = updateByName.run(arenaId, name);
        if (result.changes > 0) {
          updated += result.changes;
        } else {
          const dfcResult = updateByFrontFace.run(arenaId, name);
          updated += dfcResult.changes;
        }
      }
    });
    batchTx();
    currentProgress.cardsUpdated = updated;
  }

  return updated;
}

/**
 * Run the full MTGJSON enrichment pipeline (non-blocking).
 * Call getEnrichmentProgress() to poll status.
 */
export async function enrichArenaIds(): Promise<{
  downloaded: number;
  updated: number;
}> {
  if (currentProgress.phase !== 'idle' && currentProgress.phase !== 'done' &&
      currentProgress.phase !== 'error' && currentProgress.phase !== 'cancelled') {
    throw new Error('Enrichment already in progress');
  }

  resetProgress();
  currentProgress.phase = 'downloading';

  let tempFile = '';
  try {
    // Phase 1: Download + decompress to temp file (streams to disk)
    tempFile = await fetchMtgjsonToFile();
    if (cancelRequested) throw new Error('Cancelled');

    // Phase 2: Parse JSON in worker thread (doesn't block event loop)
    currentProgress.phase = 'parsing';
    const mapping = await parseInWorker(tempFile);
    if (cancelRequested) throw new Error('Cancelled');

    // Phase 3: Update database in batches
    currentProgress.phase = 'updating';
    const updated = updateDatabase(mapping);

    currentProgress.phase = 'done';
    currentProgress.cardsUpdated = updated;

    return { downloaded: mapping.size, updated };
  } catch (err) {
    if (cancelRequested) {
      currentProgress.phase = 'cancelled';
    } else {
      currentProgress.phase = 'error';
      currentProgress.error = err instanceof Error ? err.message : String(err);
    }
    throw err;
  } finally {
    if (tempFile) cleanupTemp(tempFile);
  }
}
