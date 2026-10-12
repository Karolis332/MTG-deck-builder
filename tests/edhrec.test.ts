import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fixture from './fixtures/edhrec-tam-the-possibility.json';

// In-memory meta_cache so the parser tests never touch a real DB.
const mem = vi.hoisted(() => {
  const Db = require('better-sqlite3') as typeof Database;
  const db = new Db(':memory:');
  db.exec(`CREATE TABLE meta_cache (
    key TEXT PRIMARY KEY, data TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')), ttl_hours INTEGER NOT NULL DEFAULT 168)`);
  return db;
});
vi.mock('../src/lib/db', () => ({ getDb: () => mem }));

import {
  commanderToSlug, getCacheKey, themeToSlug,
  getEdhrecRecommendations, getEdhrecThemeCards,
} from '../src/lib/edhrec';

const cacheRows = () => mem.prepare('SELECT key FROM meta_cache').all() as Array<{ key: string }>;
const respond = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

beforeEach(() => {
  mem.exec('DELETE FROM meta_cache');
  vi.unstubAllGlobals();
});

describe('commanderToSlug', () => {
  it('converts basic commander name', () => {
    expect(commanderToSlug('Krenko, Mob Boss')).toBe('krenko-mob-boss');
  });

  it('handles apostrophes', () => {
    expect(commanderToSlug("Teysa, Orzhov's Scion")).toBe('teysa-orzhovs-scion');
  });

  it('strips special characters', () => {
    expect(commanderToSlug('Atraxa, Praetors\' Voice')).toBe('atraxa-praetors-voice');
  });

  it('handles single-word names', () => {
    expect(commanderToSlug('Omnath')).toBe('omnath');
  });

  it('normalizes multiple spaces', () => {
    expect(commanderToSlug('Some   Card   Name')).toBe('some-card-name');
  });
});

describe('getCacheKey', () => {
  it('creates deterministic v2 cache keys (v1 rows hold empty parses)', () => {
    expect(getCacheKey('Krenko, Mob Boss')).toBe('edhrec:v2:commander:krenko--mob-boss');
  });

  it('is case-insensitive', () => {
    expect(getCacheKey('Krenko')).toBe(getCacheKey('krenko'));
    expect(getCacheKey('KRENKO')).toBe(getCacheKey('krenko'));
  });
});

describe('themeToSlug', () => {
  it('converts simple themes', () => {
    expect(themeToSlug('Tokens')).toBe('tokens');
    expect(themeToSlug('Sacrifice')).toBe('sacrifice');
  });

  it('matches EDHREC taglink slugs for +1/+1 and -1/-1 counters', () => {
    expect(themeToSlug('+1/+1 Counters')).toBe('plus-1-plus-1-counters');
    expect(themeToSlug('-1/-1 Counters')).toBe('minus-1-minus-1-counters');
  });

  it('matches every taglink slug EDHREC ships in the fixture', () => {
    for (const t of fixture.panels.taglinks) expect(themeToSlug(t.value)).toBe(t.slug);
  });

  it('handles multi-word themes', () => {
    expect(themeToSlug('Spell Copy')).toBe('spell-copy');
  });
});

