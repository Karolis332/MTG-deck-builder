/**
 * Match Recorder — captures MTG Arena screen during matches using Electron's
 * desktopCapturer API + MediaRecorder. Timestamps highlight moments from the
 * HighlightDetector for post-match clip extraction.
 *
 * Flow:
 *   1. ArenaLogWatcher emits 'match-start' → recorder starts capturing
 *   2. HighlightDetector emits highlights → recorder marks timestamps
 *   3. ArenaLogWatcher emits 'match-end' → recorder stops, saves full recording
 *   4. ClipExtractor runs FFmpeg to cut highlight clips from the full recording
 *
 * Output: WebM recording + highlight metadata JSON in the recordings directory.
 * FFmpeg clip extraction is deferred to a separate post-match step.
 */

import { desktopCapturer, BrowserWindow } from 'electron';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import type { Highlight } from '../src/lib/highlight-detector';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RecordingSession {
  matchId: string;
  format: string | null;
  playerName: string | null;
  opponentName: string | null;
  startTime: number;
  endTime: number | null;
  result: string | null;
  filePath: string;
  highlights: TimestampedHighlight[];
  clips: ClipInfo[];
}

export interface TimestampedHighlight {
  highlight: Highlight;
  /** Offset in seconds from recording start */
  offsetSeconds: number;
}

export interface ClipInfo {
  highlightId: string;
  type: string;
  caption: string;
  severity: number;
  filePath: string;
  durationSeconds: number;
  thumbnailPath: string | null;
}

export interface RecorderConfig {
  /** Directory to save recordings (default: %APPDATA%/the-black-grimoire/recordings/) */
  outputDir: string;
  /** Video bitrate in bps (default: 2.5 Mbps) */
  videoBitrate: number;
  /** Frame rate (default: 30) */
  frameRate: number;
  /** Enable recording (default: true) */
  enabled: boolean;
  /** FFmpeg binary path (default: 'ffmpeg' from PATH) */
  ffmpegPath: string;
  /** Min highlight severity to extract clips (default: 5) */
  minClipSeverity: number;
}

const DEFAULT_CONFIG: RecorderConfig = {
  outputDir: path.join(process.env.APPDATA || '.', 'the-black-grimoire', 'recordings'),
  videoBitrate: 2_500_000,
  frameRate: 30,
  enabled: true,
  ffmpegPath: 'ffmpeg',
  minClipSeverity: 5,
};

// ── Recorder ─────────────────────────────────────────────────────────────────

export class MatchRecorder {
  private config: RecorderConfig;
  private currentSession: RecordingSession | null = null;
  private captureWindow: BrowserWindow | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime = 0;
  private _isRecording = false;

  constructor(config?: Partial<RecorderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureOutputDir();
  }

