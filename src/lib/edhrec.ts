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

function commanderToSlug(commanderName: string): string {
  return commanderName
    .toLowerCase()
    .replace(/[',]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function getCacheKey(commanderName: string): string {
  return `edhrec:commander:${commanderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
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

export async function getEdhrecRecommendations(
  commanderName: string
): Promise<EdhrecData | null> {
  const cacheKey = getCacheKey(commanderName);
  const cached = checkCache<EdhrecData>(cacheKey);
  if (cached) return cached;

  try {
    const slug = commanderToSlug(commanderName);

    const response = await fetch(
      `https://json.edhrec.com/pages/commanders/${slug}.json`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const json = await response.json();

    // EDHREC returns multiple cardlists — gather cards from all of them
    const allCardviews: Array<{ name: string; synergy: number; num_decks: number; potential_decks: number }> = [];
    const cardlists = json.cardlists || [];
    for (const cl of cardlists) {
      const views = cl.cardviews || [];
      for (const cv of views) {
        allCardviews.push(cv);
      }
    }

    // Dedupe by name, keeping highest synergy
    const cardMap = new Map<string, EdhrecRecommendation>();
    for (const cv of allCardviews) {
      const existing = cardMap.get(cv.name);
      const synergy = cv.synergy || 0;
      const inclusion = cv.potential_decks > 0 ? cv.num_decks / cv.potential_decks : 0;
      if (!existing || synergy > existing.synergy) {
        cardMap.set(cv.name, { name: cv.name, synergy, inclusion });
      }
    }

    // Sort by synergy descending, take top 60
    const topCards = Array.from(cardMap.values())
      .sort((a, b) => b.synergy - a.synergy)
      .slice(0, 60);

    const themes: string[] = (json.panels?.themes || [])
      .slice(0, 10)
      .map((t: { value: string }) => t.value);

    const data: EdhrecData = {
      commander: commanderName,
      topCards,
      themes,
    };

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

function themeToSlug(theme: string): string {
  return theme
    .toLowerCase()
    .replace(/\+1\/\+1 counters?/g, 'p1p1-counters')
    .replace(/-1\/-1 counters?/g, 'm1m1-counters')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getEdhrecThemeCards(
  commanderName: string,
  theme: string
): Promise<EdhrecThemeCards | null> {
  const cacheKey = `edhrec:theme:${commanderToSlug(commanderName)}:${themeToSlug(theme)}`;
  const cached = checkCache<EdhrecThemeCards>(cacheKey);
  if (cached) return cached;

  try {
    const cmdSlug = commanderToSlug(commanderName);
    const tSlug = themeToSlug(theme);

    const response = await fetch(
      `https://json.edhrec.com/pages/commanders/${cmdSlug}/${tSlug}.json`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const json = await response.json();

    const allCardviews: Array<{ name: string; synergy: number; num_decks: number; potential_decks: number }> = [];
    const cardlists = json.cardlists || [];
    for (const cl of cardlists) {
      const views = cl.cardviews || [];
      for (const cv of views) {
        allCardviews.push(cv);
      }
    }

    const cardMap = new Map<string, EdhrecRecommendation>();
    for (const cv of allCardviews) {
      const existing = cardMap.get(cv.name);
      const synergy = cv.synergy || 0;
      const inclusion = cv.potential_decks > 0 ? cv.num_decks / cv.potential_decks : 0;
      if (!existing || synergy > existing.synergy) {
        cardMap.set(cv.name, { name: cv.name, synergy, inclusion });
      }
    }

    const cards = Array.from(cardMap.values())
      .sort((a, b) => b.synergy - a.synergy)
      .slice(0, 40);

    const data: EdhrecThemeCards = { theme, cards };
    setCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}
