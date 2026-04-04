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
  const [topdeckKey, setTopdeckKey] = useState('');
  const [maskedTopdeckKey, setMaskedTopdeckKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [anthropicMessage, setAnthropicMessage] = useState('');
  const [topdeckMessage, setTopdeckMessage] = useState('');
  const [cfApiUrl, setCfApiUrl] = useState('');
  const [cfApiKey, setCfApiKey] = useState('');
  const [maskedCfApiKey, setMaskedCfApiKey] = useState('');
  const [cfEnabled, setCfEnabled] = useState(true);
  const [cfMessage, setCfMessage] = useState('');
  const [cfTesting, setCfTesting] = useState(false);
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-5-20250929');
  const [openaiModel, setOpenaiModel] = useState('gpt-5.4');
  const [aiProvider, setAiProvider] = useState('auto');
  const [groqKey, setGroqKey] = useState('');
  const [maskedGroqKey, setMaskedGroqKey] = useState('');
  const [groqMessage, setGroqMessage] = useState('');
  const [groqTesting, setGroqTesting] = useState(false);
  const [xaiKey, setXaiKey] = useState('');
  const [maskedXaiKey, setMaskedXaiKey] = useState('');
  const [xaiMessage, setXaiMessage] = useState('');
  const [xaiTesting, setXaiTesting] = useState(false);
  const [cfModelVersion, setCfModelVersion] = useState('');

  // Data export state
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  // ML Pipeline state
  const [mlTraining, setMlTraining] = useState(false);
  const [mlTarget, setMlTarget] = useState('community');
  const [mlSteps, setMlSteps] = useState('aggregate-train-predict');
  const [mlOutput, setMlOutput] = useState<string[]>([]);
  const [mlMessage, setMlMessage] = useState('');

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
        if (data.settings?.topdeck_api_key) {
          setMaskedTopdeckKey(data.settings.topdeck_api_key);
        } else {
          setMaskedTopdeckKey('');
        }
        if (data.settings?.arena_log_path) {
          setArenaLogPath(data.settings.arena_log_path);
        }
        if (data.settings?.claude_model) {
          setClaudeModel(data.settings.claude_model);
        }
        if (data.settings?.openai_model) {
          setOpenaiModel(data.settings.openai_model);
        }
        if (data.settings?.ai_provider) {
          setAiProvider(data.settings.ai_provider);
        }
        if (data.settings?.cf_api_url) {
          setCfApiUrl(data.settings.cf_api_url);
        }
        if (data.settings?.cf_enabled !== undefined) {
          setCfEnabled(data.settings.cf_enabled !== 'false');
        }
        if (data.settings?.cf_api_key) {
          setMaskedCfApiKey(data.settings.cf_api_key);
        } else {
          setMaskedCfApiKey('');
        }
        // Load CF model version silently
        const cfUrl = data.settings?.cf_api_url || 'http://187.77.110.100/cf-api';
        fetch(`${cfUrl}/health`, { signal: AbortSignal.timeout(4000) })
          .then(r => r.json())
          .then(h => { if (h.model_version) setCfModelVersion(h.model_version); })
          .catch(() => {});
        if (data.settings?.groq_api_key) {
          setMaskedGroqKey(data.settings.groq_api_key);
        } else {
          setMaskedGroqKey('');
        }
        if (data.settings?.xai_api_key) {
          setMaskedXaiKey(data.settings.xai_api_key);
        } else {
          setMaskedXaiKey('');
        }
        setOpenaiKey('');
        setAnthropicKey('');
        setTopdeckKey('');
        setGroqKey('');
        setXaiKey('');
        setCfApiKey('');
        setMessage('');
        setAnthropicMessage('');
        setTopdeckMessage('');
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

  const saveTopdeckKey = useCallback(async () => {
    if (!topdeckKey.trim()) return;
    setSaving(true);
    setTopdeckMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'topdeck_api_key', value: topdeckKey.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setTopdeckMessage('TopDeck API key saved successfully');
        setMaskedTopdeckKey(topdeckKey.slice(0, 4) + '...' + topdeckKey.slice(-4));
        setTopdeckKey('');
      } else {
        setTopdeckMessage('Failed to save: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setTopdeckMessage('Failed to save API key');
    } finally {
      setSaving(false);
    }
  }, [topdeckKey]);

  const removeTopdeckKey = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'topdeck_api_key', value: '' }),
      });
      setMaskedTopdeckKey('');
      setTopdeckKey('');
      setTopdeckMessage('TopDeck API key removed');
    } catch {
      setTopdeckMessage('Failed to remove API key');
    } finally {
      setSaving(false);
    }
  }, []);

  // ── CF API handlers ───────────────────────────────────────────────────────

  const saveCfSettings = useCallback(async () => {
    setSaving(true);
    setCfMessage('');
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cf_api_url', value: cfApiUrl.trim() }),
      });
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cf_enabled', value: cfEnabled ? 'true' : 'false' }),
      });
      if (cfApiKey.trim()) {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'cf_api_key', value: cfApiKey.trim() }),
        });
        setMaskedCfApiKey(cfApiKey.trim().slice(0, 4) + '...' + cfApiKey.trim().slice(-4));
        setCfApiKey('');
      }
      setCfMessage('CF settings saved');
    } catch {
      setCfMessage('Failed to save CF settings');
    } finally {
      setSaving(false);
    }
  }, [cfApiUrl, cfEnabled, cfApiKey]);

  const testCfConnection = useCallback(async () => {
    setCfTesting(true);
    setCfMessage('');
    const url = cfApiUrl.trim() || 'http://187.77.110.100/cf-api';
    try {
      const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const data = await resp.json();
        setCfMessage(`Connected! ${data.deck_count || 0} decks, model: ${data.model_version || 'none'}`);
      } else {
        setCfMessage(`Connection failed: HTTP ${resp.status}`);
      }
    } catch {
      setCfMessage('Connection failed: API unreachable');
    } finally {
      setCfTesting(false);
    }
  }, [cfApiUrl]);

  const testGroqConnection = useCallback(async () => {
    setGroqTesting(true);
    setGroqMessage('');
    try {
      const resp = await fetch('/api/settings/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'groq' }),
      });
      const data = await resp.json();
      setGroqMessage(data.ok ? `Connected — ${data.model}` : `Failed: ${data.error}`);
    } catch {
      setGroqMessage('Connection failed');
    } finally {
      setGroqTesting(false);
    }
  }, []);

  const testXaiConnection = useCallback(async () => {
    setXaiTesting(true);
    setXaiMessage('');
    try {
      const resp = await fetch('/api/settings/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'xai' }),
      });
      const data = await resp.json();
      setXaiMessage(data.ok ? `Connected — ${data.model}` : `Failed: ${data.error}`);
    } catch {
      setXaiMessage('Connection failed');
    } finally {
      setXaiTesting(false);
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

  // ── ML Pipeline handlers ─────────────────────────────────────────────────

  const runMLPipeline = useCallback(async () => {
    setMlTraining(true);
    setMlOutput([]);
    setMlMessage('');

    const api = getElectronAPI();
    if (api) {
      // Electron path: real-time streaming via IPC
      const cleanup = api.onMLPipelineOutput((data) => {
        if (data.type === 'exit') {
          setMlTraining(false);
          setMlMessage(data.code === 0 ? 'Pipeline completed successfully' : `Pipeline failed (exit ${data.code})`);
        }
        setMlOutput((prev) => [...prev.slice(-199), data.line]);
      });

      const result = await api.runMLPipeline({ steps: mlSteps, target: mlTarget });
      if (!result.ok) {
        setMlTraining(false);
        setMlMessage(`Failed: ${result.error}`);
        cleanup();
      }
    } else {
      // Web fallback: POST to start, poll GET for progress
      try {
        const res = await fetch('/api/ml-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps: mlSteps, target: mlTarget }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setMlTraining(false);
          setMlMessage(`Failed: ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        setMlTraining(false);
        setMlMessage(`Failed to start pipeline: ${err}`);
      }
    }
  }, [mlSteps, mlTarget]);

  const cancelMLPipeline = useCallback(async () => {
    const api = getElectronAPI();
    if (api) {
      await api.cancelMLPipeline();
    } else {
      await fetch('/api/ml-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      }).catch(() => {});
    }
    setMlTraining(false);
    setMlMessage('Pipeline cancelled');
  }, []);

  // Poll ML pipeline progress (non-Electron fallback)
  useEffect(() => {
    if (!mlTraining || isElectron()) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/ml-pipeline');
        const data = await res.json();
        setMlOutput(data.lines || []);
        if (!data.running) {
          setMlTraining(false);
          setMlMessage(data.exitCode === 0 ? 'Pipeline completed successfully' : `Pipeline failed (exit ${data.exitCode})`);
          clearInterval(interval);
        }
      } catch {
        // ignore polling errors
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mlTraining]);

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
      a.download = `black-grimoire-export-${timestamp}.json`;
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
          electronMode ? 'max-w-lg max-h-[90vh]' : 'max-w-lg max-h-[90vh]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold tracking-wide text-primary">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>

        {/* Preferred AI Provider */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Preferred AI Provider</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Choose which AI to use for deck chat. Auto uses Claude first, then OpenAI.
            </p>
            <select
              value={aiProvider}
              onChange={async (e) => {
                const val = e.target.value;
                setAiProvider(val);
                try {
                  await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'ai_provider', value: val }),
                  });
                } catch {}
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="auto">Auto (Claude → OpenAI → Groq → Grok)</option>
              <option value="claude">Claude (Anthropic)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="groq">Groq (Llama 3.3 70B — free)</option>
              <option value="xai">xAI Grok ($25/mo free credits)</option>
            </select>
          </div>

          <div className="border-t border-border pt-3" />

          {/* OpenAI API Key */}
          <div>
            <label className="mb-1 block text-sm font-medium">OpenAI API Key</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Provide your OpenAI API key to enable GPT-powered deck suggestions.
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

          {/* OpenAI Model Selection */}
          <div className="border-t border-border pt-3">
            <label className="mb-1 block text-sm font-medium">OpenAI Model</label>
            <p className="mb-2 text-xs text-muted-foreground">
              GPT-5.4 is the latest and most capable. GPT-4o is cheaper but less accurate.
            </p>
            <select
              value={openaiModel}
              onChange={async (e) => {
                const newModel = e.target.value;
                setOpenaiModel(newModel);
                try {
                  await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'openai_model', value: newModel }),
                  });
                } catch {}
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="gpt-5.4">GPT-5.4 (best quality, recommended)</option>
              <option value="gpt-4o">GPT-4o (cheaper, older)</option>
            </select>
          </div>

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

          {/* Groq API Key */}
          <div className="border-t border-border pt-3">
            <label className="mb-1 block text-sm font-medium">Groq API Key (Free)</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Groq runs Llama 3.3 70B for free (30 req/min). Get a key at{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.groq.com</a>.
            </p>
            {maskedGroqKey && (
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-accent px-2 py-1 font-mono text-xs">
                  {maskedGroqKey}
                </span>
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await fetch('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'groq_api_key', value: '' }),
                      });
                      setMaskedGroqKey('');
                      setGroqKey('');
                      setGroqMessage('Key removed');
                    } catch {
                      setGroqMessage('Failed to remove');
                    } finally {
                      setSaving(false);
                    }
                  }}
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
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder={maskedGroqKey ? 'Enter new key to replace' : 'gsk_...'}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={async () => {
                  if (!groqKey.trim()) return;
                  setSaving(true);
                  setGroqMessage('');
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'groq_api_key', value: groqKey.trim() }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setGroqMessage('API key saved');
                      setMaskedGroqKey(groqKey.slice(0, 4) + '...' + groqKey.slice(-4));
                      setGroqKey('');
                    } else {
                      setGroqMessage('Failed: ' + (data.error || 'Unknown'));
                    }
                  } catch {
                    setGroqMessage('Failed to save');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !groqKey.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {maskedGroqKey && (
                <button
                  onClick={testGroqConnection}
                  disabled={groqTesting}
                  className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {groqTesting ? 'Testing...' : 'Test'}
                </button>
              )}
            </div>
            {groqMessage && (
              <p className={cn(
                'mt-2 text-xs',
                groqMessage.startsWith('Connected') ? 'text-green-400' : 'text-muted-foreground'
              )}>
                {groqMessage}
              </p>
            )}
          </div>

          {/* xAI (Grok) API Key */}
          <div className="border-t border-border pt-3">
            <label className="mb-1 block text-sm font-medium">xAI API Key ($25/mo free)</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Grok model from xAI. $25 free credits/month. Get a key at{' '}
              <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.x.ai</a>.
            </p>
            {maskedXaiKey && (
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-accent px-2 py-1 font-mono text-xs">
                  {maskedXaiKey}
                </span>
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await fetch('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'xai_api_key', value: '' }),
                      });
                      setMaskedXaiKey('');
                      setXaiKey('');
                      setXaiMessage('Key removed');
                    } catch {
                      setXaiMessage('Failed to remove');
                    } finally {
                      setSaving(false);
                    }
                  }}
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
                value={xaiKey}
                onChange={(e) => setXaiKey(e.target.value)}
                placeholder={maskedXaiKey ? 'Enter new key to replace' : 'xai-...'}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={async () => {
                  if (!xaiKey.trim()) return;
                  setSaving(true);
                  setXaiMessage('');
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'xai_api_key', value: xaiKey.trim() }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setXaiMessage('API key saved');
                      setMaskedXaiKey(xaiKey.slice(0, 4) + '...' + xaiKey.slice(-4));
                      setXaiKey('');
                    } else {
                      setXaiMessage('Failed: ' + (data.error || 'Unknown'));
                    }
                  } catch {
                    setXaiMessage('Failed to save');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !xaiKey.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {maskedXaiKey && (
                <button
                  onClick={testXaiConnection}
                  disabled={xaiTesting}
                  className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {xaiTesting ? 'Testing...' : 'Test'}
                </button>
              )}
            </div>
            {xaiMessage && (
              <p className={cn(
                'mt-2 text-xs',
                xaiMessage.startsWith('Connected') ? 'text-green-400' : 'text-muted-foreground'
              )}>
                {xaiMessage}
              </p>
            )}
          </div>

          {/* TopDeck.gg API Key */}
          <div className="border-t border-border pt-3">
            <label className="mb-1 block text-sm font-medium">TopDeck.gg API Key</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Enable tournament data scraping from TopDeck.gg for competitive meta analysis.
            </p>
            {maskedTopdeckKey && (
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-accent px-2 py-1 font-mono text-xs">
                  {maskedTopdeckKey}
                </span>
                <button
                  onClick={removeTopdeckKey}
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
                value={topdeckKey}
                onChange={(e) => setTopdeckKey(e.target.value)}
                placeholder={maskedTopdeckKey ? 'Enter new key to replace' : 'Your TopDeck API key'}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveTopdeckKey}
                disabled={saving || !topdeckKey.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {topdeckMessage && (
              <p className={cn(
                'mt-2 text-xs',
                topdeckMessage.includes('success') || topdeckMessage.includes('saved') ? 'text-green-400' : 'text-muted-foreground'
              )}>
                {topdeckMessage}
              </p>
            )}
          </div>

          {/* Collaborative Filtering API */}
          <div className="border-t border-border pt-3">
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              Collaborative Filtering API
              {cfModelVersion && (
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {cfModelVersion}
                </span>
              )}
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              Deck-specific card recommendations powered by 50K+ community decks.
              For Commander/Brawl formats — the primary suggestion source when enabled.
            </p>
            <div className="mb-2 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={cfEnabled}
                  onChange={(e) => setCfEnabled(e.target.checked)}
                  className="rounded"
                />
                Enable CF recommendations
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={cfApiUrl}
                onChange={(e) => setCfApiUrl(e.target.value)}
                placeholder="http://187.77.110.100/cf-api"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={testCfConnection}
                disabled={cfTesting}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                {cfTesting ? 'Testing...' : 'Test'}
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="password"
                value={cfApiKey}
                onChange={(e) => setCfApiKey(e.target.value)}
                placeholder={maskedCfApiKey || 'CF API Key (optional, for cloud deployment)'}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveCfSettings}
                disabled={saving}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {cfMessage && (
              <p className={cn(
                'mt-2 text-xs',
                cfMessage.includes('Connected') || cfMessage.includes('saved') ? 'text-green-400' : 'text-muted-foreground'
              )}>
                {cfMessage}
              </p>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground">
              AI Suggestion Priority: CF (Commander) &gt; Preferred Provider (Claude/OpenAI) &gt; Ollama (local) &gt; Synergy Engine.
              Your API keys are stored locally and never sent to third parties.
            </p>
          </div>
        </div>

        {/* Billing & Subscription */}
        <BillingSection />

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

        {/* ML Model Training */}
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-bold">ML Model Training</h3>
          <p className="text-xs text-muted-foreground">
            Train the model on community + personal match data. No API keys needed.
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Target</label>
              <select
                value={mlTarget}
                onChange={(e) => setMlTarget(e.target.value)}
                disabled={mlTraining}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="community">Community</option>
                <option value="personal">Personal</option>
                <option value="blended">Blended</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Steps</label>
              <select
                value={mlSteps}
                onChange={(e) => setMlSteps(e.target.value)}
                disabled={mlTraining}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="full">Full pipeline</option>
                <option value="aggregate-train-predict">Aggregate + Train + Predict</option>
                <option value="train-predict">Train + Predict</option>
                <option value="predict">Predict only</option>
              </select>
            </div>
          </div>

          {mlTraining ? (
            <button
              onClick={cancelMLPipeline}
              className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              Cancel Pipeline
            </button>
          ) : (
            <button
              onClick={runMLPipeline}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
            >
              Run Pipeline
            </button>
          )}

          {/* Console output */}
          {mlOutput.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg bg-black/80 p-2 font-mono text-[10px] leading-relaxed text-green-400">
              {mlOutput.map((line, i) => (
                <div key={i} className={line.startsWith('[stderr]') ? 'text-yellow-400' : ''}>
                  {line}
                </div>
              ))}
            </div>
          )}

          {mlMessage && (
            <p className={cn(
              'text-xs',
              mlMessage.includes('successfully') || mlMessage.includes('completed') ? 'text-green-400'
                : mlMessage.includes('cancelled') ? 'text-muted-foreground'
                : 'text-red-400'
            )}>
              {mlMessage}
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

/* ── Billing Section ─────────────────────────────────────────────────────── */

function BillingSection() {
  const [tier, setTier] = useState<'free' | 'pro' | 'commander'>('free');
  const [status, setStatus] = useState('inactive');
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [hasStripe, setHasStripe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState('');

  // Stripe key config
  const [stripeKey, setStripeKey] = useState('');
  const [maskedStripeKey, setMaskedStripeKey] = useState('');
  const [proPriceId, setProPriceId] = useState('');
  const [commanderPriceId, setCommanderPriceId] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);
  const [keyMsg, setKeyMsg] = useState('');

  const fetchSubscription = useCallback(async (sync = false) => {
    try {
      const url = sync ? '/api/billing/subscription?sync=true' : '/api/billing/subscription';
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setTier(data.tier || 'free');
        setStatus(data.status || 'inactive');
        setEndsAt(data.ends_at || null);
        setHasStripe(data.has_stripe || false);
      }
    } catch { /* offline */ }
    setLoading(false);
    setSyncing(false);
  }, []);

  useEffect(() => {
    fetchSubscription();
    // Load Stripe settings
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.stripe_secret_key) setMaskedStripeKey(s.stripe_secret_key);
        if (s.stripe_price_pro) setProPriceId(s.stripe_price_pro);
        if (s.stripe_price_commander) setCommanderPriceId(s.stripe_price_commander);
      })
      .catch(() => {});
  }, [fetchSubscription]);

  const handleSyncFromStripe = async () => {
    setSyncing(true);
    setBillingMsg('');
    await fetchSubscription(true);
    setBillingMsg('Synced from Stripe.');
    setTimeout(() => setBillingMsg(''), 3000);
  };

  const handleCheckout = async (plan: 'pro' | 'commander') => {
    setCheckoutLoading(plan);
    setBillingMsg('');
    try {
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: plan }),
      });
      const data = await resp.json();
      if (data.error) {
        setBillingMsg(data.error);
      } else if (data.url) {
        // Open in system browser (works in both Electron and web)
        window.open(data.url, '_blank');
        setBillingMsg('Checkout opened in browser. Complete payment, then click "Sync from Stripe".');
      }
    } catch {
      setBillingMsg('Failed to create checkout session.');
    }
    setCheckoutLoading(null);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setBillingMsg('');
    try {
      const resp = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (data.error) {
        setBillingMsg(data.error);
      } else if (data.url) {
        window.open(data.url, '_blank');
        setBillingMsg('Billing portal opened in browser.');
      }
    } catch {
      setBillingMsg('Failed to open billing portal.');
    }
    setPortalLoading(false);
  };

  const saveStripeKeys = async () => {
    setSavingKeys(true);
    setKeyMsg('');
    try {
      const saves = [];
      if (stripeKey) {
        saves.push(fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'stripe_secret_key', value: stripeKey }),
        }));
      }
      if (proPriceId) {
        saves.push(fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'stripe_price_pro', value: proPriceId }),
        }));
      }
      if (commanderPriceId) {
        saves.push(fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'stripe_price_commander', value: commanderPriceId }),
        }));
      }
      await Promise.all(saves);
      setKeyMsg('Stripe configuration saved.');
      if (stripeKey) {
        setMaskedStripeKey(stripeKey.slice(0, 7) + '...' + stripeKey.slice(-4));
        setStripeKey('');
      }
    } catch {
      setKeyMsg('Failed to save Stripe keys.');
    }
    setSavingKeys(false);
  };

  const isActive = status === 'active' || status === 'trialing';
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const statusColor = isActive ? 'text-green-400' : status === 'past_due' ? 'text-amber-400' : 'text-muted-foreground';

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-bold">Billing & Subscription</h3>

      {/* Current plan status */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{tierLabel}</span>
            {isActive && (
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
                {status === 'trialing' ? 'Trial' : 'Active'}
              </span>
            )}
            {status === 'past_due' && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                Past Due
              </span>
            )}
          </div>
          {endsAt && isActive && (
            <p className="text-[10px] text-muted-foreground">
              Renews {new Date(endsAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          {hasStripe && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="rounded-lg border border-border px-2 py-1 text-[10px] transition-colors hover:bg-accent disabled:opacity-50"
            >
              {portalLoading ? '...' : 'Manage'}
            </button>
          )}
          <button
            onClick={handleSyncFromStripe}
            disabled={syncing || loading}
            className="rounded-lg border border-border px-2 py-1 text-[10px] transition-colors hover:bg-accent disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Upgrade buttons */}
      {tier !== 'commander' && (
        <div className="flex gap-2">
          {tier === 'free' && (
            <button
              onClick={() => handleCheckout('pro')}
              disabled={!!checkoutLoading}
              className="flex-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {checkoutLoading === 'pro' ? 'Opening...' : 'Upgrade to Pro — $4.99/mo'}
            </button>
          )}
          <button
            onClick={() => handleCheckout('commander')}
            disabled={!!checkoutLoading}
            className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            {checkoutLoading === 'commander' ? 'Opening...' : `Upgrade to Commander — $14.99/mo`}
          </button>
        </div>
      )}

      {billingMsg && (
        <p className={cn(
          'text-xs',
          billingMsg.includes('Synced') || billingMsg.includes('opened') ? 'text-green-400'
            : billingMsg.includes('Failed') || billingMsg.includes('error') ? 'text-red-400'
              : 'text-muted-foreground'
        )}>
          {billingMsg}
        </p>
      )}

      {/* Stripe configuration (collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-[10px] font-medium text-muted-foreground hover:text-foreground">
          Stripe Configuration
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Secret Key</label>
            <input
              type="password"
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              placeholder={maskedStripeKey || 'sk_live_... or sk_test_...'}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary font-mono"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Pro Price ID</label>
              <input
                type="text"
                value={proPriceId}
                onChange={(e) => setProPriceId(e.target.value)}
                placeholder="price_..."
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Commander Price ID</label>
              <input
                type="text"
                value={commanderPriceId}
                onChange={(e) => setCommanderPriceId(e.target.value)}
                placeholder="price_..."
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
          <button
            onClick={saveStripeKeys}
            disabled={savingKeys}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {savingKeys ? 'Saving...' : 'Save Stripe Config'}
          </button>
          {keyMsg && (
            <p className={cn('text-[10px]', keyMsg.includes('saved') ? 'text-green-400' : 'text-red-400')}>
              {keyMsg}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Create products and prices in your{' '}
            <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Stripe Dashboard
            </a>
            , then paste the price IDs here.
          </p>
        </div>
      </details>
    </div>
  );
}
