/**
 * Commander deck archetype templates — hardcoded construction ratios
 * derived from EDHREC data, community consensus, and deck-building research.
 *
 * Consumed by deck-builder-ai.ts (auto-build) and claude-suggest.ts (AI prompts).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type Archetype =
  | 'aggro'
  | 'tempo'
  | 'midrange'
  | 'control'
  | 'combo'
  | 'voltron'
  | 'tribal'
  | 'reanimator'
  | 'spellslinger'
  | 'aristocrats'
  | 'stax';

export interface RampBreakdown {
  rocks: [number, number];        // min, max
  dorks: [number, number];
  landRamp: [number, number];
  totalMin: number;
  totalMax: number;
}

export interface DrawBreakdown {
  cantrips: [number, number];
  engines: [number, number];
  impulse: [number, number];      // red "exile top" draw
  wheels: [number, number];
  totalMin: number;
  totalMax: number;
}

export interface RemovalBreakdown {
  spot: [number, number];
  wipes: [number, number];
  counterspells: [number, number]; // blue only
  totalMin: number;
  totalMax: number;
}

export interface ManaCurveTargets {
  /** Card counts per CMC bucket (0-1, 2, 3, 4, 5, 6, 7+) */
  [cmc: number]: number;
}

export interface ArchetypeTemplate {
  name: Archetype;
  label: string;
  description: string;
  lands: [number, number];
  ramp: RampBreakdown;
  draw: DrawBreakdown;
  removal: RemovalBreakdown;
  creatures: [number, number];
  manaCurve: ManaCurveTargets;
  avgCmc: [number, number];
  winConditionSlots: [number, number];
  synergyMinimums: Record<string, number>;
  protectedPatterns: string[];
}

export interface ColorAdjustment {
  colorCount: number;
  label: string;
  lands: number;
  basics: [number, number];
  duals: [number, number];
}

// ── Color Identity Adjustments ──────────────────────────────────────────────

export const COLOR_ADJUSTMENTS: ColorAdjustment[] = [
  { colorCount: 1, label: 'Mono',    lands: 34, basics: [8, 10], duals: [0, 2] },
  { colorCount: 2, label: '2-color', lands: 35, basics: [4, 6],  duals: [8, 10] },
  { colorCount: 3, label: '3-color', lands: 36, basics: [3, 5],  duals: [10, 14] },
  { colorCount: 4, label: '4-color', lands: 36, basics: [2, 3],  duals: [14, 18] },
  { colorCount: 5, label: '5-color', lands: 37, basics: [2, 3],  duals: [15, 20] },
];

/**
 * Get color adjustment for a given number of colors in the deck's identity.
 */
export function getColorAdjustment(colorCount: number): ColorAdjustment {
  const clamped = Math.max(1, Math.min(5, colorCount));
  return COLOR_ADJUSTMENTS[clamped - 1];
}

/**
 * Get the recommended land count for an archetype + color identity.
 */
export function getRecommendedLands(archetype: Archetype, colorCount: number): number {
  const template = ARCHETYPE_TEMPLATES[archetype];
  const colorAdj = getColorAdjustment(colorCount);
  const baseLands = Math.round((template.lands[0] + template.lands[1]) / 2);
  // Blend archetype base with color-based adjustment
  return Math.round((baseLands + colorAdj.lands) / 2);
}

// ── Impulse Draw Detection ──────────────────────────────────────────────────

/**
 * Patterns that identify impulse draw (red's card advantage mechanic).
 * Cards matching these are "exile the top card of your library" effects.
 */
export const IMPULSE_DRAW_PATTERNS: RegExp[] = [
  /exile the top (?:card|two cards|three cards) of your library/i,
  /you may (?:play|cast) (?:it|them|that card|those cards) (?:until|this turn|until end of your next turn)/i,
  /exile .* from the top of your library\. (?:until|you may)/i,
  /look at the top .* you may play/i,
];

/**
 * Check if a card's oracle text indicates impulse draw.
 */
export function isImpulseDraw(oracleText: string): boolean {
  if (!oracleText) return false;
  return IMPULSE_DRAW_PATTERNS.some((p) => p.test(oracleText));
}

// ── Archetype Templates ─────────────────────────────────────────────────────

