/**
 * Post-build script for standalone mode.
 * Copies files that the standalone server.js needs but aren't included
 * in the traced output: .next/static, public, and better-sqlite3 (native).
 *
 * IMPORTANT: The data/ directory contains the live SQLite database (~4.8 GB),
 * ML model files, pipeline logs, and other large runtime artifacts that must
 * NEVER be bundled into the packaged Electron app. Only arena_grp_ids.json
 * is needed at runtime and is copied explicitly below.
 */
const fs = require('fs');
const path = require('path');

const STANDALONE = path.join('.next', 'standalone');

// File extensions and names that must never be packaged
const BLOCKED_EXTENSIONS = new Set(['.db', '.db-wal', '.db-shm', '.sqlite', '.sqlite-wal', '.sqlite-shm']);
const BLOCKED_NAMES = new Set([
  'mtg-deck-builder.db',
  'vps-scraped.db',
  'arena_card_database.sqlite',
  'card_model.joblib',
  'pipeline_failures.json',
  'pipeline_run.log',
  'pipeline_out.txt',
  'pipeline_report.json',
  'pipeline_monitor.log',
  'pipeline_monitor_edhrec.log',
  'pipeline_monitor_edhrec_avg.log',
  'pipeline_monitor_top8.log',
  'AtomicCards.json.gz',
  'bridge.log',
  'daily_report_2026-04-04.pdf',
]);

function isBlocked(name) {
  if (BLOCKED_NAMES.has(name)) return true;
  const ext = path.extname(name).toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
}

function copyDirRecursive(src, dest, filterFn) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (filterFn && filterFn(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy .next/static → standalone/.next/static (CSS, JS chunks)
copyDirRecursive(
  path.join('.next', 'static'),
  path.join(STANDALONE, '.next', 'static')
);
console.log('[postbuild] Copied .next/static into standalone');

// 2. Copy public/ → standalone/public/ (if exists)
if (fs.existsSync('public')) {
  copyDirRecursive('public', path.join(STANDALONE, 'public'));
  console.log('[postbuild] Copied public into standalone');
}

// 3. Copy better-sqlite3 + native deps into standalone/node_modules
// The standalone trace doesn't include native addons.
const nativeModules = ['better-sqlite3', 'bindings', 'file-uri-to-path', 'prebuild-install'];
const standaloneNM = path.join(STANDALONE, 'node_modules');

for (const mod of nativeModules) {
  const src = path.join('node_modules', mod);
  const dest = path.join(standaloneNM, mod);
  if (fs.existsSync(src)) {
    copyDirRecursive(src, dest);
    console.log(`[postbuild] Copied ${mod} into standalone/node_modules`);
  }
}

// 4. Copy arena_grp_ids.json → standalone/data/ (only this file; never the DB or ML files)
// The full data/ directory contains the live SQLite DB (~4.8 GB) and other large runtime
// artifacts that must not be packaged. arena_grp_ids.json is looked up at runtime via
// process.resourcesPath, so it also lives in extraResources in electron-builder.yml.
const grpIdsSrc = path.join('data', 'arena_grp_ids.json');
const grpIdsDest = path.join(STANDALONE, 'data', 'arena_grp_ids.json');
if (fs.existsSync(grpIdsSrc)) {
  fs.mkdirSync(path.join(STANDALONE, 'data'), { recursive: true });
  fs.copyFileSync(grpIdsSrc, grpIdsDest);
  console.log('[postbuild] Copied arena_grp_ids.json into standalone/data');
} else {
  console.warn('[postbuild] WARNING: data/arena_grp_ids.json not found — Arena grpId resolution will be degraded');
}

// Defensive guard: warn if any .db file ended up in standalone/data by accident
const standaloneData = path.join(STANDALONE, 'data');
if (fs.existsSync(standaloneData)) {
  for (const name of fs.readdirSync(standaloneData)) {
    if (isBlocked(name)) {
      console.error(`[postbuild] ERROR: blocked file found in standalone/data/: ${name} — remove it before packaging`);
      process.exitCode = 1;
    }
  }
}

console.log('[postbuild] Done');
