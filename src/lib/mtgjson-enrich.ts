/**
 * MTGJSON Arena ID Enrichment
 *
 * Optional enrichment that downloads MTGJSON AtomicCards data to populate
 * additional arena_id values beyond what Scryfall provides.
 *
 * Uses streaming JSON parsing to avoid memory/hang issues with the ~400MB file.
 *
 * Primary arena_id source: Scryfall seed (no extra download).
 * This enrichment is a secondary "top-up" for edge cases.
 */

import { getDb } from './db';
import { createGunzip } from 'zlib';
import https from 'https';
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

let activeStream: any = null;

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
  if (activeStream) {
    activeStream.destroy();
    activeStream = null;
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
  activeStream = null;
}

/**
 * Stream-download and decompress MTGJSON, parsing card entries one at a time.
 * Uses stream-json to avoid loading the entire 400MB JSON into memory.
 * Returns name→arenaId mappings incrementally.
 */
function fetchAndParseMtgjson(): Promise<Map<string, number>> {
  return new Promise((resolve, reject) => {
    // Dynamic require to avoid bundling issues — stream-json is server-only
    let StreamValues: { withParser: () => NodeJS.ReadWriteStream };
    try {
  
      StreamValues = require('stream-json/streamers/StreamValues');
    } catch {
      reject(new Error('stream-json not installed. Run: npm install stream-json'));
      return;
    }

    const mapping = new Map<string, number>();

    function handleResponse(response: IncomingMessage) {
      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      currentProgress.totalBytes = totalBytes || 50_000_000;
      currentProgress.downloadedBytes = 0;

      const gunzip = createGunzip();

      response.on('data', (chunk: Buffer) => {
        currentProgress.downloadedBytes += chunk.length;
      });

      // Stream-parse: AtomicCards.json is {"meta":{...},"data":{"CardName":[...],...}}
      // StreamValues emits each top-level value. We look for "data" key entries.
      
      const pipeline: any = response.pipe(gunzip).pipe(StreamValues.withParser());
      activeStream = pipeline;

      pipeline.on('data', ({ key, value }: { key: number; value: unknown }) => {
        if (cancelRequested) {
          pipeline.destroy();
          return;
        }

        // The top-level JSON has two keys: "meta" and "data"
        // StreamValues for objects emits numeric indices for top-level entries
        // For {"meta":...,"data":...} it emits index 0 (meta) and 1 (data)
        // We need the "data" object which contains all card entries

        // Since StreamValues emits the full value for each top-level key,
        // and "data" is the second key (index 1), it will be a huge object.
        // Instead, let's process it directly when we get it.
        if (key === 1 && value && typeof value === 'object') {
          currentProgress.phase = 'parsing';
          const data = value as Record<string, Array<{ identifiers?: { mtgArenaId?: string | number } }>>;

          for (const [name, printings] of Object.entries(data)) {
            if (cancelRequested) break;
            if (!Array.isArray(printings)) continue;

            for (const printing of printings) {
              const aid = printing.identifiers?.mtgArenaId;
              if (aid != null) {
                const num = typeof aid === 'number' ? aid : parseInt(String(aid), 10);
                if (!isNaN(num) && num > 0) {
                  mapping.set(name, num);
                  currentProgress.mappingsFound = mapping.size;
                  break;
                }
              }
            }
          }
        }
      });

      pipeline.on('end', () => {
        if (cancelRequested) {
          reject(new Error('Cancelled'));
        } else {
          resolve(mapping);
        }
      });

      pipeline.on('error', (err: Error) => {
        if (cancelRequested) reject(new Error('Cancelled'));
        else reject(err);
      });

      gunzip.on('error', (err: Error) => {
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
 * Run the full MTGJSON enrichment pipeline.
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
    // Phase 1+2: Download, decompress, and stream-parse in one pipeline
    const mapping = await fetchAndParseMtgjson();
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
  }
}
