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
  cmc?: number | null;
  power?: string | null;
  /** Copies in the deck (a 60/100-card deck stores one entry per unique card
   * with a quantity, e.g. "28 Mountain" — default 1 for single copies). */
  quantity?: number;
}

export type TutorTargetKind = 'subtype' | 'name' | 'supertype' | 'mv_min';

export interface TutorTarget {
  kind: TutorTargetKind;
  value: string;
  /** mv_min only: the broad type searched ("creature" in Fierce Empath). */
  typeWord?: string;
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

/** Own text that CREATES tokens ("create a 1/1 …", "create X … tokens", amass reminder text). Lower-case input. */
export const TOKEN_MAKER_RE = /\bcreates? (?:a|an|x|two|three|four|five|that many|\d+)\b[^.]*\btokens?\b/;

/**
 * A payoff that only fires off the creatures you control — an ETB/attack/death
 * engine, a power-N-or-greater draw, a sacrifice-a-creature outlet, a "for each
 * creature you control" finisher. Dead weight in a creature-light list.
 * Lower-case input; Elspeth's "destroy all creatures with power 4 or greater"
 * is deliberately NOT matched (that one wants few creatures).
 */
export const CREATURE_GATED_RE = new RegExp([
  'whenever (?:a|an|another|one or more) (?:nontoken |non-token |other )?(?:\\w+ )?creatures? (?:you control )?(?:enters|attacks|dies|blocks)',
  'greatest power among creatures you control',
  'creatures? you control with power \\d or greater',
  'you control a creature with power \\d or greater',
  'for each creature you control',
  'sacrifice (?:a|another) creature:',
].join('|'));

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
  // P2 B-D6: "a creature card with mana value 6 or greater" (Fierce Empath)
  // is narrow by cost, not by type — the deck needs that many big cards.
  const mv = text.match(/library for (?:a|an) ([a-z]+) card with mana value (\d+) or greater/i);
  if (mv) return { kind: 'mv_min', value: mv[2], typeWord: mv[1].toLowerCase() };
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
  if (target.kind === 'mv_min') {
    const min = Number(target.value);
    const typeWord = (target.typeWord || '').toLowerCase();
    return cards
      .filter((c) => (c.cmc ?? 0) >= min && (c.type_line || '').toLowerCase().includes(typeWord))
      .reduce((s, c) => s + (c.quantity ?? 1), 0);
  }
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

// P2 B-D6 — enabler census thresholds: a payoff needs this many enablers in
// the 99 (+ the commander) to be live; a tribe trigger needs a real tribe; a
// creature-count engine needs a creature deck.
const ENABLER_MIN = 4;
const TRIBE_MIN = 8;
const CREATURE_DENSITY_MIN = 12;
const LIFEGAIN_RE = /\bgains? (?:\d+|x|that much) life\b|\blifelink\b|\byou gain life\b/i;
const CHANGELING_RE = /\bchangeling\b|every creature type/i;
// Words a "<X>s you control get/have" or "whenever a(n) <X> you control enters"
// clause can name that are not a tribe or a subtype census can count.
const GENERIC_ENABLER_WORDS = new Set(['creature', 'permanent', 'token', 'nontoken', 'card', 'spell', 'other', 'another']);

const singular = (word: string): string =>
  word.replace(/ves$/, 'f').replace(/ies$/, 'y').replace(/([^s])s$/, '$1');

/**
 * A payoff whose trigger names an enabler the deck lacks: Idol of Oblivion
 * with no token makers, Well of Lost Dreams with no lifegain, Garruk's
 * Uprising with no power-4 creatures, Vanquisher's Banner with no tribe,
 * Dragon's Hoard with no Dragons, Sram with no Auras/Equipment/Vehicles, a
 * creature-count engine or sacrifice outlet (The Great Henge, Guardian
 * Project, Ashnod's Altar) in a creature-light list. The commander's own text
 * counts as one enabler (Edgar makes Idol's tokens). Returns the shortfall as
 * text, or null when the payoff is live.
 */
export function enablerShortfall(
  card: { name: string; oracle_text: string | null },
  deck: RelevanceCard[],
  commanderOracle?: string,
): string | null {
  const text = card.oracle_text || '';
  const others: RelevanceCard[] = deck.filter((c) => c.name !== card.name);
  if (commanderOracle) others.push({ name: '(commander)', type_line: null, oracle_text: commanderOracle });
  const count = (pred: (c: RelevanceCard) => boolean): number =>
    others.filter(pred).reduce((s, c) => s + (c.quantity ?? 1), 0);
  const isCreature = (c: RelevanceCard): boolean => /\bCreature\b/.test(c.type_line || '');

  if (/\byou (?:create|created) (?:a|an|one or more) tokens?\b/i.test(text)) {
    const n = count((c) => TOKEN_MAKER_RE.test((c.oracle_text || '').toLowerCase()));
    if (n < ENABLER_MIN) return `no enabler: ${n} token makers`;
  }
  if (/whenever you gain life/i.test(text)) {
    const n = count((c) => LIFEGAIN_RE.test(c.oracle_text || ''));
    if (n < ENABLER_MIN) return `no enabler: ${n} lifegain cards`;
  }
  const power = text.match(/creatures? you control with power (\d) or greater|you control a creature with power (\d) or greater/i);
  if (power) {
    const min = Number(power[1] ?? power[2]);
    const n = count((c) => isCreature(c) && Number(c.power) >= min);
    if (n < ENABLER_MIN) return `no enabler: ${n} creatures with power ${min}+`;
  }
  if (/choose a creature type/i.test(text)) {
    const byType = new Map<string, number>();
    let changelings = 0;
    for (const c of others) {
      if (!isCreature(c)) continue;
      const qty = c.quantity ?? 1;
      if (CHANGELING_RE.test(c.oracle_text || '')) { changelings += qty; continue; }
      for (const t of ((c.type_line || '').split('—')[1] || '').trim().split(/\s+/).filter(Boolean)) {
        byType.set(t, (byType.get(t) ?? 0) + qty);
      }
    }
    const largest = Math.max(0, ...byType.values()) + changelings;
    if (largest < TRIBE_MIN) return `no enabler: chosen type, largest tribe ${largest}`;
  }
  // "Whenever a Dragon you control enters", "whenever you cast an Aura, Equipment,
  // or Vehicle spell", "Elves you control have …" — the named subtype must be there.
  const typed = text.match(/[Ww]henever (?:a|an|another) ([A-Z][a-z]+) (?:creature )?you control (?:enters|attacks|dies)/)
    || text.match(/[Ww]henever (?:a|an|another) ([A-Z][a-z]+) enters(?: the battlefield)? under your control/)
    || text.match(/[Ww]henever you cast (?:a|an|another) ((?:[A-Z][a-z]+(?:, | or |, or ))*[A-Z][a-z]+) (?:creature )?spell/)
    || text.match(/\b([A-Z][a-z]+s) you control (?:get|have)\b/);
  if (typed) {
    const words = typed[1].split(/, or |, | or /).map(singular);
    if (!words.some((w) => GENERIC_ENABLER_WORDS.has(w.toLowerCase()))) {
      const tribe = count((c) => words.some((w) => isTribeCreature(c, w)));
      const sub = countTargets({ kind: 'subtype', value: words.join(' or ') }, others);
      const threshold = tribe > 0 && tribe >= sub / 2 ? TRIBE_MIN : ENABLER_MIN;
      const n = Math.max(tribe, sub);
      if (n < threshold) return `no enabler: ${n} ${words.join('/')} (need ${threshold})`;
    }
  }
  if (CREATURE_GATED_RE.test(text.toLowerCase())) {
    const n = count(isCreature);
    if (n < CREATURE_DENSITY_MIN) return `no enabler: ${n} creatures for a creature-gated card`;
  }
  return null;
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
