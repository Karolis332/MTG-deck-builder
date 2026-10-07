/**
 * Shared engine behind `collection-best-deck.ts` (CLI) and `model-lab.ts` (local web page):
 * ownership, the CF-seeded start list, the objective and the power/bracket read-out.
 *
 *   objective = Deck Score absolute total
 *             + tempo weight × goldfish tempo + keep weight × goldfish keep-7
 *             − role weight × cards outside the format's role windows (card-classifier norms)
 *
 * The DB is opened lazily, so pure helpers (`parseList`, `rolePenalty`) import without one.
 */
import fs from 'fs';
import path from 'path';
import type { Statement } from 'better-sqlite3';
import { getDb } from '../src/lib/db';
import { scoreDeckSafely, type DeckScorePayload } from '../src/lib/deck-score-input';
import { goldfish, type GoldfishStats } from '../src/lib/goldfish-sim';
import { computePowerLevel } from '../src/lib/power-level-edhpl';
import { classifyCard, computeRatioHealth, getFormatRatios, type CardCategory, type ClassifiedCard } from '../src/lib/card-classifier';
import type { DbCard } from '../src/lib/types';

export interface Weights { tempo: number; keep: number; role: number; games: number }
// ponytail: unmeasured weights — goldfish is a tie-breaker on top of the model (a 0.05 tempo
// change ≈ 0.5 model points); the role weight exists because without it the climb stacks 20
// rocks and cuts every removal spell (2026-10-08). Tune with --tempo-weight / --keep-weight / --role-weight.
export const DEFAULT_WEIGHTS: Weights = { tempo: 10, keep: 5, role: 2, games: 300 };
// A swap must gain at least this much objective. Below it the climb chases goldfish noise: on
// 2026-10-08 it traded Blood Artist, Viscera Seer and Gray Merchant out of an aristocrats list for
// +0.01..0.15 each. 0.25 ≈ a quarter Deck Score point.
export const MIN_GAIN_DEFAULT = 0.25;
export const SEED_LANDS = 36;
export const DECK_SIZE = 99;
export const BASICS: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
export const BASIC_RE = /^(?:Snow-Covered )?(?:Plains|Island|Swamp|Mountain|Forest|Wastes)$/;
export const ROLE_CATS: readonly CardCategory[] = ['land', 'ramp', 'draw', 'removal', 'board_wipe', 'protection'];

let byName: Statement | undefined;
export function resolveCard(name: string): DbCard | undefined {
  byName ??= getDb().prepare(
    "select * from cards where (name = ? or name like ?) and layout not in ('art_series','token') order by (arena_id is null), length(name) limit 1",
  );
  return byName.get(name, name + ' // %') as DbCard | undefined;
}
export const identityOf = (c: DbCard): string[] => { try { return JSON.parse(c.color_identity || '[]'); } catch { return []; } };
export const legalIn = (c: DbCard, format: string): boolean => { try { return JSON.parse(c.legalities || '{}')[format] === 'legal'; } catch { return false; } };
export const isLand = (c: DbCard): boolean => /\bLand\b/.test(c.type_line.split(' // ')[0]);

