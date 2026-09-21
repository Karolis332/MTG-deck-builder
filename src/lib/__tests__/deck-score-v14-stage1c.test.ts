/**
 * Deck Score v1.4 stage 1c — the spellslinger / storm damage family, the
 * planeswalker loyalty column, and the re-classified W-zero audit.
 * docs/DECK_SCORE_SPEC.md §9.4, §10.6.2, §1 W.
 *
 * Stage 1b's audit classified 350 Commander lists (19.2 %) as `known_absent`,
 * every one of them on `combat_wide.schedule_short`, with Guttersnipe,
 * Coruscation Mage, Grapeshot, Mana Geyser and Torment of Hailfire as the top
 * causes by lift. Those decks kill with a CAST TRIGGER and an X/storm burst,
 * neither of which W could see. These tests pin each printed reading, its
 * negative (a pinger with nothing to cast, spells with nothing to trigger),
 * the shared mana debit, the whole-table predicate on an {X} finisher, and the
 * two audit/dispatch defects stage 1b reported.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { DbCard } from '../types';
import { computeWin, winAudit, WIN_FAMILIES, type WinTotals } from '../deck-score-win';
import {
  buildSpellSchedule, castTriggerOf, castTriggerFinisher, burstPayoffOf, burstFinish,
  isPrintedRitual,
} from '../deck-score-spells';
import { finisherOutputOf } from '../deck-score-finishers';
import { normsFor } from '../deck-score-norms';
import { deriveCardFeature, type CardFeature } from '../deck-score-features';
import { resolveLines } from '../deck-gate-parse';
import type { DeckEntry } from '../deck-score-mana';
import { subcommandArgs } from '../../../scripts/deck-score-bands';

vi.setConfig({ testTimeout: 120_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v14c-${idCounter}-${overrides.name}`,
    oracle_id: `v14c-oracle-${idCounter}`,
    mana_cost: '{1}{R}', cmc: 2, type_line: 'Creature — Human Shaman', oracle_text: null,
    colors: '["R"]', color_identity: '["R"]', keywords: '[]',
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
  name: string; cmc?: number; type?: string; text?: string; mana?: string;
  power?: string | null; keywords?: string; qty?: number;
}

function feature(spec: Spec): CardFeature {
  const type = spec.type ?? 'Creature — Human Shaman';
  const cmc = spec.cmc ?? 2;
  return deriveCardFeature(mkCard({
    name: spec.name, cmc, type_line: type, mana_cost: spec.mana ?? `{${cmc}}`,
    oracle_text: spec.text ?? null, keywords: spec.keywords ?? '[]',
    power: spec.power !== undefined ? spec.power : (/Creature/.test(type) ? '1' : null),
    toughness: /Creature/.test(type) ? '2' : null,
  }));
}

function entry(spec: Spec): DeckEntry {
  return { feature: feature(spec), quantity: spec.qty ?? 1 };
}

/** A real instant suite: what a cast trigger needs in order to trigger. */
function spellSuite(count: number): DeckEntry[] {
  return Array.from({ length: count }, (_, i) => entry({
    name: `Bolt ${i}`, cmc: 1, type: 'Instant', text: 'This spell deals 3 damage to target creature.',
  }));
}

function creatureFiller(count: number): DeckEntry[] {
  return Array.from({ length: count }, (_, i) => entry({ name: `Bear ${i}`, cmc: 3 }));
}

const GUTTERSNIPE = 'Whenever you cast an instant or sorcery spell, this creature deals 2 damage to each opponent.';
const PYROMANCER = 'Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.';
const VIVI = 'Whenever you cast a noncreature spell, put a +1/+1 counter on this creature and it deals 1 damage to each opponent.';
const DRAW_ONLY = 'Whenever you cast an instant or sorcery spell, draw a card.';
/** A pinger big enough to reach Commander's 120-damage predicate on its own —
 * the mechanism under test is the schedule, not any printed card's size. */
const BIG_PINGER = 'Whenever you cast an instant or sorcery spell, this creature deals 20 damage to each opponent.';

const NO_CONTROL: WinTotals = { E: 0, Estar: 10, D: 0, Dstar: 10, hasDrawEngine: false };

function scheduleOf(main: DeckEntry[], N?: number) {
  const total = N ?? main.reduce((s, e) => s + e.quantity, 0) + 36;
  return buildSpellSchedule('commander', total, main, (t) => t);
}

