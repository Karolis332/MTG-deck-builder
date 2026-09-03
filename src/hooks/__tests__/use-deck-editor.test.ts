import { describe, it, expect } from 'vitest';
import { invertOp, undoReducer, initialUndoState, type UndoEntry } from '../use-deck-editor';
import type { DeckPatchOp } from '@/lib/types';

describe('invertOp', () => {
  it('inverts add_card as remove_card when the card was new', () => {
    const op: DeckPatchOp = { op: 'add_card', card_id: 'c1', quantity: 1, board: 'main' };
    expect(invertOp(op, 0)).toEqual({ op: 'remove_card', card_id: 'c1', board: 'main' });
  });

  it('inverts add_card as set_quantity when the card already existed', () => {
    const op: DeckPatchOp = { op: 'add_card', card_id: 'c1', quantity: 1, board: 'main' };
    expect(invertOp(op, 2)).toEqual({ op: 'set_quantity', card_id: 'c1', board: 'main', quantity: 2 });
  });

  it('inverts remove_card as add_card restoring prior quantity', () => {
    const op: DeckPatchOp = { op: 'remove_card', card_id: 'c1', board: 'main' };
    expect(invertOp(op, 3)).toEqual({ op: 'add_card', card_id: 'c1', board: 'main', quantity: 3 });
  });

  it('inverts set_quantity back to the previous quantity', () => {
    const op: DeckPatchOp = { op: 'set_quantity', card_id: 'c1', quantity: 4, board: 'main' };
    expect(invertOp(op, 1)).toEqual({ op: 'set_quantity', card_id: 'c1', board: 'main', quantity: 1 });
  });

  it('inverts move_card by swapping from/to boards', () => {
    const op: DeckPatchOp = { op: 'move_card', card_id: 'c1', from_board: 'main', to_board: 'sideboard' };
    expect(invertOp(op, 0)).toEqual({ op: 'move_card', card_id: 'c1', from_board: 'sideboard', to_board: 'main' });
  });

  it('inverts set_role back to the previous role', () => {
    const op: DeckPatchOp = { op: 'set_role', card_id: 'c1', board: 'main', role: 'removal' };
    expect(invertOp(op, 'ramp')).toEqual({ op: 'set_role', card_id: 'c1', board: 'main', role: 'ramp' });
  });

  it('inverts set_role back to auto (null) when there was no prior override', () => {
    const op: DeckPatchOp = { op: 'set_role', card_id: 'c1', board: 'main', role: 'removal' };
    expect(invertOp(op, null)).toEqual({ op: 'set_role', card_id: 'c1', board: 'main', role: null });
  });
});

describe('undoReducer', () => {
  const entry: UndoEntry = {
    ops: [{ op: 'add_card', card_id: 'c1', quantity: 1, board: 'main' }],
    inverseOps: [{ op: 'remove_card', card_id: 'c1', board: 'main' }],
  };

  it('push adds to past and clears future', () => {
    const withFuture = { past: [], future: [entry] };
    const next = undoReducer(withFuture, { type: 'push', entry });
    expect(next.past).toEqual([entry]);
    expect(next.future).toEqual([]);
  });

  it('undo moves the latest past entry to future', () => {
    const state = { past: [entry], future: [] };
    const next = undoReducer(state, { type: 'undo' });
    expect(next.past).toEqual([]);
    expect(next.future).toEqual([entry]);
  });

  it('undo on empty past is a no-op', () => {
    expect(undoReducer(initialUndoState, { type: 'undo' })).toBe(initialUndoState);
  });

  it('redo moves the earliest future entry back to past', () => {
    const state = { past: [], future: [entry] };
    const next = undoReducer(state, { type: 'redo' });
    expect(next.past).toEqual([entry]);
    expect(next.future).toEqual([]);
  });

  it('redo on empty future is a no-op', () => {
    expect(undoReducer(initialUndoState, { type: 'redo' })).toBe(initialUndoState);
  });

  it('groups a batch of ops as a single undo entry', () => {
    const batch: UndoEntry = {
      ops: [
        { op: 'add_card', card_id: 'c1', quantity: 1, board: 'main' },
        { op: 'add_card', card_id: 'c2', quantity: 1, board: 'main' },
      ],
      inverseOps: [
        { op: 'remove_card', card_id: 'c2', board: 'main' },
        { op: 'remove_card', card_id: 'c1', board: 'main' },
      ],
    };
    const pushed = undoReducer(initialUndoState, { type: 'push', entry: batch });
    expect(pushed.past).toHaveLength(1);
    const undone = undoReducer(pushed, { type: 'undo' });
    expect(undone.future[0].inverseOps).toHaveLength(2);
  });

  it('clears future when a new op is pushed after an undo', () => {
    const state = { past: [], future: [entry] };
    const other: UndoEntry = {
      ops: [{ op: 'remove_card', card_id: 'c9', board: 'main' }],
      inverseOps: [{ op: 'add_card', card_id: 'c9', quantity: 1, board: 'main' }],
    };
    const next = undoReducer(state, { type: 'push', entry: other });
    expect(next.future).toEqual([]);
    expect(next.past).toEqual([other]);
  });
});
