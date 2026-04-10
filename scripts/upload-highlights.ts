/**
 * Highlight Clip Uploader — sends recorded match highlights to the n8n
 * workflow on the VPS for automated social media posting.
 *
 * Called after a match recording session completes. Reads clip files from
 * the recordings directory and POSTs them to the n8n webhook endpoint.
 *
 * Can be run standalone or imported from the Electron main process.
 *
 * Usage:
 *   npx ts-node scripts/upload-highlights.ts --session <path-to-session.json>
 *   npx ts-node scripts/upload-highlights.ts --dir <recordings-dir> --latest
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

// ── Config ───────────────────────────────────────────────────────────────────

const N8N_WEBHOOK_URL = process.env.N8N_HIGHLIGHT_WEBHOOK;

if (!N8N_WEBHOOK_URL && require.main === module) {
  console.error('[Uploader] N8N_HIGHLIGHT_WEBHOOK env var is required');
  process.exit(1);
}

const MIN_SEVERITY = parseInt(process.env.HIGHLIGHT_MIN_SEVERITY || '6', 10);

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionMeta {
  matchId: string;
  format: string | null;
  playerName: string | null;
  opponentName: string | null;
  result: string | null;
  durationSeconds: number;
  highlights: Array<{
    id: string;
    type: string;
    severity: number;
    caption: string;
    offsetSeconds: number;
    leadIn: number;
    leadOut: number;
    involvedCards: string[];
    perspective: string;
    context: Record<string, unknown>;
  }>;
  clips?: Array<{
    highlightId: string;
    type: string;
    caption: string;
    severity: number;
    filePath: string;
    durationSeconds: number;
  }>;
}

interface UploadResult {
  highlightId: string;
  type: string;
  severity: number;
  uploaded: boolean;
  error?: string;
  response?: Record<string, unknown>;
}

// ── Upload logic ─────────────────────────────────────────────────────────────

export async function uploadSessionClips(
  sessionMetaPath: string,
  minSeverity = MIN_SEVERITY,
): Promise<UploadResult[]> {
  const meta: SessionMeta = JSON.parse(fs.readFileSync(sessionMetaPath, 'utf-8'));
  const results: UploadResult[] = [];

  const clips = meta.clips || [];
  if (clips.length === 0) {
    console.log('[Uploader] No clips in session');
    return results;
  }

  const eligible = clips.filter(c => c.severity >= minSeverity);
  console.log(
    `[Uploader] ${clips.length} total clips, ${eligible.length} above severity ${minSeverity}`
  );

  for (const clip of eligible) {
    const highlight = meta.highlights.find(h => h.id === clip.highlightId);
    if (!clip.filePath || !fs.existsSync(clip.filePath)) {
      results.push({
        highlightId: clip.highlightId,
        type: clip.type,
        severity: clip.severity,
        uploaded: false,
        error: `Clip file not found: ${clip.filePath}`,
      });
      continue;
    }

    try {
      const response = await uploadClip(clip.filePath, {
        matchId: meta.matchId,
        format: meta.format,
        result: meta.result,
        highlightType: clip.type,
        caption: clip.caption,
        severity: clip.severity,
        durationSeconds: clip.durationSeconds,
        involvedCards: highlight?.involvedCards || [],
        perspective: highlight?.perspective || 'self',
        playerName: meta.playerName,
        opponentName: meta.opponentName,
      });

      results.push({
        highlightId: clip.highlightId,
        type: clip.type,
        severity: clip.severity,
        uploaded: true,
        response,
      });
      console.log(`[Uploader] Uploaded: ${clip.type} sev=${clip.severity} "${clip.caption}"`);
    } catch (err) {
      results.push({
        highlightId: clip.highlightId,
        type: clip.type,
        severity: clip.severity,
        uploaded: false,
        error: String(err),
      });
      console.error(`[Uploader] Failed: ${clip.type} — ${err}`);
    }
  }

  return results;
}

function uploadClip(
  filePath: string,
  metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (!N8N_WEBHOOK_URL) {
      return reject(new Error('N8N_HIGHLIGHT_WEBHOOK env var is required'));
    }
    const fileBuffer = fs.readFileSync(filePath);
    const boundary = `----FormBoundary${Date.now()}`;

    // Build multipart body
    const metaPart =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="body"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      JSON.stringify(metadata) + '\r\n';

    const filePart =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="clip"; filename="${path.basename(filePath)}"\r\n` +
      `Content-Type: video/mp4\r\n\r\n`;

    const ending = `\r\n--${boundary}--\r\n`;

    const metaBuffer = Buffer.from(metaPart, 'utf-8');
    const filePartBuffer = Buffer.from(filePart, 'utf-8');
    const endBuffer = Buffer.from(ending, 'utf-8');

    const totalLength = metaBuffer.length + filePartBuffer.length + fileBuffer.length + endBuffer.length;

    const url = new URL(N8N_WEBHOOK_URL);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': totalLength,
        },
        timeout: 120_000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Upload timed out')); });

    req.write(metaBuffer);
    req.write(filePartBuffer);
    req.write(fileBuffer);
    req.write(endBuffer);
    req.end();
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const sessionIdx = args.indexOf('--session');
  const dirIdx = args.indexOf('--dir');

  if (sessionIdx >= 0 && args[sessionIdx + 1]) {
    const sessionPath = args[sessionIdx + 1];
    uploadSessionClips(sessionPath).then((results) => {
      const uploaded = results.filter(r => r.uploaded).length;
      const failed = results.filter(r => !r.uploaded).length;
      console.log(`\nDone: ${uploaded} uploaded, ${failed} failed`);
      process.exit(failed > 0 ? 1 : 0);
    });
  } else if (dirIdx >= 0 && args[dirIdx + 1]) {
    const dir = args[dirIdx + 1];
    const latest = args.includes('--latest');

    // Find session JSON files
    const sessionFiles = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && f.startsWith('match_'))
      .map(f => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());

    if (sessionFiles.length === 0) {
      console.log('No session files found');
      process.exit(0);
    }

    const toProcess = latest ? [sessionFiles[0]] : sessionFiles;
    console.log(`Processing ${toProcess.length} session(s)`);

    (async () => {
      let totalUploaded = 0;
      let totalFailed = 0;
      for (const sf of toProcess) {
        console.log(`\n--- ${path.basename(sf)} ---`);
        const results = await uploadSessionClips(sf);
        totalUploaded += results.filter(r => r.uploaded).length;
        totalFailed += results.filter(r => !r.uploaded).length;
      }
      console.log(`\nTotal: ${totalUploaded} uploaded, ${totalFailed} failed`);
      process.exit(totalFailed > 0 ? 1 : 0);
    })();
  } else {
    console.log('Usage:');
    console.log('  npx ts-node scripts/upload-highlights.ts --session <path-to-session.json>');
    console.log('  npx ts-node scripts/upload-highlights.ts --dir <recordings-dir> [--latest]');
    process.exit(1);
  }
}
