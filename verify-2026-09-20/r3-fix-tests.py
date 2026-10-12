import io

# 1. An anthem is a typed, verifiable effect - it belongs in the regex catalogue.
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\deck-score-features.ts'
s = io.open(p, encoding='utf-8').read()
old = "    RE_SPELL_PAYOFF.test(own) || RE_LIFEGAIN_SOURCE.test(oracle) ||"
new = "    RE_SPELL_PAYOFF.test(own) || RE_ANTHEM.test(own) || RE_LIFEGAIN_SOURCE.test(oracle) ||"
assert old in s
io.open(p, 'w', encoding='utf-8', newline='\n').write(s.replace(old, new, 1))

# 2. The W schedule tests only need a reachable target; Commander's 120 needs a
#    full deck, Standard's 20 does not.
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\__tests__\deck-score-v12.test.ts'
s = io.open(p, encoding='utf-8').read()
start = s.index("  it('counts creature-token makers with no converter")
end = s.index("  it('sizes a counted token from the board it counts'")
new = r'''  it('counts creature-token makers with no converter, and Food makers only with one', () => {
    const shell = noncreature(20, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const tokens = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, CREATURE_TOKEN, 'Hatchery'), ...shell]), [], NO_ENGINE);
    const food = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, FOOD, 'Larder'), ...shell]), [], NO_ENGINE);
    expect(tokens.score).toBeGreaterThan(0);
    expect(food.score).toBe(0);
    const converted = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, FOOD, 'Larder'), ...shell,
        ...noncreature(2, 4, 'Creatures you control get +3/+3 until end of turn.', 'Overrun', 'Sorcery')]),
      [], NO_ENGINE);
    expect(converted.score).toBeGreaterThan(0);
  });

  it('sees a producer printed on the commander', () => {
    const commander = deriveCardFeature(mkCard({
      name: 'Token Lord', type_line: 'Legendary Creature - Bear', mana_cost: '{2}', cmc: 2,
      power: '2', toughness: '2', oracle_text: CREATURE_TOKEN,
    }));
    const shell = entriesOf(cantrips(30));
    const withCommander = computeWin('brawl', normsFor('brawl'), 'tokens', 60, shell, [commander], NO_ENGINE);
    const without = computeWin('brawl', normsFor('brawl'), 'tokens', 60, shell, [], NO_ENGINE);
    expect(withCommander.score).toBeGreaterThan(without.score);
  });

  it('halves a producer whose trigger needs an opponent to act', () => {
    const shell = noncreature(20, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const own = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, CREATURE_TOKEN, 'Hatchery'), ...shell]), [], NO_ENGINE);
    const theirs = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, `Whenever a creature an opponent controls attacks, ${CREATURE_TOKEN}`, 'Reactive'), ...shell]),
      [], NO_ENGINE);
    expect(theirs.score).toBeLessThan(own.score);
  });

'''
s = s[:start] + new + s[end:]
s = s.replace("const NO_ENGINE = { E: 0, Estar: 1, D: 0, Dstar: 1, hasDrawEngine: false };",
              "const STD_NORMS = normsFor('standard');\nconst NO_ENGINE = { E: 0, Estar: 1, D: 0, Dstar: 1, hasDrawEngine: false };", 1)
# hoist the two oracle constants out of the describe body so the its can see them
s = s.replace("""describe('section 8 W: token producers, zero-power bodies and the opponent prior', () => {
  const CREATURE_TOKEN = 'When this artifact enters, create a 2/2 green Bear creature token.';
  const FOOD = 'When this artifact enters, create a Food token.';
""", """const CREATURE_TOKEN = 'When this artifact enters, create a 2/2 green Bear creature token.';
const FOOD = 'When this artifact enters, create a Food token.';

describe('section 8 W: token producers, zero-power bodies and the opponent prior', () => {
""", 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
