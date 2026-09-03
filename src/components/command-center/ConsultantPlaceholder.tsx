'use client';

import { cn } from '@/lib/utils';
import type { DbCard, AISuggestion } from '@/lib/types';
import type { DeckData } from '@/hooks/use-deck-editor';
import { SparklesIcon } from './icons';

export interface ProposedChange {
  action: 'cut' | 'add';
  cardId: string;
  cardName: string;
  quantity: number;
  reason: string;
  winRate?: number;
  imageUri?: string;
  selected: boolean;
}

interface ConsultantPlaceholderProps {
  deck: DeckData;
  isCommanderFormat: boolean;
  suggestions: AISuggestion[];
  suggestionsSource: 'rules' | 'ollama' | 'synergy' | 'openai';
  proposedChanges: ProposedChange[];
  applyingChanges: boolean;
  onDismissSuggestions: () => void;
  onDismissProposedChanges: () => void;
  onToggleProposedChange: (index: number) => void;
  onApplySelectedChanges: () => void;
  onSuggestionClick: (suggestion: AISuggestion) => void;
  onSelectCard: (card: DbCard) => void;
}

// Left rail: AI Suggestions strip + Proposed Changes review — unchanged behaviour, lifted
// verbatim out of the old page.tsx two-pane layout.
export function ConsultantPlaceholder({
  deck,
  isCommanderFormat,
  suggestions,
  suggestionsSource,
  proposedChanges,
  applyingChanges,
  onDismissSuggestions,
  onDismissProposedChanges,
  onToggleProposedChange,
  onApplySelectedChanges,
  onSuggestionClick,
  onSelectCard,
}: ConsultantPlaceholderProps) {
  if (suggestions.length === 0 && proposedChanges.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        Click &quot;AI Suggest&quot; in the header to get card recommendations for this deck.
      </div>
    );
  }

  return (
    <div className="hud-panel">
      {suggestions.length > 0 && (
        <div className="border-b border-border px-3 pb-3 pt-3">
          <div className="mb-2 flex items-center gap-2">
            <SparklesIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">
              AI Suggestions
              <span className="ml-1 text-muted-foreground">
                (via {suggestionsSource === 'ollama' ? 'Ollama' : suggestionsSource === 'openai' ? 'GPT' : suggestionsSource === 'synergy' ? 'synergy engine' : 'rules engine'})
              </span>
            </span>
            <button onClick={onDismissSuggestions} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s.card.id}
                onClick={() => onSuggestionClick(s)}
                className="group flex items-center gap-2 rounded-xl border border-border bg-card p-2 text-left transition-all hover:border-primary/40 hover:shadow"
              >
                {s.card.image_uri_small && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.card.image_uri_small}
                    alt={s.card.name}
                    title="Click for card details"
                    className="h-14 w-10 shrink-0 cursor-zoom-in rounded-md object-cover"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCard(s.card);
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-medium">{s.card.name}</div>
                  <div className="flex items-center gap-1">
                    {s.winRate !== undefined && (
                      <span className={cn('shrink-0 text-[9px] font-bold', s.winRate >= 55 ? 'text-green-400' : s.winRate <= 40 ? 'text-red-400' : 'text-muted-foreground')}>
                        {s.winRate}% WR
                      </span>
                    )}
                    {s.edhrecRank !== undefined && s.edhrecRank < 5000 && (
                      <span className="shrink-0 text-[9px] text-muted-foreground">#{s.edhrecRank}</span>
                    )}
                  </div>
                  <div className="truncate text-[9px] text-muted-foreground">{s.reason}</div>
                  <div className="text-[9px] text-primary opacity-0 group-hover:opacity-100">
                    {isCommanderFormat ? '+ Swap in' : '+ Add to deck'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {proposedChanges.length > 0 && (
        <div className="px-3 pb-3 pt-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium">Proposed Changes</span>
            <span className="text-[10px] text-muted-foreground">
              {proposedChanges.filter((c) => c.selected).length}/{proposedChanges.length} selected
            </span>
            <button
              onClick={onApplySelectedChanges}
              disabled={applyingChanges || proposedChanges.filter((c) => c.selected).length === 0}
              className="ml-auto rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {applyingChanges ? 'Applying...' : 'Apply Selected'}
            </button>
            <button onClick={onDismissProposedChanges} className="text-[10px] text-muted-foreground hover:text-foreground">
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
                  onChange={() => onToggleProposedChange(i)}
                  className="h-3 w-3 rounded border-border"
                />
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', change.action === 'cut' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400')}>
                  {change.action === 'cut' ? 'CUT' : 'ADD'}
                </span>
                <button
                  type="button"
                  title="Card details"
                  className="flex-1 truncate text-left text-xs hover:text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const card =
                      deck.cards.find((c) => c.card_id === change.cardId) ??
                      suggestions.find((s) => s.card.id === change.cardId)?.card;
                    if (card) onSelectCard(card);
                  }}
                >
                  {change.cardName}
                </button>
                {change.winRate !== undefined && (
                  <span className={cn('text-[10px]', change.winRate >= 55 ? 'text-green-400' : change.winRate <= 40 ? 'text-red-400' : 'text-muted-foreground')}>
                    {change.winRate}%
                  </span>
                )}
                <span className="max-w-[120px] truncate text-[9px] text-muted-foreground">{change.reason}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
