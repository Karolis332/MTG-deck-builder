import { describe, it, expect } from 'vitest';
import { parseArenaExport, formatArenaExport } from '../arena-parser';

describe('parseArenaExport', () => {
  it('parses standard format with set info', () => {
    const result = parseArenaExport('4 Lightning Bolt (2X2) 117');
    expect(result).toEqual([
      {
        quantity: 4,
        name: 'Lightning Bolt',
        setCode: '2X2',
        collectorNumber: '117',
        board: 'main',
      },
    ]);
  });

  it('parses without set info', () => {
    const result = parseArenaExport('4 Lightning Bolt');
    expect(result).toEqual([
      {
        quantity: 4,
        name: 'Lightning Bolt',
        setCode: undefined,
        collectorNumber: undefined,
        board: 'main',
      },
    ]);
  });

  it('parses with x separator', () => {
    const result = parseArenaExport('4x Lightning Bolt');
    expect(result).toEqual([
      {
        quantity: 4,
        name: 'Lightning Bolt',
        setCode: undefined,
        collectorNumber: undefined,
        board: 'main',
      },
    ]);
  });

  it('handles section headers', () => {
    const text = `Deck
4 Lightning Bolt
Sideboard
2 Negate`;
    const result = parseArenaExport(text);
    expect(result).toHaveLength(2);
    expect(result[0].board).toBe('main');
    expect(result[1].board).toBe('sideboard');
  });

  it('handles commander section', () => {
    const text = `Commander
1 Atraxa, Praetors' Voice (CM2) 10

Deck
99 Plains`;
    const result = parseArenaExport(text);
    expect(result[0].board).toBe('commander');
    expect(result[1].board).toBe('main');
  });

  it('handles companion section', () => {
    const text = `Companion
1 Lurrus of the Dream-Den

Deck
4 Lightning Bolt`;
    const result = parseArenaExport(text);
    expect(result[0].board).toBe('companion');
    expect(result[1].board).toBe('main');
  });

  it('treats blank line after main cards as sideboard', () => {
    const text = `4 Lightning Bolt

2 Negate`;
    const result = parseArenaExport(text);
    expect(result[0].board).toBe('main');
    expect(result[1].board).toBe('sideboard');
  });

  it('handles case-insensitive headers', () => {
    const text = `SIDEBOARD
2 Negate`;
    const result = parseArenaExport(text);
    expect(result[0].board).toBe('sideboard');
  });

  it('handles headers with trailing colon', () => {
    const text = `Sideboard:
2 Negate`;
    const result = parseArenaExport(text);
    expect(result[0].board).toBe('sideboard');
  });

  it('handles alternative section names', () => {
    const text = `Maindeck
4 Lightning Bolt
Side
2 Negate`;
    const result = parseArenaExport(text);
    expect(result[0].board).toBe('main');
    expect(result[1].board).toBe('sideboard');
  });

  it('skips malformed lines', () => {
    const text = `4 Lightning Bolt
this is not a card line
2 Negate`;
    const result = parseArenaExport(text);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(parseArenaExport('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(parseArenaExport('   \n\n   ')).toEqual([]);
  });

  it('handles Windows line endings', () => {
    const text = '4 Lightning Bolt\r\n2 Negate\r\n';
    const result = parseArenaExport(text);
    expect(result).toHaveLength(2);
  });
});

describe('formatArenaExport', () => {
  it('formats basic deck', () => {
    const cards = [
      { name: 'Lightning Bolt', quantity: 4, board: 'main' },
      { name: 'Mountain', quantity: 20, board: 'main' },
    ];
    const result = formatArenaExport(cards);
    expect(result).toContain('Deck');
    expect(result).toContain('4 Lightning Bolt');
    expect(result).toContain('20 Mountain');
  });

  it('includes set info when provided', () => {
    const cards = [
      { name: 'Lightning Bolt', quantity: 4, set_code: '2X2', collector_number: '117', board: 'main' },
    ];
    const result = formatArenaExport(cards);
    expect(result).toContain('4 Lightning Bolt (2X2) 117');
  });

  it('formats commander section', () => {
    const cards = [
      { name: 'Atraxa', quantity: 1, board: 'commander' },
      { name: 'Plains', quantity: 99, board: 'main' },
    ];
    const result = formatArenaExport(cards);
    const lines = result.split('\n');
    expect(lines[0]).toBe('Commander');
    expect(lines[1]).toBe('1 Atraxa');
  });

  it('formats sections in correct order: commander, companion, deck, sideboard', () => {
    const cards = [
      { name: 'Negate', quantity: 2, board: 'sideboard' },
      { name: 'Atraxa', quantity: 1, board: 'commander' },
      { name: 'Plains', quantity: 60, board: 'main' },
      { name: 'Lurrus', quantity: 1, board: 'companion' },
    ];
    const result = formatArenaExport(cards);
    const commanderIdx = result.indexOf('Commander');
    const companionIdx = result.indexOf('Companion');
    const deckIdx = result.indexOf('Deck');
    const sideIdx = result.indexOf('Sideboard');
    expect(commanderIdx).toBeLessThan(companionIdx);
    expect(companionIdx).toBeLessThan(deckIdx);
    expect(deckIdx).toBeLessThan(sideIdx);
  });

  it('handles empty input', () => {
    expect(formatArenaExport([])).toBe('');
  });
});
