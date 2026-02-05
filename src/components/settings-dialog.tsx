'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { isElectron, getElectronAPI } from '@/lib/electron-bridge';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [maskedAnthropicKey, setMaskedAnthropicKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [anthropicMessage, setAnthropicMessage] = useState('');
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-5-20250929');

  // Data export state
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  // Arena integration state
  const [arenaLogPath, setArenaLogPath] = useState('');
  const [watcherRunning, setWatcherRunning] = useState(false);
  const [watcherMatchCount, setWatcherMatchCount] = useState(0);
  const [arenaMessage, setArenaMessage] = useState('');
  const [parsingLog, setParsingLog] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [arenaCoverage, setArenaCoverage] = useState<{ total: number; withArenaId: number } | null>(null);

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
        if (data.settings?.anthropic_api_key) {
          setMaskedAnthropicKey(data.settings.anthropic_api_key);
        } else {
          setMaskedAnthropicKey('');
        }
        if (data.settings?.arena_log_path) {
          setArenaLogPath(data.settings.arena_log_path);
        }
        if (data.settings?.claude_model) {
          setClaudeModel(data.settings.claude_model);
        }
        setOpenaiKey('');
        setAnthropicKey('');
        setMessage('');
        setAnthropicMessage('');
        setArenaMessage('');
      })
      .catch(() => {});

    // Load Electron-specific data
    if (isElectron()) {
      const api = getElectronAPI()!;
      api.getWatcherStatus().then((s) => {
        setWatcherRunning(s.running);
        if (s.logPath) setArenaLogPath(s.logPath);
        setWatcherMatchCount(s.matchCount);
      });
      // Load arena ID coverage
      fetch('/api/mtgjson-enrich')
        .then((r) => r.json())
        .then((data) => setArenaCoverage(data.coverage))
        .catch(() => {});
    }
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

  const saveAnthropicKey = useCallback(async () => {
    if (!anthropicKey.trim()) return;
    setSaving(true);
    setAnthropicMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'anthropic_api_key', value: anthropicKey.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setAnthropicMessage('Anthropic API key saved successfully');
        setMaskedAnthropicKey(anthropicKey.slice(0, 4) + '...' + anthropicKey.slice(-4));
        setAnthropicKey('');
      } else {
        setAnthropicMessage('Failed to save: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setAnthropicMessage('Failed to save API key');
    } finally {
      setSaving(false);
    }
  }, [anthropicKey]);

  const removeAnthropicKey = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'anthropic_api_key', value: '' }),
      });
      setMaskedAnthropicKey('');
      setAnthropicKey('');
      setAnthropicMessage('Anthropic API key removed');
    } catch {
      setAnthropicMessage('Failed to remove API key');
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Arena integration handlers ─────────────────────────────────────────────

  const browseForLog = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) return;
    const path = await api.selectArenaLogPath();
    if (path) {
      setArenaLogPath(path);
      // Persist the path
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'arena_log_path', value: path }),
      });
      setArenaMessage('Log path saved');
    }
  }, []);

  const detectDefault = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) return;
    const path = await api.getDefaultArenaLogPath();
    setArenaLogPath(path);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'arena_log_path', value: path }),
    });
    setArenaMessage('Default path detected');
  }, []);

  const toggleWatcher = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) return;

    if (watcherRunning) {
      await api.stopWatcher();
      setWatcherRunning(false);
      setArenaMessage('Watcher stopped');
    } else {
      if (!arenaLogPath) {
        setArenaMessage('Set the Arena log path first');
        return;
      }
      const result = await api.startWatcher(arenaLogPath);
      if (result.ok) {
        setWatcherRunning(true);
        setArenaMessage('Watcher started — monitoring for new matches');
      } else {
        setArenaMessage(`Failed: ${result.error}`);
      }
    }
  }, [watcherRunning, arenaLogPath]);

  const parseFullLog = useCallback(async () => {
    const api = getElectronAPI();
    if (!api || !arenaLogPath) return;

    setParsingLog(true);
    setArenaMessage('Parsing full log file...');
    try {
      const result = await api.parseFullLog(arenaLogPath);
      const matchCount = (result.matches as unknown[]).length;
      const hasCollection = result.collection !== null;

      // Send matches to API
      for (const match of result.matches as Array<Record<string, unknown>>) {
        await fetch('/api/arena-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(match),
        });
      }

      // Send collection to API
      if (result.collection) {
        await fetch('/api/arena-collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection: result.collection }),
        });
      }

      setArenaMessage(
        `Imported ${matchCount} matches${hasCollection ? ' + collection data' : ''}`
      );
    } catch (err) {
      setArenaMessage(`Parse failed: ${err}`);
    } finally {
      setParsingLog(false);
    }
  }, [arenaLogPath]);

  const [enrichProgress, setEnrichProgress] = useState<{
    phase: string;
    downloadedBytes: number;
    totalBytes: number;
    cardsUpdated: number;
    totalMappings: number;
  } | null>(null);

  // Poll enrichment progress when running
  useEffect(() => {
    if (!enriching) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/mtgjson-enrich?progress=true');
        const data = await res.json();
        setEnrichProgress(data.progress);
        if (data.coverage) setArenaCoverage(data.coverage);
        if (data.progress.phase === 'done') {
          setEnriching(false);
          setArenaMessage(`Enriched ${data.progress.cardsUpdated} cards with Arena IDs`);
        } else if (data.progress.phase === 'error') {
          setEnriching(false);
          setArenaMessage(`Enrichment failed: ${data.progress.error || 'Unknown error'}`);
        } else if (data.progress.phase === 'cancelled') {
          setEnriching(false);
          setArenaMessage('Enrichment cancelled');
        }
      } catch {
        // ignore polling errors
      }
    }, 500);
    return () => clearInterval(interval);
  }, [enriching]);

  const runEnrichment = useCallback(async () => {
    setEnriching(true);
    setEnrichProgress(null);
    setArenaMessage('');
    try {
      const res = await fetch('/api/mtgjson-enrich', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) {
        setArenaMessage(`Enrichment failed: ${data.error}`);
        setEnriching(false);
      }
      // Progress is tracked via polling above
    } catch (err) {
      setArenaMessage(`Enrichment failed: ${err}`);
      setEnriching(false);
    }
  }, []);

  const cancelEnrich = useCallback(async () => {
    try {
      await fetch('/api/mtgjson-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
    } catch {
      // ignore
    }
  }, []);

  const exportData = useCallback(async () => {
    setExporting(true);
    setExportMessage('');
    try {
      const res = await fetch('/api/data-export');
      if (!res.ok) {
        const err = await res.json();
        setExportMessage(`Export failed: ${err.error || 'Unknown error'}`);
        return;
      }
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `mtg-deck-builder-export-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportMessage(
        `Exported ${data.stats.arenaMatches} matches, ${data.stats.decks} decks, ${data.stats.collectionCards} collection cards`
      );
    } catch (err) {
      setExportMessage(`Export failed: ${err}`);
    } finally {
      setExporting(false);
    }
  }, []);

  if (!open) return null;

  const electronMode = isElectron();
  const coveragePct = arenaCoverage && arenaCoverage.total > 0
    ? Math.round((arenaCoverage.withArenaId / arenaCoverage.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn(
          'w-full rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto',
          electronMode ? 'max-w-lg max-h-[90vh]' : 'max-w-md'
        )}
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
              Uses GPT-4o for high-quality analysis.
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

          {/* Anthropic API Key */}
          <div className="border-t border-border pt-3">
            <label className="mb-1 block text-sm font-medium">Anthropic API Key (Recommended)</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Claude Sonnet 4.5 provides superior MTG deck building intelligence with deep strategic knowledge.
              Highly recommended for best suggestions!
            </p>
            {maskedAnthropicKey && (
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-accent px-2 py-1 font-mono text-xs">
                  {maskedAnthropicKey}
                </span>
                <button
                  onClick={removeAnthropicKey}
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
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={maskedAnthropicKey ? 'Enter new key to replace' : 'sk-ant-...'}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveAnthropicKey}
                disabled={saving || !anthropicKey.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {anthropicMessage && (
              <p className={cn(
                'mt-2 text-xs',
                anthropicMessage.includes('success') || anthropicMessage.includes('saved') ? 'text-green-400' : 'text-muted-foreground'
              )}>
                {anthropicMessage}
              </p>
            )}
          </div>

          {/* Claude Model Selection */}
          <div className="border-t border-border pt-3">
            <label className="mb-1 block text-sm font-medium">Claude Model</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Opus 4.6 gives the best suggestions but costs ~5x more per request.
            </p>
            <select
              value={claudeModel}
              onChange={async (e) => {
                const newModel = e.target.value;
                setClaudeModel(newModel);
                try {
                  await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'claude_model', value: newModel }),
                  });
                } catch {}
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (fast, recommended)</option>
              <option value="claude-opus-4-6">Claude Opus 4.6 (best quality, slower)</option>
            </select>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground">
              AI Suggestion Priority: Claude &gt; Ollama (local) &gt; OpenAI GPT-4o &gt; Synergy Engine.
              Your API keys are stored locally and never sent to third parties.
            </p>
          </div>
        </div>

        {/* Data Export */}
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-bold">Data Export</h3>
          <p className="text-xs text-muted-foreground">
            Export your match data, decks, and collection as a JSON file.
            Share exports to help improve the ML model.
          </p>
          <button
            onClick={exportData}
            disabled={exporting}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export Match Data'}
          </button>
          {exportMessage && (
            <p className={cn(
              'text-xs',
              exportMessage.includes('Exported') ? 'text-green-400' : 'text-red-400'
            )}>
              {exportMessage}
            </p>
          )}
        </div>

        {/* Arena Integration — Electron only */}
        {electronMode && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-bold">Arena Integration</h3>
            <p className="text-xs text-muted-foreground">
              Enable Detailed Logs in Arena: Options &rarr; Account &rarr; Detailed Logs (Plugin Support). Restart the client.
            </p>

            {/* Log path */}
            <div>
              <label className="mb-1 block text-xs font-medium">Arena Log Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={arenaLogPath}
                  onChange={(e) => setArenaLogPath(e.target.value)}
                  placeholder="Path to Player.log"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary font-mono"
                />
                <button
                  onClick={browseForLog}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  Browse
                </button>
              </div>
              <button
                onClick={detectDefault}
                className="mt-1 text-[10px] text-primary hover:underline"
              >
                Detect default path
              </button>
            </div>

            {/* Watcher toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium">Live Watcher</span>
                {watcherRunning && (
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {watcherMatchCount} matches found
                  </span>
                )}
              </div>
              <button
                onClick={toggleWatcher}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  watcherRunning
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                )}
              >
                <span className={cn(
                  'mr-1.5 inline-block h-2 w-2 rounded-full',
                  watcherRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                )} />
                {watcherRunning ? 'Stop' : 'Start'}
              </button>
            </div>

            {/* Parse full log */}
            <button
              onClick={parseFullLog}
              disabled={parsingLog || !arenaLogPath}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              {parsingLog ? 'Parsing...' : 'Parse Full Log (import history + collection)'}
            </button>

            {/* MTGJSON enrichment */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium">Arena ID Coverage</span>
                  {arenaCoverage && (
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {arenaCoverage.withArenaId}/{arenaCoverage.total} cards ({coveragePct}%)
                    </span>
                  )}
                </div>
                {enriching ? (
                  <button
                    onClick={cancelEnrich}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={runEnrichment}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                  >
                    Enrich from MTGJSON
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {enriching && enrichProgress && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      {enrichProgress.phase === 'downloading' && 'Downloading MTGJSON data...'}
                      {enrichProgress.phase === 'parsing' && 'Parsing card data...'}
                      {enrichProgress.phase === 'updating' && `Updating database... ${enrichProgress.cardsUpdated}/${enrichProgress.totalMappings}`}
                    </span>
                    {enrichProgress.phase === 'downloading' && enrichProgress.totalBytes > 0 && (
                      <span>
                        {Math.round(enrichProgress.downloadedBytes / 1024 / 1024)}MB / {Math.round(enrichProgress.totalBytes / 1024 / 1024)}MB
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${
                          enrichProgress.phase === 'downloading'
                            ? enrichProgress.totalBytes > 0
                              ? Math.min((enrichProgress.downloadedBytes / enrichProgress.totalBytes) * 70, 70)
                              : 30
                            : enrichProgress.phase === 'parsing'
                              ? 75
                              : enrichProgress.phase === 'updating'
                                ? enrichProgress.totalMappings > 0
                                  ? 80 + (enrichProgress.cardsUpdated / enrichProgress.totalMappings) * 20
                                  : 85
                                : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {!enriching && coveragePct < 50 && arenaCoverage && arenaCoverage.total > 0 && (
                <p className="mt-1 text-[10px] text-amber-400">
                  Low coverage — run enrichment to enable Arena ID resolution for matches and collection sync.
                </p>
              )}
            </div>

            {arenaMessage && (
              <p className={cn(
                'text-xs',
                arenaMessage.includes('Imported') || arenaMessage.includes('started') || arenaMessage.includes('Enriched')
                  ? 'text-green-400'
                  : arenaMessage.includes('Failed') || arenaMessage.includes('failed')
                    ? 'text-red-400'
                    : 'text-muted-foreground'
              )}>
                {arenaMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
