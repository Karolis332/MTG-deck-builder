'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import type { DbCard } from '@/lib/types';

export interface DragCardData {
  type: 'search-card' | 'deck-card';
  card: DbCard;
  board?: string;
  cardId?: string;
}

interface DeckDndContextProps {
  children: React.ReactNode;
  onAddCard?: (card: DbCard, board: string) => void;
  onMoveCard?: (cardId: string, fromBoard: string, toBoard: string) => void;
  onRemoveCard?: (cardId: string, board: string) => void;
}

export function DeckDndContext({
  children,
  onAddCard,
  onMoveCard,
  onRemoveCard,
}: DeckDndContextProps) {
  const [activeCard, setActiveCard] = useState<DbCard | null>(null);
  const [overZone, setOverZone] = useState<string | null>(null);

  // Require 8px of movement before starting drag (prevents accidental drags on click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragCardData | undefined;
    if (data?.card) {
      setActiveCard(data.card);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    setOverZone(overId ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const data = event.active.data.current as DragCardData | undefined;
    const targetId = event.over?.id as string | undefined;

    if (data && targetId) {
      if (targetId === 'remove-zone') {
        if (data.type === 'deck-card' && data.cardId && data.board) {
          onRemoveCard?.(data.cardId, data.board);
        }
      } else if (targetId === 'drop-main' || targetId === 'drop-sideboard') {
        const targetBoard = targetId === 'drop-main' ? 'main' : 'sideboard';

        if (data.type === 'search-card') {
          onAddCard?.(data.card, targetBoard);
        } else if (data.type === 'deck-card' && data.cardId && data.board) {
          if (data.board !== targetBoard) {
            onMoveCard?.(data.cardId, data.board, targetBoard);
          }
        }
      }
    }

    setActiveCard(null);
    setOverZone(null);
  }, [onAddCard, onMoveCard, onRemoveCard]);

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
    setOverZone(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="pointer-events-none rounded-xl shadow-2xl shadow-black/60 ring-2 ring-primary/50" style={{ width: 160 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeCard.image_uri_small || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(activeCard.name)}&format=image&version=small`}
              alt={activeCard.name}
              className="h-auto w-full rounded-xl"
            />
          </div>
        ) : null}
      </DragOverlay>

      {activeCard && (
        <DropRemoveZone isOver={overZone === 'remove-zone'} />
      )}
    </DndContext>
  );
}

function DropRemoveZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: 'remove-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border-2 border-dashed px-8 py-3 text-sm font-medium transition-all ${
        isOver
          ? 'border-destructive bg-destructive/20 text-destructive scale-110'
          : 'border-muted-foreground/40 bg-background/90 text-muted-foreground backdrop-blur-sm'
      }`}
    >
      {isOver ? 'Release to remove' : 'Drop here to remove'}
    </div>
  );
}
