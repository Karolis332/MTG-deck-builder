/**
 * Paper decks + paper collection → the desktop DB, with version history.
 *
 *   decks/paper/decks/*.txt   one physical deck per file, ManaBox lines ("1 Name" or "Name"),
 *                             first card line = commander. Sloppy spelling is fine: names are
 *                             resolved against the card table and the file is rewritten canonical.
 *   decks/paper/collection.txt  every paper card owned (cards in decks are merged in automatically).
 *   decks/paper/open-cards.txt  GENERATED: owned minus what the decks use (basics excluded).
 *   decks/paper/HISTORY.md      GENERATED: one dated line per deck change / collection change.
 *
 * DB side (user --user, default 1): decks tagged built_by='paper' are upserted, a deck_versions
 * snapshot is written whenever the list changed, and the user's source='paper' collection rows are
 * rebuilt from collection.txt. The app's command center then consults the model on those decks.
 *
 *   npx tsx scripts/paper-sync.ts [--user 1] [--dry]
 */
import fs from 'fs';
import path from 'path';
import { getDb, createDeck, clearCollection, upsertCollectionCard } from '../src/lib/db';
import { createVersionSnapshot, type SnapshotCard } from '../src/lib/deck-versioning';

const ROOT = path.resolve(__dirname, '..', 'decks', 'paper');
const DECKS_DIR = path.join(ROOT, 'decks');
const COLLECTION = path.join(ROOT, 'collection.txt');
const OPEN = path.join(ROOT, 'open-cards.txt');
const HISTORY = path.join(ROOT, 'HISTORY.md');
const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const SKIP_LAYOUTS = new Set(['token', 'double_faced_token', 'emblem', 'art_series', 'scheme', 'planar', 'vanguard']);

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const USER = Number(args[args.indexOf('--user') + 1] || 1);

interface CardRow { id: string; name: string; layout: string | null; type_line: string }
interface Line { qty: number; raw: string }
interface Resolved { card: CardRow; qty: number; via: 'exact' | 'fuzzy' }
const fuzzyLog = new Map<string, string>();

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// ── Card index ────────────────────────────────────────────────────────────────
function buildIndex() {
  const rows = getDb().prepare('SELECT id, name, layout, type_line FROM cards').all() as CardRow[];
  const byNorm = new Map<string, CardRow>();
  const front: { key: string; card: CardRow }[] = [];
  for (const r of rows) {
    if (SKIP_LAYOUTS.has(r.layout || '') || /\bToken\b/.test(r.type_line || '')) continue;
    const keys = [norm(r.name), norm(r.name.split(' // ')[0])];
    for (const k of keys) if (k && !byNorm.has(k)) byNorm.set(k, r);
    front.push({ key: keys[1], card: r });
  }
  const cache = new Map<string, Resolved | null>();
  return (raw: string, qty: number): Resolved | null => {
    const key = norm(raw);
    if (!key) return null;
    const hit = cache.get(key);
    if (hit !== undefined) return hit && { ...hit, qty };
    let out: Resolved | null = null;
    const exact = byNorm.get(key);
    if (exact) out = { card: exact, qty, via: 'exact' };
    else {
      // Short keys collide with real cards ("lands" → "Lance"), so they only get one edit.
      const budget = key.length <= 9 ? 1 : key.length <= 14 ? 2 : 3;
      let best: { d: number; card: CardRow } | null = null;
      for (const f of front) {
        if (Math.abs(f.key.length - key.length) > budget) continue;
        const d = levenshtein(key, f.key);
        if (d <= budget && (!best || d < best.d)) best = { d, card: f.card };
      }
      if (best) { out = { card: best.card, qty, via: 'fuzzy' }; fuzzyLog.set(raw, best.card.name); }
    }
    cache.set(key, out);
    return out;
  };
}

// ── Files ─────────────────────────────────────────────────────────────────────
function readLines(file: string): Line[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
    .map((l) => {
      const m = /^(\d+)\s*x?\s+(.+)$/i.exec(l);
      return m ? { qty: Number(m[1]), raw: m[2].trim() } : { qty: 1, raw: l };
    });
}

