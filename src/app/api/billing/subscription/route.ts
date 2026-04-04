import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getUserBilling, syncSubscriptionFromStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/subscription
 * Returns current subscription status. Optionally syncs from Stripe.
 *
 * Query params:
 *   ?sync=true — force sync from Stripe API (slower, requires internet)
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  try {
    const shouldSync = request.nextUrl.searchParams.get('sync') === 'true';

    const billing = shouldSync
      ? await syncSubscriptionFromStripe(authUser.userId)
      : getUserBilling(authUser.userId);

    return NextResponse.json({
      tier: billing.subscription_tier,
      status: billing.subscription_status,
      ends_at: billing.subscription_ends_at,
      has_stripe: !!billing.stripe_customer_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
