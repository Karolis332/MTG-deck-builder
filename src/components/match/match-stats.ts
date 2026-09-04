// Pure helpers for the match history HUD. No React, no DOM — vitest node env.
// Rows come from GET /api/arena-matches (arena_parsed_matches). Every T2
// contract field is optional: older rows never carry them.

export type MatchResult = 'win' | 'loss' | 'draw';

export const NORMALIZED_FORMATS = [
  'standard', 'alchemy', 'historic', 'explorer', 'timeless',
  'brawl', 'competitivebrawl', 'standardbrawl', 'draft', 'sealed', 'other',
] as const;
export type NormalizedFormat = (typeof NORMALIZED_FORMATS)[number];

export const FORMAT_LABELS: Record<NormalizedFormat, string> = {
  standard: 'Standard',
  alchemy: 'Alchemy',
  historic: 'Historic',
  explorer: 'Explorer',
  timeless: 'Timeless',
  brawl: 'Brawl',
  competitivebrawl: 'Comp Brawl',
  standardbrawl: 'Std Brawl',
  draft: 'Draft',
  sealed: 'Sealed',
  other: 'Other',
};

export interface GameResult {
  game: number;
  result: MatchResult | null;
}

export interface ArenaMatchRow {
  id: number;
  match_id: string;
  player_name: string | null;
  opponent_name: string | null;
  result: string | null;
  format: string | null;
  turns: number | null;
  deck_cards: string | null;
  cards_played: string | null;
  opponent_cards_seen: string | null;
  parsed_at: string;
  deck_id: number | null;
  deck_match_confidence: number | null;
  cards_played_by_turn: string | null;
  commander_cast_turns: string | null;
  lands_played_by_turn: string | null;
  opening_hand: string | null;
  mulligan_count: number | null;
  on_play: number | null;
  match_start_time: string | null;
  match_end_time: string | null;
  game_count: number | null;
  life_progression: string | null;
  draw_order: string | null;
  sideboard_changes: string | null;
  opponent_cards_by_turn: string | null;
  // T2 contract (spec §1.5) — absent on rows parsed before the migration.
  player_screen_name?: string | null;
  player_seat?: number | null;
  winner_seat?: number | null;
  opponent_commander?: string | null;
  player_commander?: string | null;
  format_normalized?: string | null;
  queue_raw?: string | null;
  game_results?: string | null;
  duration_seconds?: number | null;
}

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function matchResult(row: Pick<ArenaMatchRow, 'result' | 'winner_seat' | 'player_seat'>): MatchResult | null {
  const r = row.result?.toLowerCase();
  if (r === 'win' || r === 'loss' || r === 'draw') return r;
  if (row.winner_seat != null && row.player_seat != null) {
    return row.winner_seat === row.player_seat ? 'win' : 'loss';
  }
  return null;
}

/** Prefer T2's enum; fall back to a conservative read of the raw Arena queue string. */
export function normalizeFormat(row: Pick<ArenaMatchRow, 'format' | 'format_normalized'>): NormalizedFormat {
  const fromContract = row.format_normalized?.toLowerCase();
  if (fromContract && (NORMALIZED_FORMATS as readonly string[]).includes(fromContract)) {
    return fromContract as NormalizedFormat;
  }
  const raw = (row.format ?? '').toLowerCase();
  if (!raw) return 'other';
  if (raw.includes('brawl')) {
    if (raw.includes('historic')) return 'brawl';
    if (raw.includes('challenge') || raw.includes('competitive')) return 'competitivebrawl';
    // Arena's bare "Brawl" queue is the 60-card Standard Brawl; "Play_Brawl" is the 100-card one.
    return raw === 'brawl' ? 'standardbrawl' : 'brawl';
  }
  if (raw.includes('draft')) return 'draft';
  if (raw.includes('sealed')) return 'sealed';
  if (raw.includes('alchemy')) return 'alchemy';
  if (raw.includes('timeless')) return 'timeless';
  if (raw.includes('explorer')) return 'explorer';
  if (raw.includes('historic')) return 'historic';
  if (raw.includes('standard')) return 'standard';
  // Ladder / Play / Constructed_Event_* carry no format in the queue name — do not guess.
  return 'other';
}

export function formatLabel(row: Pick<ArenaMatchRow, 'format' | 'format_normalized'>): string {
  return FORMAT_LABELS[normalizeFormat(row)];
}

export interface Record_ {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winPct: number | null;
}

export function computeRecord(rows: ArenaMatchRow[]): Record_ {
  let wins = 0, losses = 0, draws = 0;
  for (const row of rows) {
    const r = matchResult(row);
    if (r === 'win') wins++;
    else if (r === 'loss') losses++;
    else if (r === 'draw') draws++;
  }
  const total = wins + losses + draws;
  const decided = wins + losses;
  return { wins, losses, draws, total, winPct: decided ? Math.round((wins / decided) * 100) : null };
}

export interface Streak {
  kind: MatchResult;
  length: number;
}

/** rows newest-first. Draws break a streak without starting one. */
export function currentStreak(rows: ArenaMatchRow[]): Streak | null {
  const first = rows.map(matchResult).find((r) => r != null);
  if (!first || first === 'draw') return null;
  let length = 0;
  for (const row of rows) {
    const r = matchResult(row);
    if (r == null) continue;
    if (r !== first) break;
    length++;
  }
  return { kind: first, length };
}

/** rows newest-first → last n results, oldest → newest, as +1 / -1 / 0. */
export function sparklineSeries(rows: ArenaMatchRow[], n = 10): number[] {
  return rows
    .map(matchResult)
    .filter((r): r is MatchResult => r != null)
    .slice(0, n)
    .reverse()
    .map((r) => (r === 'win' ? 1 : r === 'loss' ? -1 : 0));
}

