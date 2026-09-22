/**
 * Deck Score v1.4 stage 3 — adversarial composition (§10.4, §10.9 items 4/5/7).
 *
 * Two repairs land here and are pinned below:
 *
 *  1. The SCORER owns its size rule. `deck-validation` reports an undersized
 *     commander library as a warning (the editor shows in-progress lists), so a
 *     direct deletion probe used to stay inside the rank domain. An undersized
 *     submission is now a structural failure exactly like an oversized one:
 *     no rank, absolute total 0-19, components kept (§10.9 item 7 #8).
 *  2. The density components (M, C, A) divide by `max(N0, N)` — S's D (§10.2) —
 *     instead of the submitted copy count. Deleting a proved-zero-use copy was
 *     raising the land target, the turn-2 play density and the velocity access
 *     of every remaining card. Interaction never divided by N.
 *
 * Every number here was measured by a named command on the real strides:
 * `deck-score-probes.ts --profile <p>`, `bands real --profile <p>`,
 * `bands reference --write`, `deck-score-report.ts`. Nothing here writes the
 * repo card DB, the catalogue shards or a frozen file.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, SCORE_VERSION } from '../deck-score';
import { scoreDeckSafely, type ScoreCardInput } from '../deck-score-input';
import { computeMana, computeCurve, type DeckEntry } from '../deck-score-mana';
import { computeAdvantage, computeInteraction } from '../deck-score-interaction';
import { deriveCardFeature } from '../deck-score-features';
import { normsFor } from '../deck-score-norms';
import { referenceFor } from '../deck-score-reference';
import { readSample, strideOrder, cardsByName, loadStudyControls } from '../../../scripts/deck-score-piles';
import { isOffPlanTyped, without, permuteMetadata, clonePrinting } from '../../../scripts/deck-score-probes';

vi.setConfig({ testTimeout: 180_000 });

interface StrideDeck { id: string; main: ScoreCardInput[]; commander: DbCard[] }

/** Fully resolved stride lists: every name found, so a size change in a probe
 * is the probe's doing and never a dropped line. */
function strideDecks(profile: 'commander' | 'brawl', n: number): StrideDeck[] {
  const byName = cardsByName();
  const sample = readSample(profile);
  const out: StrideDeck[] = [];
  for (const i of strideOrder('training', sample)) {
    if (out.length >= n) break;
    const deck = sample[i];
    if (!deck) continue;
    const main: ScoreCardInput[] = [];
    const commander: DbCard[] = [];
    const commanderName = deck.commander.toLowerCase();
    let took = false;
    let missing = 0;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing += line.quantity; continue; }
      if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    if (missing > 0 || commander.length !== 1) continue;
    const size = main.reduce((s, e) => s + e.quantity, 0);
    if (size !== (profile === 'commander' ? 99 : 99)) continue;
    out.push({ id: deck.id, main, commander });
  }
  return out;
}

const rulesFailed = (payload: NonNullable<ReturnType<typeof scoreDeckSafely>>): boolean =>
  payload.gates.some((g) => g.kind === 'rules' && g.status === 'fail');

const scored = (deck: StrideDeck, main: ScoreCardInput[], unresolved: { name: string; quantity: number; board: string }[] = []) =>
  scoreDeckSafely({ format: 'commander', main, commander: deck.commander, unresolved });

const COMMANDER_LISTS = strideDecks('commander', 25);

// ── 1. the structural size rule (§10.9 item 7 #8) ─────────────────────────