const face = (name: string) => name.split(' // ')[0];
const manabox = (cards: { card: CardRow; qty: number }[]) => cards.map((c) => `${c.qty} ${face(c.card.name)}`).join('\n') + '\n';

function merge(list: Resolved[]): Map<string, Resolved> {
  const m = new Map<string, Resolved>();
  for (const r of list) {
    const prev = m.get(r.card.id);
    m.set(r.card.id, prev ? { ...prev, qty: prev.qty + r.qty } : r);
  }
  return m;
}

const sortByName = (a: { card: CardRow }, b: { card: CardRow }) => a.card.name.localeCompare(b.card.name);

// ── Deck sync ─────────────────────────────────────────────────────────────────
interface DeckSync { name: string; count: number; version: string | null; changes: string[]; unresolved: string[] }

function latestSnapshot(deckId: number): SnapshotCard[] | null {
  const row = getDb().prepare('SELECT cards_snapshot FROM deck_versions WHERE deck_id = ? ORDER BY version_number DESC LIMIT 1').get(deckId) as { cards_snapshot: string } | undefined;
  if (!row) return null;
  try { return JSON.parse(row.cards_snapshot); } catch { return null; }
}

function syncDeck(file: string, resolve: ReturnType<typeof buildIndex>): DeckSync | null {
  const lines = readLines(file);
  if (!lines.length) return null;
  const unresolved: string[] = [];
  const resolved: Resolved[] = [];
  for (const l of lines) {
    const r = resolve(l.raw, l.qty);
    if (r) resolved.push(r); else unresolved.push(l.raw);
  }
  if (!resolved.length) return { name: path.basename(file), count: 0, version: null, changes: [], unresolved };
  const commander = resolved[0];
  const main = [...merge(resolved.slice(1)).values()].sort(sortByName);
  const name = commander.card.name;
  const count = 1 + main.reduce((s, c) => s + c.qty, 0);

  if (!DRY) fs.writeFileSync(file, manabox([{ card: commander.card, qty: 1 }, ...main]));

  const db = getDb();
  let deck = db.prepare("SELECT id FROM decks WHERE user_id = ? AND built_by = 'paper' AND name = ?").get(USER, name) as { id: number } | undefined;
  if (DRY) return { name, count, version: deck ? 'would update' : 'would create', changes: [], unresolved };

  if (!deck) {
    const created = createDeck(name, 'commander', `Paper deck, synced from decks/paper/decks/${path.basename(file)}`, USER, 'paper');
    deck = { id: Number(created.id) };
  }
  const deckId = deck.id;
  const ins = db.prepare('INSERT INTO deck_cards (deck_id, card_id, quantity, board, sort_order) VALUES (?, ?, ?, ?, ?)');
  db.transaction(() => {
    db.prepare('DELETE FROM deck_cards WHERE deck_id = ?').run(deckId);
    ins.run(deckId, commander.card.id, 1, 'commander', 0);
    main.forEach((c, i) => ins.run(deckId, c.card.id, c.qty, 'main', i + 1));
    db.prepare("UPDATE decks SET commander_id = ?, format = 'commander', updated_at = datetime('now') WHERE id = ?").run(commander.card.id, deckId);
  })();

  const prev = latestSnapshot(deckId);
  const key = (s: SnapshotCard) => `${s.board}|${s.cardId}|${s.quantity}`;
  const now = new Set([{ cardId: commander.card.id, quantity: 1, board: 'commander' }, ...main.map((c) => ({ cardId: c.card.id, quantity: c.qty, board: 'main' }))].map((s) => key(s as SnapshotCard)));
  const unchanged = prev && prev.length === now.size && prev.every((s) => now.has(key(s)));
  if (unchanged) return { name, count, version: null, changes: [], unresolved };

  const v = createVersionSnapshot(deckId, 'import', 'batch_import', `paper sync ${new Date().toISOString().slice(0, 10)}`);
  const changes = (v?.changes || []).map((c) => `${c.action === 'added' ? '+' : '−'}${c.quantity > 1 ? c.quantity + ' ' : ''}${face(c.card)}`);
  return { name, count, version: v ? `v${v.versionNumber}` : null, changes, unresolved };
}