export const ARCHETYPE_TEMPLATES: Record<Archetype, ArchetypeTemplate> = {
  aggro: {
    name: 'aggro',
    label: 'Aggro',
    description: 'Fast, creature-heavy strategy focused on early pressure and combat damage.',
    lands: [33, 35],
    ramp: {
      rocks: [3, 5],
      dorks: [3, 5],
      landRamp: [0, 2],
      totalMin: 8,
      totalMax: 10,
    },
    draw: {
      cantrips: [2, 4],
      engines: [2, 3],
      impulse: [2, 4],
      wheels: [0, 1],
      totalMin: 6,
      totalMax: 10,
    },
    removal: {
      spot: [3, 5],
      wipes: [0, 1],
      counterspells: [0, 0],
      totalMin: 4,
      totalMax: 8,
    },
    creatures: [28, 36],
    manaCurve: { 1: 8, 2: 12, 3: 10, 4: 5, 5: 2, 6: 1, 7: 0 },
    avgCmc: [1.9, 2.4],
    winConditionSlots: [0, 2],
    synergyMinimums: { 'haste_sources': 4, 'pump_effects': 3 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'lightning greaves', 'swiftfoot boots',
    ],
  },

  tempo: {
    name: 'tempo',
    label: 'Tempo',
    description: 'Efficient threats backed by cheap interaction to maintain board advantage.',
    lands: [33, 35],
    ramp: {
      rocks: [4, 6],
      dorks: [2, 4],
      landRamp: [1, 2],
      totalMin: 8,
      totalMax: 11,
    },
    draw: {
      cantrips: [3, 5],
      engines: [2, 4],
      impulse: [1, 3],
      wheels: [0, 1],
      totalMin: 8,
      totalMax: 12,
    },
    removal: {
      spot: [4, 7],
      wipes: [1, 2],
      counterspells: [3, 6],
      totalMin: 8,
      totalMax: 14,
    },
    creatures: [18, 26],
    manaCurve: { 1: 6, 2: 10, 3: 10, 4: 6, 5: 3, 6: 2, 7: 1 },
    avgCmc: [2.4, 2.8],
    winConditionSlots: [2, 4],
    synergyMinimums: { 'cheap_interaction': 6 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'counterspell', 'swan song',
      'lightning greaves', 'cyclonic rift',
    ],
  },

  midrange: {
    name: 'midrange',
    label: 'Midrange',
    description: 'Balanced strategy with quality threats, interaction, and card advantage.',
    lands: [36, 38],
    ramp: {
      rocks: [5, 8],
      dorks: [2, 4],
      landRamp: [2, 4],
      totalMin: 10,
      totalMax: 13,
    },
    draw: {
      cantrips: [2, 4],
      engines: [3, 5],
      impulse: [1, 3],
      wheels: [0, 1],
      totalMin: 8,
      totalMax: 12,
    },
    removal: {
      spot: [4, 7],
      wipes: [3, 5],
      counterspells: [2, 4],
      totalMin: 8,
      totalMax: 15,
    },
    creatures: [20, 30],
    manaCurve: { 1: 4, 2: 10, 3: 10, 4: 8, 5: 5, 6: 3, 7: 2 },
    avgCmc: [2.8, 3.2],
    winConditionSlots: [4, 8],
    synergyMinimums: {},
    protectedPatterns: [
      'sol ring', 'arcane signet', "commander's sphere",
    ],
  },

  control: {
    name: 'control',
    label: 'Control',
    description: 'Reactive strategy that answers threats, generates card advantage, and wins late.',
    lands: [37, 39],
    ramp: {
      rocks: [6, 9],
      dorks: [0, 2],
      landRamp: [2, 4],
      totalMin: 10,
      totalMax: 14,
    },
    draw: {
      cantrips: [3, 5],
      engines: [4, 6],
      impulse: [0, 2],
      wheels: [0, 2],
      totalMin: 10,
      totalMax: 14,
    },
    removal: {
      spot: [5, 8],
      wipes: [4, 7],
      counterspells: [6, 12],
      totalMin: 12,
      totalMax: 20,
    },
    creatures: [8, 16],
    manaCurve: { 1: 3, 2: 8, 3: 8, 4: 7, 5: 5, 6: 4, 7: 3 },
    avgCmc: [3.2, 3.8],
    winConditionSlots: [1, 3],
    synergyMinimums: { 'counterspells': 6, 'board_wipes': 4 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'counterspell', 'cyclonic rift',
      'rhystic study', 'mystic remora', 'smothering tithe',
    ],
  },

  combo: {
    name: 'combo',
    label: 'Combo',
    description: 'Assemble specific card combinations to win the game, backed by tutors and protection.',
    lands: [35, 37],
    ramp: {
      rocks: [6, 9],
      dorks: [2, 4],
      landRamp: [1, 3],
      totalMin: 10,
      totalMax: 14,
    },
    draw: {
      cantrips: [4, 6],
      engines: [3, 5],
      impulse: [0, 2],
      wheels: [1, 2],
      totalMin: 10,
      totalMax: 14,
    },
    removal: {
      spot: [3, 5],
      wipes: [1, 3],
      counterspells: [4, 8],
      totalMin: 8,
      totalMax: 14,
    },
    creatures: [14, 22],
    manaCurve: { 1: 6, 2: 10, 3: 9, 4: 6, 5: 4, 6: 2, 7: 1 },
    avgCmc: [2.5, 3.0],
    winConditionSlots: [4, 10],
    synergyMinimums: { 'tutors': 5, 'combo_pieces': 4, 'protection': 4 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'counterspell', 'mystical tutor',
      'demonic tutor', 'vampiric tutor',
    ],
  },

  voltron: {
    name: 'voltron',
    label: 'Voltron',
    description: 'Pump the commander with equipment/auras to deal lethal commander damage.',
    lands: [34, 36],
    ramp: {
      rocks: [5, 8],
      dorks: [1, 3],
      landRamp: [2, 3],
      totalMin: 10,
      totalMax: 13,
    },
    draw: {
      cantrips: [2, 4],
      engines: [3, 5],
      impulse: [1, 3],
      wheels: [0, 1],
      totalMin: 8,
      totalMax: 12,
    },
    removal: {
      spot: [3, 6],
      wipes: [1, 3],
      counterspells: [2, 4],
      totalMin: 6,
      totalMax: 12,
    },
    creatures: [10, 18],
    manaCurve: { 1: 5, 2: 10, 3: 10, 4: 7, 5: 4, 6: 2, 7: 1 },
    avgCmc: [2.5, 3.0],
    winConditionSlots: [8, 14],
    synergyMinimums: { 'equipment_or_auras': 10, 'protection': 4 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'lightning greaves', 'swiftfoot boots',
      "sword of feast and famine", 'sword of fire and ice',
    ],
  },

  tribal: {
    name: 'tribal',
    label: 'Tribal',
    description: 'Creature-type synergy deck built around lords, payoffs, and critical mass of a tribe.',
    lands: [35, 37],
    ramp: {
      rocks: [4, 6],
      dorks: [2, 4],
      landRamp: [2, 3],
      totalMin: 10,
      totalMax: 12,
    },
    draw: {
      cantrips: [2, 3],
      engines: [3, 5],
      impulse: [1, 3],
      wheels: [0, 1],
      totalMin: 8,
      totalMax: 12,
    },
    removal: {
      spot: [3, 5],
      wipes: [2, 4],
      counterspells: [1, 3],
      totalMin: 6,
      totalMax: 12,
    },
    creatures: [28, 38],
    manaCurve: { 1: 5, 2: 10, 3: 10, 4: 7, 5: 4, 6: 2, 7: 1 },
    avgCmc: [2.5, 3.0],
    winConditionSlots: [2, 5],
    synergyMinimums: { 'tribe_members': 25, 'lords': 3, 'tribal_payoffs': 4 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'herald\'s horn', 'vanquisher\'s banner',
      'kindred discovery', 'coat of arms',
    ],
  },

  reanimator: {
    name: 'reanimator',
    label: 'Reanimator',
    description: 'Cheat big threats into play from the graveyard with reanimate spells and self-mill.',
    lands: [36, 38],
    ramp: {
      rocks: [5, 7],
      dorks: [1, 3],
      landRamp: [2, 4],
      totalMin: 10,
      totalMax: 13,
    },
    draw: {
      cantrips: [2, 4],
      engines: [3, 5],
      impulse: [0, 2],
      wheels: [1, 3],
      totalMin: 8,
      totalMax: 12,
    },
    removal: {
      spot: [3, 5],
      wipes: [2, 4],
      counterspells: [1, 3],
      totalMin: 6,
      totalMax: 12,
    },
    creatures: [18, 26],
    manaCurve: { 1: 4, 2: 8, 3: 7, 4: 5, 5: 4, 6: 4, 7: 5 },
    avgCmc: [3.5, 4.5],
    winConditionSlots: [4, 8],
    synergyMinimums: { 'reanimate_spells': 6, 'self_mill': 4, 'big_threats': 6 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'reanimate', 'animate dead',
      'entomb', 'buried alive',
    ],
  },

  spellslinger: {
    name: 'spellslinger',
    label: 'Spellslinger',
    description: 'Cast many instants/sorceries to trigger payoffs like Young Pyromancer or Storm-Kiln Artist.',
    lands: [34, 36],
    ramp: {
      rocks: [5, 8],
      dorks: [0, 2],
      landRamp: [1, 3],
      totalMin: 8,
      totalMax: 12,
    },
    draw: {
      cantrips: [5, 8],
      engines: [3, 5],
      impulse: [2, 4],
      wheels: [1, 2],
      totalMin: 10,
      totalMax: 16,
    },
    removal: {
      spot: [4, 7],
      wipes: [1, 3],
      counterspells: [5, 10],
      totalMin: 10,
      totalMax: 18,
    },
    creatures: [8, 16],
    manaCurve: { 1: 8, 2: 12, 3: 9, 4: 5, 5: 3, 6: 2, 7: 1 },
    avgCmc: [2.2, 2.8],
    winConditionSlots: [3, 6],
    synergyMinimums: { 'instants_sorceries': 25, 'spell_payoffs': 5, 'cantrips': 5 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'lightning bolt', 'counterspell',
      'brainstorm', 'ponder', 'preordain', 'young pyromancer',
      'storm-kiln artist', 'talrand, sky summoner', 'guttersnipe',
    ],
  },

  aristocrats: {
    name: 'aristocrats',
    label: 'Aristocrats',
    description: 'Sacrifice creatures for value, draining life through death triggers.',
    lands: [35, 37],
    ramp: {
      rocks: [4, 7],
      dorks: [2, 4],
      landRamp: [2, 3],
      totalMin: 10,
      totalMax: 13,
    },
    draw: {
      cantrips: [2, 3],
      engines: [4, 6],
      impulse: [1, 3],
      wheels: [0, 1],
      totalMin: 8,
      totalMax: 12,
    },
    removal: {
      spot: [3, 6],
      wipes: [2, 4],
      counterspells: [0, 3],
      totalMin: 6,
      totalMax: 12,
    },
    creatures: [24, 34],
    manaCurve: { 1: 6, 2: 10, 3: 9, 4: 6, 5: 4, 6: 2, 7: 1 },
    avgCmc: [2.5, 3.0],
    winConditionSlots: [3, 6],
    synergyMinimums: {
      'sac_outlets': 6, 'death_triggers': 8, 'token_producers': 5,
    },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'blood artist', 'zulaport cutthroat',
      'viscera seer', 'ashnod\'s altar', 'phyrexian altar',
    ],
  },

  stax: {
    name: 'stax',
    label: 'Stax',
    description: 'Slow the game with resource denial (tax effects, hate pieces) and win through attrition.',
    lands: [35, 37],
    ramp: {
      rocks: [6, 10],
      dorks: [2, 4],
      landRamp: [1, 3],
      totalMin: 10,
      totalMax: 15,
    },
    draw: {
      cantrips: [2, 4],
      engines: [3, 5],
      impulse: [0, 2],
      wheels: [0, 2],
      totalMin: 8,
      totalMax: 12,
    },
    removal: {
      spot: [3, 5],
      wipes: [3, 5],
      counterspells: [3, 6],
      totalMin: 8,
      totalMax: 15,
    },
    creatures: [14, 22],
    manaCurve: { 1: 5, 2: 12, 3: 10, 4: 6, 5: 3, 6: 2, 7: 1 },
    avgCmc: [2.5, 3.0],
    winConditionSlots: [2, 5],
    synergyMinimums: { 'stax_pieces': 8, 'mana_denial': 3 },
    protectedPatterns: [
      'sol ring', 'arcane signet', 'winter orb', 'static orb',
      'smothering tithe', 'rhystic study', 'rule of law',
    ],
  },
};

// ── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get the template for a given archetype, defaulting to midrange.
 */
export function getTemplate(archetype: string): ArchetypeTemplate {
  const key = archetype.toLowerCase() as Archetype;
  return ARCHETYPE_TEMPLATES[key] || ARCHETYPE_TEMPLATES.midrange;
}

/**
 * Get all archetype names.
 */
export function getArchetypeNames(): Archetype[] {
  return Object.keys(ARCHETYPE_TEMPLATES) as Archetype[];
}

/**
 * Get the ideal mana curve for an archetype, scaled to fit within
 * the given number of nonland slots.
 */
export function getScaledCurve(
  archetype: string,
  nonLandSlots: number
): Record<number, number> {
  const template = getTemplate(archetype);
  const rawTotal = Object.values(template.manaCurve).reduce((a, b) => a + b, 0);
  const scale = nonLandSlots / rawTotal;

  const scaled: Record<number, number> = {};
  let assigned = 0;
  const entries = Object.entries(template.manaCurve).map(([k, v]) => [Number(k), v] as [number, number]);

  for (const [cmc, count] of entries) {
    scaled[cmc] = Math.round(count * scale);
    assigned += scaled[cmc];
  }

  // Adjust rounding errors by modifying the peak bucket
  const diff = nonLandSlots - assigned;
  if (diff !== 0) {
    const peakCmc = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    scaled[peakCmc] += diff;
  }

  return scaled;
}

