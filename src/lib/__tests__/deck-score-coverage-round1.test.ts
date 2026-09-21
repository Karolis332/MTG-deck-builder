/**
 * Deck Score — typed-effect coverage round 1 (2026-09-21).
 *
 * The generator had never been run over the two REAL corpus samples: it typed
 * a curated universe of 4,467 cards, so a real Commander list was ~33% typed
 * and S graded a catalogue hole rather than a deck. Round 1 (a) extended the
 * generator's universe to every non-land card the corpora play, (b) added 91
 * atoms for the largest remaining untyped shapes, each firing on at least
 * three distinct corpus cards, and (c) RE-MEASURED every constant the
 * catalogue feeds, because a floor cut from a 33%-typed draw pool does not
 * describe a 75%-typed one.
 *
 * Everything pinned here is a measurement, never a value chosen to keep an
 * anchor in band (§4). Where the re-measurement made the scorer worse, the
 * number is pinned anyway and named as the defect it is.
 *
 * Nothing here writes the repo card DB or the catalogue shards: the tests read
 * the sample CSVs, the `cards` table and the committed shards.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ROUND1_ATOM_BATCHES, stripReminders, selfName, generateEntry,
  type GeneratableCard,
} from '../deck-score-catalog/generate';
import { catalogEntry, CATALOG_SIZE } from '../deck-score-catalog';
import {
  Q_BASELINE_CLOSING, Q_BASELINE_CLOSING_BRAWL, Q_BASELINE_JOINT_BRAWL,
  Q_BASELINE_JOINT_COMMANDER, Q_SATURATION, Q_SATURATION_BRAWL,
} from '../deck-score-norms';
import { deriveCardFeature } from '../deck-score-features';
import { scoreDeckSafely } from '../deck-score-input';
import { readSample, strideOrder, cardsByName, type SampleProfile } from '../../../scripts/deck-score-piles';
import type { DbCard } from '../types';

// Coverage round 1 tripled the catalogue shard (4,467 -> 14,909 entries), so
// every pile-building and catalogue-walking test in this file got ~3x slower
// and several landed within noise of vitest's 15 s default. Raised per file
// rather than per test: the work is corpus-sized, not hung.
vi.setConfig({ testTimeout: 120_000 });

// ── shared corpus fixtures ────────────────────────────────────────────────

/** Every DISTINCT non-land card the two corpus samples play, in the exact
 * normalised form the generator scans (reminder text stripped, the card's own
 * name replaced by `this permanent`). This is the population every atom's
 * fires-on count is measured against. */
function corpusTexts(): { name: string; text: string }[] {
  const byName = cardsByName();
  const out = new Map<string, DbCard>();
  for (const profile of ['commander', 'brawl'] as const) {
    for (const deck of readSample(profile)) {
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card || /\bLand\b/.test(card.type_line || '')) continue;
        if (!out.has(card.name)) out.set(card.name, card);
      }
    }
  }
  return [...out.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ name: c.name, text: selfName(stripReminders(c.oracle_text ?? ''), c as GeneratableCard) }));
}

const ATOMS = ROUND1_ATOM_BATCHES.flatMap((b) => b.atoms.map((a) => ({ atom: a, label: b.label })));

let cachedTexts: { name: string; text: string }[] | null = null;
const texts = (): { name: string; text: string }[] => (cachedTexts ??= corpusTexts());

/** First corpus sentence each atom claims, in atom order. */
function positives(): { i: number; card: string; sentence: string }[] {
  const out: { i: number; card: string; sentence: string }[] = [];
  ATOMS.forEach((entry, i) => {
    for (const t of texts()) {
      entry.atom.re.lastIndex = 0;
      const m = entry.atom.re.exec(t.text);
      if (!m || !m[0]) continue;
      out.push({ i, card: t.name, sentence: m[0].replace(/\s+/g, ' ') });
      break;
    }
  });
  return out;
}

const pct = (sorted: readonly number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))];

// ── 1. what the corpus generator bought ───────────────────────────────────

/** `MTG_DB_DIR=... npx tsx scripts/deck-score-coverage-corpus.ts`, both corpus
 * samples, copy-weighted non-land typed coverage per list. Left is HEAD before
 * round 1, right is after. The suites below re-measure a 200-list prefix of
 * each profile's training stride and check it against these. */
