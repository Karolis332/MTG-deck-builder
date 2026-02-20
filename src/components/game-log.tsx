'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GameLogEntry } from '@/lib/electron-bridge';

interface GameLogProps {
  entries: GameLogEntry[];
  format: string | null;
  opponentName: string | null;
}

const TYPE_STYLES: Record<GameLogEntry['type'], string> = {
  system: 'text-muted-foreground italic',
  turn: 'text-cyan-400 font-bold font-heading tracking-wide',
  phase: 'text-amber-500/60 text-[10px] uppercase tracking-widest',
  action: 'text-foreground',
  life: 'text-yellow-400',
  damage: 'text-red-400',
  result: 'text-green-400 font-bold font-heading text-base tracking-wide',
};

const TYPE_ICONS: Partial<Record<GameLogEntry['type'], string>> = {
  life: '\u2764', // ❤
  damage: '\u2694', // ⚔
};

export function GameLog({ entries, format, opponentName }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-heading text-sm tracking-wide text-primary">Game Log</span>
        {format && (
          <span className="text-xs text-muted-foreground">
            {format}{opponentName ? ` vs ${opponentName}` : ''}
          </span>
        )}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Waiting for game events...
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              className={cn(
                'py-0.5 text-xs leading-relaxed',
                TYPE_STYLES[entry.type] || 'text-foreground',
                entry.type === 'action' && entry.player === 'self' && 'text-green-300',
                entry.type === 'action' && entry.player === 'opponent' && 'text-red-300',
                entry.type === 'turn' && 'mt-2 pt-1 border-t border-border/30',
                entry.type === 'phase' && 'pl-1',
                entry.type === 'action' && 'pl-3',
                entry.type === 'life' && 'pl-3',
                entry.type === 'damage' && 'pl-3',
                entry.type === 'result' && 'mt-2 text-center py-2',
              )}
            >
              {TYPE_ICONS[entry.type] ? `${TYPE_ICONS[entry.type]} ` : ''}{entry.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
