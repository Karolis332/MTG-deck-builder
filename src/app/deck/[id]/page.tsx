'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { DbCard, DeckCardEntry, AISuggestion } from '@/lib/types';
import { SearchBar } from '@/components/search-bar';
import { CardGrid } from '@/components/card-grid';
import { DeckList } from '@/components/deck-list';
import { DeckStats } from '@/components/deck-stats';
import { DeckValidation } from '@/components/deck-validation';
import { ExportDialog } from '@/components/export-dialog';
import { PlaytestModal } from '@/components/playtest-modal';
import { CardDetailModal } from '@/components/card-detail-modal';
import { MatchLogPanel } from '@/components/match-log-panel';
import { AIChatPanel } from '@/components/ai-chat-panel';
import { ImportDialog } from '@/components/import-dialog';
import { VersionHistoryPanel } from '@/components/version-history-panel';
import { CardZoomOverlay } from '@/components/card-zoom-overlay';
import { FORMAT_LABELS, FORMATS, COMMANDER_FORMATS, DEFAULT_DECK_SIZE } from '@/lib/constants';

interface DeckData {
  id: number;
  name: string;
  description: string | null;
  format: string | null;
  cards: Array<{
    entry_id: number;
    card_id: string;
    quantity: number;
    board: string;
    sort_order: number;
  } & DbCard>;
}

interface BuildExplanation {
  strategy: string;
  roleBreakdown: Record<string, string[]>;
  cardReasons: Record<string, string>;
  modelUsed: string;
  buildTimeMs: number;
  commanderName: string;
  themes: string;
}

