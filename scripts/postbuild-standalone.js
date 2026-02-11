/**
 * Post-build script for standalone mode.
 * Copies files that the standalone server.js needs but aren't included
 * in the traced output: .next/static, public, and better-sqlite3 (native).
 */
const fs = require('fs');
const path = require('path');

const STANDALONE = path.join('.next', 'standalone');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
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

console.log('[postbuild] Done');
