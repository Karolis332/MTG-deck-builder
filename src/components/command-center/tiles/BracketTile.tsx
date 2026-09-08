'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { classifyBracket } from '@/lib/bracket';
import { TileFrame } from './TileFrame';
import { useTickOnChange } from './useTickOnChange';
import type { LiveRailDeck } from './types';
import type { DbCard } from '@/lib/types';

interface BracketTileProps {
  deck: LiveRailDeck;
  onOpenCard: (card: DbCard) => void;
  onAskConsultant: (prompt: string) => void;
  onSetTargetBracket: (n: number) => void;
}

/** Pure — exported for tests. */
export function bracketMatchColor(bracket: number, target: number): string {
  if (bracket === target) return 'text-green-400';
  return bracket > target ? 'text-orange-400' : 'text-blue-400';
}

function CardChip({ name, onClick, onSwap }: { name: string; onClick: () => void; onSwap?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-[13px]">
      <button type="button" onClick={onClick} className="hover:text-primary hover:underline">
        {name}
      </button>
      {onSwap && (
        <button type="button" onClick={onSwap} className="text-muted-foreground hover:text-primary" title="Swap out">
          ⇄
        </button>
      )}
    </span>
  );
}

export function BracketTile({ deck, onOpenCard, onAskConsultant, onSetTargetBracket }: BracketTileProps) {
  const target = deck.target_bracket ?? 3;

  const result = useMemo(() => {
    const cards = deck.cards.filter((c) => c.board === 'main' || c.board === 'commander');
    const commanderNames = deck.cards.filter((c) => c.board === 'commander').map((c) => c.name);
    return classifyBracket(
      cards.map((c) => ({
        name: c.name,
        oracle_text: c.oracle_text,
        type_line: c.type_line,
        cmc: c.cmc,
        game_changer: c.game_changer,
      })),
      { commanderNames }
    );
  }, [deck.cards]);

  const ticking = useTickOnChange(result.bracket);
  const matchColor = bracketMatchColor(result.bracket, target);

  const byName = useMemo(() => new Map(deck.cards.map((c) => [c.name, c])), [deck.cards]);
  const openByName = (name: string) => {
    const card = byName.get(name);
    if (card) onOpenCard(card);
  };
  const swapPrompt = (name: string) => onAskConsultant(`Suggest a bracket-${target} replacement for ${name}`);

  const groups: Array<{ label: string; cards: string[] }> = [
    { label: 'Game changers', cards: result.gameChangers },
    { label: 'Mass land denial', cards: result.massLandDenial },
    { label: 'Extra turns', cards: result.extraTurnCards },
    { label: 'Fast mana', cards: result.fastMana },
  ];

  return (
    <TileFrame
      title="Bracket"
      headline={
        <span className={cn('hud-number text-sm', matchColor, ticking && 'hud-tick')}>
          B{result.bracket} / target {target}
        </span>
      }
    >
      <div className="mb-2 flex items-center gap-1">
        {[2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSetTargetBracket(n)}
            className={cn(
              'rounded px-2 py-0.5 text-sm',
              n === target ? 'bg-primary/30 text-primary' : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {result.twoCardCombos.length > 0 && (
        <div className="mb-1 text-[13px] text-muted-foreground">
          Combos: {result.twoCardCombos.map((pair) => pair.join(' + ')).join(', ')}
        </div>
      )}

      {groups.map(
        (g) =>
          g.cards.length > 0 && (
            <div key={g.label} className="mb-1 flex flex-wrap items-center gap-1">
              <span className="text-[13px] text-muted-foreground">{g.label}:</span>
              {g.cards.map((name) => (
                <CardChip key={name} name={name} onClick={() => openByName(name)} onSwap={() => swapPrompt(name)} />
              ))}
            </div>
          )
      )}

      {result.reasons.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-[13px] text-muted-foreground">
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </TileFrame>
  );
}
