'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useScreenRecorder } from '@/hooks/use-screen-recorder';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ScreenRecorderControls() {
  const {
    state,
    durationMs,
    sources,
    selectedSource,
    lastSavedPath,
    fetchSources,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    openFolder,
  } = useScreenRecorder();

  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePickSource = async () => {
    setLoading(true);
    await fetchSources();
    setLoading(false);
    setShowSourcePicker(true);
  };

  const handleSelectSource = async (source: typeof sources[0]) => {
    setShowSourcePicker(false);
    setLoading(true);
    try {
      await startRecording(source);
    } catch {
      // Failed to acquire stream
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    await stopRecording();
    setLoading(false);
  };

  // Idle state — show record button
  if (state === 'idle') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handlePickSource}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono uppercase tracking-wider',
            'border border-red-500/30 bg-red-500/10 text-red-400',
            'hover:bg-red-500/20 hover:border-red-500/50 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {loading ? 'Loading...' : 'REC'}
        </button>

        {lastSavedPath && (
          <button
            onClick={openFolder}
            className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors truncate max-w-[140px]"
            title={lastSavedPath}
          >
            Saved
          </button>
        )}

        {/* Source picker modal */}
        {showSourcePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-[560px] max-h-[480px] overflow-y-auto rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-mono text-sm uppercase tracking-wider text-primary">
                  Select Source
                </h3>
                <button
                  onClick={() => setShowSourcePicker(false)}
                  className="text-muted-foreground hover:text-primary text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => handleSelectSource(source)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded border border-border p-2',
                      'hover:border-primary/50 hover:bg-primary/5 transition-colors',
                      'text-left'
                    )}
                  >
                    <img
                      src={source.thumbnailDataUrl}
                      alt={source.name}
                      className="w-full rounded border border-border/50"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground truncate w-full text-center">
                      {source.name}
                    </span>
                  </button>
                ))}
              </div>

              {sources.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No sources found
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Recording or paused state
  return (
    <div className="flex items-center gap-2">
      {/* Recording indicator */}
      <span className={cn(
        'h-2 w-2 rounded-full',
        state === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
      )} />

      {/* Duration */}
      <span className="font-mono text-xs tabular-nums text-primary min-w-[48px]">
        {formatDuration(durationMs)}
      </span>

      {/* Source name */}
      {selectedSource && (
        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
          {selectedSource.name}
        </span>
      )}

      {/* Pause / Resume */}
      {state === 'recording' ? (
        <button
          onClick={pauseRecording}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs font-mono uppercase tracking-wider',
            'border border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
            'hover:bg-yellow-500/20 hover:border-yellow-500/50 transition-colors'
          )}
        >
          Pause
        </button>
      ) : (
        <button
          onClick={resumeRecording}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs font-mono uppercase tracking-wider',
            'border border-green-500/30 bg-green-500/10 text-green-400',
            'hover:bg-green-500/20 hover:border-green-500/50 transition-colors'
          )}
        >
          Resume
        </button>
      )}

      {/* Stop */}
      <button
        onClick={handleStop}
        disabled={loading}
        className={cn(
          'flex items-center gap-1 rounded px-2 py-1 text-xs font-mono uppercase tracking-wider',
          'border border-border bg-card text-muted-foreground',
          'hover:bg-destructive/10 hover:text-red-400 hover:border-red-500/30 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        Stop
      </button>
    </div>
  );
}
