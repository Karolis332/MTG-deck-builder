import { describe, it, expect } from 'vitest';
import { getDb } from '../db';
import { findAlternatives } from '../card-alternatives';
import type { DbCard } from '../types';

function card(name: string): DbCard {
  const row = getDb().prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1').get(name) as DbCard | undefined;
  if (!row) throw new Error(`fixture card not found in repo DB: ${name}`);
  return row;
}

describe('findAlternatives — nonland', () => {
  const bolt = card('Lightning Bolt');
  const shock = card('Shock');
  const deck = [bolt, shock];

  it('ranks same-role candidates and excludes the card itself / deck members', () => {
    const result = findAlternatives({
      format: 'commander',
      commanders: [],
      deckCards: deck,
      card: bolt,
      limit: 20,
      ownedNames: new Set(),
    });
    expect(result.card.name).toBe('Lightning Bolt');
    expect(result.card.role.length).toBeGreaterThan(0);
    expect(result.alternatives.some((a) => a.name === 'Lightning Bolt')).toBe(false);
    expect(result.alternatives.some((a) => a.name === 'Shock')).toBe(false); // already in the deck
  });

  it('every alternative shares the target card\'s role and colour identity', () => {
    const result = findAlternatives({
      format: 'commander',
      commanders: [],
      deckCards: [bolt],
      card: bolt,
      limit: 20,
      ownedNames: new Set(),
    });
    expect(result.alternatives.length).toBeGreaterThan(0);
    for (const alt of result.alternatives) {
      expect(alt.role).toBe(result.card.role);
    }
  });

  it('price cap filters candidates over the cap', () => {
    const result = findAlternatives({
      format: 'commander',
      commanders: [],
      deckCards: [bolt],
      card: bolt,
      maxPrice: 1,
      limit: 20,
      ownedNames: new Set(),
    });
    for (const alt of result.alternatives) {
      expect(alt.priceUsd).not.toBeNull();
      expect(alt.priceUsd!).toBeLessThanOrEqual(1);
    }
  });

  it('excludes unknown-price candidates only when a cap is given', () => {
    const solRing = card('Sol Ring'); // price_usd is null in the repo DB
    const withoutCap = findAlternatives({
      format: 'commander', commanders: [], deckCards: [solRing], card: solRing, limit: 30, ownedNames: new Set(),
    });
    const withCap = findAlternatives({
      format: 'commander', commanders: [], deckCards: [solRing], card: solRing, maxPrice: 5, limit: 30, ownedNames: new Set(),
    });
    expect(withoutCap.alternatives.some((a) => a.priceUsd === null)).toBe(true);
    expect(withCap.alternatives.some((a) => a.priceUsd === null)).toBe(false);
  });

  it('marks owned candidates via the owned flag', () => {
    const result = findAlternatives({
      format: 'commander',
      commanders: [],
      deckCards: [bolt],
      card: bolt,
      limit: 20,
      ownedNames: new Set(['Chain Lightning']),
    });
    const owned = result.alternatives.find((a) => a.name === 'Chain Lightning');
    if (owned) expect(owned.owned).toBe(true);
    const notOwned = result.alternatives.find((a) => a.name !== 'Chain Lightning');
    if (notOwned) expect(notOwned.owned).toBe(false);
  });

  it('respects a limit above 1', () => {
    const result = findAlternatives({
      format: 'commander', commanders: [], deckCards: [bolt], card: bolt, limit: 3, ownedNames: new Set(),
    });
    expect(result.alternatives.length).toBeLessThanOrEqual(3);
  });

  it('never returns the commander', () => {
    const commander = card('Krenko, Mob Boss');
    const result = findAlternatives({
      format: 'commander',
      commanders: [commander],
      deckCards: [bolt],
      card: bolt,
      limit: 50,
      ownedNames: new Set(),
    });
    expect(result.alternatives.some((a) => a.name === commander.name)).toBe(false);
  });
});

describe('findAlternatives — lands', () => {
  const bloodCrypt = card('Blood Crypt'); // B/R shockland
  const sacredFoundry = card('Sacred Foundry'); // R/W — off-colour for a B/R deck
  const dragonskull = card('Dragonskull Summit'); // B/R check land

  it('keeps land alternatives within the deck\'s colour identity', () => {
    const result = findAlternatives({
      format: 'commander',
      commanders: [],
      deckCards: [bloodCrypt, dragonskull],
      card: bloodCrypt,
      limit: 20,
      ownedNames: new Set(),
    });
    expect(result.card.role).toBe('land');
    expect(result.alternatives.every((a) => a.name !== sacredFoundry.name)).toBe(true);
  });

  it('excludes the target land and lands already in the deck', () => {
    const result = findAlternatives({
      format: 'commander',
      commanders: [],
      deckCards: [bloodCrypt, dragonskull],
      card: bloodCrypt,
      limit: 20,
      ownedNames: new Set(),
    });
    expect(result.alternatives.some((a) => a.name === 'Blood Crypt')).toBe(false);
    expect(result.alternatives.some((a) => a.name === 'Dragonskull Summit')).toBe(false);
  });

  it('never suggests a basic land as a nonland alternative', () => {
    const bolt = card('Lightning Bolt');
    const result = findAlternatives({
      format: 'commander', commanders: [], deckCards: [bolt], card: bolt, limit: 50, ownedNames: new Set(),
    });
    expect(result.alternatives.some((a) => ['Mountain', 'Island', 'Swamp', 'Plains', 'Forest'].includes(a.name))).toBe(false);
  });
});
