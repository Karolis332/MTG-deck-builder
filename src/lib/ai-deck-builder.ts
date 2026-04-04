/**
 * AI-powered deck builder — uses Claude or OpenAI to reason about
 * card selection from a pre-scored candidate pool.
 *
 * Flow:
 * 1. Reuse buildScoredCandidatePool() for candidate generation + scoring
 * 2. Compress top 120 candidates into a token-efficient format
 * 3. Inject EDHREC average decklist as "community consensus"
 * 4. Send structured prompt to Claude or OpenAI for final card selection
 * 5. Parse response, validate, fill gaps algorithmically, add lands
 */

import { getDb, getFormatStaples } from './db';
import type { DbCard } from './types';
import { DEFAULT_DECK_SIZE } from './constants';
import { buildScoredCandidatePool, autoBuildDeck } from './deck-builder-ai';
import type { BuildOptions, ScoredCandidatePoolResult } from './deck-builder-ai';
import { isFetchLandRelevant } from './land-intelligence';
import { getTemplate, getTemplateSummary, mergeWithCommanderProfile } from './deck-templates';
import { getCommanderStrategyPrompt } from './commander-synergy';
import type { CommanderSynergyProfile } from './commander-synergy';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ClaudeBuildOptions {
  commanderName: string;
  format: string;
  strategy?: string;
  useCollection?: boolean;
  userId?: number;
  powerLevel?: 'casual' | 'optimized' | 'cedh';
}

export interface ClaudeBuildResult {
  cards: Array<{
    card: DbCard;
    quantity: number;
    board: 'main' | 'sideboard';
    role: string;
    reason: string;
  }>;
  strategyExplanation: string;
  roleBreakdown: Record<string, string[]>;
  themes: string[];
  tribalType?: string;
  commanderSynergy?: CommanderSynergyProfile;
  modelUsed: string;
  tokenUsage?: { input: number; output: number };
  buildTimeMs: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClaudeKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_anthropic_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

function getOpenAIKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_openai_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

function getGroqKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_groq_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

function getXaiKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_xai_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

function getPreferredProvider(): 'claude' | 'openai' | 'groq' | 'xai' | 'auto' {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_ai_provider'")
    .get() as { value: string } | undefined;
  return (row?.value as 'claude' | 'openai' | 'groq' | 'xai' | 'auto') || 'auto';
}

function getOpenAIModel(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_openai_model'")
    .get() as { value: string } | undefined;
  return row?.value || 'gpt-5.4';
}

function getClaudeModel(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_claude_model'")
    .get() as { value: string } | undefined;
  return row?.value || 'claude-sonnet-4-5-20250929';
}

function getEdhrecAvgDeck(commanderName: string): string[] {
  const db = getDb();
  try {
    const rows = db.prepare(
      `SELECT card_name FROM edhrec_avg_decks
       WHERE commander_name = ? COLLATE NOCASE
       LIMIT 30`
    ).all(commanderName) as Array<{ card_name: string }>;
    return rows.map((r) => r.card_name);
  } catch {
    return [];
  }
}

function compressCard(card: DbCard): string {
  const oracle = (card.oracle_text || '').replace(/\n/g, '; ').slice(0, 80);
  return `${card.name} | ${card.type_line} | ${card.cmc} | ${oracle}`;
}

function extractJson(text: string): string {
  // Try ```json blocks first
  const jsonBlockMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonBlockMatch) return jsonBlockMatch[1];

  // Try raw JSON object
  const jsonObjMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjMatch) return jsonObjMatch[0];

  return text;
}

// ── Provider API Calls ──────────────────────────────────────────────────────

async function callClaude(prompt: string, apiKey: string, model: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI Build] Claude API error:', response.status, errorText);
    // Extract useful error message from API response
    let detail = '';
    try {
      const errData = JSON.parse(errorText);
      detail = errData.error?.message || errData.message || errorText.slice(0, 200);
    } catch {
      detail = errorText.slice(0, 200);
    }
    throw new Error(`Claude API error: ${response.status} — ${detail}`);
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || '',
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

async function callOpenAI(prompt: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_completion_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI Build] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

async function callOpenAICompatible(
  prompt: string,
  apiKey: string,
  baseUrl: string,
  model: string,
  providerName: string,
) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_completion_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI Build] ${providerName} API error:`, response.status, errorText);
    throw new Error(`${providerName} API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

