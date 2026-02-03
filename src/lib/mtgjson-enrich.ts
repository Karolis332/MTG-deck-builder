/**
 * MTGJSON Arena ID Enrichment
 *
 * Fetches AtomicCards data from MTGJSON and populates the cards.arena_id column.
 * TypeScript port of the relevant logic from scripts/fetch_mtgjson.py.
 *
 * Downloads: https://mtgjson.com/api/v5/AtomicCards.json.gz
 * Extracts: identifiers.mtgArenaId for each card printing
 * Updates: cards SET arena_id = ? WHERE name = ?
 */

import { getDb } from './db';
import { createGunzip } from 'zlib';
import https from 'https';

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

/**
 * Fetch and decompress the MTGJSON AtomicCards.json.gz file.
 * Returns the parsed JSON object.
 */
function fetchMtgjson(): Promise<Record<string, MtgjsonCard[]>> {
  return new Promise((resolve, reject) => {
    https.get(MTGJSON_URL, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          https.get(redirectUrl, handleResponse).on('error', reject);
        } else {
          reject(new Error('Redirect without location'));
        }
        return;
      }
      handleResponse(res);

      function handleResponse(response: typeof res) {
        const chunks: Buffer[] = [];
        const gunzip = createGunzip();

        response.pipe(gunzip);

        gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
        gunzip.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf-8');
            const parsed = JSON.parse(text);
            // MTGJSON AtomicCards has { meta: {...}, data: { "CardName": [...] } }
            resolve(parsed.data || parsed);
          } catch (err) {
            reject(new Error(`Failed to parse MTGJSON: ${err}`));
          }
        });
        gunzip.on('error', reject);
      }
    }).on('error', reject);
  });
}

/**
 * Extract arena_id mappings from MTGJSON AtomicCards data.
 * Returns a map of card_name → arena_id.
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

  return mapping;
}

/**
 * Update the database cards table with arena_id values.
 * Tries exact name match first, then front-face match for DFCs.
 */
function updateDatabase(mapping: Map<string, number>): number {
  const db = getDb();
  let updated = 0;

  const updateByName = db.prepare(
    'UPDATE cards SET arena_id = ? WHERE name = ? AND arena_id IS NULL'
  );

  // Also try front-face match for DFCs (e.g., "Ojer Axonil, Deepest Might")
  const updateByFrontFace = db.prepare(
    "UPDATE cards SET arena_id = ? WHERE name LIKE ? || ' // %' AND arena_id IS NULL"
  );

  const transaction = db.transaction(() => {
    for (const [name, arenaId] of Array.from(mapping.entries())) {
      const result = updateByName.run(arenaId, name);
      if (result.changes > 0) {
        updated += result.changes;
      } else {
        // Try as front face of a DFC
        const dfcResult = updateByFrontFace.run(arenaId, name);
        updated += dfcResult.changes;
      }
    }
  });

  transaction();
  return updated;
}

/**
 * Run the full MTGJSON enrichment pipeline:
 * 1. Download AtomicCards.json.gz
 * 2. Extract arena_id mappings
 * 3. Update database
 */
export async function enrichArenaIds(): Promise<{
  downloaded: number;
  updated: number;
}> {
  const data = await fetchMtgjson();
  const mapping = extractArenaIds(data);
  const updated = updateDatabase(mapping);

  return {
    downloaded: mapping.size,
    updated,
  };
}
