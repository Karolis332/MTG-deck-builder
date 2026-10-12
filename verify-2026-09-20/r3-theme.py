import io
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\deck-score-plans.ts'
s = io.open(p, encoding='utf-8').read()

start = s.index('export function typalTheme(')
end = s.index('/** A payoff READS the count; an enabler SUPPLIES it. */')
new = r'''export function typalTheme(all: readonly CardFeature[]): TypalTheme {
  const counts = new Map<string, number>();
  for (const f of all) {
    if (!isCreatureBody(f)) continue;
    for (const t of subtypesOf(f)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  // A theme exists only where the deck BOTH supplies the count and reads it:
  // >= 6 creatures of the type and >= 2 cards that reward having them. Without
  // the reward test 2,313 of 2,777 sample decks "were typal" - three Elves and
  // one card with the word Elf on it is not a plan.
  const rewards = all.filter((f) => RE_TYPAL_REWARD.test(f.card.oracle_text || ''));
  const mentions = (re: RegExp): number => rewards.filter((f) => re.test(f.card.oracle_text || '')).length;
  const tribes = [...counts.entries()]
    .filter(([t, n]) => n >= 6 && mentions(new RegExp(`\\b${t}s?\\b`)) >= 2)
    .map(([t]) => t);
  const party = mentions(RE_PARTY) >= 2 && PARTY_CLASSES.every((c) => (counts.get(c) ?? 0) >= 1);
  return { tribes, artifacts: mentions(RE_ARTIFACT_COUNT) >= 2, party };
}

'''
s = s[:start] + new + s[end:]

anchor = "const RE_PARTY = "
reward = ("/** Text that READS a count rather than merely naming a type. */\n"
          "const RE_TYPAL_REWARD = /(?:gets?|gains?) \\+\\d|for each|equal to the number of|"
          "other \\w+s you control|whenever (?:another |a |an )?\\w+ (?:you control )?enters|\\bfull party\\b/i;\n")
assert anchor in s
s = s.replace(anchor, reward + anchor, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', s.count('\x08'))
