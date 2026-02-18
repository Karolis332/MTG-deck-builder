#!/usr/bin/env node
/**
 * download_arena_card_db.js
 *
 * Downloads Arena's complete card database from Wizards' CDN and extracts
 * a compact grpId→cardName JSON mapping for the app to use.
 *
 * Pipeline:
 *   1. GET version endpoint → extract current Arena version
 *   2. GET External manifest → extract hash
 *   3. GET Manifest_{hash}.mtga → gunzip → find Raw_CardDatabase entry
 *   4. GET Raw_CardDatabase.mtga → gunzip → SQLite DB
 *   5. Query Cards + Localizations → output arena_grp_ids.json
 *
 * Usage:
 *   node scripts/download_arena_card_db.js [--output path/to/output.json]
 */

const https = require('https');
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Config ──────────────────────────────────────────────────────────────────

const VERSION_URL = 'https://mtgarena.downloads.wizards.com/Live/Windows64/version';
const ASSETS_BASE = 'https://assets.mtgarena.wizards.com';

const DEFAULT_OUTPUT = path.join(__dirname, '..', 'data', 'arena_grp_ids.json');

// ── HTTP helpers ────────────────────────────────────────────────────────────

function fetchBuffer(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'TheBlackGrimoire/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
        return fetchBuffer(res.headers.location, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function fetchText(url) {
  return fetchBuffer(url).then((buf) => buf.toString('utf-8'));
}

function gunzipBuffer(buf) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buf, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ── Version parsing ─────────────────────────────────────────────────────────

/**
 * Parse version endpoint response and extract the version string + manifest key.
 * Returns { version: "0.1.11392.1238268", manifestKey: "11392_1238268" }
 */
function parseVersionResponse(versionString) {
  let ver = versionString.trim();

  // Try parsing as JSON first — endpoint returns { Versions: { "0.1.X.Y": "date" } }
  try {
    const parsed = JSON.parse(ver);
    if (parsed.Versions && typeof parsed.Versions === 'object') {
      // Get the first (usually only) version key
      const keys = Object.keys(parsed.Versions);
      if (keys.length > 0) ver = keys[0];
    } else if (typeof parsed === 'string') {
      ver = parsed;
    } else if (parsed.Version) {
      ver = parsed.Version;
    }
  } catch {
    // Plain text — use as-is
  }

  // Extract the numeric parts: "0.1.XXXXX.YYYYYYY" → "XXXXX_YYYYYYY"
  const parts = ver.split('.');
  if (parts.length >= 4) {
    return { version: ver, manifestKey: `${parts[2]}_${parts[3]}` };
  }
  // Fallback: try to find any pattern like NNNNN_NNNNNNN or NNNNN.NNNNNNN
  const match = ver.match(/(\d{4,6})[._](\d{5,10})/);
  if (match) return { version: ver, manifestKey: `${match[1]}_${match[2]}` };

  throw new Error(`Cannot parse Arena version from: "${versionString.trim()}"`);
}

// ── Main pipeline ───────────────────────────────────────────────────────────

async function downloadArenaCardDb(outputPath) {
  console.log('[Arena CDN] Step 1: Fetching Arena version...');
  const versionRaw = await fetchText(VERSION_URL);
  const { version: versionClean, manifestKey } = parseVersionResponse(versionRaw);
  console.log(`[Arena CDN]   Version: ${versionClean}`);
  console.log(`[Arena CDN]   Manifest key: ${manifestKey}`);

  console.log('[Arena CDN] Step 2: Fetching External manifest...');
  const externalUrl = `${ASSETS_BASE}/External_${manifestKey}.mtga`;
  const externalBuf = await fetchBuffer(externalUrl);

  // External manifest may be gzipped or plain text
  let externalText;
  try {
    const decompressed = await gunzipBuffer(externalBuf);
    externalText = decompressed.toString('utf-8');
  } catch {
    externalText = externalBuf.toString('utf-8');
  }

  // The External manifest contains a hash that points to the full Manifest
  // Format varies — could be a simple hash string or JSON
  let manifestHash = externalText.trim();
  // If JSON, extract the hash
  try {
    const parsed = JSON.parse(manifestHash);
    if (typeof parsed === 'string') manifestHash = parsed;
    else if (parsed.Hash) manifestHash = parsed.Hash;
    else if (parsed.hash) manifestHash = parsed.hash;
  } catch {
    // Plain text hash
  }
  manifestHash = manifestHash.trim();
  console.log(`[Arena CDN]   Manifest hash: ${manifestHash.slice(0, 20)}...`);

  console.log('[Arena CDN] Step 3: Fetching full Manifest...');
  const manifestUrl = `${ASSETS_BASE}/Manifest_${manifestHash}.mtga`;
  const manifestBuf = await fetchBuffer(manifestUrl);

  let manifestText;
  try {
    const decompressed = await gunzipBuffer(manifestBuf);
    manifestText = decompressed.toString('utf-8');
  } catch {
    manifestText = manifestBuf.toString('utf-8');
  }

  const manifest = JSON.parse(manifestText);

  // Find Raw_CardDatabase entry in manifest assets
  let cardDbEntry = null;
  const assets = manifest.Assets || manifest.assets || [];
  for (const asset of assets) {
    const name = asset.Name || asset.name || '';
    if (name.includes('Raw_CardDatabase') || name.includes('raw_carddatabase')) {
      cardDbEntry = asset;
      break;
    }
  }

  if (!cardDbEntry) {
    // Try alternate manifest format — flat object
    if (typeof manifest === 'object' && !Array.isArray(manifest)) {
      for (const [key, val] of Object.entries(manifest)) {
        if (key.includes('Raw_CardDatabase') || key.includes('raw_carddatabase')) {
          cardDbEntry = { Name: key };
          break;
        }
      }
    }
  }

  if (!cardDbEntry) {
    console.error('[Arena CDN] Could not find Raw_CardDatabase in manifest.');
    throw new Error('Raw_CardDatabase not found in manifest');
  }

  const cardDbName = cardDbEntry.Name || cardDbEntry.name;
  const isGzWrapped = (cardDbEntry.wrapper || '').toLowerCase() === 'gz';
  console.log(`[Arena CDN]   Card database asset: ${cardDbName} (gz=${isGzWrapped})`);

  console.log('[Arena CDN] Step 4: Downloading card database...');
  // Assets with wrapper="gz" need .gz appended to the URL
  const dbUrl = isGzWrapped
    ? `${ASSETS_BASE}/${cardDbName}.gz`
    : `${ASSETS_BASE}/${cardDbName}`;
  const dbBuf = await fetchBuffer(dbUrl);
  console.log(`[Arena CDN]   Downloaded ${(dbBuf.length / 1024 / 1024).toFixed(1)} MB`);

  // Decompress — always try gunzip (gz-wrapped assets are always compressed)
  let sqliteBuf;
  try {
    sqliteBuf = await gunzipBuffer(dbBuf);
    console.log(`[Arena CDN]   Decompressed to ${(sqliteBuf.length / 1024 / 1024).toFixed(1)} MB`);
  } catch {
    sqliteBuf = dbBuf;
    console.log('[Arena CDN]   Not gzipped, using raw buffer');
  }

  // Write to temp file for SQLite access
  const tmpDb = path.join(os.tmpdir(), `arena_card_db_${Date.now()}.sqlite`);
  fs.writeFileSync(tmpDb, sqliteBuf);

  console.log('[Arena CDN] Step 5: Extracting grpId→name mappings...');
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch {
    console.error('[Arena CDN] better-sqlite3 not available. Run: npm install');
    throw new Error('better-sqlite3 required');
  }

  const db = new Database(tmpDb, { readonly: true });

  // Query Cards joined with English localizations
  const cards = {};
  try {
    const rows = db.prepare(`
      SELECT c.GrpId, l.enUS AS Loc, c.ExpansionCode, c.CollectorNumber
      FROM Cards c
      JOIN Localizations l ON c.TitleId = l.LocId
      WHERE l.enUS IS NOT NULL AND l.enUS != ''
    `).all();

    for (const row of rows) {
      cards[row.GrpId] = row.Loc;
    }
    console.log(`[Arena CDN]   Found ${Object.keys(cards).length} cards`);
  } catch (err) {
    // Try alternate schema — Localizations_enUS table
    console.log('[Arena CDN]   Primary query failed, trying alternate schema...');
    try {
      const rows = db.prepare(`
        SELECT c.GrpId, l.Loc, c.ExpansionCode, c.CollectorNumber
        FROM Cards c
        JOIN Localizations_enUS l ON c.TitleId = l.LocId
        WHERE l.Loc IS NOT NULL AND l.Loc != ''
      `).all();

      for (const row of rows) {
        cards[row.GrpId] = row.Loc;
      }
      console.log(`[Arena CDN]   Found ${Object.keys(cards).length} cards (alternate schema)`);
    } catch (err2) {
      // Last resort: dump table names for debugging
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.error('[Arena CDN]   Available tables:', tables.map(t => t.name));
      throw err2;
    }
  }

  db.close();

  // Clean up temp file
  try { fs.unlinkSync(tmpDb); } catch { /* ignore */ }

  // Write output JSON
  const output = {
    version: versionClean,
    generated: new Date().toISOString(),
    count: Object.keys(cards).length,
    cards,
  };

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output));
  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
  console.log(`[Arena CDN] Done! Wrote ${outputPath} (${sizeKB} KB, ${output.count} cards)`);

  return output;
}

// ── CLI entry point ─────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  let outputPath = DEFAULT_OUTPUT;

  const outputIdx = args.indexOf('--output');
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    outputPath = path.resolve(args[outputIdx + 1]);
  }

  downloadArenaCardDb(outputPath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Arena CDN] FATAL:', err.message);
      process.exit(1);
    });
}

// Export for programmatic use (from ipc-handlers)
module.exports = { downloadArenaCardDb, fetchText, parseVersionResponse, VERSION_URL };
