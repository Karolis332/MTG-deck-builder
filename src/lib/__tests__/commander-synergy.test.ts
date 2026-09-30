import { describe, it, expect } from 'vitest';
import { analyzeCommander } from '../commander-synergy';

describe('analyzeCommander — attack_trigger vs damage-dealt-to-controller', () => {
  it('does not label The Cabbage Merchant voltron (defensive combat-damage trigger, not an attacker)', () => {
    // Real oracle text (data/mtg-deck-builder.db): a Food-token engine whose
    // only "combat damage" clause describes damage dealt TO the controller,
    // not the commander attacking.
    const oracleText =
      'Whenever an opponent casts a noncreature spell, create a Food token. (It\'s an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")\n' +
      'Whenever a creature deals combat damage to you, sacrifice a Food token.\n' +
      'Tap two untapped Foods you control: Add one mana of any color.';
    const profile = analyzeCommander(oracleText, 'Legendary Creature — Human Citizen', ['G'], '{2}{G}');

    expect(profile).not.toBeNull();
    expect(profile!.detectedArchetype).not.toBe('voltron');
    expect(profile!.triggerCategories).not.toContain('attack_trigger');
    // Food token creation still registers as token_generation.
    expect(profile!.triggerCategories).toContain('token_generation');
  });

  it('still detects a real attacker as attack_trigger/voltron (regression)', () => {
    // Rafiq of the Many — attacks, does not deal damage to its controller.
    const oracleText =
      'Flying, vigilance\n' +
      'Whenever Rafiq of the Many attacks, target creature you control gets +2/+2 and gains flying until end of turn.';
    const profile = analyzeCommander(oracleText, 'Legendary Creature — Human Knight', ['G', 'U', 'W'], '{G}{W}{U}');

    expect(profile).not.toBeNull();
    expect(profile!.triggerCategories).toContain('attack_trigger');
    expect(profile!.detectedArchetype).toBe('voltron');
  });

  it('excludes "to you or a planeswalker you control" and "is dealt to you" clauses', () => {
    const toYouOrPw =
      'Whenever a creature deals combat damage to you or a planeswalker you control, draw a card.';
    const profile1 = analyzeCommander(toYouOrPw, 'Legendary Creature — Human', ['U'], '{2}{U}');
    expect(profile1?.triggerCategories ?? []).not.toContain('attack_trigger');

    // Positive pattern hit ("attacks") plus the passive-voice exclusion
    // phrase, isolated from the other two exclusion phrases in this clause.
    const isDealtToYou =
      'Whenever a creature attacks you, if damage is dealt to you this turn, mill a card.';
    const profile2 = analyzeCommander(isDealtToYou, 'Legendary Creature — Human', ['U'], '{2}{U}');
    expect(profile2?.triggerCategories ?? []).not.toContain('attack_trigger');
  });
});

describe('analyzeCommander — attack_trigger exclusion, each phrase in isolation (Round 3)', () => {
  // Each clause below is engineered to hit a positive attack_trigger pattern
  // (so the test would fail if the exclusion regex it targets were removed)
  // while containing exactly the one exclusion phrase under test.
  const cases: Array<[string, string]> = [
    ['attacks you', 'Whenever a creature attacks you, draw a card.'],
    ['attacks you or a planeswalker you control', 'Whenever a creature attacks you or a planeswalker you control, draw a card.'],
    ['deals combat damage to you', 'Whenever a creature deals combat damage to you, draw a card.'],
    ['deals damage to you', 'Whenever a creature attacks, it deals damage to you.'],
    ['is dealt to you', 'Whenever a creature attacks, damage is dealt to you.'],
  ];

  it.each(cases)('excludes clauses containing "%s"', (_label, oracleText) => {
    const profile = analyzeCommander(oracleText, 'Legendary Creature — Human', ['U'], '{2}{U}');
    expect(profile?.triggerCategories ?? []).not.toContain('attack_trigger');
  });
});

// 2026-09-22: Spider-Man 2099's end-step damage trigger fires off "cast a
// spell this turn from anywhere other than your hand" — not literally
// "from exile" — so it fell through every existing category and a
// keyword scan called the deck aggro off "double strike, vigilance" alone.
describe('analyzeCommander — alt_zone_cast (cast from anywhere other than hand)', () => {
  it('Spider-Man 2099: alt_zone_cast trigger detected, archetype is spellslinger (not aggro)', () => {
    const oracle =
      "From the Future — You can't cast Spider-Man 2099 during your first, second, or third turns of the game.\n" +
      'Double strike, vigilance\n' +
      "At the beginning of your end step, if you've played a land or cast a spell this turn from anywhere other than your hand, Spider-Man 2099 deals damage equal to his power to any target.";
    const profile = analyzeCommander(oracle, 'Legendary Creature — Human', ['R'], '{3}{R}');
    expect(profile?.triggerCategories ?? []).toContain('alt_zone_cast');
    expect(profile?.detectedArchetype).toBe('spellslinger');
    expect(profile?.detectedArchetype).not.toBe('aggro');
  });

  it('a plain double-strike commander with an attack + counters trigger stays aggro (control: no alt-zone category, existing aggro path untouched)', () => {
    const oracle = 'Double strike, vigilance\nWhenever this creature attacks, put a +1/+1 counter on target creature.';
    const profile = analyzeCommander(oracle, 'Legendary Creature — Human', ['R'], '{3}{R}');
    expect(profile?.triggerCategories ?? []).not.toContain('alt_zone_cast');
    expect(profile?.detectedArchetype).toBe('aggro');
  });
});

