import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveAppConfigPath } from '../first-boot';

// resolveAppConfigPath only reads ELECTRON_USER_DATA/HOME/USERPROFILE/APPDATA,
// but takes NodeJS.ProcessEnv for compatibility with process.env at call sites —
// build a full env object per test so it satisfies the type without leaking
// the real process.env into assertions.
function fakeEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return { ...overrides } as NodeJS.ProcessEnv;
}

describe('resolveAppConfigPath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'first-boot-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('prefers ELECTRON_USER_DATA when set, even if the file does not exist yet', () => {
    const result = resolveAppConfigPath(fakeEnv({ ELECTRON_USER_DATA: tmpDir }), '/unused/cwd');
    expect(result).toBe(path.join(tmpDir, 'app-config.json'));
  });

  it('finds the lowercase-dashed candidate (actual Electron userData dir)', () => {
    const lowercaseDir = path.join(tmpDir, '.config', 'the-black-grimoire');
    fs.mkdirSync(lowercaseDir, { recursive: true });
    fs.writeFileSync(path.join(lowercaseDir, 'app-config.json'), '{}');

    const result = resolveAppConfigPath(fakeEnv({ HOME: tmpDir }), '/unused/cwd');
    expect(result).toBe(path.join(lowercaseDir, 'app-config.json'));
  });

  it('finds the capitalized productName candidate as a fallback casing', () => {
    const capitalDir = path.join(tmpDir, '.config', 'The Black Grimoire');
    fs.mkdirSync(capitalDir, { recursive: true });
    fs.writeFileSync(path.join(capitalDir, 'app-config.json'), '{}');

    const result = resolveAppConfigPath(fakeEnv({ HOME: tmpDir }), '/unused/cwd');
    expect(result).toBe(path.join(capitalDir, 'app-config.json'));
  });

  it('falls back to cwd when no candidate exists', () => {
    const result = resolveAppConfigPath(fakeEnv({ HOME: tmpDir }), tmpDir);
    expect(result).toBe(path.join(tmpDir, 'app-config.json'));
  });
});

describe('pendingAccount password hashing interop', () => {
  it('a hash produced by hashPassword verifies with verifyPassword (same format the setup wizard relies on)', async () => {
    const { hashPassword, verifyPassword } = await import('../auth');
    const hash = hashPassword('correct horse battery staple');
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(verifyPassword('wrong password', hash)).toBe(false);
  });
});

describe('normalizePendingAccount', () => {
  it('keeps an existing hash and never returns a plaintext password', async () => {
    const { normalizePendingAccount } = await import('../first-boot');
    const out = normalizePendingAccount({ username: 'u', email: 'e@x', passwordHash: 'aa:bb' });
    expect(out).toEqual({ username: 'u', email: 'e@x', passwordHash: 'aa:bb' });
  });
  it('hashes a legacy plaintext password into the scrypt format', async () => {
    const { normalizePendingAccount } = await import('../first-boot');
    const { verifyPassword } = await import('../password');
    const out = normalizePendingAccount({ username: 'u', email: 'e@x', password: 'Secret-123' });
    expect(out).not.toHaveProperty('password');
    expect(out.passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword('Secret-123', out.passwordHash)).toBe(true);
  });
});