function winOf(main: DeckEntry[], commanders: Spec[] = []) {
  const N = main.reduce((s, e) => s + e.quantity, 0) + 36;
  return computeWin('commander', normsFor('commander'), 'midrange', N, main,
    commanders.map(feature), NO_CONTROL);
}

function auditOf(main: DeckEntry[]) {
  const N = main.reduce((s, e) => s + e.quantity, 0) + 36;
  return winAudit('commander', normsFor('commander'), 'midrange', N, main, [], NO_CONTROL);
}

// ── the spell schedule ────────────────────────────────────────────────────

describe('§9.4 spell schedule — casts come from density, mana and typed draw', () => {
  it('a deck with no noncreature spells casts nothing', () => {
    const sched = scheduleOf(creatureFiller(40));
    expect(sched.noncreatureCopies).toBe(0);
    expect(sched.noncreature.every((x) => x === 0)).toBe(true);
  });

  it('casts are bounded by the turn mana AND by what has been drawn', () => {
    const main = [...spellSuite(30), ...creatureFiller(10)];
    const sched = scheduleOf(main);
    // Turn 2 has 2 mana and the suite costs 1, so at most two casts; the
    // cumulative total can never exceed the copies in the deck.
    expect(sched.noncreature[2]).toBeLessThanOrEqual(2);
    expect(sched.cumNoncreature[12]).toBeLessThanOrEqual(sched.noncreatureCopies);
    expect(sched.cumNoncreature[12]).toBeGreaterThan(sched.cumNoncreature[4]);
  });

  it('the mana the casts spend is never more than the turn has', () => {
    const sched = scheduleOf([...spellSuite(40), ...creatureFiller(5)]);
    for (let t = 1; t <= 12; t++) expect(sched.manaSpent[t]).toBeLessThanOrEqual(t + 1e-9);
  });
});

// ── cast triggers ─────────────────────────────────────────────────────────

describe('§9.4 cast triggers — typed per-cast output', () => {
  it('reads Guttersnipe as damage to the whole table per instant/sorcery', () => {
    const trig = castTriggerOf(feature({ name: 'Guttersnipe', text: GUTTERSNIPE }), 3);
    expect(trig).not.toBeNull();
    expect(trig!.perCastDamage).toBe(6);
    expect(trig!.suite).toBe('instant_sorcery');
    expect(trig!.makesTokens).toBe(false);
  });

  it('reads a +1/+1-counter-and-ping commander as both, on the noncreature suite', () => {
    const trig = castTriggerOf(feature({ name: 'Vivi', text: VIVI, power: '0' }), 1);
    expect(trig!.perCastDamage).toBe(1);
    expect(trig!.perCastPermPower).toBe(1);
    expect(trig!.suite).toBe('noncreature');
  });

  it('reads a token-per-cast maker as accumulating body power', () => {
    const trig = castTriggerOf(feature({ name: 'Young Pyromancer', text: PYROMANCER }), 3);
    expect(trig!.perCastPermPower).toBe(1);
    expect(trig!.makesTokens).toBe(true);
    expect(trig!.perCastDamage).toBe(0);
  });

  it('a draw-only cast trigger supplies no finishing output', () => {
    expect(castTriggerOf(feature({ name: 'Archmage', text: DRAW_ONLY }), 3)).toBeNull();
  });

  it('a Defender gains no pump or counter from its own trigger', () => {
    const wall = feature({
      name: 'Electro Wall', type: 'Creature — Wall',
      text: 'Defender\nWhenever you cast an instant or sorcery spell, put a +1/+1 counter on this creature.',
    });
    expect(castTriggerOf(wall, 3)).toBeNull();
  });

  it('pingers with NOTHING to cast schedule zero output', () => {
    const main = [entry({ name: 'Guttersnipe', text: GUTTERSNIPE, qty: 4 }), ...creatureFiller(40)];
    const sched = scheduleOf(main);
    const out = castTriggerFinisher(feature({ name: 'Guttersnipe', text: GUTTERSNIPE }), 3, sched);
    expect(out).toBeNull();
  });

  it('pingers WITH a spell suite schedule positive output', () => {
    const main = [entry({ name: 'Guttersnipe', text: GUTTERSNIPE, qty: 4 }), ...spellSuite(45)];
    const sched = scheduleOf(main);
    const out = castTriggerFinisher(feature({ name: 'Guttersnipe', text: GUTTERSNIPE }), 3, sched);
    expect(out).not.toBeNull();
    expect(out!.kind).toBe('cast_trigger');
    expect(out!.perTurn).toBeGreaterThan(0);
    expect(out!.outputAt!(8)).toBeGreaterThan(0);
    // Four 1-power Guttersnipes and 45 one-mana spells still fall a long way
    // short of 120 to the whole table, so the family is PRICED, not admitted.
    const { built, notes } = auditOf(main);
    expect(built).not.toContain('spells');
    expect(notes.some((n) => n.code === 'spells.schedule_short')).toBe(true);
  });

  it('a pinger big enough to reach the predicate builds the spells line', () => {
    const main = [entry({ name: 'Mega Snipe', text: BIG_PINGER, qty: 4 }), ...spellSuite(45)];
    const { built } = auditOf(main);
    expect(built).toContain('spells');
  });

  it('a spell suite with NO cast trigger builds no spells line and says so', () => {
    const { built, notes } = auditOf([...spellSuite(45), ...creatureFiller(10)]);
    expect(built).not.toContain('spells');
    expect(notes.some((n) => n.code === 'spells.no_cast_trigger')).toBe(true);
  });

  it('the spells line closes faster than the same deck without its pingers', () => {
    const suite = spellSuite(45);
    const withPingers = winOf([entry({ name: 'Mega Snipe', text: BIG_PINGER, qty: 4 }), ...suite]);
    const without = winOf([...suite, ...creatureFiller(4)]);
    expect(withPingers.score).toBeGreaterThan(without.score);
    expect(without.score).toBe(0);
  });
});

