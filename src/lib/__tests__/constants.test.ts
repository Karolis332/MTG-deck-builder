import { describe, it, expect } from 'vitest';
import {
  MANA_COLORS,
  FORMATS,
  DEFAULT_DECK_SIZE,
  DEFAULT_LAND_COUNT,
  CARD_TYPES,
  RARITIES,
  MANA_COLOR_NAMES,
  MANA_COLOR_HEX,
  FORMAT_LABELS,
} from '../constants';

describe('MANA_COLORS', () => {
  it('has exactly 5 colors (WUBRG)', () => {
    expect(MANA_COLORS).toHaveLength(5);
    expect(MANA_COLORS).toEqual(['W', 'U', 'B', 'R', 'G']);
  });
});

describe('FORMATS', () => {
  it('includes major constructed formats', () => {
    expect(FORMATS).toContain('standard');
    expect(FORMATS).toContain('modern');
    expect(FORMATS).toContain('legacy');
    expect(FORMATS).toContain('vintage');
    expect(FORMATS).toContain('commander');
    expect(FORMATS).toContain('pioneer');
    expect(FORMATS).toContain('pauper');
  });

  it('has a label for every format', () => {
    for (const format of FORMATS) {
      expect(FORMAT_LABELS[format]).toBeDefined();
    }
  });
});

describe('DEFAULT_DECK_SIZE', () => {
  it('commander is 100 cards', () => {
    expect(DEFAULT_DECK_SIZE['commander']).toBe(100);
  });

  it('standard formats are 60 cards', () => {
    expect(DEFAULT_DECK_SIZE['standard']).toBe(60);
    expect(DEFAULT_DECK_SIZE['modern']).toBe(60);
    expect(DEFAULT_DECK_SIZE['pioneer']).toBe(60);
  });

  it('has a default fallback', () => {
    expect(DEFAULT_DECK_SIZE['default']).toBe(60);
  });
});

describe('DEFAULT_LAND_COUNT', () => {
  it('has sensible land counts', () => {
    expect(DEFAULT_LAND_COUNT['commander']).toBe(37);
    expect(DEFAULT_LAND_COUNT['standard']).toBe(24);
    expect(DEFAULT_LAND_COUNT['default']).toBe(24);
  });
});

describe('CARD_TYPES', () => {
  it('includes all major card types', () => {
    expect(CARD_TYPES).toContain('Creature');
    expect(CARD_TYPES).toContain('Instant');
    expect(CARD_TYPES).toContain('Sorcery');
    expect(CARD_TYPES).toContain('Enchantment');
    expect(CARD_TYPES).toContain('Artifact');
    expect(CARD_TYPES).toContain('Planeswalker');
    expect(CARD_TYPES).toContain('Land');
  });
});

describe('RARITIES', () => {
  it('has 4 rarities in order', () => {
    expect(RARITIES).toEqual(['common', 'uncommon', 'rare', 'mythic']);
  });
});

describe('MANA_COLOR_NAMES', () => {
  it('maps all 5 colors plus colorless', () => {
    expect(MANA_COLOR_NAMES['W']).toBe('White');
    expect(MANA_COLOR_NAMES['U']).toBe('Blue');
    expect(MANA_COLOR_NAMES['B']).toBe('Black');
    expect(MANA_COLOR_NAMES['R']).toBe('Red');
    expect(MANA_COLOR_NAMES['G']).toBe('Green');
    expect(MANA_COLOR_NAMES['C']).toBe('Colorless');
  });
});

describe('MANA_COLOR_HEX', () => {
  it('has valid hex codes for all colors', () => {
    for (const color of [...MANA_COLORS, 'C']) {
      expect(MANA_COLOR_HEX[color]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
