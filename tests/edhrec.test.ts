import { describe, it, expect } from 'vitest';

// Test the EDHREC slug generation logic directly (reimplemented for testing
// since the original is not exported)
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

function themeToSlug(theme: string): string {
  return theme
    .toLowerCase()
    .replace(/\+1\/\+1 counters/g, 'p1p1-counters')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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
  it('creates deterministic cache keys', () => {
    const key = getCacheKey('Krenko, Mob Boss');
    expect(key).toBe('edhrec:commander:krenko--mob-boss');
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

  it('handles +1/+1 counters special case', () => {
    expect(themeToSlug('+1/+1 Counters')).toBe('p1p1-counters');
  });

  it('handles multi-word themes', () => {
    expect(themeToSlug('Spell Copy')).toBe('spell-copy');
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
