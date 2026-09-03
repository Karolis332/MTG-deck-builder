'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { DbCard, DeckPatchOp } from '@/lib/types';

export interface DeckData {
  id: number;
  name: string;
  description: string | null;
  format: string | null;
  target_bracket?: number | null;
  cards: Array<{
    entry_id: number;
    card_id: string;
    quantity: number;
    board: string;
    sort_order: number;
    role_override?: string | null;
  } & DbCard>;
}

type DeckEntry = DeckData['cards'][number];

// VW event tracking (fire-and-forget to server proxy)
export function trackVWEvent(
  eventType: string,
  commander: string,
  colorIdentity: string,
  deckCards: string[],
  cardName?: string
) {
  fetch('/api/cf-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: eventType,
      commander,
      color_identity: colorIdentity,
      deck_cards: deckCards,
      card_name: cardName,
    }),
  }).catch(() => {});
}

/* ── Pure undo/redo stack (exported for tests) ────────────────────────── */

export interface UndoEntry {
  ops: DeckPatchOp[];
  inverseOps: DeckPatchOp[];
}

export interface UndoState {
  past: UndoEntry[];
  future: UndoEntry[];
}

export const initialUndoState: UndoState = { past: [], future: [] };

export type UndoAction =
  | { type: 'push'; entry: UndoEntry }
  | { type: 'undo' }
  | { type: 'redo' };

export function undoReducer(state: UndoState, action: UndoAction): UndoState {
  switch (action.type) {
    case 'push':
      return { past: [...state.past, action.entry], future: [] };
    case 'undo': {
      if (state.past.length === 0) return state;
      const entry = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), future: [entry, ...state.future] };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const [entry, ...rest] = state.future;
      return { past: [...state.past, entry], future: rest };
    }
    default:
      return state;
  }
}

// Builds the inverse of a single op given the pre-op value of the affected card/board:
// a quantity (number) for the quantity ops, or a prior role (string|null) for set_role.
// prevValue is ignored for move_card (it's a pure board swap on the server: quantity resets to 1).
export function invertOp(op: DeckPatchOp, prevValue: number | string | null): DeckPatchOp {
  switch (op.op) {
    case 'add_card': {
      const prevQuantity = prevValue as number;
      return prevQuantity > 0
        ? { op: 'set_quantity', card_id: op.card_id, board: op.board, quantity: prevQuantity }
        : { op: 'remove_card', card_id: op.card_id, board: op.board };
    }
    case 'remove_card':
      return { op: 'add_card', card_id: op.card_id, board: op.board, quantity: Math.max(prevValue as number, 1) };
    case 'set_quantity':
      return { op: 'set_quantity', card_id: op.card_id, board: op.board, quantity: prevValue as number };
    case 'move_card':
      return { op: 'move_card', card_id: op.card_id, from_board: op.to_board, to_board: op.from_board };
    case 'set_role':
      return { op: 'set_role', card_id: op.card_id, board: op.board, role: prevValue as string | null };
  }
}

/* ── Optimistic local apply (best-effort; server response is authoritative) ── */

function findEntry(deck: DeckData, cardId: string, board: string): DeckEntry | undefined {
  return deck.cards.find((c) => (c.card_id || c.id) === cardId && c.board === board);
}

function quantityOf(deck: DeckData, cardId: string, board: string): number {
  return findEntry(deck, cardId, board)?.quantity ?? 0;
}

