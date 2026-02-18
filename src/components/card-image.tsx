'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';

interface CardImageProps {
  card: DbCard;
  size?: 'small' | 'normal' | 'large';
  className?: string;
  priority?: boolean;
  showHoverEffect?: boolean;
  onClick?: () => void;
}

const SIZE_DIMENSIONS = {
  small: { width: 146, height: 204 },
  normal: { width: 244, height: 340 },
  large: { width: 336, height: 468 },
};

// DEBUG: Set to true to show image URL overlay on cards
const DEBUG_IMAGES = false;

export function CardImage({
  card,
  size = 'normal',
  className,
  showHoverEffect = true,
  onClick,
}: CardImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const { width, height } = SIZE_DIMENSIONS[size];

  const imageUri =
    size === 'small'
      ? card.image_uri_small
      : size === 'large'
        ? card.image_uri_large
        : card.image_uri_normal;

  // Reset when card changes
  useEffect(() => {
    setStatus('loading');
    setErrorMsg('');
  }, [card.id, imageUri]);

  // Always render the img tag — never skip it based on error state
  // This way we can see if images truly fail or if it's a state issue
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl',
        showHoverEffect && 'card-hover cursor-pointer',
        className
      )}
      style={{ width, height }}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUri || ''}
        alt={card.name}
        width={width}
        height={height}
        className="rounded-xl object-cover"
        style={{ display: 'block', width, height }}
        onLoad={() => setStatus('loaded')}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          setErrorMsg(`ERR: src=${target.src?.substring(0, 50) || 'EMPTY'}`);
          setStatus('error');
        }}
      />
      {/* Debug overlay - always visible */}
      {DEBUG_IMAGES && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 text-[8px] text-white break-all">
          <div>status: {status}</div>
          <div>uri: {imageUri ? imageUri.substring(0, 50) + '...' : 'NULL'}</div>
          <div>keys: {Object.keys(card).filter(k => k.includes('image')).join(', ') || 'NO IMAGE KEYS'}</div>
          <div>allKeys: {Object.keys(card).length} total</div>
          {errorMsg && <div className="text-red-400">{errorMsg}</div>}
        </div>
      )}
      {/* Fallback content when no image */}
      {(status === 'error' || !imageUri) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border bg-card/90 p-3 text-center">
          <div className="mb-2 text-2xl">{'\u{1F0CF}'}</div>
          <span className="text-xs font-medium text-foreground line-clamp-2">
            {card.name}
          </span>
          <span className="mt-1 text-[10px] text-muted-foreground">
            {card.type_line}
          </span>
          {/* Debug info visible on card */}
          {DEBUG_IMAGES && (
            <div className="mt-2 text-[7px] text-yellow-500 break-all max-w-full">
              {imageUri ? `URL: ${imageUri.substring(0, 60)}` : 'NO URL'}
              <div>keys: {Object.keys(card).filter(k => k.includes('image')).join(', ') || 'NO IMAGE KEYS'}</div>
              <div>{Object.keys(card).length} keys total</div>
              {errorMsg && <div className="text-red-400">{errorMsg}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CardImageSmall({
  card,
  className,
  onClick,
}: {
  card: DbCard;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <CardImage
      card={card}
      size="small"
      className={className}
      onClick={onClick}
    />
  );
}
