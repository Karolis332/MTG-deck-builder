import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { optimizeDeck } from '../../../services/build-api/optimize';

const TAM_FIXTURE = readFileSync(path.join(__dirname, 'fixtures/arena-tam-final.txt'), 'utf8');

function standard60Text(): string {
  // 36 distinct Standard-legal nonland names (no dupes — mergeDeckLines would
  // otherwise collapse repeats and undercount the total).
  const nonlands = [
    'Solemn Simulacrum', 'Negate', 'Llanowar Elves', 'Feed the Swarm', "Garruk's Uprising",
    'Phyrexian Arena', 'Roaming Throne', 'Abrade', 'Boros Charm', 'Doubling Season',
    'Impact Tremors', 'Patchwork Banner', 'Opt', 'Grand Abolisher', 'Basilisk Collar',
    'Bloom Tender', 'Inspiring Call', 'Aetherize', 'Reclamation Sage', 'Authority of the Consuls',
    'Rampaging Baloths', 'Guttersnipe', 'Gilded Lotus', 'Demand Answers', 'Enduring Vitality',
    'Snakeskin Veil', 'Expedition Map', 'Swiftfoot Boots', "An Offer You Can't Refuse",
    'Withering Torment', 'Untimely Malfunction', 'Craterhoof Behemoth', "Dawn's Truce",
    'Kutzil, Malamet Exemplar', 'Etali, Primal Storm', 'Exsanguinate',
  ];
  const lines = nonlands.map((n) => `1 ${n}`);
  lines.push('12 Forest', '12 Island');
  return `Deck\n${lines.join('\n')}`;
}

describe('optimizeDeck — fixed-size after-list (U5)', () => {
  it('never resizes a brawl deck when adds run out (Tam, no commander_card_stats rows)', () => {
    const result = optimizeDeck({ format: 'brawl', text: TAM_FIXTURE }) as {
      gate: { checks: Array<{ id: string; status: string }>; totals: { cards: number } };
      swaps: Array<{ add: string | null }>;
      cuts: unknown[];
    };
    const sizeCheck = result.gate.checks.find((c) => c.id === 'size');
    expect(sizeCheck?.status).toBe('pass');
    expect(result.gate.totals.cards).toBe(100);
    // unpaired cuts must still be reported as advice
    expect(result.cuts.length).toBeGreaterThan(0);
  });

  it('landReport counts an MDFC (Shatterskull Smashing) as one land, not two', () => {
    const result = optimizeDeck({ format: 'brawl', text: TAM_FIXTURE }) as {
      landTarget: { current: number; effective: number };
    };
    expect(result.landTarget.current).toBe(35);
    expect(result.landTarget.effective).toBe(35.4);
  });

  it('a 60-card Standard list keeps the same after-list size', () => {
    const result = optimizeDeck({ format: 'standard', text: standard60Text() }) as {
      gate: { checks: Array<{ id: string; status: string }>; totals: { cards: number } };
    };
    const sizeCheck = result.gate.checks.find((c) => c.id === 'size');
    expect(sizeCheck?.status).toBe('pass');
    expect(result.gate.totals.cards).toBe(60);
  });
});
