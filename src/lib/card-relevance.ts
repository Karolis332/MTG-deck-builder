/**
 * Pure predicates for "is this card actually doing something in this deck"
 * checks — narrow tutors whose target isn't in the 99, colour-fixing that's
 * wasted in a mono-colour deck, and colourless-pip costs the manabase can't
 * pay. No DB access; the caller supplies card rows.
 *
 * Built for U0 (builder-plan-2026-09-26): the Aeve build shipped Courier of
 * Comestibles (Food tutor, no Food) and Chromatic Lantern (fixing, mono-G).
 * See verify-2026-09-26/aeve/builder-diagnosis.md.
 */

export interface RelevanceCard {
  name: string;
  type_line: string | null;
  oracle_text: string | null;
  mana_cost?: string | null;
  /** Copies in the deck (a 60/100-card deck stores one entry per unique card
   * with a quantity, e.g. "28 Mountain" — default 1 for single copies). */
  quantity?: number;
}

export type TutorTargetKind = 'subtype' | 'name' | 'supertype';

export interface TutorTarget {
  kind: TutorTargetKind;
  value: string;
}

// Types/supertypes broad enough that "search for a(n) X card" isn't a narrow
// tutor — any reasonable deck has plenty of hits. Keep this list conservative;
// anything not on it is treated as narrow (safer to flag a false-narrow than
// to miss a real dead tutor).
const BROAD_WORDS = new Set([
  'card', 'cards', 'creature', 'creatures', 'land', 'lands', 'basic land', 'basic lands',
  'artifact', 'artifacts', 'enchantment', 'enchantments', 'instant', 'instants',
  'sorcery', 'sorceries', 'planeswalker', 'planeswalkers', 'permanent', 'permanents',
  'noncreature', 'nonland', 'nontoken', 'nonbasic land', 'basic',
]);

const MTG_SUPERTYPES = new Set(['legendary', 'snow', 'world', 'host']);

// Colour words in front of a broad card type don't narrow the *type* being
// searched, only which copies match ("a green creature card" is exactly as
// broad as "a creature card") — Green Sun's Zenith reads this way and was
// wrongly flagged as a narrow tutor.
const COLOR_WORDS = new Set([
  'white', 'blue', 'black', 'red', 'green', 'colorless', 'multicolored', 'monocolored', 'mono-colored',
]);

/**
 * "Search your library for a(n) <X> card" → narrow target if <X> isn't one
 * of the broad types/supertypes above (or an "X or Y" combination of them).
 * "...card named X" → name target. Non-tutor cards, and tutors for a broad
 * type, return null.
 */
