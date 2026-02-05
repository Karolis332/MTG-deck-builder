// Programmatic Next.js server for Electron
// This file is spawned as a separate process to run the Next.js server

import path from 'path';

async function startServer() {
  const port = parseInt(process.env.PORT || '3000');
  const appDir = process.env.APP_DIR || process.cwd();
  const dev = process.env.NODE_ENV !== 'production';

  console.log('[Next Server] Starting...');
  console.log('[Next Server] Port:', port);
  console.log('[Next Server] App directory:', appDir);
  console.log('[Next Server] Development mode:', dev);

  try {
    // Import Next.js dynamically
    const nextPath = path.join(appDir, 'node_modules', 'next', 'dist', 'server', 'next.js');
    const { default: next } = await import(nextPath);

    const app = next({
      dev: false,
      dir: appDir,
      quiet: false,
      hostname: 'localhost',
      port,
    });

    await app.prepare();

    const handle = app.getRequestHandler();

    // Create HTTP server
    const http = await import('http');
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(port, () => {
        console.log(`[Next Server] Ready on http://localhost:${port}`);
        resolve();
      });

      server.on('error', (err) => {
        console.error('[Next Server] Error:', err);
        reject(err);
      });
    });

    // Keep alive
    process.on('SIGTERM', () => {
      console.log('[Next Server] SIGTERM received, shutting down...');
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('[Next Server] Fatal error:', err);
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error('[Next Server] Failed to start:', err);
  process.exit(1);
});
