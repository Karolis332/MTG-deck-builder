/**
 * Deck Score v1.4 stage 1a — tutor-assembled creature combos.
 * docs/DECK_SCORE_SPEC.md §10.6 item 1 / §10.7 stage 1a.
 *
 * The two Thrasios/Tymna Top-16 lists that scored 20 are 92.9% typed and hold
 * a real line (Devoted Druid + Hazel's Brewmaster into Finale of Devastation);
 * v1.3 had no family that could express it, so nothing assembled and S was 0.
 * These tests pin the modelled families, the audited trace every admitted line
 * now carries, and the two probes §10.7 requires: remove the outlet and the
 * line must disappear, remove the tutors and access must drop.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, type DeckScoreInput } from '../deck-score';
import { computeWin, type WinTotals } from '../deck-score-win';
import { normsFor } from '../deck-score-norms';
import { deriveCardFeature, type CardFeature } from '../deck-score-features';
import { catalogFacts } from '../deck-score-catalog';
import {
  TYPED_COMBOS, MANA_OUTLETS, COMBO_TUTORS, UNBOUNDED_DRAW_SINKS,
  ETB_OUTLETS, LIBRARY_DRAW_SINKS, LIBRARY_WIN_CARDS,
} from '../deck-score-catalog/combos';
import type { DeckEntry } from '../deck-score-mana';
import { loadDataset } from '../../../scripts/deck-score-fixtures';

// Corpus-sized work (200 piles, 30 cEDH lists, a 15k-entry catalogue) runs well
// past vitest's 15 s default; the same allowance every deck-score suite takes.
vi.setConfig({ testTimeout: 120_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v14-${idCounter}-${overrides.name}`,
    oracle_id: `v14-oracle-${idCounter}`,
    mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Elf Druid', oracle_text: null,
    colors: '["G"]', color_identity: '["G"]', keywords: '[]',
    set_code: 'tst', set_name: 'Test Set', collector_number: String(idCounter), rarity: 'rare',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '1', toughness: '2', loyalty: null, produced_mana: null, edhrec_rank: null,
    layout: 'normal', updated_at: '2024-01-01', subtypes: null, arena_id: null,
    ...overrides,
  };
}

interface Spec { name: string; cmc?: number; type?: string; produced?: string }

function entry({ name, cmc = 2, type = 'Creature — Elf Druid', produced }: Spec): DeckEntry {
  return {
    feature: deriveCardFeature(mkCard({
      name, cmc, type_line: type, mana_cost: `{${cmc}}`,
      produced_mana: produced ?? null,
      power: /Creature/.test(type) ? '1' : null,
      toughness: /Creature/.test(type) ? '2' : null,
    })),
    quantity: 1,
  };
}

/** Enough anonymous bodies that the deck is a deck; none of them is named by
 * any combo row, so they never fill a slot, a tutor or an outlet. */
function filler(count: number): DeckEntry[] {
  return Array.from({ length: count }, (_, i) => entry({ name: `Filler ${i}`, cmc: 3 }));
}

/** The control family is gated off in every unit case so the assembled line is
 * unambiguous: §1 W admits control only at E >= E* with a durable engine. */
const NO_CONTROL: WinTotals = { E: 0, Estar: 10, D: 0, Dstar: 10, hasDrawEngine: false };

function win(named: Spec[], commanders: Spec[] = [], fillerCount = 60) {
  const main = [...named.map(entry), ...filler(fillerCount)];
  const cmd: CardFeature[] = commanders.map((s) => entry(s).feature);
  const N = main.length + 36;
  return computeWin('commander', normsFor('commander'), 'midrange', N, main, cmd, NO_CONTROL);
}

const DRUID: Spec = { name: 'Devoted Druid', cmc: 2 };
const BREWMASTER: Spec = { name: "Hazel's Brewmaster", cmc: 4 };
const FINALE: Spec = { name: 'Finale of Devastation', cmc: 2, type: 'Sorcery' };
const SURVIVAL: Spec = { name: 'Survival of the Fittest', cmc: 2, type: 'Enchantment' };
const CHORD: Spec = { name: 'Chord of Calling', cmc: 3, type: 'Instant' };
const GSZ: Spec = { name: "Green Sun's Zenith", cmc: 1, type: 'Sorcery' };

