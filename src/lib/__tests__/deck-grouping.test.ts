import { describe, it, expect } from 'vitest';
import { groupByRole, type RoleGroupableEntry } from '../deck-grouping';

function entry(overrides: Partial<RoleGroupableEntry> & { name: string; typeLine?: string; oracleText?: string; cmc?: number }): RoleGroupableEntry {
  return {
    role_override: overrides.role_override ?? null,
    card: {
      name: overrides.name,
      oracle_text: overrides.oracleText ?? '',
      type_line: overrides.typeLine ?? 'Creature',
      cmc: overrides.cmc ?? 2,
    },
  };
}

describe('groupByRole', () => {
  it('auto-classifies a card with no role_override', () => {
    const groups = groupByRole([entry({ name: 'Forest', typeLine: 'Basic Land — Forest' })]);
    expect(groups.land).toHaveLength(1);
  });

  it('a manual role_override wins over auto-classification', () => {
    const land = entry({ name: 'Forest', typeLine: 'Basic Land — Forest', role_override: 'removal' });
    const groups = groupByRole([land]);
    expect(groups.removal).toHaveLength(1);
    expect(groups.land).toBeUndefined();
  });

  it('groups multiple entries by their resolved role', () => {
    const groups = groupByRole([
      entry({ name: 'Forest', typeLine: 'Basic Land — Forest' }),
      entry({ name: 'Sol Ring', typeLine: 'Artifact', oracleText: 'Add {C}{C}.', role_override: null }),
      entry({ name: 'Custom Pick', typeLine: 'Creature', role_override: 'tutor' }),
    ]);
    expect(groups.land).toHaveLength(1);
    expect(groups.tutor).toHaveLength(1);
  });
});
