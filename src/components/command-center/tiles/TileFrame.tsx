'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TileFrameProps {
  title: string;
  headline: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function TileFrame({ title, headline, children, defaultOpen = true, className }: TileFrameProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('hud-panel hud-scanlines overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className="flex items-center gap-2">
          {headline}
          <span className={cn('text-muted-foreground transition-transform', open ? 'rotate-180' : '')}>▾</span>
        </div>
      </button>
      {open && (
        <>
          <div className="hud-divider" />
          <div className="px-3 py-2">{children}</div>
        </>
      )}
    </section>
  );
}
