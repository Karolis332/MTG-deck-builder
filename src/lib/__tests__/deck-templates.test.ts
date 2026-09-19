import { describe, it, expect } from 'vitest';
import { ARCHETYPE_TEMPLATES, KNOWN_DEAD_SYNERGY_MINIMUMS, getTemplate } from '../deck-templates';
import { SYNERGY_REQUIREMENTS_MAP } from '../deck-builder-ai';

// Round 3 refuter MEDIUM-1: 'tokens' had no template, so getTemplate('tokens')
// silently fell back to midrange (the `ARCHETYPE_TEMPLATES[key] || midrange`
// fallback in getTemplate hid the missing key instead of failing loudly).
describe('tokens archetype template', () => {
  it('getTemplate("tokens") returns the real tokens template, not the midrange fallback', () => {
    const template = getTemplate('tokens');
    expect(template.name).toBe('tokens');
    expect(template).not.toBe(ARCHETYPE_TEMPLATES.midrange);
    expect(template.lands).toEqual(ARCHETYPE_TEMPLATES.tokens.lands);
  });
});

// Review 2026-08-23 C4: ArchetypeTemplate.synergyMinimums keys are only
// enforced (deck-builder-ai.ts Step 4b) when they appear in
// SYNERGY_REQUIREMENTS_MAP — the enforcement loop `continue`s past any key
// that isn't found there. Before this fix, all 23 keys used across the 11
// templates were dead config: the enforcement loop never ran for any of
// them. This guard makes that failure mode loud instead of silent: every
// synergyMinimums key must either be enforced, or be a conscious, documented
// exception in KNOWN_DEAD_SYNERGY_MINIMUMS.
describe('ARCHETYPE_TEMPLATES synergyMinimums coverage', () => {
  it('every synergyMinimums key is enforced or a documented dead key', () => {
    const unresolved: string[] = [];
    for (const [archetypeName, template] of Object.entries(ARCHETYPE_TEMPLATES)) {
      for (const key of Object.keys(template.synergyMinimums)) {
        const enforced = Object.prototype.hasOwnProperty.call(SYNERGY_REQUIREMENTS_MAP, key);
        const documented = KNOWN_DEAD_SYNERGY_MINIMUMS.has(key);
        if (!enforced && !documented) {
          unresolved.push(`${archetypeName}.${key}`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('tutors is retired from synergyMinimums in favour of the dedicated tutor quota', () => {
    // The old combo synergyMinimums.tutors:5 floor was unreachable dead code
    // (root cause of C4). Tutors are now enforced via ArchetypeTemplate.tutors
    // + RoleQuotas.tutor (deck-builder-constraints.ts), not this map — so
    // 'tutors' should appear in neither the enforcement map nor the
    // documented-dead allowlist, and no template should still declare it.
    expect(Object.prototype.hasOwnProperty.call(SYNERGY_REQUIREMENTS_MAP, 'tutors')).toBe(false);
    expect(KNOWN_DEAD_SYNERGY_MINIMUMS.has('tutors')).toBe(false);
    for (const template of Object.values(ARCHETYPE_TEMPLATES)) {
      expect(template.synergyMinimums).not.toHaveProperty('tutors');
    }
  });

  it('every archetype declares a tutors band', () => {
    for (const [name, template] of Object.entries(ARCHETYPE_TEMPLATES)) {
      expect(template.tutors, name).toBeDefined();
      const [min, max] = template.tutors;
      expect(min, name).toBeGreaterThanOrEqual(0);
      expect(max, name).toBeGreaterThanOrEqual(min);
    }
  });
});
