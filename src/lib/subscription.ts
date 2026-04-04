/**
 * Subscription & feature gating.
 *
 * Tier hierarchy: commander > pro > free
 *
 * Free:      deck building, collection, basic match tracking, card search, format validation, export
 * Pro:       + live overlay, draw probabilities, ML predictions, advanced analytics, mulligan advisor, sideboard guide
 * Commander: + AI deck construction (Claude/GPT), synergy engine, CF recs, EDHREC, tournament meta, priority support
 *
 * In standalone Electron (no Overwolf), features are gated by Stripe subscription.
 * In Overwolf, the Overwolf subscription system takes precedence.
 */

import { checkIsOverwolf } from './electron-bridge';

export type SubscriptionTier = 'free' | 'pro' | 'commander';

export type PremiumFeature =
  | 'ai_suggestions'
  | 'sideboard_guide'
  | 'ml_pipeline'
  | 'advanced_analytics'
  | 'live_overlay'
  | 'draw_probabilities'
  | 'mulligan_advisor'
  | 'synergy_engine'
  | 'cf_recommendations'
  | 'edhrec_data'
  | 'tournament_meta'
  | 'ai_deck_construction';

/** Which tier unlocks each feature */
const FEATURE_TIER: Record<PremiumFeature, SubscriptionTier> = {
  live_overlay: 'pro',
  draw_probabilities: 'pro',
  ml_pipeline: 'pro',
  advanced_analytics: 'pro',
  mulligan_advisor: 'pro',
  sideboard_guide: 'pro',
  ai_suggestions: 'commander',
  ai_deck_construction: 'commander',
  synergy_engine: 'commander',
  cf_recommendations: 'commander',
  edhrec_data: 'commander',
  tournament_meta: 'commander',
};

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  commander: 2,
};

interface CachedSubscription {
  tier: SubscriptionTier;
  status: string;
  fetchedAt: number;
}

let _cache: CachedSubscription | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Fetch the current user's subscription tier from the API.
 * Caches for 1 minute to avoid spamming.
 */
async function getSubscription(): Promise<CachedSubscription> {
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache;
  }

  try {
    const resp = await fetch('/api/billing/subscription');
    if (resp.ok) {
      const data = await resp.json();
      _cache = {
        tier: data.tier || 'free',
        status: data.status || 'inactive',
        fetchedAt: Date.now(),
      };
    } else {
      _cache = { tier: 'free', status: 'inactive', fetchedAt: Date.now() };
    }
  } catch {
    _cache = _cache ?? { tier: 'free', status: 'inactive', fetchedAt: Date.now() };
  }

  return _cache;
}

/**
 * Check if the user has an active paid subscription (pro or commander).
 */
export async function isPremium(): Promise<boolean> {
  const isOW = await checkIsOverwolf();
  if (isOW) {
    // Overwolf mode — check overwolf subscription
    try {
      const resp = await fetch('/api/app-state?key=overwolf_subscription');
      if (resp.ok) {
        const data = await resp.json();
        return data.value === 'premium';
      }
    } catch { /* fall through */ }
    return false;
  }

  const sub = await getSubscription();
  if (sub.status !== 'active' && sub.status !== 'trialing') return false;
  return TIER_RANK[sub.tier] >= TIER_RANK.pro;
}

/**
 * Check if a specific feature is available for the current user's tier.
 */
export async function canUseFeature(feature: PremiumFeature): Promise<boolean> {
  const isOW = await checkIsOverwolf();
  if (isOW) {
    return isPremium(); // Overwolf: all-or-nothing
  }

  const sub = await getSubscription();
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    return false;
  }

  const requiredTier = FEATURE_TIER[feature];
  return TIER_RANK[sub.tier] >= TIER_RANK[requiredTier];
}

/**
 * Get the current subscription tier directly.
 */
export async function getCurrentTier(): Promise<SubscriptionTier> {
  const sub = await getSubscription();
  if (sub.status !== 'active' && sub.status !== 'trialing') return 'free';
  return sub.tier;
}

/**
 * Reset cached subscription status (call after purchase/plan change).
 */
export function resetSubscriptionCache(): void {
  _cache = null;
}
