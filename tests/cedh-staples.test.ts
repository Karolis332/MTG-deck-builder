import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// `@/lib/db` resolves its data directory once at import — point it at a
// dedicated scratch dir BEFORE the first (dynamic) import, same pattern as
// tests/db.test.ts's "searchCards ordering" suite.
const CEDH_DIR = path.join(process.cwd(), 'data', 'test-cedhstaples');
process.env.MTG_DB_DIR = CEDH_DIR;
type DbLib = typeof import('@/lib/db');

describe('getCedhStaples — Commander format (cards-table join + legality filter)', () => {
  let lib: DbLib;

  beforeAll(async () => {
    fs.rmSync(CEDH_DIR, { recursive: true, force: true });
    fs.mkdirSync(CEDH_DIR, { recursive: true });
    lib = await import('@/lib/db');
    expect(lib.getDataDir()).toBe(CEDH_DIR); // hard stop: never touch the real DB

    // Minimal card rows needed for the join: color identity + legalities,
    // matching the shape of a real cards row closely enough for the query.
    const insert = lib.getDb().prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, type_line, color_identity, legalities, set_code, set_name, collector_number, rarity)
      VALUES (?, ?, ?, 0, 'Artifact', ?, ?, 'tst', 'Test Set', '1', 'common')
    `);
    const legal = (overrides: Record<string, string>) => JSON.stringify({ commander: 'legal', brawl: 'legal', standardbrawl: 'legal', ...overrides });

    insert.run('sol-ring', 'o-sol-ring', 'Sol Ring', '[]', legal({}));
    insert.run('mana-crypt', 'o-mana-crypt', 'Mana Crypt', '[]', legal({ commander: 'banned' }));
    insert.run('jeweled-lotus', 'o-jeweled-lotus', 'Jeweled Lotus', '[]', legal({ commander: 'banned' }));
    insert.run('gaeas-cradle', 'o-gaeas-cradle', "Gaea's Cradle", '["G"]', legal({}));
    insert.run('elvish-spirit-guide', 'o-elvish-spirit-guide', 'Elvish Spirit Guide', '["G"]', legal({}));
    insert.run('force-of-vigor', 'o-force-of-vigor', 'Force of Vigor', '["G"]', legal({}));
    insert.run('counterspell', 'o-counterspell', 'Counterspell', '["U"]', legal({ standardbrawl: 'not_legal' }));
    insert.run('rhystic-study', 'o-rhystic-study', 'Rhystic Study', '["U"]', legal({}));

    // Fixtures for the brawl/standardbrawl fallback tests below. Names match
    // migration 46's commander seed, so no extra cedh_staples rows needed.
    insert.run('mox-amber', 'o-mox-amber', 'Mox Amber', '[]', legal({ standardbrawl: 'not_legal' }));
    insert.run('seething-song', 'o-seething-song', 'Seething Song', '["R"]', legal({ standardbrawl: 'not_legal' }));
    insert.run('mana-vault', 'o-mana-vault', 'Mana Vault', '[]', legal({ brawl: 'not_legal', standardbrawl: 'not_legal' }));
    insert.run('force-of-will', 'o-force-of-will', 'Force of Will', '["U"]', legal({ brawl: 'not_legal', standardbrawl: 'not_legal' }));
    insert.run('necropotence', 'o-necropotence', 'Necropotence', '["B"]', legal({ standardbrawl: 'not_legal' }));
    insert.run('arcane-signet', 'o-arcane-signet', 'Arcane Signet', '[]', legal({}));
  });

  afterAll(() => {
    lib.getDb().close();
    fs.rmSync(CEDH_DIR, { recursive: true, force: true });
  });

  it('includes colorless and green staples, excludes Commander-banned and off-color cards', () => {
    const names = lib.getCedhStaples(['G'], 'commander').map((s) => s.card_name);
    expect(names).toContain('Sol Ring');
    expect(names).toContain("Gaea's Cradle");
    expect(names).toContain('Elvish Spirit Guide');
    expect(names).toContain('Force of Vigor');
    expect(names).not.toContain('Mana Crypt');
    expect(names).not.toContain('Jeweled Lotus');
    expect(names).not.toContain('Counterspell');
    expect(names).not.toContain('Rhystic Study');
  });

  it('leaves historic_brawl behavior unchanged (no cards-table join)', () => {
    const staples = lib.getCedhStaples(['U'], 'historic_brawl');
    const names = staples.map((s) => s.card_name);
    // historic_brawl's own migration-27 seed data includes Mana Crypt and
    // Jeweled Lotus (colorless) — unaffected by the Commander legality gate.
    expect(names).toContain('Mana Crypt');
    expect(names).toContain('Jeweled Lotus');
  });

  it('brawl falls back to the commander staple list (its own has none) and applies $.brawl legality', () => {
    const names = lib.getCedhStaples(['U', 'R'], 'brawl').map((s) => s.card_name);
    expect(names).toContain('Mox Amber'); // colorless, brawl-legal
    expect(names).toContain('Seething Song'); // red, brawl-legal
    expect(names).not.toContain('Mana Vault'); // colorless but brawl-banned
    expect(names).not.toContain('Force of Will'); // blue but brawl-banned
    expect(names).not.toContain('Necropotence'); // brawl-legal but black — off-color for U/R
  });

  it('standardbrawl only returns cards legal under $.standardbrawl', () => {
    const names = lib.getCedhStaples(['U'], 'standardbrawl').map((s) => s.card_name);
    expect(names).toContain('Arcane Signet'); // colorless, standardbrawl-legal
    expect(names).not.toContain('Mox Amber'); // standardbrawl-banned
    expect(names).not.toContain('Counterspell'); // standardbrawl-banned
  });
});
