'use client';

import { useState } from 'react';
import type { DbCard, Deck } from '@/lib/types';
import { ModelFeed } from './consultant/ModelFeed';
import { ChatSection } from './consultant/ChatSection';
import { HistorySection, type LocalHistoryEvent } from './consultant/HistorySection';
import type { ProposedChange } from './consultant/types';

interface ConsultantPaneProps {
  deckId: number;
  deck: Deck;
  collectionOnly: boolean;
  prefill?: string;
  onOpenCard: (card: DbCard) => void;
  onApplyChanges: (
    changes: ProposedChange[],
    meta: { impressionId?: string; candidatesShown: string[] }
  ) => Promise<boolean>;
  /** Bumped by the page on every deck mutation — refetches the model feed. */
  onDeckChanged?: number;
}

// Top-level consultant pane: model feed → chat → history, stacked and
// independently collapsible in a scrollable column.
export function ConsultantPane({
  deckId,
  deck: _deck,
  collectionOnly,
  prefill,
  onOpenCard,
  onApplyChanges,
  onDeckChanged,
}: ConsultantPaneProps) {
  const [historyEvents, setHistoryEvents] = useState<LocalHistoryEvent[]>([]);
  const [restoreTick, setRestoreTick] = useState(0);

  const logApplied = (cardName: string, source: string) => {
    setHistoryEvents((prev) => [...prev, { kind: 'applied', cardName, source, at: Date.now() }]);
  };
  const logDismissed = (cardName: string) => {
    setHistoryEvents((prev) => [...prev, { kind: 'dismissed', cardName, at: Date.now() }]);
  };

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-2">
      <ModelFeed
        deckId={deckId}
        collectionOnly={collectionOnly}
        onDeckChanged={(onDeckChanged ?? 0) + restoreTick}
        onOpenCard={onOpenCard}
        onApplyChanges={onApplyChanges}
        onSuggestionApplied={logApplied}
        onSuggestionDismissed={logDismissed}
      />
      <ChatSection
        deckId={deckId}
        prefill={prefill}
        onApplyChanges={onApplyChanges}
        onActionsApplied={(names) => names.forEach((n) => logApplied(n, 'chat'))}
      />
      <HistorySection
        deckId={deckId}
        events={historyEvents}
        onRestored={() => setRestoreTick((t) => t + 1)}
      />
    </div>
  );
}
