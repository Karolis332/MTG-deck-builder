/**
 * Deck Score v1.4 stage 0 — inputs and the measurement contract.
 * docs/DECK_SCORE_SPEC.md §10.4, §10.5, §10.7 stage 0.
 *
 * Three contracts are pinned here:
 *  1. unresolved identity is EVIDENCE, not a cap, and its copies stay as
 *     reserved library slots; confirmed rule failures keep their 19/0 caps;
 *  2. the frozen cohort manifest accounts for 100 % of the source rows with
 *     no commander family on both sides of one profile's split;
 *  3. the §10.4 probe apparatus is deterministic and its metadata/printing
 *     equivalences move the score by exactly 0.
 *
 * Nothing here writes the card DB or the catalogue shards.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, type DeckScoreInput } from '../deck-score';
import { computeStructure } from '../deck-score-gates';
import { explainScoreUnavailable, scoreDeckSafely } from '../deck-score-input';
import {
  readManifest, checkManifest, verifyCohortHashes, fixtureLeaks, familyKey,
  normalisedListText, sha256, standardCutDate,
} from '../../../scripts/deck-score-cohorts';
import { permuteMetadata, clonePrinting, without, isOffPlanTyped } from '../../../scripts/deck-score-probes';
import { deriveCardFeature } from '../deck-score-features';

vi.setConfig({ testTimeout: 120_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v14-${idCounter}-${overrides.name}`,
    oracle_id: `oracle-v14-${idCounter}`,
    mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: null,
    colors: '["G"]', color_identity: '["G"]', keywords: '[]',
    set_code: 'tst', set_name: 'Test Set', collector_number: String(idCounter), rarity: 'common',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '2', toughness: '2', loyalty: null, produced_mana: null, edhrec_rank: null,
    layout: 'normal', updated_at: '2024-01-01', subtypes: null, arena_id: null,
    ...overrides,
  };
}

const forest = (quantity: number) => ({
  card: mkCard({ name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: null, cmc: 0, power: null, toughness: null, colors: null, produced_mana: '["G"]' }),
  quantity,
});

const COMMANDER = mkCard({
  name: 'Stage Zero Commander', type_line: 'Legendary Creature — Human',
  oracle_text: 'Whenever a creature you control dies, draw a card.',
  power: '4', toughness: '4', cmc: 3, mana_cost: '{2}{G}',
});

/** A structurally valid, rule-clean Commander deck (warns on size, never
 * fails) with room for the probes to add and remove copies. */
function baseDeck(overrides: Partial<DeckScoreInput> = {}): DeckScoreInput {
  const spells = Array.from({ length: 8 }, (_, i) => ({
    card: mkCard({ name: `Stage Zero Filler ${i}`, type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null, colors: null }),
    quantity: 1,
  }));
  return {
    format: 'commander', main: [forest(12), ...spells], commander: [COMMANDER],
    sideboard: [], unresolved: [], cardDataVersion: 'test-v14-stage0', corpus: null,
    ...overrides,
  };
}

const unresolvedMain = (quantity: number, board = 'main') => [{ name: 'Totally Unreadable Card', quantity, board }];

/**
 * v1.4 stage 3: the SCORER now owns the library-size rule (§10.9 item 7 #8),
 * so a list that has to be RULE-VALID in a test is padded to the profile's 99
 * library slots. `baseDeck`'s 20-card sketch is still used wherever only the
 * evidence/structure plumbing is under test.
 */
function padTo99(main: DeckScoreInput['main'], reserved = 0): DeckScoreInput['main'] {
  const held = main.reduce((s, e) => s + e.quantity, 0) + reserved;
  const filler = Array.from({ length: Math.max(0, 99 - held) }, (_, i) => ({
    card: mkCard({ name: `Pad Sorcery ${i}`, type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null }),
    quantity: 1,
  }));
  return [...main, ...filler];
}

// ── §10.5 unresolved identity is evidence, not a cap ──────────────────────

