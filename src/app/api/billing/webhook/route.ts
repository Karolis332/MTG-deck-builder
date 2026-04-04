import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient, getStripeSetting, getUserByStripeCustomer, updateUserBilling } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/webhook
 * Stripe webhook endpoint — optional, for hosted deployments.
 * For local Electron usage, polling via /api/billing/subscription?sync=true is the primary mechanism.
 * This endpoint handles webhooks if the app is exposed (e.g., via ngrok during development or Overwolf hosted).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  }

  const webhookSecret = getStripeSetting('stripe_webhook_secret');
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const user = getUserByStripeCustomer(customerId);
        if (!user) break;

        const tier = identifyTierFromSub(sub);
        const status = mapStatus(sub.status);

        const periodEnd = sub.items.data[0]?.current_period_end;
        updateUserBilling(user.id, {
          stripe_subscription_id: sub.id,
          subscription_tier: tier,
          subscription_status: status,
          subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const user = getUserByStripeCustomer(customerId);
        if (!user) break;

        updateUserBilling(user.id, {
          subscription_tier: 'free',
          subscription_status: 'inactive',
          stripe_subscription_id: null,
          subscription_ends_at: null,
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function identifyTierFromSub(sub: Stripe.Subscription): 'free' | 'pro' | 'commander' {
  const amount = sub.items.data[0]?.price?.unit_amount;
  if (amount && amount >= 1400) return 'commander';
  if (amount && amount >= 400) return 'pro';
  return 'free';
}

function mapStatus(status: Stripe.Subscription.Status): 'active' | 'trialing' | 'past_due' | 'cancelled' | 'inactive' {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'canceled':
    case 'unpaid': return 'cancelled';
    default: return 'inactive';
  }
}
