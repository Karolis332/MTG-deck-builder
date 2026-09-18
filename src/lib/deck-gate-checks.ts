/**
 * Deck gate — the individual checks.
 *
 * Each returns one `GateCheck`. Format rules, card roles and land math are
 * reused from deck-validation / card-classifier / land-math; nothing here
 * re-implements them.
 */
import { getDb } from './db';
import { validateDeck } from './deck-validation';
import { classifyCard } from './card-classifier';
import { karstenLands, countMdfcLandBacks, effectiveLandCount } from './land-math';
import { COMMANDER_FORMATS, DEFAULT_DECK_SIZE } from './constants';
import {
  ARENA_FORMATS,
  DEFAULT_COLLECTION_MAX_AGE_DAYS,
  DEFAULT_LOCKS,
  EXPORT_SAFE_SLASH_LAYOUTS,
  LAND_BAND,
  frontName,
  isBasic,
  isLand,
  lockMatcher,
  parseIdentity,
  worst,
  type GateCheck,
  type GateOptions,
  type Resolved,
} from './deck-gate-parse';

const isCommanderFormat = (format: string): boolean =>
  (COMMANDER_FORMATS as readonly string[]).includes(format);

/** Route deck-validation's issues onto gate check ids; anything unmapped surfaces in `rules`. */
const ISSUE_ROUTES: Array<[RegExp, string]> = [
  [/require exactly|minimum is|Sideboard has/i, 'size'],
  [/Singleton rule violated|More than 4 copies/i, 'singleton'],
  [/Not legal in/i, 'legality'],
];

/** size + singleton + legality + anything else deck-validation reports. */
export function formatChecks(resolved: Resolved[], format: string): GateCheck[] {
  const entries = resolved.map((r) => ({
    card_id: r.card.id,
    quantity: r.line.quantity,
    board: r.line.board,
    card: r.card,
  }));
  const issues = validateDeck(entries, format);
  const buckets: Record<string, GateCheck> = {
    size: { id: 'size', status: 'pass', detail: '' },
    singleton: { id: 'singleton', status: 'pass', detail: '' },
    legality: { id: 'legality', status: 'pass', detail: '' },
    rules: { id: 'rules', status: 'pass', detail: 'no other format rule broken' },
  };
  for (const issue of issues) {
    const id = ISSUE_ROUTES.find(([re]) => re.test(issue.message))?.[1] ?? 'rules';
    const bucket = buckets[id];
    bucket.status = worst([bucket.status, issue.level === 'error' ? 'fail' : 'warn']);
    bucket.detail = bucket.detail ? `${bucket.detail}; ${issue.message}` : issue.message;
    if (issue.cardNames) bucket.cards = [...(bucket.cards ?? []), ...issue.cardNames];
  }

  const total = entries
    .filter((e) => e.board === 'main' || e.board === 'commander')
    .reduce((s, e) => s + e.quantity, 0);
  const expected = DEFAULT_DECK_SIZE[format] ?? 60;
  if (!buckets.size.detail) buckets.size.detail = `${total} cards (${format} wants ${expected})`;
  if (!buckets.singleton.detail) {
    buckets.singleton.detail = isCommanderFormat(format)
      ? 'singleton respected (basics exempt)'
      : 'no card over 4 copies';
  }
  if (!buckets.legality.detail) buckets.legality.detail = `every card legal in ${format}`;
  return [buckets.size, buckets.singleton, buckets.legality, buckets.rules];
}

export function identityCheck(
  resolved: Resolved[],
  commander: Resolved | undefined,
  format: string
): GateCheck {
  if (!isCommanderFormat(format) || !commander) {
    return { id: 'identity', status: 'pass', detail: 'not a commander format' };
  }
  const allowed = new Set(parseIdentity(commander.card.color_identity));
  const bad = resolved
    .filter((r) => r.line.board !== 'commander')
    .filter((r) => parseIdentity(r.card.color_identity).some((c) => !allowed.has(c)))
    .map((r) => r.card.name);
  const label = [...allowed].sort().join('') || 'C';
  return bad.length
    ? {
        id: 'identity',
        status: 'fail',
        detail: `${bad.length} card(s) outside ${label}`,
        cards: [...new Set(bad)],
      }
    : { id: 'identity', status: 'pass', detail: `all cards inside ${label}` };
}

