'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type { DbCard, DeckCardEntry, DeckPatchOp } from '@/lib/types';
import { useDeckEditor } from '@/hooks/use-deck-editor';
import { toast } from '@/hooks/use-toast';
import { useCommandCenterHotkeys } from '@/hooks/use-command-center-hotkeys';
import { CommandCenterLayout, type CommandCenterPaneControls } from '@/components/command-center/CommandCenterLayout';
import { ConsultantPane } from '@/components/command-center/ConsultantPane';
import type { ModelFeedHotkeyControls } from '@/components/command-center/consultant/ModelFeed';
import type { ProposedChange } from '@/components/command-center/consultant/types';
import { DeckWorkspace } from '@/components/command-center/DeckWorkspace';
import { AnalysisRail, type BuildExplanation, type ComboEntry } from '@/components/command-center/AnalysisRail';
import { LiveRail } from '@/components/command-center/LiveRail';
import type { AnalysisResponse } from '@/components/command-center/tiles/types';
import { DeckEditorHeader } from '@/components/command-center/DeckEditorHeader';
import { Spinner } from '@/components/command-center/icons';
import { ExportDialog } from '@/components/export-dialog';
import { PlaytestModal } from '@/components/playtest-modal';
import { CardDetailModal } from '@/components/card-detail-modal';
import { ImportDialog } from '@/components/import-dialog';
import { VersionHistoryPanel } from '@/components/version-history-panel';
import { CardZoomOverlay } from '@/components/card-zoom-overlay';
import { DeckDndContext } from '@/components/deck-dnd-context';
import { ToastHost } from '@/components/toast-host';
import { COMMANDER_FORMATS } from '@/lib/constants';

const HOTKEYS: Array<[string, string]> = [
  ['/', 'Focus search'],
  ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo'],
  ['A', 'Apply all suggestions'],
  ['D', 'Dismiss top suggestion'],
  ['Esc', 'Close popout / zoom'],
  ['1-5', 'Set target bracket'],
  ['[ / ]', 'Collapse / expand panes'],
  ['?', 'Toggle this cheat sheet'],
];

