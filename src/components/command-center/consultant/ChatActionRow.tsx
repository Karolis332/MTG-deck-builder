'use client';

import { cn } from '@/lib/utils';
import type { ChatAction } from './types';

interface ChatActionRowProps {
  action: ChatAction;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function ChatActionRow({ action, checked, disabled, onToggle }: ChatActionRowProps) {
  return (
    <div
      onClick={() => !disabled && onToggle()}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 transition-opacity',
        !disabled && 'cursor-pointer hover:bg-accent/30',
        !checked && !disabled && 'opacity-40'
      )}
    >
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold',
          action.action === 'cut' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        )}
      >
        {action.action === 'cut' ? 'CUT' : 'ADD'}
      </span>
      <span className="flex-1 truncate text-xs">{action.cardName}</span>
      <span className="max-w-[100px] truncate text-[10px] text-muted-foreground">{action.reason}</span>
    </div>
  );
}
