import { describe, it, expect } from 'vitest';
import { parseList, rolePenalty, roleWindows } from '../scripts/best-deck-lib';
import type { DbCard } from '../src/lib/types';

const card = (name: string, type_line: string, oracle_text = '', cmc = 2): DbCard => ({ name, type_line, oracle_text, cmc } as DbCard);
const many = (n: number, make: (i: number) => DbCard): DbCard[] => Array.from({ length: n }, (_, i) => make(i));

describe('parseList', () => {
  it('expands quantities, strips set codes and skips headers', () => {
    expect(parseList('Commander\n1 Meren of Clan Nel Toth\n\nDeck\n2 Forest (FDN) 280\n1x Sol Ring\n'))
      .toEqual(['Meren of Clan Nel Toth', 'Forest', 'Forest', 'Sol Ring']);
  });
});

describe('rolePenalty', () => {
  const w = roleWindows('commander');

  it('charges one point per card short of every window', () => {
    const { penalty, roles } = rolePenalty(many(99, (i) => card(`Bear ${i}`, 'Creature — Bear')), 'commander');
    expect(roles.land).toBe(0);
    expect(penalty).toBe(Object.values(w).reduce((s, x) => s + x.min, 0));
  });

  it('is zero inside the windows and charges the excess above them', () => {
    const deck = [
      ...many(w.land.min, (i) => card(`Land ${i}`, 'Land')),
      ...many(w.ramp.min, (i) => card(`Rock ${i}`, 'Artifact', '{T}: Add {C}.')),
      ...many(w.draw.min, (i) => card(`Draw ${i}`, 'Sorcery', 'Draw two cards.')),
      ...many(w.removal.min, (i) => card(`Kill ${i}`, 'Instant', 'Destroy target creature.')),
      ...many(w.board_wipe.min, (i) => card(`Wipe ${i}`, 'Sorcery', 'Destroy all creatures.')),
      ...many(w.protection.min, (i) => card(`Veil ${i}`, 'Instant', 'Target creature you control gains hexproof until end of turn.')),
    ];
    expect(rolePenalty(deck, 'commander')).toEqual({
      penalty: 0,
      roles: { land: w.land.min, ramp: w.ramp.min, draw: w.draw.min, removal: w.removal.min, board_wipe: w.board_wipe.min, protection: w.protection.min },
    });
    const rocks = many(w.ramp.max - w.ramp.min + 20, (i) => card(`Extra rock ${i}`, 'Artifact', '{T}: Add {C}.'));
    expect(rolePenalty([...deck, ...rocks], 'commander').penalty).toBe(20);
  });

  it('ignores blank slots from the removal ranking', () => {
    const deck = many(w.land.min, (i) => card(`Land ${i}`, 'Land'));
    expect(rolePenalty([...deck, null, null], 'commander').roles.land).toBe(w.land.min);
  });
});
