'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { DbCard, DeckCardEntry, AISuggestion } from '@/lib/types';
import { useDeckEditor } from '@/hooks/use-deck-editor';
import { CommandCenterLayout } from '@/components/command-center/CommandCenterLayout';
import { ConsultantPlaceholder, type ProposedChange } from '@/components/command-center/ConsultantPlaceholder';
import { DeckWorkspace } from '@/components/command-center/DeckWorkspace';
import { AnalysisRail, type BuildExplanation, type ComboEntry } from '@/components/command-center/AnalysisRail';
import { DeckEditorHeader } from '@/components/command-center/DeckEditorHeader';
import { Spinner } from '@/components/command-center/icons';
import { ExportDialog } from '@/components/export-dialog';
import { PlaytestModal } from '@/components/playtest-modal';
import { CardDetailModal } from '@/components/card-detail-modal';
import { AIChatPanel } from '@/components/ai-chat-panel';
import { ImportDialog } from '@/components/import-dialog';
import { VersionHistoryPanel } from '@/components/version-history-panel';
import { CardZoomOverlay } from '@/components/card-zoom-overlay';
import { DeckDndContext } from '@/components/deck-dnd-context';
import { COMMANDER_FORMATS, DEFAULT_DECK_SIZE } from '@/lib/constants';