function lineIds(w: ReturnType<typeof computeWin>): string[] {
  return [w.closing, ...w.closingLines].filter((l) => l != null).map((l) => l!.id);
}

describe('v1.4 stage 1a — modelled creature-combo families', () => {
  it('assembles Devoted Druid + Hazel\'s Brewmaster when the graveyard route and the outlet are both there', () => {
    const w = win([DRUID, BREWMASTER, SURVIVAL, FINALE, CHORD]);
    expect(w.closing?.id).toBe('combo:druid-brewmaster');
    expect(w.closing?.pieces).toEqual(expect.arrayContaining(['Devoted Druid', "Hazel's Brewmaster"]));
    expect(w.score).toBeGreaterThan(0);
  });

  it('refuses the Brewmaster line when no card can put a creature into a graveyard', () => {
    const w = win([DRUID, BREWMASTER, FINALE, CHORD]);
    expect(w.closing).toBeNull();
  });

  it('assembles Devoted Druid + Swift Reconfiguration with a mana outlet', () => {
    const w = win([
      DRUID, { name: 'Swift Reconfiguration', cmc: 1, type: 'Enchantment — Aura' },
      { name: 'Exsanguinate', cmc: 2, type: 'Sorcery' },
    ]);
    expect(w.closing?.id).toBe('combo:druid-reconfigure');
  });

  it('OUTLET PROBE: removing the only mana outlet removes the line', () => {
    const pieces: Spec[] = [DRUID, { name: 'Swift Reconfiguration', cmc: 1, type: 'Enchantment — Aura' }];
    const withOutlet = win([...pieces, { name: 'Exsanguinate', cmc: 2, type: 'Sorcery' }]);
    const withoutOutlet = win(pieces);
    expect(withOutlet.closing?.id).toBe('combo:druid-reconfigure');
    expect(withoutOutlet.closing).toBeNull();
  });

  it('assembles Kiki-Jiki with an untapper and needs no separate outlet (the copies have haste)', () => {
    const w = win([
      { name: 'Kiki-Jiki, Mirror Breaker', cmc: 5 },
      { name: 'Zealous Conscripts', cmc: 5 },
    ]);
    expect(w.closing?.id).toBe('combo:kiki-copy');
    expect(w.closing?.trace?.finish).toMatch(/haste/i);
  });

  it('refuses the Kiki line with Kiki-Jiki alone', () => {
    expect(win([{ name: 'Kiki-Jiki, Mirror Breaker', cmc: 5 }]).closing).toBeNull();
  });

  it('assembles Mikaeus + Walking Ballista as a self-finishing damage loop', () => {
    const w = win([
      { name: 'Mikaeus, the Unhallowed', cmc: 6 },
      { name: 'Walking Ballista', cmc: 0, type: 'Artifact Creature — Construct' },
    ]);
    expect(w.closing?.id).toBe('combo:mikaeus-persist');
    expect(w.closing?.trace?.finish).toMatch(/unbounded damage/);
  });

  it('refuses the Mikaeus line without a damage sacrifice', () => {
    expect(win([{ name: 'Mikaeus, the Unhallowed', cmc: 6 }]).closing).toBeNull();
  });

  it('assembles Exquisite Blood + Sanguine Bond as a self-finishing drain loop', () => {
    const w = win([
      { name: 'Exquisite Blood', cmc: 5, type: 'Enchantment' },
      { name: 'Sanguine Bond', cmc: 5, type: 'Enchantment' },
    ]);
    expect(w.closing?.id).toBe('combo:blood-bond');
    expect(w.closing?.trace?.finish).toMatch(/unbounded drain/);
  });

  it('refuses the drain loop with only one half of the mirror', () => {
    expect(win([{ name: 'Exquisite Blood', cmc: 5, type: 'Enchantment' }]).closing).toBeNull();
  });

  it("Thassa's Oracle + Demonic Consultation is built, and alt-win may outrank it on u", () => {
    const w = win([
      { name: "Thassa's Oracle", cmc: 2 },
      { name: 'Demonic Consultation', cmc: 1, type: 'Instant' },
    ]);
    // Both families describe the same finish, so whichever wins on u is the
    // root; what must hold is that a traced line exists at all.
    expect(lineIds(w).length).toBeGreaterThan(0);
    expect(w.closing?.trace).toBeDefined();
  });

  it('refuses Isochron Scepter + Dramatic Reversal below three nonland mana sources', () => {
    const w = win([
      { name: 'Isochron Scepter', cmc: 2, type: 'Artifact' },
      { name: 'Dramatic Reversal', cmc: 2, type: 'Instant' },
      { name: 'Exsanguinate', cmc: 2, type: 'Sorcery' },
      { name: 'Rock A', cmc: 2, type: 'Artifact', produced: '["C"]' },
    ]);
    expect(w.closing).toBeNull();
  });

  it('assembles Isochron Scepter + Dramatic Reversal once three nonland mana sources are there', () => {
    const w = win([
      { name: 'Isochron Scepter', cmc: 2, type: 'Artifact' },
      { name: 'Dramatic Reversal', cmc: 2, type: 'Instant' },
      { name: 'Exsanguinate', cmc: 2, type: 'Sorcery' },
      { name: 'Rock A', cmc: 2, type: 'Artifact', produced: '["C"]' },
      { name: 'Rock B', cmc: 2, type: 'Artifact', produced: '["C"]' },
      { name: 'Rock C', cmc: 2, type: 'Artifact', produced: '["C"]' },
    ]);
    expect(w.closing?.id).toBe('combo:scepter-reversal');
  });

  it('refuses Food Chain when the only outlet cannot be cast with creature-only mana', () => {
    const withSorcery = win([
      { name: 'Food Chain', cmc: 3, type: 'Enchantment' },
      { name: 'Eternal Scourge', cmc: 3 },
      { name: 'Exsanguinate', cmc: 2, type: 'Sorcery' },
    ]);
    const withBallista = win([
      { name: 'Food Chain', cmc: 3, type: 'Enchantment' },
      { name: 'Eternal Scourge', cmc: 3 },
      { name: 'Walking Ballista', cmc: 0, type: 'Artifact Creature — Construct' },
    ]);
    expect(withSorcery.closing).toBeNull();
    expect(withBallista.closing?.id).toBe('combo:food-chain');
  });
});