export default function DeckEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = Number(params.id);

  const deckEditor = useDeckEditor(deckId);
  const { deck, loading, saving, refetch, addCard, removeCard, setQuantity, moveCard, setRole, applyOps, undo, redo, canUndo, canRedo, version: deckChangeTick } = deckEditor;

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

  // Consultant state
  const [collectionOnly, setCollectionOnly] = useState(true);
  const [consultantPrefill, setConsultantPrefill] = useState<string | undefined>(undefined);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  // Hotkeys / polish state
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const layoutControlsRef = useRef<CommandCenterPaneControls | null>(null);
  const modelFeedHotkeyRef = useRef<ModelFeedHotkeyControls | null>(null);

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

  // Fetch deck-analysis (feeds LiveRail's Score/Roles/Coverage/Curve/Synergy tiles),
  // debounced so a burst of quantity clicks doesn't fire one request per click.
  useEffect(() => {
    if (!deckId) return;
    const timer = setTimeout(() => {
      fetch(`/api/deck-analysis?deckId=${deckId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setAnalysis(data);
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [deckId, deckChangeTick]);

  // Clear the consultant prefill after the pane's ChatSection has consumed it (its effect
  // fires on the [prefill] value — resetting to undefined lets a second identical prompt re-fire it).
  useEffect(() => {
    if (!consultantPrefill) return;
    const timer = setTimeout(() => setConsultantPrefill(undefined), 0);
    return () => clearTimeout(timer);
  }, [consultantPrefill]);

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

  const updateDeckMeta = async (updates: { name?: string; format?: string; target_bracket?: number }) => {
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

  const setTargetBracket = (n: number) => {
    updateDeckMeta({ target_bracket: n });
    toast({ title: `Target bracket set to ${n}` });
  };

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    toast({ title: 'Undid last change' });
  }, [undo, canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    toast({ title: 'Redid change' });
  }, [redo, canRedo]);

  const handleSetRole = useCallback(
    async (cardId: string, board: string, role: string | null) => {
      await setRole(cardId, board, role);
      toast({ title: role ? `Role set to ${role}` : 'Role reset to auto', action: { label: 'Undo', onClick: handleUndo } });
    },
    [setRole, handleUndo]
  );

  const closeOverlay = useCallback(() => {
    if (zoomedCard) return closeZoom();
    if (selectedCard) return setSelectedCard(null);
    if (showHotkeyHelp) return setShowHotkeyHelp(false);
  }, [zoomedCard, selectedCard, showHotkeyHelp, closeZoom]);

  useCommandCenterHotkeys({
    applyAllSuggestions: () => modelFeedHotkeyRef.current?.applyAll(),
    dismissTopSuggestion: () => modelFeedHotkeyRef.current?.dismissTop(),
    closeOverlay,
    setTargetBracket,
    toggleConsultantPane: () => layoutControlsRef.current?.toggleLeft(),
    toggleAnalysisPane: () => layoutControlsRef.current?.toggleRight(),
    toggleCheatSheet: () => setShowHotkeyHelp((v) => !v),
  });

  // Consultant pane's model feed / chat both apply through this one path — POST
  // /api/ai-suggest/apply with the impression/candidate telemetry the CF bandit needs.
  const onApplyChanges = useCallback(
    async (changes: ProposedChange[], meta: { impressionId?: string; candidatesShown: string[] }): Promise<boolean> => {
      try {
        const res = await fetch('/api/ai-suggest/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deck_id: deckId,
            changes: changes.map((c) => ({ action: c.action, cardId: c.cardId, cardName: c.cardName, quantity: c.quantity })),
            candidatesShown: meta.candidatesShown,
            impression_id: meta.impressionId,
            source: 'consultant',
          }),
        });
        const data = await res.json();
        if (data.ok) {
          await refetch();
          if (data.warnings) toast({ title: data.warnings, tone: 'warn' });
          return true;
        }
        if (data.error) toast({ title: data.error, tone: 'error' });
        return false;
      } catch {
        return false;
      }
    },
    [deckId, refetch]
  );

  // "Auto all" in the role view — clears every manual role_override in one undoable batch.
  const clearAllRoleOverrides = useCallback(() => {
    if (!deck) return;
    const overridden = deck.cards.filter((c) => c.role_override);
    if (overridden.length === 0) return;
    const ops: DeckPatchOp[] = overridden.map((c) => ({ op: 'set_role', card_id: c.card_id || c.id, board: c.board, role: null }));
    applyOps(ops);
  }, [deck, applyOps]);

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
    <DeckDndContext onAddCard={addCard} onMoveCard={moveCard} onRemoveCard={removeCard} onSetRole={handleSetRole}>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col hud-grid-bg">
        <DeckEditorHeader
          deck={deck}
          mainCount={mainCount}
          saving={saving}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          targetBracket={deck.target_bracket ?? 3}
          onSetTargetBracket={setTargetBracket}
          onNavigateToDeck={(id) => router.push(`/deck/${id}`)}
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
              toast({ title: err instanceof Error ? err.message : 'Build failed', tone: 'error' });
            }
          }}
          onShowImport={() => setShowImport(true)}
          onShowExport={() => setShowExport(true)}
        />

        <CommandCenterLayout
          leftTitle="Consultant"
          rightTitle="Analysis"
          controlRef={layoutControlsRef}
          left={
            <ConsultantPane
              deckId={deckId}
              // ConsultantPane's `deck` prop is currently unused (destructured as `_deck`) —
              // DeckData is a structural subset of Deck missing a few metadata columns.
              deck={deck as unknown as import('@/lib/types').Deck}
              collectionOnly={collectionOnly}
              prefill={consultantPrefill}
              onOpenCard={setSelectedCard}
              onApplyChanges={onApplyChanges}
              onDeckChanged={deckChangeTick}
              onUndo={handleUndo}
              modelFeedHotkeyRef={modelFeedHotkeyRef}
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
              onSetRole={handleSetRole}
              onAutoAllRoles={clearAllRoleOverrides}
            />
          }
          right={
            <>
              <LiveRail
                deck={deck}
                analysis={analysis}
                onOpenCard={setSelectedCard}
                onAskConsultant={setConsultantPrefill}
                onSetTargetBracket={setTargetBracket}
              />
              <AnalysisRail
                deck={deck}
                deckId={deckId}
                onOpenCard={setSelectedCard}
                onAskConsultant={(p) => setConsultantPrefill(p)}
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
            </>
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

      <VersionHistoryPanel
        deckId={deckId}
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={() => refetch()}
      />

      <CardZoomOverlay card={zoomedCard} position={zoomPosition} onClose={closeZoom} />

      {showHotkeyHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowHotkeyHelp(false)}>
          <div className="hud-panel w-72 p-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hotkeys</h2>
            <table className="w-full text-xs">
              <tbody>
                {HOTKEYS.map(([key, label]) => (
                  <tr key={key}>
                    <td className="hud-number py-0.5 pr-3 text-primary">{key}</td>
                    <td className="py-0.5 text-muted-foreground">{label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ToastHost />
    </DeckDndContext>
  );
}