const CORPUS_COVERAGE = {
  commander: { lists: 2777, before: { p50: 0.333, over80: 0.003 }, after: { p50: 0.757, over80: 0.323 } },
  brawl: { lists: 1746, before: { p50: 0.373, over80: 0.005 }, after: { p50: 0.750, over80: 0.272 } },
};

/** The same statistic over the 200-list prefix the tests can afford to run
 * (the full pass is 4 minutes). A prefix of a round-robin stride is
 * commander-balanced, so it tracks the full corpus within ~3 points. */
// v1.4 stage 1b added three curated entries (`Protean Hulk`, `Animate Dead`,
// `Necromancy`) for the reanimation and fetched-package combo routes. All three
// are common Commander cards, so the Commander >= 80% share moved .295 -> .31.
const PREFIX_COVERAGE: Record<SampleProfile, { p50: number; over80: number }> = {
  // v1.4 stage 2 re-cut the Commander stride (the Kuja block left it), so
  // the 200-list prefix is a different 200 lists: p50 unchanged, share .315.
  commander: { p50: 0.754, over80: 0.315 },
  brawl: { p50: 0.741, over80: 0.250 },
};

function prefixStats(profile: SampleProfile, limit = 200): { coverage: number[]; S: number[]; totals: number[] } {
  const byName = cachedByName ??= cardsByName();
  const sample = readSample(profile);
  const coverage: number[] = [];
  const S: number[] = [];
  const totals: number[] = [];
  for (const i of strideOrder('training', sample).slice(0, limit)) {
    const deck = sample[i];
    const main: { card: DbCard; quantity: number }[] = [];
    const commander: DbCard[] = [];
    const commanderName = deck.commander.toLowerCase();
    let missing = 0;
    let took = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing++; continue; }
      if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    if (main.length === 0 || missing > deck.cards.length * 0.1) continue;
    const payload = scoreDeckSafely({ format: profile, main, commander });
    if (!payload) continue;
    const nonLand = main
      .map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }))
      .filter((e) => !e.feature.isLand);
    const F = nonLand.reduce((a, e) => a + e.quantity, 0);
    coverage.push(F > 0 ? nonLand.filter((e) => e.feature.covered).reduce((a, e) => a + e.quantity, 0) / F : 1);
    S.push(payload.components.find((c) => c.key === 'synergy')?.score ?? 0);
    totals.push(payload.score);
  }
  coverage.sort((a, b) => a - b);
  S.sort((a, b) => a - b);
  totals.sort((a, b) => a - b);
  return { coverage, S, totals };
}

let cachedByName: Map<string, DbCard> | null = null;

describe('coverage round 1 — real-list typed coverage', () => {
  it('pins the Commander corpus measurement and reproduces it on a prefix', () => {
    const frozen = CORPUS_COVERAGE.commander;
    expect(frozen.lists).toBe(2777);
    // The sizing report's HEAD number; the acceptance target was p50 >= .70.
    expect(frozen.before.p50).toBeLessThan(0.40);
    expect(frozen.after.p50).toBeGreaterThanOrEqual(0.70);
    // MISSED, REPORTED: the >= 80% share target was 35%.
    expect(frozen.after.over80).toBeLessThan(0.35);

    const { coverage } = prefixStats('commander');
    expect(coverage.length).toBe(200);
    expect(pct(coverage, 50)).toBeCloseTo(PREFIX_COVERAGE.commander.p50, 2);
    expect(coverage.filter((x) => x >= 0.8).length / coverage.length)
      .toBeCloseTo(PREFIX_COVERAGE.commander.over80, 2);
    expect(pct(coverage, 50)).toBeCloseTo(frozen.after.p50, 1);
  }, 120_000);

  it('pins the Brawl corpus measurement and reproduces it on a prefix', () => {
    const frozen = CORPUS_COVERAGE.brawl;
    expect(frozen.lists).toBe(1746);
    expect(frozen.after.p50).toBeGreaterThanOrEqual(0.75);
    // MISSED, REPORTED: the >= 80% share target was 50%.
    expect(frozen.after.over80).toBeLessThan(0.50);

    const { coverage } = prefixStats('brawl');
    expect(coverage.length).toBe(200);
    expect(pct(coverage, 50)).toBeCloseTo(PREFIX_COVERAGE.brawl.p50, 2);
    expect(coverage.filter((x) => x >= 0.8).length / coverage.length)
      .toBeCloseTo(PREFIX_COVERAGE.brawl.over80, 2);
  }, 120_000);

  it('closes the round-1 S = 0 MISS: the floor that caused it is retired', () => {
    // THE HEADLINE ROUND-1 FAILURE WAS .83 of Commander and .925 of Brawl
    // real lists at S = 0, against a 30% target. The cause was the fitted
    // floor `b` and its .017-wide window, not the recipes: v1.4 §10.2 sets
    // `b_S = 0` and divides by library SLOTS, so a real list now reads the
    // useful mass it holds. Zero share 0/200 on both profiles, medians off
    // the 20 floor. The whole-cohort numbers are in `bands real`.
    const cmd = prefixStats('commander');
    const brawl = prefixStats('brawl');
    const zeroShare = (v: number[]): number => v.filter((x) => x <= 0.05).length / v.length;
    expect(zeroShare(cmd.S)).toBe(0);
    expect(zeroShare(brawl.S)).toBe(0);
    expect(pct(cmd.S, 50)).toBeCloseTo(83.7, 1);
    expect(pct(brawl.S, 50)).toBeCloseTo(87.1, 1);
    expect(pct(cmd.totals, 50)).toBe(54);
    expect(pct(brawl.totals, 50)).toBe(76);
  }, 120_000);
});

