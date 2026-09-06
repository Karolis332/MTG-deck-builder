import { describe, it, expect } from 'vitest';
import { getRoleQuotas } from '../deck-builder-constraints';

describe('getRoleQuotas mono-colour Commander rebalance', () => {
  const base = getRoleQuotas('midrange', 61, null);
  it('mono-colour commander midrange moves to benchmark medians', () => {
    const q = getRoleQuotas('midrange', 61, null, undefined, 'commander', 1);
    expect(q.removal).toBe(10);
    expect(q.draw).toBe(6);
    expect(q.board_wipe).toBe(2);
    expect(q.protection).toBe(2);
    expect(q.ramp).toBe(base.ramp);
  });
  it('applies to brawl and competitivebrawl, not 60-card formats', () => {
    expect(getRoleQuotas('tribal', 61, null, undefined, 'brawl', 1).removal).toBe(10);
    expect(getRoleQuotas('tribal', 61, null, undefined, 'competitivebrawl', 1).draw).toBe(6);
    expect(getRoleQuotas('midrange', 36, null, undefined, 'standard', 1)).toEqual(getRoleQuotas('midrange', 36, null));
  });
  it('leaves multicolour and draw/wipe-identity archetypes on the template', () => {
    expect(getRoleQuotas('midrange', 61, null, undefined, 'commander', 2)).toEqual(base);
    expect(getRoleQuotas('control', 61, null, undefined, 'commander', 1)).toEqual(getRoleQuotas('control', 61, null));
    expect(getRoleQuotas('spellslinger', 61, null, undefined, 'commander', 1)).toEqual(getRoleQuotas('spellslinger', 61, null));
  });
  it('commander-provided draw/removal still reduce the mono quotas with floors', () => {
    const profile = { drawReduction: 3, removalReduction: 5, synergyMinimums: {} } as never;
    const q = getRoleQuotas('midrange', 61, profile, undefined, 'commander', 1);
    expect(q.draw).toBe(5);
    expect(q.removal).toBe(8);
  });
});
