import { getDb } from './db';

interface EdhrecRecommendation {
  name: string;
  synergy: number;
  inclusion: number;
}

interface EdhrecData {
  commander: string;
  topCards: EdhrecRecommendation[];
  themes: string[];
}

function getCacheKey(commanderName: string): string {
  return `edhrec:commander:${commanderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

function checkCache(key: string): EdhrecData | null {
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
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }
  return null;
}

function setCache(key: string, data: EdhrecData) {
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
  const cached = checkCache(cacheKey);
  if (cached) return cached;

  try {
    const slug = commanderName
      .toLowerCase()
      .replace(/[',]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const response = await fetch(
      `https://json.edhrec.com/pages/commanders/${slug}.json`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const json = await response.json();

    const topCards: EdhrecRecommendation[] = (json.cardlists?.[0]?.cardviews || [])
      .slice(0, 30)
      .map((cv: { name: string; synergy: number; num_decks: number; potential_decks: number }) => ({
        name: cv.name,
        synergy: cv.synergy || 0,
        inclusion: cv.potential_decks > 0 ? cv.num_decks / cv.potential_decks : 0,
      }));

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
