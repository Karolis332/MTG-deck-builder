'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DeckCardEntry } from '@/lib/types';
import { exportToArena, exportToText, exportToMtgo } from '@/lib/deck-export';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  deckName: string;
  cards: DeckCardEntry[];
}

type ExportFormat = 'arena' | 'text' | 'mtgo';

export function ExportDialog({ open, onClose, deckName, cards }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('arena');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const getExportText = () => {
    switch (format) {
      case 'arena':
        return exportToArena(deckName, cards);
      case 'text':
        return exportToText(deckName, cards);
      case 'mtgo':
        return exportToMtgo(deckName, cards);
    }
  };

  const exportText = getExportText();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName.replace(/[^a-z0-9]/gi, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Export Deck</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            &times;
          </button>
        </div>

        {/* Format selection */}
        <div className="mb-3 flex rounded-lg bg-accent/50 p-0.5">
          {([
            { key: 'arena' as const, label: 'Arena' },
            { key: 'text' as const, label: 'Text' },
            { key: 'mtgo' as const, label: 'MTGO' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFormat(key)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                format === key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Export preview */}
        <pre className="mb-3 max-h-64 overflow-auto rounded-xl border border-border bg-background p-3 text-xs font-mono text-muted-foreground">
          {exportText}
        </pre>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleDownload}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Download .txt
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
