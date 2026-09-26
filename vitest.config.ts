import { defineConfig } from 'vitest/config';
import path from 'path';

// Tests write to the DB (build-api seeds its temp collection, fixtures insert rows). Never let them
// reach the operator's live Electron DB — 2026-09-26 a suite run with MTG_DB_DIR set to it emptied
// the collection table. Unset → the repo DB; set to the live app data dir → refuse to start.
const dbDir = process.env.MTG_DB_DIR ?? path.resolve(__dirname, 'data');
if (/the-black-grimoire/i.test(dbDir)) {
  throw new Error(`vitest refuses the live app DB (MTG_DB_DIR=${dbDir}); unset it to use the repo DB`);
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 15000,
    env: { MTG_DB_DIR: dbDir },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