// ── 2. the atoms ──────────────────────────────────────────────────────────

describe('coverage round 1 — atom floor and false positives', () => {
  it('keeps every round-1 atom above the three-corpus-card floor', () => {
    // An atom that fires on one or two cards is a curated entry wearing a
    // regex. Five of the 96 written this round were deleted for exactly that
    // (`scripts/deck-score-atoms.ts` reports them as BELOW-FLOOR); `Bloom
    // Tender`'s colour-counting mana was one of them.
    expect(ATOMS.length).toBe(91);
    const below: string[] = [];
    for (const [i, entry] of ATOMS.entries()) {
      let hits = 0;
      for (const t of texts()) {
        entry.atom.re.lastIndex = 0;
        if (entry.atom.re.test(t.text)) hits += 1;
        if (hits >= 3) break;
      }
      if (hits < 3) below.push(`#${i} ${entry.label} ${String(entry.atom.re).slice(0, 60)}`);
    }
    expect(below).toEqual([]);
  }, 180_000);

  it('gives every atom a POSITIVE: a real corpus sentence it claims', () => {
    const pos = positives();
    expect(pos.length).toBe(ATOMS.length);
    for (const p of pos) {
      expect(p.sentence.length, `#${p.i} ${p.card}`).toBeGreaterThan(0);
      ATOMS[p.i].atom.re.lastIndex = 0;
      expect(ATOMS[p.i].atom.re.test(p.sentence), `#${p.i} ${p.card}`).toBe(true);
    }
  }, 180_000);

  it('gives every atom 90 NEGATIVES: the other atoms’ sentences, bar 12 known overlaps', () => {
    // The false-positive check the brief asks for, run as a matrix instead of
    // by hand: 91 x 90 = 8,190 pairs, of which exactly 12 cross-match. Each
    // survivor is a documented overlap between a broad rider and a narrower
    // effect that claims the same clause — harmless, because `scanSentence`
    // resolves overlaps effect-first and then longest-first, so the narrower
    // effect always wins the span. A NEW pair appearing here means an atom was
    // widened into another atom's territory and must be re-checked by hand.
    const ALLOWED = new Set([
      '35<-80', '40<-79', '47<-60', '47<-82', '51<-26', '67<-2',
      '79<-40', '79<-68', '80<-35', '82<-60', '85<-1', '85<-31',
    ]);
    const pos = positives();
    const found: string[] = [];
    ATOMS.forEach((entry, i) => {
      for (const p of pos) {
        if (p.i === i) continue;
        entry.atom.re.lastIndex = 0;
        if (entry.atom.re.test(p.sentence)) found.push(`${i}<-${p.i}`);
      }
    });
    expect(found.filter((k) => !ALLOWED.has(k))).toEqual([]);
    expect(new Set(found)).toEqual(ALLOWED);
  }, 180_000);

  it('routes a negative pump to `answer`, not to a zero-power threat', () => {
    // FALSE POSITIVE FOUND IN STEP 2 AND FIXED. The pump atom matched
    // `gets -3/-3` and typed it as a threat with power 0, so every edict and
    // shrink effect in the corpus read as a creature buff.
    const shrink = entry('Shrink Guard', 'Instant', 'Target creature gets -3/-3 until end of turn.');
    expect(shrink.knowledge).toBe('known');
    expect(shrink.effects.map((e) => e.family)).toContain('answer');
    expect(shrink.effects.map((e) => e.family)).not.toContain('closing');
    // The positive pump is untouched and still reads as a closing effect.
    const pump = entry('Pump Guard', 'Instant', 'Target creature gets +3/+3 until end of turn.');
    expect(pump.effects.map((e) => e.family)).toContain('closing');
  });

  it('types a keyword-only line and preserves loyalty and cleave brackets', () => {
    // Three parser fixes from step 2, each with the shape that broke it.
    // `Equip {2}` on its own line was glued to the prose line above it, so the
    // whole card stayed `partial`.
    expect(entry('Equip Guard', 'Artifact — Equipment', 'Equipped creature gets +2/+2.\nEquip {2}').knowledge).toBe('known');
    // `[...]` is cleave/alternate-mode text and is stripped, but `[+1]` is a
    // loyalty cost and must survive — a negative lookahead separates them.
    const walker = entry('Loyalty Guard', 'Legendary Planeswalker — Guard', '[+1]: Draw a card.\n[-3]: Destroy target creature.');
    expect(walker.knowledge).toBe('known');
    expect(walker.effects.map((e) => e.family).sort()).toEqual(['advantage', 'answer']);
    expect(entry('Cleave Guard', 'Instant', 'Cleave {3}{U}\nDestroy target creature [and target artifact].').knowledge).toBe('known');
  });

  it('leaves Chaos Warp `known` WITHOUT answer credit, and says so', () => {
    // An UNDER-statement on purpose. The two riders that type it consume the
    // shuffle and the reveal as text; the removal verb lives in another clause
    // and no shape for it fires on more than one corpus card. Typing it would
    // have meant a hand-written entry, which the >= 3 floor forbids.
    const warp = entry('Chaos Warp', 'Instant',
      "The owner of target permanent shuffles it into their library, then reveals the top card of their library. "
      + "If it's a permanent card, they put it onto the battlefield.");
    expect(warp.knowledge).toBe('known');
    expect(warp.effects.map((e) => e.family)).not.toContain('answer');
  });
});