/** Card names in list order, each repeated by its quantity ("18 Forest" → 18 entries); headers and blanks skipped. */
export function parseList(text: string): string[] {
  return text.split(/\r?\n/)
    .map((l) => /^(\d+)x?\s+(.+?)(?:\s*\([A-Za-z0-9]{2,6}\)\s*\S+)?$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .flatMap((m) => Array<string>(Number(m[1])).fill(m[2]));
}
export const readList = (file: string): string[] => parseList(fs.readFileSync(file, 'utf8'));

export interface Owned { cards: DbCard[]; decks: Map<string, string[]> }

/** Paper: collection.txt ∪ decks/paper/decks/*.txt (each card usable once, basics unlimited). Arena: DB rows source='arena', user 1. */
export function loadOwned(source: string): Owned {
  const names = new Set<string>();
  const decks = new Map<string, string[]>();
  if (source === 'paper') {
    readList('decks/paper/collection.txt').forEach((n) => names.add(n));
    for (const f of fs.readdirSync('decks/paper/decks').filter((x) => x.endsWith('.txt'))) {
      const list = readList(path.join('decks/paper/decks', f));
      list.forEach((n) => names.add(n));
      if (list.length) decks.set(resolveCard(list[0])?.name ?? list[0], list.slice(1));
    }
  } else {
    const rows = getDb().prepare("select distinct c.name from collection col join cards c on c.id = col.card_id where col.source = 'arena' and col.user_id = 1").all() as { name: string }[];
    rows.forEach((r) => names.add(r.name));
  }
  const cards = [...names].map(resolveCard).filter((c): c is DbCard => !!c);
  return { cards: [...new Map(cards.map((c) => [c.name, c])).values()], decks };
}

export const legalPool = (owned: Owned, format: string): DbCard[] => owned.cards.filter((c) => legalIn(c, format) && !BASIC_RE.test(c.name));

export function isCommander(c: DbCard, format: string): boolean {
  const front = c.type_line.split(' // ')[0];
  const legendary = /Legendary/.test(front);
  return legalIn(c, format) && (
    (legendary && /Creature/.test(front)) ||
    (legendary && /Vehicle|Spacecraft/.test(front) && c.power !== null) ||
    (format === 'brawl' && legendary && /Planeswalker/.test(front)) ||
    /can be your commander/i.test(c.oracle_text || '')
  );
}

/** Basics are unlimited, except Wastes in paper: they count only when the collection lists them. */
export function basicsFor(identity: string[], source: string, owned: DbCard[]): DbCard[] {
  const wastes = source === 'arena' || owned.some((c) => c.name === 'Wastes') ? ['Wastes'] : [];
  const names = identity.length ? identity.map((c) => BASICS[c]) : wastes;
  return names.map((n) => resolveCard(n)!).filter(Boolean);
}

/** Owned, legal, in-identity, not banned. A colourless commander also bans "commander's color identity" producers. */
export function buildPool(commander: DbCard, legal: DbCard[], banned: ReadonlySet<string>): DbCard[] {
  const identity = identityOf(commander);
  const ban = new Set(banned);
  if (!identity.length) for (const c of legal) if (/commander's color identity/i.test(c.oracle_text || '')) ban.add(c.name);
  return legal.filter((c) => c.name !== commander.name && !ban.has(c.name) && identityOf(c).every((x) => identity.includes(x)));
}

/** Names → pool/basic cards; `missing` lists names that are not in the pool (unowned, off-colour, banned or unknown). */
export function fromNames(names: string[], pool: DbCard[], basics: DbCard[]): { cards: DbCard[]; missing: string[] } {
  const cards: DbCard[] = [];
  const missing: string[] = [];
  for (const n of names) {
    const hit = BASIC_RE.test(n)
      ? basics.find((b) => b.name === n.replace('Snow-Covered ', ''))
      : pool.find((c) => c.name === n || c.name.startsWith(n + ' // '));
    if (hit) cards.push(hit); else missing.push(n);
  }
  return { cards, missing };
}

/** CF-seeded starting list: lands by inclusion then EDHREC rank, basics by pip share, spells by inclusion. */
export function seedDeck(commander: DbCard, pool: DbCard[], basics: DbCard[]): DbCard[] {
  const rows = getDb().prepare('select card_name, inclusion_rate from commander_card_stats where commander_name = ? or commander_name like ?')
    .all(commander.name, commander.name.split(' // ')[0] + ' // %') as { card_name: string; inclusion_rate: number }[];
  const incl = new Map(rows.map((r) => [r.card_name, r.inclusion_rate]));
  const rel = (c: DbCard): number => incl.get(c.name) ?? incl.get(c.name.split(' // ')[0]) ?? 0;
  const order = (a: DbCard, b: DbCard): number => rel(b) - rel(a) || (a.edhrec_rank ?? 1e6) - (b.edhrec_rank ?? 1e6);
  const lands = pool.filter(isLand).sort(order).filter((c) => rel(c) >= 0.05 || (c.edhrec_rank ?? 1e6) < 2000).slice(0, basics.length ? SEED_LANDS - basics.length * 4 : SEED_LANDS);
  const spells = pool.filter((c) => !isLand(c)).sort(order).slice(0, DECK_SIZE - (basics.length ? SEED_LANDS : lands.length));
  const pips = new Map(basics.map((b) => [b, 1]));
  for (const s of spells) for (const b of basics) {
    const letter = Object.entries(BASICS).find(([, n]) => n === b.name)?.[0];
    if (letter) pips.set(b, (pips.get(b) ?? 0) + ((s.mana_cost || '').split(`{${letter}}`).length - 1));
  }
  const totalPips = [...pips.values()].reduce((a, b) => a + b, 0);
  const basicSlots = DECK_SIZE - lands.length - spells.length;
  const basicList: DbCard[] = [];
  basics.forEach((b, i) => {
    const n = i === basics.length - 1 ? basicSlots - basicList.length : Math.round((basicSlots * (pips.get(b) ?? 1)) / totalPips);
    for (let k = 0; k < n; k++) basicList.push(b);
  });
  return [...lands, ...basicList, ...spells].slice(0, DECK_SIZE);
}

const roleCache = new Map<string, CardCategory[]>();
export function cardRoles(c: DbCard): CardCategory[] {
  let r = roleCache.get(c.name);
  if (!r) { r = classifyCard(c.name, c.oracle_text || '', c.type_line, c.cmc); roleCache.set(c.name, r); }
  return r;
}
export const roleWindows = (format: string): Record<string, { min: number; max: number }> =>
  Object.fromEntries(ROLE_CATS.flatMap((k) => { const t = getFormatRatios(format).targets[k]; return t ? [[k, { min: t.min, max: t.max }]] : []; }));

/** Cards outside the format's role windows, summed over roles; `roles` = count per role. */
export function rolePenalty(deck: readonly (DbCard | null)[], format: string): { penalty: number; roles: Record<string, number> } {
  const cats = {} as Record<CardCategory, ClassifiedCard[]>;
  for (const c of deck) {
    if (!c) continue;
    for (const k of cardRoles(c)) (cats[k] ??= []).push({ name: c.name } as ClassifiedCard);
  }
  const health = computeRatioHealth(cats, format).filter((h) => (ROLE_CATS as readonly string[]).includes(h.category));
  const penalty = health.reduce((s, h) => s + (h.status === 'low' ? h.target.min - h.current : h.status === 'high' ? h.current - h.target.max : 0), 0);
  return { penalty, roles: Object.fromEntries(health.map((h) => [h.category, h.current])) };
}

export interface Scored { model: DeckScorePayload | null; gf: GoldfishStats; roles: Record<string, number>; rolePenalty: number; objective: number }

export function makeScorer(format: string, commander: DbCard, w: Weights) {
  return (deck: readonly (DbCard | null)[]): Scored => {
    const counts = new Map<string, { card: DbCard; quantity: number }>();
    let blanks = 0;
    for (const c of deck) {
      if (!c) { blanks++; continue; }
      const hit = counts.get(c.name);
      counts.set(c.name, { card: c, quantity: (hit?.quantity ?? 0) + 1 });
    }
    const model = scoreDeckSafely({
      format, main: [...counts.values()], commander: [commander],
      unresolved: blanks ? [{ name: '(blank)', quantity: blanks, board: 'main' }] : [],
    });
    const gf = goldfish(deck, [commander], { games: w.games });
    const { penalty, roles } = rolePenalty(deck, format);
    return { model, gf, roles, rolePenalty: penalty, objective: (model?.absoluteTotal ?? 0) + w.tempo * gf.tempo + w.keep * gf.keep7 - w.role * penalty };
  };
}

export function powerOf(deck: readonly DbCard[], commander: DbCard): { powerLevel: number; bracket: number } {
  const counts = new Map<string, { card: DbCard; quantity: number }>();
  for (const c of [commander, ...deck]) counts.set(c.name, { card: c, quantity: (counts.get(c.name)?.quantity ?? 0) + 1 });
  const r = computePowerLevel([...counts.values()].map(({ card, quantity }) => ({
    name: card.name, quantity, price: card.price_usd ? Number(card.price_usd) : null, edhrecRank: card.edhrec_rank,
    cmc: card.cmc, typeLine: card.type_line, layout: card.layout, manaCost: card.mana_cost ?? undefined,
    oracleText: card.oracle_text, gameChanger: !!card.game_changer,
    producedMana: card.produced_mana ? JSON.parse(card.produced_mana) : undefined,
  })), [commander.name]);
  return { powerLevel: r.powerLevel, bracket: r.bracket };
}
