/**
 * For every card in the Beledros 99: where it comes from (Meren / loose / a donor deck with its backfill) and the three best
 * owned, free replacements by the model objective — same classifier role, or same card type when the card has no role.
 * Pool = collection ∪ Meren's deck; cards sleeved in other decks and the refuter bans are excluded. Output: beledros-backups.json,
 * then run origins/relabel.py (physical box per card + UNCONFIRMED flag for decklist-only registrations).
 *
 *   MTG_DB_DIR=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data npx tsx verify-2026-10-08/best-deck/beledros-backups.ts [--games 100]
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { DbCard } from '../../src/lib/types';
import { BASIC_RE, DEFAULT_WEIGHTS, basicsFor, buildPool, cardRoles, fromNames, identityOf, legalPool, loadOwned, makeScorer, parseList, resolveCard } from '../../scripts/best-deck-lib';

const ROOT = path.resolve(__dirname, '../..');
const DIR = __dirname;
const gamesArg = process.argv.indexOf('--games');
const GAMES = gamesArg >= 0 ? Number(process.argv[gamesArg + 1]) : 100;
const TOP = 3;
// donor decks (guide §3 / beledros-apply.py): card -> [deck label, backfill the donor gets]
const DONORS: Record<string, [string, string]> = {
  'Dark Ritual': ['Imotekh the Stormlord', 'Charcoal Diamond'], // operator swap 2026-10-08 (<- Tyvar's Stand); the only free black rock backfills Imotekh
  'Pest Infestation': ['The Cabbage Merchant', 'Haywire Mite'], 'Idol of Oblivion': ['The Cabbage Merchant', 'Ramunap Excavator'],
  'Ribtruss Roaster': ['The Cabbage Merchant', 'Basking Broodscale'], "Kodama's Reach": ['The Cabbage Merchant', 'Springbloom Druid'],
  "Ashnod's Altar": ['Imotekh the Stormlord', 'Woe Strider'], 'Skorpekh Lord': ['Imotekh the Stormlord', 'Grim Haruspex'],
  'Phyrexian Arena': ['Imotekh the Stormlord', 'Rune-Scarred Demon'], "Imp's Mischief": ['Imotekh the Stormlord', 'Ravenous Chupacabra'],
  'Thunderfoot Baloth': ['Gilanra + Alena', 'Domri, Anarch of Bolas'],
};
const REFUTER_BANS = ['Bane of Progress']; // Culling Ritual: refuter ban overridden by the operator 2026-10-08 (in the list)

const commander = resolveCard('Beledros Witherbloom');
if (!commander) throw new Error('commander not in DB');
const owned = loadOwned('paper');
// the ban file is bare names (no quantities): parseList would drop them, so split it directly
const banned = new Set([...fs.readFileSync(path.join(DIR, 'beledros-climb-ban.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean), ...REFUTER_BANS]);
if (banned.size < 500) throw new Error(`ban list too small: ${banned.size}`);
const basics = basicsFor(identityOf(commander), 'paper', owned.cards);
const pool = buildPool(commander, legalPool(owned, 'commander'), banned);
const listNames = parseList(fs.readFileSync(path.join(DIR, 'beledros-recommended.txt'), 'utf8')).filter((n) => n !== commander.name);
const { cards, missing } = fromNames(listNames, pool, basics);
if (missing.length || cards.length !== 99) throw new Error(`deck resolved to ${cards.length} cards; missing: ${missing.join(', ')}`);
const meren = new Set(parseList(fs.readFileSync(path.join(ROOT, 'verify-2026-10-08/best-deck/meren-sleeved-2026-10-08.txt'), 'utf8')));
const inDeck = new Set(cards.map((c) => c.name));
const candidates = pool.filter((c) => !inDeck.has(c.name) && !BASIC_RE.test(c.name));
const scorer = makeScorer('commander', commander, { ...DEFAULT_WEIGHTS, games: GAMES });
const base = scorer(cards).objective;

const group = (c: DbCard): string => {
  const f = c.type_line.split(' // ')[0];
  return /Planeswalker/.test(f) ? 'walker' : /Creature/.test(f) ? 'creature' : /Land/.test(f) ? 'land' : /Instant|Sorcery/.test(f) ? 'spell' : /Artifact/.test(f) ? 'artifact' : 'enchantment';
};
const from = (name: string): string => (DONORS[name] ? DONORS[name][0] : meren.has(name) ? 'Meren (dismantled)' : 'loose collection'); // physical box + confirmation labels: origins/relabel.py (run it after this script)
const sameRole = (x: DbCard, c: DbCard): boolean => {
  const rx = cardRoles(x);
  return rx.length ? cardRoles(c).some((r) => rx.includes(r)) : !cardRoles(c).length && group(c) === group(x);
};

// the model is flat (±0.05) across most same-role swaps: ties within the 0.25 epsilon are broken by Beledros inclusion (CF corpus), then EDHREC rank
const statsDb = new Database(path.join(process.env.MTG_DB_DIR || path.join(process.env.APPDATA!, 'the-black-grimoire', 'data'), 'mtg-deck-builder.db'), { readonly: true });
const INCL = new Map((statsDb.prepare('select card_name, inclusion_rate from commander_card_stats where commander_name = ?').all(commander.name) as { card_name: string; inclusion_rate: number }[]).map((r) => [r.card_name, r.inclusion_rate]));
const incl = (c: DbCard): number => INCL.get(c.name) ?? INCL.get(c.name.split(' // ')[0]) ?? 0;
const EPS = 0.25;
type Backup = { name: string; delta: number; from: string; type: string; incl: number; rank: number | null };
const out: Record<string, { from: string; backfill?: string; roles: string[]; candidates: number; backups: Backup[] }> = {};
const t0 = Date.now();
const seen = new Set<string>();
cards.forEach((x, i) => {
  if (seen.has(x.name) || BASIC_RE.test(x.name)) return;
  seen.add(x.name);
  const cands = [...candidates.filter((c) => sameRole(x, c)), ...(group(x) === 'land' ? basics : [])]; // a basic is always a legal land backup
  const all: Backup[] = cands.map((c) => {
    const deck = cards.map((d, j) => (j === i ? c : d));
    return { name: c.name, delta: scorer(deck).objective - base, from: from(c.name), type: c.type_line.split(' // ')[0], incl: incl(c), rank: c.edhrec_rank ?? null };
  }).sort((a, b) => b.delta - a.delta);
  const top = all[0]?.delta ?? 0;
  const scored = all.filter((b) => b.delta >= top - EPS).sort((a, b) => b.incl - a.incl || (a.rank ?? 1e6) - (b.rank ?? 1e6)).slice(0, TOP);
  out[x.name] = { from: from(x.name), backfill: DONORS[x.name]?.[1], roles: cardRoles(x), candidates: cands.length, backups: scored };
  console.error(`${String(seen.size).padStart(2)}/${cards.length} ${x.name.padEnd(34)} ${String(cands.length).padStart(4)} cands  ${scored.map((b) => `${b.name} ${b.delta >= 0 ? '+' : ''}${b.delta.toFixed(2)}`).join(' | ')}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
});
fs.writeFileSync(path.join(DIR, 'beledros-backups.json'), JSON.stringify({ base, games: GAMES, generated: new Date().toISOString(), cards: out }, null, 1));
console.log(`beledros-backups.json: ${Object.keys(out).length} cards, base ${base.toFixed(2)}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