// 2026-09-26: U1a — a commander whose own text scales with/pays off a
// creature type it shares reads as tribal, even when it also has Storm
// (Aeve's copies are creature tokens, not a spells-matter payoff). Real
// oracle text pulled from data/mtg-deck-builder.db.
describe('analyzeCommander — tribal payoff vs storm/spellslinger (U1a, opt-in U9b)', () => {
  const AEVE_ORACLE =
    'Storm (When you cast this spell, copy it for each spell cast before it this turn. Copies become tokens.)\n' +
    "Aeve isn't legendary if it's a token.\n" +
    'Aeve enters with a +1/+1 counter on it for each other Ooze you control.';
  const EDGAR_ORACLE =
    'Eminence — Whenever you cast another Vampire spell, if Edgar is in the command zone or on the battlefield, create a 1/1 black Vampire creature token.\n' +
    'First strike, haste\n' +
    'Whenever Edgar attacks, put a +1/+1 counter on each Vampire you control.';

  it('is opt-in: byte-identical (tribalPayoff null, pre-tribal archetype) when opts is omitted — Aeve reads spellslinger via storm, Edgar reads aggro', () => {
    const aeve = analyzeCommander(AEVE_ORACLE, 'Legendary Creature — Ooze', ['G'], '{2}{G}{G}{G}');
    expect(aeve?.detectedArchetype).not.toBe('tribal');
    const edgar = analyzeCommander(EDGAR_ORACLE, 'Legendary Creature — Vampire Knight', ['R', 'W', 'B'], '{3}{R}{W}{B}');
    expect(edgar?.detectedArchetype).toBe('aggro');
  });

  it('Aeve, Progenitor Ooze: tribal/ooze, counters kept, storm stays a secondary category (opted in)', () => {
    const profile = analyzeCommander(AEVE_ORACLE, 'Legendary Creature — Ooze', ['G'], '{2}{G}{G}{G}', { tribalPayoff: true });
    expect(profile?.detectedArchetype).toBe('tribal');
    expect(profile?.triggerCategories).toContain('storm');
    expect(profile?.triggerCategories).toContain('counters');
  });

  it('Talrand, Sky Summoner: instant/sorcery payoff stays spellslinger (no tribe, opted in)', () => {
    const oracle = 'Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying.';
    const profile = analyzeCommander(oracle, 'Legendary Creature — Merfolk Wizard', ['U'], '{2}{U}{U}', { tribalPayoff: true });
    expect(profile?.detectedArchetype).toBe('spellslinger');
  });

  it('Vivi Ornitier: X-mana + self-buff stays spellslinger, counters suppressed (self-buff, not broad; opted in)', () => {
    const oracle =
      "{0}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power. Activate only during your turn and only once each turn.\n" +
      'Whenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent.';
    const profile = analyzeCommander(oracle, 'Legendary Creature — Wizard', ['U', 'R'], '{1}{U}{R}', { tribalPayoff: true });
    expect(profile?.detectedArchetype).toBe('spellslinger');
    expect(profile?.triggerCategories).not.toContain('counters');
  });

  it('Krenko, Mob Boss: no synergy trigger matches this text (pre-existing gap — token_generation\'s regex misses "X 1/1 ... tokens"), so analyzeCommander returns null and the tribal read comes from deck-builder-ai\'s tribalType fallback, unaffected here', () => {
    const oracle = '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.';
    const profile = analyzeCommander(oracle, 'Legendary Creature — Goblin Warrior', ['R'], '{2}{R}{R}', { tribalPayoff: true });
    expect(profile).toBeNull();
  });

  it('Edgar Markov: eminence + attack-trigger counters on each Vampire → tribal/vampire (opted in)', () => {
    const profile = analyzeCommander(EDGAR_ORACLE, 'Legendary Creature — Vampire Knight', ['R', 'W', 'B'], '{3}{R}{W}{B}', { tribalPayoff: true });
    expect(profile?.detectedArchetype).toBe('tribal');
  });

  it('Ezuri, Claw of Progress: no shared tribe — counters category kept, not tribal (opted in)', () => {
    const oracle =
      'Whenever a creature you control with power 2 or less enters, you get an experience counter.\n' +
      'At the beginning of combat on your turn, put X +1/+1 counters on another target creature you control, where X is the number of experience counters you have.';
    const profile = analyzeCommander(oracle, 'Legendary Creature — Phyrexian Elf Warrior', ['G', 'U'], '{2}{G}{U}', { tribalPayoff: true });
    expect(profile?.triggerCategories).toContain('counters');
    expect(profile?.detectedArchetype).not.toBe('tribal');
  });
});

