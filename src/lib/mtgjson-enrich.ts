/**
 * MTGJSON Arena ID Enrichment
 *
 * Fetches AtomicCards data from MTGJSON and populates the cards.arena_id column.
 * Supports progress tracking and cancellation.
 *
 * Downloads: https://mtgjson.com/api/v5/AtomicCards.json.gz
 * Extracts: identifiers.mtgArenaId for each card printing
 * Updates: cards SET arena_id = ? WHERE name = ?
 */

import { getDb } from './db';
import { createGunzip } from 'zlib';
import https from 'https';
import type { IncomingMessage } from 'http';

const MTGJSON_URL = 'https://mtgjson.com/api/v5/AtomicCards.json.gz';

interface MtgjsonPrinting {
  identifiers?: {
    mtgArenaId?: string | number;
  };
}

interface MtgjsonCard {
  name?: string;
  printings?: string[];
  [key: string]: unknown;
}

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

/**
 * Fetch and decompress the MTGJSON AtomicCards.json.gz file with progress tracking.
 */
function fetchMtgjson(): Promise<Record<string, MtgjsonCard[]>> {
  return new Promise((resolve, reject) => {
    function handleResponse(response: IncomingMessage) {
      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      currentProgress.totalBytes = totalBytes || 50_000_000; // estimate ~50MB if unknown
      currentProgress.downloadedBytes = 0;

      const chunks: Buffer[] = [];
      const gunzip = createGunzip();

      response.on('data', (chunk: Buffer) => {
        currentProgress.downloadedBytes += chunk.length;
      });

      response.pipe(gunzip);

      gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gunzip.on('end', () => {
        if (cancelRequested) {
          reject(new Error('Cancelled'));
          return;
        }
        currentProgress.phase = 'parsing';
        // Use setImmediate to let the event loop breathe before heavy JSON parse
        setImmediate(() => {
          try {
            const text = Buffer.concat(chunks).toString('utf-8');
            const parsed = JSON.parse(text);
            resolve(parsed.data || parsed);
          } catch (err) {
            reject(new Error(`Failed to parse MTGJSON: ${err}`));
          }
        });
      });
      gunzip.on('error', (err) => {
        if (cancelRequested) reject(new Error('Cancelled'));
        else reject(err);
      });
    }

    activeRequest = https.get(MTGJSON_URL, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          activeRequest = https.get(redirectUrl, handleResponse);
          activeRequest.on('error', reject);
        } else {
          reject(new Error('Redirect without location'));
        }
        return;
      }
      handleResponse(res);
    });
    activeRequest.on('error', (err) => {
      if (cancelRequested) reject(new Error('Cancelled'));
      else reject(err);
    });
  });
}

/**
 * Extract arena_id mappings from MTGJSON AtomicCards data.
 */
function extractArenaIds(
  data: Record<string, MtgjsonCard[]>
): Map<string, number> {
  const mapping = new Map<string, number>();

  for (const [name, printings] of Object.entries(data)) {
    if (!Array.isArray(printings)) continue;

    let arenaId: number | null = null;
    for (const printing of printings) {
      const p = printing as unknown as MtgjsonPrinting;
      const aid = p.identifiers?.mtgArenaId;
      if (aid != null) {
        const parsed = typeof aid === 'number' ? aid : parseInt(String(aid), 10);
        if (!isNaN(parsed)) {
          arenaId = parsed;
          break;
        }
      }
    }

    if (arenaId !== null) {
      mapping.set(name, arenaId);
    }
  }

  currentProgress.mappingsFound = mapping.size;
  return mapping;
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
 * Run the full MTGJSON enrichment pipeline (non-blocking start).
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

  try {
    const data = await fetchMtgjson();
    if (cancelRequested) throw new Error('Cancelled');

    currentProgress.phase = 'updating';
    const mapping = extractArenaIds(data);
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
  }
}