// ── Prompt Builder ───────────────────────────────────────────────────────────

function buildClaudePrompt(
  poolResult: ScoredCandidatePoolResult,
  candidates: Array<{ card: DbCard; score: number }>,
  edhrecCards: string[],
  commanderName: string,
): string {
  const { commanderCard, commanderProfile, resolvedStrategy, nonLandTarget, landTarget, colors } = poolResult;

  // Commander info
  const cmdOracle = commanderCard?.oracle_text || 'Unknown';
  const cmdType = commanderCard?.type_line || 'Unknown';
  const cmdCmc = commanderCard?.cmc ?? 0;
  const colorStr = colors.join(', ') || 'Colorless';

  // Template info
  const template = getTemplate(resolvedStrategy);
  const merged = commanderProfile
    ? mergeWithCommanderProfile(template, commanderProfile)
    : { drawMin: template.draw.totalMin, removalMin: template.removal.totalMin, synergyMinimums: template.synergyMinimums, protectedPatterns: template.protectedPatterns };
  const templateSummary = getTemplateSummary(resolvedStrategy, colors.length);

  // Strategy analysis
  const strategyBlock = commanderProfile
    ? getCommanderStrategyPrompt(commanderProfile)
    : '';

  // Compressed candidate list
  const candidateLines = candidates.map((c) => compressCard(c.card)).join('\n');

  // EDHREC consensus
  const edhrecBlock = edhrecCards.length > 0
    ? `\n# COMMUNITY CONSENSUS (EDHREC)\nCards in the average ${commanderName} deck: ${edhrecCards.join(', ')}\n`
    : '';

  // Format staples from scraped community decks (67K+ decks)
  const formatStaples = getFormatStaples(poolResult.format || 'commander', colors, 20);
  const candidateNames = new Set(candidates.map(c => c.card.name.toLowerCase()));
  const relevantStaples = formatStaples.filter(s => candidateNames.has(s.cardName.toLowerCase()));
  const staplesBlock = relevantStaples.length > 0
    ? `\n# FORMAT STAPLES (from ${relevantStaples[0].totalDecks}+ scraped decks)\nThese cards appear in most decks of this format — STRONGLY prioritize including them:\n${relevantStaples.map(s => `- ${s.cardName} (${Math.round(s.inclusionRate * 100)}% inclusion)`).join('\n')}\n`
    : '';

  // Collection constraint
  const collectionNote = poolResult.useCollection
    ? '\n**COLLECTION MODE**: Prefer cards from the candidate pool that are marked as owned. All candidates are pre-filtered for availability.\n'
    : '';

  return `You are an expert MTG Commander deck builder.

# COMMANDER
${commanderName} (${cmdType}, CMC ${cmdCmc})
${cmdOracle}
Color Identity: {${colorStr}}

# STRATEGY ANALYSIS
${strategyBlock}
Archetype: ${resolvedStrategy}
${templateSummary}
${edhrecBlock}
${staplesBlock}
# CANDIDATE POOL (${candidates.length} cards, pre-filtered for color/legality)
name | type | CMC | oracle
${candidateLines}
${collectionNote}
# TASK
Select exactly ${nonLandTarget} nonland cards. I will add ${landTarget} lands separately.

Categorize by role: Ramp, Draw, Removal, Creatures, Synergy, Utility, Win Conditions, Protection.

Return ONLY valid JSON:
{"strategy":"2-3 sentence explanation","cards":[{"name":"Exact Name","role":"Ramp","reason":"15 words max"},...]}

RULES:
- ${template.ramp.totalMin}+ ramp, ${merged.drawMin}+ draw, ${merged.removalMin}+ removal
- All cards MUST be from the candidate pool above
- Singleton (1 copy each)
- Prioritize commander synergy
- Return exactly ${nonLandTarget} cards`;
}

// ── Main Builder ─────────────────────────────────────────────────────────────