describe('§10.5 — unresolved identity yields evidence, never the 39 cap', () => {
  it('emits an evidence warn with cap null and keeps the copies as reserved slots', () => {
    const result = scoreDeck(baseDeck({ unresolved: unresolvedMain(3) }));
    const gate = result.gates.find((g) => g.key === 'unresolved');
    expect(gate).toMatchObject({ kind: 'evidence', status: 'warn', cap: null });
    expect(result.gates.every((g) => g.cap !== 39)).toBe(true);
    expect(result.provisional).toBe(true);
  });

  it('reports the reserved slots on the structure result', () => {
    const structure = computeStructure({
      format: 'commander', main: baseDeck().main, commander: [COMMANDER], sideboard: [],
      unresolved: [{ name: 'A', quantity: 2, board: 'main' }, { name: 'B', quantity: 1, board: 'sideboard' }],
    });
    // Main-board slots only: the sideboard copy is not a library slot.
    expect(structure.reservedSlots).toBe(2);
    // v1.4 stage 3: 20 cards + 2 reserved slots is UNDERSIZED, so the scorer's
    // own size rule caps it (was `[]` while deck-validation's warning stood).
    expect(structure.hardCaps).toEqual([19]);
  });

  it('counts the reserved slots in N, so densities are not inflated by dropped copies', () => {
    // v1.4 stage 3: every density divides by D = max(N0, N), so the move is
    // visible once the reserved slots take the library PAST its 99 slots —
    // below that the denominator is 99 either way, which is the repair.
    const full = padTo99(baseDeck().main);
    const plain = scoreDeck(baseDeck({ main: full }));
    const withSlots = scoreDeck(baseDeck({ main: full, unresolved: unresolvedMain(20) }));
    const mana = (r: typeof plain) => r.components.find((c) => c.key === 'mana')!.score;
    expect(mana(withSlots)).not.toBe(mana(plain));
  });

  it('never manufactures a size cap out of dropped copies', () => {
    // 40 lands + 58 spells = 98 library slots. v1.4 stage 3: 98 alone is
    // UNDERSIZED and the scorer's own rule caps it; the SAME list whose 99th
    // card is merely unreadable keeps its slot and carries no rule cap — which
    // is the §10.5 requirement this test was written for.
    const main = [
      forest(40),
      ...Array.from({ length: 58 }, (_, i) => ({
        card: mkCard({ name: `Bulk Sorcery ${i}`, type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null }),
        quantity: 1,
      })),
    ];
    const short = scoreDeck(baseDeck({ main, unresolved: [] }));
    expect(short.gates.find((g) => g.key === 'size')?.status).toBe('fail');

    const reserved = scoreDeck(baseDeck({ main, unresolved: unresolvedMain(1) }));
    // still `warn`: deck-validation cannot see the reserved slot, and §10.5
    // forbids turning that missing evidence into a cap. The scorer's own rule
    // counts the slot, so it does not escalate to `fail`.
    expect(reserved.gates.find((g) => g.key === 'size')?.status).toBe('warn');
    expect(reserved.gates.filter((g) => g.cap !== null && g.kind === 'rules')).toEqual([]);
  });

  it('an unresolved COMMANDER is unknown identity, not an invalid configuration', () => {
    const result = scoreDeck(baseDeck({
      main: padTo99(baseDeck().main), commander: [], unresolved: unresolvedMain(1, 'commander'),
    }));
    expect(result.gates.find((g) => g.key === 'unknown_commander')).toMatchObject({ kind: 'evidence', status: 'warn', cap: null });
    expect(result.gates.find((g) => g.key === 'structure')?.status).not.toBe('fail');
    expect(result.provisional).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('a MISSING commander with every name resolved is still a confirmed failure', () => {
    const result = scoreDeck(baseDeck({ commander: [] }));
    expect(result.gates.find((g) => g.key === 'structure')?.status).toBe('fail');
    expect(result.score).toBe(0);
  });
});

describe('§10.5 — confirmed rule failures keep their existing caps', () => {
  it('101 resolved cards still caps at 19', () => {
    const main = [forest(40), { card: mkCard({ name: 'Too Many', type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null }), quantity: 60 }];
    expect(scoreDeck(baseDeck({ main })).score).toBeLessThanOrEqual(19);
  });

  it('three commanders still caps at 0', () => {
    expect(scoreDeck(baseDeck({ commander: [COMMANDER, COMMANDER, COMMANDER] })).score).toBe(0);
  });

  it('an off-identity card still fails identity and caps at 19', () => {
    const blue = mkCard({ name: 'Blue Intruder', type_line: 'Instant', colors: '["U"]', color_identity: '["U"]', mana_cost: '{U}', cmc: 1, power: null, toughness: null });
    const deck = baseDeck();
    const result = scoreDeck({ ...deck, main: [...deck.main, { card: blue, quantity: 1 }] });
    expect(result.gates.find((g) => g.key === 'identity')?.status).toBe('fail');
    expect(result.score).toBeLessThanOrEqual(19);
  });
});

describe('scoreDeckSafely never throws', () => {
  const big = Array.from({ length: 200 }, (_, i) => ({
    card: mkCard({ name: `Horde ${i}`, type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null }),
    quantity: 1,
  }));
  const cases: Array<[string, Parameters<typeof scoreDeckSafely>[0]]> = [
    ['empty', { format: 'commander', main: [], commander: [] }],
    ['200 cards', { format: 'commander', main: big, commander: [COMMANDER] }],
    ['only unknown names', { format: 'commander', main: [], commander: [], unresolved: unresolvedMain(99) }],
    ['bad format', { format: 'not-a-format', main: [forest(1)], commander: [] }],
    ['null format', { format: null, main: [forest(1)], commander: [] }],
  ];
  for (const [label, args] of cases) {
    it(`survives ${label}`, () => {
      expect(() => scoreDeckSafely(args)).not.toThrow();
    });
  }
});

describe('explainScoreUnavailable', () => {
  const args = { format: 'commander', main: [forest(1)], commander: [COMMANDER] };

  it('is null for a scorable list', () => {
    expect(explainScoreUnavailable(args)).toBeNull();
  });

  it('names an unsupported format', () => {
    expect(explainScoreUnavailable({ ...args, format: 'modern' })).toMatch(/unsupported format/);
  });

  it('names an entirely unreadable library', () => {
    expect(explainScoreUnavailable({ ...args, main: [], unresolved: unresolvedMain(99) })).toMatch(/all 1 library slot/);
    expect(explainScoreUnavailable({ ...args, main: [] })).toBe('no main-board cards to evaluate.');
  });
});

// ── §10.7 stage 0 — the frozen cohort manifest ────────────────────────────

describe('§10.7 stage 0 — cohorts-v14.json', () => {
  const manifest = readManifest();

  it('exists and carries every source row exactly once', () => {
    expect(manifest, 'run: npx tsx scripts/deck-score-cohorts.ts').not.toBeNull();
    expect(checkManifest(manifest!)).toEqual([]);
  });

  it('pins the two training strides and their eligible subsets', () => {
    const count = (profile: string, split: string, exclusion?: string) =>
      manifest!.rows.filter((r) => r.profile === profile && r.split === split && (!exclusion || r.exclusion === exclusion)).length;
    // Stage 2 moved the Commander stride: `HELD_OUT_COMMANDERS` now matches
    // the front face, so the ten `Kuja, Genome Sorcerer // Trance Kuja` lists
    // left the training side for the fixture split (1,824 -> 1,798; eligible
    // 1,478 -> 1,460). Brawl is bit-identical — no fixture commander was in
    // its stride to start with.
    expect(count('commander', 'training')).toBe(1798);
    expect(count('brawl', 'training')).toBe(1146);
    // Eligible = exclusion 'none'. Moving either number needs a re-measured
    // baseline table, not a quiet edit.
    expect(count('commander', 'training', 'none')).toBe(1460);
    expect(count('brawl', 'training', 'none')).toBe(797);
  });

  it('puts no commander family on both sides of one profile split', () => {
    const splits = new Map<string, Set<string>>();
    for (const r of manifest!.rows) {
      const key = `${r.profile}|${familyKey(r.commanderFamily)}`;
      splits.set(key, (splits.get(key) ?? new Set<string>()).add(r.split));
    }
    const overlaps = [...splits.entries()].filter(([, s]) => s.has('training') && s.has('holdout'));
    expect(overlaps.map(([k]) => k)).toEqual([]);
  });

  it('holds no fixture commander in any stride — the stage 0 Kuja leak is closed', () => {
    // `HELD_OUT_COMMANDERS` stores the front face and the sample the full
    // "A // B" name, so ten `Kuja, Genome Sorcerer` lists sat inside the
    // Commander training stride. `isHeldOutCommander` now tests the front
    // face too (scripts/deck-score-piles.ts).
    expect([...fixtureLeaks(manifest!).entries()]).toEqual([]);
  });

  it('hashes still describe the sample CSVs on disk', () => {
    const { checked, mismatches } = verifyCohortHashes();
    expect(mismatches).toEqual([]);
    expect(checked).toBe(2777 + 1746);
  });
});

describe('list hashing', () => {
  it('is invariant to order, case and whitespace', () => {
    const a = normalisedListText(['Meren of Clan Nel Toth'], [{ name: 'Sol Ring', quantity: 1 }, { name: 'Forest', quantity: 10 }]);
    const b = normalisedListText(['  meren of clan   nel toth '], [{ name: 'forest', quantity: 10 }, { name: ' SOL  RING', quantity: 1 }]);
    expect(sha256(a)).toBe(sha256(b));
  });

  it('changes when a card changes', () => {
    const a = normalisedListText(['X'], [{ name: 'Sol Ring', quantity: 1 }]);
    const b = normalisedListText(['X'], [{ name: 'Sol Ring', quantity: 2 }]);
    expect(sha256(a)).not.toBe(sha256(b));
  });

  it('snaps the Standard cut to a date boundary', () => {
    expect(standardCutDate(['2026-01-01', '2026-01-01', '2026-01-01', '2026-01-02', '2026-01-03'])).toBe('2026-01-02');
  });
});

// ── §10.4 probe apparatus ─────────────────────────────────────────────────

describe('§10.4 probe apparatus', () => {
  it('permutes every forbidden field deterministically', () => {
    const deck = baseDeck();
    const once = permuteMetadata(deck.main);
    const twice = permuteMetadata(deck.main);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
    expect(once[0].card.price_usd).not.toBeNull();
    expect(once.map((e) => e.card.name)).not.toEqual(deck.main.map((e) => e.card.name));
  });

  it('metadata and input order move S and the total by exactly 0', () => {
    const deck = baseDeck();
    const before = scoreDeck(deck);
    const after = scoreDeck({ ...deck, main: permuteMetadata(deck.main) });
    expect(after.score).toBe(before.score);
    expect(after.components.find((c) => c.key === 'synergy')!.score)
      .toBe(before.components.find((c) => c.key === 'synergy')!.score);
  });

  it('a different printing of the same basic is score-identical', () => {
    const deck = baseDeck();
    const swapped = deck.main.map((e, i) => (i === 0 ? { card: clonePrinting(e.card, 1), quantity: e.quantity } : e));
    const after = scoreDeck({ ...deck, main: swapped });
    expect(after.score).toBe(scoreDeck(deck).score);
  });

  it('removes exactly k copies, or reports that it cannot', () => {
    const deck = baseDeck();
    const target = deck.main.filter((e) => e.card.name.startsWith('Stage Zero Filler'));
    const cut = without(deck.main, target, 3);
    expect(cut!.reduce((s, e) => s + e.quantity, 0)).toBe(deck.main.reduce((s, e) => s + e.quantity, 0) - 3);
    expect(JSON.stringify(without(deck.main, target, 3))).toBe(JSON.stringify(cut));
    expect(without(deck.main, target, 99)).toBeNull();
  });

  it('never calls a land or an untyped card an off-plan typed copy', () => {
    expect(isOffPlanTyped(deriveCardFeature(forest(1).card), 'commander')).toBe(false);
    const unknown = mkCard({ name: 'Wholly Unknown Effect', type_line: 'Enchantment', oracle_text: 'Bla bla nonsense text.', power: null, toughness: null });
    const feature = deriveCardFeature(unknown);
    expect(feature.covered).toBe(false);
    expect(isOffPlanTyped(feature, 'commander')).toBe(false);
  });
});
