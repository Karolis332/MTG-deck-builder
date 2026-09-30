// Unit C (2026-09-30): the DEFAULT path of classifyCard / isBoardWipe must
// return exactly what 6791d3e returned — Deck Score (deck-score-features.ts)
// calls them with no opts. `baseline/card-classifier-6791d3e.ts` is
// `git show 6791d3e:src/lib/card-classifier.ts` verbatim (only the relative
// deck-templates import adjusted). The fixture is 322 real cards from the
// live card DB (the audit's suspicious role fills + the top EDHREC nonlands +
// the top legendary creatures), so analyzeCommander's default path is pinned
// over the same commanders against the b82d099 baseline too.
import { describe, it, expect } from 'vitest';
import { classifyCard as classifyNow, isBoardWipe as isBoardWipeNow } from '../card-classifier';
import { classifyCard as classifyBase, isBoardWipe as isBoardWipeBase } from './baseline/card-classifier-6791d3e';
import { analyzeCommander as analyzeNow } from '../commander-synergy';
import { analyzeCommander as analyzeBase } from './baseline/commander-synergy-b82d099';
import FIXTURE from './fixtures/classify-pin-cards.json';

interface Row { name: string; oracle_text: string; type_line: string; cmc: number; mana_cost: string; color_identity: string }
const CARDS = FIXTURE as Row[];
const COMMANDER_ORACLE = 'Whenever another nontoken creature you control dies, you get an experience counter.';

describe('classifyCard / isBoardWipe — default-path identity vs 6791d3e', () => {
  it(`fixture holds ~300 real cards (${CARDS.length})`, () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(300);
  });
  for (const opts of [undefined, { superfriends: true }] as const) {
    it(`classifyCard(${JSON.stringify(opts)}) equals 6791d3e on every fixture card`, () => {
      for (const c of CARDS) {
        expect(classifyNow(c.name, c.oracle_text, c.type_line, c.cmc, COMMANDER_ORACLE, opts), c.name)
          .toEqual(classifyBase(c.name, c.oracle_text, c.type_line, c.cmc, COMMANDER_ORACLE, opts));
        expect(classifyNow(c.name, c.oracle_text, c.type_line, c.cmc, undefined, opts), c.name)
          .toEqual(classifyBase(c.name, c.oracle_text, c.type_line, c.cmc, undefined, opts));
      }
    });
  }
  it('isBoardWipe() equals 6791d3e on every fixture card', () => {
    for (const c of CARDS) {
      expect(isBoardWipeNow(c.name, c.oracle_text), c.name).toBe(isBoardWipeBase(c.name, c.oracle_text));
    }
  });
});

describe('analyzeCommander — default-path identity vs b82d099 over the fixture', () => {
  it('no opts', () => {
    for (const c of CARDS) {
      const ci = JSON.parse(c.color_identity || '[]') as string[];
      expect(analyzeNow(c.oracle_text, c.type_line, ci, c.mana_cost), c.name)
        .toEqual(analyzeBase(c.oracle_text, c.type_line, ci, c.mana_cost));
    }
  });
});
