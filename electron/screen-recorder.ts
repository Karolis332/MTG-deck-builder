import { desktopCapturer, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export type RecordingState = 'idle' | 'recording' | 'paused';

export interface RecordingStatus {
  state: RecordingState;
  durationMs: number;
  filePath: string | null;
  sourceId: string | null;
  sourceName: string | null;
}

export interface ScreenSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

let state: RecordingState = 'idle';
let startTime = 0;
let pausedElapsed = 0;
let pauseStart = 0;
let currentSourceId: string | null = null;
let currentSourceName: string | null = null;
let savedFilePath: string | null = null;

function getRecordingsDir(): string {
  const dir = path.join(app.getPath('videos'), 'The Black Grimoire');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function generateFilename(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `grimoire-${ts}.webm`;
}

export async function getSources(): Promise<ScreenSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 192, height: 108 },
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnailDataUrl: s.thumbnail.toDataURL(),
  }));
}

export function markRecordingStarted(sourceId: string, sourceName: string): void {
  state = 'recording';
  startTime = Date.now();
  pausedElapsed = 0;
  pauseStart = 0;
  currentSourceId = sourceId;
  currentSourceName = sourceName;
  savedFilePath = null;
}

export function markRecordingPaused(): void {
  if (state !== 'recording') return;
  state = 'paused';
  pauseStart = Date.now();
}

export function markRecordingResumed(): void {
  if (state !== 'paused') return;
  pausedElapsed += Date.now() - pauseStart;
  pauseStart = 0;
  state = 'recording';
}

export function markRecordingStopped(): void {
  state = 'idle';
  startTime = 0;
  pausedElapsed = 0;
  pauseStart = 0;
  currentSourceId = null;
  currentSourceName = null;
}

export async function saveRecording(buffer: Buffer): Promise<string> {
  const dir = getRecordingsDir();
  const filename = generateFilename();
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, buffer);
  savedFilePath = filePath;
  return filePath;
}

export async function saveRecordingAs(buffer: Buffer): Promise<string | null> {
  const defaultPath = path.join(getRecordingsDir(), generateFilename());
  const result = await dialog.showSaveDialog({
    title: 'Save Recording',
    defaultPath,
    filters: [
      { name: 'WebM Video', extensions: ['webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) return null;

  fs.writeFileSync(result.filePath, buffer);
  savedFilePath = result.filePath;
  return result.filePath;
}

export function getStatus(): RecordingStatus {
  let durationMs = 0;
  if (state === 'recording') {
    durationMs = Date.now() - startTime - pausedElapsed;
  } else if (state === 'paused') {
    durationMs = pauseStart - startTime - pausedElapsed;
  }

  return {
    state,
    durationMs,
    filePath: savedFilePath,
    sourceId: currentSourceId,
    sourceName: currentSourceName,
  };
}

export function openRecordingsFolder(): void {
  const dir = getRecordingsDir();
  const { shell } = require('electron');
  shell.openPath(dir);
}
