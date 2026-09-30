import { describe, it, expect, vi } from 'vitest';

// Offline: no live EDHREC / CF calls from autoBuildDeck.
vi.mock('../src/lib/edhrec', async (orig) => ({
  ...(await orig<typeof import('../src/lib/edhrec')>()),
  getEdhrecRecommendations: async () => null,
  getEdhrecThemeCards: async () => null,
}));
vi.mock('../src/lib/cf-api-client', async (orig) => ({
  ...(await orig<typeof import('../src/lib/cf-api-client')>()),
  getCFRecommendations: async () => [],
}));

// Regression 2026-09-30 (U10): the tribal-floor backfill (Step 4a, below the
// synergy-minimums block) treated `rampAtFloor` as fixed before the
// displacement loop, so once ramp dipped to the floor mid-loop it kept
// displacing ramp anyway (Edgar Markov: ramp 11 -> 7). Step 4b's own
// displaceable list had no removal/board_wipe guard, so it could cut wipes
// (Edgar lost Damnation). Both now check per-card as they go.
describe('autoBuildDeck — Edgar Markov tribal build keeps ramp and wipes', () => {
  it('ramp stays at or above the archetype ramp floor, and wipes survive', async () => {
    const { autoBuildDeck } = await import('@/lib/deck-builder-ai');
    const { getTemplate } = await import('@/lib/deck-templates');
    const { classifyCard, getPrimaryCategory } = await import('@/lib/card-classifier');

    const r = await autoBuildDeck({
      format: 'commander',
      colors: [],
      commanderName: 'Edgar Markov',
    });

    const main = r.cards.filter((e) => e.board === 'main');
    const commanderCard = main.find((e) => e.card.name === 'Edgar Markov')?.card
      ?? (await import('@/lib/db')).getDb().prepare('SELECT * FROM cards WHERE name = ?').get('Edgar Markov');

    let rampCount = 0;
    let wipeCount = 0;
    for (const p of main) {
      const primary = getPrimaryCategory(
        classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, (commanderCard as { oracle_text?: string })?.oracle_text || undefined)
      );
      if (primary === 'ramp') rampCount += p.quantity;
      if (primary === 'board_wipe') wipeCount += p.quantity;
    }

    const rampFloor = getTemplate(r.strategy || 'aggro').ramp.totalMin;
    expect(rampCount).toBeGreaterThanOrEqual(rampFloor);
    expect(wipeCount).toBeGreaterThan(0);
  }, 60_000);
});
