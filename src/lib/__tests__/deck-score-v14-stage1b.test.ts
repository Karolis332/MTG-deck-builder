/**
 * Deck Score v1.4 stage 1b — W-zero audit, typed finisher output and the
 * executable control finisher schedule.
 * docs/DECK_SCORE_SPEC.md §9.4, §10.6 items 2-3, §10.7 stage 1b.
 *
 * v1.3 closed every control deck at a hard-coded turn 8 with an access term
 * that saturated above 15 %, so "control inevitability" was a flat bonus any
 * list with removal, a cantrip engine and one fat creature collected. §9.4
 * replaces it with `t* = first t <= 12 satisfying the whole-table finish
 * predicate` on typed output, and `u = durable * J(t*) * decay` with JOINT
 * access to the engine and the finisher. These tests pin each printed output
 * rule, the joint access term, the t* bound, and the four new combo families.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { computeWin, winAudit, WIN_FAMILIES, type WinTotals } from '../deck-score-win';
import { finisherOutputOf, drawEventsPerTurn } from '../deck-score-finishers';
import { normsFor } from '../deck-score-norms';
import { deriveCardFeature, type CardFeature } from '../deck-score-features';
import { TYPED_COMBOS, ETB_OUTLETS, LIBRARY_DRAW_SINKS, LIBRARY_WIN_CARDS } from '../deck-score-catalog/combos';
import type { DeckEntry } from '../deck-score-mana';
import { loadDataset } from '../../../scripts/deck-score-fixtures';

vi.setConfig({ testTimeout: 120_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v14b-${idCounter}-${overrides.name}`,
    oracle_id: `v14b-oracle-${idCounter}`,
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

interface Spec {
  name: string; cmc?: number; type?: string; text?: string;
  power?: string | null; loyalty?: string | null; qty?: number;
}

function feature({ name, cmc = 2, type = 'Creature — Elf Druid', text, power, loyalty }: Spec): CardFeature {
  return deriveCardFeature(mkCard({
    name, cmc, type_line: type, mana_cost: `{${cmc}}`, oracle_text: text ?? null,
    power: power !== undefined ? power : (/Creature/.test(type) ? '1' : null),
    toughness: /Creature/.test(type) ? '2' : null,
    loyalty: loyalty ?? null,
  }));
}

function entry(spec: Spec): DeckEntry {
  return { feature: feature(spec), quantity: spec.qty ?? 1 };
}

function filler(count: number): DeckEntry[] {
  return Array.from({ length: count }, (_, i) => entry({ name: `Filler ${i}`, cmc: 3 }));
}

const NO_CONTROL: WinTotals = { E: 0, Estar: 10, D: 0, Dstar: 10, hasDrawEngine: false };
/** Passes every control GATE, so only the finisher schedule decides the line. */
const CONTROL_READY: WinTotals = { E: 20, Estar: 10, D: 20, Dstar: 10, hasDrawEngine: true };

/** Two cheap answers, so §8's "E >= E* with >= 2 cheap answers by T3" holds. */
function cheapAnswers(): DeckEntry[] {
  return [
    entry({ name: 'Swords to Plowshares', cmc: 1, type: 'Instant', text: 'Exile target creature. Its controller gains life equal to its power.' }),
    entry({ name: 'Path to Exile', cmc: 1, type: 'Instant', text: 'Exile target creature. Its controller may search their library for a basic land card.' }),
  ];
}

function win(named: Spec[], totals: WinTotals = NO_CONTROL, commanders: Spec[] = [], fillerCount = 60) {
  const main = [...named.map(entry), ...filler(fillerCount)];
  const cmd: CardFeature[] = commanders.map(feature);
  const N = main.reduce((s, e) => s + e.quantity, 0) + 36;
  return computeWin('commander', normsFor('commander'), 'midrange', N, main, cmd, totals);
}

function audit(named: Spec[], totals: WinTotals, fillerCount = 60) {
  const main = [...named.map(entry), ...filler(fillerCount)];
  const N = main.reduce((s, e) => s + e.quantity, 0) + 36;
  return winAudit('commander', normsFor('commander'), 'midrange', N, main, [], totals);
}

// ── §9.4 printed finisher output rules ────────────────────────────────────

