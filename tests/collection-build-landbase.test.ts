import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

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

// `@/lib/db` resolves its data directory once at import — scratch dir first.
const DIR = path.join(process.cwd(), 'data', 'test-collection-landbase');
process.env.MTG_DB_DIR = DIR;
type DbLib = typeof import('@/lib/db');
type BuilderLib = typeof import('@/lib/deck-builder-ai');

const BUILDER_UID = 999902;
const OTHER_UID = 999903;

const COMMANDER_ORACLE = '{T}: Add one mana of any color.\nWhenever you cast a spell of each color from among white, blue, black, red, and green this turn, draw a card.';

// Diagnosis 2026-09-30 (verify-2026-09-30/arena-tam/engine/landbase-diagnosis.md):
// ownership ignored user AND source, and "A-X" / "X" (an Arena rebalance and
// its paper name) were treated as unrelated cards, so a collection build
// shipped cards the building user never owned, or the SAME Arena card twice
// under two names.
describe('autoBuildDeck collection mode — land base ownership is scoped to the building user, source and A- identity', () => {
  let db: DbLib;
  let builder: BuilderLib;

  beforeAll(async () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });
    db = await import('@/lib/db');
    expect(db.getDataDir()).toBe(DIR); // hard stop: never touch the real DB
    builder = await import('@/lib/deck-builder-ai');

    const d = db.getDb();
    const legal = JSON.stringify({ commander: 'legal' });
    const insertCard = d.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, mana_cost, type_line, oracle_text, color_identity, colors, legalities,
                         set_code, set_name, collector_number, rarity, edhrec_rank, layout, produced_mana)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', ?, 'common', ?, ?, ?)
    `);
    let cn = 0;
    const addCard = (
      name: string, cmc: number, cost: string, type: string, text: string, ci: string[],
      opts: { layout?: string; producedMana?: string[] } = {},
    ) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      cn += 1;
      insertCard.run(
        id, `o-${id}`, name, cmc, cost, type, text, JSON.stringify(ci), JSON.stringify(ci), legal, String(cn), 1000,
        opts.layout || 'normal', opts.producedMana ? JSON.stringify(opts.producedMana) : null,
      );
      return id;
    };

    const insertClassification = d.prepare(`
      INSERT INTO land_classifications (card_name, card_id, land_category, produces_colors, enters_untapped, tribal_types, synergy_tags, tier)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)
    `);
    const classify = (cardId: string, name: string, category: string, colors: string[], untapped: boolean, tier: number) => {
      insertClassification.run(name, cardId, category, JSON.stringify(colors), untapped ? 1 : 0, tier);
    };

    // ── Commander: 5-colour, so every seeded land is in color identity ──────
    addCard('Test Prism Sovereign', 4, '{W}{U}{B}{R}{G}', 'Legendary Creature — Test Sphinx', COMMANDER_ORACLE, ['W', 'U', 'B', 'R', 'G']);

    // ── ~62 owned cheap spells, B-heavy pips ─────────────────────────────────
    for (let i = 1; i <= 30; i++) {
      addCard(`Test Insight ${i}`, 2, '{1}{B}', 'Sorcery', 'Draw a card.', ['B']);
    }
    for (let i = 1; i <= 20; i++) {
      addCard(`Test Bolt ${i}`, 1, '{R}', 'Instant', 'Deal 2 damage to any target.', ['R']);
    }
    for (let i = 1; i <= 12; i++) {
      addCard(`Test Pump ${i}`, 3, '{2}{G}', 'Sorcery', 'Target creature gets +2/+2 until end of turn.', ['G']);
    }

    // ── Lands ─────────────────────────────────────────────────────────────
    const cmdTowerId = addCard('Command Tower', 0, '', 'Land', COMMANDER_ORACLE.split('\n')[0], [], { producedMana: ['W', 'U', 'B', 'R', 'G'] });
    classify(cmdTowerId, 'Command Tower', 'any-color', ['W', 'U', 'B', 'R', 'G'], true, 1);

    const shockNames: Array<[string, string[]]> = [
      ['Sacred Foundry', ['R', 'W']], ['Steam Vents', ['U', 'R']], ['Watery Grave', ['U', 'B']],
      ['Overgrown Tomb', ['B', 'G']], ['Temple Garden', ['G', 'W']],
    ];
    for (const [name, colors] of shockNames) {
      const [a, b] = colors;
      const id = addCard(name, 0, '', 'Land', `As ${name} enters, you may pay 2 life. If you don't, it enters tapped.\n{T}: Add {${a}} or {${b}}.`, colors, { producedMana: colors });
      classify(id, name, 'shock', colors, true, 2);
    }

    const checkNames: Array<[string, string[]]> = [['Isolated Chapel', ['W', 'B']], ['Clifftop Retreat', ['R', 'W']]];
    for (const [name, colors] of checkNames) {
      const [a, b] = colors;
      const id = addCard(name, 0, '', 'Land', `${name} enters tapped unless you control two or more other lands.\n{T}: Add {${a}} or {${b}}.`, colors, { producedMana: colors });
      classify(id, name, 'check', colors, false, 2);
    }

    const startingTownId = addCard('Starting Town', 0, '', 'Land', 'Starting Town enters tapped.\n{T}: Add one mana of any color.', [], { producedMana: ['W', 'U', 'B', 'R', 'G'] });
    classify(startingTownId, 'Starting Town', 'tapped', ['W', 'U', 'B', 'R', 'G'], false, 4);

    const savaiId = addCard('Savai Triome', 0, '', 'Land — Mountain Plains Swamp', 'Savai Triome enters tapped.\n({T}: Add {R}, {W}, or {B}.)\nCycling {2}', ['R', 'W', 'B'], { producedMana: ['R', 'W', 'B'] });
    classify(savaiId, 'Savai Triome', 'triome', ['R', 'W', 'B'], false, 4);

    // Real oracle text (2026-09-30 diagnosis §4(d)): the mana ability is
    // gated behind a counter the land must first acquire, so it isn't a
    // reliable turn-after-turn source — isConditionalColoredProducer(ctx)
    // must catch it.
    const gemstoneId = addCard(
      'Gemstone Caverns', 0, '', 'Land',
      "If this card is in your opening hand and you're not the starting player, you may begin the game with Gemstone Caverns on the battlefield with a luck counter on it. If you do, exile a card from your hand.\n{T}: Add {C}. If Gemstone Caverns has a luck counter on it, instead add one mana of any color.",
      [], { producedMana: ['W', 'U', 'B', 'R', 'G'] },
    );
    classify(gemstoneId, 'Gemstone Caverns', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);

    // "Any type a Gate could produce" is Gate-count gated, not general fixing.
    const plazaId = addCard(
      'Plaza of Harmony', 0, '', 'Land',
      'When this land enters, if you control two or more Gates, you gain 3 life.\n{T}: Add {C}.\n{T}: Add one mana of any type that a Gate you control could produce.',
      [], { producedMana: ['W', 'U', 'B', 'R', 'G'] },
    );
    classify(plazaId, 'Plaza of Harmony', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);

    // Cost includes removing a counter — gated, not a free {T} source.
    const mirrodinsCoreId = addCard(
      'Mirrodin\'s Core', 0, '', 'Land',
      '{T}: Add {C}.\n{T}: Put a charge counter on this land.\n{T}, Remove a charge counter from this land: Add one mana of any color.',
      [], { producedMana: ['W', 'U', 'B', 'R', 'G'] },
    );
    classify(mirrodinsCoreId, 'Mirrodin\'s Core', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);

    // The rainbow ability is granted to OTHER permanents (Caves) — this card
    // itself never taps for it.
    const monumentId = addCard(
      'Forgotten Monument', 0, '', 'Land',
      '{T}: Add {C}.\nOther Caves you control have "{T}, Pay 1 life: Add one mana of any color."',
      [], { producedMana: ['W', 'U', 'B', 'R', 'G'] },
    );
    classify(monumentId, 'Forgotten Monument', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);

    const passageId = addCard('Multiversal Passage', 0, '', 'Land', 'As Multiversal Passage enters, choose a basic land type.\n{T}: Add one mana of the chosen type.', []);
    classify(passageId, 'Multiversal Passage', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);

    const wildsId = addCard('Evolving Wilds', 0, '', 'Land', '{T}, Sacrifice Evolving Wilds: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.', []);
    classify(wildsId, 'Evolving Wilds', 'trap', ['W', 'U', 'B', 'R', 'G'], false, 4);

    // Real Arena card and its Arena-rebalanced twin — same card, two names.
    const thranId = addCard('Thran Portal', 0, '', 'Land', 'As Thran Portal enters, choose a basic land type.\n{T}: Add one mana of the chosen type.', []);
    classify(thranId, 'Thran Portal', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);
    const aThranId = addCard('A-Thran Portal', 0, '', 'Land', 'As A-Thran Portal enters, choose a basic land type.\n{T}: Add one mana of the chosen type.', []);
    classify(aThranId, 'A-Thran Portal', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);

    // Paper-only fixers — must never ship in an 'arena' collectionSource build.
    const confluenceId = addCard('Mana Confluence', 0, '', 'Land', '{T}: Add one mana of any color.\n{T}: Add one mana of any color. Mana Confluence deals 1 damage to you.', []);
    classify(confluenceId, 'Mana Confluence', 'trap', ['W', 'U', 'B', 'R', 'G'], true, 1);
    const mireId = addCard('Bloodstained Mire', 0, '', 'Land', '{T}, Pay 1 life, Sacrifice Bloodstained Mire: Search your library for a Swamp or Mountain card, put it onto the battlefield, then shuffle.', []);
    classify(mireId, 'Bloodstained Mire', 'fetch', ['B', 'R'], true, 1);

    d.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, 'landbase-builder', 'landbase-builder@test.local', 'x')`).run(BUILDER_UID);
    d.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, 'landbase-other', 'landbase-other@test.local', 'x')`).run(OTHER_UID);

    const own = (userId: number, source: string, name: string) => {
      const row = d.prepare('SELECT id FROM cards WHERE name = ?').get(name) as { id: string } | undefined;
      if (!row) throw new Error(`fixture card not found: ${name}`);
      d.prepare("INSERT INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, 1, ?)").run(userId, row.id, source);
    };

    // BUILDER_UID, source 'arena': the real owned base + all the trap lands
    // (traps stay owned here — U1 only fixes WHO owns WHAT, not whether a
    // trap land beats a real fixer; that's U2/U3).
    for (let i = 1; i <= 30; i++) own(BUILDER_UID, 'arena', `Test Insight ${i}`);
    for (let i = 1; i <= 20; i++) own(BUILDER_UID, 'arena', `Test Bolt ${i}`);
    for (let i = 1; i <= 12; i++) own(BUILDER_UID, 'arena', `Test Pump ${i}`);
    own(BUILDER_UID, 'arena', 'Command Tower');
    for (const [name] of shockNames) own(BUILDER_UID, 'arena', name);
    for (const [name] of checkNames) own(BUILDER_UID, 'arena', name);
    own(BUILDER_UID, 'arena', 'Starting Town');
    own(BUILDER_UID, 'arena', 'Savai Triome');
    own(BUILDER_UID, 'arena', 'Gemstone Caverns');
    own(BUILDER_UID, 'arena', 'Plaza of Harmony');
    own(BUILDER_UID, 'arena', "Mirrodin's Core");
    own(BUILDER_UID, 'arena', 'Forgotten Monument');
    own(BUILDER_UID, 'arena', 'Multiversal Passage');
    own(BUILDER_UID, 'arena', 'Evolving Wilds');
    own(BUILDER_UID, 'arena', 'Thran Portal'); // NOT "A-Thran Portal" — the alias must still cover it

    // BUILDER_UID, source 'paper': never eligible for an 'arena' build.
    own(BUILDER_UID, 'paper', 'Mana Confluence');
    own(BUILDER_UID, 'paper', 'Bloodstained Mire');

    // OTHER_UID, source 'arena': never eligible for BUILDER_UID's build.
    own(OTHER_UID, 'arena', 'A-Thran Portal');
  }, 60_000);

  afterAll(() => {
    db.getDb().close();
    fs.rmSync(DIR, { recursive: true, force: true });
  });

  it('with collectionSource "arena", every picked card (lands and spells) is owned by the builder with source arena', async () => {
    const r = await builder.autoBuildDeck({
      format: 'commander', colors: [], commanderName: 'Test Prism Sovereign',
      useCollection: true, userId: BUILDER_UID, collectionSource: 'arena',
    });
    const main = r.cards.filter((e) => e.board === 'main' && e.card.name !== 'Test Prism Sovereign');
    const arenaOwned = new Set<string>([
      ...Array.from({ length: 30 }, (_, i) => `Test Insight ${i + 1}`),
      ...Array.from({ length: 20 }, (_, i) => `Test Bolt ${i + 1}`),
      ...Array.from({ length: 12 }, (_, i) => `Test Pump ${i + 1}`),
      'Command Tower', ...shockNamesFlat(), ...checkNamesFlat(),
      'Starting Town', 'Savai Triome', 'Gemstone Caverns', 'Plaza of Harmony',
      "Mirrodin's Core", 'Forgotten Monument', 'Multiversal Passage', 'Evolving Wilds',
      'Thran Portal', 'A-Thran Portal', // either name of the same owned card is fine
    ]);
    const violators = main.filter((e) => !arenaOwned.has(e.card.name) && !/^Basic Land/.test(e.card.type_line || ''));
    expect(violators.map((v) => v.card.name)).toEqual([]);
  }, 60_000);

  it('Thran Portal and A-Thran Portal are never both picked — owning one means owning both', async () => {
    const r = await builder.autoBuildDeck({
      format: 'commander', colors: [], commanderName: 'Test Prism Sovereign',
      useCollection: true, userId: BUILDER_UID, collectionSource: 'arena',
    });
    const main = r.cards.filter((e) => e.board === 'main');
    const portals = main.filter((e) => e.card.name === 'Thran Portal' || e.card.name === 'A-Thran Portal');
    expect(portals.length).toBeLessThanOrEqual(1);
  }, 60_000);

  // Perf 2026-09-30: ON strip(c.name) = cname planned as SCAN c × SCAN owned
  // (36-66 s per collection land query on the live DB).
  it('the owned-name join materializes the owned subquery once and matches both X and A-X', async () => {
    const { ownedNameJoin } = await import('@/lib/land-intelligence');
    const sql = `SELECT c.name FROM cards c ${ownedNameJoin({ userId: BUILDER_UID, source: 'arena' })} WHERE c.type_line LIKE '%Land%'`;
    const plan = (db.getDb().prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as Array<{ detail: string }>).map((r) => r.detail);
    expect(plan.some((d) => /^LIST SUBQUERY/.test(d))).toBe(true);
    expect(plan.slice(plan.indexOf('SCAN c') + 1)).not.toContain('SCAN owned'); // no per-card rescan
    const names = (db.getDb().prepare(sql).all() as Array<{ name: string }>).map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Thran Portal', 'A-Thran Portal', 'Command Tower']));
  });

  it('the commander arsenal still resolves names case-insensitively (NOCASE index lookup)', async () => {
    const { analyzeCommanderForBuild } = await import('@/lib/commander-analysis');
    const a = analyzeCommanderForBuild('test PRISM sovereign', BUILDER_UID, 'commander', 150, 'arena');
    expect(a?.commander.name).toBe('Test Prism Sovereign');
  });

  it('without collectionSource, every picked card is owned by the builder in any source, never the other user\'s', async () => {
    const r = await builder.autoBuildDeck({
      format: 'commander', colors: [], commanderName: 'Test Prism Sovereign',
      useCollection: true, userId: BUILDER_UID,
    });
    const main = r.cards.filter((e) => e.board === 'main');
    // A-Thran Portal is owned ONLY by OTHER_UID — must never appear, even
    // though BUILDER_UID owns the same card under its paper name.
    const leaked = main.filter((e) => e.card.name === 'A-Thran Portal');
    expect(leaked).toEqual([]);
    // Mana Confluence / Bloodstained Mire ARE owned by BUILDER_UID (paper) —
    // fine to ship when no source is requested.
  }, 60_000);

  // U2 — diagnosis §6 assertion 3. Every real fixer in the owned-arena pool
  // must outscore every trap: chosen-type lands credit one colour (not
  // five), and the 4 gated lands (counter, "granted to others", "any type a
  // Gate could produce") aren't colour sources at all.
  it('U2: real fixers (Command Tower, shocks, checks, Starting Town, triome) are picked before any trap land', async () => {
    const { scoreLandsForDeck } = await import('@/lib/land-intelligence');
    const scored = scoreLandsForDeck({
      colors: ['W', 'U', 'B', 'R', 'G'], format: 'commander',
      userId: BUILDER_UID, collectionOnly: true, collectionSource: 'arena',
    });
    const byName = new Map(scored.map((s) => [s.card.name, s.score]));
    const realFixers = ['Command Tower', ...shockNamesFlat(), ...checkNamesFlat(), 'Starting Town', 'Savai Triome'];
    // Hard-gated traps (counter, granted-to-others, Gate-any-type): never a
    // colour source at all — must rank below every real fixer, universal or
    // 2-colour alike.
    const deadTraps = ['Gemstone Caverns', 'Plaza of Harmony', "Mirrodin's Core", 'Forgotten Monument'];
    // Chosen-type/fetch: real fixing again once honestly counted as 1
    // colour (not 5), but the diagnosis's actual complaint is that they
    // outranked the true rainbow source (Command Tower, #1/#2 in its repro)
    // and any real 2+-colour dual — not that a single-colour, untapped land
    // must rank below a tapped universal one.
    const overvaluedTraps = ['Multiversal Passage', 'Thran Portal', 'Evolving Wilds'];
    for (const n of [...realFixers, ...deadTraps, ...overvaluedTraps]) expect(byName.has(n)).toBe(true);
    const minRealScore = Math.min(...realFixers.map((n) => byName.get(n)!));
    const maxDeadTrapScore = Math.max(...deadTraps.map((n) => byName.get(n)!));
    expect(minRealScore).toBeGreaterThan(maxDeadTrapScore);
    const commanderTowerScore = byName.get('Command Tower')!;
    for (const n of overvaluedTraps) expect(byName.get(n)!).toBeLessThan(commanderTowerScore);
  }, 60_000);

  // U2 — diagnosis §6 assertion 4. auditDeck's sourcesByColor.B must equal
  // the count of lands that really make B, not the count that CLAIM B
  // (a chosen-type land resolving to a colour other than B, or a
  // counter-gated/granted-to-others land, must not inflate it).
  it("U2: auditDeck sourcesByColor.B equals the count of lands that really make B", async () => {
    const { auditDeck } = await import('@/lib/deck-auditor');
    const d = db.getDb();
    const names = [
      'Command Tower', 'Watery Grave', 'Overgrown Tomb', 'Isolated Chapel', // real B sources
      'Gemstone Caverns', 'Multiversal Passage', // not B (gated / resolves to deckColors[0]='W')
    ];
    const cards = names.map((name) => {
      const card = d.prepare('SELECT * FROM cards WHERE name = ?').get(name) as Record<string, unknown>;
      return { card: card as unknown as import('@/lib/mana-sources').ManaSourceCard, quantity: 1, board: 'main' as const };
    });
    const health = auditDeck(cards, { colors: ['W', 'U', 'B', 'R', 'G'], format: 'commander', targetLands: 38, isCommander: true });
    // Ground truth: Command Tower (any-colour), Watery Grave (U/B) and
    // Isolated Chapel (W/B) really make B. Overgrown Tomb (B/G) also does.
    // Gemstone Caverns is counter-gated. Multiversal Passage is a
    // chosen-type land — with no pip-weighted priority it resolves to the
    // FIRST deck colour (W), not B.
    expect(health.sourcesByColor.B).toBe(4);
  }, 60_000);

  // U3 — diagnosis §4(c)/§5.3. Step 5 in deck-builder-ai.ts drops a land-base
  // pick when the card was already taken as an MDFC spell (`pickedNames.has`),
  // leaving the slot for Step 7 basics instead of the next-best land. Root
  // cause: buildOptimalLandBase doesn't know which names are already spoken
  // for, so it can't back-fill. `excludeNames` lets the caller pass
  // `pickedNames` straight through and the quota stays honest.
  it('U3: excludeNames removes picked-as-spell MDFCs and the land builder still fills its quota from the next-best lands', async () => {
    const { buildOptimalLandBase } = await import('@/lib/land-intelligence');
    const d = db.getDb();
    const legal = JSON.stringify({ commander: 'legal' });
    const insertCard = d.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, mana_cost, type_line, oracle_text, color_identity, colors, legalities,
                         set_code, set_name, collector_number, rarity, edhrec_rank, layout, produced_mana)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', ?, 'common', ?, ?, ?)
    `);
    const insertClassification = d.prepare(`
      INSERT INTO land_classifications (card_name, card_id, land_category, produces_colors, enters_untapped, tribal_types, synergy_tags, tier)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)
    `);
    const own = (userId: number, source: string, cardId: string) => {
      d.prepare("INSERT INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, 1, ?)").run(userId, cardId, source);
    };
    // 22 near-identical W/U untapped duals — well above the 2-colour quota
    // (min(18, targetLandCount - 8) = 18), so excluding any 3 still leaves 19.
    for (let i = 1; i <= 22; i++) {
      const id = `test-wu-land-${i}`;
      insertCard.run(
        id, `o-${id}`, `Test WU Land ${i}`, 0, '', 'Land', '{T}: Add {W} or {U}.',
        JSON.stringify(['W', 'U']), JSON.stringify(['W', 'U']), legal, String(i), 900,
        'normal', JSON.stringify(['W', 'U']),
      );
      insertClassification.run(`Test WU Land ${i}`, id, 'dual_original', JSON.stringify(['W', 'U']), 1, 1);
      own(BUILDER_UID, 'arena', id);
    }

    const base = {
      colors: ['W', 'U'], format: 'commander' as const, targetLandCount: 38,
      collectionOnly: true, userId: BUILDER_UID, collectionSource: 'arena', isCommander: true,
    };
    const baseline = buildOptimalLandBase(base);
    expect(baseline.totalNonBasic).toBe(18); // full quota, nothing excluded

    const spentAsSpells = baseline.lands.slice(0, 3).map((l) => l.card.name);
    const withExclusions = buildOptimalLandBase({ ...base, excludeNames: new Set(spentAsSpells) });
    expect(withExclusions.lands.some((l) => spentAsSpells.includes(l.card.name))).toBe(false);
    expect(withExclusions.totalNonBasic).toBe(18); // quota still met from the next-best lands
  }, 60_000);

  function shockNamesFlat(): string[] {
    return ['Sacred Foundry', 'Steam Vents', 'Watery Grave', 'Overgrown Tomb', 'Temple Garden'];
  }
  function checkNamesFlat(): string[] {
    return ['Isolated Chapel', 'Clifftop Retreat'];
  }
});