  isRecording(): boolean {
    return this._isRecording;
  }

  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  /**
   * Start recording the screen. Called when a match starts.
   */
  async startRecording(matchInfo: {
    matchId: string;
    format: string | null;
    playerName: string | null;
    opponentName: string | null;
  }): Promise<boolean> {
    if (!this.config.enabled) return false;
    if (this.isRecording()) {
      await this.stopRecording('abandoned');
    }

    try {
      // Find the Arena window or fall back to entire screen
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 1, height: 1 },
      });

      // Prefer MTGA window, fall back to primary screen
      const arenaSource = sources.find(s =>
        s.name.toLowerCase().includes('mtg arena') ||
        s.name.toLowerCase().includes('magic: the gathering')
      );
      const source = arenaSource || sources.find(s => s.id.startsWith('screen:'));

      if (!source) {
        console.error('[Recorder] No capture source found');
        return false;
      }

      // Create a hidden renderer window that handles the actual capture + MediaRecorder.
      // MediaStream cannot be serialized across the IPC boundary, so the recording
      // must live inside a renderer context.
      const captureWindow = await this.createCaptureWindow(source.id);
      if (!captureWindow) return false;

      this.captureWindow = captureWindow;
      this.recordedChunks = [];
      this.recordingStartTime = Date.now();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const sanitizedId = matchInfo.matchId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const fileName = `match_${timestamp}_${sanitizedId}.webm`;
      const filePath = path.join(this.config.outputDir, fileName);

      this.currentSession = {
        matchId: matchInfo.matchId,
        format: matchInfo.format,
        playerName: matchInfo.playerName,
        opponentName: matchInfo.opponentName,
        startTime: this.recordingStartTime,
        endTime: null,
        result: null,
        filePath,
        highlights: [],
        clips: [],
      };

      // Start MediaRecorder inside the renderer
      const started = await captureWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            window._recorder = new MediaRecorder(window._stream, {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: ${this.config.videoBitrate},
            });
            window._chunks = [];
            window._recorder.ondataavailable = (e) => {
              if (e.data.size > 0) window._chunks.push(e.data);
            };
            window._recorder.start(1000);
            return true;
          } catch (err) {
            return false;
          }
        })()
      `);

      if (!started) {
        captureWindow.destroy();
        this.captureWindow = null;
        return false;
      }

      this._isRecording = true;
      console.log(`[Recorder] Started recording: ${fileName}`);
      return true;
    } catch (err) {
      console.error('[Recorder] Failed to start recording:', err);
      return false;
    }
  }

  /**
   * Mark a highlight timestamp in the current recording.
   */
  markHighlight(highlight: Highlight): void {
    if (!this.currentSession || !this.isRecording()) return;

    const offsetSeconds = (Date.now() - this.recordingStartTime) / 1000;
    this.currentSession.highlights.push({
      highlight,
      offsetSeconds,
    });
    console.log(
      `[Recorder] Highlight marked: ${highlight.type} (severity ${highlight.severity}) at ${offsetSeconds.toFixed(1)}s`
    );
  }

  /**
   * Stop recording and save the file. Called when a match ends.
   */
  async stopRecording(result: string | null): Promise<RecordingSession | null> {
    if (!this.captureWindow || !this.currentSession) return null;

    const session: RecordingSession = {
      ...this.currentSession,
      endTime: Date.now(),
      result,
    };

    try {
      // Stop the MediaRecorder in the renderer and collect the recording data
      const base64Data: string | null = await this.captureWindow.webContents.executeJavaScript(`
        (async () => {
          return new Promise((resolve) => {
            if (!window._recorder || window._recorder.state === 'inactive') {
              resolve(null);
              return;
            }
            window._recorder.onstop = async () => {
              try {
                const blob = new Blob(window._chunks, { type: 'video/webm' });
                const buf = await blob.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                resolve(btoa(binary));
              } catch { resolve(null); }
            };
            window._recorder.stop();
          });
        })()
      `);

      if (!base64Data) {
        console.error('[Recorder] No recording data returned from renderer');
        return null;
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Write the recording asynchronously
      await fsPromises.writeFile(session.filePath, buffer);
      console.log(
        `[Recorder] Saved recording: ${session.filePath} ` +
        `(${(buffer.length / 1024 / 1024).toFixed(1)}MB, ` +
        `${((session.endTime! - session.startTime) / 1000).toFixed(0)}s)`
      );

      // Save highlight metadata
      const metaPath = session.filePath.replace('.webm', '.json');
      await fsPromises.writeFile(metaPath, JSON.stringify({
        matchId: session.matchId,
        format: session.format,
        playerName: session.playerName,
        opponentName: session.opponentName,
        result: session.result,
        durationSeconds: (session.endTime! - session.startTime) / 1000,
        highlights: session.highlights.map(h => ({
          id: h.highlight.id,
          type: h.highlight.type,
          severity: h.highlight.severity,
          caption: h.highlight.caption,
          offsetSeconds: h.offsetSeconds,
          leadIn: h.highlight.leadIn,
          leadOut: h.highlight.leadOut,
          involvedCards: h.highlight.involvedCards,
          perspective: h.highlight.perspective,
          context: h.highlight.context,
        })),
      }, null, 2));

      // Extract clips for high-severity highlights
      await this.extractClips(session);

      return session;
    } catch (err) {
      console.error('[Recorder] Failed to save recording:', err);
      return null;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Extract highlight clips from the full recording using FFmpeg.
   */
  private async extractClips(session: RecordingSession): Promise<void> {
    const eligible = session.highlights.filter(
      h => h.highlight.severity >= this.config.minClipSeverity
    );

    if (eligible.length === 0) {
      console.log('[Recorder] No highlights above severity threshold for clip extraction');
      return;
    }

    const clipsDir = path.join(
      this.config.outputDir,
      'clips',
      session.matchId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    );
    fs.mkdirSync(clipsDir, { recursive: true });

    for (const { highlight, offsetSeconds } of eligible) {
      const startSec = Math.max(0, offsetSeconds - highlight.leadIn);
      const duration = highlight.leadIn + highlight.leadOut;
      const clipName = `${highlight.type}_T${highlight.turnNumber}_sev${highlight.severity}.mp4`;
      const clipPath = path.join(clipsDir, clipName);
      const thumbPath = clipPath.replace('.mp4', '_thumb.jpg');

      try {
        // Extract clip
        await this.runFfmpeg([
          '-ss', startSec.toFixed(2),
          '-i', session.filePath,
          '-t', duration.toFixed(2),
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-movflags', '+faststart',
          '-y',
          clipPath,
        ]);

        // Extract thumbnail at the highlight moment
        const thumbOffset = Math.min(highlight.leadIn, duration - 1);
        await this.runFfmpeg([
          '-ss', thumbOffset.toFixed(2),
          '-i', clipPath,
          '-frames:v', '1',
          '-q:v', '2',
          '-y',
          thumbPath,
        ]);

        session.clips.push({
          highlightId: highlight.id,
          type: highlight.type,
          caption: highlight.caption,
          severity: highlight.severity,
          filePath: clipPath,
          durationSeconds: duration,
          thumbnailPath: fs.existsSync(thumbPath) ? thumbPath : null,
        });

        console.log(`[Recorder] Extracted clip: ${clipName} (${duration}s)`);
      } catch (err) {
        console.error(`[Recorder] Failed to extract clip ${clipName}:`, err);
      }
    }

    // Save updated session metadata with clip paths
    const metaPath = session.filePath.replace('.webm', '.json');
    const metaRaw = await fsPromises.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw);
    meta.clips = session.clips;
    await fsPromises.writeFile(metaPath, JSON.stringify(meta, null, 2));
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Create a hidden BrowserWindow that captures the screen and holds the
   * MediaStream + MediaRecorder. The stream stays inside the renderer to
   * avoid the IPC serialization problem (MediaStream cannot cross boundaries).
   */
  private async createCaptureWindow(sourceId: string): Promise<BrowserWindow | null> {
    const win = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      webPreferences: { offscreen: true, contextIsolation: false },
    });

    try {
      // Use JSON.stringify to safely inject sourceId — prevents JS injection
      const ok = await win.webContents.executeJavaScript(`
        (async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: ${JSON.stringify(sourceId)},
                  minWidth: 1920,
                  maxWidth: 1920,
                  minHeight: 1080,
                  maxHeight: 1080,
                  minFrameRate: ${Number(this.config.frameRate)},
                  maxFrameRate: ${Number(this.config.frameRate)},
                },
              },
            });
            window._stream = stream;
            return true;
          } catch (err) {
            return false;
          }
        })()
      `);

      if (!ok) {
        console.error('[Recorder] Failed to acquire capture stream in renderer');
        win.destroy();
        return null;
      }

      return win;
    } catch (err) {
      console.error('[Recorder] createCaptureWindow failed:', err);
      win.destroy();
      return null;
    }
  }

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.config.ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-200)}`));
      });

      proc.on('error', (err) => {
        reject(new Error(`FFmpeg not found or failed: ${err.message}`));
      });
    });
  }

  private cleanup(): void {
    if (this.captureWindow && !this.captureWindow.isDestroyed()) {
      // Stop media tracks inside the renderer before destroying
      this.captureWindow.webContents.executeJavaScript(`
        if (window._stream) {
          window._stream.getTracks().forEach(t => t.stop());
          window._stream = null;
        }
        window._recorder = null;
        window._chunks = null;
      `).catch(() => { /* window may already be destroyed */ });
      this.captureWindow.destroy();
    }
    this.captureWindow = null;
    this._isRecording = false;
    this.recordedChunks = [];
    this.currentSession = null;
  }

  private ensureOutputDir(): void {
    fs.mkdirSync(this.config.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.config.outputDir, 'clips'), { recursive: true });
  }
}