// ── the shared mana debit ─────────────────────────────────────────────────

describe('§9.4 debits — the turn mana is charged once', () => {
  it('a cast trigger declares a shared key and a turn-varying spend', () => {
    const sched = scheduleOf([...spellSuite(45), entry({ name: 'Guttersnipe', text: GUTTERSNIPE })]);
    const out = castTriggerFinisher(feature({ name: 'Guttersnipe', text: GUTTERSNIPE }), 3, sched)!;
    expect(out.shareKey).toBe('spellslinger');
    expect(out.upkeepMana).toBe(0);
    expect(out.upkeepAt!(6)).toBeGreaterThan(0);
    expect(out.upkeepAt!(6)).toBeLessThanOrEqual(6);
  });

  it('the shared spell spend follows the suite, not the number of pingers', () => {
    const suite = spellSuite(45);
    const one = scheduleOf([entry({ name: 'Mega Snipe', text: BIG_PINGER, qty: 1 }), ...suite], 85);
    const four = scheduleOf([entry({ name: 'Mega Snipe', text: BIG_PINGER, qty: 4 }), ...suite], 85);
    expect(four.manaSpent).toEqual(one.manaSpent);
    expect(four.manaSpent[6]).toBeGreaterThan(0);
    // More copies raise expected copies on board and access, never the number
    // of spells the turn pays for.
    const w1 = winOf([entry({ name: 'Mega Snipe', text: BIG_PINGER, qty: 1 }), ...suite]);
    const w4 = winOf([entry({ name: 'Mega Snipe', text: BIG_PINGER, qty: 4 }), ...suite]);
    expect(w4.score).toBeGreaterThanOrEqual(w1.score);
  });
});

// ── rituals and burst mana ────────────────────────────────────────────────

describe('§10.2 burst mana — typed, bounded, and never counted twice', () => {
  const song = { name: 'Seething Song', cmc: 3, type: 'Instant', text: 'Add {R}{R}{R}{R}{R}.' };
  const geyser = {
    name: 'Mana Geyser', cmc: 5, type: 'Sorcery',
    text: 'Add {R} for each tapped land your opponents control.',
  };

  it('a printed ritual with a countable yield is typed; an unbounded one is not', () => {
    expect(isPrintedRitual(feature(song))).toBe(true);
    expect(isPrintedRitual(feature(geyser))).toBe(false);
  });

  it('an unbounded ritual adds no burst mana and is named in the trace', () => {
    const sched = scheduleOf([entry(geyser), ...spellSuite(40)]);
    expect(sched.burstMana.every((x) => x === 0)).toBe(true);
    expect(sched.trace).toContain('unbounded ritual');
  });

  it('a ritual already paid into the ramp bonus is not also paid as burst', () => {
    // `deck-score-win.ts` pays cheap typed ramp into `manaAt`; the same card
    // must not appear in `burstMana` as well.
    const ramp = feature({ name: 'Pyretic Ritual', cmc: 2, type: 'Instant', text: 'Add {R}{R}{R}.' });
    const sched = scheduleOf([{ feature: ramp, quantity: 4 }, ...spellSuite(40)]);
    if (ramp.isRamp && ramp.c <= 3) expect(sched.burstMana.every((x) => x === 0)).toBe(true);
    else expect(sched.burstMana[8]).toBeGreaterThan(0);
  });
});

