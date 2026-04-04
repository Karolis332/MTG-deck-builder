import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally for subscription API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('subscription (standalone mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('isPremium returns true when subscription is active pro', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tier: 'pro', status: 'active', ends_at: null, has_stripe: true }),
    });

    const { isPremium } = await import('@/lib/subscription');
    const result = await isPremium();
    expect(result).toBe(true);
  });

  it('isPremium returns false when subscription is free', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tier: 'free', status: 'inactive', ends_at: null, has_stripe: false }),
    });

    const { isPremium } = await import('@/lib/subscription');
    const result = await isPremium();
    expect(result).toBe(false);
  });

  it('canUseFeature gates by tier', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tier: 'pro', status: 'active', ends_at: null, has_stripe: true }),
    });

    const { canUseFeature } = await import('@/lib/subscription');
    // Pro features should be available
    expect(await canUseFeature('ml_pipeline')).toBe(true);
    expect(await canUseFeature('advanced_analytics')).toBe(true);
    expect(await canUseFeature('sideboard_guide')).toBe(true);
    // Commander features should NOT be available on pro
    expect(await canUseFeature('ai_suggestions')).toBe(false);
    expect(await canUseFeature('ai_deck_construction')).toBe(false);
  });

  it('canUseFeature allows all for commander tier', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tier: 'commander', status: 'active', ends_at: null, has_stripe: true }),
    });

    const { canUseFeature } = await import('@/lib/subscription');
    expect(await canUseFeature('ai_suggestions')).toBe(true);
    expect(await canUseFeature('ai_deck_construction')).toBe(true);
    expect(await canUseFeature('ml_pipeline')).toBe(true);
  });

  it('resetSubscriptionCache forces re-fetch', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(false),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tier: 'pro', status: 'active', ends_at: null, has_stripe: true }),
    });

    const { isPremium, resetSubscriptionCache } = await import('@/lib/subscription');
    await isPremium();

    // Change response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tier: 'free', status: 'inactive', ends_at: null, has_stripe: false }),
    });

    resetSubscriptionCache();
    const result = await isPremium();
    expect(result).toBe(false);
  });
});

describe('subscription (Overwolf mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('isPremium returns false when Overwolf and no subscription', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(true),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'free' }),
    });

    const { isPremium } = await import('@/lib/subscription');
    const result = await isPremium();
    expect(result).toBe(false);
  });

  it('isPremium returns true when Overwolf with premium subscription', async () => {
    vi.doMock('@/lib/electron-bridge', () => ({
      checkIsOverwolf: vi.fn().mockResolvedValue(true),
      getElectronAPI: vi.fn().mockReturnValue(null),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'premium' }),
    });

    const { isPremium } = await import('@/lib/subscription');
    const result = await isPremium();
    expect(result).toBe(true);
  });
});
