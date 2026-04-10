/**
 * Commander Analysis Module — the "what should this deck look like" engine.
 *
 * This is the piece that was missing. The old flow treated the commander as
 * just another card in the pool. This module does what a competent human
 * deck builder does:
 *
 *   1. Read the commander's oracle text carefully and extract concrete,
 *      actionable needs (not just "spell_cast" — actual things like "needs
 *      cheap instants/sorceries ≤ CMC 2" or "needs ETB creatures").
 *   2. Query the community per-commander data (commander_card_stats) for
 *      the cards most commonly associated with this exact commander.
 *   3. Cross-check the user's collection for both exact matches and
 *      similar-function substitutes, so we build the best arsenal the
 *      user can actually cast.
 *   4. Layer in universal auto-include staples that go in *every* deck of
 *      the commander's colors: MDFC lands, fetch lands that fetch on-color
 *      basics, signets, talismans, cost-reducers.
 *   5. Enforce color identity strictly. Off-color cards are never returned.
 *
 * Output: a ranked "arsenal" — a prioritized list of cards with a
 * machine-readable reason for each pick. The deck builder uses this as the
 * *base* pool (force-include prefix), then fills gaps with the constraints
 * engine.
 */

import { getDb, getCommanderCardStats } from './db';
import type { DbCard } from './types';
import { analyzeCommander } from './commander-synergy';
import type { CommanderSynergyProfile, SynergyCategory } from './commander-synergy';
import {
  ARCHETYPE_PAYOFFS,
  STAPLE_RAMP,
  STAPLE_DRAW,
  STAPLE_REMOVAL,
  STAPLE_BOARD_WIPE,
  STAPLE_PROTECTION,
} from './deck-builder-constraints';
import { isFetchLandRelevant } from './land-intelligence';
import { getLegalityKey } from './constants';
import { classifyCard } from './card-classifier';

// ── Types ────────────────────────────────────────────────────────────────

export type ArsenalReason =
  | 'community_top'         // high inclusion in community decks for THIS commander
  | 'community_synergy'     // positive synergy score vs global baseline
  | 'archetype_payoff'      // curated payoff list matches a commander trigger
  | 'staple_ramp'
  | 'staple_draw'
  | 'staple_removal'
  | 'staple_wipe'
  | 'staple_protection'
  | 'staple_land'           // MDFC / fetch / utility land
  | 'collection_substitute' // owned card that fills same function as missing target
  | 'commander_direct_need'; // something the commander's oracle text explicitly demands

export interface ArsenalCard {
  card: DbCard;
  priority: number;         // 0..100, higher = more important
  reason: ArsenalReason;
  detail: string;           // human-readable explanation
  inclusionRate?: number;   // if from community data
  owned: number;            // 0 if not in collection
}

export interface CommanderDirectNeeds {
  /** The commander explicitly mentions a CMC ceiling (e.g. "spells with CMC ≤ 3") */
  cmcCeiling: number | null;
  /** Needs cheap instants/sorceries */
  cheapSpells: boolean;
  /** Needs creatures with a specific subtype (for tribal) */
  requiredCreatureTypes: string[];
  /** Needs ETB triggers */
  etbCreatures: boolean;
  /** Needs death triggers / sac fodder */
  sacFodder: boolean;
  /** Needs artifacts in the deck */
  artifactsMatter: boolean;
  /** Needs enchantments */
  enchantmentsMatter: boolean;
  /** Needs counters mechanics */
  countersMatter: boolean;
  /** Needs graveyard mechanics */
  graveyardMatter: boolean;
  /** Needs token generators */
  tokenMatter: boolean;
  /** Needs landfall triggers */
  landfallMatter: boolean;
  /** Needs lifegain */
  lifegainMatter: boolean;
  /** Commander generates treasures itself */
  selfTreasure: boolean;
  /** Commander provides evasion for itself (voltron-lite) */
  selfEvasion: boolean;
}

export interface CommanderAnalysis {
  commander: DbCard;
  colors: string[];
  colorIdentity: Set<string>;
  synergyProfile: CommanderSynergyProfile | null;
  directNeeds: CommanderDirectNeeds;
  archetype: string;
  arsenal: ArsenalCard[];
  summary: string;
}

// ── Deep oracle-text analysis ────────────────────────────────────────────

/**
 * Read the commander's oracle text carefully and extract concrete needs.
 * This is intentionally hand-tuned patterns — regex alone is too noisy and
 * generic trigger categories are too coarse.
 */
