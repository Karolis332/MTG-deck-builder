import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 15000,
    // Tests must never touch the operator's live Electron DB (%APPDATA%/the-black-grimoire),
    // which src/lib/db.ts prefers when MTG_DB_DIR is unset. Pin the repo DB for every worker.
    env: { MTG_DB_DIR: process.env.MTG_DB_DIR ?? path.resolve(__dirname, 'data') },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