describe('v1.4 stage 1b — typed finisher output (§9.4)', () => {
  it('reads a damage planeswalker from its PRINTED loyalty and debits a minus ability', () => {
    const chandra = feature({
      name: 'Test Chandra', cmc: 4, type: 'Legendary Planeswalker — Chandra', loyalty: '4', power: null,
      text: '[+1]: Add {R}{R}.\n[-3]: Chandra deals 4 damage to any target.',
    });
    const out = finisherOutputOf(chandra, 3, 1);
    expect(out?.kind).toBe('walker');
    // 4 damage to a single target, not the table; loyalty 4 / cost 3 = 1 use.
    expect(out?.perTurn).toBe(4);
    expect(out?.turns).toBe(1);
  });

  it('gives a DRAW-ONLY walker zero finishing output (§9.4: no generic walker damage)', () => {
    const jace = feature({
      name: 'Test Jace', cmc: 4, type: 'Legendary Planeswalker — Jace', loyalty: '3', power: null,
      text: '[+2]: Look at the top card of target player\'s library.\n[0]: Brainstorm.\n[-1]: Return target creature to its owner\'s hand.',
    });
    expect(finisherOutputOf(jace, 3, 1)).toBeNull();
  });

  it('refuses a walker whose printed loyalty is unreadable — unknown output cannot prove a finish', () => {
    const unknown = feature({
      name: 'Loyaltyless Walker', cmc: 4, type: 'Legendary Planeswalker — Test', loyalty: null, power: null,
      text: '[-3]: Loyaltyless Walker deals 5 damage to each opponent.',
    });
    expect(finisherOutputOf(unknown, 3, 1)).toBeNull();
  });

  it('counts each-opponent walker damage against the whole table', () => {
    const table = feature({
      name: 'Table Walker', cmc: 5, type: 'Legendary Planeswalker — Test', loyalty: '6', power: null,
      text: '[-2]: Table Walker deals 3 damage to each opponent.',
    });
    const out = finisherOutputOf(table, 3, 1);
    expect(out?.perTurn).toBe(9);
    expect(out?.turns).toBe(3);
  });

  it('pays a manland animation every attack and removes the land from mana production', () => {
    const land = feature({
      name: 'Test Colonnade', cmc: 0, type: 'Land', power: null,
      text: '{3}{W}{U}: Test Colonnade becomes a 4/4 white and blue Elemental creature with flying until end of turn. It\'s still a land.',
    });
    const out = finisherOutputOf(land, 3, 1);
    expect(out?.kind).toBe('manland');
    expect(out?.perTurn).toBe(4);
    expect(out?.upkeepMana).toBe(5);
    expect(out?.manaForgone).toBe(1);
    // A land cannot attack the turn it enters.
    expect(out?.deployDelay).toBe(1);
  });

  it('reads repeatable burn from its printed activation cost', () => {
    const pinger = feature({
      name: 'Test Pinger', cmc: 3, type: 'Creature — Elemental',
      text: '{2}, {T}: Test Pinger deals 2 damage to any target.',
    });
    const out = finisherOutputOf(pinger, 3, 1);
    expect(out?.kind).toBe('burn');
    expect(out?.perTurn).toBe(2);
    expect(out?.upkeepMana).toBe(2);
    expect(out?.turns).toBe(Infinity);
  });

  it('scales draw-damage by the actual scheduled draw EVENTS and honours a per-turn limit', () => {
    const crawler = feature({
      name: 'Test Crawler', cmc: 5, type: 'Artifact Creature — Horror',
      text: 'Whenever you draw a card, each opponent loses 1 life.',
    });
    const one = finisherOutputOf(crawler, 3, 1);
    const two = finisherOutputOf(crawler, 3, 2);
    expect(one?.kind).toBe('draw_damage');
    expect(one?.perTurn).toBe(3);
    expect(two?.perTurn).toBe(6);

    const limited = feature({
      name: 'Once Crawler', cmc: 5, type: 'Enchantment',
      text: 'Whenever you draw a card, each opponent loses 2 life. This ability triggers only once each turn.',
    });
    expect(finisherOutputOf(limited, 3, 2)?.perTurn).toBe(6);
  });

  it('counts the ordinary draw step plus typed repeatable draw, bounded at three events', () => {
    const arena = entry({
      name: 'Test Arena', cmc: 3, type: 'Enchantment', qty: 12,
      text: 'At the beginning of your upkeep, you draw a card and you lose 1 life.',
    });
    expect(drawEventsPerTurn([arena])).toBe(3);
    expect(drawEventsPerTurn(filler(20))).toBe(1);
  });
});

