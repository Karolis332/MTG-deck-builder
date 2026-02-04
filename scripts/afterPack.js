/**
 * electron-builder afterPack hook.
 * Rebuilds better-sqlite3 native module for the packaged Electron runtime.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function getElectronVersion(context) {
  // Try various ways to get the Electron version
  if (context.packager?.electronVersion) return context.packager.electronVersion;
  if (context.packager?.config?.electronVersion) return context.packager.config.electronVersion;

  // Read from the installed electron package (devDependency in source)
  try {
    const electronPkg = path.join(process.cwd(), 'node_modules', 'electron', 'package.json');
    return JSON.parse(fs.readFileSync(electronPkg, 'utf-8')).version;
  } catch {}

  // Read the version.txt that electron ships
  try {
    const versionFile = path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'version');
    return fs.readFileSync(versionFile, 'utf-8').trim().replace('v', '');
  } catch {}

  throw new Error('Could not determine Electron version');
}

module.exports = async function afterPack(context) {
  const appDir = path.join(context.appOutDir, 'resources', 'app');
  const electronVersion = getElectronVersion(context);
  const sqliteDir = path.join(appDir, 'node_modules', 'better-sqlite3');

  console.log(`[afterPack] Rebuilding better-sqlite3 for Electron v${electronVersion}`);

  try {
    execSync(
      `npx --yes prebuild-install --runtime electron --target ${electronVersion} --arch x64`,
      {
        cwd: sqliteDir,
        stdio: 'inherit',
        env: { ...process.env },
      }
    );
    console.log('[afterPack] better-sqlite3 rebuilt successfully');
  } catch (err) {
    console.error('[afterPack] Failed to rebuild better-sqlite3:', err.message);
    throw err;
  }
};