function entry(name: string, type_line: string, oracle_text: string) {
  return generateEntry({ name, mana_cost: '{1}{B}', cmc: 2, type_line, oracle_text });
}

// ── 3. the re-frozen constants ────────────────────────────────────────────

describe('coverage round 1 — every constant re-measured, with n and method', () => {
  /** One row per constant the catalogue feeds. `n` and `method` are what
   * `npx tsx scripts/deck-score-bands.ts verify` re-measures; it exits
   * non-zero if any frozen number stops matching its statistic. */
  const FROZEN = [
    {
      constant: 'Q_BASELINE_JOINT_COMMANDER', was: 0.574, now: Q_BASELINE_JOINT_COMMANDER, value: 0.683, n: 1000,
      method: 'p95 of the per-pile max Q over all eleven recipes, 1,000 matched Commander controls at .930 typed coverage',
    },
    {
      constant: 'Q_BASELINE_JOINT_BRAWL', was: 0.675, now: Q_BASELINE_JOINT_BRAWL, value: 0.733, n: 1000,
      method: 'the same statistic on 1,000 matched Brawl controls',
    },
    {
      constant: 'Q_SATURATION_BRAWL', was: 0.712, now: Q_SATURATION_BRAWL, value: 0.758, n: 1146,
      method: 'p80 of the max-recipe Q over the Brawl training stride, typed-coverage gate lifted',
    },
    {
      constant: 'Q_BASELINE_CLOSING_BRAWL', was: 0.338, now: Q_BASELINE_CLOSING_BRAWL, value: 0.373, n: 8,
      method: 'p95 of the closing Q of the Brawl holdout controls that assemble a line — 8 of 516, WEAK EVIDENCE',
    },
    {
      constant: 'Q_BASELINE_CLOSING', was: 0.323, now: Q_BASELINE_CLOSING, value: 0.323, n: 0,
      method: 'UNMEASURABLE this round: 0 of 1,000 training and 0 of 823 holdout Commander controls assemble a line, so the stage-4b value stands',
    },
  ];

  it('freezes each constant at the value its method measured', () => {
    for (const row of FROZEN) {
      expect(row.now, row.constant).toBe(row.value);
      expect(row.method.length, row.constant).toBeGreaterThan(20);
    }
    // Four of the five moved; only the unmeasurable one did not.
    expect(FROZEN.filter((r) => r.was !== r.value)).toHaveLength(4);
    expect(FROZEN.find((r) => r.n === 0)?.constant).toBe('Q_BASELINE_CLOSING');
  });

  it('records the direction: every floor ROSE, so S got harsher, not kinder', () => {
    // The catalogue types the controls' draw pool as well as the decks', so a
    // random pile now fills role bands almost as well as a real list. That is
    // the finding: role-supply counting no longer separates deck from pile,
    // and no constant in this file can fix it.
    for (const row of FROZEN) expect(row.value, row.constant).toBeGreaterThanOrEqual(row.was);
  });

  it('pins both S windows, which is what the rise cost', () => {
    // `S = 100 * clip((Q - b) / (Qsat - b)) * R`. A window this narrow makes S
    // a step function of Q: 0 just under the floor, 100 just over it.
    expect(Q_SATURATION - Q_BASELINE_JOINT_COMMANDER).toBeCloseTo(0.017, 3);
    expect(Q_SATURATION_BRAWL - Q_BASELINE_JOINT_BRAWL).toBeCloseTo(0.025, 3);
    // §9.2's rejection line is `b >= .70`. Commander clears it by .017; BRAWL
    // DOES NOT — it is frozen at the measurement with the rule recorded as
    // tripped, because the alternative is keeping a floor the evidence no
    // longer supports. Brawl remains scoreable only because it carries its own
    // saturation .758.
    expect(Q_BASELINE_JOINT_COMMANDER).toBeLessThan(0.70);
    expect(Q_BASELINE_JOINT_BRAWL).toBeGreaterThan(0.70);
  });
});