export async function buildDeckWithAI(
  options: ClaudeBuildOptions
): Promise<ClaudeBuildResult> {
  const startTime = Date.now();
  const db = getDb();

  // Provider selection: preference → Claude → OpenAI → Groq → xAI → Quick Build
  const claudeKey = getClaudeKey();
  const openaiKey = getOpenAIKey();
  const groqKey = getGroqKey();
  const xaiKey = getXaiKey();
  const preferredProvider = getPreferredProvider();

  const buildOptions: BuildOptions = {
    format: options.format,
    colors: [], // Will be derived from commander
    strategy: options.strategy,
    useCollection: options.useCollection,
    commanderName: options.commanderName,
    powerLevel: options.powerLevel,
  };

  // No API key at all — fall back to Quick Build
  if (!claudeKey && !openaiKey && !groqKey && !xaiKey) {
    console.log('[AI Build] No API key configured — falling back to Quick Build (trained model data)');
    return runQuickBuildFallback(buildOptions, startTime);
  }

  // Step 1: Get scored candidate pool
  const poolResult = await buildScoredCandidatePool(buildOptions);

  // Step 2: Take top 120 candidates
  const candidates = poolResult.pool.slice(0, 120);

  if (candidates.length === 0) {
    throw new Error('No candidate cards found. Make sure the card database is seeded.');
  }

  // Step 3: Get EDHREC consensus
  const edhrecCards = getEdhrecAvgDeck(options.commanderName);

  // Step 4: Build prompt
  const prompt = buildClaudePrompt(poolResult, candidates, edhrecCards, options.commanderName);

  // Step 5: Call AI provider with cascade (preference → Claude → OpenAI → Groq → xAI)
  type ProviderEntry = { name: string; call: () => Promise<{ text: string; inputTokens: number; outputTokens: number }> };
  const allProviders: ProviderEntry[] = [];
  if (claudeKey) {
    const modelId = getClaudeModel();
    allProviders.push({ name: modelId, call: () => callClaude(prompt, claudeKey, modelId) });
  }
  if (openaiKey) {
    const oaiModel = getOpenAIModel();
    allProviders.push({ name: oaiModel, call: () => callOpenAI(prompt, openaiKey) });
  }
  if (groqKey) allProviders.push({ name: 'llama-3.3-70b-versatile', call: () => callOpenAICompatible(prompt, groqKey, 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', 'Groq') });
  if (xaiKey)  allProviders.push({ name: 'grok-3-mini-fast',         call: () => callOpenAICompatible(prompt, xaiKey, 'https://api.x.ai/v1', 'grok-3-mini-fast', 'xAI') });

  // Sort preferred provider first
  const prefKeyMap: Record<string, string> = { claude: getClaudeModel(), openai: getOpenAIModel(), groq: 'llama-3.3-70b-versatile', xai: 'grok-3-mini-fast' };
  const prefName = prefKeyMap[preferredProvider];
  const providers: ProviderEntry[] = prefName
    ? [...allProviders.filter(p => p.name === prefName), ...allProviders.filter(p => p.name !== prefName)]
    : allProviders;

  let content: string = '';
  let inputTokens: number = 0;
  let outputTokens: number = 0;
  let modelUsed: string = 'quick-build-fallback';

  let succeeded = false;
  for (const provider of providers) {
    try {
      console.log(`[AI Build] Trying ${provider.name}...`);
      const result = await provider.call();
      content = result.text;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      modelUsed = provider.name;
      succeeded = true;
      break;
    } catch (err) {
      console.warn(`[AI Build] ${provider.name} failed, trying next:`, err instanceof Error ? err.message : err);
    }
  }

  if (!succeeded) {
    console.error('[AI Build] All providers failed, falling back to Quick Build');
    return runQuickBuildFallback(buildOptions, startTime);
  }

  // Step 6: Parse response
  let parsed: { strategy: string; cards: Array<{ name: string; role: string; reason: string }> };
  try {
    const jsonText = extractJson(content);
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error('[AI Build] Failed to parse response:', content.slice(0, 500));
    throw new Error('AI returned invalid JSON. Try again.');
  }

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('AI response missing cards array.');
  }

  // Step 7: Resolve card names to DbCard via DB lookup
  const candidateMap = new Map<string, { card: DbCard; score: number }>();
  for (const c of candidates) {
    candidateMap.set(c.card.name.toLowerCase(), c);
  }

  const resolvedCards: ClaudeBuildResult['cards'] = [];
  const pickedNames = new Set<string>();

  for (const entry of parsed.cards) {
    const key = entry.name.toLowerCase();
    const match = candidateMap.get(key);
    if (!match) {
      // Try fuzzy: exact name lookup in DB (with color/legality/commander filters)
      const dbCard = db.prepare(
        `SELECT c.* FROM cards c WHERE c.name = ? COLLATE NOCASE
         ${poolResult.colorExcludeFilter ? 'AND ' + poolResult.colorExcludeFilter : ''}
         ${poolResult.legalityFilter}
         ${poolResult.commanderExclude}
         LIMIT 1`
      ).get(entry.name) as DbCard | undefined;

      if (dbCard && !pickedNames.has(dbCard.name.toLowerCase())) {
        resolvedCards.push({
          card: dbCard,
          quantity: 1,
          board: 'main',
          role: entry.role || 'Utility',
          reason: entry.reason || '',
        });
        pickedNames.add(dbCard.name.toLowerCase());
      }
      continue;
    }

    if (pickedNames.has(key)) continue;

    resolvedCards.push({
      card: match.card,
      quantity: 1,
      board: 'main',
      role: entry.role || 'Utility',
      reason: entry.reason || '',
    });
    pickedNames.add(key);
  }

  // Step 8: Fill gaps from algorithmic pool if AI returned fewer cards
  const { nonLandTarget } = poolResult;
  if (resolvedCards.length < nonLandTarget) {
    for (const { card } of candidates) {
      if (resolvedCards.length >= nonLandTarget) break;
      if (pickedNames.has(card.name.toLowerCase())) continue;

      resolvedCards.push({
        card,
        quantity: 1,
        board: 'main',
        role: 'Utility',
        reason: 'Algorithmic fill (AI undercount)',
      });
      pickedNames.add(card.name.toLowerCase());
    }
  }

  // Truncate if over
  if (resolvedCards.length > nonLandTarget) {
    resolvedCards.length = nonLandTarget;
  }

  // Step 9: Add lands using existing logic
  const allPicked = new Set(resolvedCards.map((c) => c.card.name));
  const landCards = addLands(db, poolResult, allPicked);
  resolvedCards.push(...landCards);

  // Step 10: Fill shortfall with basic lands when collection blocks unowned cards
  const currentTotal = resolvedCards.reduce((s, c) => s + c.quantity, 0) + 1; // +1 for commander
  const deckSize = DEFAULT_DECK_SIZE[options.format] || DEFAULT_DECK_SIZE.default;
  if (currentTotal < deckSize && poolResult.colors.length > 0) {
    const basicMap: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
    const deficit = deckSize - currentTotal;
    const perColor = Math.floor(deficit / poolResult.colors.length);
    const extra = deficit - perColor * poolResult.colors.length;

    for (let i = 0; i < poolResult.colors.length; i++) {
      const basicName = basicMap[poolResult.colors[i]];
      if (!basicName) continue;
      const addQty = perColor + (i === 0 ? extra : 0);
      if (addQty <= 0) continue;

      const existing = resolvedCards.find((c) => c.card.name === basicName && c.board === 'main');
      if (existing) {
        existing.quantity += addQty;
      } else {
        const basic = db.prepare(
          'SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
        ).get(basicName) as DbCard | undefined;
        if (basic) {
          resolvedCards.push({ card: basic, quantity: addQty, board: 'main', role: 'Land', reason: '' });
        }
      }
    }
  }

  // Step 11: Build role breakdown
  const roleBreakdown: Record<string, string[]> = {};
  for (const c of resolvedCards) {
    if (c.role && !c.card.type_line.includes('Land')) {
      if (!roleBreakdown[c.role]) roleBreakdown[c.role] = [];
      roleBreakdown[c.role].push(c.card.name);
    }
  }

  const buildTimeMs = Date.now() - startTime;

  return {
    cards: resolvedCards,
    strategyExplanation: parsed.strategy || '',
    roleBreakdown,
    themes: poolResult.themes,
    tribalType: poolResult.tribalType || undefined,
    commanderSynergy: poolResult.commanderProfile || undefined,
    modelUsed,
    tokenUsage: { input: inputTokens, output: outputTokens },
    buildTimeMs,
  };
}

// ── Quick Build Fallback ─────────────────────────────────────────────────

async function runQuickBuildFallback(
  buildOptions: BuildOptions,
  startTime: number,
): Promise<ClaudeBuildResult> {
  const result = await autoBuildDeck(buildOptions);
  const buildTimeMs = Date.now() - startTime;

  // Convert BuildResult → ClaudeBuildResult format
  const cards: ClaudeBuildResult['cards'] = result.cards.map((c) => ({
    card: c.card,
    quantity: c.quantity,
    board: c.board,
    role: c.card.type_line.includes('Land') ? 'Land' : 'Utility',
    reason: 'Quick Build (trained model fallback)',
  }));

  const roleBreakdown: Record<string, string[]> = {};
  for (const c of cards) {
    if (!c.card.type_line.includes('Land')) {
      if (!roleBreakdown[c.role]) roleBreakdown[c.role] = [];
      roleBreakdown[c.role].push(c.card.name);
    }
  }

  return {
    cards,
    strategyExplanation: `Built using algorithmic Quick Build with trained model data (AI API unavailable). Strategy: ${result.strategy}`,
    roleBreakdown,
    themes: result.themes,
    tribalType: result.tribalType || undefined,
    commanderSynergy: result.commanderSynergy || undefined,
    modelUsed: 'quick-build-fallback',
    buildTimeMs,
  };
}

// ── Land Addition ────────────────────────────────────────────────────────────

function addLands(
  db: ReturnType<typeof getDb>,
  poolResult: ScoredCandidatePoolResult,
  pickedNames: Set<string>,
): ClaudeBuildResult['cards'] {
  const {
    colors, landTarget: targetLands, isCommander,
    colorExcludeFilter, legalityFilter, collectionJoin, collectionOrder,
    ownedQty, useCollection, maxCopies,
  } = poolResult;

  const result: ClaudeBuildResult['cards'] = [];

  function getMaxQty(card: DbCard): number {
    const formatMax = isCommander ? 1 : maxCopies;
    if (!useCollection) return formatMax;
    const owned = ownedQty.get(card.id) || 0;
    // Block unowned cards entirely when building from collection
    return owned > 0 ? Math.min(formatMax, owned) : 0;
  }

  const basicLandMap: Record<string, string> = {
    W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
  };

  const numColors = colors.length;
  const nonBasicTarget = numColors <= 1
    ? Math.min(4, targetLands)
    : numColors === 2
      ? Math.min(12, targetLands - 8)
      : Math.min(20, targetLands - 5);

  const landPool = db.prepare(`
    SELECT c.* FROM cards c
    ${collectionJoin}
    WHERE c.type_line LIKE '%Land%'
    AND c.type_line NOT LIKE '%Basic%'
    ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
    ${legalityFilter}
    ORDER BY
      ${collectionOrder}
      CASE WHEN c.oracle_text LIKE '%enters the battlefield tapped%' OR c.oracle_text LIKE '%enters tapped%' THEN 1 ELSE 0 END,
      c.edhrec_rank ASC NULLS LAST
    LIMIT 60
  `).all() as DbCard[];

  let landsAdded = 0;

  for (const land of landPool) {
    if (landsAdded >= nonBasicTarget) break;
    if (pickedNames.has(land.name)) continue;

    const oracleText = (land.oracle_text || '').toLowerCase();
    if (numColors <= 1) {
      const entersTapped = oracleText.includes('enters the battlefield tapped')
        || oracleText.includes('enters tapped');
      if (entersTapped) continue;
    }

    // Skip fetch lands that search for basic types not in deck colors
    if (!isFetchLandRelevant(land.oracle_text || '', colors)) continue;

    const cardMax = getMaxQty(land);
    const qty = isCommander ? 1 : Math.min(cardMax, targetLands - landsAdded);
    if (qty <= 0) continue;

    result.push({ card: land, quantity: qty, board: 'main', role: 'Land', reason: '' });
    pickedNames.add(land.name);
    landsAdded += qty;
  }

  // Fill remaining land slots with basics
  if (colors.length > 0 && landsAdded < targetLands) {
    const remaining = targetLands - landsAdded;
    const perColor = Math.floor(remaining / colors.length);
    const extraForFirst = remaining - perColor * colors.length;

    for (let i = 0; i < colors.length; i++) {
      const basicName = basicLandMap[colors[i]];
      if (!basicName) continue;

      const basic = db.prepare(
        'SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
      ).get(basicName) as DbCard | undefined;

      if (basic) {
        const qty = Math.min(perColor + (i === 0 ? extraForFirst : 0), targetLands - landsAdded);
        if (qty > 0) {
          result.push({ card: basic, quantity: qty, board: 'main', role: 'Land', reason: '' });
          landsAdded += qty;
        }
      }
    }
  }

  return result;
}
