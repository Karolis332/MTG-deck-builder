---
name: project-electron-main-process-imports
description: "Electron main process can't import @/-aliased or native-dep modules without the alias shim + app/node_modules bundling"
metadata: 
  node_type: memory
  type: project
  originSessionId: 519b7497-cb9e-455c-b45e-256e350b3f6d
---

The Electron **main process** (`electron/main.ts` → compiled `electron-dist/`) has NO bundler and a separate `node_modules` resolution root from the standalone Next server. Two traps when the main process imports shared `src/lib` modules:

1. **`@/` path alias** — tsc only rewrites alias *types*, not emitted `require()` calls. `electron/register-aliases.ts` (a `Module._resolveFilename` shim) MUST be the first import in `main.ts` or any `require("@/...")` throws "Cannot find module '@/...'".
2. **Native deps (better-sqlite3)** — must be whitelisted in `electron-builder.yml` `files` into `resources/app/node_modules`, AND `scripts/afterPack.js` Step 5 syncs the Electron-ABI (NODE_MODULE_VERSION 130) binary from the standalone copy into the app copy. `@electron/rebuild` leaves the root copy at the Node ABI (127) → "compiled against a different Node.js version".

**Why:** commit 157d66c added a startup commander-stats sync that made the main process import `db.js` for the first time, exposing both gaps (app wouldn't launch: blank single process, Electron's default "JavaScript error in the main process" dialog fired during top-level require, before main.ts's own crash handler).

**How to apply:** Before adding any `import` to `electron/*.ts` that pulls in `src/lib` code, verify it resolves in the packaged main process. Debug launches: tail `%APPDATA%/the-black-grimoire/telemetry-debug.log` for `MAIN:` traces — no trace = top-level require threw. A healthy launch = 5 processes. Related: [[project_engine_bughunt_2026-06-13]].