export function extractDirectNeeds(commander: DbCard): CommanderDirectNeeds {
  const text = (commander.oracle_text || '').toLowerCase();
  const typeLine = (commander.type_line || '').toLowerCase();

  const needs: CommanderDirectNeeds = {
    cmcCeiling: null,
    cheapSpells: false,
    requiredCreatureTypes: [],
    etbCreatures: false,
    sacFodder: false,
    artifactsMatter: false,
    enchantmentsMatter: false,
    countersMatter: false,
    graveyardMatter: false,
    tokenMatter: false,
    landfallMatter: false,
    lifegainMatter: false,
    selfTreasure: false,
    selfEvasion: false,
  };

  // CMC ceiling mentions
  const cmcMatch = text.match(/(?:mana value|converted mana cost|mana cost)[^.]*?(\d)\s*(?:or less|or fewer)/);
  if (cmcMatch) {
    needs.cmcCeiling = parseInt(cmcMatch[1], 10);
    needs.cheapSpells = needs.cmcCeiling <= 3;
  }

  // Explicit spell-cast trigger
  if (/whenever you cast (?:an? |your )?(?:instant|sorcery|instant or sorcery|noncreature)/i.test(text)) {
    needs.cheapSpells = true;
  }
  if (text.includes('magecraft') || text.includes('prowess')) {
    needs.cheapSpells = true;
  }

  // Tribal detection — read the type line creature subtypes
  // Legendary Creature — <Race> <Class> suggests tribal if any subtype is a named tribe
  // but only if the commander also references the tribe in its text.
  const subtypeMatch = (commander.type_line || '').match(/—\s*(.*)$/);
  if (subtypeMatch) {
    const subtypes = subtypeMatch[1].split(/\s+/).filter(Boolean);
    for (const st of subtypes) {
      const stLower = st.toLowerCase();
      // Skip class words that aren't really tribes for deck-building
      if (['god', 'legendary'].includes(stLower)) continue;
      if (text.includes(stLower)) {
        needs.requiredCreatureTypes.push(st);
      }
    }
  }

  if (/enters the battlefield/.test(text) && !/when ~ enters/.test(text)) {
    // Commander triggers on other ETBs
    if (/whenever (?:a |another )?(?:creature|permanent) enters/.test(text)) {
      needs.etbCreatures = true;
    }
  }

  if (/(?:whenever a|when another) creature (?:you control )?dies/.test(text)
      || /whenever you sacrifice/.test(text)) {
    needs.sacFodder = true;
  }

  if (/\bartifact\b/.test(text) || /treasure/.test(text)) {
    if (/whenever (?:an? )?artifact/.test(text)
        || /artifact spells?.*cost/.test(text)
        || /for each artifact/.test(text)
        || typeLine.includes('artifact')) {
      needs.artifactsMatter = true;
    }
  }

  if (/\benchantment\b/.test(text)) {
    if (/whenever (?:an? )?enchantment/.test(text)
        || /enchantment spells?.*cost/.test(text)
        || /for each enchantment/.test(text)) {
      needs.enchantmentsMatter = true;
    }
  }

  if (/\+1\/\+1 counter/.test(text) || /proliferate/.test(text)
      || /put a counter/.test(text)) {
    needs.countersMatter = true;
  }

  if (/graveyard/.test(text) || /mill/.test(text) || /reanimate/.test(text)
      || /return .* from .* graveyard/.test(text)) {
    needs.graveyardMatter = true;
  }

  if (/create.*token/.test(text) || /\btokens? you control\b/.test(text)) {
    needs.tokenMatter = true;
  }

  if (/landfall|whenever a land enters/.test(text) || /play an additional land/.test(text)) {
    needs.landfallMatter = true;
  }

  if (/gain \d+ life|lifelink|whenever you gain life/.test(text)) {
    needs.lifegainMatter = true;
  }

  if (/create .*treasure/.test(text)) {
    needs.selfTreasure = true;
  }

  if (text.includes('flying') || text.includes('menace')
      || text.includes('trample') || text.includes('can\'t be blocked')
      || text.includes('unblockable')) {
    needs.selfEvasion = true;
  }

  return needs;
}

// ── Color-identity enforcement ────────────────────────────────────────────

/**
 * Parse color identity from a DbCard's JSON-encoded color_identity field.
 */
