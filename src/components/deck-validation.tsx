'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { validateDeck, type ValidationIssue } from '@/lib/deck-validation';
import type { DbCard } from '@/lib/types';

interface DeckValidationProps {
  cards: Array<{ card_id: string; quantity: number; board: string; card: DbCard }>;
  format: string | null;
  className?: string;
}

export function DeckValidation({ cards, format, className }: DeckValidationProps) {
  const issues = useMemo(() => validateDeck(cards, format), [cards, format]);

  if (issues.length === 0) {
    return (
      <div className={cn('flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2', className)}>
        <CheckIcon className="h-3.5 w-3.5 text-green-500" />
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          Deck is valid
        </span>
      </div>
    );
  }

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  return (
    <div className={cn('space-y-1.5', className)}>
      {errors.map((issue, i) => (
        <IssueRow key={`e-${i}`} issue={issue} />
      ))}
      {warnings.map((issue, i) => (
        <IssueRow key={`w-${i}`} issue={issue} />
      ))}
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const isError = issue.level === 'error';
  return (
    <div
      className={cn(
        'flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs',
        isError ? 'bg-red-500/10' : 'bg-yellow-500/10'
      )}
    >
      {isError ? (
        <XCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
      ) : (
        <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
      )}
      <span
        className={cn(
          'font-medium',
          isError
            ? 'text-red-600 dark:text-red-400'
            : 'text-yellow-600 dark:text-yellow-400'
        )}
      >
        {issue.message}
      </span>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
