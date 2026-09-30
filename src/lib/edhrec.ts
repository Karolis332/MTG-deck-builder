import { getDb } from './db';

export interface EdhrecRecommendation {
  name: string;
  synergy: number;
  inclusion: number;
}

export interface EdhrecData {
  commander: string;
  topCards: EdhrecRecommendation[];
  themes: string[];
}

// Cache key version. v1 rows were written by the pre-2026-09-30 parser, which read the old
// JSON layout and cached `topCards: []` for every commander (168 h TTL); bumping the prefix
// makes them unreachable without a migration.
const CACHE_VERSION = 'v2';

export function commanderToSlug(commanderName: string): string {
  return commanderName
    .toLowerCase()
    .replace(/[',]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getCacheKey(commanderName: string): string {
  return `edhrec:${CACHE_VERSION}:commander:${commanderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

function checkCache<T>(key: string): T | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT data, fetched_at, ttl_hours FROM meta_cache
       WHERE key = ?
       AND datetime(fetched_at, '+' || ttl_hours || ' hours') > datetime('now')`
    )
    .get(key) as { data: string } | undefined;

  if (row) {
    try {
      return JSON.parse(row.data) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function setCache(key: string, data: unknown) {
  const db = getDb();
  db.prepare(
    `INSERT INTO meta_cache (key, data, ttl_hours)
     VALUES (?, ?, 168)
     ON CONFLICT(key) DO UPDATE SET
       data = excluded.data,
       fetched_at = datetime('now')`
  ).run(key, JSON.stringify(data));
}

// ── EDHREC page parsing ────────────────────────────────────────────────────
// Current layout (2026): cards at container.json_dict.cardlists, themes at panels.taglinks.
// Pre-2026 layout: cards at cardlists, themes at panels.themes. Both are read.

interface EdhrecCardview { name: string; synergy?: number; num_decks?: number; potential_decks?: number }
interface EdhrecCardlist { cardviews?: EdhrecCardview[] }
interface EdhrecPage {
  cardlists?: EdhrecCardlist[];
  container?: { json_dict?: { cardlists?: EdhrecCardlist[] } };
  panels?: { taglinks?: Array<{ value: string }>; themes?: Array<{ value: string }> };
}

/** Flatten every cardlist, dedupe by name keeping the highest synergy, sort by synergy desc. */
function parseCards(json: EdhrecPage, limit: number): EdhrecRecommendation[] {
  const cardlists = json.container?.json_dict?.cardlists ?? json.cardlists ?? [];
  const cardMap = new Map<string, EdhrecRecommendation>();
  for (const cl of cardlists) {
    for (const cv of cl.cardviews ?? []) {
      if (!cv?.name) continue;
      const existing = cardMap.get(cv.name);
      const synergy = cv.synergy || 0;
      const inclusion = cv.potential_decks && cv.num_decks ? cv.num_decks / cv.potential_decks : 0;
      if (!existing || synergy > existing.synergy) {
        cardMap.set(cv.name, { name: cv.name, synergy, inclusion });
      }
    }
  }
  return Array.from(cardMap.values())
    .sort((a, b) => b.synergy - a.synergy)
    .slice(0, limit);
}

function parseThemes(json: EdhrecPage): string[] {
  return (json.panels?.taglinks ?? json.panels?.themes ?? [])
    .slice(0, 10)
    .map((t) => t.value);
}

async function fetchEdhrecPage(path: string): Promise<EdhrecPage | null> {
  const response = await fetch(`https://json.edhrec.com/pages/${path}.json`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  return (await response.json()) as EdhrecPage;
}

export async function getEdhrecRecommendations(
  commanderName: string
): Promise<EdhrecData | null> {
  const cacheKey = getCacheKey(commanderName);
  const cached = checkCache<EdhrecData>(cacheKey);
  if (cached) return cached;

  try {
    const json = await fetchEdhrecPage(`commanders/${commanderToSlug(commanderName)}`);
    if (!json) return null;

    const topCards = parseCards(json, 60);
    // An empty parse is a layout change or a bad page, not knowledge — never cache it.
    if (topCards.length === 0) return null;

    const data: EdhrecData = { commander: commanderName, topCards, themes: parseThemes(json) };
    setCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

// ── Theme-specific card fetching ──────────────────────────────────────────

export interface EdhrecThemeCards {
  theme: string;
  cards: EdhrecRecommendation[];
}

// Mirrors EDHREC's own theme slugs (panels.taglinks[].slug): '+' reads "plus", a sign before a
// digit reads "minus" — '+1/+1 Counters' → 'plus-1-plus-1-counters'. Checked against 265 live
// taglinks on 2026-09-30 (0 mismatches); the old 'p1p1-counters' form was a 403.
export function themeToSlug(theme: string): string {
  return theme
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/(^|[^a-z0-9])-(?=\d)/g, '$1 minus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getEdhrecThemeCards(
  commanderName: string,
  theme: string
): Promise<EdhrecThemeCards | null> {
  const cmdSlug = commanderToSlug(commanderName);
  const tSlug = themeToSlug(theme);
  const cacheKey = `edhrec:${CACHE_VERSION}:theme:${cmdSlug}:${tSlug}`;
  const cached = checkCache<EdhrecThemeCards>(cacheKey);
  if (cached) return cached;

  try {
    const json = await fetchEdhrecPage(`commanders/${cmdSlug}/${tSlug}`);
    if (!json) return null;

    const cards = parseCards(json, 40);
    if (cards.length === 0) return null;

    const data: EdhrecThemeCards = { theme, cards };
    setCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}
