import io
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\__tests__\deck-score-v12.test.ts'
s = io.open(p, encoding='utf-8').read()

block = r'''
// -- Round 3: W recipe families and the typal plan -------------------------

const WIN_NORMS = normsFor('commander');
const NO_ENGINE = { E: 0, Estar: 1, D: 0, Dstar: 1, hasDrawEngine: false };

function tokenMaker(count: number, text: string, tag: string, cmc = 3): Array<{ card: DbCard; quantity: number }> {
  return noncreature(count, cmc, text, tag);
}

describe('section 8 W: token producers, zero-power bodies and the opponent prior', () => {
  const CREATURE_TOKEN = 'When this artifact enters, create a 2/2 green Bear creature token.';
  const FOOD = 'When this artifact enters, create a Food token.';

  it('does not let a 0-power body delete the whole combat line', () => {
    // requiredCopies sorted the cheapest member first and divided by its mean
    // output; one 0/0 Walking Ballista returned null and the deck scored W = 0
    // with a 205-damage schedule behind it (the-cabbage-merchant).
    const beaters = creatures(24, 5, 3, 'Beater');
    const ballista = mkCard({ name: 'Ballista', type_line: 'Artifact Creature', mana_cost: null, cmc: 0, power: '0', toughness: '0' });
    const withZero = computeWin('commander', WIN_NORMS, 'aggro', 99,
      entriesOf([...beaters, { card: ballista, quantity: 1 }]), [], NO_ENGINE);
    const withoutZero = computeWin('commander', WIN_NORMS, 'aggro', 99, entriesOf(beaters), [], NO_ENGINE);
    expect(withZero.score).toBeGreaterThan(0);
    expect(withZero.score).toBeCloseTo(withoutZero.score, 5);
  });

  it('counts creature-token makers with no converter, and Food makers only with one', () => {
    const tokens = computeWin('commander', WIN_NORMS, 'tokens', 99,
      entriesOf(tokenMaker(30, CREATURE_TOKEN, 'Hatchery')), [], NO_ENGINE);
    const food = computeWin('commander', WIN_NORMS, 'tokens', 99,
      entriesOf(tokenMaker(30, FOOD, 'Larder')), [], NO_ENGINE);
    expect(tokens.score).toBeGreaterThan(0);
    expect(food.score).toBe(0);
    const converted = computeWin('commander', WIN_NORMS, 'tokens', 99,
      entriesOf([...tokenMaker(28, FOOD, 'Larder'),
        ...noncreature(2, 4, 'Creatures you control get +3/+3 and gain trample until end of turn.', 'Overrun', 'Sorcery')]),
      [], NO_ENGINE);
    expect(converted.score).toBeGreaterThan(0);
  });

  it('sees a producer printed on the commander', () => {
    const commander = deriveCardFeature(mkCard({
      name: 'Token Lord', type_line: 'Legendary Creature - Bear', mana_cost: '{2}', cmc: 2,
      power: '2', toughness: '2', oracle_text: CREATURE_TOKEN,
    }));
    const shell = entriesOf(cantrips(40));
    expect(computeWin('commander', WIN_NORMS, 'tokens', 99, shell, [commander], NO_ENGINE).score)
      .toBeGreaterThan(computeWin('commander', WIN_NORMS, 'tokens', 99, shell, [], NO_ENGINE).score);
  });

  it('halves a producer whose trigger needs an opponent to act', () => {
    const own = computeWin('commander', WIN_NORMS, 'tokens', 99,
      entriesOf(tokenMaker(30, CREATURE_TOKEN, 'Hatchery')), [], NO_ENGINE);
    const theirs = computeWin('commander', WIN_NORMS, 'tokens', 99,
      entriesOf(tokenMaker(30, `Whenever a creature an opponent controls attacks, ${CREATURE_TOKEN}`, 'Reactive')),
      [], NO_ENGINE);
    expect(theirs.score).toBeLessThan(own.score);
  });

  it('sizes a counted token from the board it counts', () => {
    const scaling = 'When this artifact enters, create a 0/0 Construct artifact creature token with "This token gets +1/+1 for each artifact you control."';
    const flat = 'When this artifact enters, create a 2/2 Construct artifact creature token.';
    const shell = noncreature(24, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const big = computeWin('standard', normsFor('standard'), 'tokens', 60,
      entriesOf([...tokenMaker(6, scaling, 'Synth'), ...shell]), [], NO_ENGINE);
    const small = computeWin('standard', normsFor('standard'), 'tokens', 60,
      entriesOf([...tokenMaker(6, flat, 'Synth'), ...shell]), [], NO_ENGINE);
    expect(big.score).toBeGreaterThan(small.score);
  });
});

describe('section 8 W: control inevitability needs a durable engine and early answers', () => {
  const finishers = creatures(6, 6, 5, 'Titan');
  const cheap = removal(6, 2);
  const deck = entriesOf([...finishers, ...cheap, ...cantrips(20)]);
  const met = { E: 14, Estar: 12, D: 38, Dstar: 10, hasDrawEngine: true };

  it('fires when the engine, the early answers and the finishers are all there', () => {
    const out = computeWin('commander', WIN_NORMS, 'control', 99, deck, [], met);
    expect(out.reason).toContain('Control inevitability');
  });

  it('refuses a deck whose card advantage is all one-shot', () => {
    const out = computeWin('commander', WIN_NORMS, 'control', 99, deck, [], { ...met, hasDrawEngine: false });
    expect(out.reason).not.toContain('Control inevitability');
  });

  it('refuses a deck with fewer than two cheap answers', () => {
    const noEarly = entriesOf([...finishers, ...removal(6, 6, 'Slow'), ...cantrips(20)]);
    const out = computeWin('commander', WIN_NORMS, 'control', 99, noEarly, [], met);
    expect(out.reason).not.toContain('Control inevitability');
  });
});

describe('section 8 plan: typal / party / artifact-count', () => {
  function partyMember(i: number, cls: string): { card: DbCard; quantity: number } {
    return {
      card: mkCard({
        name: `${cls} ${i}`, type_line: `Creature - Human ${cls}`, subtypes: JSON.stringify(['Human', cls]),
        mana_cost: '{2}', cmc: 2, power: '2', toughness: '2',
      }),
      quantity: 1,
    };
  }
  const classes = ['Cleric', 'Rogue', 'Warrior', 'Wizard'];
  const roster = classes.flatMap((cls) => [0, 1, 2].map((i) => partyMember(i, cls)));
  const partyPayoffs = noncreature(6, 3, 'Creatures you control get +1/+1 for each creature in your party.', 'Rally', 'Enchantment');

  it('reads a party deck as typal and scores it on that plan', () => {
    const deck = entriesOf([...roster, ...partyPayoffs, ...removal(4, 2), ...cantrips(6)]);
    const plan = selectPlan(99, deck);
    expect(plan.recipe.key).toBe('typal');
    expect(plan.R).toBeGreaterThan(0);
  });

  it('needs both the bodies and the cards that read them', () => {
    const noPayoff = [...roster, ...cantrips(20)].map((c) => deriveCardFeature(c.card));
    expect(typalTheme(noPayoff).party).toBe(false);
    const noBodies = [...partyPayoffs, ...cantrips(20)].map((c) => deriveCardFeature(c.card));
    expect(typalTheme(noBodies).party).toBe(false);
    const both = [...roster, ...partyPayoffs].map((c) => deriveCardFeature(c.card));
    expect(typalTheme(both).party).toBe(true);
  });

  it('counts artifacts as a theme when two cards read the count', () => {
    const artifacts = noncreature(20, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const readers = noncreature(2, 3, 'Creatures you control get +1/+1 for each artifact you control.', 'Forge');
    const theme = typalTheme([...artifacts, ...readers].map((c) => deriveCardFeature(c.card)));
    expect(theme.artifacts).toBe(true);
    expect(typalTheme(artifacts.map((c) => deriveCardFeature(c.card))).artifacts).toBe(false);
  });

  it('reads subtypes from the JSON column and from the type line', () => {
    const json = deriveCardFeature(mkCard({ name: 'A', type_line: 'Creature - Elf Druid', subtypes: JSON.stringify(['Elf', 'Druid']), power: '1', toughness: '1' }));
    const line = deriveCardFeature(mkCard({ name: 'B', type_line: 'Creature \u2014 Goblin Shaman', subtypes: null, power: '1', toughness: '1' }));
    expect(subtypesOf(json)).toEqual(['Elf', 'Druid']);
    expect(subtypesOf(line)).toEqual(['Goblin', 'Shaman']);
  });
});
'''

marker = r"\u00a71 plan selection ranks recipes on fit"
assert marker in s
s = s.replace(marker, block.strip() + '\n\n' + marker, 1)
s = s.replace(
    "  selectPlan, evaluatePlan, recipeFor, deploymentBudget, betterPlan, planFit, evaluateClosing, closingRecipe,",
    "  selectPlan, evaluatePlan, recipeFor, deploymentBudget, betterPlan, planFit, evaluateClosing, closingRecipe,\n  typalTheme, subtypesOf,", 1)
s = s.replace("import { WEIGHTS, weightsFor, Q_BASELINE, Q_SATURATION, type ScoreFormat } from '../deck-score-norms';",
              "import { WEIGHTS, weightsFor, normsFor, Q_BASELINE, Q_SATURATION, type ScoreFormat } from '../deck-score-norms';", 1)
s = s.replace("import { deriveCardFeature } from '../deck-score-features';",
              "import { deriveCardFeature } from '../deck-score-features';", 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', s.count('\x08'))