export default function DeckEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = Number(params.id);

  const deckEditor = useDeckEditor(deckId);
  const { deck, loading, saving, refetch, addCard, removeCard, setQuantity, moveCard, undo, redo, canUndo, canRedo } = deckEditor;

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
  const [showExport, setShowExport] = useState(false);
  const [showPlaytest, setShowPlaytest] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DbCard | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [deckName, setDeckName] = useState('');

  // Combo state
  const [showCombos, setShowCombos] = useState(false);
  const [combosLoading, setCombosLoading] = useState(false);
  const [includedCombos, setIncludedCombos] = useState<ComboEntry[]>([]);
  const [almostIncludedCombos, setAlmostIncludedCombos] = useState<ComboEntry[]>([]);

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
  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([]);
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [collectionOnly, setCollectionOnly] = useState(true);

  // ML state
  const [mlReady, setMlReady] = useState(false);
  const [mlGames, setMlGames] = useState(0);

  const isCommanderFormat = COMMANDER_FORMATS.includes(
    (deck?.format || '') as typeof COMMANDER_FORMATS[number]
  );

  const deckDisplayName = deck?.name;
  useEffect(() => {
    if (deckDisplayName) setDeckName(deckDisplayName);
  }, [deckDisplayName]);

  // Derive color identity from commander for search filtering
  const deckColorIdentity = useMemo(() => {
    if (!isCommanderFormat || !deck) return undefined;
    const commander = deck.cards.find((c) => c.board === 'commander');
    if (!commander) return undefined;
    try {
      const ci: string[] = commander.color_identity ? JSON.parse(commander.color_identity) : [];
      return ci.length > 0 ? ci : undefined;
    } catch {
      return undefined;
    }
  }, [isCommanderFormat, deck]);

  // Check ML readiness
  useEffect(() => {
    if (!deckId) return;
    fetch(`/api/ai-suggest/ml-check?deck_id=${deckId}`)
      .then((r) => r.json())
      .then((data) => {
        setMlReady(data.hasEnoughData || false);
        setMlGames(data.gamesPlayed || 0);
      })
      .catch(() => {});
  }, [deckId]);

  // Fetch cached combos for commander/brawl decks
  const fetchCombos = useCallback(async (forceRefresh = false) => {
    if (!deckId) return;
    setCombosLoading(true);
    try {
      const url = forceRefresh ? '/api/deck-combos' : `/api/deck-combos?deckId=${deckId}`;
      const opts = forceRefresh
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deckId }) }
        : {};
      const res = await fetch(url, opts);
      const data = await res.json();
      setIncludedCombos(data.included || []);
      setAlmostIncludedCombos(data.almostIncluded || []);
    } catch {}
    finally { setCombosLoading(false); }
  }, [deckId]);

  useEffect(() => {
    if (!deckId || !isCommanderFormat) return;
    fetchCombos();
  }, [deckId, isCommanderFormat, fetchCombos]);

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
        const params = new URLSearchParams({ q: query, page: '1', limit: '100' });
        if (deck?.format) params.set('format', deck.format);
        if (collectionOnly) params.set('collectionOnly', 'true');
        if (deckColorIdentity) params.set('colors', deckColorIdentity.join(','));
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
    [deck?.format, collectionOnly, deckColorIdentity]
  );

  // Re-search when collectionOnly toggles (if there's an active query or results)
  useEffect(() => {
    if (searchQuery || searchResults.length > 0) {
      handleSearch(searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionOnly]);

  const loadMoreResults = async () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);

    try {
      const params = new URLSearchParams({ q: searchQuery, page: String(nextPage), limit: '20' });
      if (deck?.format) params.set('format', deck.format);
      if (collectionOnly) params.set('collectionOnly', 'true');
      if (deckColorIdentity) params.set('colors', deckColorIdentity.join(','));
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
      cards = cards.filter((c) => filterTypes.some((ft) => c.type_line.includes(ft)));
    }

    return cards;
  }, [searchResults, filterManaValues, filterColors, filterTypes]);

  const handleCardZoom = useCallback((card: DbCard, position: { x: number; y: number }) => {
    setZoomedCard(card);
    setZoomPosition(position);
  }, []);

  const closeZoom = useCallback(() => setZoomedCard(null), []);

  const setAsCommander = (cardId: string) => moveCard(cardId, 'main', 'commander');

  const setCoverCard = async (cardId: string) => {
    try {
      await fetch(`/api/decks/${deckId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_card_id: cardId }),
      });
      await refetch();
    } catch {}
  };

  // Apply actions from AI chat panel
  const handleChatApply = async (
    actions: Array<{ action: 'cut' | 'add'; cardId: string; cardName: string; quantity: number; reason: string; imageUri?: string }>
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/ai-suggest/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deckId,
          changes: actions.map((a) => ({ action: a.action, cardId: a.cardId, cardName: a.cardName, quantity: a.quantity })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await refetch();
        if (data.warnings) alert(data.warnings);
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

  const updateDeckMeta = async (updates: { name?: string; format?: string }) => {
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.deck) {
        await refetch();
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

      if (data.proposedChanges?.length) {
        setProposedChanges(data.proposedChanges.map((c: Record<string, unknown>) => ({ ...c, selected: true })));
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
          changes: selected.map((c) => ({ action: c.action, cardId: c.cardId, cardName: c.cardName, quantity: c.quantity })),
          candidatesShown: proposedChanges.map((c) => c.cardName),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await refetch();
        setProposedChanges([]);
        setSuggestions([]);
      } else if (data.error) {
        alert(data.error);
      }
    } catch {} finally {
      setApplyingChanges(false);
    }
  };

  const handleSuggestionClick = (s: AISuggestion) => {
    if (!deck) return;
    const mainCount = deck.cards.filter((c) => c.board === 'main').reduce((sum, c) => sum + c.quantity, 0);
    const targetSize = DEFAULT_DECK_SIZE[deck.format || ''] || DEFAULT_DECK_SIZE.default;
    const deckAtCapacity = isCommanderFormat && mainCount >= targetSize - (deck.cards.some((c) => c.board === 'commander') ? 1 : 0);

    if (deckAtCapacity) {
      const isAlreadyProposed = proposedChanges.some((c) => c.action === 'add' && c.cardName === s.card.name);
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
      addCard(s.card);
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
          <button onClick={() => router.push('/deck-builder')} className="text-sm text-primary hover:underline">
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

  return (
    <DeckDndContext onAddCard={addCard} onMoveCard={moveCard} onRemoveCard={removeCard}>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col hud-grid-bg">
        <DeckEditorHeader
          deck={deck}
          mainCount={mainCount}
          saving={saving}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          hasExplanation={hasExplanation}
          showExplanation={showExplanation}
          onToggleExplanation={() => setShowExplanation((v) => !v)}
          editingName={editingName}
          deckName={deckName}
          onDeckNameChange={setDeckName}
          onStartEditingName={() => setEditingName(true)}
          onCommitName={() => {
            setEditingName(false);
            if (deckName.trim() && deckName !== deck.name) updateDeckMeta({ name: deckName.trim() });
          }}
          onFormatChange={(format) => updateDeckMeta({ format })}
          onBack={() => router.push('/deck-builder')}
          onShowVersionHistory={() => setShowVersionHistory(true)}
          collectionOnly={collectionOnly}
          onToggleCollectionOnly={() => setCollectionOnly((v) => !v)}
          suggestionsLoading={suggestionsLoading}
          onGetSuggestions={getSuggestions}
          mlReady={mlReady}
          mlGames={mlGames}
          onShowPlaytest={() => setShowPlaytest(true)}
          onBuildFromCollection={async () => {
            if (!confirm("Build a new deck from your collection using this deck's format and commander?")) return;
            try {
              const commander = deck.cards.find((c) => c.board === 'commander');
              const res = await fetch('/api/decks/auto-build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: `${deck.name} (Collection)`,
                  format: deck.format,
                  colors: deckColorIdentity || [],
                  useCollection: true,
                  commanderName: commander?.name,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Build failed');
              router.push(`/deck/${data.deckId}`);
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Build failed');
            }
          }}
          onShowImport={() => setShowImport(true)}
          onShowExport={() => setShowExport(true)}
        />

        <CommandCenterLayout
          leftTitle="Consultant"
          rightTitle="Analysis"
          left={
            <ConsultantPlaceholder
              deck={deck}
              isCommanderFormat={isCommanderFormat}
              suggestions={suggestions}
              suggestionsSource={suggestionsSource}
              proposedChanges={proposedChanges}
              applyingChanges={applyingChanges}
              onDismissSuggestions={() => setSuggestions([])}
              onDismissProposedChanges={() => setProposedChanges([])}
              onToggleProposedChange={(i) => setProposedChanges((prev) => prev.map((c, j) => (j === i ? { ...c, selected: !c.selected } : c)))}
              onApplySelectedChanges={applySelectedChanges}
              onSuggestionClick={handleSuggestionClick}
              onSelectCard={setSelectedCard}
            />
          }
          center={
            <DeckWorkspace
              deck={deck}
              deckId={deckId}
              mainCount={mainCount}
              isCommanderFormat={isCommanderFormat}
              searchResults={filteredSearchResults}
              searchTotal={searchTotal}
              searchLoading={searchLoading}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onLoadMore={loadMoreResults}
              filterManaValues={filterManaValues}
              filterColors={filterColors}
              filterTypes={filterTypes}
              setFilterManaValues={setFilterManaValues}
              setFilterColors={setFilterColors}
              setFilterTypes={setFilterTypes}
              onClearFilters={() => {
                setFilterManaValues([]);
                setFilterColors([]);
                setFilterTypes([]);
              }}
              onCardClick={setSelectedCard}
              onAddCard={(card) => addCard(card)}
              onCardZoom={handleCardZoom}
              onQuantityChange={setQuantity}
              onRemove={removeCard}
              onSetCommander={setAsCommander}
              onSetCoverCard={setCoverCard}
            />
          }
          right={
            <AnalysisRail
              deck={deck}
              deckId={deckId}
              deckEntries={deckEntries}
              isCommanderFormat={isCommanderFormat}
              showExplanation={showExplanation}
              explanation={explanation}
              onDismissExplanation={() => setShowExplanation(false)}
              showCombos={showCombos}
              onToggleCombos={() => setShowCombos((v) => !v)}
              combosLoading={combosLoading}
              includedCombos={includedCombos}
              almostIncludedCombos={almostIncludedCombos}
              onRescanCombos={() => fetchCombos(true)}
            />
          }
        />
      </div>

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        deckId={deckId}
        deckName={deck.name}
        onSuccess={() => refetch()}
      />

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} deckName={deck.name} cards={deckEntries} />

      <PlaytestModal
        open={showPlaytest}
        onClose={() => setShowPlaytest(false)}
        cards={deckEntries.map((e) => ({ card_id: e.card_id, quantity: e.quantity, board: e.board, card: e.card }))}
        deckName={deck.name}
      />

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onAddToDeck={(card) => {
          addCard(card);
          setSelectedCard(null);
        }}
      />

      <AIChatPanel deckId={deckId} onApplyActions={handleChatApply} />

      <VersionHistoryPanel
        deckId={deckId}
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={() => refetch()}
      />

      <CardZoomOverlay card={zoomedCard} position={zoomPosition} onClose={closeZoom} />
    </DeckDndContext>
  );
}