/**
 * Check if a deck's structure matches an archetype template, returning
 * a list of deviations (warnings) and a fitness score (0-100).
 */
export function validateAgainstTemplate(
  archetype: string,
  deckStats: {
    landCount: number;
    rampCount: number;
    drawCount: number;
    removalCount: number;
    creatureCount: number;
    avgCmc: number;
    instantSorceryCount: number;
    colorCount: number;
  }
): { score: number; warnings: string[] } {
  const template = getTemplate(archetype);
  const colorAdj = getColorAdjustment(deckStats.colorCount);
  const warnings: string[] = [];
  let score = 100;

  // Land check
  const expectedLands = Math.round((template.lands[0] + template.lands[1]) / 2);
  const adjustedLands = Math.round((expectedLands + colorAdj.lands) / 2);
  if (deckStats.landCount < template.lands[0] - 2) {
    warnings.push(`Low land count (${deckStats.landCount}, template suggests ${template.lands[0]}-${template.lands[1]})`);
    score -= 15;
  } else if (deckStats.landCount > template.lands[1] + 2) {
    warnings.push(`High land count (${deckStats.landCount}, template suggests ${template.lands[0]}-${template.lands[1]})`);
    score -= 10;
  }

  // Ramp check
  if (deckStats.rampCount < template.ramp.totalMin) {
    warnings.push(`Low ramp (${deckStats.rampCount}, need ${template.ramp.totalMin}-${template.ramp.totalMax})`);
    score -= 15;
  }

  // Draw check
  if (deckStats.drawCount < template.draw.totalMin) {
    warnings.push(`Low card draw (${deckStats.drawCount}, need ${template.draw.totalMin}-${template.draw.totalMax})`);
    score -= 15;
  }

  // Removal check
  if (deckStats.removalCount < template.removal.totalMin) {
    warnings.push(`Low removal (${deckStats.removalCount}, need ${template.removal.totalMin}-${template.removal.totalMax})`);
    score -= 10;
  }

  // Creature check
  if (deckStats.creatureCount < template.creatures[0] - 3) {
    warnings.push(`Low creature count (${deckStats.creatureCount}, template suggests ${template.creatures[0]}-${template.creatures[1]})`);
    score -= 10;
  } else if (deckStats.creatureCount > template.creatures[1] + 5) {
    warnings.push(`High creature count (${deckStats.creatureCount}, template suggests ${template.creatures[0]}-${template.creatures[1]})`);
    score -= 5;
  }

  // CMC check
  if (deckStats.avgCmc < template.avgCmc[0] - 0.3) {
    warnings.push(`Low avg CMC (${deckStats.avgCmc.toFixed(2)}, template suggests ${template.avgCmc[0]}-${template.avgCmc[1]})`);
    score -= 5;
  } else if (deckStats.avgCmc > template.avgCmc[1] + 0.3) {
    warnings.push(`High avg CMC (${deckStats.avgCmc.toFixed(2)}, template suggests ${template.avgCmc[0]}-${template.avgCmc[1]})`);
    score -= 10;
  }

  // Spellslinger instant/sorcery check
  if (archetype === 'spellslinger') {
    const minSpells = template.synergyMinimums['instants_sorceries'] || 25;
    if (deckStats.instantSorceryCount < minSpells) {
      warnings.push(`Spellslinger needs ${minSpells}+ instants/sorceries (have ${deckStats.instantSorceryCount})`);
      score -= 20;
    }
  }

  return { score: Math.max(0, score), warnings };
}