// ── Collection + open cards ───────────────────────────────────────────────────
function syncCollection(deckFiles: string[], resolve: ReturnType<typeof buildIndex>) {
  const unresolved: string[] = [];
  const owned = new Map<string, Resolved>();
  for (const l of readLines(COLLECTION)) {
    const r = resolve(l.raw, l.qty);
    if (!r) { unresolved.push(l.raw); continue; }
    const prev = owned.get(r.card.id);
    owned.set(r.card.id, prev ? { ...prev, qty: prev.qty + r.qty } : r);
  }
  // Cards sitting in a deck are owned by definition: owned = max(listed, used across decks).
  const used = new Map<string, number>();
  for (const f of deckFiles) {
    for (const l of readLines(f)) {
      const r = resolve(l.raw, l.qty);
      if (r) used.set(r.card.id, (used.get(r.card.id) || 0) + r.qty);
    }
  }
  for (const [id, q] of used) {
    const prev = owned.get(id);
    if (!prev) {
      const row = getDb().prepare('SELECT id, name, layout, type_line FROM cards WHERE id = ?').get(id) as CardRow;
      owned.set(id, { card: row, qty: q, via: 'exact' });
    } else if (prev.qty < q) owned.set(id, { ...prev, qty: q });
  }
  const ownedList = [...owned.values()].sort(sortByName);
  const open = ownedList
    .filter((c) => !BASICS.has(c.card.name))
    .map((c) => ({ card: c.card, qty: c.qty - (used.get(c.card.id) || 0) }))
    .filter((c) => c.qty > 0);

  const total = ownedList.reduce((s, c) => s + c.qty, 0);
  const openTotal = open.reduce((s, c) => s + c.qty, 0);
  if (DRY) return { total, openTotal, unresolved, changed: false };

  fs.writeFileSync(COLLECTION, manabox(ownedList));
  const before = fs.existsSync(OPEN) ? fs.readFileSync(OPEN, 'utf8') : '';
  const after = manabox(open);
  fs.writeFileSync(OPEN, after);

  getDb().transaction(() => {
    clearCollection(USER, 'paper');
    for (const c of ownedList) upsertCollectionCard(c.card.id, c.qty, false, USER, 'paper');
  })();
  return { total, openTotal, unresolved, changed: before !== after };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  fs.mkdirSync(DECKS_DIR, { recursive: true });
  const resolve = buildIndex();
  const deckFiles = fs.readdirSync(DECKS_DIR).filter((f) => f.endsWith('.txt')).map((f) => path.join(DECKS_DIR, f)).sort();

  const decks = deckFiles.map((f) => syncDeck(f, resolve)).filter((d): d is DeckSync => !!d);
  const col = syncCollection(deckFiles, resolve);

  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  for (const d of decks) {
    const tag = d.version ? ` ${d.version}` : '';
    const diff = d.changes.length ? `: ${d.changes.join(', ')}` : '';
    console.log(`${d.name}: ${d.count} cards${tag}${diff}`);
    if (d.version) lines.push(`- **${d.name}** ${d.version}, ${d.count} cards${diff}`);
    for (const u of d.unresolved) console.log(`  UNRESOLVED (${d.name}): ${u}`);
  }
  for (const [raw, name] of fuzzyLog) console.log(`  fuzzy: ${raw} → ${name}`);
  console.log(`collection: ${col.total} cards owned, ${col.openTotal} open (not in any deck, basics excluded)`);
  for (const u of col.unresolved) console.log(`  UNRESOLVED (collection): ${u}`);
  if (col.changed) lines.push(`- **Collection** ${col.total} owned, ${col.openTotal} open`);

  if (!DRY && lines.length) {
    const head = fs.existsSync(HISTORY) ? '' : '# Paper decks — change history\n\nAppended by `npx tsx scripts/paper-sync.ts`. Full diffs: `git log -p decks/paper/`.\n';
    fs.appendFileSync(HISTORY, `${head}\n## ${today}\n${lines.join('\n')}\n`);
  }
  const bad = decks.reduce((s, d) => s + d.unresolved.length, 0) + col.unresolved.length;
  if (bad) { console.log(`${bad} unresolved name(s) — fix the spelling in the file and re-run.`); process.exitCode = 1; }
}

main();
