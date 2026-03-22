'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getElectronAPI } from '@/lib/electron-bridge';

type RecordingState = 'idle' | 'recording' | 'paused';

interface ScreenSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

export function useScreenRecorder() {
  const [state, setState] = useState<RecordingState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<ScreenSource | null>(null);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const pauseStartRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      if (pauseStartRef.current > 0) return; // paused
      setDurationMs(Date.now() - startTimeRef.current - pausedElapsedRef.current);
    }, 200);
  }, [clearTimer]);

  const fetchSources = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) return [];
    const s = await api.getScreenSources();
    setSources(s);
    return s;
  }, []);

  const startRecording = useCallback(async (source: ScreenSource) => {
    const api = getElectronAPI();
    if (!api) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        } as MediaTrackConstraints,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Stream cleanup handled by stopRecording
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // collect chunks every second

      startTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
      pauseStartRef.current = 0;

      setSelectedSource(source);
      setState('recording');
      setDurationMs(0);
      setLastSavedPath(null);
      startTimer();

      await api.startRecording(source.id, source.name);
    } catch (err) {
      console.error('[ScreenRecorder] Failed to start:', err);
      throw err;
    }
  }, [startTimer]);

  const stopRecording = useCallback(async () => {
    const api = getElectronAPI();
    const recorder = mediaRecorderRef.current;
    if (!api || !recorder) return null;

    return new Promise<string | null>((resolve) => {
      recorder.onstop = async () => {
        // Convert blobs to ArrayBuffers for IPC transfer
        const buffers: ArrayBuffer[] = [];
        for (const chunk of chunksRef.current) {
          buffers.push(await chunk.arrayBuffer());
        }

        const result = await api.stopRecording(buffers);

        // Clean up stream
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        clearTimer();
        setState('idle');
        setDurationMs(0);
        setSelectedSource(null);
        setLastSavedPath(result.filePath);

        resolve(result.filePath);
      };

      recorder.stop();
    });
  }, [clearTimer]);

  const pauseRecording = useCallback(async () => {
    const api = getElectronAPI();
    const recorder = mediaRecorderRef.current;
    if (!api || !recorder || recorder.state !== 'recording') return;

    recorder.pause();
    pauseStartRef.current = Date.now();
    setState('paused');
    await api.pauseRecording();
  }, []);

  const resumeRecording = useCallback(async () => {
    const api = getElectronAPI();
    const recorder = mediaRecorderRef.current;
    if (!api || !recorder || recorder.state !== 'paused') return;

    recorder.resume();
    pausedElapsedRef.current += Date.now() - pauseStartRef.current;
    pauseStartRef.current = 0;
    setState('recording');
    await api.resumeRecording();
  }, []);

  const saveAs = useCallback(async () => {
    const api = getElectronAPI();
    if (!api || chunksRef.current.length === 0) return null;

    const buffers: ArrayBuffer[] = [];
    for (const chunk of chunksRef.current) {
      buffers.push(await chunk.arrayBuffer());
    }

    const result = await api.saveRecordingAs(buffers);
    if (result.filePath) setLastSavedPath(result.filePath);
    return result.filePath;
  }, []);

  const openFolder = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) return;
    await api.openRecordingsFolder();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimer]);

  return {
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
    saveAs,
    openFolder,
  };
}
