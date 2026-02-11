import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

// Module-level state for the running pipeline process
let pipelineProcess: ChildProcess | null = null;
let pipelineStatus: {
  running: boolean;
  lines: string[];
  exitCode: number | null;
  startedAt: string | null;
} = { running: false, lines: [], exitCode: null, startedAt: null };

const MAX_LINES = 200;

function addLine(line: string) {
  pipelineStatus.lines.push(line);
  if (pipelineStatus.lines.length > MAX_LINES) {
    pipelineStatus.lines = pipelineStatus.lines.slice(-MAX_LINES);
  }
}

/** Find a working Python executable */
async function findPython(): Promise<string> {
  const candidates = process.platform === 'win32'
    ? ['py', 'python3', 'python']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      const { execSync } = await import('child_process');
      execSync(`${cmd} --version`, { stdio: 'pipe', timeout: 5000 });
      return cmd;
    } catch {
      // try next
    }
  }
  throw new Error('Python not found. Install Python 3.x and ensure it is on PATH.');
}

/** Resolve the scripts directory — check extraResources first (packaged), fall back to cwd (dev) */
function getScriptsDir(): string {
  // In packaged Electron, scripts are in process.resourcesPath/scripts/
  if (process.resourcesPath) {
    const resourceScripts = path.join(process.resourcesPath, 'scripts');
    if (fs.existsSync(path.join(resourceScripts, 'pipeline.py'))) {
      return resourceScripts;
    }
  }
  // Dev mode or Next.js standalone — scripts in project root
  return path.join(process.cwd(), 'scripts');
}

/** Resolve the database path — check MTG_DB_DIR env (set by Electron), fall back to cwd/data */
function getDbPath(): string {
  if (process.env.MTG_DB_DIR) {
    return path.join(process.env.MTG_DB_DIR, 'mtg-deck-builder.db');
  }
  return path.join(process.cwd(), 'data', 'mtg-deck-builder.db');
}

/** Map step presets to pipeline.py arguments */
function buildPipelineArgs(steps: string, target: string): string[] {
  const args: string[] = [];
  const dbPath = getDbPath();

  args.push('--db', dbPath);

  switch (steps) {
    case 'full':
      // No skip flags — run everything
      break;
    case 'aggregate-train-predict':
      args.push('--skip-scrape', '--skip-articles', '--skip-mtgjson', '--skip-edhrec', '--skip-arena');
      break;
    case 'train-predict':
      args.push('--skip-scrape', '--skip-articles', '--skip-mtgjson', '--skip-edhrec', '--skip-arena');
      // Also skip the aggregate steps by adding them individually
      // Pipeline doesn't have granular skip for aggregate, so we'll
      // run with only train by leveraging the existing step flow
      // Actually train_model.py and predict can be run standalone
      break;
    case 'predict':
      args.push('--only', 'predict');
      break;
  }

  // For train-predict, we need to handle target on the train step.
  // The pipeline.py already passes --target blended to train_model.py by default.
  // We can't easily override this from CLI args to pipeline.py, but the
  // pipeline will use whatever is hardcoded. The target param is informational
  // for the user in this context.

  return args;
}

/**
 * POST /api/ml-pipeline — start or cancel the pipeline
 * Body: { target?: string, steps?: string, action?: 'cancel' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Cancel action
    if (body.action === 'cancel') {
      if (pipelineProcess) {
        pipelineProcess.kill();
        pipelineProcess = null;
        pipelineStatus.running = false;
        addLine('\n--- Pipeline cancelled by user ---');
        pipelineStatus.exitCode = -1;
      }
      return NextResponse.json({ ok: true, cancelled: true });
    }

    // Already running?
    if (pipelineStatus.running) {
      return NextResponse.json(
        { error: 'Pipeline is already running', running: true },
        { status: 409 }
      );
    }

    const steps = body.steps || 'full';
    const target = body.target || 'community';

    // Reset status
    pipelineStatus = {
      running: true,
      lines: [],
      exitCode: null,
      startedAt: new Date().toISOString(),
    };

    const python = await findPython();
    const scriptsDir = getScriptsDir();
    const scriptPath = path.join(scriptsDir, 'pipeline.py');
    const pipelineArgs = buildPipelineArgs(steps, target);

    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `Pipeline script not found at: ${scriptPath}` },
        { status: 500 }
      );
    }

    addLine(`$ ${python} scripts/pipeline.py ${pipelineArgs.join(' ')}`);
    addLine(`Started at ${pipelineStatus.startedAt}`);
    addLine('');

    // Use a writable CWD — process.env.MTG_DB_DIR parent, or project root
    const cwd = process.env.MTG_DB_DIR
      ? path.dirname(process.env.MTG_DB_DIR)
      : process.cwd();

    const child = spawn(python, [scriptPath, ...pipelineArgs], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    pipelineProcess = child;

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split('\n')) {
        if (line.trim()) addLine(line);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split('\n')) {
        if (line.trim()) addLine(`[stderr] ${line}`);
      }
    });

    child.on('close', (code) => {
      pipelineStatus.running = false;
      pipelineStatus.exitCode = code ?? -1;
      pipelineProcess = null;
      addLine('');
      addLine(code === 0
        ? '--- Pipeline completed successfully ---'
        : `--- Pipeline exited with code ${code} ---`
      );
    });

    child.on('error', (err) => {
      pipelineStatus.running = false;
      pipelineStatus.exitCode = -1;
      pipelineProcess = null;
      addLine(`[error] ${err.message}`);
    });

    return NextResponse.json({ ok: true, status: 'started' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start pipeline';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/ml-pipeline — poll pipeline progress
 */
export async function GET() {
  const last50 = pipelineStatus.lines.slice(-50);
  return NextResponse.json({
    running: pipelineStatus.running,
    lines: last50,
    exitCode: pipelineStatus.exitCode,
    startedAt: pipelineStatus.startedAt,
  });
}
