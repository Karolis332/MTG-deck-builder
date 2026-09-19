import { describe, it, expect } from 'vitest';
import { resolveConsistentManaLandTarget } from '../deck-builder-ai';
import { getTemplate } from '../deck-templates';

// Round 3 refuter CRITICAL-1/HIGH-1: "consistent manabase" was applying the
// Commander-scale archetype land band (33-40 out of 99/100) to every format,
// and could LOWER the land count when the band's max sat below the format's
// flat base (Commander aggro 38 -> 35, Standard aggro 24 -> 35).
describe('resolveConsistentManaLandTarget', () => {
  it('Standard aggro (60-card, no commander band): +1 land, within 23-26', () => {
    const target = resolveConsistentManaLandTarget(24, true, null);
    expect(target).toBeGreaterThanOrEqual(23);
    expect(target).toBeLessThanOrEqual(26);
    expect(target).toBe(25);
  });

  it('Commander aggro: never drops below the flat no-hint base, even though the aggro band max (35) is below it', () => {
    const aggroTemplate = getTemplate('aggro');
    expect(aggroTemplate.lands[1]).toBeLessThan(38); // sanity: this is the exact trap that shipped
    const target = resolveConsistentManaLandTarget(38, true, aggroTemplate);
    expect(target).toBeGreaterThanOrEqual(38);
  });

  it('Commander with a hint template never exceeds 40', () => {
    for (const name of ['aggro', 'tempo', 'midrange', 'control', 'combo', 'voltron', 'tribal', 'reanimator', 'spellslinger', 'aristocrats', 'stax', 'tokens'] as const) {
      const target = resolveConsistentManaLandTarget(38, true, getTemplate(name));
      expect(target, name).toBeLessThanOrEqual(40);
    }
  });

  it('no hint: land target is unchanged regardless of format', () => {
    expect(resolveConsistentManaLandTarget(24, false, null)).toBe(24);
    expect(resolveConsistentManaLandTarget(38, false, null)).toBe(38);
  });

  it('60-card format never exceeds the 26 cap even from a high base', () => {
    expect(resolveConsistentManaLandTarget(26, true, null)).toBe(26);
  });
});
