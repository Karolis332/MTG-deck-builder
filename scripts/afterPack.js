/**
 * electron-builder afterPack hook.
 * Rebuilds better-sqlite3 native module for the packaged Electron runtime.
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

  throw new Error('Could not determine Electron version');
}

module.exports = async function afterPack(context) {
  const electronVersion = getElectronVersion(context);

  // Standalone is now in extraResources, not inside the app directory
  const resourcesDir = path.join(context.appOutDir, 'resources');
  const sqliteDir = path.join(resourcesDir, 'standalone', 'node_modules', 'better-sqlite3');

  if (!fs.existsSync(sqliteDir)) {
    // Fallback: check app/node_modules
    const appSqlite = path.join(resourcesDir, 'app', 'node_modules', 'better-sqlite3');
    if (fs.existsSync(appSqlite)) {
      console.log('[afterPack] Found better-sqlite3 in app/node_modules');
      return rebuild(appSqlite, electronVersion);
    }
    throw new Error(`better-sqlite3 not found at ${sqliteDir}`);
  }

  // Check if prebuilt binary already exists (skip network call on repeated builds)
  const prebuildDir = path.join(sqliteDir, 'prebuilds');
  const alreadyBuilt = fs.existsSync(prebuildDir) && fs.readdirSync(prebuildDir).length > 0;
  if (alreadyBuilt) {
    console.log('[afterPack] Prebuilt binary exists, skipping rebuild');
    return;
  }

  rebuild(sqliteDir, electronVersion);
};

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