describe('§10.9 item 7 #8 — the scorer owns its library-size rule', () => {
  it('a full 99-card commander list passes the size check and carries a rank', () => {
    const deck = COMMANDER_LISTS[0];
    const payload = scored(deck, deck.main);
    expect(payload).not.toBeNull();
    expect(rulesFailed(payload!)).toBe(false);
    expect(payload!.rank).not.toBeNull();
  });

  it('an undersized commander list is a STRUCTURAL FAILURE: no rank, total 0-19', () => {
    const deck = COMMANDER_LISTS[0];
    const short = without(deck.main, deck.main.slice(0, 3), 3)!;
    const payload = scored(deck, short);
    expect(payload).not.toBeNull();
    expect(rulesFailed(payload!)).toBe(true);
    expect(payload!.absoluteTotal).toBeLessThanOrEqual(19);
    expect(payload!.rank).toBeNull();
    // components are kept, not blanked
    expect(payload!.components.length).toBeGreaterThan(0);
  });

  it('reserved unresolved slots count toward the size: 96 resolved + 3 unknown is legal', () => {
    const deck = COMMANDER_LISTS[0];
    const short = without(deck.main, deck.main.slice(0, 3), 3)!;
    const payload = scored(deck, short, [{ name: 'Unreadable Card', quantity: 3, board: 'main' }]);
    expect(payload).not.toBeNull();
    expect(rulesFailed(payload!)).toBe(false);
    expect(payload!.rank).not.toBeNull();
  });

  it('every one of the 25 stride lists fails structurally at k = 1, 5 and 10 deletions', () => {
    for (const deck of COMMANDER_LISTS) {
      for (const k of [1, 5, 10]) {
        const short = without(deck.main, deck.main.slice(0, 12), k);
        if (!short) continue;
        const payload = scored(deck, short)!;
        expect(rulesFailed(payload)).toBe(true);
        expect(payload.rank).toBeNull();
        expect(payload.absoluteTotal).toBeLessThanOrEqual(19);
      }
    }
  });

  it('an OVERSIZED list still fails (the pre-existing rule is untouched)', () => {
    const deck = COMMANDER_LISTS[0];
    const extra = COMMANDER_LISTS[1].main.find((e) => !deck.main.some((m) => m.card.id === e.card.id))!;
    const payload = scored(deck, [...deck.main, { card: extra.card, quantity: 1 }])!;
    expect(rulesFailed(payload)).toBe(true);
    expect(payload.rank).toBeNull();
  });

  it('a Brawl list short of 99 fails the same way', () => {
    const deck = strideDecks('brawl', 1)[0];
    const short = without(deck.main, deck.main.slice(0, 2), 2)!;
    const payload = scoreDeckSafely({ format: 'brawl', main: short, commander: deck.commander })!;
    expect(rulesFailed(payload)).toBe(true);
    expect(payload.rank).toBeNull();
  });
});

// ── 2. the density denominator is max(N0, N) ──────────────────────────────

describe('§10.2 / §10.4 item 2(c) — M, C and A divide by max(N0, N)', () => {
  const deck = COMMANDER_LISTS[0];
  const short = without(deck.main, deck.main.slice(0, 4), 4)!;
  const entries: DeckEntry[] = short.map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }));
  const commanderFeatures = deck.commander.map((c) => deriveCardFeature(c));
  const norms = normsFor('commander');
  const run = (unresolved: number) => scoreDeck({
    format: 'commander', main: short, commander: deck.commander, sideboard: [],
    unresolved: unresolved > 0 ? [{ name: 'Unreadable Card', quantity: unresolved, board: 'main' }] : [],
    cardDataVersion: 'test', corpus: null,
  });
  // 95 submitted copies (D = max(99, 95) = 99) against the same 95 copies
  // padded to a legal 99 with blank slots (N = 99). Same denominator, so every
  // density must be identical; before the repair the first one divided by 95.
  const undersized = run(0);
  const padded = run(4);
  const at = (r: typeof undersized, key: string) => r.components.find((c) => c.key === key)!.score;

  // A stays identical: it reads absolute counts over the same D.
  it('advantage is identical at 95 submitted copies and at 95 + 4 blank slots', () => {
    expect(at(undersized, 'advantage')).toBe(at(padded, 'advantage'));
  });

  // RE-PINNED by v1.4 stage 3b (§10.9 item 5). M and C also read MEAN/SHAPE
  // estimators (Karsten's avgMv, the colour-adequacy mean, the curve
  // histogram), and those now impute each blank slot pessimistically instead of
  // ignoring it, so padding with unknowns LOWERS them: mana 87.5 -> 79.2,
  // curve 81.6 -> 79.3. The denominator equality itself is unchanged.
  for (const key of ['mana', 'curve'] as const) {
    it(`${key} is never raised by padding 95 submitted copies with 4 blank slots`, () => {
      expect(at(padded, key)).toBeLessThan(at(undersized, key));
    });
  }

  it('the denominator has teeth: each density really moves when N moves', () => {
    const cmc = commanderFeatures.reduce((m, f) => Math.max(m, f.c), 0);
    expect(computeMana('commander', norms, 99, entries, commanderFeatures).score)
      .not.toBeCloseTo(computeMana('commander', norms, 95, entries, commanderFeatures).score, 6);
    // C's and A's access terms are clipped against their targets, so on this
    // list they are saturated at both sizes; M's land target is not, and it is
    // the one that moved +5.5 on the measured violator (list 380152808).
    expect(computeCurve('commander', norms, 'midrange', 99, entries, cmc).score)
      .toBeLessThanOrEqual(computeCurve('commander', norms, 'midrange', 80, entries, cmc).score + 1e-9);
    // A's velocity access is clipped against its target, so this list's A is
    // saturated at both sizes; the denominator is still N (`Hf(format, N, …)`)
    // and the mana/curve moves above are what this assertion has to prove.
    expect(computeAdvantage('commander', norms, 'midrange', 99, entries).score)
      .toBeLessThanOrEqual(computeAdvantage('commander', norms, 'midrange', 40, entries).score + 1e-9);
  });

  it('interaction never divided by N at all (E/E* are absolute counts)', () => {
    const sameEntries = deck.main.map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }));
    expect(computeInteractionScore(sameEntries, 99)).toBe(computeInteractionScore(sameEntries, 60));
  });
});

