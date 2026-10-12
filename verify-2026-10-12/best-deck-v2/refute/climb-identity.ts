// Refuter scratch: HEAD climbDeck vs working-tree climbDeck (no onEvaluate) on 300 random synthetic cases.
import { climbDeck as headClimb } from './deck-climb-head';
import { climbDeck as newClimb } from '../../../src/lib/deck-climb';

function rng(seed: number): () => number { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
type C = { name: string; v: number; price: number };
let mismatches = 0; let swapCases = 0;
for (let s = 1; s <= 300; s++) {
  const r = rng(s);
  const basics: C[] = [{ name: 'Forest', v: 0.1, price: 0 }, { name: 'Plains', v: 0.12, price: 0 }];
  const pool: C[] = Array.from({ length: 60 }, (_, i) => ({ name: `P${i}`, v: Math.round(r() * 10) / 10, price: Math.floor(r() * 5) }));
  const start: C[] = [...pool.slice(0, 12), ...Array(5).fill(basics[0]), ...Array(3).fill(basics[1])];
  const candidates = [...pool.slice(12), ...basics];
  // Non-additive evaluate with ties (rounded values) to stress sort stability.
  const evaluate = (d: readonly (C | null)[]) => { const vals = d.map((c) => (c ? c.v : 0)); const sum = vals.reduce((a, b) => a + b, 0); return Math.round((sum + 0.3 * Math.max(...vals) - 0.01 * d.filter((c) => c?.name === 'Forest').length) * 100) / 100; };
  const opts = { maxPasses: 1 + (s % 4), topK: 3 + (s % 6), batch: 1 + (s % 5), epsilon: s % 3 ? 0.25 : 0, repeatable: new Set(['Forest', 'Plains']), locked: s % 5 ? undefined : new Set(['P0']), canSwap: s % 2 ? (d: readonly C[], i: number, c: C) => d.reduce((a, x) => a + x.price, 0) - d[i].price + c.price <= 30 : undefined } as any;
  const a = JSON.stringify(headClimb(start, candidates, evaluate, opts));
  const b = JSON.stringify(newClimb(start, candidates, evaluate, opts));
  if (JSON.parse(b).swaps.length) swapCases++;
  if (a !== b) { mismatches++; if (mismatches < 3) console.log('MISMATCH seed', s); }
}
console.log(`climb identity: ${300 - mismatches}/300 identical (HEAD vs working tree, no hook); cases with swaps: ${swapCases}`);
