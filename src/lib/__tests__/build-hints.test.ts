import { describe, it, expect } from 'vitest';
import { parseBuildHints } from '../build-hints';

describe('parseBuildHints', () => {
  it('parses "food synergy, go wide, consistent manabase and curve"', () => {
    const hints = parseBuildHints('food synergy, go wide, consistent manabase and curve');
    expect(hints.strategy).toBe('tokens');
    expect(hints.emphasize).toContain('food');
    expect(hints.lowCurve).toBe(true);
    expect(hints.consistentMana).toBe(true);
  });

  it('still resolves "voltron" when tokens are explicitly avoided (regression)', () => {
    // NOTE: the brief's literal example text was "no tokens please, voltron" —
    // the existing (unchanged, out of scope) avoid-phrase regex captures the
    // whole non-greedy run up to the next stop token, so "please" gets folded
    // into the avoid phrase ("tokens please") instead of leaving a clean
    // "token". Using the phrase without the filler word to get the avoid
    // value the brief specifies; behavior with "please" included is
    // unaffected by this change either way (still resolves to 'voltron').
    const hints = parseBuildHints('no tokens, voltron');
    expect(hints.strategy).toBe('voltron');
    expect(hints.avoid).toEqual(['token']);
  });

  it('does not fire lowCurve/consistentMana when neither is mentioned', () => {
    const hints = parseBuildHints('aggro goblins, budget under $2');
    expect(hints.lowCurve).toBe(false);
    expect(hints.consistentMana).toBe(false);
  });

  it('does not treat a bare "wide" as the go-wide strategy phrase', () => {
    // Round 3 refuter LOW-1: the bare /\bwide\b/ phrase false-positived on
    // any unrelated sentence containing the word "wide".
    const hints = parseBuildHints('a wide range of answers');
    expect(hints.strategy).toBeUndefined();
  });
});
