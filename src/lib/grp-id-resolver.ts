/**
 * GrpId Resolution Pipeline — resolves Arena grpIds to card data.
 *
 * 4-layer resolution strategy:
 * 1. In-memory cache (Map)
 * 2. grp_id_cache DB table
 * 3. cards.arena_id match (existing Scryfall data)
 * 4. Scryfall API fallback: GET /cards/arena/{grpId}
 */

import type { ResolvedCard } from './game-state-engine';

// ── Types ────────────────────────────────────────────────────────────────────

interface GrpIdCacheRow {
  grp_id: number;
  card_name: string;
  scryfall_id: string | null;
  image_uri_small: string | null;
  image_uri_normal: string | null;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string | null;
  oracle_text: string | null;
}

interface DbAdapter {
  prepare(sql: string): {
    get(...args: unknown[]): unknown;
    run(...args: unknown[]): void;
    all(...args: unknown[]): unknown[];
  };
}

// ── Resolver ─────────────────────────────────────────────────────────────────

export class GrpIdResolver {
  private memoryCache: Map<number, ResolvedCard> = new Map();
  private db: DbAdapter | null = null;
  private pendingRequests: Map<number, Promise<ResolvedCard>> = new Map();
  private scryfallLastRequest = 0;
  private static SCRYFALL_RATE_LIMIT_MS = 100;

  constructor(db?: DbAdapter) {
    this.db = db ?? null;
  }

  setDb(db: DbAdapter): void {
    this.db = db;
  }

  /**
   * Resolve a single grpId to card data.
   * Tries each cache layer in order, falling back to Scryfall API.
   */
  async resolve(grpId: number): Promise<ResolvedCard> {
    // Layer 1: Memory cache
    const cached = this.memoryCache.get(grpId);
    if (cached) return cached;

    // Deduplicate concurrent requests for the same grpId
    const pending = this.pendingRequests.get(grpId);
    if (pending) return pending;

    const promise = this.resolveInternal(grpId);
    this.pendingRequests.set(grpId, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(grpId);
    }
  }

