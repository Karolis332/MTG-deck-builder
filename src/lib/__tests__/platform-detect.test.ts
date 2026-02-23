import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('subscription (standalone mode)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isPremium returns true in non-Overwolf mode', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    const { isPremium } = await import('@/lib/subscription');
    const result = await isPremium();
    expect(result).toBe(true);
  });

  it('canUseFeature returns true for all features in non-Overwolf mode', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    const { canUseFeature } = await import('@/lib/subscription');
    expect(await canUseFeature('ai_suggestions')).toBe(true);
    expect(await canUseFeature('sideboard_guide')).toBe(true);
    expect(await canUseFeature('ml_pipeline')).toBe(true);
    expect(await canUseFeature('advanced_analytics')).toBe(true);
  });

  it('resetSubscriptionCache forces re-check', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    const { isPremium, resetSubscriptionCache } = await import('@/lib/subscription');
    await isPremium();
    resetSubscriptionCache();
    const result = await isPremium();
    expect(result).toBe(true);
  });
});

describe('subscription (Overwolf free tier)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isPremium returns false when Overwolf and no subscription', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(true),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    // Mock fetch to return no subscription
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 'free' }),
    }) as any;

    const { isPremium } = await import('@/lib/subscription');
    const result = await isPremium();
    expect(result).toBe(false);
  });

  it('isPremium returns true when Overwolf with premium subscription', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(true),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 'premium' }),
    }) as any;

    const { isPremium } = await import('@/lib/subscription');
    const result = await isPremium();
    expect(result).toBe(true);
  });
});
