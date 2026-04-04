import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getStripeClient, getUserBilling } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for managing subscription.
 * Returns { url } — frontend opens in system browser.
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured.' }, { status: 400 });
    }

    const billing = getUserBilling(authUser.userId);
    if (!billing.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found. Subscribe to a plan first.' }, { status: 400 });
    }

    const appPort = process.env.PORT || '3000';
    const returnUrl = `http://localhost:${appPort}/settings`;

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open billing portal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
