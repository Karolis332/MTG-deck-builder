/**
 * First-boot handler for Electron standalone app.
 *
 * When the app launches after the setup wizard, this module checks for
 * pending actions (account creation, card seeding) and executes them
 * against the running Next.js API.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

interface AppConfig {
  setupComplete?: boolean;
  seedOnBoot?: boolean;
  pendingAccount?: {
    username: string;
    email: string;
    password: string;
  };
  arenaLogPath?: string | null;
  autoStartWatcher?: boolean;
}

function getConfigPath(): string {
  // In Electron, userData is set; in dev, use cwd
  const electronUserData = process.env.ELECTRON_USER_DATA;
  if (electronUserData) {
    return path.join(electronUserData, 'app-config.json');
  }
  // Fallback: check common Electron paths
  const appName = 'The Black Grimoire';
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(home, '.config', appName, 'app-config.json'),
    path.join(home, 'Library', 'Application Support', appName, 'app-config.json'),
    path.join(process.env.APPDATA || '', appName, 'app-config.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), 'app-config.json');
}

function loadConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(data: Partial<AppConfig>): void {
  const configPath = getConfigPath();
  const existing = loadConfig();
  const merged = { ...existing, ...data };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
}

function postJson(route: string, body: unknown): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const port = process.env.PORT || '3000';

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: route,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode || 500, data: body });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Seed the grp_id_cache table from the bundled arena_grp_ids.json file.
 * Runs on first boot or when the bundled version differs from what's stored.
 */
export async function seedArenaCardCache(): Promise<void> {
  // Locate the bundled JSON
  const candidates = [
    // Packaged Electron — extraResources
    process.resourcesPath ? path.join(process.resourcesPath, 'arena_grp_ids.json') : '',
    // Dev mode — data/ directory
    path.join(process.cwd(), 'data', 'arena_grp_ids.json'),
    // Fallback: relative to this file
    path.join(__dirname, '..', '..', 'data', 'arena_grp_ids.json'),
  ].filter(Boolean);

  let jsonPath = '';
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      jsonPath = p;
      break;
    }
  }

  if (!jsonPath) {
    console.log('[ArenaCardCache] No bundled arena_grp_ids.json found — skipping seed');
    return;
  }

  let data: { version: string; count: number; cards: Record<string, string> };
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (err) {
    console.error('[ArenaCardCache] Failed to parse arena_grp_ids.json:', err);
    return;
  }

  if (!data.cards || !data.version) {
    console.log('[ArenaCardCache] Invalid arena_grp_ids.json format — skipping');
    return;
  }

  // Check stored version in app_state via API
  const port = process.env.PORT || '3000';
  try {
    const versionResp = await new Promise<string>((resolve, reject) => {
      http.get(`http://localhost:${port}/api/cards/search?q=_arena_card_db_version_check_`, (res) => {
        res.resume();
        resolve(''); // We don't actually use this — check DB directly below
      }).on('error', reject);
    }).catch(() => '');

    // Use a direct DB check via a lightweight POST to avoid needing a dedicated endpoint
    // Instead, we'll just always seed if the file exists — the INSERT OR IGNORE makes it idempotent
  } catch {
    // Server may not be fully ready — proceed with seed anyway
  }

  console.log(`[ArenaCardCache] Seeding ${data.count || Object.keys(data.cards).length} grpId mappings from bundled v${data.version}...`);

  // Bulk seed via local DB access (we're in Electron main process)
  try {
    const dbDir = process.env.MTG_DB_DIR || path.join(process.cwd(), 'data');
    const dbPath = path.join(dbDir, 'mtg-deck-builder.db');

    if (!fs.existsSync(dbPath)) {
      console.log('[ArenaCardCache] Database not found yet — skipping seed');
      return;
    }

    const Database = require('better-sqlite3'); // dynamic require — runs in Electron main process only
    const db = new Database(dbPath, { readonly: false });

    // Check stored version
    let storedVersion = '';
    try {
      const row = db.prepare("SELECT value FROM app_state WHERE key = 'arena_card_db_version'").get() as { value: string } | undefined;
      storedVersion = row?.value || '';
    } catch {
      // app_state table may not exist yet
    }

    if (storedVersion === data.version) {
      console.log(`[ArenaCardCache] Already seeded v${data.version} — skipping`);
      db.close();
      return;
    }

    // Ensure grp_id_cache table exists (migration v21 creates it, but be safe)
    db.exec(`
      CREATE TABLE IF NOT EXISTS grp_id_cache (
        grp_id INTEGER PRIMARY KEY,
        card_name TEXT NOT NULL,
        scryfall_id TEXT,
        image_uri_small TEXT,
        image_uri_normal TEXT,
        mana_cost TEXT,
        cmc REAL,
        type_line TEXT,
        oracle_text TEXT,
        source TEXT DEFAULT 'arena_cdn',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Bulk insert with INSERT OR IGNORE (won't overwrite richer data from scryfall/arena_id sources)
    const insert = db.prepare(
      `INSERT OR IGNORE INTO grp_id_cache (grp_id, card_name, source) VALUES (?, ?, 'arena_cdn')`
    );

    const bulkInsert = db.transaction(() => {
      let inserted = 0;
      for (const [grpId, name] of Object.entries(data.cards)) {
        const result = insert.run(parseInt(grpId, 10), name);
        if (result.changes > 0) inserted++;
      }
      return inserted;
    });

    const inserted = bulkInsert();
    console.log(`[ArenaCardCache] Inserted ${inserted} new grpId mappings (${Object.keys(data.cards).length} total in file)`);

    // Store version
    db.prepare(
      `INSERT OR REPLACE INTO app_state (key, value) VALUES ('arena_card_db_version', ?)`
    ).run(data.version);

    db.close();
    console.log(`[ArenaCardCache] Seed complete — version ${data.version} stored`);
  } catch (err) {
    console.error('[ArenaCardCache] Seed error:', err);
  }
}

/**
 * Run pending first-boot actions.
 * Call this after the Next.js server is confirmed running.
 */
export async function runFirstBootActions(): Promise<void> {
  const config = loadConfig();

  // 1. Create pending account
  if (config.pendingAccount) {
    try {
      const result = await postJson('/api/auth/register', config.pendingAccount);
      if (result.status === 200 || result.status === 201) {
        console.log('[FirstBoot] Account created:', config.pendingAccount.username);
        saveConfig({ pendingAccount: undefined });
      } else {
        console.error('[FirstBoot] Account creation failed:', result.data);
      }
    } catch (err) {
      console.error('[FirstBoot] Account creation error:', err);
    }
  }

  // 2. Trigger card seeding
  if (config.seedOnBoot) {
    try {
      console.log('[FirstBoot] Triggering card database seed...');
      const result = await postJson('/api/cards/seed', {});
      console.log('[FirstBoot] Seed result:', result.status);
      saveConfig({ seedOnBoot: false });
    } catch (err) {
      console.error('[FirstBoot] Seed error:', err);
    }
  }
}
