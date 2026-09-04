import { describe, it, expect } from 'vitest';
import { pairedChangeFor, buildApplyPayload, buildDismissPayload } from '../consultant/SuggestionCard';
import { mergeHistory } from '../consultant/HistorySection';
import { isLocalEngineResponse } from '../consultant/ChatSection';
import { isModelUnreachable } from '../consultant/ModelFeed';
import { actionsAsChanges, chatActionToSuggestion, pairedCutIndices, pickCardForAction } from '../consultant/chatActionCards';
import type { DbCard } from '@/lib/types';
import type { ChatAction, ModelSuggestion, ProposedChange } from '../consultant/types';

function card(id: string, name: string) {
  return { id, name, image_uri_small: null } as unknown as ModelSuggestion['card'];
}

describe('pairedChangeFor / buildApplyPayload', () => {
  const suggestion: ModelSuggestion = { card: card('c2', 'Sol Ring'), reason: 'ramp', score: 9 };

  it('pairs an add with the preceding cut when the server returned them adjacently', () => {
    const proposed: ProposedChange[] = [
      { action: 'cut', cardId: 'c1', cardName: 'Mind Stone', quantity: 1, reason: 'weaker ramp' },
      { action: 'add', cardId: 'c2', cardName: 'Sol Ring', quantity: 1, reason: 'ramp' },
    ];
    const { add, cut } = pairedChangeFor(suggestion, proposed);
    expect(add.cardName).toBe('Sol Ring');
    expect(cut?.cardName).toBe('Mind Stone');
  });

  it('synthesizes an add-only change when no proposedChange matches', () => {
    const { add, cut } = pairedChangeFor(suggestion, []);
    expect(add.cardId).toBe('c2');
    expect(cut).toBeUndefined();
  });

  it('builds a two-change apply payload for a paired cut/add', () => {
    const proposed: ProposedChange[] = [
      { action: 'cut', cardId: 'c1', cardName: 'Mind Stone', quantity: 1, reason: 'weaker ramp' },
      { action: 'add', cardId: 'c2', cardName: 'Sol Ring', quantity: 1, reason: 'ramp' },
    ];
    const { changes, candidatesShown } = buildApplyPayload(suggestion, proposed);
    expect(changes).toEqual([
      { action: 'cut', cardId: 'c1', cardName: 'Mind Stone', quantity: 1 },
      { action: 'add', cardId: 'c2', cardName: 'Sol Ring', quantity: 1 },
    ]);
    expect(candidatesShown).toEqual(['Sol Ring']);
  });

  it('builds a single-change apply payload when there is no paired cut', () => {
    const { changes } = buildApplyPayload(suggestion, []);
    expect(changes).toEqual([{ action: 'add', cardId: 'c2', cardName: 'Sol Ring', quantity: 1 }]);
  });
});

describe('buildDismissPayload', () => {
  it('shapes the dismiss request per the /api/ai-suggest/dismiss contract', () => {
    const suggestion: ModelSuggestion = { card: card('c3', 'Arcane Signet'), reason: 'ramp', score: 7 };
    const payload = buildDismissPayload(suggestion, 42, 'imp-1', ['Arcane Signet', 'Sol Ring']);
    expect(payload).toEqual({
      deck_id: 42,
      impression_id: 'imp-1',
      card_name: 'Arcane Signet',
      candidates_shown: ['Arcane Signet', 'Sol Ring'],
      source: 'model-feed',
    });
  });
});

describe('isLocalEngineResponse', () => {
  it('detects the no-API-key local engine fallback message', () => {
    expect(isLocalEngineResponse('**Data-Driven Analysis** (no AI API key — using local model + 148K deck corpus)')).toBe(true);
    expect(isLocalEngineResponse('using local data engine (148K deck corpus)')).toBe(true);
  });

  it('does not flag a normal LLM response', () => {
    expect(isLocalEngineResponse('Here are three cards you should cut.')).toBe(false);
  });
});

