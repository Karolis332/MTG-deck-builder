/**
 * Stripe client singleton.
 * Reads secret key from app_state table (setting_stripe_secret_key).
 * Returns null if no key configured.
 */

import Stripe from 'stripe';
import { getDb } from '@/lib/db';

const STRIPE_PRICE_IDS: Record<string, string> = {};

/** Read a Stripe-related setting from app_state */
export function getStripeSetting(key: string): string | null {
  const db = getDb();
  const row = db
    .prepare('SELECT value FROM app_state WHERE key = ?')
    .get(`setting_${key}`) as { value: string } | undefined;
  return row?.value || null;
}

/** Get Stripe secret key from settings */
function getStripeSecretKey(): string | null {
  return getStripeSetting('stripe_secret_key');
}

/** Create a Stripe client instance. Returns null if no key configured. */
export function getStripeClient(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-03-31.basil' });
}

/** Get the configured price ID for a plan tier */
export function getStripePriceId(tier: 'pro' | 'commander'): string | null {
  // Check runtime cache first
  if (STRIPE_PRICE_IDS[tier]) return STRIPE_PRICE_IDS[tier];
  // Check app_state
  const id = getStripeSetting(`stripe_price_${tier}`);
  if (id) STRIPE_PRICE_IDS[tier] = id;
  return id;
}

// ── User billing DB helpers ──────────────────────────────────────────────

export interface UserBilling {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_tier: 'free' | 'pro' | 'commander';
  subscription_status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'inactive';
  subscription_ends_at: string | null;
}

export function getUserBilling(userId: number): UserBilling {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT stripe_customer_id, stripe_subscription_id,
              subscription_tier, subscription_status, subscription_ends_at
       FROM users WHERE id = ?`
    )
    .get(userId) as UserBilling | undefined;

  return row ?? {
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_tier: 'free',
    subscription_status: 'inactive',
    subscription_ends_at: null,
  };
}

export function updateUserBilling(
  userId: number,
  data: Partial<UserBilling>
): void {
  const db = getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    sets.push(`${key} = ?`);
    params.push(value ?? null);
  }

  if (sets.length === 0) return;
  params.push(userId);

  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

export function getUserByStripeCustomer(customerId: string) {
  const db = getDb();
  return db
    .prepare('SELECT id, username, email FROM users WHERE stripe_customer_id = ?')
    .get(customerId) as { id: number; username: string; email: string } | undefined;
}

// ── Stripe sync helper ───────────────────────────────────────────────────

/**
 * Sync a user's subscription status from Stripe API.
 * Call on app launch and after checkout.
 */
export async function syncSubscriptionFromStripe(userId: number): Promise<UserBilling> {
  const billing = getUserBilling(userId);
  const stripe = getStripeClient();

  if (!stripe || !billing.stripe_subscription_id) {
    return billing;
  }

  try {
    const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);

    const tierFromPrice = identifyTier(sub);
    const status = mapStripeStatus(sub.status);

    // In Stripe v22+, current_period_end is on items, not the subscription itself
    const periodEnd = sub.items.data[0]?.current_period_end;

    const update: Partial<UserBilling> = {
      subscription_tier: tierFromPrice,
      subscription_status: status,
      subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    };

    // If subscription is fully cancelled, reset to free
    if (sub.status === 'canceled') {
      update.subscription_tier = 'free';
      update.subscription_status = 'inactive';
      update.stripe_subscription_id = null;
    }

    updateUserBilling(userId, update);
    return { ...billing, ...update };
  } catch {
    // Stripe unreachable — use cached values
    return billing;
  }
}

function identifyTier(sub: Stripe.Subscription): 'free' | 'pro' | 'commander' {
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return 'free';

  const proPriceId = getStripePriceId('pro');
  const commanderPriceId = getStripePriceId('commander');

  if (priceId === commanderPriceId) return 'commander';
  if (priceId === proPriceId) return 'pro';

  // Fallback: check amount (499 = pro, 1499 = commander)
  const amount = sub.items.data[0]?.price?.unit_amount;
  if (amount && amount >= 1400) return 'commander';
  if (amount && amount >= 400) return 'pro';

  return 'free';
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): UserBilling['subscription_status'] {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'cancelled';
    default:
      return 'inactive';
  }
}
