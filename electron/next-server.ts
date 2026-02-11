// Standalone Next.js server launcher for Electron
// The standalone server.js is fully self-contained — it bundles its own
// traced node_modules and starts an HTTP server. We just set env vars and run it.

import path from 'path';
import fs from 'fs';

const appDir = process.env.APP_DIR || process.cwd();
const port = process.env.PORT || '3000';

// In packaged app, standalone is in extraResources; in dev, it's in .next/
const standaloneDir = process.env.STANDALONE_DIR || path.join(appDir, '.next', 'standalone');

console.log('[Next Server] Starting standalone server...');
console.log('[Next Server] Port:', port);
console.log('[Next Server] App directory:', appDir);
console.log('[Next Server] Standalone directory:', standaloneDir);

const serverPath = path.join(standaloneDir, 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error(`[Next Server] server.js not found at: ${serverPath}`);
  process.exit(1);
}

// Set env vars the standalone server reads
process.env.PORT = port;
process.env.HOSTNAME = 'localhost';

// Run the standalone server — it calls process.chdir(__dirname) internally
// and starts an HTTP listener, printing "✓ Ready in Xms" when done.
require(serverPath);
