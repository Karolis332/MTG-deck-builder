'use client';

import { useEffect, useState } from 'react';
import { getElectronAPI } from '@/lib/electron-bridge';

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready';

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;

    const cleanups: (() => void)[] = [];

    cleanups.push(
      api.onUpdateAvailable((data) => {
        setVersion(data.version);
        setState('available');
      })
    );

    cleanups.push(
      api.onUpdateDownloadProgress((data) => {
        setState('downloading');
        setProgress(data.percent);
      })
    );

    cleanups.push(
      api.onUpdateDownloaded(() => {
        setState('ready');
      })
    );

    return () => cleanups.forEach((fn) => fn());
  }, []);

  if (state === 'idle' || dismissed) return null;

  const handleDownload = () => {
    const api = getElectronAPI();
    if (api) api.downloadUpdate();
    setState('downloading');
  };

  const handleInstall = () => {
    const api = getElectronAPI();
    if (api) api.installUpdate();
  };

  return (
    <div className="relative flex items-center justify-center gap-3 bg-amber-900/80 border-b border-amber-700/50 px-4 py-2 text-sm text-amber-100">
      {state === 'available' && (
        <>
          <span>Version {version} is available.</span>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded bg-amber-700 px-3 py-1 text-xs font-medium hover:bg-amber-600 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
        </>
      )}

      {state === 'downloading' && (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span>Downloading update... {progress}%</span>
          <div className="h-1.5 w-32 rounded-full bg-amber-950 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {state === 'ready' && (
        <>
          <span>Update {version} ready.</span>
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-1 text-xs font-medium hover:bg-emerald-600 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Restart & Install
          </button>
        </>
      )}

      {state !== 'downloading' && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-amber-300/60 hover:text-amber-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
    </div>
  );
}
