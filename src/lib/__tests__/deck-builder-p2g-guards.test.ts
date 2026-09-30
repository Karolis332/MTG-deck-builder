// Unit P2-G (2026-09-30): guards, budget, partners — see
// ~/.claude/harness/runs/landbase-2026-09-30/FIX-P2-BRIEFS.md.
import { describe, it, expect } from 'vitest';
import { isBoardWipe } from '../card-classifier';
import { isBoardWipe as isBoardWipeBase } from './baseline/card-classifier-6791d3e';

const ASHLINGS_COMMAND = 'Choose two —\n'
  + '• Create a token that\'s a copy of target Elemental you control.\n'
  + '• Target player draws two cards.\n'
  + '• Ashling\'s Command deals 2 damage to each creature target player controls.\n'
  + '• Target player creates two Treasure tokens.';
const BOROS_CHARM = 'Choose one —\n• Boros Charm deals 4 damage to target player or planeswalker.\n'
  + '• Permanents you control gain indestructible until end of turn.\n• Target creature gains double strike until end of turn.';

describe('#12 strict modal guard covers every "Choose N —" header', () => {
  it('"Choose two —" is not a wipe on the strict path', () => {
    expect(isBoardWipe("Ashling's Command", ASHLINGS_COMMAND, { strict: true })).toBe(false);
    expect(isBoardWipe('Boros Charm', BOROS_CHARM, { strict: true })).toBe(false);
  });
  it('default path is byte-identical to 6791d3e', () => {
    for (const [n, t] of [["Ashling's Command", ASHLINGS_COMMAND], ['Boros Charm', BOROS_CHARM], ['Wrath of God', 'Destroy all creatures. They can\'t be regenerated.']]) {
      expect(isBoardWipe(n, t), n).toBe(isBoardWipeBase(n, t));
    }
  });
});
