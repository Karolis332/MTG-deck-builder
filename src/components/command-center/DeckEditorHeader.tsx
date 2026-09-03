'use client';

import { cn } from '@/lib/utils';
import type { DeckData } from '@/hooks/use-deck-editor';
import { FORMAT_LABELS, FORMATS } from '@/lib/constants';
import {
  ArrowLeftIcon,
  SparklesIcon,
  ImportIcon,
  ExportIcon,
  PlayIcon,
  HistoryIcon,
  CollectionBuildIcon,
  UndoIcon,
  RedoIcon,
} from './icons';

interface DeckEditorHeaderProps {
  deck: DeckData;
  mainCount: number;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasExplanation: boolean;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  editingName: boolean;
  deckName: string;
  onDeckNameChange: (v: string) => void;
  onStartEditingName: () => void;
  onCommitName: () => void;
  onFormatChange: (format: string) => void;
  onBack: () => void;
  onShowVersionHistory: () => void;
  collectionOnly: boolean;
  onToggleCollectionOnly: () => void;
  onShowPlaytest: () => void;
  onBuildFromCollection: () => void;
  onShowImport: () => void;
  onShowExport: () => void;
}

// Deck editor top bar: name/format, undo/redo, and the action buttons — unchanged
// behaviour, lifted verbatim out of the old page.tsx.
export function DeckEditorHeader({
  deck,
  mainCount,
  saving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasExplanation,
  showExplanation,
  onToggleExplanation,
  editingName,
  deckName,
  onDeckNameChange,
  onStartEditingName,
  onCommitName,
  onFormatChange,
  onBack,
  onShowVersionHistory,
  collectionOnly,
  onToggleCollectionOnly,
  onShowPlaytest,
  onBuildFromCollection,
  onShowImport,
  onShowExport,
}: DeckEditorHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border bg-card/50 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>

          {editingName ? (
            <input
              type="text"
              value={deckName}
              onChange={(e) => onDeckNameChange(e.target.value)}
              onBlur={onCommitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              autoFocus
              className="border-b border-primary bg-transparent text-lg font-bold outline-none"
            />
          ) : (
            <h1 onClick={onStartEditingName} className="cursor-pointer text-lg font-bold hover:text-primary" title="Click to rename">
              {deck.name}
            </h1>
          )}

          <select
            value={deck.format || 'standard'}
            onChange={(e) => onFormatChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>

          <span className="hud-number text-xs text-muted-foreground">
            {mainCount} cards
            {saving && ' (saving...)'}
          </span>

          <div className="flex items-center gap-0.5">
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30">
              <UndoIcon className="h-3.5 w-3.5" />
            </button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30">
              <RedoIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {hasExplanation && (
            <button
              onClick={onToggleExplanation}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                showExplanation ? 'bg-primary/20 text-primary' : 'bg-accent text-accent-foreground hover:bg-accent/80'
              )}
              title="Toggle AI build explanation"
            >
              <SparklesIcon className="h-3 w-3" />
              AI
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowVersionHistory}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
            title="Version history"
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            History
          </button>

          <label className="flex cursor-pointer items-center gap-1.5" title="When on, search and AI only show cards you own">
            <span className="text-[10px] text-muted-foreground">{collectionOnly ? 'My cards' : 'All cards'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={collectionOnly}
              onClick={onToggleCollectionOnly}
              className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', collectionOnly ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', collectionOnly ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
            </button>
          </label>

          <button
            onClick={onShowPlaytest}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
          >
            <PlayIcon className="h-3.5 w-3.5" />
            Playtest
          </button>
          <button
            onClick={onBuildFromCollection}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
            title="Build a new deck using only cards from your collection"
          >
            <CollectionBuildIcon className="h-3.5 w-3.5" />
            From Collection
          </button>
          <button
            onClick={onShowImport}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ImportIcon className="h-3.5 w-3.5" />
            Import
          </button>
          <button
            onClick={onShowExport}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExportIcon className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
