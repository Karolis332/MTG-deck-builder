/**
 * Ingest routes — on-demand scraper triggers plus the run log.
 *
 * GET  /ingest/status            → newest run per source + corpus freshness
 * POST /ingest/{source}          → start a scrape now (202 + run id)
 *
 * The scrapers themselves are the existing Python scripts; this endpoint only
 * schedules them and records the outcome, so there is exactly one implementation
 * of each scrape rather than a Node fork of it.
 *
 * Security: the source is looked up in a fixed whitelist and the child process is
 * spawned with an argv ARRAY (never a shell string), so no part of the request can
 * reach a shell. Numeric args are range-checked, months are regex-checked.
 */
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import {
  startIngestRun,
  finishIngestRun,
  getIngestStatus,
} from '../../src/lib/deck-ingest';
import { getCorpusFreshness } from '../../src/lib/meta-queries';

/**
 * Only these sources can be triggered, and only via these scripts.
 * `limitFlag` differs per scraper — topdeck counts tournaments, the others count
 * events — so it is declared here rather than assumed.
 */
const SCRAPERS: Record<string, { script: string; supportsMonths: boolean; limitFlag: string }> = {
  mtgo: { script: 'scripts/scrape_mtgo.py', supportsMonths: true, limitFlag: '--max-events' },
  mtgtop8: { script: 'scripts/scrape_mtgtop8.py', supportsMonths: false, limitFlag: '--max-events' },
  topdeck: { script: 'scripts/scrape_topdeck.py', supportsMonths: false, limitFlag: '--max-tournaments' },
};

const VALID_FORMAT = /^[a-z]{3,20}$/;
const VALID_MONTH = /^\d{4}-\d{2}$/;
/**
 * Interpreter to run the scrapers with, as an argv prefix.
 *
 * Windows needs `py -3`, not `python` and not a bare `py`:
 *  - bare `python` on PATH is the Microsoft Store stub, which has no requests/bs4;
 *  - bare `py` honours each script's `#!/usr/bin/env python3` shebang and re-dispatches
 *    to that same Store 3.11, so the scrapers die on `ModuleNotFoundError: bs4` even
 *    though the deps are installed. An explicit `-3` overrides the shebang and reaches
 *    the real 3.13 install.
 * Override with INGEST_PYTHON (space-separated, e.g. "/usr/bin/python3").
 */
const PYTHON_CMD = (process.env.INGEST_PYTHON || (process.platform === 'win32' ? 'py -3' : 'python3'))
  .split(' ')
  .filter(Boolean);
const PYTHON = PYTHON_CMD[0];
const PYTHON_ARGS = PYTHON_CMD.slice(1);
const REPO_ROOT = path.resolve(__dirname, '../..');
/** A scrape that has not finished in this long is treated as hung and marked failed. */
const RUN_TIMEOUT_MS = 30 * 60 * 1000;

/** One concurrent run per source: two scrapes of the same site race on the same rows. */
const running = new Set<string>();

function json(res: http.ServerResponse, code: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

interface TriggerOptions {
  format: string;
  months: string[];
  maxEvents: number;
}

function parseOptions(body: string): TriggerOptions | { error: string } {
  let parsed: Record<string, unknown>;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    return { error: 'invalid JSON body' };
  }

  const format = String(parsed.format ?? 'standard').toLowerCase();
  if (!VALID_FORMAT.test(format)) return { error: 'invalid format' };

  const rawMonths = Array.isArray(parsed.months) ? parsed.months.slice(0, 12) : [];
  const months = rawMonths.map((m) => String(m));
  for (const m of months) {
    if (!VALID_MONTH.test(m)) return { error: `invalid month: ${m} (expected YYYY-MM)` };
  }

  const maxEvents = Math.floor(Number(parsed.maxEvents ?? 40));
  if (!Number.isFinite(maxEvents) || maxEvents < 1 || maxEvents > 500) {
    return { error: 'maxEvents must be between 1 and 500' };
  }

  return { format, months, maxEvents };
}

