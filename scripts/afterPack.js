/**
 * electron-builder afterPack hook.
 * Rebuilds better-sqlite3 native module for the packaged Electron runtime.
 *
 * For ow-electron (Overwolf), prebuild-install has no prebuilt binaries for
 * the fork version (e.g. 37.10.3). In that case, we copy the native module
 * that @electron/rebuild already compiled during the earlier build step.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function getElectronVersion(context) {
  if (context.packager?.electronVersion) return context.packager.electronVersion;
  if (context.packager?.config?.electronVersion) return context.packager.config.electronVersion;

  try {
    const electronPkg = path.join(process.cwd(), 'node_modules', 'electron', 'package.json');
    return JSON.parse(fs.readFileSync(electronPkg, 'utf-8')).version;
  } catch {}

  try {
    const versionFile = path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'version');
    return fs.readFileSync(versionFile, 'utf-8').trim().replace('v', '');
  } catch {}

  // Fallback: ow-electron (Overwolf's Electron fork)
  try {
    const owElectronPkg = path.join(process.cwd(), 'node_modules', '@overwolf', 'ow-electron', 'package.json');
    return JSON.parse(fs.readFileSync(owElectronPkg, 'utf-8')).version;
  } catch {}

  throw new Error('Could not determine Electron version');
}

function isOverwolfBuild(context) {
  // Detect Overwolf build by output dir or config
  const outDir = context.appOutDir || '';
  return outDir.includes('overwolf') ||
    context.packager?.config?.directories?.output?.includes?.('overwolf');
}

module.exports = async function afterPack(context) {
  const electronVersion = getElectronVersion(context);
  const resourcesDir = path.join(context.appOutDir, 'resources');
  const sqliteDir = path.join(resourcesDir, 'standalone', 'node_modules', 'better-sqlite3');

  // ── Step 0: Ensure ffmpeg.dll is present ─────────────────────────────
  // electron-builder sometimes strips ffmpeg.dll from the output. Without it
  // the exe fails with "ffmpeg.dll was not found" on launch.
  const ffmpegDest = path.join(context.appOutDir, 'ffmpeg.dll');
  if (!fs.existsSync(ffmpegDest)) {
    const ffmpegSrc = path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'ffmpeg.dll');
    if (fs.existsSync(ffmpegSrc)) {
      console.log('[afterPack] ffmpeg.dll missing from output — copying from electron/dist/');
      fs.copyFileSync(ffmpegSrc, ffmpegDest);
    } else {
      console.warn('[afterPack] WARNING: ffmpeg.dll not found in electron/dist/ either');
    }
  }

  // ── Step 1: Ensure standalone/node_modules exists ──────────────────────
  // ow-electron-builder may strip node_modules from extraResources copies.
  if (!fs.existsSync(path.join(resourcesDir, 'standalone', 'node_modules'))) {
    const srcStandaloneModules = path.join(process.cwd(), '.next', 'standalone', 'node_modules');
    const destStandaloneModules = path.join(resourcesDir, 'standalone', 'node_modules');
    if (fs.existsSync(srcStandaloneModules)) {
      console.log('[afterPack] Standalone node_modules missing in output — copying from .next/standalone/');
      copyDirSync(srcStandaloneModules, destStandaloneModules);
    }
  }

  // ── Step 2: Find better-sqlite3 ──────────────────────────────────────
  let targetSqliteDir = sqliteDir;
  if (!fs.existsSync(targetSqliteDir)) {
    const appSqlite = path.join(resourcesDir, 'app', 'node_modules', 'better-sqlite3');
    if (fs.existsSync(appSqlite)) {
      console.log('[afterPack] Found better-sqlite3 in app/node_modules');
      targetSqliteDir = appSqlite;
    } else {
      console.log('[afterPack] better-sqlite3 not found anywhere — skipping rebuild');
      return;
    }
  }

  // ── Step 3: Clean stale builds ─────────────────────────────────────────
  // The standalone copy always has a Node.js-compiled binary from next build.
  // We must rebuild for Electron's ABI, so remove any existing artifacts first.
  const prebuildDir = path.join(targetSqliteDir, 'prebuilds');
  const buildDir = path.join(targetSqliteDir, 'build', 'Release');
  if (fs.existsSync(prebuildDir)) {
    console.log('[afterPack] Removing stale prebuilds/');
    fs.rmSync(prebuildDir, { recursive: true, force: true });
  }
  if (fs.existsSync(buildDir) && fs.existsSync(path.join(buildDir, 'better_sqlite3.node'))) {
    console.log('[afterPack] Removing stale build/Release/better_sqlite3.node');
    fs.unlinkSync(path.join(buildDir, 'better_sqlite3.node'));
  }

  // ── Step 4: Rebuild ────────────────────────────────────────────────────
  // For Overwolf builds (ow-electron fork versions like 37.x), prebuild-install
  // won't find prebuilt binaries. Copy the one @electron/rebuild already compiled.
  if (isOverwolfBuild(context)) {
    const rebuiltNode = path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(rebuiltNode)) {
      console.log(`[afterPack] Using @electron/rebuild output for ow-electron v${electronVersion}`);
      const destBuildDir = path.join(targetSqliteDir, 'build', 'Release');
      fs.mkdirSync(destBuildDir, { recursive: true });
      fs.copyFileSync(rebuiltNode, path.join(destBuildDir, 'better_sqlite3.node'));
      console.log('[afterPack] Copied pre-rebuilt better_sqlite3.node');
      return;
    }
    console.log('[afterPack] No @electron/rebuild output found, attempting prebuild-install anyway...');
  }

  rebuild(targetSqliteDir, electronVersion);
};

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rebuild(sqliteDir, electronVersion) {
  console.log(`[afterPack] Rebuilding better-sqlite3 for Electron v${electronVersion}`);
  console.log(`[afterPack] Location: ${sqliteDir}`);

  execSync(
    `npx --yes prebuild-install --runtime electron --target ${electronVersion} --arch x64`,
    {
      cwd: sqliteDir,
      stdio: 'inherit',
      env: { ...process.env },
    }
  );
  console.log('[afterPack] better-sqlite3 rebuilt successfully');
}
