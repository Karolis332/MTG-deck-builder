'use client';

import { useState, useEffect } from 'react';
import { checkIsOverwolf } from '@/lib/electron-bridge';

interface OverwolfAdProps {
  /** IAB standard sizes: '728x90' (leaderboard), '300x250' (medium rectangle) */
  size: '728x90' | '300x250';
  className?: string;
}

/**
 * Overwolf ad container — renders `<owadview/>` only in Overwolf runtime.
 * In standalone Electron or browser, renders nothing.
 *
 * Placements:
 * - Below deck list (728x90 leaderboard)
 * - Analytics sidebar (300x250 medium rectangle)
 * - NEVER in overlay, game tracker, or deck editor
 */
export function OverwolfAd({ size, className = '' }: OverwolfAdProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    checkIsOverwolf().then(setShow);
  }, []);

  if (!show) return null;

  const [width, height] = size.split('x').map(Number);

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ width, height, background: 'transparent' }}
      dangerouslySetInnerHTML={{ __html: '<owadview></owadview>' }}
    />
  );
}
