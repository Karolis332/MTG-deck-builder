import type { DbCard } from '@/lib/types';
import type { ChatAction, ModelSuggestion, ProposedChange } from './types';

/** Cache key for a resolved chat action — the LLM may repeat a name across turns. */
export function actionKey(action: Pick<ChatAction, 'cardName'>): string {
  return action.cardName.trim().toLowerCase();
}

/** Pick the DbCard a chat action refers to: id match first, then exact (front-face) name, case-insensitive. */
export function pickCardForAction(action: ChatAction, cards: DbCard[]): DbCard | undefined {
  const byId = cards.find((c) => c.id === action.cardId);
  if (byId) return byId;
  const want = actionKey(action);
  return cards.find((c) => c.name.toLowerCase() === want || c.name.split(' // ')[0].toLowerCase() === want);
}

export function chatActionToSuggestion(action: ChatAction, card: DbCard): ModelSuggestion {
  return { card, reason: action.reason, score: 0 };
}

/**
 * Chat actions as the ProposedChange list SuggestionCard pairs cuts/adds from.
 * Resolved cards lend their real id so the adjacent-cut pairing matches.
 */
export function actionsAsChanges(
  actions: ChatAction[],
  resolve: (action: ChatAction) => DbCard | null | undefined
): ProposedChange[] {
  return actions.map((a) => ({ ...a, cardId: resolve(a)?.id ?? a.cardId }));
}

/** Indices of `cut` actions rendered inside the following resolved `add` card (hidden as standalone rows). */
export function pairedCutIndices(actions: ChatAction[], isResolvedAdd: (index: number) => boolean): Set<number> {
  const out = new Set<number>();
  actions.forEach((a, i) => {
    if (a.action === 'add' && isResolvedAdd(i) && actions[i - 1]?.action === 'cut') out.add(i - 1);
  });
  return out;
}
