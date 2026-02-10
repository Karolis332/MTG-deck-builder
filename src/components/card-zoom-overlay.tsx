'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DbCard } from '@/lib/types';

interface CardZoomOverlayProps {
  card: DbCard | null;
  position: { x: number; y: number };
  onClose: () => void;
}

const IMG_W = 336;
const IMG_H = 468;

export function CardZoomOverlay({ card, position, onClose }: CardZoomOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stableClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!card) return;

    // Small delay so the triggering right-click event doesn't immediately
    // dismiss the overlay (e.g. via Electron context-menu side-effects).
    const timer = setTimeout(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') stableClose();
      };
      const handleMouseDown = (e: MouseEvent) => {
        // Left-click anywhere dismisses
        if (e.button === 0) stableClose();
      };
      const handleContext = (e: MouseEvent) => {
        // Right-click outside the overlay dismisses (and opens zoom on new card)
        if (ref.current && !ref.current.contains(e.target as Node)) {
          stableClose();
        }
      };
      const handleScroll = () => stableClose();

      window.addEventListener('keydown', handleKey);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('contextmenu', handleContext);
      window.addEventListener('scroll', handleScroll, true);

      // Store cleanup for the timeout-registered listeners
      cleanupRef.current = () => {
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('contextmenu', handleContext);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }, 50);

    const cleanupRef = { current: () => {} };

    return () => {
      clearTimeout(timer);
      cleanupRef.current();
    };
  }, [card, stableClose]);

  if (!card) return null;

  const src = card.image_uri_large || card.image_uri_normal;
  if (!src) return null;

  // Clamp position to keep image within viewport
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const pad = 12;

  let left = position.x - IMG_W / 2;
  let top = position.y - IMG_H / 2;

  if (left < pad) left = pad;
  if (left + IMG_W > vw - pad) left = vw - pad - IMG_W;
  if (top < pad) top = pad;
  if (top + IMG_H > vh - pad) top = vh - pad - IMG_H;

  return (
    <div
      ref={ref}
      className="fixed z-[60]"
      style={{ left, top, width: IMG_W, height: IMG_H }}
    >
      <div className="rounded-xl border border-border/60 shadow-2xl shadow-black/60 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={card.name}
          width={IMG_W}
          height={IMG_H}
          className="block h-auto w-full"
          draggable={false}
        />
      </div>
    </div>
  );
}