export function parseColorIdentity(card: DbCard): Set<string> {
  const out = new Set<string>();
  if (!card.color_identity) return out;
  try {
    const arr = JSON.parse(card.color_identity);
    if (Array.isArray(arr)) {
      for (const c of arr) {
        if (typeof c === 'string') out.add(c);
      }
    }
  } catch {
    // legacy format — may be a plain string
    const s = String(card.color_identity);
    for (const c of s) {
      if ('WUBRG'.includes(c)) out.add(c);
    }
  }
  return out;
}

/**
 * Check if a card is legal in the commander's color identity.
 * Returns true iff every color in the card's color identity is present in
 * the commander's color identity (classic Commander rule).
 */
export function isInColorIdentity(card: DbCard, commanderColors: Set<string>): boolean {
  const cardColors = parseColorIdentity(card);
  for (const c of cardColors) {
    if (!commanderColors.has(c)) return false;
  }
  return true;
}

// ── DB helpers ────────────────────────────────────────────────────────────

function lookupCard(name: string, legalityFilter: string): DbCard | null {
  const db = getDb();
  // Prefer a printing with set_code present (avoids Art Series / token dupes)
  const row = db.prepare(
    `SELECT c.* FROM cards c
     WHERE LOWER(c.name) = LOWER(?)
       AND c.set_code IS NOT NULL
       ${legalityFilter}
     ORDER BY (CASE WHEN c.type_line LIKE '%Token%' OR c.type_line LIKE '%Art Series%' THEN 1 ELSE 0 END) ASC,
              c.updated_at DESC
     LIMIT 1`
  ).get(name) as DbCard | undefined;
  return row || null;
}

