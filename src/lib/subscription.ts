/**
 * Subscription & premium feature gating for Overwolf monetization.
 *
 * Premium features (gated):
 * - AI suggestions (Claude/GPT)
 * - Sideboard guide generation
 * - ML pipeline execution
 * - Advanced analytics
 *
 * Free features:
 * - Deck building
 * - Collection management
 * - Game tracker / overlay
 * - Basic mulligan advisor
 * - Draft tracker
 */

import { checkIsOverwolf } from './electron-bridge';

export type PremiumFeature =
  | 'ai_suggestions'
  | 'sideboard_guide'
  | 'ml_pipeline'
  | 'advanced_analytics';

let _subscriptionStatus: 'free' | 'premium' | 'unknown' = 'unknown';

/**
 * Check if the user has an active premium subscription.
 * In standalone Electron mode, all features are unlocked.
 * In Overwolf mode, checks subscription status via app_state.
 */
export async function isPremium(): Promise<boolean> {
  const isOW = await checkIsOverwolf();
  if (!isOW) return true; // Standalone: all features unlocked

  if (_subscriptionStatus !== 'unknown') {
    return _subscriptionStatus === 'premium';
  }

  // Check app_state for subscription status
  try {
    const resp = await fetch('/api/app-state?key=overwolf_subscription');
    if (resp.ok) {
      const data = await resp.json();
      _subscriptionStatus = data.value === 'premium' ? 'premium' : 'free';
    } else {
      _subscriptionStatus = 'free';
    }
  } catch {
    _subscriptionStatus = 'free';
  }

  return _subscriptionStatus === 'premium';
}

/**
 * Check if a specific premium feature is available.
 */
export async function canUseFeature(feature: PremiumFeature): Promise<boolean> {
  return isPremium();
}

/**
 * Reset cached subscription status (call after purchase/restore).
 */
export function resetSubscriptionCache(): void {
  _subscriptionStatus = 'unknown';
}
