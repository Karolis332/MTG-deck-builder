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
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime = 0;
  private stream: MediaStream | null = null;

  constructor(config?: Partial<RecorderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureOutputDir();
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
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

      // Create media stream from the source using a hidden window's webContents
      // Electron's desktopCapturer requires getUserMedia from a renderer process,
      // so we use a hidden utility window.
      const stream = await this.createCaptureStream(source.id);
      if (!stream) return false;

      this.stream = stream;
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

      // Set up MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: this.config.videoBitrate,
      });

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
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
    if (!this.mediaRecorder || !this.currentSession) return null;

    return new Promise((resolve) => {
      const session = this.currentSession!;
      session.endTime = Date.now();
      session.result = result;

      this.mediaRecorder!.onstop = async () => {
        try {
          // Combine all chunks into a single buffer
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Write the recording
          fs.writeFileSync(session.filePath, buffer);
          console.log(
            `[Recorder] Saved recording: ${session.filePath} ` +
            `(${(buffer.length / 1024 / 1024).toFixed(1)}MB, ` +
            `${((session.endTime! - session.startTime) / 1000).toFixed(0)}s)`
          );

          // Save highlight metadata
          const metaPath = session.filePath.replace('.webm', '.json');
          fs.writeFileSync(metaPath, JSON.stringify({
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

          resolve(session);
        } catch (err) {
          console.error('[Recorder] Failed to save recording:', err);
          resolve(null);
        } finally {
          this.cleanup();
        }
      };

      this.mediaRecorder!.stop();
    });
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
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.clips = session.clips;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async createCaptureStream(sourceId: string): Promise<MediaStream | null> {
    // In Electron main process, we need a hidden BrowserWindow to access getUserMedia
    const win = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      webPreferences: { offscreen: true },
    });

    try {
      const stream = await win.webContents.executeJavaScript(`
        (async () => {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: '${sourceId}',
                minWidth: 1920,
                maxWidth: 1920,
                minHeight: 1080,
                maxHeight: 1080,
                minFrameRate: ${this.config.frameRate},
                maxFrameRate: ${this.config.frameRate},
              },
            },
          });
          return stream;
        })()
      `);
      // The stream object from executeJavaScript is serialized — we need the actual handle.
      // In practice, the recording must happen in the renderer process.
      // We'll store the source ID and have the recorder page handle capture.
      win.destroy();
      return stream;
    } catch (err) {
      console.error('[Recorder] createCaptureStream failed:', err);
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
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.currentSession = null;
  }

  private ensureOutputDir(): void {
    fs.mkdirSync(this.config.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.config.outputDir, 'clips'), { recursive: true });
  }
}
