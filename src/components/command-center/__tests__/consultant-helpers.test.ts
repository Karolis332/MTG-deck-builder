import { describe, it, expect } from 'vitest';
import { pairedChangeFor, buildApplyPayload, buildDismissPayload } from '../consultant/SuggestionCard';
import { mergeHistory } from '../consultant/HistorySection';
import { isLocalEngineResponse } from '../consultant/ChatSection';
import type { ModelSuggestion, ProposedChange } from '../consultant/types';

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
