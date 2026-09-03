import type { DbCard } from '@/lib/types';
import type { SuggestionSource } from '@/lib/suggestion-sources';

/** Mirrors ProposedChange from the server contract (POST /api/ai-suggest). */
export interface ProposedChange {
  action: 'cut' | 'add';
  cardId: string;
  cardName: string;
  quantity: number;
  reason: string;
  winRate?: number;
  imageUri?: string;
  selected?: boolean;
}

export interface ModelSuggestion {
  card: DbCard;
  reason: string;
  score: number;
}

export interface SuggestResponse {
  suggestions: ModelSuggestion[];
  proposedChanges: ProposedChange[];
  source: SuggestionSource;
  sources_tried: string[];
  impression_id: string;
}

export interface ChatAction {
  action: 'cut' | 'add';
  cardId: string;
  cardName: string;
  quantity: number;
  reason: string;
  imageUri?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
  actionsApplied?: boolean;
  localEngine?: boolean;
}
