import { NextRequest, NextResponse } from 'next/server';
import { getCraftPath } from '@/lib/craft-suggestions';
import { COMMANDER_FORMATS } from '@/lib/constants';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

/**
 * Returns the "what to craft" upgrade path for a commander: the unowned cards
 * in the best-possible build, grouped by Arena wildcard rarity, plus a health
 * delta vs the collection-constrained build.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const body = await request.json();
    const { format = 'commander', commanderName, partnerName, powerLevel, buildHints, rarityFilter } = body;

    if (!COMMANDER_FORMATS.includes(format)) {
      return NextResponse.json({ error: 'Craft path is only available for commander formats' }, { status: 400 });
    }
    if (!commanderName) {
      return NextResponse.json({ error: 'commanderName is required' }, { status: 400 });
    }

    const validPowerLevels = ['casual', 'optimized', 'cedh'];
    const path = await getCraftPath({
      format,
      colors: [],
      commanderName,
      partnerName: typeof partnerName === 'string' && partnerName.trim() ? partnerName.trim() : undefined,
      powerLevel: validPowerLevels.includes(powerLevel) ? powerLevel : undefined,
      buildHints: typeof buildHints === 'string' && buildHints.trim() ? buildHints.trim().slice(0, 500) : undefined,
      rarityFilter: rarityFilter === 'pauper' || rarityFilter === 'peasant' ? rarityFilter : undefined,
      userId: authUser.userId,
    });

    return NextResponse.json(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Craft path failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
