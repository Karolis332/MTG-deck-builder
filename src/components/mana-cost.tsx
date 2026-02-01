'use client';

import { cn } from '@/lib/utils';

const MANA_SYMBOLS: Record<string, { bg: string; text: string; label: string }> = {
  W: { bg: 'bg-amber-50', text: 'text-amber-900', label: 'White' },
  U: { bg: 'bg-blue-500', text: 'text-white', label: 'Blue' },
  B: { bg: 'bg-zinc-800', text: 'text-zinc-100', label: 'Black' },
  R: { bg: 'bg-red-500', text: 'text-white', label: 'Red' },
  G: { bg: 'bg-green-600', text: 'text-white', label: 'Green' },
  C: { bg: 'bg-zinc-300', text: 'text-zinc-700', label: 'Colorless' },
  X: { bg: 'bg-zinc-400', text: 'text-zinc-900', label: 'X' },
  S: { bg: 'bg-zinc-200', text: 'text-zinc-800', label: 'Snow' },
};

for (let i = 0; i <= 20; i++) {
  MANA_SYMBOLS[String(i)] = {
    bg: 'bg-zinc-300',
    text: 'text-zinc-800',
    label: `${i} Generic`,
  };
}

function parseManaCost(cost: string): string[] {
  const symbols: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(cost)) !== null) {
    symbols.push(match[1]);
  }
  return symbols;
}

export function ManaCost({
  cost,
  size = 'sm',
  className,
}: {
  cost: string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  if (!cost) return null;

  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;

  const sizeClasses = {
    xs: 'h-3.5 w-3.5 text-[8px]',
    sm: 'h-4.5 w-4.5 text-[9px]',
    md: 'h-5 w-5 text-[10px]',
    lg: 'h-6 w-6 text-xs',
  };

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {symbols.map((symbol, i) => {
        const config = MANA_SYMBOLS[symbol] || MANA_SYMBOLS['C'];
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center justify-center rounded-full font-bold shadow-sm',
              config.bg,
              config.text,
              sizeClasses[size]
            )}
            title={config.label}
            role="img"
            aria-label={config.label}
          >
            {symbol.length <= 2 ? symbol : '?'}
          </span>
        );
      })}
    </span>
  );
}

export function ColorIdentityPips({
  colors,
  size = 'sm',
  className,
}: {
  colors: string[];
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  if (!colors.length) {
    return <span className={cn('text-xs text-muted-foreground', className)}>Colorless</span>;
  }

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {colors.map((color) => {
        const config = MANA_SYMBOLS[color] || MANA_SYMBOLS['C'];
        return (
          <span
            key={color}
            className={cn(
              'inline-block rounded-full shadow-sm',
              config.bg,
              sizeClasses[size]
            )}
            title={config.label}
          />
        );
      })}
    </span>
  );
}
