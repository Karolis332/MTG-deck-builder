import fs from 'fs';
import { getDb } from '../../src/lib/db';
import { scoreDeckSafely } from '../../src/lib/deck-score-input';
import type { DbCard } from '../../src/lib/types';
const db = getDb();
const q = db.prepare("select * from cards where (name = ? or name like ?) and layout not in ('art_series','token') order by length(name) limit 1");
const lines = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
let sec = "Commander"; let first = true; const main: { card: DbCard; quantity: number }[] = []; const cmd: DbCard[] = [];
for (const l of lines) { const t = l.trim(); if (!t) continue; if (/^(Commander|Deck|Sideboard)$/i.test(t)) { sec = t; continue; }
  const m = /^(\d+)\s+(.+?)(?:\s*\([A-Za-z0-9]{2,6}\)\s*\S+)?$/.exec(t); if (!m) continue;
  const c = q.get(m[2], m[2] + ' // %') as DbCard | undefined; if (!c) { console.log('miss', m[2]); continue; }
  if (/commander/i.test(sec) && first) { cmd.push(c); first = false; sec = "Deck"; } else main.push({ card: c, quantity: +m[1] }); }
let t0 = Date.now(); let r = scoreDeckSafely({ format: 'commander', main, commander: cmd });
console.log('first', Date.now() - t0, 'ms');
t0 = Date.now(); for (let i = 0; i < 10; i++) r = scoreDeckSafely({ format: 'commander', main, commander: cmd });
console.log('avg', (Date.now() - t0) / 10, 'ms', r?.score, r?.absoluteTotal.toFixed(2), r?.rank?.toFixed(1), r?.components.map(c => c.key + ':' + c.score.toFixed(0)).join(' '));
