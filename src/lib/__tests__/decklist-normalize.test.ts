import { describe, it, expect } from 'vitest';
import { normalizeDeckText, mergeDeckLines, normalizeBoard, MAX_LINE_CHARS } from '../decklist-normalize';
import { parseArenaExportWithMeta } from '../arena-parser';

describe('normalizeDeckText', () => {
  it('keeps an Arena export intact and reads About/Name', () => {
    const n = normalizeDeckText('About\nName Orzhov Repartee\n\nDeck\n4 Erode (FDN) 12\n3 Plains\n\nSideboard\n2 Duress\n');
    expect(n.deckName).toBe('Orzhov Repartee');
    expect(n.hasSideboardHeader).toBe(true);
    const parsed = parseArenaExportWithMeta(n.text);
    expect(parsed.cards.map((c) => `${c.quantity} ${c.name} ${c.board}`)).toEqual([
      '4 Erode main', '3 Plains main', '2 Duress sideboard',
    ]);
  });

  it('lifts Moxfield *CMDR* and Archidekt [Commander] lines out as commanders', () => {
    const n = normalizeDeckText('1 Krenko, Mob Boss (M19) 12 *CMDR*\n1x Sol Ring (c21) 263 [Commander{top}]\n1 Goblin Chieftain *F*\n');
    expect(n.commanderNames).toEqual(['Krenko, Mob Boss', 'Sol Ring']);
    expect(n.text).toBe('1 Goblin Chieftain');
  });

  it('drops // comments and never infers a sideboard from blank-separated blocks by default', () => {
    const cards = Array.from({ length: 60 }, (_, i) => `1 Card ${i}`);
    const text = ['// Krenko — COMMANDER', '', '1 Krenko, Mob Boss *CMDR*', '', '// ── ramp ──', ...cards.slice(0, 50), '', '// ── extras ──', ...cards.slice(50)].join('\n');
    const n = normalizeDeckText(text);
    expect(n.hasSideboardHeader).toBe(false);
    expect(n.commanderNames).toEqual(['Krenko, Mob Boss']);
    expect(n.text.split('\n').filter((l) => l.startsWith('//'))).toHaveLength(0);
    // a 10-card trailing block stays in the main deck for commander lists even when inference is requested
    expect(normalizeDeckText(text, { inferSideboard: true }).hasSideboardHeader).toBe(false);
  });

  it('infers an unlabeled trailing sideboard block for a 60-card list only when asked', () => {
    const main = Array.from({ length: 15 }, (_, i) => `4 Spell ${i}`); // 60 cards
    const side = ['2 Duress', '3 Rest in Peace'];
    const text = [...main, '', ...side].join('\n');
    expect(normalizeDeckText(text).hasSideboardHeader).toBe(false);
    const n = normalizeDeckText(text, { inferSideboard: true });
    expect(n.hasSideboardHeader).toBe(true);
    expect(n.text).toContain('\nSideboard\n2 Duress');
  });

  it('prefixes "1 " on a pure name list and normalises "Sideboard (15)" headers', () => {
    const n = normalizeDeckText('Sol Ring\nArcane Signet\nSIDEBOARD (2)\nDuress');
    expect(n.text).toBe('1 Sol Ring\n1 Arcane Signet\nSideboard\n1 Duress');
    expect(n.hasSideboardHeader).toBe(true);
  });

  it('collapses whitespace and caps line length so hostile input stays linear', () => {
    const hostile = `1 ${' '.repeat(19_000)}x [${'['.repeat(500)}`;
    const started = performance.now();
    const n = normalizeDeckText(hostile);
    expect(performance.now() - started).toBeLessThan(100);
    expect(n.text.length).toBeLessThanOrEqual(MAX_LINE_CHARS);
    expect(n.text.startsWith('1 x')).toBe(true);
  });
});

describe('mergeDeckLines', () => {
  it('sums repeated names per board, case-insensitively, capped at the max', () => {
    const merged = mergeDeckLines([
      { name: 'Sol Ring', quantity: 1, board: 'main' },
      { name: 'sol ring', quantity: 1, board: 'main' },
      { name: 'Sol Ring', quantity: 1, board: 'sideboard' },
      { name: 'Mountain', quantity: 80, board: 'main' },
      { name: 'Mountain', quantity: 30, board: 'main' },
    ]);
    expect(merged).toEqual([
      { name: 'Sol Ring', quantity: 2, board: 'main' },
      { name: 'Sol Ring', quantity: 1, board: 'sideboard' },
      { name: 'Mountain', quantity: 99, board: 'main' },
    ]);
  });
});

describe('normalizeBoard', () => {
  it('maps known boards case-insensitively and everything else to main', () => {
    expect(normalizeBoard('Commander')).toBe('commander');
    expect(normalizeBoard(' SIDEBOARD ')).toBe('sideboard');
    expect(normalizeBoard('maybeboard')).toBe('main');
    expect(normalizeBoard(undefined)).toBe('main');
  });
});
