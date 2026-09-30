// U9b — HIGH finding #1: the DEFAULT path of analyzeCommander (no opts, or
// opts without the new flags) must return exactly what b82d099 returned —
// Deck Score (deck-score.ts:99) calls it with no options at all, and every
// behaviour change landed since b82d099 (tribalPayoff, superfriends) must be
// opt-in. `baseline/commander-synergy-b82d099.ts` is `git show b82d099:...`
// verbatim (only the relative `./deck-templates` import path adjusted for its
// new folder depth) — a real, imports-resolved copy of the pinned behaviour,
// not a hand-transcribed expectation.
import { describe, it, expect } from 'vitest';
import { analyzeCommander as analyzeCommanderNow } from '../commander-synergy';
import { analyzeCommander as analyzeCommanderBaseline } from './baseline/commander-synergy-b82d099';

interface Case {
  name: string;
  oracleText: string;
  typeLine: string;
  colorIdentity: string[];
  manaCost?: string;
}

// 12 commander oracle texts spanning every archetype branch touched since
// b82d099: tribal-payoff creatures (Aeve, Edgar Markov), a planeswalker
// commander (Atraxa gets no superfriends read by either path — no `opts`),
// storm/spellslinger, five-color, x-spells, aristocrats, land-matters,
// aggro/voltron, midrange, a partner half, and a vanilla commander (null).
const CASES: Case[] = [
  {
    name: 'Aeve, Progenitor Ooze',
    oracleText:
      'Storm (When you cast this spell, copy it for each spell cast before it this turn. Copies become tokens.)\n' +
      "Aeve isn't legendary if it's a token.\n" +
      'Aeve enters with a +1/+1 counter on it for each other Ooze you control.',
    typeLine: 'Legendary Creature — Ooze',
    colorIdentity: ['G'],
    manaCost: '{2}{G}{G}{G}',
  },
  {
    name: 'Tam, the Possibility',
    oracleText:
      'Planeswalker spells you cast cost {1} less to cast.\n' +
      '{W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is the number of planeswalker types among planeswalkers you control.',
    typeLine: 'Legendary Creature — Gorgon Wizard',
    colorIdentity: ['G', 'U'],
    manaCost: '{1}{G}{U}',
  },
  {
    name: 'Atraxa, Praetors\' Voice',
    oracleText: 'Flying, vigilance, deathtouch, lifelink\nAt the beginning of your end step, proliferate.',
    typeLine: 'Legendary Creature — Phyrexian Angel Horror',
    colorIdentity: ['W', 'U', 'B', 'G'],
    manaCost: '{G}{W}{U}{B}',
  },
  {
    name: 'Edgar Markov',
    oracleText:
      'Eminence — Whenever you cast another Vampire spell, if Edgar is in the command zone or on the battlefield, create a 1/1 black Vampire creature token.\n' +
      'First strike, haste\n' +
      'Whenever Edgar attacks, put a +1/+1 counter on each Vampire you control.',
    typeLine: 'Legendary Creature — Vampire Knight',
    colorIdentity: ['R', 'W', 'B'],
    manaCost: '{3}{R}{W}{B}',
  },
  {
    name: 'Krenko, Mob Boss',
    oracleText: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',
    typeLine: 'Legendary Creature — Goblin Warrior',
    colorIdentity: ['R'],
    manaCost: '{2}{R}{R}',
  },
  {
    name: 'Tatyova, Benthic Druid',
    oracleText: 'Whenever a land enters the battlefield under your control, draw a card and you gain 1 life.',
    typeLine: 'Legendary Creature — Merfolk Druid',
    colorIdentity: ['G', 'U'],
    manaCost: '{2}{G}{U}',
  },
  {
    name: 'Fire Lord Azula (spellslinger)',
    oracleText: 'Whenever you cast an instant or sorcery spell, Fire Lord Azula deals 1 damage to any target.',
    typeLine: 'Legendary Creature — Human Warrior',
    colorIdentity: ['R'],
    manaCost: '{1}{R}{R}',
  },
  {
    name: 'Niv-Mizzet Reborn',
    oracleText: 'When Niv-Mizzet, Parun enters the battlefield, for each color, choose a color.',
    typeLine: 'Legendary Creature — Dragon',
    colorIdentity: ['U', 'B', 'R', 'G', 'W'],
    manaCost: '{U}{B}{R}{G}{W}',
  },
  {
    name: 'Meren of Clan Nel Toth',
    oracleText:
      'At the beginning of your end step, choose target creature card in your graveyard. If that card\'s owner has fewer experience counters than you, put it onto the battlefield under your control. Otherwise, put a +1/+1 counter on it and put it into its owner\'s hand.\n' +
      'Whenever another nontoken creature you control dies, you get an experience counter.',
    typeLine: 'Legendary Creature — Human Shaman',
    colorIdentity: ['B', 'G'],
    manaCost: '{3}{B}{G}',
  },
  {
    name: 'Teysa Karlov',
    oracleText: 'If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.\nWhenever you exile a card from a graveyard, create a 1/1 white Spirit creature token with flying.',
    typeLine: 'Legendary Creature — Human Advisor',
    colorIdentity: ['W', 'B'],
    manaCost: '{2}{W}{B}',
  },
  {
    name: 'Rodolf Duskbringer (vanilla, no oracle patterns)',
    oracleText: 'Rodolf Duskbringer is a legendary vampire with no relevant keyword text here.',
    typeLine: 'Legendary Creature — Vampire Noble',
    colorIdentity: ['B'],
    manaCost: '{2}{B}{B}',
  },
  {
    name: 'Thrasios, Triton Hero (partner half, x-spells via own X cost)',
    oracleText: '{1}, {T}, Sacrifice Thrasios, Triton Hero: Draw cards equal to the highest mana value among permanents you control.',
    typeLine: 'Legendary Creature — Merfolk Wizard',
    colorIdentity: ['G', 'U'],
    manaCost: '{X}{G}{U}',
  },
];

describe('analyzeCommander — default-path identity vs b82d099 (U9b #1)', () => {
  for (const c of CASES) {
    it(`${c.name}: default-path output equals b82d099`, () => {
      const now = analyzeCommanderNow(c.oracleText, c.typeLine, c.colorIdentity, c.manaCost);
      const baseline = analyzeCommanderBaseline(c.oracleText, c.typeLine, c.colorIdentity, c.manaCost);
      expect(now).toEqual(baseline);
    });
  }
});
