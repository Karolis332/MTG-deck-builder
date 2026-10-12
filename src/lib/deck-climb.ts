/**
 * Converging swap search: improve a fixed-size deck one card-for-card swap at a time until a
 * full pass finds no improving swap.
 *
 * Each pass:
 *   1. removal ranking — every kept slot is scored as a blank (null) slot; loss = how much the
 *      deck drops without that card;
 *   2. add ranking — every pool candidate is scored in the weakest slot (exact for that slot);
 *   3. pair tests — the top-K weakest slots × top-K adds, ordered by estimated delta, are
 *      evaluated exactly; improving swaps are applied (up to `batch` per pass).
 * A pass that applies nothing is the stop proof: every candidate tested in the weakest slot and
 * all K×K pairs around it tested exactly.
 *
 * // ponytail: pairs outside the top-K × top-K window are estimated, not tested. Raise `topK`
 * // for a stricter proof (cost grows with K²).
 */

export interface ClimbCard {
  name: string;
}

export interface ClimbOptions<C extends ClimbCard = ClimbCard> {
  /** Improving swaps applied per pass before re-ranking. */
  batch?: number;
  /** Size of the weakest-slot × best-add window tested exactly. */
  topK?: number;
  maxPasses?: number;
  /** Minimum gain for a swap to count as an improvement. */
  epsilon?: number;
  /** Names that may never leave the deck. */
  locked?: ReadonlySet<string>;
  /** Names that may appear more than once (basic lands). */
  repeatable?: ReadonlySet<string>;
  /**
   * Gate on whether `card` may fill `slot` in `deck` (e.g. a buy budget). Add ranking only scores
   * candidates that fit at least one of the top-K weakest slots; each pair test re-checks the
   * hook against the deck as it stands at that point in the pass (slots already swapped this
   * pass count). No hook = identical behaviour to before this option existed.
   *
   * ponytail: gates one card-for-card swap at a time — it can't block "sell this one expensive
   * card to fund two cheaper ones" because climbDeck never considers multi-card swaps.
   */
  canSwap?: (deck: readonly C[], slot: number, card: C) => boolean;
}

export interface ClimbSwap {
  out: string;
  in: string;
  before: number;
  after: number;
}

export interface StopProof {
  weakest: { name: string; loss: number }[];
  bestAdds: { name: string; scoreInWeakestSlot: number }[];
  pairsTested: number;
  candidatesTested: number;
}

export interface ClimbResult<C extends ClimbCard> {
  deck: C[];
  score: number;
  swaps: ClimbSwap[];
  passes: number;
  converged: boolean;
  evaluations: number;
  stopProof: StopProof | null;
}

/** Deck slot array; null = blank slot (used only for the removal ranking). */
export type Evaluate<C> = (deck: readonly (C | null)[]) => number;

function withSlot<C>(deck: readonly (C | null)[], i: number, card: C | null): (C | null)[] {
  const next = deck.slice();
  next[i] = card;
  return next;
}

export function climbDeck<C extends ClimbCard>(
  start: readonly C[],
  pool: readonly C[],
  evaluate: Evaluate<C>,
  opts: ClimbOptions<C> = {},
): ClimbResult<C> {
  const batch = opts.batch ?? 6;
  const topK = opts.topK ?? 12;
  const maxPasses = opts.maxPasses ?? 50;
  const epsilon = opts.epsilon ?? 0.01;
  const locked = opts.locked ?? new Set<string>();
  const repeatable = opts.repeatable ?? new Set<string>();
  const canSwap = opts.canSwap;

  let evaluations = 0;
  const score = (d: readonly (C | null)[]): number => {
    evaluations++;
    return evaluate(d);
  };

  let deck = start.slice();
  let current = score(deck);
  const swaps: ClimbSwap[] = [];

  for (let pass = 1; pass <= maxPasses; pass++) {
    // 1. removal ranking (repeatable names share one evaluation)
    const lossByName = new Map<string, number>();
    const removable: { i: number; loss: number }[] = [];
    deck.forEach((card, i) => {
      if (locked.has(card.name)) return;
      let loss = repeatable.has(card.name) ? lossByName.get(card.name) : undefined;
      if (loss === undefined) {
        loss = current - score(withSlot(deck, i, null));
        if (repeatable.has(card.name)) lossByName.set(card.name, loss);
      }
      removable.push({ i, loss });
    });
    removable.sort((a, b) => a.loss - b.loss);
    if (!removable.length) break;

    // 2. add ranking in the weakest slot
    const weakest = removable[0];
    const topKSlots = removable.slice(0, topK);
    const inDeck = new Set(deck.map((c) => c.name));
    const fitsAnyWeakestSlot = (c: C): boolean => topKSlots.some((r) => canSwap!(deck, r.i, c));
    const candidates = pool.filter((c) => (repeatable.has(c.name) || !inDeck.has(c.name)) && (!canSwap || fitsAnyWeakestSlot(c)));
    const blankScore = current - weakest.loss;
    const adds = candidates
      .map((c) => ({ card: c, gain: score(withSlot(deck, weakest.i, c)) - blankScore }))
      .sort((a, b) => b.gain - a.gain);

    // 3. exact pair tests in estimated order
    const pairs: { r: { i: number; loss: number }; a: { card: C; gain: number }; est: number }[] = [];
    for (const r of removable.slice(0, topK)) {
      for (const a of adds.slice(0, topK)) {
        if (a.card.name === deck[r.i].name) continue;
        pairs.push({ r, a, est: a.gain - r.loss });
      }
    }
    pairs.sort((x, y) => y.est - x.est);

    const usedSlots = new Set<number>();
    const usedNames = new Set<string>();
    let applied = 0;
    let pairsTested = 0;
    for (const p of pairs) {
      if (applied >= batch) break;
      if (usedSlots.has(p.r.i) || (!repeatable.has(p.a.card.name) && (usedNames.has(p.a.card.name) || deck.some((c) => c.name === p.a.card.name)))) continue;
      if (canSwap && !canSwap(deck, p.r.i, p.a.card)) continue;
      pairsTested++;
      const next = withSlot(deck, p.r.i, p.a.card) as C[];
      const s = score(next);
      if (s > current + epsilon) {
        swaps.push({ out: deck[p.r.i].name, in: p.a.card.name, before: current, after: s });
        deck = next;
        current = s;
        usedSlots.add(p.r.i);
        usedNames.add(p.a.card.name);
        applied++;
      }
    }

    if (applied === 0) {
      return {
        deck, score: current, swaps, passes: pass, converged: true, evaluations,
        stopProof: {
          weakest: removable.slice(0, topK).map((r) => ({ name: deck[r.i].name, loss: r.loss })),
          bestAdds: adds.slice(0, topK).map((a) => ({ name: a.card.name, scoreInWeakestSlot: blankScore + a.gain })),
          pairsTested,
          candidatesTested: candidates.length,
        },
      };
    }
  }
  return { deck, score: current, swaps, passes: maxPasses, converged: false, evaluations, stopProof: null };
}