function ownedQty(userId: number, cardName: string): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COALESCE(SUM(col.quantity), 0) as qty
     FROM collection col
     JOIN cards c ON col.card_id = c.id
     WHERE col.user_id = ? AND LOWER(c.name) = LOWER(?)`
  ).get(userId, cardName) as { qty: number } | undefined;
  return row?.qty ?? 0;
}

// ── Universal staple land lists ──────────────────────────────────────────
// These are format-flexible. The resolver filters by legality downstream.

export const STAPLE_NONBASIC_LANDS: string[] = [
  // Fetches (single-color work for Brawl if fetching a basic of that color)
  'flooded strand', 'polluted delta', 'bloodstained mire',
  'wooded foothills', 'windswept heath', 'misty rainforest',
  'scalding tarn', 'verdant catacombs', 'marsh flats', 'arid mesa',
  // Shock lands
  'hallowed fountain', 'watery grave', 'blood crypt', 'stomping ground',
  'temple garden', 'overgrown tomb', 'breeding pool', 'sacred foundry',
  'godless shrine', 'steam vents',
  // Check lands
  'hinterland harbor', 'drowned catacomb', 'dragonskull summit',
  'rootbound crag', 'sunpetal grove', 'glacial fortress',
  'isolated chapel', 'clifftop retreat', 'sunken hollow',
  // Pain / filter
  'adarkar wastes', 'underground river', 'sulfurous springs',
  'karplusan forest', 'brushland', 'shivan reef', 'llanowar wastes',
  'battlefield forge', 'yavimaya coast', 'caves of koilos',
  // Utility
  'command tower', 'exotic orchard', 'path of ancestry',
  'reliquary tower', 'rogue\'s passage', 'bojuka bog',
  'strip mine', 'wasteland', 'ghost quarter', 'field of ruin',
  // MDFC lands (Brawl legal and universally good)
  'shatterskull smashing', 'turntimber symbiosis', 'agadeem\'s awakening',
  'emeria\'s call', 'sea gate restoration', 'hagra mauling',
  'glasspool mimic', 'valakut awakening',
  // Channel lands (Kamigawa)
  'boseiju, who endures', 'otawara, soaring city', 'takenuma, abandoned mire',
  'sokenzan, crucible of defiance', 'eiganjo, seat of the empire',
  // Slow lands
  'shipwreck marsh', 'haunted ridge', 'deathcap glade', 'dreamroot cascade',
  'overgrown farmland', 'rockfall vale', 'stormcarved coast',
  'sundown pass', 'sunken citadel',
  // Other creature lands
  'creeping tar pit', 'celestial colonnade', 'raging ravine',
  'stirring wildwood', 'lavaclaw reaches',
  // Utility duals
  'morphic pool', 'spire garden', 'bountiful promenade',
  'training center', 'luxury suite', 'sea of clouds',
];

// ── Main analysis function ───────────────────────────────────────────────

/**
 * Analyze a commander end-to-end and return a prioritized arsenal.
 *
 * @param commanderName — exact commander name
 * @param userId — for collection checks
 * @param format — 'brawl' | 'commander' | 'standardbrawl' etc.
 * @param arsenalLimit — cap on arsenal size (default 120)
 */
export function analyzeCommanderForBuild(
  commanderName: string,
  userId: number,
  format: string,
  arsenalLimit: number = 120,
): CommanderAnalysis | null {
  const legalityFilter = format && format !== '1v1'
    ? `AND c.legalities LIKE '%"${getLegalityKey(format)}":"legal"%'`
    : '';

  const commander = lookupCard(commanderName, legalityFilter);
  if (!commander) return null;

  const colorIdentity = parseColorIdentity(commander);
  const colors = Array.from(colorIdentity);
  const synergyProfile = analyzeCommander(
    commander.oracle_text || '',
    commander.type_line || '',
    colors,
  );
  const directNeeds = extractDirectNeeds(commander);

  const arsenal: ArsenalCard[] = [];
  const seen = new Set<string>();

  const tryAdd = (
    cardName: string,
    priority: number,
    reason: ArsenalReason,
    detail: string,
    extra?: { inclusionRate?: number },
  ) => {
    const key = cardName.toLowerCase();
    if (seen.has(key)) return;
    const card = lookupCard(cardName, legalityFilter);
    if (!card) return;
    if (!isInColorIdentity(card, colorIdentity)) return;
    // Skip off-format lands that can't fetch on-color basics
    if ((card.type_line || '').includes('Land')) {
      if (!isFetchLandRelevant(card.oracle_text || '', colors)) return;
    }
    seen.add(key);
    arsenal.push({
      card,
      priority,
      reason,
      detail,
      inclusionRate: extra?.inclusionRate,
      owned: ownedQty(userId, card.name),
    });
  };

  // ── 1. Community top cards for THIS exact commander ─────────────────────
  try {
    const cmdrStats = getCommanderCardStats(commanderName, 150);
    for (const stat of cmdrStats) {
      if (stat.inclusionRate >= 0.4) {
        // Top-tier community pick (40%+ of community decks run this)
        const priority = 85 + Math.round(stat.inclusionRate * 10);
        tryAdd(
          stat.cardName,
          priority,
          'community_top',
          `${Math.round(stat.inclusionRate * 100)}% of ${stat.totalDecks} ${commanderName} decks play this`,
          { inclusionRate: stat.inclusionRate },
        );
      } else if (stat.inclusionRate >= 0.2) {
        const priority = 65 + Math.round(stat.inclusionRate * 10);
        tryAdd(
          stat.cardName,
          priority,
          'community_top',
          `${Math.round(stat.inclusionRate * 100)}% community inclusion`,
          { inclusionRate: stat.inclusionRate },
        );
      } else if (stat.synergyScore > 0.15) {
        // Strong positive synergy vs global baseline
        tryAdd(
          stat.cardName,
          60,
          'community_synergy',
          `high synergy score (+${stat.synergyScore.toFixed(2)} vs baseline)`,
          { inclusionRate: stat.inclusionRate },
        );
      }
    }
  } catch {
    // commander_card_stats may not exist yet for this commander
  }

  // ── 2. Archetype payoffs from curated lists ─────────────────────────────
  if (synergyProfile) {
    for (const cat of synergyProfile.triggerCategories) {
      const list = ARCHETYPE_PAYOFFS[cat as SynergyCategory];
      if (!list) continue;
      for (const name of list) {
        tryAdd(name, 72, 'archetype_payoff', `${cat.replace('_', ' ')} payoff`);
      }
    }
  }

  // ── 3. Commander direct needs — map extracted needs to curated lists ───
  if (directNeeds.artifactsMatter) {
    for (const name of ARCHETYPE_PAYOFFS.artifact_synergy) {
      tryAdd(name, 78, 'commander_direct_need', 'commander cares about artifacts');
    }
  }
  if (directNeeds.cheapSpells) {
    for (const name of ARCHETYPE_PAYOFFS.spell_cast) {
      tryAdd(name, 75, 'commander_direct_need', 'commander rewards casting spells');
    }
  }
  if (directNeeds.etbCreatures) {
    for (const name of ARCHETYPE_PAYOFFS.creature_etb) {
      tryAdd(name, 75, 'commander_direct_need', 'commander triggers on ETBs');
    }
  }
  if (directNeeds.sacFodder) {
    for (const name of ARCHETYPE_PAYOFFS.creature_dies) {
      tryAdd(name, 75, 'commander_direct_need', 'commander triggers on death/sacrifice');
    }
  }
  if (directNeeds.countersMatter) {
    for (const name of ARCHETYPE_PAYOFFS.counters) {
      tryAdd(name, 75, 'commander_direct_need', 'commander cares about counters');
    }
  }
  if (directNeeds.graveyardMatter) {
    for (const name of ARCHETYPE_PAYOFFS.graveyard) {
      tryAdd(name, 75, 'commander_direct_need', 'commander uses graveyard');
    }
  }
  if (directNeeds.tokenMatter) {
    for (const name of ARCHETYPE_PAYOFFS.token_generation) {
      tryAdd(name, 75, 'commander_direct_need', 'commander wants tokens');
    }
  }
  if (directNeeds.landfallMatter) {
    for (const name of ARCHETYPE_PAYOFFS.land_matters) {
      tryAdd(name, 75, 'commander_direct_need', 'landfall matters');
    }
  }
  if (directNeeds.lifegainMatter) {
    for (const name of ARCHETYPE_PAYOFFS.lifegain) {
      tryAdd(name, 75, 'commander_direct_need', 'lifegain matters');
    }
  }
  if (directNeeds.enchantmentsMatter) {
    for (const name of ARCHETYPE_PAYOFFS.enchantment_synergy) {
      tryAdd(name, 75, 'commander_direct_need', 'enchantments matter');
    }
  }

  // ── 4. Universal staples — color-filtered ──────────────────────────────
  for (const name of STAPLE_RAMP) {
    tryAdd(name, 55, 'staple_ramp', 'universal ramp staple');
  }
  for (const name of STAPLE_DRAW) {
    tryAdd(name, 55, 'staple_draw', 'universal card draw staple');
  }
  for (const name of STAPLE_REMOVAL) {
    tryAdd(name, 55, 'staple_removal', 'universal removal staple');
  }
  for (const name of STAPLE_BOARD_WIPE) {
    tryAdd(name, 50, 'staple_wipe', 'universal board wipe');
  }
  for (const name of STAPLE_PROTECTION) {
    tryAdd(name, 48, 'staple_protection', 'universal protection staple');
  }

  // ── 5. Auto-include lands (MDFCs, fetches, shocks, utility) ─────────────
  for (const name of STAPLE_NONBASIC_LANDS) {
    tryAdd(name, 52, 'staple_land', 'universal land staple');
  }

  // ── 6. Collection substitutes for high-priority needs ───────────────────
  // If the arsenal contains a high-priority card the user doesn't own, look
  // for a similar-function owned alternative.
  const subs = findCollectionSubstitutes(
    arsenal.filter(a => a.owned === 0 && a.priority >= 70),
    userId,
    colorIdentity,
    legalityFilter,
    seen,
  );
  for (const s of subs) {
    arsenal.push(s);
    seen.add(s.card.name.toLowerCase());
  }

  // Sort by priority (desc), then owned (desc) — prefer things the user owns
  // at the same priority tier.
  arsenal.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return (b.owned > 0 ? 1 : 0) - (a.owned > 0 ? 1 : 0);
  });

  const capped = arsenal.slice(0, arsenalLimit);

  const summary = buildSummary(commander, colors, synergyProfile, directNeeds, capped);

  return {
    commander,
    colors,
    colorIdentity,
    synergyProfile,
    directNeeds,
    archetype: synergyProfile?.detectedArchetype || 'midrange',
    arsenal: capped,
    summary,
  };
}

// ── Collection substitutes ───────────────────────────────────────────────

/**
 * For each unowned high-priority target, try to find an owned card from the
 * user's collection that fills the same functional role (classifyCard
 * category match), is in color identity, and is legal.
 *
 * This is the "build with what you have" layer. It prevents the arsenal from
 * being a wish-list the user can't actually build.
 */
function findCollectionSubstitutes(
  unownedTargets: ArsenalCard[],
  userId: number,
  commanderColors: Set<string>,
  legalityFilter: string,
  alreadySeen: Set<string>,
): ArsenalCard[] {
  if (unownedTargets.length === 0) return [];
  const db = getDb();
  const out: ArsenalCard[] = [];

  // Pull the user's full collection once, filtered to commander colors and legality
  const colorExcludeFilter = ['W', 'U', 'B', 'R', 'G']
    .filter(c => !commanderColors.has(c))
    .map(c => `c.color_identity NOT LIKE '%${c}%'`)
    .join(' AND ');

  const whereColor = colorExcludeFilter ? `AND ${colorExcludeFilter}` : '';

  const ownedRows = db.prepare(
    `SELECT c.*, col.quantity as owned_qty
     FROM collection col
     JOIN cards c ON col.card_id = c.id
     WHERE col.user_id = ?
       AND c.set_code IS NOT NULL
       ${whereColor}
       ${legalityFilter}
     GROUP BY c.id`
  ).all(userId) as Array<DbCard & { owned_qty: number }>;

  // Group owned cards by role so we can fill missing functions quickly
  // (reuse classifyCard to avoid duplicating patterns)
  const byRole: Record<string, Array<DbCard & { owned_qty: number }>> = {
    ramp: [], draw: [], removal: [], board_wipe: [], protection: [],
  };
  for (const row of ownedRows) {
    const cats = classifyCard(
      row.name, row.oracle_text || '', row.type_line || '', row.cmc || 0,
    );
    for (const cat of cats) {
      if (byRole[cat]) byRole[cat].push(row);
    }
  }

  // For each missing target, classify it and take the best owned card from
  // the matching role bucket that isn't already in the arsenal.
  for (const target of unownedTargets) {
    const targetCats = classifyCard(
      target.card.name,
      target.card.oracle_text || '',
      target.card.type_line || '',
      target.card.cmc || 0,
    );
    for (const cat of targetCats) {
      const bucket = byRole[cat];
      if (!bucket || bucket.length === 0) continue;
      const sub = bucket.find(r => !alreadySeen.has(r.name.toLowerCase()));
      if (!sub) continue;
      alreadySeen.add(sub.name.toLowerCase());
      out.push({
        card: sub,
        priority: Math.max(40, target.priority - 20),
        reason: 'collection_substitute',
        detail: `owned ${cat} substitute for ${target.card.name}`,
        owned: sub.owned_qty,
      });
      break; // one sub per missing target
    }
    if (out.length >= 40) break; // cap substitutes
  }

  return out;
}

// ── Summary builder ───────────────────────────────────────────────────────

function buildSummary(
  commander: DbCard,
  colors: string[],
  profile: CommanderSynergyProfile | null,
  needs: CommanderDirectNeeds,
  arsenal: ArsenalCard[],
): string {
  const lines: string[] = [];
  lines.push(`${commander.name} — ${colors.join('') || 'Colorless'} identity`);
  if (profile) {
    lines.push(`Archetype: ${profile.detectedArchetype || 'generic'}`);
    lines.push(`Triggers: ${profile.triggerCategories.join(', ')}`);
  }

  const needsList: string[] = [];
  if (needs.cheapSpells) needsList.push('cheap spells');
  if (needs.artifactsMatter) needsList.push('artifacts');
  if (needs.enchantmentsMatter) needsList.push('enchantments');
  if (needs.countersMatter) needsList.push('counters');
  if (needs.graveyardMatter) needsList.push('graveyard');
  if (needs.tokenMatter) needsList.push('tokens');
  if (needs.landfallMatter) needsList.push('landfall');
  if (needs.lifegainMatter) needsList.push('lifegain');
  if (needs.etbCreatures) needsList.push('ETB creatures');
  if (needs.sacFodder) needsList.push('sac fodder');
  if (needs.requiredCreatureTypes.length > 0) {
    needsList.push(`tribal:${needs.requiredCreatureTypes.join('/')}`);
  }
  if (needsList.length > 0) {
    lines.push(`Direct needs: ${needsList.join(', ')}`);
  }

  const owned = arsenal.filter(a => a.owned > 0).length;
  lines.push(`Arsenal: ${arsenal.length} cards (${owned} owned, ${arsenal.length - owned} missing)`);

  // Reason breakdown
  const byReason: Record<string, number> = {};
  for (const a of arsenal) byReason[a.reason] = (byReason[a.reason] || 0) + 1;
  const topReasons = Object.entries(byReason).sort((a, b) => b[1] - a[1]);
  lines.push(`Sources: ${topReasons.map(([r, n]) => `${r}=${n}`).join(', ')}`);

  return lines.join('\n');
}