function computeInteractionScore(entries: DeckEntry[], n: number): number {
  return computeInteraction('commander', normsFor('commander'), 'midrange', n, entries).score;
}

// ── 3. exact invariances (§10.9 item 5 rows 3 and 4) ──────────────────────

describe('§10.9 item 5 — representation and metadata are EXACTLY invariant', () => {
  const sample = COMMANDER_LISTS.slice(0, 10);

  const expectIdentical = (deck: StrideDeck, edited: ScoreCardInput[]): void => {
    const a = scored(deck, deck.main)!;
    const b = scored(deck, edited)!;
    expect(b.absoluteTotal).toBe(a.absoluteTotal);
    expect(b.score).toBe(a.score);
    expect(b.rank).toBe(a.rank);
    expect(b.rankDisplay).toBe(a.rankDisplay);
    for (const c of a.components) {
      expect(b.components.find((x) => x.key === c.key)!.score).toBe(c.score);
    }
  };

  it('price, popularity, rarity, set, printing, art and input order move nothing', () => {
    for (const deck of sample) expectIdentical(deck, permuteMetadata(deck.main));
  });

  it('input order alone moves nothing', () => {
    for (const deck of sample) expectIdentical(deck, [...deck.main].reverse());
  });

  it('quantity representation (n entries of 1 vs one entry of n) moves nothing', () => {
    for (const deck of sample) {
      const split: ScoreCardInput[] = [];
      for (const e of deck.main) {
        for (let i = 0; i < e.quantity; i++) split.push({ card: e.card, quantity: 1 });
      }
      expectIdentical(deck, split);
    }
  });

  it('a different printing of the same basic land moves nothing', () => {
    const basics = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);
    let checked = 0;
    for (const deck of sample) {
      if (!deck.main.some((e) => basics.has(e.card.name.toLowerCase()))) continue;
      const edited: ScoreCardInput[] = [];
      let left = 5;
      for (const e of deck.main) {
        if (left > 0 && basics.has(e.card.name.toLowerCase())) {
          const cut = Math.min(left, e.quantity);
          if (e.quantity - cut > 0) edited.push({ card: e.card, quantity: e.quantity - cut });
          for (let i = 0; i < cut; i++) edited.push({ card: clonePrinting(e.card, left - i), quantity: 1 });
          left -= cut;
          continue;
        }
        edited.push(e);
      }
      expectIdentical(deck, edited);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

// ── 4. no-benefit edits at fixed size (§10.4 / §10.9 item 5 row 1) ────────

describe('§10.4 — no-benefit edits never raise S, and never move the rank by more than 1', () => {
  it('replacing proved-zero-use typed copies with unknown slots: dS <= 1e-6, drank <= 1', () => {
    let graded = 0;
    for (const deck of COMMANDER_LISTS) {
      const off = deck.main.filter((e) => isOffPlanTyped(deriveCardFeature(e.card), 'commander'));
      for (const k of [1, 5, 10]) {
        const edited = without(deck.main, off, k);
        if (!edited) continue;
        const a = scored(deck, deck.main)!;
        const b = scored(deck, edited, [{ name: 'Unreadable Card', quantity: k, board: 'main' }])!;
        const sA = a.components.find((c) => c.key === 'synergy')!.score;
        const sB = b.components.find((c) => c.key === 'synergy')!.score;
        expect(sB - sA).toBeLessThanOrEqual(1e-6);
        if (a.rank !== null && b.rank !== null && !rulesFailed(a) && !rulesFailed(b)) {
          expect(b.rank - a.rank).toBeLessThanOrEqual(1);
        }
        graded++;
      }
    }
    expect(graded).toBeGreaterThan(10);
  });

  it('adding zero-credit unknown slots never raises S (k = 1, 5, 10)', () => {
    for (const deck of COMMANDER_LISTS.slice(0, 10)) {
      const a = scored(deck, deck.main)!;
      const sA = a.components.find((c) => c.key === 'synergy')!.score;
      for (const k of [1, 5, 10]) {
        const b = scored(deck, deck.main, [{ name: 'Unreadable Card', quantity: k, board: 'main' }])!;
        expect(b.components.find((c) => c.key === 'synergy')!.score - sA).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('breaking an on-plan proof never gains: S and W are non-increasing', () => {
    for (const deck of COMMANDER_LISTS.slice(0, 10)) {
      const onPlan = deck.main.filter((e) => {
        const f = deriveCardFeature(e.card);
        return !f.isLand && f.covered && !isOffPlanTyped(f, 'commander');
      });
      if (onPlan.length < 3) continue;
      const a = scored(deck, deck.main)!;
      // fixed size: the proof's card becomes an unknown slot, so only the proof
      // is removed and no density denominator moves.
      const edited = without(deck.main, onPlan.slice(0, 3), 3)!;
      const b = scored(deck, edited, [{ name: 'Unreadable Card', quantity: 3, board: 'main' }])!;
      const get = (p: typeof a, key: string) => p.components.find((c) => c.key === key)!.score;
      expect(get(b, 'synergy')).toBeLessThanOrEqual(get(a, 'synergy') + 1e-6);
      expect(get(b, 'win')).toBeLessThanOrEqual(get(a, 'win') + 1e-6);
    }
  });
});

// ── 5. frozen state after the repair ──────────────────────────────────────

describe('stage 3 — version, references and the retained top tail', () => {
  it('bumps SCORE_VERSION for the evaluator change', () => {
    expect(SCORE_VERSION).toBe('1.4.0-rc2');
  });

  it('pins the re-frozen commander/brawl references (13 scorer-rule rows left)', () => {
    const commander = referenceFor('commander')!;
    const brawl = referenceFor('brawl')!;
    expect(commander.rows).toBe(1429);
    expect(commander.families).toBe(182);
    expect(commander.familyFrame).toBe('commander-name');
    expect(brawl.rows).toBe(783);
    expect(brawl.families).toBe(179);
    expect(commander.scoreVersion).toBe(SCORE_VERSION);
    expect(brawl.scoreVersion).toBe(SCORE_VERSION);
  });

  it('admits Standard on the DECLARED tournament-event frame (42 families >= 30)', () => {
    const standard = referenceFor('standard')!;
    expect(standard.familyFrame).toBe('tournament-event');
    expect(standard.families).toBe(42);
    expect(standard.rows).toBe(270);
    expect(standard.knots.reduce((s, k) => s + k.mass, 0)).toBeCloseTo(1, 12);
  });

  it('keeps the retained 200-list ctrl93 top tail inside <= 20/200 in both profiles', () => {
    // `ctrl93` needs no coverage distribution, so it reproduces `bands real`
    // exactly from this entry point; `ctrlmatch` is graded there, where the
    // real stride's coverage vector is available.
    const counts: Record<string, number> = {};
    for (const profile of ['commander', 'brawl'] as const) {
      const piles = loadStudyControls(profile, 'ctrl93', 200, []);
      let top = 0;
      for (const pile of piles) {
        const payload = scoreDeckSafely({
          format: pile.input.format, main: [...pile.input.main], commander: [...pile.input.commander],
        });
        if (payload && payload.rank !== null && payload.rank >= 95) top++;
      }
      counts[profile] = top;
      expect(top).toBeLessThanOrEqual(20);
    }
    // measured by `bands real --piles 1000` at this version
    expect(counts.commander).toBe(0);
    expect(counts.brawl).toBe(5);
  });
});
