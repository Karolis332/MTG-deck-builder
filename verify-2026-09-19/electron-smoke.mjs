// Smoke test for the packaged release: launch win-unpacked exe with a fresh profile, wait for the app window, screenshot.
import { _electron as electron } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = 'C:/Users/QuLeR/MTG-deck-builder/dist-electron/win-unpacked/the-black-grimoire.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tbg-smoke-'));
const out = 'C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-19';
const app = await electron.launch({ executablePath: exe, args: [], env: { ...process.env, ELECTRON_USER_DATA: profile, MTG_DB_DIR: path.join(profile, 'data') }, timeout: 60000 });
const t0 = Date.now();
let win = null;
for (let i = 0; i < 120 && !win; i++) { const wins = app.windows(); win = wins.find(w => /^(http|file):/.test(w.url())) || null; if (!win) await new Promise(r => setTimeout(r, 1000)); }
if (!win) { console.log('NO_WINDOW after 60s; windows:', app.windows().map(w => w.url())); await app.close(); process.exit(1); }
await win.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
await new Promise(r => setTimeout(r, 8000));
const url = win.url(); const title = await win.title().catch(() => '');
const text = await win.evaluate(() => document.body?.innerText?.slice(0, 300) || '').catch(() => '');
await win.screenshot({ path: path.join(out, 'release-smoke-window.png') }).catch(() => {});
console.log(JSON.stringify({ ms: Date.now() - t0, url, title, windows: app.windows().length, textHead: text.replace(/\s+/g, ' ').slice(0, 200) }));
await app.close();
fs.rmSync(profile, { recursive: true, force: true });