export function narrowTutorTarget(card: { oracle_text: string | null }): TutorTarget | null {
  const text = card.oracle_text || '';
  const m = text.match(/search[^.]*?library for (?:a|an|up to [^,]+|X)\s+([a-zA-Z][\w '\-]*?)\s+cards?\b/i)
    || text.match(/search[^.]*?library for (?:a|an)\s+cards?\b/i);
  if (!m) return null;

  const descriptor = (m[1] || '').trim();
  if (!descriptor) return null; // "search for a card" — broadest possible

  const namedMatch = descriptor.match(/(?:card\s+)?named\s+(.+)$/i) || text.match(/card named ([^.,"]+)/i);
  if (namedMatch) return { kind: 'name', value: namedMatch[1].trim() };

  // Strip trailing qualifiers like "with mana value 3 or less" that don't
  // narrow the *type* of the search, only its cost.
  const stripped = descriptor.replace(/\s+with (mana value|cmc)[^,]*$/i, '').trim().toLowerCase();

  // Drop a leading run of colour words ("green", "white or blue") before
  // checking broadness — they restrict which copies match, not the type.
  const strippedWords = stripped.split(/\s+/);
  let colorRunEnd = 0;
  while (
    colorRunEnd < strippedWords.length - 1
    && (COLOR_WORDS.has(strippedWords[colorRunEnd]) || strippedWords[colorRunEnd] === 'or' || strippedWords[colorRunEnd] === 'and')
  ) {
    colorRunEnd++;
  }
  const withoutColor = strippedWords.slice(colorRunEnd).join(' ');

  const words = withoutColor.split(/\s+or\s+|\s+and\s+/);
  if (words.every((w) => BROAD_WORDS.has(w.trim()))) return null;

  const single = stripped.trim();
  if (MTG_SUPERTYPES.has(single)) {
    return { kind: 'supertype', value: single[0].toUpperCase() + single.slice(1) };
  }

  // Title-case the subtype as it would appear on a card (e.g. "spider hero" -> "Spider Hero").
  const value = descriptor
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
  return { kind: 'subtype', value };
}

/** How many of `cards` satisfy a tutor target. */
export function countTargets(target: TutorTarget, cards: RelevanceCard[]): number {
  if (target.kind === 'name') {
    const needle = target.value.toLowerCase();
    return cards.filter((c) => c.name.toLowerCase() === needle).reduce((s, c) => s + (c.quantity ?? 1), 0);
  }
  // "Forest or Mountain" (fetch lands) must match EITHER option, not the
  // literal joined phrase — otherwise every dual-type fetch reads as narrow.
  const needles = target.value.toLowerCase().split(/\s+or\s+|\s+and\s+/).map((s) => s.trim()).filter(Boolean);
  let count = 0;
  for (const c of cards) {
    const qty = c.quantity ?? 1;
    const typeLine = (c.type_line || '').toLowerCase();
    if (needles.some((n) => typeLine.includes(n))) {
      count += qty;
      continue;
    }
    // A Food tutor is satisfied by Food-token producers even when the source
    // card isn't itself type "Food" — the deck still has Food to find/use.
    if (needles.includes('food') && /create[s]? .*food token/i.test(c.oracle_text || '')) {
      count += qty;
    }
  }
  return count;
}

/** Count of {C} (colourless) symbols in a mana cost — not generic {N}. */
export function colorlessPipCount(manaCost: string | null | undefined): number {
  if (!manaCost) return 0;
  return (manaCost.match(/\{C\}/g) || []).length;
}

/**
 * A card that can actually produce {C}: a literal "Add {C}" ability, or a
 * token-maker whose tokens tap for {C} (Eldrazi Spawn/Scion, etc). A plain
 * "add one mana of any color" ability does NOT count — that's fixing, not a
 * colourless source.
 */
export function isColorlessSource(card: { oracle_text: string | null; type_line?: string | null }): boolean {
  const text = card.oracle_text || '';
  if (/add \{c\}/i.test(text)) return true;
  if (/eldrazi (spawn|scion)/i.test(text) && /add \{c\}/i.test(text)) return true;
  return false;
}

/**
 * A NONLAND permanent whose only role is granting colour fixing beyond its
 * own plain mana ability — dead weight once the deck is mono-colour. Plain
 * rocks that just tap for "one mana of any color" (Arcane Signet, Mind
 * Stone) are NOT flagged; they still ramp. Only the extra fixing clause
 * (Chromatic Lantern's "Lands you control have '{T}: Add one mana of any
 * color'") is dead in mono, because nothing needs the extra colours.
 */
export function isMonoColourDeadFixer(
  card: { oracle_text: string | null; type_line: string | null },
  deckColours: string[]
): boolean {
  if (deckColours.length > 1) return false;
  const typeLine = (card.type_line || '').toLowerCase();
  if (typeLine.includes('land')) return false; // lands are out of scope here
  const text = card.oracle_text || '';
  // Grants a mana-fixing ability to lands/permanents you control — useless
  // when every land you'd tap already makes the one colour you need.
  return /(lands|permanents) (you control )?have\s+"[^"]*any color[^"]*"/i.test(text);
}

/**
 * A creature that counts toward a tribe's presence in the deck: literally of
 * that creature type, or a changeling (every creature type — matches every
 * tribe by definition). Mirrors the measure scripts/build-regress.ts uses to
 * report tribe/changeling counts, so the builder's own tribal-minimum
 * backfill (U1b) targets the same thing the harness checks.
 */
export function isTribeCreature(
  card: { type_line: string | null; oracle_text: string | null; keywords?: string | null },
  tribe: string
): boolean {
  const typeLine = (card.type_line || '').toLowerCase();
  if (!typeLine.includes('creature')) return false;
  if (typeLine.includes(tribe.toLowerCase())) return true;
  const keywords = (card.keywords || '').toLowerCase();
  const oracle = (card.oracle_text || '').toLowerCase();
  return keywords.includes('changeling') || oracle.includes('all creature types') || oracle.includes('every creature type');
}
