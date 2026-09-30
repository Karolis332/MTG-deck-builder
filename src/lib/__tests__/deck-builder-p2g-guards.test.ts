// Unit P2-G (2026-09-30): guards, budget, partners — see
// ~/.claude/harness/runs/landbase-2026-09-30/FIX-P2-BRIEFS.md.
import { describe, it, expect } from 'vitest';
import { isBoardWipe } from '../card-classifier';
import { isBoardWipe as isBoardWipeBase } from './baseline/card-classifier-6791d3e';
import { isWipeBackfillCandidate } from '../deck-builder-ai';

const STRICT = { strict: true } as const;
const WRATH = { name: 'Wrath of God', oracle_text: "Destroy all creatures. They can't be regenerated." };
const TURTLES = { name: 'Turtles in Time', oracle_text: "Return all creatures to their owners' hands. Each player may shuffle their hand and graveyard into their library, then each player who does draws seven cards.\nExile Turtles in Time." };

describe('#10 wipe backfill has a score floor', () => {
  it('rejects a pool card below the quality floor, accepts one above it or never scored', () => {
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, score: 21, scoreFloor: 60 })).toBe(false);
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, score: 80, scoreFloor: 60 })).toBe(true);
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, score: undefined, scoreFloor: 60 })).toBe(true);
  });
  it('Turtles in Time at pool score 21 stays benched; a non-wipe never qualifies', () => {
    expect(isWipeBackfillCandidate(TURTLES, { classifyOpts: STRICT, score: 21, scoreFloor: 60 })).toBe(false);
    expect(isWipeBackfillCandidate({ name: 'Doom Blade', oracle_text: 'Destroy target nonblack creature.' }, { classifyOpts: STRICT, score: 200, scoreFloor: 60 })).toBe(false);
  });
});

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