// ── storm and {X} finishers ───────────────────────────────────────────────

describe('§9.4 burst finishers — storm copies and {X} spells', () => {
  const tendrils = feature({
    name: 'Tendrils of Agony', cmc: 4, type: 'Sorcery', mana: '{2}{B}{B}',
    text: 'Target player loses 2 life and you gain 2 life.\nStorm (When you cast this spell, copy it for each spell cast before it this turn.)',
  });
  const brainFreeze = feature({
    name: 'Brain Freeze', cmc: 2, type: 'Instant', mana: '{1}{U}',
    text: 'Target player mills three cards.\nStorm (When you cast this spell, copy it for each spell cast before it this turn.)',
  });
  const exsanguinate = feature({
    name: 'Exsanguinate', cmc: 2, type: 'Sorcery', mana: '{X}{B}{B}',
    text: 'Each opponent loses X life. You gain life equal to the life lost this way.',
  });
  const crackle = feature({
    name: 'Crackle with Power', cmc: 5, type: 'Sorcery', mana: '{X}{X}{X}{R}{R}',
    text: 'This spell deals five times X damage to each of up to X targets.',
  });
  const hailfire = feature({
    name: 'Torment of Hailfire', cmc: 2, type: 'Sorcery', mana: '{X}{B}{B}',
    text: 'Repeat the following process X times. Each opponent loses 3 life unless that player sacrifices a nonland permanent of their choice or discards a card.',
  });

  it('a storm copy count comes from the schedule, not a constant', () => {
    const p = burstPayoffOf(tendrils, 1, false, 3)!;
    expect(p.kind).toBe('storm');
    // storm N = the spells cast before it this turn, so N + 1 copies. Output is
    // weighted by the card's support coefficient, exactly as every other source.
    expect(p.damageWith(10, 0)).toBe(2 * tendrils.s);
    expect(p.damageWith(10, 4)).toBe(10 * tendrils.s);
  });

  it('a storm spell with no damage or life loss proves nothing', () => {
    expect(burstPayoffOf(brainFreeze, 1, false, 3)).toBeNull();
  });

  it('an {X} drain is measured against the WHOLE table', () => {
    const p = burstPayoffOf(exsanguinate, 1, false, 3)!;
    expect(p.kind).toBe('x_spell');
    // {X}{B}{B}: X = mana - 2, each of three opponents loses X.
    expect(p.damageWith(12, 0)).toBe(30);
    expect(p.damageWith(42, 0)).toBeGreaterThanOrEqual(120);
    expect(p.damageWith(12, 0)).toBeLessThan(120);
  });

  it('parses a multi-{X} cost and its damage multiplier', () => {
    const p = burstPayoffOf(crackle, 1, false, 3)!;
    // {X}{X}{X}{R}{R}: X = floor((mana - 2)/3); 5X damage to min(X, opponents).
    expect(p.damageWith(11, 0)).toBe(45 * crackle.s);
    expect(p.damageWith(5, 0)).toBe(5 * crackle.s);
  });

  it('a conditional "unless that player sacrifices" clause is not provable damage', () => {
    expect(burstPayoffOf(hailfire, 1, false, 3)).toBeNull();
  });

  it('burstFinish returns no turn when no payoff reaches the predicate', () => {
    const sched = scheduleOf([...spellSuite(40), { feature: tendrils, quantity: 1 }]);
    const out = burstFinish(sched, [burstPayoffOf(tendrils, 1, false, 3)!], (t) => t, 120);
    expect(out.tStar).toBeNull();
    expect(out.ceiling).toBeLessThan(120);
    expect(out.trace).toContain('of 120');
  });

  it('burstFinish returns the first turn a payoff DOES reach it', () => {
    const sched = scheduleOf([...spellSuite(40), { feature: exsanguinate, quantity: 1 }]);
    const out = burstFinish(sched, [burstPayoffOf(exsanguinate, 1, false, 3)!], (t) => t * 8, 120);
    expect(out.tStar).not.toBeNull();
    expect(out.tStar!).toBeLessThanOrEqual(12);
  });
});