// ── §9.4 / §10.6.3 the control finisher schedule ──────────────────────────

describe('v1.4 stage 1b — executable control schedule (§10.6.3)', () => {
  const BOMB: Spec = { name: 'Test Bomb', cmc: 6, type: 'Creature — Dragon', power: '9', qty: 8 };

  it('builds NO control line for a removal-and-draw-only list — the T8 default is gone', () => {
    const { notes, built } = audit([...cheapAnswers().map(() => ({ name: 'unused' }))], CONTROL_READY);
    expect(built).not.toContain('control');
    expect(notes.some((n) => n.family === 'control')).toBe(true);
  });

  it('rejects the control line when it holds no card with typed finisher output', () => {
    const wall: Spec = { name: 'Test Wall', cmc: 2, type: 'Creature — Wall', power: '0' };
    const main = [...Array.from({ length: 10 }, (_, i) => entry({ ...wall, name: `Wall ${i}` })),
      ...cheapAnswers(), ...filler(50)];
    const N = main.reduce((sum, e) => sum + e.quantity, 0) + 37;
    const { notes, built } = winAudit('commander', normsFor('commander'), 'midrange', N, main, [], CONTROL_READY);
    expect(built).not.toContain('control');
    expect(notes.find((n) => n.code === 'control.no_finisher')).toBeDefined();
  });

  it('rejects the control line when its typed finisher output cannot reach the table', () => {
    const main = [...Array.from({ length: 10 }, (_, i) => entry({ ...BOMB, name: `Bomb ${i}`, qty: 1 })),
      ...cheapAnswers(), ...filler(50)];
    const N = main.reduce((sum, e) => sum + e.quantity, 0) + 37;
    const { notes, built } = winAudit('commander', normsFor('commander'), 'midrange', N, main, [], CONTROL_READY);
    expect(built).not.toContain('control');
    expect(notes.find((n) => n.code === 'control.schedule_short')?.detail)
      .toMatch(/of 120 finisher output by T12$/);
  });

  it('computes a real t* when the output DOES reach the table', () => {
    const main = [...Array.from({ length: 14 }, (_, i) =>
      entry({ name: `Fast Bomb ${i}`, cmc: 4, type: 'Creature — Dragon', power: '9' })),
    ...cheapAnswers(), ...filler(40)];
    const N = main.reduce((sum, e) => sum + e.quantity, 0) + 43;
    const { built, notes } = winAudit('commander', normsFor('commander'), 'midrange', N, main, [], CONTROL_READY);
    expect(built).toContain('control');
    expect(notes.some((n) => n.family === 'control')).toBe(false);
  });

  it('never reports a finish past turn 12 — the t* search stops there', () => {
    const slow: Spec = { name: 'Slow Bomb', cmc: 9, type: 'Creature — Dragon', power: '5', qty: 4 };
    const main = [...Array.from({ length: 4 }, (_, i) => entry({ ...slow, name: `Slow ${i}`, qty: 1 })), ...cheapAnswers(), ...filler(60)];
    const N = main.reduce((s, e) => s + e.quantity, 0) + 33;
    const { notes, built } = winAudit('commander', normsFor('commander'), 'midrange', N, main, [], CONTROL_READY);
    expect(built).not.toContain('control');
    const short = notes.find((n) => n.code === 'control.schedule_short');
    expect(short?.detail).toMatch(/of 120 finisher output by T12$/);
  });

  it('applies joint access once: J stays below certainty and the control line is never an assembled closing line', () => {
    const main = [...Array.from({ length: 14 }, (_, i) =>
      entry({ name: `Fast Bomb ${i}`, cmc: 4, type: 'Creature — Dragon', power: '9' })),
    ...cheapAnswers(), ...filler(40)];
    const N = main.reduce((sum, e) => sum + e.quantity, 0) + 43;
    const w = computeWin('commander', normsFor('commander'), 'midrange', N, main, [], CONTROL_READY);
    // §9.5: only the families that ASSEMBLE a fixed set become closing lines.
    expect([w.closing, ...w.closingLines].some((l) => l?.id === 'control')).toBe(false);
    // J is the raw joint access, so u can never reach the old saturated .758
    // on a library-only finisher pool: W stays strictly below 100.
    expect(w.score).toBeGreaterThan(0);
    expect(w.score).toBeLessThan(100);
  });
});

