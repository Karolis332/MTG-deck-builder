/**
 * First-boot handler for Electron standalone app.
 *
 * When the app launches after the setup wizard, this module checks for
 * pending actions (account creation, card seeding) and executes them
 * against the running Next.js API.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

interface AppConfig {
  setupComplete?: boolean;
  seedOnBoot?: boolean;
  pendingAccount?: {
    username: string;
    email: string;
    password: string;
  };
  arenaLogPath?: string | null;
  autoStartWatcher?: boolean;
}

function getConfigPath(): string {
  // In Electron, userData is set; in dev, use cwd
  const electronUserData = process.env.ELECTRON_USER_DATA;
  if (electronUserData) {
    return path.join(electronUserData, 'app-config.json');
  }
  // Fallback: check common Electron paths
  const appName = 'MTG Deck Builder';
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(home, '.config', appName, 'app-config.json'),
    path.join(home, 'Library', 'Application Support', appName, 'app-config.json'),
    path.join(process.env.APPDATA || '', appName, 'app-config.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), 'app-config.json');
}

function loadConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(data: Partial<AppConfig>): void {
  const configPath = getConfigPath();
  const existing = loadConfig();
  const merged = { ...existing, ...data };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
}

function postJson(route: string, body: unknown): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const port = process.env.PORT || '3000';

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: route,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode || 500, data: body });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Run pending first-boot actions.
 * Call this after the Next.js server is confirmed running.
 */
export async function runFirstBootActions(): Promise<void> {
  const config = loadConfig();

  // 1. Create pending account
  if (config.pendingAccount) {
    try {
      const result = await postJson('/api/auth/register', config.pendingAccount);
      if (result.status === 200 || result.status === 201) {
        console.log('[FirstBoot] Account created:', config.pendingAccount.username);
        saveConfig({ pendingAccount: undefined });
      } else {
        console.error('[FirstBoot] Account creation failed:', result.data);
      }
    } catch (err) {
      console.error('[FirstBoot] Account creation error:', err);
    }
  }

  // 2. Trigger card seeding
  if (config.seedOnBoot) {
    try {
      console.log('[FirstBoot] Triggering card database seed...');
      const result = await postJson('/api/cards/seed', {});
      console.log('[FirstBoot] Seed result:', result.status);
      saveConfig({ seedOnBoot: false });
    } catch (err) {
      console.error('[FirstBoot] Seed error:', err);
    }
  }
}