function startScrape(source: string, opts: TriggerOptions): number {
  const scraper = SCRAPERS[source];
  const runId = startIngestRun(source, opts.format);

  const args = [...PYTHON_ARGS, scraper.script, '--formats', opts.format, scraper.limitFlag, String(opts.maxEvents)];
  if (scraper.supportsMonths && opts.months.length) args.push('--months', ...opts.months);
  if (process.env.MTG_DB_DIR) {
    args.push('--db', path.join(process.env.MTG_DB_DIR, 'mtg-deck-builder.db'));
  }

  running.add(source);
  const child = spawn(PYTHON, args, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    // No shell: argv is passed straight to the process, so request data can never
    // be interpreted as a command.
    shell: false,
  });

  let stderr = '';
  child.stdout?.on('data', (c) => console.log(`[ingest:${source}] ${String(c).trimEnd()}`));
  child.stderr?.on('data', (c) => {
    const chunk = String(c);
    stderr = (stderr + chunk).slice(-2000);
    console.error(`[ingest:${source}] ${chunk.trimEnd()}`);
  });

  const timer = setTimeout(() => {
    child.kill();
    stderr += `\ntimed out after ${RUN_TIMEOUT_MS / 60000} minutes`;
  }, RUN_TIMEOUT_MS);

  const settle = (status: 'ok' | 'failed', error: string | null) => {
    clearTimeout(timer);
    running.delete(source);
    const freshest = getCorpusFreshness(opts.format).find((f) => f.source === source);
    try {
      finishIngestRun(runId, {
        status,
        newestEventDate: freshest?.newestEvent ?? null,
        seen: freshest?.decks ?? 0,
        error,
      });
    } catch (e) {
      console.error(`[ingest:${source}] could not record run ${runId}:`, e);
    }
  };

  child.on('error', (err) => settle('failed', `spawn failed: ${err.message}`));
  child.on('close', (code) => {
    if (code === 0) settle('ok', null);
    else settle('failed', `exit ${code}: ${stderr.slice(-500) || 'no stderr'}`);
  });

  return runId;
}

/**
 * Scheduled ingest. Off unless INGEST_SCHEDULE_HOURS is set, so a dev box never
 * scrapes by accident; the VPS sets it in the PM2 env.
 *
 * Sources are staggered rather than fired together: three scrapers hitting three
 * sites at the same moment is both ruder to them and harder to read in the log.
 */
export function startIngestSchedule(): void {
  const hours = Number(process.env.INGEST_SCHEDULE_HOURS || 0);
  if (!Number.isFinite(hours) || hours <= 0) return;

  const sources = (process.env.INGEST_SCHEDULE_SOURCES || 'mtgo,mtgtop8')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SCRAPERS[s]);
  if (!sources.length) return;

  const format = (process.env.INGEST_SCHEDULE_FORMAT || 'standard').toLowerCase();
  const periodMs = hours * 3600 * 1000;
  const staggerMs = Math.min(10 * 60 * 1000, periodMs / (sources.length + 1));

  console.log(
    `[ingest] schedule on: ${sources.join(', ')} every ${hours}h (format ${format})`
  );

  sources.forEach((source, i) => {
    const tick = () => {
      if (running.has(source)) {
        console.log(`[ingest] skipping ${source}: previous run still going`);
        return;
      }
      try {
        startScrape(source, { format, months: [], maxEvents: 60 });
      } catch (error) {
        console.error(`[ingest] scheduled ${source} failed to start:`, error);
      }
    };
    // Stagger the first fire, then hold the period.
    setTimeout(() => {
      tick();
      setInterval(tick, periodMs).unref?.();
    }, staggerMs * (i + 1)).unref?.();
  });
}

/**
 * Handle an /ingest/* request. Returns true when the path was ours.
 * `body` is only read for POST.
 */
export function handleIngestRoute(
  method: string,
  pathname: string,
  body: string,
  res: http.ServerResponse
): boolean {
  if (!pathname.startsWith('/ingest')) return false;

  try {
    if (method === 'GET' && pathname === '/ingest/status') {
      const runs = getIngestStatus();
      json(res, 200, {
        runs,
        running: [...running],
        corpus: getCorpusFreshness('standard'),
        sources: Object.keys(SCRAPERS),
      });
      return true;
    }

    const match = pathname.match(/^\/ingest\/([a-z0-9_-]{1,30})$/);
    if (method === 'POST' && match) {
      const source = match[1];
      if (!SCRAPERS[source]) {
        json(res, 404, { error: `unknown source: ${source}`, sources: Object.keys(SCRAPERS) });
        return true;
      }
      if (running.has(source)) {
        json(res, 409, { error: `a ${source} ingest is already running` });
        return true;
      }

      const opts = parseOptions(body);
      if ('error' in opts) {
        json(res, 400, { error: opts.error });
        return true;
      }

      const runId = startScrape(source, opts);
      json(res, 202, { runId, source, ...opts, status: 'running' });
      return true;
    }

    json(res, 404, { error: 'not found' });
    return true;
  } catch (error) {
    console.error('[ingest] request failed:', error);
    json(res, 500, { error: 'ingest request failed' });
    return true;
  }
}
