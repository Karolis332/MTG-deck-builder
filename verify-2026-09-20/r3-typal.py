import io
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\deck-score-plans.ts'
s = io.open(p, encoding='utf-8').read()

block = r'''
// -- Section 8 engine family: typal / party / artifact-count ----------------
//
// Five-colour party (`tazri-beacon-of-unity`) and artifact-count decks
// (`imotekh-the-stormlord`) were unreadable: no generic recipe counts "cards
// that reward a creature TYPE", so both scored S = 0 on a deck built entirely
// around one. The recipe is derived from the deck, like the closing line --
// the tribes are whatever the deck's own creatures are, never a name list.

/** Creature subtypes printed on a card, from `subtypes` or the type line. */
export function subtypesOf(f: CardFeature): string[] {
  const raw = f.card.subtypes;
  if (raw) {
    const parsed = raw.trim().startsWith('[') ? (JSON.parse(raw) as string[]) : raw.split(/[,\s]+/);
    return parsed.filter(Boolean);
  }
  const dash = (f.card.type_line || '').split(/[-\u2014]/)[1];
  return dash ? dash.trim().split(/\s+/).filter(Boolean) : [];
}

/** The four party classes are a rules-defined set, not a tribe choice. */
const PARTY_CLASSES = ['Cleric', 'Rogue', 'Warrior', 'Wizard'];
const RE_ARTIFACT_COUNT = /for each artifact you control|artifacts you control get|number of artifacts you control/i;
const RE_PARTY = /\bfull party\b|\byour party\b|\bparty\b/i;

export interface TypalTheme {
  /** Subtypes (or 'Artifact') the deck's payoffs actually reward. */
  tribes: string[];
  artifacts: boolean;
  party: boolean;
}

/** What this deck counts, measured from its own creatures and payoff texts. */
export function typalTheme(all: readonly CardFeature[]): TypalTheme {
  const counts = new Map<string, number>();
  for (const f of all) {
    if (!isCreatureBody(f)) continue;
    for (const t of subtypesOf(f)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const candidates = [...counts.entries()].filter(([, n]) => n >= 3).map(([t]) => t);
  const text = all.map((f) => f.card.oracle_text || '').join(' \u00b6 ');
  const tribes = candidates.filter((t) => new RegExp(`\\b${t}s?\\b`).test(text));
  const party = RE_PARTY.test(text) && PARTY_CLASSES.filter((c) => (counts.get(c) ?? 0) >= 1).length >= 3;
  return { tribes, artifacts: RE_ARTIFACT_COUNT.test(text), party };
}

/** A payoff READS the count; an enabler SUPPLIES it. */
function typalRoles(theme: TypalTheme): { payoff: (f: CardFeature) => boolean; enabler: (f: CardFeature) => boolean } {
  const words = [...theme.tribes, ...(theme.party ? PARTY_CLASSES : [])];
  const tribeRe = words.length > 0 ? new RegExp(`\\b(?:${words.join('|')})s?\\b`) : null;
  const payoff = (f: CardFeature): boolean => {
    const text = f.card.oracle_text || '';
    if (theme.artifacts && RE_ARTIFACT_COUNT.test(text)) return true;
    if (theme.party && RE_PARTY.test(text)) return true;
    return tribeRe !== null && tribeRe.test(text);
  };
  const enabler = (f: CardFeature): boolean => {
    if (theme.artifacts && /\bArtifact\b/.test(f.card.type_line || '')) return true;
    if (!isCreatureBody(f)) return false;
    const subs = subtypesOf(f);
    return subs.some((t) => theme.tribes.includes(t) || (theme.party && PARTY_CLASSES.includes(t)));
  };
  return { payoff, enabler };
}

/** Commander p25/p90 measured on the 2,777-deck sample (scripts/deck-score-bands.ts typal). */
const TYPAL_BAND = { payoff: { min: 2, max: 14 }, enabler: { min: 9, max: 30 } };

export function typalRecipe(theme: TypalTheme): PlanRecipe {
  const { payoff, enabler } = typalRoles(theme);
  const label = theme.party ? 'party' : theme.tribes[0] ?? 'artifact';
  return {
    key: 'typal',
    label: `${label} count — payoffs that read the board, enablers that supply it`,
    roles: [
      { key: 'payoff', essential: true, ...TYPAL_BAND.payoff, fills: payoff },
      { key: 'enabler', essential: true, ...TYPAL_BAND.enabler, servedBy: { roles: ['payoff'], ratio: 8 }, fills: enabler },
      { key: 'answers', essential: false, min: 0, max: 8, fills: answer(5) },
      { key: 'value', essential: false, min: 0, max: 10, fills: velocity(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 10, fills: infrastructure },
    ],
  };
}

/** Null when the deck names no countable theme at all. */
export function evaluateTypal(
  N: number, nonLand: readonly DeckEntry[], guaranteed: readonly DeckEntry[] = [],
): PlanEvaluation | null {
  const features = [...nonLand, ...guaranteed].map((e) => e.feature);
  const theme = typalTheme(features);
  if (theme.tribes.length === 0 && !theme.artifacts && !theme.party) return null;
  return evaluatePlan(typalRecipe(theme), N, nonLand, guaranteed);
}
'''

anchor = "export function selectPlan("
assert anchor in s
s = s.replace(anchor, block.strip() + '\n\n' + anchor, 1)

old = """  const evaluations = PLAN_RECIPES.map((recipe) => evaluatePlan(recipe, N, nonLand, guaranteed));
  return evaluations.reduce(betterPlan, evaluations[0]);"""
new = """  const evaluations = PLAN_RECIPES.map((recipe) => evaluatePlan(recipe, N, nonLand, guaranteed));
  const typal = evaluateTypal(N, nonLand, guaranteed);
  if (typal) evaluations.push(typal);
  return evaluations.reduce(betterPlan, evaluations[0]);"""
assert old in s
s = s.replace(old, new, 1)

s = s.replace("export type PlanKey = 'aggro' | 'midrange' | 'control' | 'aristocrats' | 'lifegain' | 'spells' | 'combo';",
              "export type PlanKey = 'aggro' | 'midrange' | 'control' | 'aristocrats' | 'lifegain' | 'spells' | 'combo' | 'typal';", 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