export default function DeckEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = Number(params.id);

  // Deck state
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Build explanation state
  const [explanation, setExplanation] = useState<BuildExplanation | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasExplanation, setHasExplanation] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<DbCard[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPage, setSearchPage] = useState(1);

  // UI state
  const [activePanel, setActivePanel] = useState<'search' | 'deck'>('search');
  const [showExport, setShowExport] = useState(false);
  const [showPlaytest, setShowPlaytest] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DbCard | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [deckName, setDeckName] = useState('');

  // Zoom state
  const [zoomedCard, setZoomedCard] = useState<DbCard | null>(null);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  // Filter state
  const [filterManaValues, setFilterManaValues] = useState<number[]>([]);
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

  // AI state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsSource, setSuggestionsSource] = useState<'rules' | 'ollama' | 'synergy' | 'openai'>('rules');
  const [proposedChanges, setProposedChanges] = useState<Array<{
    action: 'cut' | 'add';
    cardId: string;
    cardName: string;
    quantity: number;
    reason: string;
    winRate?: number;
    imageUri?: string;
    selected: boolean;
  }>>([]);
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [collectionOnly, setCollectionOnly] = useState(true);

  // ML state
  const [mlReady, setMlReady] = useState(false);
  const [mlGames, setMlGames] = useState(0);

  // Load deck
  useEffect(() => {
    if (!deckId) return;
    setLoading(true);
    fetch(`/api/decks/${deckId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.deck) {
          setDeck(data.deck);
          setDeckName(data.deck.name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deckId]);

  // Check ML readiness
  useEffect(() => {
    if (!deckId) return;
    fetch(`/api/ai-suggest/ml-check?deck_id=${deckId}`)
      .then(r => r.json())
      .then(data => {
        setMlReady(data.hasEnoughData || false);
        setMlGames(data.gamesPlayed || 0);
      })
      .catch(() => {});
  }, [deckId]);

  // Fetch build explanation if coming from Claude build
  useEffect(() => {
    if (!deckId) return;
    const shouldShow = searchParams.get('showExplanation') === 'true';

    fetch(`/api/decks/${deckId}/build-explanation`)
      .then((r) => r.json())
      .then((data) => {
        if (data.explanation) {
          setExplanation(data.explanation);
          setHasExplanation(true);
          if (shouldShow) setShowExplanation(true);
        }
      })
      .catch(() => {});
  }, [deckId, searchParams]);

  // Search cards
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      setSearchPage(1);
      setSearchLoading(true);

      try {
        const params = new URLSearchParams({
          q: query,
          page: '1',
          limit: '20',
        });
        const res = await fetch(`/api/cards/search?${params}`);
        const data = await res.json();
        setSearchResults(data.cards || []);
        setSearchTotal(data.total || 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  const loadMoreResults = async () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: String(nextPage),
        limit: '20',
      });
      const res = await fetch(`/api/cards/search?${params}`);
      const data = await res.json();
      setSearchResults((prev) => [...prev, ...(data.cards || [])]);
    } catch {}
  };

  // Filtered search results
  const filteredSearchResults = useMemo(() => {
    let cards = searchResults;

    if (filterManaValues.length > 0) {
      cards = cards.filter((c) => {
        const has7Plus = filterManaValues.includes(7);
        const exactValues = filterManaValues.filter((v) => v < 7);
        return exactValues.includes(c.cmc) || (has7Plus && c.cmc >= 7);
      });
    }

    if (filterColors.length > 0) {
      cards = cards.filter((c) => {
        const ci: string[] = c.color_identity ? JSON.parse(c.color_identity) : [];
        return filterColors.some((fc) => ci.includes(fc));
      });
    }

    if (filterTypes.length > 0) {
      cards = cards.filter((c) =>
        filterTypes.some((ft) => c.type_line.includes(ft))
      );
    }

    return cards;
  }, [searchResults, filterManaValues, filterColors, filterTypes]);

  const hasActiveFilters = filterManaValues.length > 0 || filterColors.length > 0 || filterTypes.length > 0;

  const handleCardZoom = useCallback((card: DbCard, position: { x: number; y: number }) => {
    setZoomedCard(card);
    setZoomPosition(position);
  }, []);

  const closeZoom = useCallback(() => {
    setZoomedCard(null);
  }, []);

  // Deck mutations
  const addCardToDeck = async (card: DbCard, board = 'main') => {
    if (!deck) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'add_card',
          card_id: card.id,
          quantity: 1,
          board,
        }),
      });
      const data = await res.json();
      if (data.deck) setDeck(data.deck);
    } catch {} finally {
      setSaving(false);
    }
  };

  const removeCardFromDeck = async (cardId: string, board: string) => {
    if (!deck) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'remove_card', card_id: cardId, board }),
      });
      const data = await res.json();
      if (data.deck) setDeck(data.deck);
    } catch {} finally {
      setSaving(false);
    }
  };

  const setQuantity = async (
    cardId: string,
    board: string,
    quantity: number
  ) => {
    if (!deck) return;
    if (quantity <= 0) {
      return removeCardFromDeck(cardId, board);
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'set_quantity',
          card_id: cardId,
          quantity,
          board,
        }),
      });
      const data = await res.json();
      if (data.deck) setDeck(data.deck);
    } catch {} finally {
      setSaving(false);
    }
  };

  const setAsCommander = async (cardId: string) => {
    if (!deck) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'move_card',
          card_id: cardId,
          from_board: 'main',
          to_board: 'commander',
        }),
      });
      const data = await res.json();
      if (data.deck) setDeck(data.deck);
    } catch {} finally {
      setSaving(false);
    }
  };

  const setCoverCard = async (cardId: string) => {
    if (!deck) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_card_id: cardId }),
      });
      const data = await res.json();
      if (data.deck) setDeck(data.deck);
    } catch {} finally {
      setSaving(false);
    }
  };

  const isCommanderFormat = COMMANDER_FORMATS.includes(
    (deck?.format || '') as typeof COMMANDER_FORMATS[number]
  );

  // Apply actions from AI chat panel
  const handleChatApply = async (
    actions: Array<{
      action: 'cut' | 'add';
      cardId: string;
      cardName: string;
      quantity: number;
      reason: string;
      imageUri?: string;
    }>
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/ai-suggest/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deckId,
          changes: actions.map((a) => ({
            action: a.action,
            cardId: a.cardId,
            cardName: a.cardName,
            quantity: a.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Reload deck
        const deckRes = await fetch(`/api/decks/${deckId}`);
        const deckData = await deckRes.json();
        if (deckData.deck) setDeck(deckData.deck);
        if (data.warnings) {
          alert(data.warnings);
        }
        return true;
      } else if (data.error) {
        alert(data.error);
        return false;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateDeckMeta = async (updates: {
    name?: string;
    format?: string;
  }) => {
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.deck) {
        setDeck(data.deck);
        if (updates.name) setDeckName(updates.name);
      }
    } catch {}
  };

  // AI suggestions
  const getSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestions([]);
    setProposedChanges([]);
    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: deckId, collection_only: collectionOnly }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setSuggestionsSource(data.source || 'rules');

      // Set proposed changes with all selected by default
      if (data.proposedChanges?.length) {
        setProposedChanges(
          data.proposedChanges.map((c: Record<string, unknown>) => ({ ...c, selected: true }))
        );
      }
    } catch {} finally {
      setSuggestionsLoading(false);
    }
  };

  // Apply selected AI-proposed changes
  const applySelectedChanges = async () => {
    const selected = proposedChanges.filter((c) => c.selected);
    if (selected.length === 0) return;

    setApplyingChanges(true);
    try {
      const res = await fetch('/api/ai-suggest/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deckId,
          changes: selected.map((c) => ({
            action: c.action,
            cardId: c.cardId,
            cardName: c.cardName,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Reload the deck to reflect changes
        const deckRes = await fetch(`/api/decks/${deckId}`);
        const deckData = await deckRes.json();
        if (deckData.deck) setDeck(deckData.deck);
        setProposedChanges([]);
        setSuggestions([]);
      } else if (data.error) {
        alert(data.error);
      }
    } catch {} finally {
      setApplyingChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold">Deck not found</p>
          <button
            onClick={() => router.push('/deck-builder')}
            className="text-sm text-primary hover:underline"
          >
            Back to decks
          </button>
        </div>
      </div>
    );
  }

  const deckEntries: DeckCardEntry[] = deck.cards.map((c) => ({
    id: c.entry_id,
    deck_id: deckId,
    card_id: c.card_id || c.id,
    quantity: c.quantity,
    board: c.board as DeckCardEntry['board'],
    sort_order: c.sort_order,
    card: c,
  }));

  const mainCount = deckEntries
    .filter((c) => c.board === 'main' || c.board === 'commander')
    .reduce((s, c) => s + c.quantity, 0);

  const cardIdsInDeck = new Set(deck.cards.map((c) => c.card_id || c.id));

  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Deck header */}
        <div className="shrink-0 border-b border-border bg-card/50 px-4 py-2">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/deck-builder')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              {editingName ? (
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  onBlur={() => {
                    setEditingName(false);
                    if (deckName.trim() && deckName !== deck.name) {
                      updateDeckMeta({ name: deckName.trim() });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  autoFocus
                  className="border-b border-primary bg-transparent text-lg font-bold outline-none"
                />
              ) : (
                <h1
                  onClick={() => setEditingName(true)}
                  className="cursor-pointer text-lg font-bold hover:text-primary"
                  title="Click to rename"
                >
                  {deck.name}
                </h1>
              )}

              <select
                value={deck.format || 'standard'}
                onChange={(e) => updateDeckMeta({ format: e.target.value })}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </option>
                ))}
              </select>

              <span className="text-xs text-muted-foreground">
                {mainCount} cards
                {saving && ' (saving...)'}
              </span>

              {hasExplanation && (
                <button
                  onClick={() => setShowExplanation((v) => !v)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                    showExplanation
                      ? 'bg-primary/20 text-primary'
                      : 'bg-accent text-accent-foreground hover:bg-accent/80'
                  )}
                  title="Toggle AI build explanation"
                >
                  <SparklesIcon className="h-3 w-3" />
                  AI
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Version history button */}
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
                title="Version history"
              >
                <HistoryIcon className="h-3.5 w-3.5" />
                History
              </button>

              {/* Collection-only toggle */}
              <label className="flex cursor-pointer items-center gap-1.5" title="When on, AI only suggests cards you own">
                <span className="text-[10px] text-muted-foreground">
                  {collectionOnly ? 'My cards' : 'All cards'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={collectionOnly}
                  onClick={() => setCollectionOnly((v) => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    collectionOnly ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                      collectionOnly ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    )}
                  />
                </button>
              </label>

              <button
                onClick={getSuggestions}
                disabled={suggestionsLoading}
                className="relative flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                {suggestionsLoading ? 'Thinking...' : 'AI Suggest'}
                {mlReady && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground"
                    title={`ML model ready (${mlGames} games analyzed)`}
                  >
                    ML
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowPlaytest(true)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
              >
                <PlayIcon className="h-3.5 w-3.5" />
                Playtest
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ImportIcon className="h-3.5 w-3.5" />
                Import
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ExportIcon className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Mobile panel toggle */}
        <div className="flex shrink-0 border-b border-border lg:hidden">
          <button
            onClick={() => setActivePanel('search')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activePanel === 'search'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            )}
          >
            Search Cards
          </button>
          <button
            onClick={() => setActivePanel('deck')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activePanel === 'deck'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            )}
          >
            Deck ({mainCount})
          </button>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: Card search */}
          <div
            className={cn(
              'flex flex-col border-r border-border',
              'lg:flex lg:w-[60%]',
              activePanel === 'search' ? 'flex w-full' : 'hidden'
            )}
          >
            <div className="shrink-0 p-3 pb-0">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search cards to add..."
                autoFocus
              />
            </div>

            {/* Search filters */}
            <div className="shrink-0 px-3 py-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1">
                {/* Mana value */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((mv) => (
                  <button
                    key={mv}
                    onClick={() =>
                      setFilterManaValues((prev) =>
                        prev.includes(mv) ? prev.filter((v) => v !== mv) : [...prev, mv]
                      )
                    }
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded text-[10px] font-medium border transition-colors',
                      filterManaValues.includes(mv)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                    )}
                    title={`CMC ${mv === 7 ? '7+' : mv}`}
                  >
                    {mv === 7 ? '7+' : mv}
                  </button>
                ))}

                <span className="mx-1 h-4 w-px bg-border" />

                {/* Colors */}
                {(['W', 'U', 'B', 'R', 'G'] as const).map((color) => {
                  const colorStyles: Record<string, string> = {
                    W: 'bg-amber-50 text-amber-900 border-amber-300',
                    U: 'bg-blue-600 text-white border-blue-500',
                    B: 'bg-zinc-800 text-zinc-100 border-zinc-600',
                    R: 'bg-red-600 text-white border-red-500',
                    G: 'bg-green-700 text-white border-green-600',
                  };
                  const active = filterColors.includes(color);
                  return (
                    <button
                      key={color}
                      onClick={() =>
                        setFilterColors((prev) =>
                          prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
                        )
                      }
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold border transition-all',
                        active
                          ? colorStyles[color]
                          : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                      )}
                      title={color}
                    >
                      {color}
                    </button>
                  );
                })}

                <span className="mx-1 h-4 w-px bg-border" />

                {/* Types */}
                {['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].map((type) => {
                  const active = filterTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() =>
                        setFilterTypes((prev) =>
                          prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                        )
                      }
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium border transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                      )}
                    >
                      {type.slice(0, 4)}
                    </button>
                  );
                })}

                {hasActiveFilters && (
                  <>
                    <span className="mx-1 h-4 w-px bg-border" />
                    <button
                      onClick={() => {
                        setFilterManaValues([]);
                        setFilterColors([]);
                        setFilterTypes([]);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <div className="shrink-0 border-b border-border px-3 pb-3">
                <div className="mb-2 flex items-center gap-2">
                  <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">
                    AI Suggestions
                    <span className="ml-1 text-muted-foreground">
                      (via {suggestionsSource === 'ollama' ? 'Ollama' : suggestionsSource === 'openai' ? 'GPT' : suggestionsSource === 'synergy' ? 'synergy engine' : 'rules engine'})
                    </span>
                  </span>
                  <button
                    onClick={() => setSuggestions([])}
                    className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {suggestions.slice(0, 8).map((s) => (
                    <button
                      key={s.card.id}
                      onClick={() => {
                        // For fixed-size formats at/over capacity, don't add directly
                        const mainCount = deck.cards
                          .filter((c) => c.board === 'main')
                          .reduce((sum, c) => sum + c.quantity, 0);
                        const targetSize = DEFAULT_DECK_SIZE[deck.format || ''] || DEFAULT_DECK_SIZE.default;
                        const deckAtCapacity = isCommanderFormat && mainCount >= targetSize - (deck.cards.some((c) => c.board === 'commander') ? 1 : 0);

                        if (deckAtCapacity) {
                          // Add as a proposed swap — auto-pair with lowest priority card
                          const isAlreadyProposed = proposedChanges.some(
                            (c) => c.action === 'add' && c.cardName === s.card.name
                          );
                          if (!isAlreadyProposed) {
                            setProposedChanges((prev) => [
                              ...prev,
                              {
                                action: 'add' as const,
                                cardId: s.card.id,
                                cardName: s.card.name,
                                quantity: 1,
                                reason: s.reason,
                                winRate: s.winRate,
                                imageUri: s.card.image_uri_small || undefined,
                                selected: true,
                              },
                            ]);
                          }
                        } else {
                          addCardToDeck(s.card);
                        }
                      }}
                      className="group shrink-0 rounded-xl border border-border bg-card p-2 text-left transition-all hover:border-primary/40 hover:shadow"
                      style={{ width: 140 }}
                    >
                      {s.card.image_uri_small && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.card.image_uri_small}
                          alt={s.card.name}
                          className="mb-1 h-20 w-full rounded-lg object-cover"
                        />
                      )}
                      <div className="truncate text-[10px] font-medium">
                        {s.card.name}
                      </div>
                      <div className="flex items-center gap-1">
                        {s.winRate !== undefined && (
                          <span className={cn(
                            'shrink-0 text-[9px] font-bold',
                            s.winRate >= 55 ? 'text-green-400' : s.winRate <= 40 ? 'text-red-400' : 'text-muted-foreground'
                          )}>
                            {s.winRate}% WR
                          </span>
                        )}
                        {s.edhrecRank !== undefined && s.edhrecRank < 5000 && (
                          <span className="shrink-0 text-[9px] text-muted-foreground">
                            #{s.edhrecRank}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[9px] text-muted-foreground">
                        {s.reason}
                      </div>
                      <div className="mt-1 text-[9px] text-primary opacity-0 group-hover:opacity-100">
                        {isCommanderFormat ? '+ Swap in' : '+ Add to deck'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Proposed Changes (cuts + adds) */}
            {proposedChanges.length > 0 && (
              <div className="shrink-0 border-b border-border px-3 pb-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium">Proposed Changes</span>
                  <span className="text-[10px] text-muted-foreground">
                    {proposedChanges.filter((c) => c.selected).length}/{proposedChanges.length} selected
                  </span>
                  <button
                    onClick={applySelectedChanges}
                    disabled={applyingChanges || proposedChanges.filter((c) => c.selected).length === 0}
                    className="ml-auto rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {applyingChanges ? 'Applying...' : 'Apply Selected'}
                  </button>
                  <button
                    onClick={() => setProposedChanges([])}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="space-y-1">
                  {proposedChanges.map((change, i) => (
                    <label
                      key={`${change.action}-${change.cardId}`}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50',
                        change.selected && 'bg-accent/30'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={change.selected}
                        onChange={() => {
                          setProposedChanges((prev) =>
                            prev.map((c, j) => j === i ? { ...c, selected: !c.selected } : c)
                          );
                        }}
                        className="h-3 w-3 rounded border-border"
                      />
                      <span className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold',
                        change.action === 'cut'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      )}>
                        {change.action === 'cut' ? 'CUT' : 'ADD'}
                      </span>
                      <span className="flex-1 truncate text-xs">{change.cardName}</span>
                      {change.winRate !== undefined && (
                        <span className={cn(
                          'text-[10px]',
                          change.winRate >= 55 ? 'text-green-400' : change.winRate <= 40 ? 'text-red-400' : 'text-muted-foreground'
                        )}>
                          {change.winRate}%
                        </span>
                      )}
                      <span className="max-w-[120px] truncate text-[9px] text-muted-foreground">
                        {change.reason}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-3">
              <CardGrid
                cards={filteredSearchResults}
                loading={searchLoading}
                size="small"
                onCardClick={(card) => setSelectedCard(card)}
                onAddCard={(card) => addCardToDeck(card)}
                onCardZoom={handleCardZoom}
                showQuantity={(card) => {
                  const entry = deck.cards.find(
                    (c) => (c.card_id || c.id) === card.id
                  );
                  return entry ? entry.quantity : 0;
                }}
                emptyMessage={
                  searchQuery
                    ? hasActiveFilters
                      ? 'No cards match your filters. Try adjusting or clearing them.'
                      : 'No cards found. Try a different search.'
                    : 'Search for cards to add to your deck'
                }
              />

              {searchResults.length > 0 &&
                searchResults.length < searchTotal && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={loadMoreResults}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
                    >
                      Load more ({searchTotal - searchResults.length} remaining)
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Right panel: Deck contents */}
          <div
            className={cn(
              'flex flex-col',
              'lg:flex lg:w-[40%]',
              activePanel === 'deck' ? 'flex w-full' : 'hidden'
            )}
          >
            <div className="flex-1 overflow-auto p-3">
              {/* AI Build Explanation Panel */}
              {showExplanation && explanation && (
                <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-slide-up">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">AI Build Strategy</span>
                    </div>
                    <button
                      onClick={() => setShowExplanation(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>

                  <p className="mb-2 text-xs text-foreground/80">{explanation.strategy}</p>

                  {explanation.themes && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {explanation.themes.split(', ').map((t) => (
                        <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Role breakdown */}
                  <div className="space-y-1.5">
                    {Object.entries(explanation.roleBreakdown).map(([role, cards]) => (
                      <details key={role} className="group">
                        <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground">
                          <span className="transition-transform group-open:rotate-90">&#9654;</span>
                          {role} ({cards.length})
                        </summary>
                        <div className="ml-4 mt-1 space-y-0.5">
                          {cards.map((cardName) => (
                            <div key={cardName} className="flex items-start gap-1 text-[10px]">
                              <span className="text-foreground/80">{cardName}</span>
                              {explanation.cardReasons[cardName] && (
                                <span className="text-muted-foreground">
                                  — {explanation.cardReasons[cardName]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[9px] text-muted-foreground">
                    <span>Model: {explanation.modelUsed?.split('-').slice(0, 2).join(' ')}</span>
                    <span>Built in {((explanation.buildTimeMs || 0) / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              )}

              <DeckStats
                cards={deckEntries.map((e) => ({
                  quantity: e.quantity,
                  card: e.card,
                  board: e.board,
                }))}
                format={deck.format}
                className="mb-3 rounded-xl border border-border bg-card p-3"
              />

              <DeckValidation
                cards={deckEntries.map((e) => ({
                  card_id: e.card_id,
                  quantity: e.quantity,
                  board: e.board,
                  card: e.card,
                }))}
                format={deck.format}
                className="mb-4"
              />

              <MatchLogPanel
                deckId={deckId}
                format={deck.format}
                className="mb-4"
              />

              <DeckList
                cards={deckEntries.map((e) => ({
                  card_id: e.card_id,
                  quantity: e.quantity,
                  board: e.board,
                  card: e.card,
                }))}
                deckId={deckId}
                onQuantityChange={setQuantity}
                onRemove={removeCardFromDeck}
                onSetCommander={setAsCommander}
                onSetCoverCard={setCoverCard}
                onCardZoom={handleCardZoom}
                isCommanderFormat={isCommanderFormat}
              />
            </div>
          </div>
        </div>
      </div>

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        deckId={deckId}
        deckName={deck.name}
        onSuccess={() => {
          // Reload deck after import
          fetch(`/api/decks/${deckId}`)
            .then((r) => r.json())
            .then((data) => { if (data.deck) setDeck(data.deck); });
        }}
      />

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        deckName={deck.name}
        cards={deckEntries}
      />

      <PlaytestModal
        open={showPlaytest}
        onClose={() => setShowPlaytest(false)}
        cards={deckEntries.map((e) => ({
          card_id: e.card_id,
          quantity: e.quantity,
          board: e.board,
          card: e.card,
        }))}
        deckName={deck.name}
      />

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onAddToDeck={(card) => {
          addCardToDeck(card);
          setSelectedCard(null);
        }}
      />

      <AIChatPanel
        deckId={deckId}
        onApplyActions={handleChatApply}
      />

      <VersionHistoryPanel
        deckId={deckId}
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={() => {
          // Reload deck after restoring a version
          fetch(`/api/decks/${deckId}`)
            .then(r => r.json())
            .then(data => { if (data.deck) setDeck(data.deck); });
        }}
      />

      <CardZoomOverlay
        card={zoomedCard}
        position={zoomPosition}
        onClose={closeZoom}
      />
    </>
  );
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275z" />
    </svg>
  );
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5,3 19,12 5,21 5,3" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
