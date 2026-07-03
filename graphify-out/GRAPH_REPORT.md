# Graph Report - .  (2026-06-17)

## Corpus Check
- 183 files · ~196,780 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1798 nodes · 3893 edges · 109 communities (85 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 124 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 227 edges
2. `cn()` - 82 edges
3. `getAuthUser()` - 76 edges
4. `DbCard` - 58 edges
5. `unauthorizedResponse()` - 53 edges
6. `GameStateEngine` - 45 edges
7. `GrpIdResolver` - 30 edges
8. `getDeckWithCards()` - 26 edges
9. `POST()` - 25 edges
10. `classifyCard()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `GrpIdResolver` --semantically_similar_to--> `rateLimitedFetch (Scryfall 100ms limiter)`  [INFERRED] [semantically similar]
  lib/grp-id-resolver.ts → src/lib/scryfall.ts
- `POST()` --calls--> `getDb()`  [INFERRED]
  app/api/arena-telemetry/analyze/route.ts → lib/db.ts
- `GET()` --calls--> `getDb()`  [EXTRACTED]
  app/api/deck-versions/route.ts → lib/db.ts
- `GET()` --calls--> `analyzeMatchesForDeck()`  [INFERRED]
  app/api/match-logs/analyze/route.ts → lib/match-analyzer.ts
- `GET()` --calls--> `getDb()`  [EXTRACTED]
  app/api/match-logs/route.ts → lib/db.ts

## Import Cycles
- None detected.

## Communities (109 total, 24 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (62): GET(), GET(), POST(), GET(), POST(), Pattern: CF proxy graceful degradation (AbortController timeout, 200-with-error), External: Black Grimoire CF API (VPS), runFirstBootActions (+54 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (58): ML Check Route, ML Predictions Route, POST(), GET(), POST(), Two-Pass Arena Match Auto-Linking, GET(), DB: card_performance (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (57): DeckCard, GET(), ANALYSIS_FORMATS, DeckAnalysisData, DeckSummary, ScoreGauge(), BOARD_WIPE_NAMES, BOARD_WIPE_PATTERNS (+49 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (19): extractGameEvents, Arena Log Reader, Live Arena Overlay Event Pipeline, ElectronAPI (IPC contract), GameStateSnapshot, ArenaGameEvent, GameStateEngine, GameStateSnapshot (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (49): MatchDetailModal Component, AI Suggest Apply Route, AI Suggest Benchmark Route, AI Chat Tuning Route, Analytics Dashboard Page, computeLiveAnalytics(), GET(), buildTimelineNarrative() (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (42): Auth Login Route, Auth Logout Route, Auth Me Route, Auth Register Route, Billing Checkout Route, Billing Portal Route, Billing Subscription Route, Billing Webhook Route (+34 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (41): AnnotationDetail, AnnotationInfo, CardDrawnEvent, CardPlayedEvent, createContext(), DamageDealtEvent, DeckSubmissionEvent, extractGameEvents() (+33 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (33): POST(), GET(), POST(), POST(), Combo, ComboCard, ComboResult, GET() (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (29): CardGrid(), CardGridProps, DraggableCard(), CardImage(), CardImageProps, SIZE_DIMENSIONS, DeckDndContext(), DeckDndContextProps (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (18): cinzel, crimsonText, metadata, AuthContext, AuthContextType, AuthProvider(), useAuth(), User (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (38): CollectionEntry interface, DbCard (card data model), Deck interface, DeckCardEntry interface, DeckPatchOp union type, DeckStats interface, FORMAT_LABELS constant, MANA_COLORS constant (+30 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (31): isDrawEngine(), AuditCard, auditDeck(), AuditOptions, DeckHealth, Deficiency, DeficiencyKind, analyzeManaDemands() (+23 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (30): buildProposedChanges(), cardIsLegalInFormat(), getDeckColorIdentity(), POST(), ProposedChange, AI Suggest Stats Route, POST(), Fixed-Size Format CUT=ADD Balance (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (35): card-classifier module, AIChatPanel component, DeckPickerOverlay component, DraftTracker component, Capacity-aware suggestion = swap-proposal vs direct-add, Collection-only search/AI filter toggle, Commander color-identity derived search filtering, Deck-fingerprint auto-link on match start (+27 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (34): AI Chat Helpers, buildDeckWithAI, AI Deck Builder, AI Suggest (rule-based), resolveCFToDbCards, computeCollectionCoverage (owned-vs-optimal), analyzeCommanderForBuild (arsenal builder), extractDirectNeeds (oracle-text needs) (+26 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (33): match-analyzer.analyzeMatchesForDeck, API /api/match-logs, API /api/match-logs/analyze, User-scoped deck ownership guard, Pattern: user-scoped ownership-verified queries (WHERE user_id = ?), External: Commander Spellbook API, sideboard-guide.generateSideboardGuide, db.getAllDecks (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (17): CardZoomOverlay(), CardZoomOverlayProps, CraftCard, CraftPath, CraftPathPanel(), CraftPathPanelProps, RARITY_COLOR, RARITY_ORDER (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (27): ChangeRequest, POST(), Pattern: version snapshot before deck mutation, GET(), POST(), VersionRow, DELETE(), GET() (+19 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (26): POST(), ChatAction, ChatResponse, getAnthropicKey(), getGroqKey(), getOpenAIKey(), getOpenAIModel(), getPreferredProvider() (+18 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (26): parseBuildHints(), ParsedBuildHints, singular(), STRATEGY_WORDS, THEME_WORDS, getCedhStaples(), getDataDir(), autoBuildDeck() (+18 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (25): analyzeCommanderForBuild(), ArsenalCard, ArsenalReason, buildSummary(), CommanderDirectNeeds, extractDirectNeeds(), findCollectionSubstitutes(), isInColorIdentity() (+17 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (27): Global Learning Engine (Elo + meta), createVersionSnapshot, getDeckDiff, restoreDeckToVersion, shouldCreateNewVersion (30s debounce), meta_cache read/write (168h TTL), getEdhrecRecommendations, getEdhrecThemeCards (+19 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (25): ExtractionContext (streaming grpId/zone state), extractGameEventsWithContext, resolveGrpId (ObjectIdChanged chain walk), JsonBlock type, extractJsonBlocks, extractMatches, parseArenaLogFile, Arena grpId Card Resolution (+17 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (16): CardInline(), CardInlineProps, CardInlineText(), AnalysisDisplay(), AnalysisResult, AssessmentCard(), CardImageInfo, FILTERED_ACTION_TYPES (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (15): CollectionFiltersProps, COLOR_STYLES, DeckBuilderPage(), DeckSummary, CARD_TYPES, DEFAULT_DECK_SIZE, DEFAULT_LAND_COUNT, FORMAT_LABELS (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (16): DeckValidation(), DeckValidationProps, IssueRow(), CardImageData, CardNameHover(), ChapterHeader(), GameNarrative(), lifeBarClass() (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (4): MatchTelemetryLogger, MatchTelemetrySummary, TelemetryAction, TelemetryFlushData

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (21): UserBilling interface, checkIsOverwolf, Overwolf subscription precedence over Stripe, Stripe Subscriptions API (v22+ basil), Tier-based feature gating (commander>pro>free), /api/billing/subscription endpoint, getStripeClient, getStripePriceId (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (21): API /api/settings, validateCardClaims (LLM hallucination check), getClaudeSuggestions (Anthropic API deck advisor), API-key masking on settings GET, Anthropic Claude Messages API, app_state key-prefix namespacing (setting_ / game_deck_preference), isImpulseDraw, Anthropic Claude API (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (18): AppConfig, getConfigPath(), loadConfig(), postJson(), runFirstBootActions(), saveConfig(), apiGet(), CardStat (+10 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (13): CardDetailModal(), CardDetailModalProps, DeckStats(), DeckStatsProps, ColorIdentityPips(), MANA_SYMBOLS, ManaCost(), parseManaCost() (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (4): Scryfall /cards/arena/ API, ResolvedCard, GrpIdResolver, grp-id-resolver.test

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (19): buildClaudePrompt, runQuickBuildFallback, parseBuildHints (deterministic no-LLM prompt parse), classifyCard, getFormatRatios (deck ratio targets), isDrawEngine (repeatable advantage detector), getCommanderStrategyPrompt, Concept: role-quota deck construction (vs curve-fill) (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (14): MIGRATIONS, ArchetypeWinStat, DeckCard, generateSideboardGuide(), getCachedGuides(), getClaudeKey(), getClaudeModel(), getMetaArchetypes() (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (15): addLands(), buildDeckWithAI(), callOpenAI(), ClaudeBuildOptions, extractJson(), getClaudeKey(), getClaudeModel(), getEdhrecAvgDeck() (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (17): buildClaudePrompt(), ClaudeSuggestionResult, getClaudeKey(), getClaudeModel(), getClaudeSuggestions(), getMTGKnowledge(), analyzeCommander(), buildStrategyDescription() (+9 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (11): GET(), Pattern: local-DB-first, Scryfall-fallback search, getCardCount(), searchCards(), ScryfallCard, GET /api/cards/autocomplete, GET /api/cards/search, POST /api/cards/seed (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (18): getCFRecommendations (CF engine call + cache), Atomic staging-table swap pattern, CF Recommendation API (Black Grimoire), Collaborative Filtering Recommendation Engine (VPS 187.77.110.100/cf-api), Hardcoded CF API key seeded in migration 28 (security risk), CF_API_DEFAULT_URL (VPS endpoint), cf-api-client.getEDHRECConsensus, cf-api-client.getSimilarDecks (+10 more)

### Community 38 - "Community 38"
Cohesion: 0.16
Nodes (10): DraftCard, DraftState, DraftTracker, BillingSection(), SettingsDialog(), SettingsDialogProps, DraftPage(), getElectronAPI() (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (3): FEATURES, PLANS, TESTIMONIALS

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (11): Analysis, AnalysisInsight, CardPerf, MatchLog, MatchLogPanel(), MatchLogPanelProps, MatchStats, MatchupData (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (13): Archetype, analyzeHand(), analyzeMulligan(), ARCHETYPE_WEIGHTS, CardMap, DeckInfo, DEFAULT_WEIGHTS, DRAW_PATTERNS (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (15): Navbar component, Theme Provider, Update Banner, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, POST /api/auth/register, POST /api/cf-player (heartbeat) (+7 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (15): addLands, Mana-screw bug / fixing overstatement, MDFC color-identity leak fix, analyzeManaDemands, buildOptimalLandBase, isFetchLandRelevant, scoreLandsForDeck, fetchLandColors (+7 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (15): API /api/arena-collection, POST /api/billing/checkout (Stripe), API /api/billing/portal, API /api/billing/subscription, API /api/data-export, API /api/ml-pipeline, API /api/mtgjson-enrich, API /api/settings/test-provider (+7 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (15): GET /api/cards/search, POST /api/cards/seed (Scryfall), GET /api/collection, API /api/collection/import, GET /api/decks, API /api/decks/[id]/import-update, GET /api/game-deck-preference, Deck Picker Overlay (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.19
Nodes (11): OverwolfAdProps, checkIsOverwolf(), CachedSubscription, canUseFeature(), FEATURE_TIER, getCurrentTier(), getSubscription(), isPremium() (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.30
Nodes (14): Pattern: Scryfall resolution pipeline (batch 75, name retry, A- prefix, UB aliases, DFC front-face), External: Scryfall API, handleArenaImport(), handleTsvImport(), POST(), detectFormat(), parseTsvCollection(), clearCollection() (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (13): ARCHETYPE_TEMPLATES, ArchetypeTemplate, COLOR_ADJUSTMENTS, ColorAdjustment, DrawBreakdown, getColorAdjustment(), getRecommendedLands(), getScaledCurve() (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (9): buildTurnTimeline(), CardEntry, computeCardsPlayed(), generatePostMatchStats(), isLandType(), isRemovalCard(), REMOVAL_NAMES, REMOVAL_ORACLE_PATTERNS (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (5): CollectionCard, CollectionPage(), CollectionFilters(), SearchBar(), SearchBarProps

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (6): AIChatPanel(), AIChatPanelProps, ChatAction, ChatMessage, renderInline(), renderMarkdown()

### Community 52 - "Community 52"
Cohesion: 0.23
Nodes (11): DiffEntry, POST(), ArenaParseResult, formatArenaExport(), formatCardLine(), parseArenaExport(), parseArenaExportWithMeta(), SECTION_HEADERS (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.29
Nodes (10): ExportDialog(), ExportDialogProps, ExportFormat, exportToArena(), exportToMtgo(), exportToText(), formatLine(), DeckCardEntry (+2 more)

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (8): CATEGORY_ORDER, GameDeckTracker(), GameDeckTrackerProps, GroupedCard, ManaSymbol(), ZoneInfo, DeckCardEntry, StateChangeListener

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (11): getArenaIdCoverage(), cancelEnrichment(), currentProgress, enrichArenaIds(), EnrichmentProgress, fetchAndParseMtgjson(), getEnrichmentProgress(), resetProgress() (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (12): CardFilter, CFRecommendation, CollectionEntry, Deck, DeckPatchOp, DeckStats, DeckWithCards, ImportResult (+4 more)

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (11): AnalysisData, CoverageBar(), CoverageCard, CoverageData, DeckAnalysisPanel(), DeckAnalysisPanelProps, getBracketLabel(), RatioBar() (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (9): DeckInfo, DeckPickerOverlay(), DeckPickerOverlayProps, FingerprintResult, FORMAT_LABELS, inferFormatFilter(), GameOpponentTracker(), GameOpponentTrackerProps (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.18
Nodes (11): fitsColorIdentity, UNLIMITED_COPIES (singleton exemption set), validateDeck, MTGJSON AtomicCards, computeMatchMLFeatures, enrichArenaIds, resolveOpenAISuggestions, arena_grp_id_map table (+3 more)

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (6): getLegalityKey(), DeckEntry, isCommanderFormat(), UNLIMITED_COPIES, validateDeck(), ValidationIssue

### Community 61 - "Community 61"
Cohesion: 0.33
Nodes (10): checkCache(), commanderToSlug(), EdhrecData, EdhrecRecommendation, EdhrecThemeCards, getCacheKey(), getEdhrecRecommendations(), getEdhrecThemeCards() (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.31
Nodes (8): autocomplete(), getBulkDataUrl(), getCardById(), getCardByName(), getCollection(), getRandomCard(), rateLimitedFetch(), searchCards()

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (10): isLegalInFormat, getOllamaSuggestions, getRuleBasedSuggestions, getLegalityKey, getCommunityRecommendations, getMetaRankedCardNames, getSynergySuggestions (in-deck recs), Ollama local LLM API (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.28
Nodes (9): API /api/arena-matches, API /api/arena-telemetry, API /api/arena-telemetry/analyze, Arena Per-Action Telemetry Pipeline, GameLog, GameNarrative, MatchDetailModal, DB table: arena_game_actions (telemetry) (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (7): CardListProps, ManaCurveBarProps, ManaCurveDisplay(), PostMatchSummary(), PostMatchSummaryProps, StatCard(), StatCardProps

### Community 66 - "Community 66"
Cohesion: 0.31
Nodes (7): ARCHETYPE_PLAN, buildPilotGuide(), PilotCard, PilotGuide, DeckCardRow, GET(), GET /api/decks/pilot-guide

### Community 67 - "Community 67"
Cohesion: 0.36
Nodes (7): addLine(), buildPipelineArgs(), findPython(), getDbPath(), getScriptsDir(), pipelineStatus, POST()

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (6): GameLogProps, TYPE_ICONS, TYPE_STYLES, GameNarrativeProps, TurnChapter, GameLogEntry

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (4): AnalyticsData, COLOR_MAP, COLOR_NAMES, TYPE_COLORS

### Community 71 - "Community 71"
Cohesion: 0.43
Nodes (5): formatDuration(), ScreenRecorderControls(), RecordingState, ScreenSource, useScreenRecorder()

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (5): SOURCE_LABELS, Spinner(), VersionEntry, VersionHistoryPanel(), VersionHistoryPanelProps

### Community 73 - "Community 73"
Cohesion: 0.57
Nodes (5): findBestMatch(), fingerprint(), FingerprintMatch, matchScore(), UserDeck

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (6): Arena numeric localization-ID pollution, OpenAI API, seedArenaCardCache, getOpenAISuggestions, app_state table, grp_id_cache table

### Community 75 - "Community 75"
Cohesion: 0.53
Nodes (5): ElectronAPI, Window, MulliganAdvice, PostMatchStats, SideboardPlan

### Community 76 - "Community 76"
Cohesion: 0.50
Nodes (5): AI Chat Panel, SSE Streaming Chat Protocol (text/complete/error events), POST /api/ai-suggest/chat, Card Inline (hover preview), cn (utils className helper)

### Community 77 - "Community 77"
Cohesion: 0.40
Nodes (5): parseArenaExport, exportToArena, Deck Export, arena-parser.test, deck-export.test

### Community 78 - "Community 78"
Cohesion: 0.70
Nodes (4): GET(), getCollection(), getCollectionStats(), GET /api/collection

### Community 79 - "Community 79"
Cohesion: 0.50
Nodes (4): API /api/deck-versions, API /api/deck-versions/restore, Automatic Deck Version Snapshots, VersionHistoryPanel

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (4): Fire-and-forget async enrichment with progress polling, mtgjson-enrich.enrichArenaIds, db.getArenaIdCoverage, API /api/mtgjson-enrich route

### Community 81 - "Community 81"
Cohesion: 0.50
Nodes (4): getElectronAPI, Subscription gating, platform-detect.test (subscription), useScreenRecorder hook

### Community 82 - "Community 82"
Cohesion: 0.50
Nodes (4): formatKnowledgeForPrompt, queryKnowledge (FTS5), edhrec_knowledge_fts (FTS5), mtggoldfish_knowledge_fts (FTS5)

### Community 84 - "Community 84"
Cohesion: 0.67
Nodes (3): buildAntiOscillationRules, extractAppliedActions, Anti-oscillation fixed-point convergence

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (3): Module-level singleton pipeline process state, scripts/pipeline.py (ML pipeline), API /api/ml-pipeline route

## Ambiguous Edges - Review These
- `AI Chat Helpers` → `utils.test`  [AMBIGUOUS]
  src/lib/__tests__/utils.test.ts · relation: conceptually_related_to
- `parseBuildHints (deterministic no-LLM prompt parse)` → `ARCHETYPE_TEMPLATES (11 archetype ratios)`  [AMBIGUOUS]
  src/lib/build-hints.ts · relation: semantically_similar_to
- `extractDirectNeeds (oracle-text needs)` → `TRIGGER_PATTERNS (18 synergy categories)`  [AMBIGUOUS]
  src/lib/commander-analysis.ts · relation: semantically_similar_to
- `UNLIMITED_COPIES (singleton exemption set)` → `Mana-screw bug / fixing overstatement`  [AMBIGUOUS]
  src/lib/deck-validation.ts · relation: conceptually_related_to
- `getEdhrecRecommendations` → `Global Learning Engine (Elo + meta)`  [AMBIGUOUS]
  src/lib/global-learner.ts · relation: conceptually_related_to
- `getOpenAISuggestions` → `Mana-screw bug / fixing overstatement`  [AMBIGUOUS]
  src/lib/openai-suggest.ts · relation: conceptually_related_to
- `Tier-based feature gating (commander>pro>free)` → `cn (tailwind class merge)`  [AMBIGUOUS]
  src/lib/utils.ts · relation: conceptually_related_to

## Knowledge Gaps
- **486 isolated node(s):** `ArenaMatch`, `Deck`, `AnalyticsData`, `COLOR_MAP`, `COLOR_NAMES` (+481 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AI Chat Helpers` and `utils.test`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `parseBuildHints (deterministic no-LLM prompt parse)` and `ARCHETYPE_TEMPLATES (11 archetype ratios)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `extractDirectNeeds (oracle-text needs)` and `TRIGGER_PATTERNS (18 synergy categories)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `UNLIMITED_COPIES (singleton exemption set)` and `Mana-screw bug / fixing overstatement`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `getEdhrecRecommendations` and `Global Learning Engine (Elo + meta)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `getOpenAISuggestions` and `Mana-screw bug / fixing overstatement`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Tier-based feature gating (commander>pro>free)` and `cn (tailwind class merge)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._