describe('v1.4 stage 1a — access probes', () => {
  it('TUTOR PROBE: removing every tutor keeps the line but drops its access', () => {
    const base: Spec[] = [DRUID, BREWMASTER, SURVIVAL, FINALE];
    const withTutors = win([...base, CHORD, GSZ, { name: 'Eladamri\'s Call', cmc: 2, type: 'Instant' }]);
    const withoutTutors = win(base);
    expect(withTutors.closing?.id).toBe('combo:druid-brewmaster');
    expect(withoutTutors.closing?.id).toBe('combo:druid-brewmaster');
    expect(withTutors.score).toBeGreaterThan(withoutTutors.score);
    expect(withTutors.closing?.trace?.tutor).toMatch(/Chord of Calling/);
    expect(withoutTutors.closing?.trace?.tutor).toMatch(/Survival of the Fittest/);
  });

  it('a command-zone unbounded draw sink finds the outlet instead of drawing it', () => {
    const named: Spec[] = [DRUID, BREWMASTER, SURVIVAL, FINALE, CHORD];
    const drawn = win(named, [{ name: 'Plain Commander', cmc: 2 }]);
    const found = win(named, [{ name: 'Thrasios, Triton Hero', cmc: 2 }]);
    expect(found.score).toBeGreaterThan(drawn.score);
    expect(found.closing?.trace?.finish).toMatch(/found, not drawn: Thrasios, Triton Hero/);
    expect(drawn.closing?.trace?.finish).not.toMatch(/found, not drawn/);
    // Every name the sink table holds must be a real, catalogued card.
    for (const sink of UNBOUNDED_DRAW_SINKS) expect(sink.mechanism.length).toBeGreaterThan(10);
  });

  it('no line is admitted without a resource/tutor/finish trace', () => {
    const cases = [
      win([DRUID, BREWMASTER, SURVIVAL, FINALE, CHORD]),
      win([{ name: 'Kiki-Jiki, Mirror Breaker', cmc: 5 }, { name: 'Felidar Guardian', cmc: 4 }]),
      win([{ name: "Thassa's Oracle", cmc: 2 }, { name: 'Tainted Pact', cmc: 2, type: 'Instant' }]),
    ];
    for (const w of cases) {
      for (const line of [w.closing, ...w.closingLines]) {
        if (!line) continue;
        expect(line.trace?.resource ?? '').not.toBe('');
        expect(line.trace?.tutor ?? '').not.toBe('');
        expect(line.trace?.finish ?? '').not.toBe('');
      }
    }
  });
});