// ponytail: optimistic re-insert after a full removal needs card metadata we may not have
// (server only ever sends card_id/board on the op). We keep a best-effort cache; if the card
// isn't cached the optimistic step is skipped and the next server response corrects the view.
function applyOpOptimistic(deck: DeckData, op: DeckPatchOp, cache: Map<string, DbCard>): DeckData {
  switch (op.op) {
    case 'add_card': {
      const existing = findEntry(deck, op.card_id, op.board);
      if (existing) {
        return {
          ...deck,
          cards: deck.cards.map((c) => (c === existing ? { ...c, quantity: c.quantity + op.quantity } : c)),
        };
      }
      const meta = cache.get(op.card_id);
      if (!meta) return deck;
      const maxSort = deck.cards.reduce((m, c) => Math.max(m, c.sort_order), 0);
      const newEntry: DeckEntry = {
        ...meta,
        entry_id: -Date.now(),
        card_id: op.card_id,
        quantity: op.quantity,
        board: op.board,
        sort_order: maxSort + 1,
      };
      return { ...deck, cards: [...deck.cards, newEntry] };
    }
    case 'remove_card':
      return { ...deck, cards: deck.cards.filter((c) => !(c.card_id === op.card_id && c.board === op.board)) };
    case 'set_quantity': {
      const existing = findEntry(deck, op.card_id, op.board);
      if (!existing) return deck;
      return { ...deck, cards: deck.cards.map((c) => (c === existing ? { ...c, quantity: op.quantity } : c)) };
    }
    case 'move_card': {
      const existing = findEntry(deck, op.card_id, op.from_board);
      if (!existing) return deck;
      return {
        ...deck,
        cards: deck.cards.map((c) => (c === existing ? { ...c, board: op.to_board, quantity: 1 } : c)),
      };
    }
    case 'set_role': {
      const existing = findEntry(deck, op.card_id, op.board);
      if (!existing) return deck;
      return { ...deck, cards: deck.cards.map((c) => (c === existing ? { ...c, role_override: op.role } : c)) };
    }
    default:
      return deck;
  }
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export interface UseDeckEditorResult {
  deck: DeckData | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addCard: (card: DbCard, board?: string) => Promise<void>;
  removeCard: (cardId: string, board: string) => Promise<void>;
  setQuantity: (cardId: string, board: string, quantity: number) => Promise<void>;
  moveCard: (cardId: string, fromBoard: string, toBoard: string) => Promise<void>;
  setRole: (cardId: string, board: string, role: string | null) => Promise<void>;
  applyOps: (ops: DeckPatchOp[]) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  /** Bumped on every successful server mutation — drives dependent-fetch effects (e.g. deck-analysis). */
  version: number;
}

export function useDeckEditor(deckId: number): UseDeckEditorResult {
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [undoState, dispatch] = useReducer(undoReducer, initialUndoState);

  const deckRef = useRef<DeckData | null>(null);
  deckRef.current = deck;
  const cacheRef = useRef<Map<string, DbCard>>(new Map());

  const cacheCards = (d: DeckData) => {
    for (const c of d.cards) cacheRef.current.set(c.card_id || c.id, c);
  };

  const refetch = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`);
      const data = await res.json();
      if (data.deck) {
        setDeck(data.deck);
        cacheCards(data.deck);
      }
    } catch {
      setError('Failed to load deck');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Sends ops to the server, applying/rolling back the optimistic local state around the call.
  const runOps = useCallback(
    async (ops: DeckPatchOp[], inverseOps: DeckPatchOp[], pushUndo: boolean) => {
      const prevDeck = deckRef.current;
      if (!prevDeck) return;
      setSaving(true);
      setError(null);
      const optimistic = ops.reduce((d, op) => applyOpOptimistic(d, op, cacheRef.current), prevDeck);
      setDeck(optimistic);
      try {
        const res = await fetch(`/api/decks/${deckId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ops.length === 1 ? ops[0] : { operations: ops }),
        });
        const data = await res.json();
        if (data.deck) {
          setDeck(data.deck);
          cacheCards(data.deck);
          setVersion((v) => v + 1);
          if (pushUndo) dispatch({ type: 'push', entry: { ops, inverseOps } });
        } else {
          setDeck(prevDeck);
          setError(data.error || 'Failed to update deck');
        }
      } catch {
        setDeck(prevDeck);
        setError('Failed to update deck');
      } finally {
        setSaving(false);
      }
    },
    [deckId]
  );

  const addCard = useCallback(
    async (card: DbCard, board = 'main') => {
      const prevDeck = deckRef.current;
      if (!prevDeck) return;
      cacheRef.current.set(card.id, card);
      const prevQty = quantityOf(prevDeck, card.id, board);
      const op: DeckPatchOp = { op: 'add_card', card_id: card.id, quantity: 1, board };
      await runOps([op], [invertOp(op, prevQty)], true);

      const cmdr = prevDeck.cards.find((c) => c.board === 'commander');
      if (cmdr) {
        const ci = cmdr.color_identity ? JSON.parse(cmdr.color_identity).sort().join('') : 'C';
        const deckCardNames = prevDeck.cards.filter((c) => c.board === 'main').map((c) => c.name);
        trackVWEvent('card_added', cmdr.name, ci, deckCardNames, card.name);
      }
    },
    [runOps]
  );

  const removeCard = useCallback(
    async (cardId: string, board: string) => {
      const prevDeck = deckRef.current;
      if (!prevDeck) return;
      const entry = findEntry(prevDeck, cardId, board);
      if (!entry) return;
      const op: DeckPatchOp = { op: 'remove_card', card_id: cardId, board };
      await runOps([op], [invertOp(op, entry.quantity)], true);

      const cmdr = prevDeck.cards.find((c) => c.board === 'commander');
      if (cmdr) {
        const ci = cmdr.color_identity ? JSON.parse(cmdr.color_identity).sort().join('') : 'C';
        const deckCardNames = prevDeck.cards.filter((c) => c.board === 'main').map((c) => c.name);
        trackVWEvent('card_removed', cmdr.name, ci, deckCardNames, entry.name);
      }
    },
    [runOps]
  );

  const setQuantity = useCallback(
    async (cardId: string, board: string, quantity: number) => {
      if (quantity <= 0) return removeCard(cardId, board);
      const prevDeck = deckRef.current;
      if (!prevDeck) return;
      const prevQty = quantityOf(prevDeck, cardId, board);
      const op: DeckPatchOp = { op: 'set_quantity', card_id: cardId, quantity, board };
      await runOps([op], [invertOp(op, prevQty)], true);
    },
    [removeCard, runOps]
  );

  const moveCard = useCallback(
    async (cardId: string, fromBoard: string, toBoard: string) => {
      const op: DeckPatchOp = { op: 'move_card', card_id: cardId, from_board: fromBoard, to_board: toBoard };
      await runOps([op], [invertOp(op, 0)], true);
    },
    [runOps]
  );

  const setRole = useCallback(
    async (cardId: string, board: string, role: string | null) => {
      const prevDeck = deckRef.current;
      if (!prevDeck) return;
      const prevRole = findEntry(prevDeck, cardId, board)?.role_override ?? null;
      const op: DeckPatchOp = { op: 'set_role', card_id: cardId, board, role };
      await runOps([op], [invertOp(op, prevRole)], true);
    },
    [runOps]
  );

  const applyOps = useCallback(
    async (ops: DeckPatchOp[]) => {
      const prevDeck = deckRef.current;
      if (!prevDeck) return;
      let sim = prevDeck;
      const inverses: DeckPatchOp[] = [];
      for (const op of ops) {
        const prevValue: number | string | null =
          op.op === 'move_card'
            ? 0
            : op.op === 'set_role'
              ? findEntry(sim, op.card_id, op.board)?.role_override ?? null
              : quantityOf(sim, op.card_id, op.board);
        inverses.push(invertOp(op, prevValue));
        sim = applyOpOptimistic(sim, op, cacheRef.current);
      }
      await runOps(ops, inverses.reverse(), true);
    },
    [runOps]
  );

  const undo = useCallback(async () => {
    if (undoState.past.length === 0) return;
    const entry = undoState.past[undoState.past.length - 1];
    dispatch({ type: 'undo' });
    await runOps(entry.inverseOps, entry.ops, false);
  }, [undoState, runOps]);

  const redo = useCallback(async () => {
    if (undoState.future.length === 0) return;
    const entry = undoState.future[0];
    dispatch({ type: 'redo' });
    await runOps(entry.ops, entry.inverseOps, false);
  }, [undoState, runOps]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return {
    deck,
    loading,
    saving,
    error,
    refetch,
    addCard,
    removeCard,
    setQuantity,
    moveCard,
    setRole,
    applyOps,
    undo,
    redo,
    canUndo: undoState.past.length > 0,
    canRedo: undoState.future.length > 0,
    version,
  };
}