  /**
   * Batch resolve multiple grpIds. Returns a Map of grpId → ResolvedCard.
   */
  async resolveMany(grpIds: number[]): Promise<Map<number, ResolvedCard>> {
    const results = new Map<number, ResolvedCard>();
    const uncached: number[] = [];

    // Check memory cache first
    for (const grpId of grpIds) {
      const cached = this.memoryCache.get(grpId);
      if (cached) {
        results.set(grpId, cached);
      } else {
        uncached.push(grpId);
      }
    }

    // Resolve uncached in parallel (respecting rate limits)
    const promises = uncached.map(async (grpId) => {
      const card = await this.resolve(grpId);
      results.set(grpId, card);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get a resolved card from cache only (no API calls). Returns null if not cached.
   */
  getCached(grpId: number): ResolvedCard | null {
    return this.memoryCache.get(grpId) ?? null;
  }

  /**
   * Pre-warm the cache from the database for a set of grpIds.
   */
  warmCache(grpIds: number[]): void {
    if (!this.db) return;

    for (const grpId of grpIds) {
      if (this.memoryCache.has(grpId)) continue;

      const row = this.lookupDb(grpId);
      if (row) {
        this.memoryCache.set(grpId, row);
      }
    }
  }

  /** Number of entries in memory cache */
  get cacheSize(): number {
    return this.memoryCache.size;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async resolveInternal(grpId: number): Promise<ResolvedCard> {
    // Layer 2: DB cache
    const dbCached = this.lookupDb(grpId);
    if (dbCached) {
      this.memoryCache.set(grpId, dbCached);
      return dbCached;
    }

    // Layer 3: cards.arena_id match
    const arenaMatch = this.lookupArenaId(grpId);
    if (arenaMatch) {
      this.memoryCache.set(grpId, arenaMatch);
      this.storeToDb(grpId, arenaMatch, 'arena_id');
      return arenaMatch;
    }

    // Layer 4: Scryfall API
    const scryfallResult = await this.lookupScryfall(grpId);
    if (scryfallResult) {
      this.memoryCache.set(grpId, scryfallResult);
      this.storeToDb(grpId, scryfallResult, 'scryfall');
      return scryfallResult;
    }

    // Unknown card — return placeholder
    const unknown: ResolvedCard = {
      grpId,
      name: `Unknown (grpId: ${grpId})`,
      manaCost: null,
      cmc: 0,
      typeLine: null,
      oracleText: null,
      imageUriSmall: null,
      imageUriNormal: null,
    };
    this.memoryCache.set(grpId, unknown);
    return unknown;
  }

  private lookupDb(grpId: number): ResolvedCard | null {
    if (!this.db) return null;

    try {
      const row = this.db.prepare(
        'SELECT * FROM grp_id_cache WHERE grp_id = ?'
      ).get(grpId) as GrpIdCacheRow | undefined;

      if (!row) return null;

      return {
        grpId: row.grp_id,
        name: row.card_name,
        manaCost: row.mana_cost,
        cmc: row.cmc ?? 0,
        typeLine: row.type_line,
        oracleText: row.oracle_text,
        imageUriSmall: row.image_uri_small,
        imageUriNormal: row.image_uri_normal,
      };
    } catch {
      return null;
    }
  }

  private lookupArenaId(grpId: number): ResolvedCard | null {
    if (!this.db) return null;

    try {
      const row = this.db.prepare(
        `SELECT id, name, mana_cost, cmc, type_line, oracle_text,
                image_uri_small, image_uri_normal
         FROM cards WHERE arena_id = ? LIMIT 1`
      ).get(grpId) as {
        id: string;
        name: string;
        mana_cost: string | null;
        cmc: number;
        type_line: string;
        oracle_text: string | null;
        image_uri_small: string | null;
        image_uri_normal: string | null;
      } | undefined;

      if (!row) return null;

      return {
        grpId,
        name: row.name,
        manaCost: row.mana_cost,
        cmc: row.cmc,
        typeLine: row.type_line,
        oracleText: row.oracle_text,
        imageUriSmall: row.image_uri_small,
        imageUriNormal: row.image_uri_normal,
      };
    } catch {
      return null;
    }
  }

  private async lookupScryfall(grpId: number): Promise<ResolvedCard | null> {
    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastReq = now - this.scryfallLastRequest;
      if (timeSinceLastReq < GrpIdResolver.SCRYFALL_RATE_LIMIT_MS) {
        await new Promise(r => setTimeout(r, GrpIdResolver.SCRYFALL_RATE_LIMIT_MS - timeSinceLastReq));
      }
      this.scryfallLastRequest = Date.now();

      const resp = await fetch(`https://api.scryfall.com/cards/arena/${grpId}`, {
        headers: {
          'User-Agent': 'TheBlackGrimoire/1.0',
          Accept: 'application/json',
        },
      });

      if (!resp.ok) return null;

      const card = await resp.json() as Record<string, unknown>;
      const imageUris = card.image_uris as Record<string, string> | undefined;
      // Handle double-faced cards
      const faces = card.card_faces as Array<Record<string, unknown>> | undefined;
      const frontFace = faces?.[0];
      const frontImages = frontFace?.image_uris as Record<string, string> | undefined;

      return {
        grpId,
        name: card.name as string,
        manaCost: (card.mana_cost as string) ?? (frontFace?.mana_cost as string) ?? null,
        cmc: (card.cmc as number) ?? 0,
        typeLine: (card.type_line as string) ?? null,
        oracleText: (card.oracle_text as string) ?? (frontFace?.oracle_text as string) ?? null,
        imageUriSmall: imageUris?.small ?? frontImages?.small ?? null,
        imageUriNormal: imageUris?.normal ?? frontImages?.normal ?? null,
      };
    } catch {
      return null;
    }
  }

  private storeToDb(grpId: number, card: ResolvedCard, source: string): void {
    if (!this.db) return;

    try {
      this.db.prepare(
        `INSERT OR REPLACE INTO grp_id_cache
         (grp_id, card_name, image_uri_small, image_uri_normal, mana_cost, cmc, type_line, oracle_text, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        grpId,
        card.name,
        card.imageUriSmall,
        card.imageUriNormal,
        card.manaCost,
        card.cmc,
        card.typeLine,
        card.oracleText,
        source,
      );
    } catch {
      // Non-critical — cache miss is fine
    }
  }
}
