'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.openai_api_key) {
          setMaskedKey(data.settings.openai_api_key);
        } else {
          setMaskedKey('');
        }
        setOpenaiKey('');
        setMessage('');
      })
      .catch(() => {});
  }, [open]);

  const saveKey = useCallback(async () => {
    if (!openaiKey.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'openai_api_key', value: openaiKey.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage('API key saved successfully');
        setMaskedKey(openaiKey.slice(0, 4) + '...' + openaiKey.slice(-4));
        setOpenaiKey('');
      } else {
        setMessage('Failed to save: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setMessage('Failed to save API key');
    } finally {
      setSaving(false);
    }
  }, [openaiKey]);

  const removeKey = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'openai_api_key', value: '' }),
      });
      setMaskedKey('');
      setOpenaiKey('');
      setMessage('API key removed');
    } catch {
      setMessage('Failed to remove API key');
    } finally {
      setSaving(false);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>

        {/* OpenAI API Key */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">OpenAI API Key</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Provide your OpenAI API key to enable GPT-powered deck suggestions.
              Uses gpt-4o-mini for cost-effective analysis.
            </p>
            {maskedKey && (
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-accent px-2 py-1 font-mono text-xs">
                  {maskedKey}
                </span>
                <button
                  onClick={removeKey}
                  disabled={saving}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={maskedKey ? 'Enter new key to replace' : 'sk-...'}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveKey}
                disabled={saving || !openaiKey.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {message && (
            <p className={cn(
              'text-xs',
              message.includes('success') || message.includes('saved') ? 'text-green-400' : 'text-muted-foreground'
            )}>
              {message}
            </p>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground">
              AI Suggestion Priority: Ollama (local) &gt; OpenAI GPT &gt; Synergy Engine &gt; Rules Engine.
              Your API key is stored locally in your database and never sent to third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
