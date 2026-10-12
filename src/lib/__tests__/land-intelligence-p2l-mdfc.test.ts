// Unit P2-L (2026-09-30) — integrate-2 A-D12 one MDFC cap.
import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, buildOptimalLandBase, MAX_MDFC_LANDS, type LandScore } from '../land-intelligence';
import type { DbCard } from '../types';

function scoreMap(opts: Parameters<typeof scoreLandsForDeck>[0]): Map<string, LandScore> {
  return new Map(scoreLandsForDeck(opts).map((r) => [r.card.name, r]));
}
const isSpellFaceMdfc = (c: DbCard) => c.layout === 'modal_dfc' && !(c.type_line || '').split('//')[0].includes('Land');

describe('A-D12 one shared MDFC cap', () => {
  it('the cap is 3 and counts land backs already picked as spells', () => {
    expect(MAX_MDFC_LANDS).toBe(3);
    const opts = { colors: ['B'], format: 'commander', targetLandCount: 36, isCommander: true };
    expect(buildOptimalLandBase({ ...opts, mdfcPicked: MAX_MDFC_LANDS }).lands.filter((l) => isSpellFaceMdfc(l.card))).toHaveLength(0);
    expect(buildOptimalLandBase(opts).lands.filter((l) => isSpellFaceMdfc(l.card)).length).toBeLessThanOrEqual(MAX_MDFC_LANDS);
  });
  it('a spell-face MDFC scores as a tapped land unless its land face pays life to enter untapped', () => {
    const m = scoreMap({ colors: ['G'], format: 'commander' });
    expect(m.get('Bala Ged Recovery // Bala Ged Sanctuary')?.untappedCredit).toBe(0);
    expect(m.get('Turntimber Symbiosis // Turntimber, Serpentine Wood')?.untappedCredit).toBe(1);
  });
});
