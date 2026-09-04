'use client';

import { cn } from '@/lib/utils';
import type { TurnLane } from './match-stats';
import { isGrpId } from './match-stats';

export interface ResolvedCard {
  name: string;
  image_uri_small: string | null;
  image_uri_normal: string | null;
}

export type CardResolver = (idOrName: string) => ResolvedCard;

/** Builds a resolver over the telemetry endpoint's grpIdCards + name→image maps. */
export function makeResolver(
  grpIdCards: Record<string, { card_name: string; image_uri_small: string | null; image_uri_normal: string | null }>,
  cards: Record<string, { image_uri_small: string | null; image_uri_normal: string | null }>,
): CardResolver {
  return (idOrName) => {
    if (isGrpId(idOrName)) {
      const hit = grpIdCards[idOrName];
      return hit
        ? { name: hit.card_name, image_uri_small: hit.image_uri_small, image_uri_normal: hit.image_uri_normal }
        : { name: `#${idOrName}`, image_uri_small: null, image_uri_normal: null };
    }
    const img = cards[idOrName];
    return { name: idOrName, image_uri_small: img?.image_uri_small ?? null, image_uri_normal: img?.image_uri_normal ?? null };
  };
}

interface ChipProps {
  card: ResolvedCard;
  onClick?: (name: string) => void;
  tone?: 'you' | 'opp' | 'land';
}

export function CardChip({ card, onClick, tone = 'you' }: ChipProps) {
  const unresolved = card.name.startsWith('#');
  const clickable = !!onClick && !unresolved;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onClick!(card.name)}
      title={unresolved ? 'Unresolved Arena card id' : card.name}
      className={cn(
        'inline-flex max-w-[140px] items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-tight',
        tone === 'you' && 'border-primary/30 bg-primary/10 text-foreground',
        tone === 'opp' && 'border-red-500/30 bg-red-500/10 text-foreground',
        tone === 'land' && 'border-green-500/30 bg-green-500/10 text-foreground/80',
        unresolved && 'italic text-muted-foreground',
        clickable ? 'cursor-pointer hover:brightness-125' : 'cursor-default',
      )}
    >
      {card.image_uri_small && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.image_uri_small} alt="" className="h-5 w-[14px] rounded-[2px] object-cover" loading="lazy" />
      )}
      <span className="truncate">{card.name}</span>
    </button>
  );
}

interface TurnTimelineProps {
  lanes: TurnLane[];
  resolve: CardResolver;
  onOpenCard?: (name: string) => void;
}

export function TurnTimeline({ lanes, resolve, onOpenCard }: TurnTimelineProps) {
  if (lanes.length === 0) {
    return <p className="py-3 text-center text-xs text-muted-foreground">No per-turn data for this match.</p>;
  }
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>Turn</span>
        <span>You</span>
        <span>Opponent</span>
      </div>
      {lanes.map((lane) => (
        <div key={lane.turn} className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 rounded-md border border-border/40 bg-background/40 px-1 py-1">
          <div className="flex flex-col items-start">
            <span className="hud-number text-sm font-bold">{lane.turn}</span>
            {lane.life && (
              <span className="text-[9px] tabular-nums text-muted-foreground" title="Life: you / opponent">
                {lane.life.player}/{lane.life.opponent}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {lane.lands.map((id, i) => <CardChip key={`l${i}`} card={resolve(id)} onClick={onOpenCard} tone="land" />)}
            {lane.you.map((id, i) => <CardChip key={`y${i}`} card={resolve(id)} onClick={onOpenCard} tone="you" />)}
            {lane.lands.length + lane.you.length === 0 && <span className="text-[10px] text-muted-foreground/50">—</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            {lane.opponent.map((id, i) => <CardChip key={`o${i}`} card={resolve(id)} onClick={onOpenCard} tone="opp" />)}
            {lane.opponent.length === 0 && <span className="text-[10px] text-muted-foreground/50">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
