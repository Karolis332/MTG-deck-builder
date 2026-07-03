// Runtime resolver for the "@/..." path alias used by shared src/ modules.
// tsc rewrites alias types but NOT emitted require() calls, and the Electron
// main process has no bundler. Without this hook, requiring any @/-aliased
// module (e.g. db.ts -> '@/db/schema') throws "Cannot find module '@/...'".
// Must be imported before the first @/-aliased module. Compiled location is
// electron-dist/electron/, so "@/x" maps to electron-dist/src/x.
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Module = require('module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: unknown[]): string {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2));
  }
  return originalResolve.call(this, request, ...rest);
};