// ── the loyalty column (stage 1b defect §7) ───────────────────────────────

describe('deck-gate-parse CARD_COLS includes loyalty', () => {
  it('resolves a planeswalker with its printed starting loyalty', () => {
    const { resolved } = resolveLines(
      [{ quantity: 1, name: 'Chandra, Torch of Defiance', board: 'main' }], 'commander');
    expect(resolved).toHaveLength(1);
    expect(Number(resolved[0].card.loyalty)).toBeGreaterThan(0);
  });

  it('the one fixture walker the rules credit now supplies output, and it is small', () => {
    // `vivi-battery-arena` carries Tezzeret, Cruel Captain and Ral, Crackling
    // Wit. Only Ral prints an ability `walkerOutput` credits (`+1: Create a
    // 1/1 ... creature token`), and one power per turn moved no fixture's t*,
    // which is why the column change alone left all 16 scores unchanged.
    const { resolved } = resolveLines(
      [{ quantity: 1, name: 'Ral, Crackling Wit', board: 'main' },
        { quantity: 1, name: 'Tezzeret, Cruel Captain', board: 'main' }], 'brawl');
    const [ral, tezzeret] = resolved.map((r) => finisherOutputOf(deriveCardFeature(r.card), 1, 1));
    expect(ral?.kind).toBe('walker');
    expect(ral?.perTurn).toBe(1);
    expect(tezzeret).toBeNull();
  });

  it('a walker resolved that way schedules non-zero finisher output', () => {
    const { resolved } = resolveLines(
      [{ quantity: 1, name: 'Chandra, Torch of Defiance', board: 'main' }], 'commander');
    const out = finisherOutputOf(deriveCardFeature(resolved[0].card), 3, 1);
    expect(out).not.toBeNull();
    expect(out!.kind).toBe('walker');
    expect(out!.perTurn).toBeGreaterThan(0);
  });
});

// ── the audit and the bands dispatch (stage 1b defects) ───────────────────

describe('§10.6.2 audit surface and the bands dispatch', () => {
  it('a family that scheduled and fell short reports a schedule_short, not an absence', () => {
    // Four 1-power bears cannot deal 120; the family IS present and priced.
    const { notes } = auditOf(creatureFiller(40));
    expect(notes.some((n) => n.code === 'combat_wide.schedule_short')).toBe(true);
    expect(notes.every((n) => n.code !== 'combat_wide.no_output_source')).toBe(true);
  });

  it('a deck with no output source at all reports the absence instead', () => {
    const lands = Array.from({ length: 40 }, (_, i) => entry({
      name: `Wastes ${i}`, cmc: 0, type: 'Land', text: null as unknown as string, power: null,
    }));
    const { notes } = auditOf(lands);
    expect(notes.some((n) => n.code.endsWith('.no_output_source'))).toBe(true);
  });

  it('`--profile commander` no longer swallows the named subcommand', () => {
    const argv = subcommandArgs(['node', 'bands.ts', 'controls', '--stride', '--profile', 'commander']);
    expect(argv.includes('commander')).toBe(false);
    expect(argv.includes('controls')).toBe(true);
    expect(subcommandArgs(['node', 'bands.ts', 'real', '--profile', 'brawl', '--wzero']))
      .toEqual(['node', 'bands.ts', 'real', '--wzero']);
  });
});

// ── the frozen domain ─────────────────────────────────────────────────────

describe('§10.7 domain freeze', () => {
  it('the spellslinger family is part of the frozen W domain', () => {
    expect(WIN_FAMILIES).toContain('spells');
    const frozen = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'verify-2026-09-19', 'deck-score', 'domain-v14.json'), 'utf-8'));
    expect(frozen.winFamilies).toEqual([...WIN_FAMILIES].sort());
    expect(frozen.catalogSha256).toBe('21fa0be02940c884620b08cfd3cbf9558fb42abf1f7d31428c38fda167da2c6b');
    expect(frozen.combosSha256).toBe('19acb60cf6b088f831c4e8a671e8ac7e7a63da6441ca34d56c15afb8bb5d8a82');
  });
});