// ── 4. the shipped catalogue ──────────────────────────────────────────────

describe('coverage round 1 — the shipped shards', () => {
  it('loads the shards well inside the 250 ms budget', () => {
    // The generated shard is ~3x larger than HEAD's (10.9 MB), so its load is
    // the thing most likely to regress a cold `scoreDeckSafely`. The shipped
    // cost is the JSON parse plus the name index — the TypeScript transform of
    // the curated shards only happens under `tsx`, never in a built app — so
    // that is what this times, off disk, not the already-imported module.
    const raw = readFileSync(
      join(__dirname, '..', 'deck-score-catalog', 'entries', 'generated.json'), 'utf8',
    );
    const started = performance.now();
    const entries = JSON.parse(raw) as { canonicalName: string }[];
    const index = new Map<string, unknown>();
    for (const e of entries) index.set(e.canonicalName.toLowerCase(), e);
    const elapsed = performance.now() - started;
    expect(index.size).toBeGreaterThan(14_000);
    expect(elapsed).toBeLessThan(250);
    // And the module the scorer actually calls is live and indexed.
    expect(CATALOG_SIZE).toBeGreaterThan(14_000);
    expect(catalogEntry('Sol Ring')).toBeDefined();
  });

  it('types the staples at the head of the coverage queue', () => {
    // The five most-played cards the sizing report listed as untyped. Each is
    // covered by an atom that clears the >= 3 floor, not by a curated entry.
    for (const name of ['Chaos Warp', 'Skullclamp', 'Go for the Throat', 'Talisman of Dominance', 'Thoughtseize']) {
      expect(catalogEntry(name)?.knowledge, name).toBe('known');
    }
  });

  it('grew the universe to the corpus, which is where the coverage came from', () => {
    // HEAD generated 4,453 known entries over a curated universe. Round 1 adds
    // every non-land card the two samples play; the rest of the jump is atoms.
    expect(CATALOG_SIZE).toBeGreaterThan(4_467 * 2);
  });
});
