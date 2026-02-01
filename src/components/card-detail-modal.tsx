'use client';

import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import { ManaCost } from './mana-cost';
import { RARITY_COLORS, FORMAT_LABELS } from '@/lib/constants';

interface CardDetailModalProps {
  card: DbCard | null;
  onClose: () => void;
  onAddToDeck?: (card: DbCard) => void;
}

export function CardDetailModal({ card, onClose, onAddToDeck }: CardDetailModalProps) {
  if (!card) return null;

  const colors: string[] = card.colors ? JSON.parse(card.colors) : [];
  const legalities: Record<string, string> = card.legalities
    ? JSON.parse(card.legalities)
    : {};

  const legalFormats = Object.entries(legalities)
    .filter(([, v]) => v === 'legal')
    .map(([k]) => k);
  const bannedFormats = Object.entries(legalities)
    .filter(([, v]) => v === 'banned' || v === 'not_legal')
    .map(([k]) => k);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:flex-row">
        {/* Card image */}
        <div className="flex shrink-0 items-center justify-center bg-black/20 p-4 sm:w-[280px]">
          {card.image_uri_normal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_uri_normal}
              alt={card.name}
              className="max-h-[380px] w-auto rounded-xl shadow-lg"
            />
          ) : (
            <div className="flex h-[340px] w-[244px] items-center justify-center rounded-xl border border-border bg-accent">
              <span className="text-sm text-muted-foreground">{card.name}</span>
            </div>
          )}
        </div>

        {/* Card details */}
        <div className="flex flex-1 flex-col overflow-auto p-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="mb-3">
            <h2 className="text-lg font-bold">{card.name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <ManaCost cost={card.mana_cost} size="sm" />
              <span
                className={cn(
                  'text-xs capitalize',
                  RARITY_COLORS[card.rarity] || 'text-foreground'
                )}
              >
                {card.rarity}
              </span>
            </div>
          </div>

          {/* Type line */}
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {card.type_line}
          </div>

          {/* Oracle text */}
          {card.oracle_text && (
            <div className="mb-3 whitespace-pre-line rounded-lg bg-accent/50 p-3 text-xs leading-relaxed text-foreground">
              {card.oracle_text}
            </div>
          )}

          {/* Power / Toughness / Loyalty */}
          <div className="mb-3 flex gap-4 text-xs">
            {card.power !== null && card.toughness !== null && (
              <div>
                <span className="text-muted-foreground">P/T: </span>
                <span className="font-medium">{card.power}/{card.toughness}</span>
              </div>
            )}
            {card.loyalty !== null && (
              <div>
                <span className="text-muted-foreground">Loyalty: </span>
                <span className="font-medium">{card.loyalty}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">CMC: </span>
              <span className="font-medium">{card.cmc}</span>
            </div>
          </div>

          {/* Set info */}
          <div className="mb-3 text-xs">
            <span className="text-muted-foreground">Set: </span>
            <span className="font-medium">{card.set_name}</span>
            <span className="ml-1 text-muted-foreground">
              ({card.set_code.toUpperCase()} #{card.collector_number})
            </span>
          </div>

          {/* Pricing */}
          {(card.price_usd || card.price_usd_foil) && (
            <div className="mb-3 flex gap-4 text-xs">
              {card.price_usd && (
                <div>
                  <span className="text-muted-foreground">Price: </span>
                  <span className="font-medium">${card.price_usd}</span>
                </div>
              )}
              {card.price_usd_foil && (
                <div>
                  <span className="text-muted-foreground">Foil: </span>
                  <span className="font-medium">${card.price_usd_foil}</span>
                </div>
              )}
            </div>
          )}

          {/* Format legality */}
          <div className="mb-3">
            <div className="mb-1 text-xs text-muted-foreground">Format Legality</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(legalities)
                .filter(([k]) => FORMAT_LABELS[k])
                .map(([format, status]) => (
                  <span
                    key={format}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      status === 'legal'
                        ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                        : status === 'restricted'
                          ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                          : 'bg-red-500/10 text-red-400/60'
                    )}
                  >
                    {FORMAT_LABELS[format] || format}
                  </span>
                ))}
            </div>
          </div>

          {/* Add to deck button */}
          {onAddToDeck && (
            <button
              onClick={() => onAddToDeck(card)}
              className="mt-auto rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add to Deck
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