describe('getEdhrecRecommendations — current EDHREC shape', () => {
  // Trimmed real response for Tam, the Possibility (json.edhrec.com, 2026-09-30):
  // cards live at container.json_dict.cardlists, themes at panels.taglinks.
  it('parses cards and themes from the real fixture', async () => {
    vi.stubGlobal('fetch', respond(fixture));
    const data = await getEdhrecRecommendations('Tam, the Possibility');
    expect(data).not.toBeNull();
    expect(data!.topCards.length).toBe(20);
    expect(data!.topCards[0].synergy).toBeGreaterThan(0.5);
    expect(data!.topCards.map((c) => c.name)).toContain('Oath of Teferi');
    expect(data!.topCards.every((c) => c.inclusion > 0 && c.inclusion <= 1)).toBe(true);
    expect(data!.themes).toEqual(['Planeswalkers', 'Proliferate', 'Legends', 'Tokens', 'Historic', 'Control']);
    expect(cacheRows().map((r) => r.key)).toEqual(['edhrec:v2:commander:tam--the-possibility']);
  });

  it('still parses the legacy shape (root cardlists + panels.themes)', async () => {
    const legacy = {
      cardlists: fixture.container.json_dict.cardlists,
      panels: { themes: fixture.panels.taglinks },
    };
    vi.stubGlobal('fetch', respond(legacy));
    const data = await getEdhrecRecommendations('Tam, the Possibility');
    expect(data!.topCards.length).toBe(20);
    expect(data!.themes[0]).toBe('Planeswalkers');
  });

  it('keeps high-inclusion staples that fall outside the synergy top 60', async () => {
    // 70 synergy cards ahead of a Sol Ring-like staple (synergy -0.02, inclusion 0.85) and a
    // low-inclusion filler; the staple must survive the cut, the filler must not.
    const cardviews = Array.from({ length: 70 }, (_, i) => ({
      name: `Synergy ${i}`, synergy: 0.5 - i * 0.001, num_decks: 100, potential_decks: 1000,
    }));
    cardviews.push({ name: 'Sol Ring', synergy: -0.02, num_decks: 850, potential_decks: 1000 });
    cardviews.push({ name: 'Filler', synergy: -0.03, num_decks: 100, potential_decks: 1000 });
    vi.stubGlobal('fetch', respond({ container: { json_dict: { cardlists: [{ cardviews }] } }, panels: {} }));
    const data = await getEdhrecRecommendations('Tam, the Possibility');
    const names = data!.topCards.map((c) => c.name);
    expect(names).toHaveLength(61);
    expect(names).toContain('Sol Ring');
    expect(names).not.toContain('Filler');
    expect(names.slice(0, 60)).toEqual(cardviews.slice(0, 60).map((c) => c.name));
  });

  it('never caches an empty parse and re-fetches next time', async () => {
    const f = respond({ header: 'x', panels: {} });
    vi.stubGlobal('fetch', f);
    expect(await getEdhrecRecommendations('Tam, the Possibility')).toBeNull();
    expect(await getEdhrecRecommendations('Tam, the Possibility')).toBeNull();
    expect(f).toHaveBeenCalledTimes(2);
    expect(cacheRows()).toEqual([]);
  });

  it('never caches a failed fetch', async () => {
    vi.stubGlobal('fetch', respond({}, false));
    expect(await getEdhrecRecommendations('Tam, the Possibility')).toBeNull();
    expect(cacheRows()).toEqual([]);
  });
});

describe('getEdhrecThemeCards — current EDHREC shape', () => {
  it('parses the commander+theme page', async () => {
    vi.stubGlobal('fetch', respond(fixture));
    const data = await getEdhrecThemeCards('Tam, the Possibility', 'Planeswalkers');
    expect(data).not.toBeNull();
    expect(data!.theme).toBe('Planeswalkers');
    expect(data!.cards.length).toBe(20);
    expect(cacheRows().map((r) => r.key)).toEqual(['edhrec:v2:theme:tam-the-possibility:planeswalkers']);
  });

  it('never caches an empty theme parse', async () => {
    vi.stubGlobal('fetch', respond({ container: { json_dict: { cardlists: [] } } }));
    expect(await getEdhrecThemeCards('Tam, the Possibility', 'Planeswalkers')).toBeNull();
    expect(cacheRows()).toEqual([]);
  });
});

describe('EDHREC Theme Mapping', () => {
  // Test that the mapping covers common EDHREC themes
  const EDHREC_THEME_MAP: Record<string, string> = {
    'tribal': 'tribal',
    'tokens': 'tokens',
    '+1/+1 counters': 'counters',
    'counters': 'counters',
    'sacrifice': 'sacrifice',
    'aristocrats': 'sacrifice',
    'artifacts': 'artifacts',
    'enchantments': 'enchantments',
    'spellslinger': 'spellslinger',
    'voltron': 'equipment',
    'graveyard': 'graveyard',
    'reanimator': 'graveyard',
    'lifegain': 'lifegain',
    'mill': 'graveyard',
    'storm': 'spellslinger',
  };

  it('maps all common EDHREC themes to synergy groups', () => {
    const unmapped = Object.values(EDHREC_THEME_MAP).filter(
      (v) => !['tribal', 'tokens', 'counters', 'sacrifice', 'artifacts',
               'enchantments', 'spellslinger', 'equipment', 'graveyard',
               'lifegain', 'control', 'energy', 'aggro', 'ramp', 'draw',
               'flying'].includes(v)
    );
    expect(unmapped).toEqual([]);
  });

  it('maps aristocrats to sacrifice', () => {
    expect(EDHREC_THEME_MAP['aristocrats']).toBe('sacrifice');
  });

  it('maps voltron to equipment', () => {
    expect(EDHREC_THEME_MAP['voltron']).toBe('equipment');
  });

  it('maps reanimator to graveyard', () => {
    expect(EDHREC_THEME_MAP['reanimator']).toBe('graveyard');
  });
});
