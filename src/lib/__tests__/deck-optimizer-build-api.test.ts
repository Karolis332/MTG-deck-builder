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

describe('optimizeDeck — role bands follow the detected archetype (U8a)', () => {
  it('Tam (superfriends): no walker is cut for a win-condition-over-quota reason, and the reported win_condition band is the superfriends band [8,16], not the generic brawl band', () => {
    const result = optimizeDeck({ format: 'brawl', text: TAM_FIXTURE }) as {
      health: Array<{ category: string; target: { min: number; max: number } }>;
      cuts: Array<{ name: string; reasons: string[] }>;
    };
    const winConditionHealth = result.health.find((h) => h.category === 'win_condition');
    expect(winConditionHealth?.target).toMatchObject({ min: 8, max: 16 });
    const walkerCutOnQuota = result.cuts.filter((c) =>
      /win conditions over quota/i.test(c.reasons.join(' '))
    );
    expect(walkerCutOnQuota).toEqual([]);
  });

  // U9b HIGH #2: the exemption above only reached win_condition cards through
  // ISS — a Way (classified 'draw') got cut as "Card Draw over quota (12/9)"
  // because the quota branch in scoreCard ran before the walker/support check
  // even existed. Reality Fracture's Ways are stale-legality in the repo test
  // DB (see the brief), so this asserts on quota reasons only.
  it('Tam (superfriends): no "Way of" card is cut for any over-quota reason', () => {
    const result = optimizeDeck({ format: 'brawl', text: TAM_FIXTURE }) as {
      cuts: Array<{ name: string; reasons: string[] }>;
    };
    const wayQuotaCuts = result.cuts.filter(
      (c) => /^Way of /.test(c.name) && c.reasons.some((r) => /over quota/i.test(r))
    );
    expect(wayQuotaCuts).toEqual([]);
  });

  it('a non-superfriends list (standard 60) reports the generic format band, unchanged', () => {
    const result = optimizeDeck({ format: 'standard', text: standard60Text() }) as {
      health: Array<{ category: string; target: { min: number; max: number } }>;
    };
    const winConditionHealth = result.health.find((h) => h.category === 'win_condition');
    // GENERIC_60_RATIOS.win_condition band — unchanged by the archetype override.
    expect(winConditionHealth?.target).toMatchObject({ min: 4, max: 8 });
  });
});

// U9b MEDIUM #3: two pasted lines that resolve to the same card (a DFC front
// face and its full "Front // Back" name) must merge instead of the later
// row silently overwriting the earlier one in afterLines' name-keyed Map —
// that mismatch used to throw "optimizer size invariant violated".
describe('optimizeDeck — duplicate resolved rows merge instead of throwing (U9b #3)', () => {
  const DUPLICATE_ESIKA_TEXT =
    'Commander\n1 Atraxa, Praetors\' Voice\n\nDeck\n' +
    "1 Esika, God of the Tree\n" +
    "1 Esika, God of the Tree // The Prismatic Bridge\n" +
    '1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n1 Swords to Plowshares\n';

  it('returns 200 with a too_many_copies finding for the merged card, no throw', () => {
    expect(() => optimizeDeck({ format: 'brawl', text: DUPLICATE_ESIKA_TEXT })).not.toThrow();
    const result = optimizeDeck({ format: 'brawl', text: DUPLICATE_ESIKA_TEXT }) as {
      legality: Array<{ name: string; problem: string }>;
    };
    const esikaIssue = result.legality.find(
      (i) => i.problem === 'too_many_copies' && /Esika/i.test(i.name)
    );
    expect(esikaIssue).toBeDefined();
  });
});
