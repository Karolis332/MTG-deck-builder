import { describe, it, expect } from 'vitest';
import { getDb } from '../db';
import { fetchTribalCards, detectTribalTheme } from '../deck-builder-ai';

const db = getDb();

describe('fetchTribalCards — U1b tribal pool', () => {
  it('includes changelings even though "ooze" never appears on them', () => {
    // Widened past the production default (20) — Barkform Harvester ranks
    // outside it, but the clause itself (not the limit) is under test here.
    const cards = fetchTribalCards(db, 'ooze', '', '', '', new Set(), 80, 100);
    const names = cards.map((c) => c.name);
    // Barkform Harvester is a Shapeshifter with the Changeling keyword — no
    // "ooze" anywhere in its text/type/subtypes, only reachable via the
    // changeling clause.
    expect(names).toContain('Barkform Harvester');
  });

  it('includes "choose a creature type" support (changeling query has its own limit)', () => {
    // Metallic Mimic ranks outside the changeling query's default top-20 —
    // widen it explicitly to prove the clause matches, without loosening the
    // production default (a wide default let changelings crowd out real
    // tribe members for narrow tribes like Krenko's Goblins).
    const cards = fetchTribalCards(db, 'ooze', '', '', '', new Set(), 80, 50);
    expect(cards.map((c) => c.name)).toContain('Metallic Mimic');
  });

  it('drops an owned NULL-edhrec-rank card under a tight limit, then keeps it once owned', () => {
    const withoutOwned = fetchTribalCards(db, 'ooze', '', '', '', new Set(), 3);
    expect(withoutOwned.some((c) => c.name === 'Fuel Tank Feaster')).toBe(false);

    const withOwned = fetchTribalCards(db, 'ooze', '', '', '', new Set(['Fuel Tank Feaster']), 3);
    const feaster = withOwned.find((c) => c.name === 'Fuel Tank Feaster');
    expect(feaster).toBeDefined();
    expect(feaster!.edhrec_rank).toBeNull();
  });

  it('does not drop owned NULL-rank cards even under a tight limit', () => {
    const cards = fetchTribalCards(db, 'ooze', '', '', '', new Set(['Fuel Tank Feaster']), 5);
    expect(cards.some((c) => c.name === 'Fuel Tank Feaster')).toBe(true);
  });

  it('a non-tribal commander detects no tribe, so nothing new is fetched', () => {
    // Talrand, Sky Summoner is a spellslinger commander with no tribal payoff.
    expect(detectTribalTheme(db, 'Talrand, Sky Summoner')).toBeNull();
  });

  it('a tribal commander detects its tribe (Aeve, Progenitor Ooze -> ooze)', () => {
    expect(detectTribalTheme(db, 'Aeve, Progenitor Ooze')).toBe('ooze');
  });
});