describe('mergeHistory', () => {
  it('merges local events and version snapshots, newest first, capped at 20', () => {
    const events = [
      { kind: 'applied' as const, cardName: 'Sol Ring', source: 'collaborative-filtering', at: 2000 },
      { kind: 'dismissed' as const, cardName: 'Mind Stone', at: 1000 },
    ];
    const versions = [
      { id: 1, versionNumber: 1, name: 'Initial build', source: 'engine', createdAt: new Date(3000).toISOString() },
    ];
    const items = mergeHistory(events, versions, () => {});
    expect(items.map((i) => i.label)).toEqual([
      'Snapshot v1: Initial build',
      'Applied Sol Ring',
      'Dismissed Mind Stone',
    ]);
  });

  it('caps output at 20 items', () => {
    const events = Array.from({ length: 30 }, (_, i) => ({
      kind: 'applied' as const,
      cardName: `Card ${i}`,
      at: i,
    }));
    expect(mergeHistory(events, [], () => {})).toHaveLength(20);
  });

  it('wires the restore callback to the correct version id', () => {
    const restored: number[] = [];
    const versions = [{ id: 5, versionNumber: 2, name: 'Snap', source: 'manual', createdAt: new Date().toISOString() }];
    const items = mergeHistory([], versions, (id) => restored.push(id));
    items[0].restore?.();
    expect(restored).toEqual([5]);
  });
});

describe('chat action → SuggestionCard resolver', () => {
  const dbCard = (id: string, name: string) => ({ id, name, image_uri_small: null }) as unknown as DbCard;
  const add = (cardId: string, cardName: string): ChatAction => ({ action: 'add', cardId, cardName, quantity: 1, reason: 'r' });
  const cut = (cardId: string, cardName: string): ChatAction => ({ action: 'cut', cardId, cardName, quantity: 1, reason: 'r' });

  it('pickCardForAction prefers the id, then exact front-face name case-insensitively', () => {
    const cards = [dbCard('x1', 'Sol Ring'), dbCard('x2', 'Fire // Ice'), dbCard('x3', 'Firebrand')];
    expect(pickCardForAction(add('x3', 'Sol Ring'), cards)?.id).toBe('x3');
    expect(pickCardForAction(add('nope', 'sol ring'), cards)?.id).toBe('x1');
    expect(pickCardForAction(add('nope', 'Fire'), cards)?.id).toBe('x2');
    expect(pickCardForAction(add('nope', 'Fir'), cards)).toBeUndefined();
  });

  it('actionsAsChanges swaps in the resolved id so the adjacent cut pairs with the add', () => {
    const actions = [cut('c1', 'Mind Stone'), add('llm-guess', 'Sol Ring')];
    const changes = actionsAsChanges(actions, (a) => (a.cardName === 'Sol Ring' ? dbCard('real', 'Sol Ring') : null));
    expect(changes.map((c) => c.cardId)).toEqual(['c1', 'real']);
    const { changes: payload } = buildApplyPayload(chatActionToSuggestion(actions[1], dbCard('real', 'Sol Ring')), changes);
    expect(payload.map((c) => `${c.action}:${c.cardName}`)).toEqual(['cut:Mind Stone', 'add:Sol Ring']);
  });

  it('pairedCutIndices hides only cuts directly preceding a resolved add', () => {
    const actions = [cut('a', 'A'), add('b', 'B'), cut('c', 'C'), add('d', 'D'), cut('e', 'E')];
    expect([...pairedCutIndices(actions, (i) => i === 1)]).toEqual([0]);
    expect([...pairedCutIndices(actions, () => true)]).toEqual([0, 2]);
  });

  it('chatActionToSuggestion carries the LLM reason with a zero score', () => {
    expect(chatActionToSuggestion(add('x', 'X'), dbCard('x', 'X'))).toEqual({ card: dbCard('x', 'X'), reason: 'r', score: 0 });
  });
});

describe('isModelUnreachable', () => {
  it('flags CF tried-but-fell-back and fetch failures, not formats where CF is never tried', () => {
    expect(isModelUnreachable({ source: 'rules', sources_tried: ['collaborative-filtering', 'synergy', 'rules'] }, false)).toBe(true);
    expect(isModelUnreachable({ source: 'collaborative-filtering', sources_tried: ['collaborative-filtering'] }, false)).toBe(false);
    expect(isModelUnreachable({ source: 'rules', sources_tried: ['synergy', 'rules'] }, false)).toBe(false);
    expect(isModelUnreachable(null, true)).toBe(true);
    expect(isModelUnreachable(null, false)).toBe(false);
  });
});