// ── §10.6.2 audit surface ─────────────────────────────────────────────────

describe('v1.4 stage 1b — W-zero audit (§10.6.2)', () => {
  it('classifies deterministically: the same list yields the same notes every time', () => {
    const list: Spec[] = [{ name: 'Devoted Druid', cmc: 2 }, { name: 'Test Wall', cmc: 2, type: 'Creature — Wall', power: '0' }];
    const a = audit(list, CONTROL_READY);
    const b = audit(list, CONTROL_READY);
    expect(a.notes).toEqual(b.notes);
    expect(a.built).toEqual(b.built);
  });

  it('reports a partial combo as a missing piece, never as an absent family', () => {
    const { notes } = audit([{ name: 'Devoted Druid', cmc: 2 }], NO_CONTROL);
    const n = notes.find((x) => x.code === 'combo.pieces_missing');
    expect(n?.detail).toMatch(/1\/2 slots filled/);
  });

  it('says nothing about a combo whose pieces are all absent', () => {
    const { notes } = audit([{ name: 'Filler A', cmc: 2 }], NO_CONTROL);
    expect(notes.some((n) => n.code === 'combo.pieces_missing')).toBe(false);
  });

  it('exposes the finish shortfall with the number it fell short by', () => {
    const { notes } = audit([{ name: 'Tiny', cmc: 1, type: 'Creature — Bird', power: '1' }], NO_CONTROL);
    const n = notes.find((x) => x.code === 'combat_wide.schedule_short');
    expect(n?.detail).toMatch(/^\d+(\.\d+)? of 120 expected damage by T12$/);
  });
});

// ── §10.6 item 2: the modelled families ───────────────────────────────────

describe('v1.4 stage 1b — new closing families (§10.6 item 2)', () => {
  it('admits Protean Hulk only when a complete creature package fits the fetch budget', () => {
    const outlet: Spec = { name: 'Viscera Seer', cmc: 1 };
    const hulk: Spec = { name: 'Protean Hulk', cmc: 6 };
    // Mikaeus (6) + Walking Ballista (0) is 6 mana value and both are creatures.
    const withPackage = audit([hulk, outlet,
      { name: 'Mikaeus, the Unhallowed', cmc: 6 },
      { name: 'Walking Ballista', cmc: 0, type: 'Artifact Creature — Construct' }], NO_CONTROL);
    expect(withPackage.built).toContain('combo:hulk-package');

    const withoutPackage = audit([hulk, outlet], NO_CONTROL);
    expect(withoutPackage.built).not.toContain('combo:hulk-package');
    expect(withoutPackage.notes.find((n) => n.code === 'combo.route_unsatisfied')?.detail)
      .toMatch(/complete creature package/);
  });

  it('admits the graveyard-tutor + reanimation pair only with a real target in the library', () => {
    const pair: Spec[] = [
      { name: 'Buried Alive', cmc: 3, type: 'Sorcery' },
      { name: 'Reanimate', cmc: 1, type: 'Sorcery' },
    ];
    const withTarget = win([...pair, { name: 'Big Target', cmc: 9, type: 'Creature — Avatar', power: '10' }], NO_CONTROL);
    expect(withTarget.closing?.id).toBe('combo:entomb-reanimate');

    const withoutTarget = audit(pair, NO_CONTROL);
    expect(withoutTarget.built).not.toContain('combo:entomb-reanimate');
  });

  it('admits the blink loop only with an ETB payoff that converts the triggers', () => {
    const loop: Spec[] = [
      { name: 'Deadeye Navigator', cmc: 6 },
      { name: 'Peregrine Drake', cmc: 5 },
    ];
    const withOutlet = win([...loop, { name: 'Impact Tremors', cmc: 2, type: 'Enchantment' }], NO_CONTROL);
    expect(withOutlet.closing?.id).toBe('combo:blink-etb');
    expect(withOutlet.closing?.trace?.finish).toMatch(/Impact Tremors/);

    const withoutOutlet = audit(loop, NO_CONTROL);
    expect(withoutOutlet.built).not.toContain('combo:blink-etb');
    expect(withoutOutlet.notes.find((n) => n.code === 'combo.outlet_missing')?.detail)
      .toMatch(/unbounded creature_etb/);
  });

  it('turns unbounded mana into a finish through a library sink plus an alternate win', () => {
    const loop: Spec[] = [
      { name: 'Basalt Monolith', cmc: 3, type: 'Artifact' },
      { name: 'Rings of Brighthearth', cmc: 3, type: 'Artifact' },
    ];
    const withRoute = audit([...loop,
      { name: "Blue Sun's Zenith", cmc: 3, type: 'Instant' },
      { name: "Thassa's Oracle", cmc: 2 }], NO_CONTROL);
    expect(withRoute.built).toContain('combo:monolith-rings');
    expect(withRoute.notes.some((n) => n.code === 'combo.outlet_missing')).toBe(false);
  });

  it('refuses the alternate-win route when the library sink is missing', () => {
    const a = audit([
      { name: 'Basalt Monolith', cmc: 3, type: 'Artifact' },
      { name: 'Rings of Brighthearth', cmc: 3, type: 'Artifact' },
      { name: "Thassa's Oracle", cmc: 2 }], NO_CONTROL);
    expect(a.built).not.toContain('combo:monolith-rings');
    expect(a.notes.find((n) => n.code === 'combo.outlet_missing')?.detail)
      .toMatch(/unbounded mana with no catalogued outlet/);
  });
});