describe('analyzeCommander — superfriends (opt-in, U6 2026-09-30)', () => {
  const TAM_ORACLE =
    'Planeswalker spells you cast cost {1} less to cast.\n' +
    '{W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is the number of planeswalker types among planeswalkers you control.';
  const ATRAXA_ORACLE =
    'Flying, vigilance, deathtouch, lifelink\n' +
    'At the beginning of your end step, proliferate.';
  const GUFF_ORACLE =
    'At the beginning of your end step, put a loyalty counter on another target planeswalker you control.\n' +
    '+1: Create a 1/1 red Wizard creature token with "{T}: Add {R}. Spend this mana only to cast a planeswalker spell."\n' +
    '−3: You draw X cards and Commodore Guff deals X damage to each opponent, where X is the number of planeswalkers you control.';
  const DIHADA_ORACLE =
    '+2: Up to one target legendary creature gains vigilance, lifelink, and indestructible until your next turn.\n' +
    '−3: Reveal the top four cards of your library. Put any number of legendary cards from among them into your hand and the rest into your graveyard. Create a Treasure token for each card put into your graveyard this way.\n' +
    '−11: Gain control of all nonland permanents until end of turn. Untap them. They gain haste until end of turn.';

  it('is opt-in: byte-identical (no planeswalker trigger) when opts is omitted', () => {
    const withoutOpts = analyzeCommander(TAM_ORACLE, 'Legendary Creature — Gorgon Wizard', ['G', 'U'], '{1}{G}{U}');
    expect(withoutOpts?.triggerCategories ?? []).not.toContain('planeswalker');
    expect(withoutOpts?.detectedArchetype).not.toBe('superfriends');
  });

  it('Tam, the Possibility → planeswalker + superfriends (opted in)', () => {
    const profile = analyzeCommander(
      TAM_ORACLE, 'Legendary Creature — Gorgon Wizard', ['G', 'U'], '{1}{G}{U}',
      { superfriends: true },
    );
    expect(profile?.triggerCategories).toContain('planeswalker');
    expect(profile?.detectedArchetype).toBe('superfriends');
  });

  it('Atraxa, Praetors\' Voice (proliferate-only) → planeswalker + superfriends (opted in)', () => {
    const profile = analyzeCommander(
      ATRAXA_ORACLE, 'Legendary Creature — Phyrexian Angel Horror', ['W', 'U', 'B', 'G'], '{G}{W}{U}{B}',
      { superfriends: true },
    );
    expect(profile?.triggerCategories).toContain('planeswalker');
    expect(profile?.detectedArchetype).toBe('superfriends');
  });

  it('Commodore Guff (loyalty counter / planeswalker spell text) → planeswalker + superfriends', () => {
    const profile = analyzeCommander(
      GUFF_ORACLE, 'Legendary Planeswalker — Guff', ['R'], '{2}{R}{R}',
      { superfriends: true },
    );
    expect(profile?.triggerCategories).toContain('planeswalker');
    expect(profile?.detectedArchetype).toBe('superfriends');
  });

  it('Dihada, Binder of Wills (walker commander, no "planeswalker" in oracle text) → planeswalker via type-line fallback', () => {
    const profile = analyzeCommander(
      DIHADA_ORACLE, 'Legendary Planeswalker — Dihada', ['B', 'R'], '{2}{B}{R}',
      { superfriends: true },
    );
    expect(profile?.triggerCategories).toContain('planeswalker');
    expect(profile?.detectedArchetype).toBe('superfriends');
  });

  it('99-shape supplement: a non-walker commander with a walker-heavy pool still reads superfriends', () => {
    const oracle = 'Whenever you gain life, draw a card.';
    const profile = analyzeCommander(
      oracle, 'Legendary Creature — Human Cleric', ['W'], '{2}{W}',
      { superfriends: true, walkerCount: 14 },
    );
    expect(profile?.triggerCategories).toContain('planeswalker');
    expect(profile?.detectedArchetype).toBe('superfriends');
  });

  it('a non-walker commander stays unchanged even with superfriends opted in', () => {
    const oracle = 'Whenever you gain life, draw a card.';
    const profile = analyzeCommander(
      oracle, 'Legendary Creature — Human Cleric', ['W'], '{2}{W}',
      { superfriends: true },
    );
    expect(profile?.triggerCategories ?? []).not.toContain('planeswalker');
    expect(profile?.detectedArchetype).not.toBe('superfriends');
  });
});
