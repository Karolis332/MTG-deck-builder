'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import { SOURCE_LABEL } from '@/lib/suggestion-sources';
import { toast } from '@/hooks/use-toast';
import { SuggestionCard, buildApplyPayload, buildDismissPayload } from './SuggestionCard';
import type { ModelSuggestion, ProposedChange, SuggestResponse } from './types';

const DEBOUNCE_MS = 800;

/**
 * Pure helper — true when the trained model (CF API) was attempted but the
 * response fell back to another engine, or the feed fetch itself failed.
 * Formats where CF is never tried (non-commander) are not "unreachable".
 */
export function isModelUnreachable(data: Pick<SuggestResponse, 'source' | 'sources_tried'> | null, fetchFailed: boolean): boolean {
  if (fetchFailed) return true;
  if (!data) return false;
  return data.sources_tried.includes('collaborative-filtering') && data.source !== 'collaborative-filtering';
}

export interface ModelFeedHotkeyControls {
  applyAll: () => void;
  dismissTop: () => void;
}

interface ModelFeedProps {
  deckId: number;
  collectionOnly: boolean;
  onDeckChanged?: number;
  onOpenCard: (card: DbCard) => void;
  onApplyChanges: (
    changes: ProposedChange[],
    meta: { impressionId?: string; candidatesShown: string[] }
  ) => Promise<boolean>;
  onSuggestionApplied?: (cardName: string, source: string) => void;
  onSuggestionDismissed?: (cardName: string) => void;
  /** `undo` from the deck editor — attached as the toast's Undo action on a single apply. */
  onUndo?: () => void;
  /** Imperative escape hatch for the `A` / `D` hotkeys. */
  hotkeyRef?: { current: ModelFeedHotkeyControls | null };
}

const toneClass: Record<string, string> = {
  model: 'bg-primary/15 text-primary',
  llm: 'bg-violet-500/15 text-violet-400',
  rules: 'bg-muted text-muted-foreground',
};

export function ModelFeed({
  deckId,
  collectionOnly,
  onDeckChanged,
  onOpenCard,
  onApplyChanges,
  onSuggestionApplied,
  onSuggestionDismissed,
  onUndo,
  hotkeyRef,
}: ModelFeedProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingAll, setApplyingAll] = useState(false);
  const [flash, setFlash] = useState(false);

  const fetchFeed = useRef<() => void>(() => {});
  fetchFeed.current = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: deckId, collection_only: collectionOnly, mode: 'passive', limit: 8 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load suggestions');
      setData(json);
      setDismissedIds(new Set());
      setAppliedIds(new Set());
    } catch {
      setError('Could not reach the suggestion engine.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchFeed.current(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, collectionOnly, onDeckChanged]);

  const suggestions = (data?.suggestions ?? []).filter((s) => !dismissedIds.has(s.card.id));

  const handleApply = async (s: ModelSuggestion, opts?: { silent?: boolean }) => {
    if (!data) return;
    setApplyingId(s.card.id);
    const { changes, candidatesShown } = buildApplyPayload(s, data.proposedChanges);
    const ok = await onApplyChanges(changes as ProposedChange[], {
      impressionId: data.impression_id,
      candidatesShown,
    });
    setApplyingId(null);
    if (ok) {
      setAppliedIds((prev) => new Set(prev).add(s.card.id));
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
      onSuggestionApplied?.(s.card.name, data.source);
      if (!opts?.silent) {
        toast({
          title: `Added ${s.card.name}`,
          action: onUndo ? { label: 'Undo', onClick: onUndo } : undefined,
        });
      }
    }
  };

  const handleApplyAll = async () => {
    if (!data) return;
    setApplyingAll(true);
    let count = 0;
    for (const s of suggestions) {
      if (appliedIds.has(s.card.id)) continue;
      // eslint-disable-next-line no-await-in-loop
      await handleApply(s, { silent: true });
      count += 1;
    }
    setApplyingAll(false);
    if (count > 0) toast({ title: `Applied ${count} suggestion${count === 1 ? '' : 's'}` });
  };

  const handleDismiss = async (s: ModelSuggestion) => {
    setDismissedIds((prev) => new Set(prev).add(s.card.id));
    if (!data) return;
    const payload = buildDismissPayload(
      s,
      deckId,
      data.impression_id,
      data.suggestions.map((x) => x.card.name)
    );
    fetch('/api/ai-suggest/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    onSuggestionDismissed?.(s.card.name);
    toast({ title: `Dismissed ${s.card.name}` });
  };

  if (hotkeyRef) {
    hotkeyRef.current = {
      applyAll: handleApplyAll,
      dismissTop: () => {
        const top = suggestions[0];
        if (top && !appliedIds.has(top.card.id)) handleDismiss(top);
      },
    };
  }

  return (
    <section className="hud-panel border-b border-border/60">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn('flex w-full items-center gap-2 px-3 py-2.5 text-left', loading && !data && 'animate-pulse-glow')}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">Model feed</span>
        {data && (
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold', toneClass[SOURCE_LABEL[data.source]?.tone ?? 'rules'])}>
            {SOURCE_LABEL[data.source]?.short ?? data.source}
          </span>
        )}
        {data && (
          <span className="hud-number truncate text-[9px] text-muted-foreground" title={`impression ${data.impression_id}`}>
            {data.suggestions.length} shown · {appliedIds.size} applied · {dismissedIds.size} dismissed
          </span>
        )}
        {loading && <span className="text-[9px] text-muted-foreground">refreshing…</span>}
        <span className="ml-auto text-muted-foreground">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3">
          {!loading && isModelUnreachable(data, error != null) && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
              <span className="flex-1 truncate">Trained model unreachable — rules fallback</span>
              <button
                onClick={() => fetchFeed.current()}
                className="shrink-0 rounded px-1.5 py-0.5 font-medium hover:bg-amber-500/20"
              >
                Retry
              </button>
            </div>
          )}

          {data && data.sources_tried.length > 1 && (
            <div className="mb-2 text-[9px] text-muted-foreground">
              sources tried: {data.sources_tried.join(' → ')}
            </div>
          )}

          {loading && !data && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-14 w-full rounded-lg" />
              ))}
            </div>
          )}


          {!loading && data && suggestions.length === 0 && (
            <div className="text-xs text-muted-foreground">No suggestions right now.</div>
          )}

          {suggestions.length > 0 && (
            <>
              <div className={cn('space-y-2 transition-opacity', flash && 'opacity-90')}>
                {suggestions.map((s) => (
                  <SuggestionCard
                    key={s.card.id}
                    suggestion={s}
                    proposedChanges={data!.proposedChanges}
                    applying={applyingId === s.card.id || applyingAll}
                    applied={appliedIds.has(s.card.id)}
                    onOpenCard={onOpenCard}
                    onApply={() => handleApply(s)}
                    onDismiss={() => handleDismiss(s)}
                  />
                ))}
              </div>
              <button
                onClick={handleApplyAll}
                disabled={applyingAll || suggestions.every((s) => appliedIds.has(s.card.id))}
                className="mt-2 w-full rounded-lg bg-accent py-1.5 text-xs font-medium transition-colors hover:bg-accent/70 disabled:opacity-50"
              >
                {applyingAll ? 'Applying all…' : 'Apply all'}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
