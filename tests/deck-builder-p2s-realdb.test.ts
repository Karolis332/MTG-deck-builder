import { describe, it, expect, vi } from 'vitest';

// Offline: no live EDHREC / CF calls from autoBuildDeck. Repo data/ DB (vitest pins it).
vi.mock('../src/lib/edhrec', async (orig) => ({
  ...(await orig<typeof import('../src/lib/edhrec')>()),
  getEdhrecRecommendations: async () => null,
  getEdhrecThemeCards: async () => null,
}));
vi.mock('../src/lib/cf-api-client', async (orig) => ({
  ...(await orig<typeof import('../src/lib/cf-api-client')>()),
  getCFRecommendations: async () => [],
}));

const PLAN_ROLES = new Set(['ramp', 'draw', 'tutor', 'removal', 'board_wipe', 'protection', 'win_condition']);

// P2-S #13: Step 4c's same-role upgrade swaps job for job inside the plan's
// roles and never removes a plan piece (a card with a positive tribal /
// commander-profile synergy component).
describe('autoBuildDeck — Step 4c upgrades respect the plan (real card DB)', () => {
  for (const [commanderName, format] of [['Kess, Dissident Mage', 'commander'], ['Ygra, Eater of All', 'brawl']] as const) {
    it(`${commanderName}: every upgrade keeps plan pieces and stays inside plan roles`, async () => {
      const { autoBuildDeck } = await import('@/lib/deck-builder-ai');
      const { classifyCard, getPrimaryCategory } = await import('@/lib/card-classifier');
      const { getDb } = await import('@/lib/db');
      const r = await autoBuildDeck({ format, colors: [], commanderName, captureComponents: true });
      const comp = new Map(r.scoredPool!.map((p) => [p.name, p.components]));
      const cmdr = getDb().prepare('SELECT oracle_text FROM cards WHERE name = ? LIMIT 1').get(commanderName) as { oracle_text: string | null };
      const upgrades = r.reasoning.filter((x) => x.role === 'upgrade');
      for (const x of upgrades) {
        const m = x.reason.match(/^same-role upgrade: \+(.+?) \(-?\d+\) for (.+?) \(-?\d+\)$/);
        expect(m, x.reason).not.toBeNull();
        const victim = comp.get(m![2]) ?? {};
        expect((victim.tribal ?? 0) + (victim.profileSynergy ?? 0), `plan piece removed: ${x.reason}`).toBeLessThanOrEqual(0);
        const cand = r.cards.find((e) => e.card.name === m![1])?.card;
        if (cand) {
          const role = getPrimaryCategory(classifyCard(cand.name, cand.oracle_text || '', cand.type_line || '', cand.cmc || 0, cmdr?.oracle_text || undefined, { strict: true }));
          expect(PLAN_ROLES.has(role), `off-plan upgrade role ${role}: ${x.reason}`).toBe(true);
        }
      }
    }, 120_000);
  }
});
