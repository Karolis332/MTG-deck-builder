'use client';

import { useState } from 'react';
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

export function CardImage({
  card,
  size = 'normal',
  className,
  showHoverEffect = true,
  onClick,
}: CardImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { width, height } = SIZE_DIMENSIONS[size];

  const imageUri =
    size === 'small'
      ? card.image_uri_small
      : size === 'large'
        ? card.image_uri_large
        : card.image_uri_normal;

  if (!imageUri || hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center',
          showHoverEffect && 'card-hover cursor-pointer',
          className
        )}
        style={{ width, height }}
        onClick={onClick}
      >
        <div className="mb-2 text-2xl">{'\u{1F0CF}'}</div>
        <span className="text-xs font-medium text-foreground line-clamp-2">
          {card.name}
        </span>
        <span className="mt-1 text-[10px] text-muted-foreground">
          {card.type_line}
        </span>
      </div>
    );
  }

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
      {isLoading && (
        <div
          className="absolute inset-0 skeleton rounded-xl"
          style={{ width, height }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUri}
        alt={card.name}
        width={width}
        height={height}
        className={cn(
          'rounded-xl transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        loading={size === 'small' ? 'lazy' : 'eager'}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
      />
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
