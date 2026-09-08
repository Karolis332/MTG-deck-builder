'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// v2: wider defaults after the 2026-09-08 readability pass (type went up one step).
const STORAGE_KEY = 'bg.commandCenter.v2';
const MIN_WIDTH = 280;
const MAX_WIDTH = 680;
const DEFAULT_LEFT = 400;
const DEFAULT_RIGHT = 440;

interface PersistedState {
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
}

function loadPersisted(): PersistedState {
  if (typeof window === 'undefined') {
    return { leftWidth: DEFAULT_LEFT, rightWidth: DEFAULT_RIGHT, leftCollapsed: false, rightCollapsed: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('none');
    const parsed = JSON.parse(raw);
    return {
      leftWidth: parsed.leftWidth ?? DEFAULT_LEFT,
      rightWidth: parsed.rightWidth ?? DEFAULT_RIGHT,
      leftCollapsed: parsed.leftCollapsed ?? false,
      rightCollapsed: parsed.rightCollapsed ?? false,
    };
  } catch {
    return { leftWidth: DEFAULT_LEFT, rightWidth: DEFAULT_RIGHT, leftCollapsed: false, rightCollapsed: false };
  }
}

export interface CommandCenterPaneControls {
  toggleLeft: () => void;
  toggleRight: () => void;
}

interface CommandCenterLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftTitle?: string;
  rightTitle?: string;
  /** Imperative escape hatch for the `[` / `]` hotkeys — set once, read by the hotkey hook. */
  controlRef?: { current: CommandCenterPaneControls | null };
}

type MobileTab = 'consultant' | 'deck' | 'analysis';

export function CommandCenterLayout({ left, center, right, leftTitle, rightTitle, controlRef }: CommandCenterLayoutProps) {
  const [state, setState] = useState<PersistedState>(loadPersisted);
  const [mobileTab, setMobileTab] = useState<MobileTab>('deck');
  const dragRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = drag.side === 'left' ? e.clientX - drag.startX : drag.startX - e.clientX;
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, drag.startWidth + delta));
    setState((s) => (drag.side === 'left' ? { ...s, leftWidth: next } : { ...s, rightWidth: next }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove]);

  const startDrag = (side: 'left' | 'right') => (e: React.PointerEvent) => {
    dragRef.current = { side, startX: e.clientX, startWidth: side === 'left' ? state.leftWidth : state.rightWidth };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const toggleCollapsed = (side: 'left' | 'right') => {
    setState((s) => (side === 'left' ? { ...s, leftCollapsed: !s.leftCollapsed } : { ...s, rightCollapsed: !s.rightCollapsed }));
  };

  if (controlRef) {
    controlRef.current = { toggleLeft: () => toggleCollapsed('left'), toggleRight: () => toggleCollapsed('right') };
  }

  const gridColumns = `${state.leftCollapsed ? 0 : state.leftWidth}px 1fr ${state.rightCollapsed ? 0 : state.rightWidth}px`;

  return (
    <>
      {/* Mobile tab bar */}
      <div className="flex shrink-0 border-b border-border lg:hidden">
        {(
          [
            ['consultant', 'Consultant'],
            ['deck', 'Deck'],
            ['analysis', 'Analysis'],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              mobileTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mobile: single pane */}
      <div className="flex-1 overflow-hidden lg:hidden">
        <div className={cn('h-full overflow-y-auto', mobileTab !== 'consultant' && 'hidden')}>{left}</div>
        <div className={cn('h-full overflow-y-auto', mobileTab !== 'deck' && 'hidden')}>{center}</div>
        <div className={cn('h-full overflow-y-auto', mobileTab !== 'analysis' && 'hidden')}>{right}</div>
      </div>

      {/* Desktop: resizable grid */}
      <div
        className="hidden min-h-0 flex-1 overflow-hidden lg:grid"
        // minmax(0, 1fr): grid tracks default to min-height:auto, so a pane taller
        // than the viewport grew the track and the panes could never scroll.
        style={{ gridTemplateColumns: gridColumns, gridTemplateRows: 'minmax(0, 1fr)', transition: 'grid-template-columns 150ms ease' }}
      >
        <Pane
          collapsed={state.leftCollapsed}
          title={leftTitle}
          onToggle={() => toggleCollapsed('left')}
          side="left"
          onDragStart={startDrag('left')}
        >
          {left}
        </Pane>

        <div className="min-h-0 min-w-0 overflow-y-auto">{center}</div>

        <Pane
          collapsed={state.rightCollapsed}
          title={rightTitle}
          onToggle={() => toggleCollapsed('right')}
          side="right"
          onDragStart={startDrag('right')}
        >
          {right}
        </Pane>
      </div>
    </>
  );
}

interface PaneProps {
  collapsed: boolean;
  title?: string;
  onToggle: () => void;
  side: 'left' | 'right';
  onDragStart: (e: React.PointerEvent) => void;
  children: ReactNode;
}

function Pane({ collapsed, title, onToggle, side, onDragStart, children }: PaneProps) {
  if (collapsed) {
    return (
      <div className={cn('relative flex w-0 shrink-0', side === 'left' ? 'border-r' : 'border-l', 'border-border')}>
        <button
          onClick={onToggle}
          title={title ? `Expand ${title}` : 'Expand panel'}
          className={cn(
            'absolute top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-card text-primary hover:bg-accent',
            side === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {side === 'left' ? '›' : '‹'}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative flex min-h-0 min-w-0 flex-col', side === 'left' ? 'border-r' : 'border-l', 'border-border')}>
      {title && (
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
          <button onClick={onToggle} title="Collapse" className="text-muted-foreground hover:text-foreground">
            {side === 'left' ? '‹' : '›'}
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">{children}</div>
      <div
        onPointerDown={onDragStart}
        className={cn(
          'absolute top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-primary/20',
          side === 'left' ? '-right-[3px]' : '-left-[3px]'
        )}
      />
    </div>
  );
}