/** Every nonbasic card must be in the owner's collection, and that snapshot must be fresh. */
export function ownershipCheck(resolved: Resolved[], opts: GateOptions): GateCheck {
  if (opts.ownerId == null) {
    return { id: 'ownership', status: 'pass', detail: 'no owner given — ownership not checked' };
  }
  const source = opts.source ?? (ARENA_FORMATS.has(opts.format) ? 'arena' : 'paper');
  const rows = getDb()
    .prepare(
      `SELECT c.name AS name, SUM(col.quantity) AS qty, MAX(col.imported_at) AS newest
       FROM collection col JOIN cards c ON c.id = col.card_id
       WHERE col.user_id = ? AND col.source = ? GROUP BY c.name`
    )
    .all(opts.ownerId, source) as Array<{ name: string; qty: number; newest: string | null }>;

  const owned = new Set<string>();
  let newest = '';
  for (const r of rows) {
    owned.add(r.name.toLowerCase());
    owned.add(frontName(r.name).toLowerCase());
    if (r.newest && r.newest > newest) newest = r.newest;
  }

  const missing = [
    ...new Set(
      resolved
        .filter((r) => !isBasic(r.card))
        .filter((r) => !owned.has(r.card.name.toLowerCase()) && !owned.has(r.front.toLowerCase()))
        .map((r) => r.front)
    ),
  ];

  const maxAge = opts.collectionMaxAgeDays ?? DEFAULT_COLLECTION_MAX_AGE_DAYS;
  const ageDays = newest
    ? Math.floor((Date.now() - new Date(newest.replace(' ', 'T') + 'Z').getTime()) / 86400_000)
    : null;
  const ageNote =
    ageDays === null
      ? 'collection snapshot has no import date'
      : `${source} collection imported ${ageDays} days ago`;

  if (!rows.length) {
    return {
      id: 'ownership',
      status: 'fail',
      detail: `no ${source} collection rows for user ${opts.ownerId}`,
    };
  }
  if (missing.length) {
    return {
      id: 'ownership',
      status: 'fail',
      detail: `${missing.length} card(s) not in the ${source} collection; ${ageNote}`,
      cards: missing,
    };
  }
  if (ageDays === null || ageDays > maxAge) {
    return {
      id: 'ownership',
      status: 'warn',
      detail: `${ageNote} (older than ${maxAge} days) — re-import before trusting it`,
    };
  }
  return { id: 'ownership', status: 'pass', detail: `all cards owned; ${ageNote}` };
}

/** Arena rejects a "Front // Back" line with "the input string contains an unknown card title". */
export function arenaNamesCheck(resolved: Resolved[]): GateCheck {
  const rejected: string[] = [];
  const fixes: string[] = [];
  for (const r of resolved) {
    if (EXPORT_SAFE_SLASH_LAYOUTS.has(r.card.layout || '')) continue;
    if (!r.card.name.includes(' // ')) continue;
    const corrected = `${r.line.quantity} ${r.front}`;
    if (r.line.name.includes(' // ')) rejected.push(corrected);
    else fixes.push(corrected);
  }
  if (rejected.length) {
    return {
      id: 'arenaNames',
      status: 'fail',
      detail: `${rejected.length} line(s) use "Front // Back" — Arena answers "unknown card title". Use:`,
      cards: rejected,
    };
  }
  if (fixes.length) {
    return {
      id: 'arenaNames',
      status: 'warn',
      detail: `${fixes.length} card(s) must be exported front-face only:`,
      cards: fixes,
    };
  }
  return { id: 'arenaNames', status: 'pass', detail: 'every line uses a name Arena accepts' };
}

export interface LandInfo {
  check: GateCheck;
  lands: number;
  effective: number;
}