/** Cumulative-score polyline points for an inline SVG of size w×h. */
export function sparklinePoints(series: number[], w: number, h: number): string {
  if (series.length === 0) return '';
  const cum: number[] = [0];
  for (const v of series) cum.push(cum[cum.length - 1] + v);
  const min = Math.min(...cum);
  const max = Math.max(...cum);
  const span = max - min || 1;
  const stepX = cum.length > 1 ? w / (cum.length - 1) : 0;
  return cum
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`)
    .join(' ');
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

export function durationSeconds(row: Pick<ArenaMatchRow, 'duration_seconds' | 'match_start_time' | 'match_end_time'>): number | null {
  if (row.duration_seconds != null && Number.isFinite(row.duration_seconds)) return row.duration_seconds;
  if (!row.match_start_time || !row.match_end_time) return null;
  const a = Date.parse(row.match_start_time);
  const b = Date.parse(row.match_end_time);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.round((b - a) / 1000);
}

/** Accepts ['win','loss'], [{result}], [{won:true}], or [{winner_seat}] + player_seat. */
export function parseGameResults(row: Pick<ArenaMatchRow, 'game_results' | 'player_seat'>): GameResult[] {
  const raw = parseJson<unknown>(row.game_results, null);
  if (!Array.isArray(raw)) return [];
  return raw.map((g, i) => {
    let result: MatchResult | null = null;
    if (typeof g === 'string') {
      result = matchResult({ result: g, winner_seat: null, player_seat: null });
    } else if (g && typeof g === 'object') {
      const o = g as Record<string, unknown>;
      if (typeof o.result === 'string') result = matchResult({ result: o.result, winner_seat: null, player_seat: null });
      else if (typeof o.won === 'boolean') result = o.won ? 'win' : 'loss';
      else if (typeof o.winner_seat === 'number' && row.player_seat != null) result = o.winner_seat === row.player_seat ? 'win' : 'loss';
    }
    const game = g && typeof g === 'object' && typeof (g as Record<string, unknown>).game === 'number'
      ? ((g as Record<string, unknown>).game as number)
      : i + 1;
    return { game, result };
  });
}

export function matchTime(row: Pick<ArenaMatchRow, 'match_start_time' | 'parsed_at'>): number {
  const t = Date.parse(row.match_start_time ?? '') || Date.parse(row.parsed_at);
  return Number.isNaN(t) ? 0 : t;
}

export type DatePreset = 'all' | '7d' | '30d' | '90d';
export type ResultFilter = 'all' | MatchResult;

export interface MatchFilters {
  formats: NormalizedFormat[];
  result: ResultFilter;
  opponent: string;
  date: DatePreset;
  deckId: number | null;
}

export const EMPTY_FILTERS: MatchFilters = { formats: [], result: 'all', opponent: '', date: 'all', deckId: null };

const PRESET_DAYS: Record<Exclude<DatePreset, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 };

export function filterMatches(rows: ArenaMatchRow[], f: MatchFilters, now = Date.now()): ArenaMatchRow[] {
  const cutoff = f.date === 'all' ? 0 : now - PRESET_DAYS[f.date] * 86_400_000;
  const opp = f.opponent.trim().toLowerCase();
  return rows.filter((row) => {
    if (f.formats.length && !f.formats.includes(normalizeFormat(row))) return false;
    if (f.result !== 'all' && matchResult(row) !== f.result) return false;
    if (f.deckId != null && row.deck_id !== f.deckId) return false;
    if (cutoff && matchTime(row) < cutoff) return false;
    if (opp) {
      const hay = `${row.opponent_name ?? ''} ${row.opponent_commander ?? ''}`.toLowerCase();
      if (!hay.includes(opp)) return false;
    }
    return true;
  });
}

/** Per-turn lanes for the timeline. Card ids may be grpId numbers, grpId strings, or names. */
export interface TurnLane {
  turn: number;
  you: string[];
  lands: string[];
  opponent: string[];
  life: { player: number; opponent: number } | null;
}

export function buildTurnLanes(row: ArenaMatchRow): TurnLane[] {
  const you = parseJson<Record<string, unknown[]>>(row.cards_played_by_turn, {});
  const lands = parseJson<Record<string, unknown[]>>(row.lands_played_by_turn, {});
  const opp = parseJson<Record<string, unknown[]>>(row.opponent_cards_by_turn, {});
  const life = parseJson<Array<{ turn: number; player: number; opponent: number }>>(row.life_progression, []);

  const lifeByTurn = new Map<number, { player: number; opponent: number }>();
  for (const l of Array.isArray(life) ? life : []) {
    if (typeof l?.turn === 'number') lifeByTurn.set(l.turn, { player: l.player, opponent: l.opponent }); // last write wins
  }

  const turns = new Set<number>();
  for (const src of [you, lands, opp]) for (const k of Object.keys(src ?? {})) {
    const t = Number(k);
    if (Number.isFinite(t)) turns.add(t);
  }
  for (const t of lifeByTurn.keys()) if (t > 0) turns.add(t);

  const str = (xs: unknown[] | undefined) => (Array.isArray(xs) ? xs.map(String) : []);
  return [...turns].sort((a, b) => a - b).map((turn) => ({
    turn,
    you: str(you?.[String(turn)]),
    lands: str(lands?.[String(turn)]),
    opponent: str(opp?.[String(turn)]),
    life: lifeByTurn.get(turn) ?? null,
  }));
}

export function isGrpId(s: string): boolean {
  return /^\d+$/.test(s);
}
