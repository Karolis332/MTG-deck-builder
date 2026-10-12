import io
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\deck-score-win.ts'
s = io.open(p, encoding='utf-8').read()

# ---------------------------------------------------------------- item 1 ----
old = """  const isProducer = (f: CardFeature) => f.isTokenProducer || f.isFoodProducer || f.isTreasureProducer;
  const isConverter = (f: CardFeature) =>
    f.isAnthemOrOverrun || f.isFoodPayoff || RE_CONVERTER.test(f.card.oracle_text || '');
  const converters = pickMembers(nonLand, commanders, isConverter);
  const producers = nonLand.filter((e) => isProducer(e.feature) && !isBody(e.feature));
  if (converters.length > 0 && producers.length > 0) {
    // ponytail: a flat 2 power per converted producer, the v1 assumption kept.
    // Upgrade path is a curated per-card token table.
    const converted = [...bodies, ...producers.map((e) => sourceOf(e.feature, e.quantity, 2 * e.feature.s))];
    const verifiedConverted = [
      ...verifiedBodies,
      ...producers.filter((e) => e.feature.s >= 1).map((e) => toMember(e.feature, e.quantity)),
    ];
    const tokens = scheduleRecipe('tokens', (r) => `Token/Food conversion (${r} bodies)`,
      format, N, converted, verifiedConverted, [{ members: converters, r: 1 }], rampBonus, target, poolSizeCap);
    if (tokens) out.push(tokens);
  }
  return out;"""

new = """  // A CREATURE token attacks on its own; only Food/Treasure/Clue needs a
  // conversion effect (§1 W's rule is about Food, not about tokens). Splitting
  // them is what makes the family fire: `standard-1445867-aljce` closes with
  // Simulacrum Synthesizer Constructs and has no anthem to "convert" them, and
  // `the-cabbage-merchant` makes its Food on the COMMANDER, which the old
  // nonland-only producer list could not see at all.
  const isFoodLike = (f: CardFeature) => f.isFoodProducer || f.isTreasureProducer;
  const isConverter = (f: CardFeature) =>
    f.isAnthemOrOverrun || f.isFoodPayoff || RE_CONVERTER.test(f.card.oracle_text || '');
  const converters = pickMembers(nonLand, commanders, isConverter);
  // A producer whose trigger needs an OPPONENT to act is half a producer: the
  // §1 opponent-trigger prior, applied to output rather than to access.
  const producerOutput = (f: CardFeature): number =>
    2 * f.s * (RE_OPPONENT_TRIGGER.test(f.card.oracle_text || '') ? 0.5 : 1);
  const producerEntries = (pred: (f: CardFeature) => boolean): DeckEntry[] => [
    ...commanders.filter(pred).map((f) => ({ feature: f, quantity: 1 })),
    ...nonLand.filter((e) => pred(e.feature)),
  ];
  // Creature-token makers ride the plain pressure schedule; Food-likes only
  // join once something converts them.
  const tokenMakers = producerEntries((f) => f.isCreatureTokenProducer);
  const foodMakers = converters.length > 0
    ? producerEntries((f) => isFoodLike(f) && !f.isCreatureTokenProducer)
    : [];
  const producers = [...tokenMakers, ...foodMakers];
  if (producers.length > 0) {
    // ponytail: a flat 2 power per producer per turn, the v1 assumption kept.
    // Upgrade path is a curated per-card token table.
    const isCommanderProducer = (e: DeckEntry) => commanders.includes(e.feature);
    const converted = [
      ...bodies,
      ...producers.map((e) => sourceOf(e.feature, e.quantity, producerOutput(e.feature), isCommanderProducer(e))),
    ];
    const verifiedConverted = [
      ...verifiedBodies,
      ...producers.filter((e) => e.feature.s >= 1)
        .map((e) => toMember(e.feature, e.quantity, isCommanderProducer(e))),
    ];
    const extra: RecipePool[] = foodMakers.length > 0 ? [{ members: converters, r: 1 }] : [];
    const tokens = scheduleRecipe('tokens', (r) => `Token/Food conversion (${r} bodies)`,
      format, N, converted, verifiedConverted, extra, rampBonus, target, poolSizeCap);
    if (tokens) out.push(tokens);
  }
  return out;"""
assert old in s
s = s.replace(old, new, 1)

s = s.replace(
    "const RE_CONVERTER = ",
    "/** A trigger the controller cannot fire alone (\u00a71's 0.5 opponent prior). */\n"
    "const RE_OPPONENT_TRIGGER = /whenever [^.]*(?:an opponent|opponents|a creature an opponent controls)|opponent (?:attacks|casts|draws)/i;\n"
    "const RE_CONVERTER = ", 1)

# ---------------------------------------------------------------- item 2 ----
old = """  if (totals.E < totals.Estar) return null;
  if (totals.D < totals.Dstar && !totals.hasDrawEngine) return null;
  const durable = Math.min(clip(totals.E / totals.Estar), clip(totals.D / totals.Dstar));
  if (durable <= 0) return null;"""
new = """  if (totals.E < totals.Estar) return null;
  // \u00a78: the exemption needs a DURABLE advantage engine - something that keeps
  // producing - not a stack of one-shot draw spells. Counting `D >= D*` as an
  // alternative let a Food midrange list with six fat creatures read as
  // "Control inevitability" (cabbage-cedh-input, score 73 in a 35-50 band).
  if (!totals.hasDrawEngine) return null;
  // …and stabilisation means answers that are actually up early: \u00a78's "E >= E*
  // with >= 2 cheap answers by T3".
  const cheapAnswers = nonLand
    .filter((e) => e.feature.answerAxes.length > 0 && e.feature.c <= 3 && e.feature.s >= 1)
    .reduce((sum, e) => sum + e.quantity, 0);
  if (cheapAnswers < 2) return null;
  const durable = Math.min(clip(totals.E / totals.Estar), clip(totals.D / totals.Dstar));
  if (durable <= 0) return null;"""
assert old in s
s = s.replace(old, new, 1)

# ---------------------------------------------------------------- item 3 ----
old = """  const isFinisher = (f: CardFeature) =>
    (f.power != null && f.power >= 4) ||
    /\\bPlaneswalker\\b/.test(f.card.type_line || '') ||
    f.isAltWin ||
    Number(RE_REPEATABLE_DAMAGE.exec(f.card.oracle_text || '')?.[1] ?? 0) >= 3;"""
new = """  // \u00a78: a control deck closes with planeswalkers, repeatable damage/draw
  // engines, manlands and typed "you win" permanents as readily as with a fat
  // body - a creatureless list had NO finisher pool at all and returned W = 0.
  const isFinisher = (f: CardFeature) =>
    (f.power != null && f.power >= 4) ||
    /\\bPlaneswalker\\b/.test(f.card.type_line || '') ||
    f.isAltWin ||
    f.isCreatureTokenProducer ||
    RE_MANLAND.test(f.card.oracle_text || '') ||
    (f.isDrawEngine && f.isDrainPayoff) ||
    Number(RE_REPEATABLE_DAMAGE.exec(f.card.oracle_text || '')?.[1] ?? 0) >= 3;"""
assert old in s
s = s.replace(old, new, 1)

s = s.replace(
    "const RE_REPEATABLE_DAMAGE = ",
    "/** Becomes a creature under the controller's own control - a manland or a\n"
    " * crewed Vehicle is a finisher that dodges sorcery-speed removal. */\n"
    "const RE_MANLAND = /becomes? an? [^.]*creature|crew \\d/i;\n"
    "const RE_REPEATABLE_DAMAGE = ", 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
