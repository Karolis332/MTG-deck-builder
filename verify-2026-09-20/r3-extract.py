import io, re
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\deck-score-win.ts'
s = io.open(p, encoding='utf-8').read()

# 1. expose the cumulative the schedule actually reaches, for diagnostics.
old = "/** Attack steps available by `t*` \u2014 combat starts on turn 2. */"
new = """/** Total expected damage the same schedule reaches by `MAX_TURN` \u2014 the number
 * that explains a null `closingTurn`. Diagnostics only. */
export function combatCeiling(
  format: ScoreFormat, N: number, sources: readonly Source[], rampBonus: number,
): number {
  let cumulative = 0;
  for (let t = 2; t <= MAX_TURN; t++) {
    const mana = availableManaAtTurn(t - 1, rampBonus);
    const seen = Math.min(1, Hf(format, N, 1, t - 1, 1));
    for (const s of sources) {
      if (s.guaranteed) { if (Math.ceil(s.cmc) <= t) cumulative += s.output; }
      else if (s.cmc <= mana) cumulative += s.quantity * seen * s.output;
    }
  }
  return cumulative;
}

/** Attack steps available by `t*` \u2014 combat starts on turn 2. */"""
assert old in s
s = s.replace(old, new, 1)

# 2. pressureRecipes returns its source sets for the diagnostic.
old = "function pressureRecipes(\n  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],\n  rampBonus: number, target: number, poolSizeCap: number,\n): Recipe[] {"
new = "export interface PressureOutput { recipes: Recipe[]; bodies: Source[]; converted: Source[] }\n\nfunction pressureRecipes(\n  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],\n  rampBonus: number, target: number, poolSizeCap: number,\n): PressureOutput {"
assert old in s
s = s.replace(old, new, 1)

old = """    const tokens = scheduleRecipe('tokens', (r) => `Token/Food conversion (${r} bodies)`,
      format, N, converted, verifiedConverted, extra, rampBonus, target, poolSizeCap);
    if (tokens) out.push(tokens);
  }
  return out;"""
new = """    const tokens = scheduleRecipe('tokens', (r) => `Token/Food conversion (${r} bodies)`,
      format, N, converted, verifiedConverted, extra, rampBonus, target, poolSizeCap);
    if (tokens) out.push(tokens);
    return { recipes: out, bodies, converted };
  }
  return { recipes: out, bodies, converted: bodies };"""
assert old in s
s = s.replace(old, new, 1)

# 3. both callers take .recipes
s = s.replace(
  "  recipes.push(...pressureRecipes(format, N, nonLand, commanders, rampBonus, combatTarget, norms.poolSizeCap));\n  const drain = drainRecipe(format, N, nonLand, commanders, rampBonus, shape.lifePerOpponent, norms.poolSizeCap);\n  if (drain) recipes.push(drain);\n  const voltron = voltronRecipe(format, N, nonLand, commanders, rampBonus, opponents);\n  if (voltron) recipes.push(voltron);\n  const altWin = altWinRecipe(nonLand, commanders);\n  if (altWin) recipes.push(altWin);\n  const control = controlRecipe(format, norms, N, nonLand, commanders, totals);\n  if (control) recipes.push(control.recipe);\n  const lines = [",
  "  const pressure = pressureRecipes(format, N, nonLand, commanders, rampBonus, combatTarget, norms.poolSizeCap);\n  recipes.push(...pressure.recipes);\n  const drain = drainRecipe(format, N, nonLand, commanders, rampBonus, shape.lifePerOpponent, norms.poolSizeCap);\n  if (drain) recipes.push(drain);\n  const voltron = voltronRecipe(format, N, nonLand, commanders, rampBonus, opponents);\n  if (voltron) recipes.push(voltron);\n  const altWin = altWinRecipe(nonLand, commanders);\n  if (altWin) recipes.push(altWin);\n  const control = controlRecipe(format, norms, N, nonLand, commanders, totals);\n  if (control) recipes.push(control.recipe);\n  const lines = [\n    `combat ceiling by T12: bodies ${combatCeiling(format, N, pressure.bodies, rampBonus).toFixed(1)}, with conversion ${combatCeiling(format, N, pressure.converted, rampBonus).toFixed(1)} (target ${combatTarget})`,",
  1)
s = s.replace(
  "  recipes.push(...pressureRecipes(format, N, nonLand, commanders, rampBonus, combatTarget, norms.poolSizeCap));",
  "  recipes.push(...pressureRecipes(format, N, nonLand, commanders, rampBonus, combatTarget, norms.poolSizeCap).recipes);",
  1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
