'use client';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TONE_BORDER: Record<string, string> = {
  ok: 'border-primary/40',
  warn: 'border-yellow-500/50',
  error: 'border-red-500/50',
};

/** Mounted once at the top of the deck editor page — renders the live toast stack. */
export function ToastHost() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'hud-panel animate-slide-up pointer-events-auto flex items-center gap-2 px-3 py-2 text-xs',
            TONE_BORDER[t.tone]
          )}
        >
          <span className="flex-1">{t.title}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 font-medium text-primary hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
