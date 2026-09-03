'use client';

import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, type CardCategory } from '@/lib/card-classifier';

const ROLE_OPTIONS: CardCategory[] = [
  'ramp', 'draw', 'tutor', 'removal', 'board_wipe', 'protection', 'synergy', 'win_condition', 'utility', 'land',
];

interface DeckRoleChipProps {
  /** Auto-classified role, shown when no manual override is set. */
  autoRole: CardCategory;
  /** Manual override, if any. */
  roleOverride?: string | null;
  onChange: (role: string | null) => void;
  className?: string;
}

// Small per-row role dropdown: "auto" clears the override, any other pick pins it.
export function DeckRoleChip({ autoRole, roleOverride, onChange, className }: DeckRoleChipProps) {
  const isManual = !!roleOverride;
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <select
        value={roleOverride ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'rounded border bg-card px-1 py-0.5 text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:border-foreground/30',
          isManual && 'opacity-100 border-primary/50 text-primary'
        )}
        title="Role"
      >
        <option value="">Auto ({CATEGORY_LABELS[autoRole]})</option>
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {CATEGORY_LABELS[r]}
          </option>
        ))}
      </select>
      {isManual && (
        <span className="text-[8px] text-primary/70" title="Manually assigned role">
          manual
        </span>
      )}
    </span>
  );
}
