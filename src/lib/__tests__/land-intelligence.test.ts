import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck } from '../land-intelligence';

// Tester report 2026-09-22: a B/R Commander build put Verdant Catacombs (B/G)
// and Polluted Delta (U/B) in the deck — each fetches a basic type from only
// ONE of the deck's two colors. Their real value is thinning, not fixing, so
// they must score below an on-colour dual (Blood Crypt / Sulfurous Springs)
// and below an on-colour fetch (Bloodstained Mire, B/R).
describe('fetch-land colour fit', () => {
  function score(colors: string[], name: string): number {
    const rows = scoreLandsForDeck({ colors, format: 'commander' });
    const row = rows.find((r) => r.card.name === name);
    if (!row) throw new Error(`${name} not in scored pool for ${colors.join('')}`);
    return row.score;
  }

  it('two-colour deck: an off-colour typed fetch (matches only 1 of 2 colours) scores below an on-colour dual and an on-colour fetch', () => {
    const colors = ['B', 'R'];
    const verdant = score(colors, 'Verdant Catacombs'); // B/G — only B matches
    const polluted = score(colors, 'Polluted Delta'); // U/B — only B matches
    const bloodstained = score(colors, 'Bloodstained Mire'); // B/R — both match
    const bloodCrypt = score(colors, 'Blood Crypt'); // B/R dual
    const sulfurous = score(colors, 'Sulfurous Springs'); // B/R painland

    expect(verdant).toBeLessThan(bloodCrypt);
    expect(verdant).toBeLessThan(sulfurous);
    expect(verdant).toBeLessThan(bloodstained);
    expect(polluted).toBeLessThan(bloodCrypt);
    expect(polluted).toBeLessThan(sulfurous);
    expect(polluted).toBeLessThan(bloodstained);
  });

  it('mono-colour deck: a typed fetch matching the single colour scores as a normal mono land (no off-colour discount)', () => {
    const rows = scoreLandsForDeck({ colors: ['B'], format: 'commander' });
    const swampFetch = rows.find((r) => r.card.name === 'Bloodstained Mire' || r.card.name === 'Polluted Delta');
    expect(swampFetch).toBeDefined();
    expect(swampFetch!.reasons).not.toContain('off-color fetch (thinning only)');
  });

  it('generic fetch (Evolving Wilds) keeps full deck-colour credit in a 2-colour deck, not the off-colour discount', () => {
    const rows = scoreLandsForDeck({ colors: ['B', 'R'], format: 'commander' });
    const wilds = rows.find((r) => r.card.name === 'Evolving Wilds');
    expect(wilds).toBeDefined();
    expect(wilds!.reasons).not.toContain('off-color fetch (thinning only)');
  });

  it('an off-colour typed fetch is still in the pool (thinning has some value) but flagged', () => {
    const rows = scoreLandsForDeck({ colors: ['B', 'R'], format: 'commander' });
    const verdant = rows.find((r) => r.card.name === 'Verdant Catacombs');
    expect(verdant).toBeDefined();
    expect(verdant!.reasons).toContain('off-color fetch (thinning only)');
  });
});
