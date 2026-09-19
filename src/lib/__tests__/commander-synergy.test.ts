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