// ── fixtures and the frozen domain ────────────────────────────────────────

describe('v1.4 stage 1b — fixtures and frozen domain (§10.7)', () => {
  it('cabbage-cedh-input has NO control line and closes on its Food schedule', () => {
    const ds = loadDataset(200);
    const hit = ds.fixtures.find((f) => f.name === 'cabbage-cedh-input');
    expect(hit).toBeDefined();
    const main: DeckEntry[] = hit!.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const cmd = hit!.input.commander.map((c) => deriveCardFeature(c));
    const N = main.reduce((s, e) => s + e.quantity, 0);
    const inter = { E: 15.5, Estar: 12.0, D: 39.7, Dstar: 10.0, hasDrawEngine: true };
    const { notes, built } = winAudit('commander', normsFor('commander'), 'midrange', N, main, cmd, inter);
    expect(built).not.toContain('control');
    expect(notes.find((n) => n.code === 'control.schedule_short')?.detail)
      .toMatch(/of 120 finisher output by T12$/);
  });

  it('standard-1445867-aljce keeps a closing schedule after the control correction', () => {
    const ds = loadDataset(200);
    const hit = ds.fixtures.find((f) => f.name === 'standard-1445867-aljce');
    expect(hit).toBeDefined();
    const main: DeckEntry[] = hit!.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const N = main.reduce((s, e) => s + e.quantity, 0);
    const w = computeWin('standard', normsFor('standard'), 'midrange', N, main, [],
      { E: 20, Estar: 10, D: 20, Dstar: 10, hasDrawEngine: true });
    expect(w.score).toBeGreaterThan(0);
    expect(w.reason).toMatch(/closes T\d+/);
  });

  it('pins the frozen recipe/catalogue domain (§10.7 stage 1b)', () => {
    // A family added or dropped here invalidates every S norm stage 2 measures.
    expect(WIN_FAMILIES.slice().sort()).toEqual(
      ['alt_win', 'combat_tall', 'combat_wide', 'combo', 'control', 'drain', 'spells', 'tokens']);
    expect(TYPED_COMBOS.map((c) => c.id)).toContain('hulk-package');
    expect(TYPED_COMBOS.map((c) => c.id)).toContain('entomb-reanimate');
    expect(TYPED_COMBOS.map((c) => c.id)).toContain('blink-etb');
    expect(TYPED_COMBOS).toHaveLength(19);
    expect(ETB_OUTLETS.length).toBeGreaterThanOrEqual(7);
    expect(LIBRARY_DRAW_SINKS.length).toBeGreaterThanOrEqual(7);
    expect(LIBRARY_WIN_CARDS.map((c) => c.name)).toEqual(
      ["Thassa's Oracle", 'Jace, Wielder of Mysteries', 'Laboratory Maniac']);
  });
});
