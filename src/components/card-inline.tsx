'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CardInlineProps {
  name: string;
  imageUri?: string | null;
  imageUriNormal?: string | null;
  className?: string;
}

export function CardInline({ name, imageUri, imageUriNormal, className }: CardInlineProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (!imageUriNormal && !imageUri) return;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      setPreviewPos({ x, y });
    }
    setShowPreview(true);
  };

  if (!imageUri) {
    return (
      <span className={cn(
        'inline-flex items-center rounded bg-accent/50 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80',
        className
      )}>
        {name}
      </span>
    );
  }

  return (
    <>
      <span
        ref={ref}
        className={cn(
          'inline-flex shrink-0 cursor-pointer items-center gap-1',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowPreview(false)}
      >
        <img
          src={imageUri}
          alt={name}
          className="h-[50px] w-[36px] rounded border border-border/30 object-cover"
          loading="lazy"
        />
      </span>

      {showPreview && (imageUriNormal || imageUri) && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: `${previewPos.x}px`,
            top: `${previewPos.y}px`,
            transform: 'translate(-50%, -105%)',
          }}
        >
          <img
            src={imageUriNormal || imageUri || undefined}
            alt={name}
            className="h-auto w-[250px] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

/**
 * Smaller inline version — just the name with optional tiny art and hover preview.
 */
export function CardInlineText({ name, imageUri, imageUriNormal, className }: CardInlineProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (!imageUriNormal && !imageUri) return;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPreviewPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShowPreview(true);
  };

  return (
    <>
      <span
        ref={ref}
        className={cn('cursor-pointer underline decoration-dotted underline-offset-2', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowPreview(false)}
      >
        {name}
      </span>

      {showPreview && (imageUriNormal || imageUri) && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: `${previewPos.x}px`,
            top: `${previewPos.y}px`,
            transform: 'translate(-50%, -105%)',
          }}
        >
          <img
            src={imageUriNormal || imageUri || undefined}
            alt={name}
            className="h-auto w-[250px] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
