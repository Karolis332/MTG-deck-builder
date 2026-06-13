'use client';

import { useState } from 'react';

interface PilotGuide {
  archetype: string;
  gameplan: string;
  mulligan: string[];
  turns: Array<{ phase: string; advice: string }>;
  keyCards: Array<{ name: string; why: string }>;
  signatureLines: string[];
  pitfalls: string[];
}

interface PilotGuidePanelProps {
  deckId: number;
  className?: string;
}

export function PilotGuidePanel({ deckId, className }: PilotGuidePanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guide, setGuide] = useState<PilotGuide | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/decks/pilot-guide?deckId=${deckId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build guide');
      setGuide(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !guide && !loading) void load();
  }

  return (
    <div className={className}>
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/30"
      >
        <span className="font-heading text-sm font-semibold tracking-wide text-primary">
          How to Pilot This Deck
        </span>
        <span className="text-xs capitalize text-muted-foreground">
          {guide ? guide.archetype : open ? '…' : 'show'}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-xl border border-border bg-background/60 p-3 text-sm">
          {loading && <div className="text-muted-foreground">Analyzing the deck…</div>}
          {error && <div className="text-red-400">{error}</div>}
          {guide && (
            <>
              <p className="italic text-muted-foreground">{guide.gameplan}</p>

              <Section title="Mulligan">
                <ul className="space-y-0.5">
                  {guide.mulligan.map((m, i) => <li key={i}>• {m}</li>)}
                </ul>
              </Section>

              <Section title="Turn plan">
                <ul className="space-y-1">
                  {guide.turns.map((t, i) => (
                    <li key={i}><span className="font-semibold text-foreground/90">{t.phase}:</span> <span className="text-muted-foreground">{t.advice}</span></li>
                  ))}
                </ul>
              </Section>

              {guide.signatureLines.length > 0 && (
                <Section title="Signature lines">
                  <ul className="space-y-0.5 text-emerald-300/90">
                    {guide.signatureLines.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </Section>
              )}

              {guide.keyCards.length > 0 && (
                <Section title="Key cards">
                  <ul className="space-y-0.5">
                    {guide.keyCards.map((k, i) => (
                      <li key={i}><span className="font-semibold">{k.name}</span> <span className="text-muted-foreground">— {k.why}</span></li>
                    ))}
                  </ul>
                </Section>
              )}

              {guide.pitfalls.length > 0 && (
                <Section title="Watch out for">
                  <ul className="space-y-0.5 text-amber-300/90">
                    {guide.pitfalls.map((p, i) => <li key={i}>• {p}</li>)}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary/80">{title}</div>
      {children}
    </div>
  );
}