/**
 * Generate a human-readable template summary for injection into AI prompts.
 */
export function getTemplateSummary(archetype: string, colorCount: number): string {
  const t = getTemplate(archetype);
  const c = getColorAdjustment(colorCount);

  return `## ${t.label} Archetype Template (${c.label} deck)
Lands: ${c.lands} (${c.basics[0]}-${c.basics[1]} basics, ${c.duals[0]}-${c.duals[1]} duals)
Ramp: ${t.ramp.totalMin}-${t.ramp.totalMax} (rocks ${t.ramp.rocks[0]}-${t.ramp.rocks[1]}, dorks ${t.ramp.dorks[0]}-${t.ramp.dorks[1]}, land-ramp ${t.ramp.landRamp[0]}-${t.ramp.landRamp[1]})
Draw: ${t.draw.totalMin}-${t.draw.totalMax} (cantrips ${t.draw.cantrips[0]}-${t.draw.cantrips[1]}, engines ${t.draw.engines[0]}-${t.draw.engines[1]}, impulse ${t.draw.impulse[0]}-${t.draw.impulse[1]})
Removal: ${t.removal.totalMin}-${t.removal.totalMax} (spot ${t.removal.spot[0]}-${t.removal.spot[1]}, wipes ${t.removal.wipes[0]}-${t.removal.wipes[1]}, counters ${t.removal.counterspells[0]}-${t.removal.counterspells[1]})
Creatures: ${t.creatures[0]}-${t.creatures[1]}
Avg CMC: ${t.avgCmc[0]}-${t.avgCmc[1]}
Win Conditions: ${t.winConditionSlots[0]}-${t.winConditionSlots[1]} slots
Curve: 1CMC=${t.manaCurve[1]}, 2CMC=${t.manaCurve[2]}, 3CMC=${t.manaCurve[3]}, 4CMC=${t.manaCurve[4]}, 5CMC=${t.manaCurve[5]}, 6CMC=${t.manaCurve[6]}, 7+CMC=${t.manaCurve[7]}
${Object.keys(t.synergyMinimums).length > 0 ? `Key Requirements: ${Object.entries(t.synergyMinimums).map(([k, v]) => `${k.replace(/_/g, ' ')} >= ${v}`).join(', ')}` : ''}
Protected Cards: ${t.protectedPatterns.join(', ')}`;
}

/**
 * Merge an archetype template's synergy minimums with a commander-specific
 * synergy profile. Takes the higher of each minimum and combines protected
 * patterns. Adjusts draw/removal minimums based on commander's built-in
 * card advantage or removal.
 */
export function mergeWithCommanderProfile(
  template: ArchetypeTemplate,
  commanderProfile: {
    synergyMinimums: Record<string, number>;
    protectedPatterns: string[];
    drawReduction: number;
    removalReduction: number;
  }
): { synergyMinimums: Record<string, number>; protectedPatterns: string[]; drawMin: number; removalMin: number } {
  const merged: Record<string, number> = { ...template.synergyMinimums };
  for (const [key, val] of Object.entries(commanderProfile.synergyMinimums)) {
    merged[key] = Math.max(merged[key] || 0, val);
  }

  const allProtected = Array.from(
    new Set([...template.protectedPatterns, ...commanderProfile.protectedPatterns])
  );

  const drawMin = Math.max(6, template.draw.totalMin - commanderProfile.drawReduction);
  const removalMin = Math.max(6, template.removal.totalMin - commanderProfile.removalReduction);

  return { synergyMinimums: merged, protectedPatterns: allProtected, drawMin, removalMin };
}
