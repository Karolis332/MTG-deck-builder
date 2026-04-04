import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getStripeClient, getStripePriceId, getUserBilling, updateUserBilling } from '@/lib/stripe';
import { getUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for a subscription plan.
 * Returns { url } — the frontend opens this in the system browser.
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  try {
    const body = await request.json();
    const tier = body.tier as 'pro' | 'commander';

    if (!tier || !['pro', 'commander'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be "pro" or "commander".' }, { status: 400 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured. Add your Stripe secret key in Settings.' }, { status: 400 });
    }

    const priceId = getStripePriceId(tier);
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price ID configured for "${tier}". Add stripe_price_${tier} in Settings.` },
        { status: 400 }
      );
    }

    const user = getUserById(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let billing = getUserBilling(authUser.userId);

    // Create or reuse Stripe customer
    let customerId = billing.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { app_user_id: String(authUser.userId), username: user.username },
      });
      customerId = customer.id;
      updateUserBilling(authUser.userId, { stripe_customer_id: customerId });
    }

    // Build success URL — local app will poll for status change
    const appPort = process.env.PORT || '3000';
    const successUrl = `http://localhost:${appPort}/settings?billing=success`;
    const cancelUrl = `http://localhost:${appPort}/settings?billing=cancelled`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { app_user_id: String(authUser.userId), tier },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
