import { describe, it, expect } from 'vitest';
import { deriveWinPlan, COMBO_PAIRS, ALT_WIN_NAMES, type WinPlanInput } from '../win-conditions';
import type { CommanderSynergyProfile } from '../commander-synergy';

function profile(overrides: Partial<CommanderSynergyProfile> = {}): CommanderSynergyProfile {
  return {
    detectedArchetype: null,
    triggerCategories: [],
    payoffType: 'general value',
    synergyMinimums: {},
    cardPoolPatterns: [],
    scoreBonuses: {},
    protectedPatterns: [],
    strategyDescription: '',
    drawReduction: 0,
    removalReduction: 0,
    ...overrides,
  };
}

describe('deriveWinPlan — route detection', () => {
  it('Krenko, Mob Boss (token_generation trigger) resolves to combat_wide', () => {
    const input: WinPlanInput = {
      commander: {
        name: 'Krenko, Mob Boss',
        oracleText: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',
        typeLine: 'Legendary Creature — Goblin Warrior',
      },
      synergyProfile: profile({ triggerCategories: ['token_generation'], detectedArchetype: 'aggro' }),
      cards: [
        { name: 'Krenko\'s Command', oracleText: 'Create two 1/1 red Goblin creature tokens.', typeLine: 'Sorcery', cmc: 2 },
        { name: 'Coat of Arms', oracleText: 'Each creature gets +1/+1 for each other creature on the battlefield that shares at least one creature type with it.', typeLine: 'Artifact', cmc: 5 },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.route).toBe('combat_wide');
  });

  it('Krenko, Mob Boss STILL resolves to combat_wide even when the commander-synergy.ts trigger regex misses it', () => {
    // Regression: commander-synergy.ts's TRIGGER_PATTERNS.token_generation
    // does not match Krenko's real oracle text (the "X 1/1 ... tokens"
    // power/toughness notation breaks its regex) — a pre-existing gap in a
    // file this round is not allowed to touch. deriveWinPlan must not
    // silently produce the wrong route just because the upstream trigger
    // detection under-fires; it falls back to tagging the commander's own
    // oracle text directly.
    const input: WinPlanInput = {
      commander: {
        name: 'Krenko, Mob Boss',
        oracleText: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',
        typeLine: 'Legendary Creature — Goblin Warrior',
      },
      synergyProfile: profile({ triggerCategories: [], detectedArchetype: null }), // empty on purpose
      cards: [
        { name: 'Krenko\'s Command', oracleText: 'Create two 1/1 red Goblin creature tokens.', typeLine: 'Sorcery', cmc: 2 },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.route).toBe('combat_wide');
  });

  it('Meren of Clan Nel Toth (creature_dies trigger) resolves to drain', () => {
    const input: WinPlanInput = {
      commander: {
        name: 'Meren of Clan Nel Toth',
        oracleText: "Whenever another creature you control dies, you get an experience counter. At the beginning of your end step, choose target creature card in your graveyard. If that card's mana value is less than or equal to the number of experience counters you have, return it to the battlefield. Otherwise, put it into your hand.",
        typeLine: 'Legendary Creature — Human Shaman',
      },
      synergyProfile: profile({ triggerCategories: ['creature_dies', 'graveyard'], detectedArchetype: 'aristocrats' }),
      cards: [
        { name: 'Blood Artist', oracleText: 'Whenever this creature or another creature dies, target player loses 1 life and you gain 1 life.', typeLine: 'Creature — Vampire', cmc: 2 },
        { name: 'Viscera Seer', oracleText: 'Sacrifice a creature: Scry 1.', typeLine: 'Creature — Vampire Wizard', cmc: 1 },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.route).toBe('drain');
    // "value via creature_death" — the description names the mechanism.
    expect(plan.description.toLowerCase()).toContain('creature');
  });

  it('Heliod, Sun-Crowned + Walking Ballista in the 99 resolves to combo', () => {
    const input: WinPlanInput = {
      commander: {
        name: 'Heliod, Sun-Crowned',
        oracleText: 'Indestructible\nAs long as your devotion to white is less than five, Heliod isn\'t a creature.\nWhenever you gain life, put a +1/+1 counter on target creature or enchantment you control.\n{1}{W}: Another target creature gains lifelink until end of turn.',
        typeLine: 'Legendary Enchantment Creature — God',
      },
      synergyProfile: profile({ triggerCategories: ['lifegain', 'counters'], detectedArchetype: 'midrange' }),
      cards: [
        {
          name: 'Walking Ballista',
          oracleText: 'This creature enters with X +1/+1 counters on it.\n{4}: Put a +1/+1 counter on this creature.\nRemove a +1/+1 counter from this creature: It deals 1 damage to any target.',
          typeLine: 'Artifact Creature — Construct',
          cmc: 0,
        },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.route).toBe('combo');
    expect(plan.keyCards.enablers).toContain('Heliod, Sun-Crowned');
    expect(plan.keyCards.payoffs).toContain('Walking Ballista');
  });

  it('does NOT resolve to combo when only one piece of a known pair is present', () => {
    const input: WinPlanInput = {
      commander: { name: 'Some Commander', oracleText: '', typeLine: 'Legendary Creature — Human' },
      synergyProfile: profile(),
      cards: [
        { name: 'Walking Ballista', oracleText: 'Remove a +1/+1 counter from this creature: It deals 1 damage to any target.', typeLine: 'Artifact Creature — Construct', cmc: 0 },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.route).not.toBe('combo');
    // Near-miss suggestion: Heliod is one card away.
    expect(plan.missingPieces.some((n) => n.toLowerCase().includes('heliod'))).toBe(true);
  });

  it('a named alt-win card resolves to alt_win', () => {
    const input: WinPlanInput = {
      commander: { name: 'Some Commander', oracleText: '', typeLine: 'Legendary Creature — Human' },
      synergyProfile: profile(),
      cards: [
        { name: "Maze's End", oracleText: '{T}: Add {C}. If you control ten or more Gates, you may... you win the game.', typeLine: 'Land', cmc: 0 },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.route).toBe('alt_win');
    expect(plan.keyCards.payoffs).toContain("Maze's End");
  });

  it('falls back to value_grind when no signal is present', () => {
    const input: WinPlanInput = {
      commander: { name: 'Vanilla Commander', oracleText: '', typeLine: 'Legendary Creature — Human' },
      synergyProfile: null,
      cards: [
        { name: 'Grizzly Bears', oracleText: '', typeLine: 'Creature — Bear', cmc: 2 },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.route).toBe('value_grind');
  });

  it('tags every deck card with a plan role', () => {
    const input: WinPlanInput = {
      commander: {
        name: 'Krenko, Mob Boss',
        oracleText: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',
        typeLine: 'Legendary Creature — Goblin Warrior',
      },
      synergyProfile: profile({ triggerCategories: ['token_generation'] }),
      cards: [
        { name: 'Krenko\'s Command', oracleText: 'Create two 1/1 red Goblin creature tokens.', typeLine: 'Sorcery', cmc: 2 },
        { name: 'Lightning Greaves', oracleText: 'Equipped creature has haste and shroud.', typeLine: 'Artifact — Equipment', cmc: 2 },
        { name: 'Demonic Tutor', oracleText: 'Search your library for a card, put that card into your hand, then shuffle.', typeLine: 'Sorcery', cmc: 2 },
        // A vanilla creature is NOT a clean off-plan example here — it
        // structurally produces creatures_etb (any creature does), which the
        // combat_wide heuristic reasonably counts as a go-wide enabler. Use
        // a removal spell instead: no token/creature production, no anthem
        // text, no protection/tutor match — genuinely off this plan.
        { name: 'Doom Blade', oracleText: 'Destroy target nonblack creature.', typeLine: 'Instant', cmc: 2 },
      ],
    };
    const plan = deriveWinPlan(input);
    expect(plan.cardRoles.get("Krenko's Command")).toBe('enabler');
    expect(plan.cardRoles.get('Lightning Greaves')).toBe('protection');
    expect(plan.cardRoles.get('Demonic Tutor')).toBe('tutor_for_plan');
    expect(plan.cardRoles.get('Doom Blade')).toBe('off_plan');
    expect(plan.keyCards.protection).toContain('Lightning Greaves');
    expect(plan.keyCards.tutors).toContain('Demonic Tutor');
  });
});

describe('curated lists', () => {
  it('COMBO_PAIRS has at least 15 seeded pairs', () => {
    expect(COMBO_PAIRS.length).toBeGreaterThanOrEqual(15);
  });

  it('every combo pair is two distinct nonempty names', () => {
    for (const [a, b] of COMBO_PAIRS) {
      expect(a).toBeTruthy();
      expect(b).toBeTruthy();
      expect(a.toLowerCase()).not.toBe(b.toLowerCase());
    }
  });

  it('ALT_WIN_NAMES is nonempty', () => {
    expect(ALT_WIN_NAMES.size).toBeGreaterThan(0);
  });
});
