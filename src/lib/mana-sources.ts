/**
 * Canonical "real mana sources" classifier.
 *
 * Scryfall's `produced_mana` overstates fixing for several card classes that
 * the deck builder kept trusting blindly (the recurring mana-screw bug):
 *
 *   - "spend this mana only to cast creature spells"  (Cavern of Souls et al.)
 *   - one-shot sacrifice-for-mana rituals/lands         (Lotus Vale, Dark Ritual)
 *   - filter lands that need other mana to activate     (need 1 to make 2)
 *
 * This module is the single source of truth for "which WUBRG colors does this
 * card reliably provide as general-purpose fixing." Both the land scorer and
 * the post-build deck auditor consume it, so the two never disagree.
 */

export interface ManaSourceCard {
  name: string;
  type_line?: string | null;
  oracle_text?: string | null;
  produced_mana?: string | null;
  mana_cost?: string | null;
}

export interface ManaSourceProfile {
  /** WUBRG colors reliably available for ANY spell (empty if restricted/none) */
  colors: string[];
  /** Card category for source-counting */
  kind: 'land' | 'rock' | 'dork' | 'other' | 'none';
  /** false when production is restricted/conditional/one-shot */
  reliable: boolean;
  /** Whether it taps for any one of several colors (Command Tower, gates) */
  anyColor: boolean;
  note?: string;
}

const WUBRG = ['W', 'U', 'B', 'R', 'G'];

function parseProduced(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    return (JSON.parse(json) as string[]).filter((c) => WUBRG.includes(c));
  } catch {
    return [];
  }
}

/** True when the card's colored mana can only pay for a card-type subset. */
export function isRestrictedProducer(oracleText: string | null | undefined): boolean {
  const t = (oracleText || '').toLowerCase();
  if (!t) return false;
  // "Spend this mana only to cast creature spells" / "...only to cast artifact..."
  if (/spend this mana only to cast/.test(t)) return true;
  // Older templating: "...can be spent only to cast..."
  if (/can be spent only to cast/.test(t)) return true;
  return false;
}

/** True for one-shot mana (rituals, sac-for-mana) — burst, not a stable source. */
function isOneShotMana(card: ManaSourceCard): boolean {
  const t = (card.oracle_text || '').toLowerCase();
  const type = (card.type_line || '').toLowerCase();
  // Rituals: instant/sorcery that adds mana
  if ((type.includes('instant') || type.includes('sorcery')) && /add (?:\{|one|two|three)/.test(t)) return true;
  // Lands/artifacts that sacrifice THEMSELVES to add mana (Lotus Vale makes mana
  // repeatedly, but cards like Lotus Petal / Black Lotus are one-shot)
  if (/sacrifice [^.]*: add/i.test(card.oracle_text || '') && type.includes('artifact') && !/\{t\}: add/i.test(card.oracle_text || '')) return true;
  return false;
}

/**
 * Classify a card's reliable colored-mana contribution for source counting.
 */
export function realManaSources(card: ManaSourceCard): ManaSourceProfile {
  const type = (card.type_line || '').toLowerCase();
  const produced = parseProduced(card.produced_mana);
  const isLand = type.split('//')[0].includes('land');
  const isRock = !isLand && type.includes('artifact') && produced.length > 0;
  const isDork = !isLand && type.includes('creature') && produced.length > 0;

  const kind: ManaSourceProfile['kind'] = isLand ? 'land' : isRock ? 'rock' : isDork ? 'dork' : produced.length ? 'other' : 'none';

  if (produced.length === 0) {
    return { colors: [], kind: 'none', reliable: false, anyColor: false };
  }

  if (isRestrictedProducer(card.oracle_text)) {
    return { colors: [], kind, reliable: false, anyColor: false, note: 'restricted: spell-type only' };
  }

  if (isOneShotMana(card)) {
    return { colors: [], kind, reliable: false, anyColor: false, note: 'one-shot burst' };
  }

  // Reliable. A producer of 3+ WUBRG colors taps for any ONE of them per use
  // (Command Tower, gates, chosen-color lands) — still counts as a source of
  // each color by the standard deckbuilding convention.
  const anyColor = produced.length >= 3;
  return { colors: produced, kind, reliable: true, anyColor };
}

/**
 * Count reliable WUBRG sources across a card list (with quantities).
 * Each reliable producer adds 1 toward every color it can make.
 */
export function countColorSources(
  cards: Array<{ card: ManaSourceCard; quantity: number }>
): Record<string, number> {
  const sources: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const { card, quantity } of cards) {
    const prof = realManaSources(card);
    if (!prof.reliable) continue;
    for (const c of prof.colors) {
      if (sources[c] !== undefined) sources[c] += quantity;
    }
  }
  return sources;
}

/** Sum colored pips across nonland cards' mana costs (with quantities). */
export function countPipDemand(
  cards: Array<{ card: ManaSourceCard; quantity: number }>
): Record<string, number> {
  const pips: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const { card, quantity } of cards) {
    const type = (card.type_line || '').toLowerCase();
    if (type.split('//')[0].includes('land')) continue;
    const mc = card.mana_cost || '';
    for (const m of mc.matchAll(/\{([WUBRG])\}/g)) {
      pips[m[1]] += quantity;
    }
  }
  return pips;
}