export function landsCheck(resolved: Resolved[], deckSize: number, avgMv: number): LandInfo {
  const main = resolved.filter((r) => r.line.board !== 'sideboard');
  const lands = main
    .filter((r) => isLand(r.card.type_line))
    .reduce((s, r) => s + r.line.quantity, 0);
  const mdfc = countMdfcLandBacks(
    main.map((r) => ({
      type_line: r.card.type_line,
      layout: r.card.layout,
      quantity: r.line.quantity,
    }))
  );
  const effective = effectiveLandCount(lands, mdfc);
  const cheap = main
    .filter((r) => !isLand(r.card.type_line) && (r.card.cmc ?? 0) <= 2)
    .filter((r) => {
      const cats = classifyCard(
        r.card.name,
        r.card.oracle_text || '',
        r.card.type_line || '',
        r.card.cmc ?? 0
      );
      return cats.includes('draw') || cats.includes('ramp');
    })
    .reduce((s, r) => s + r.line.quantity, 0);
  const recommended = karstenLands(deckSize >= 99 ? 99 : 60, avgMv, cheap);
  const off = Math.abs(effective - recommended) > LAND_BAND;
  const detail = `${lands} lands (+${mdfc} MDFC land backs = ${effective} effective); Karsten wants ${recommended} ±${LAND_BAND}`;
  return { check: { id: 'lands', status: off ? 'warn' : 'pass', detail }, lands, effective };
}

const EXTRA_COMBAT = /additional combat phase|untap all creatures you control|extra combat/i;

/** Win conditions from the classifier, plus closers the commander itself implies. */
export function winconCheck(resolved: Resolved[], commanderOracle: string): GateCheck {
  const closers = new Set<string>();
  const commanderAttacks = /attacks/i.test(commanderOracle);
  for (const r of resolved) {
    if (r.line.board === 'commander') continue;
    const oracle = r.card.oracle_text || '';
    const cats = classifyCard(
      r.card.name,
      oracle,
      r.card.type_line || '',
      r.card.cmc ?? 0,
      commanderOracle
    );
    if (cats.includes('win_condition') || (commanderAttacks && EXTRA_COMBAT.test(oracle))) {
      closers.add(r.front);
    }
  }
  const n = closers.size;
  const detail = `${n} win condition(s)/closer(s)`;
  if (n < 2) {
    return {
      id: 'wincons',
      status: 'fail',
      detail: `${detail} — a deck needs at least 2`,
      cards: [...closers],
    };
  }
  if (n < 3) {
    return { id: 'wincons', status: 'warn', detail: `${detail} — 3+ is safer`, cards: [...closers] };
  }
  return { id: 'wincons', status: 'pass', detail, cards: [...closers] };
}

/** Locked cards must be in the list, and an edit must not cut one. */
export function locksCheck(resolved: Resolved[], opts: GateOptions): GateCheck {
  const matchers = [...DEFAULT_LOCKS, ...(opts.locks ?? [])].map(lockMatcher);
  const isLocked = (name: string): boolean => matchers.some((m) => m(name));

  // Explicit (non-regex) locks must be in the list at all.
  const present = new Set(resolved.map((r) => r.front.toLowerCase()));
  const absent = (opts.locks ?? []).filter(
    (p) => !p.startsWith('/') && !present.has(p.toLowerCase())
  );

  const cut =
    opts.before && opts.after
      ? opts.before
          .filter(isLocked)
          .filter((n) => !opts.after!.some((a) => a.toLowerCase() === n.toLowerCase()))
      : [];

  if (cut.length || absent.length) {
    const parts: string[] = [];
    if (cut.length) parts.push(`${cut.length} locked card(s) cut by the edit`);
    if (absent.length) parts.push(`${absent.length} required card(s) missing from the list`);
    return {
      id: 'locks',
      status: 'fail',
      detail: parts.join('; '),
      cards: [...new Set([...cut, ...absent])],
    };
  }
  const guarded = resolved.filter((r) => isLocked(r.front)).map((r) => r.front);
  return {
    id: 'locks',
    status: 'pass',
    detail: `${guarded.length} locked card(s) present and intact`,
    cards: guarded,
  };
}
