import { describe, it, expect } from 'vitest';
import { normalizeDeckText } from '../decklist-normalize';
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

  it('drops // comments and does not treat blank-separated blocks of a 99 as a sideboard', () => {
    const cards = Array.from({ length: 60 }, (_, i) => `1 Card ${i}`);
    const text = ['// Krenko — COMMANDER', '', '1 Krenko, Mob Boss *CMDR*', '', '// ── ramp ──', ...cards.slice(0, 30), '', '// ── lands ──', ...cards.slice(30)].join('\n');
    const n = normalizeDeckText(text);
    expect(n.hasSideboardHeader).toBe(false);
    expect(n.commanderNames).toEqual(['Krenko, Mob Boss']);
    expect(n.text.split('\n').filter((l) => l.startsWith('//'))).toHaveLength(0);
  });

  it('infers an unlabeled trailing sideboard block for a 60-card list', () => {
    const main = Array.from({ length: 15 }, (_, i) => `4 Spell ${i}`); // 60 cards
    const side = ['2 Duress', '3 Rest in Peace'];
    const n = normalizeDeckText([...main, '', ...side].join('\n'));
    expect(n.hasSideboardHeader).toBe(true);
    expect(n.text).toContain('\nSideboard\n2 Duress');
  });

  it('prefixes "1 " on a pure name list and normalises "Sideboard (15)" headers', () => {
    const n = normalizeDeckText('Sol Ring\nArcane Signet\nSIDEBOARD (2)\nDuress');
    expect(n.text).toBe('1 Sol Ring\n1 Arcane Signet\nSideboard\n1 Duress');
    expect(n.hasSideboardHeader).toBe(true);
  });
});