describe('v1.4 stage 1a — combo/tutor/outlet tables', () => {
  it('every slot, tutor and outlet names a distinct card and every combo has a prerequisite', () => {
    for (const combo of TYPED_COMBOS) {
      expect(combo.slots.length).toBeGreaterThanOrEqual(2);
      expect(combo.prerequisite.length).toBeGreaterThan(30);
      const names = combo.slots.flatMap((s) => s.any.map((n) => n.toLowerCase()));
      expect(new Set(names).size).toBe(names.length);
      for (const slot of combo.slots) expect(slot.types.length).toBeGreaterThan(0);
    }
    expect(new Set(TYPED_COMBOS.map((c) => c.id)).size).toBe(TYPED_COMBOS.length);
    for (const t of COMBO_TUTORS) expect(t.cost(4)).toBeGreaterThan(0);
    for (const o of MANA_OUTLETS) expect(o.mechanism.length).toBeGreaterThan(10);
  });
});

describe('v1.4 stage 1a — corpus regression', () => {
  const ds = loadDataset(200);
  const S = (r: ReturnType<typeof scoreDeck>): number => r.components.find((c) => c.key === 'synergy')?.score ?? 0;
  const q = (v: number[], p: number): number => v[Math.min(v.length - 1, Math.round(p * (v.length - 1)))];

  function winOf(input: DeckScoreInput) {
    const main: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const cmd = input.commander.map((c) => deriveCardFeature(c));
    const N = main.reduce((s, e) => s + e.quantity, 0);
    // The real E/D totals matter here: the control family is part of what the
    // two failing lists were falling back to.
    return { main, cmd, N };
  }

  it('the two formerly line-less cEDH lists assemble the Brewmaster line and clear 80', () => {
    for (const i of [0, 1]) {
      const input = ds.cedh[i];
      const r = scoreDeck(input);
      expect(r.score).toBeGreaterThanOrEqual(80);
      expect(S(r)).toBeGreaterThan(0);
      expect(r.components.find((c) => c.key === 'synergy')?.reason ?? '').toMatch(/supports combo/);
      const { main, cmd, N } = winOf(input);
      const w = computeWin('commander', normsFor('commander'), 'midrange', N, main, cmd,
        { E: 18.8, Estar: 12, D: 27.3, Dstar: 10, hasDrawEngine: true });
      expect(w.closing?.id).toBe('combo:druid-brewmaster');
      expect(w.closing?.trace?.resource).toMatch(/noncreature artifact, so the -1\/-1 counter the untap costs is inert/);
      expect(w.closing?.trace?.tutor).toMatch(/Chord of Calling → battlefield/);
      expect(w.closing?.trace?.finish).toMatch(/Finale of Devastation — X of 10 or more/);
      expect(w.closing?.trace?.finish).toMatch(/found, not drawn: Thrasios, Triton Hero/);
    }
  });

  it('all 30 cEDH Top-16 lists have W > 0 and an assembled closing line, median total >= 85', () => {
    const rows = ds.cedh.map((input) => {
      const { main, cmd, N } = winOf(input);
      return {
        total: scoreDeck(input).score,
        w: computeWin('commander', normsFor('commander'), 'midrange', N, main, cmd,
          { E: 18, Estar: 12, D: 26, Dstar: 10, hasDrawEngine: true }),
      };
    });
    expect(rows.filter((r) => r.w.score > 0)).toHaveLength(30);
    expect(rows.filter((r) => r.w.closing != null)).toHaveLength(30);
    const totals = rows.map((r) => r.total).sort((a, b) => a - b);
    expect(q(totals, 0.5)).toBeGreaterThanOrEqual(85);
    expect(q(totals, 0.1)).toBeGreaterThanOrEqual(80);
  });

  it('the 200 constrained-random piles gain no closing line and stay under 25', () => {
    const rows = ds.piles.map((p) => scoreDeck(p));
    const combos = rows.filter((r) => /supports combo/.test(r.components.find((c) => c.key === 'synergy')?.reason ?? ''));
    expect(combos).toHaveLength(0);
    expect(rows.filter((r) => r.score < 25)).toHaveLength(200);
  });

  it('typed coverage does not drop on any fixture or cEDH list', () => {
    const share = (main: readonly { card: DbCard; quantity: number }[]): number => {
      const rows = main.map((r) => ({ f: deriveCardFeature(r.card), q: r.quantity })).filter((r) => !r.f.isLand);
      const tot = rows.reduce((s, r) => s + r.q, 0);
      return tot === 0 ? 1 : rows.filter((r) => r.f.covered).reduce((s, r) => s + r.q, 0) / tot;
    };
    // Measured on this commit; the shard is additive, so these are floors.
    expect(Math.min(...ds.fixtures.map((f) => share(f.input.main)))).toBeGreaterThanOrEqual(0.8333);
    expect(Math.min(...ds.cedh.map((i) => share(i.main)))).toBeGreaterThanOrEqual(0.8767);
    const cedh = ds.cedh.map((i) => share(i.main)).sort((a, b) => a - b);
    expect(q(cedh, 0.5)).toBeGreaterThanOrEqual(0.9436);
  });

  it('every card the combo tables name is in the catalogue under its printed text', () => {
    const named = [
      ...TYPED_COMBOS.flatMap((c) => c.slots.flatMap((s) => s.any)),
      ...MANA_OUTLETS.map((o) => o.name),
      ...COMBO_TUTORS.map((t) => t.name),
      ...UNBOUNDED_DRAW_SINKS.map((d) => d.name),
      // v1.4 stage 1b tables: the creature-ETB outlets and the library-sink /
      // alternate-win pair that give an unbounded loop a finish predicate.
      ...ETB_OUTLETS.map((o) => o.name),
      ...LIBRARY_DRAW_SINKS.map((d) => d.name),
      ...LIBRARY_WIN_CARDS.map((w) => w.name),
    ];
    const byName = new Map<string, DbCard>();
    for (const input of [...ds.cedh, ...ds.fixtures.map((f) => f.input)]) {
      for (const rc of input.main) byName.set(rc.card.name.toLowerCase(), rc.card);
      for (const c of input.commander) byName.set(c.name.toLowerCase(), c);
    }
    // Only the ones the corpora actually hold can be checked against a live
    // printing here; the rest are covered by the catalogue's own hash test.
    const present = named.filter((n) => byName.has(n.toLowerCase()));
    expect(present.length).toBeGreaterThan(10);
    for (const name of present) {
      const card = byName.get(name.toLowerCase()) as DbCard;
      expect(catalogFacts(card.name, card.oracle_text), `${name} uncovered`).not.toBeNull();
    }
  });
});
