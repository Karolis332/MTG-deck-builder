'use client';

import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import type { ModelSuggestion, ProposedChange } from './types';

/**
 * Pure helper — find the proposedChange (the paired cut, if any) that goes
 * with a model suggestion's "add", falling back to a synthesized add-only
 * change when the server didn't pair one. Exported for unit testing.
 */
export function pairedChangeFor(
  suggestion: ModelSuggestion,
  proposedChanges: ProposedChange[]
): { add: ProposedChange; cut?: ProposedChange } {
  const add =
    proposedChanges.find((c) => c.action === 'add' && c.cardId === suggestion.card.id) ?? {
      action: 'add' as const,
      cardId: suggestion.card.id,
      cardName: suggestion.card.name,
      quantity: 1,
      reason: suggestion.reason,
      imageUri: suggestion.card.image_uri_small ?? undefined,
    };
  const cut = proposedChanges.find((c) => c.action === 'cut' && c !== add && paired(c, add, proposedChanges));
  return { add, cut };
}

// A cut is "paired" with an add when it's the cut immediately preceding it in
// the proposedChanges list — the server emits cut/add pairs adjacently.
function paired(cut: ProposedChange, add: ProposedChange, all: ProposedChange[]): boolean {
  const addIdx = all.indexOf(add);
  return addIdx > 0 && all[addIdx - 1] === cut;
}

/** Pure helper — builds the apply payload for a single suggestion card. Exported for testing. */
export function buildApplyPayload(suggestion: ModelSuggestion, proposedChanges: ProposedChange[]) {
  const { add, cut } = pairedChangeFor(suggestion, proposedChanges);
  const changes = cut
    ? [
        { action: cut.action, cardId: cut.cardId, cardName: cut.cardName, quantity: cut.quantity },
        { action: add.action, cardId: add.cardId, cardName: add.cardName, quantity: add.quantity },
      ]
    : [{ action: add.action, cardId: add.cardId, cardName: add.cardName, quantity: add.quantity }];
  return { changes, candidatesShown: [suggestion.card.name] };
}

/** Pure helper — builds the dismiss payload for a suggestion. Exported for testing. */
export function buildDismissPayload(
  suggestion: ModelSuggestion,
  deckId: number,
  impressionId: string,
  candidatesShown: string[]
) {
  return {
    deck_id: deckId,
    impression_id: impressionId,
    card_name: suggestion.card.name,
    candidates_shown: candidatesShown,
    source: 'model-feed',
  };
}

interface SuggestionCardProps {
  suggestion: ModelSuggestion;
  proposedChanges: ProposedChange[];
  applying?: boolean;
  dismissed?: boolean;
  applied?: boolean;
  /** Replaces the score pill — chat (LLM) actions carry no model score. */
  badge?: string;
  onOpenCard: (card: DbCard) => void;
  onApply: () => void;
  onDismiss: () => void;
}

export function SuggestionCard({
  suggestion,
  proposedChanges,
  applying,
  dismissed,
  applied,
  badge,
  onOpenCard,
  onApply,
  onDismiss,
}: SuggestionCardProps) {
  if (dismissed) return null;
  const { add, cut } = pairedChangeFor(suggestion, proposedChanges);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card/60 p-2 animate-slide-up">
      {suggestion.card.image_uri_small && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={suggestion.card.image_uri_small}
          alt={suggestion.card.name}
          className="h-14 w-10 shrink-0 cursor-zoom-in rounded-md object-cover"
          onClick={() => onOpenCard(suggestion.card)}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium">{suggestion.card.name}</span>
          {badge ? (
            <span className="shrink-0 rounded bg-violet-500/15 px-1 py-0.5 text-[9px] font-bold text-violet-400">{badge}</span>
          ) : (
            <span className="hud-number shrink-0 rounded bg-primary/15 px-1 py-0.5 text-[9px] text-primary">
              {suggestion.score.toFixed(1)}
            </span>
          )}
        </div>
        {cut ? (
          <div className="truncate text-[10px] text-muted-foreground">
            cut <span className="text-red-400">{cut.cardName}</span> → add{' '}
            <span className="text-green-400">{add.cardName}</span>
          </div>
        ) : (
          <div className="truncate text-[10px] text-green-400">+ add {add.cardName}</div>
        )}
        <div className="truncate text-[9px] text-muted-foreground">{suggestion.reason}</div>
        <div className="mt-1 flex gap-1.5">
          <button
            onClick={onApply}
            disabled={applying || applied}
            className={cn(
              'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
              applied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
            )}
          >
            {applied ? 'Applied' : applying ? 'Applying…' : 'Apply'}
          </button>
          {!applied && (
            <button
              onClick={onDismiss}
              className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
