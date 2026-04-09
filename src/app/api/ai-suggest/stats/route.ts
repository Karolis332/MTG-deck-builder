import { NextResponse } from 'next/server';
import { getAISuggestionStats } from '@/lib/db';

/**
 * GET /api/ai-suggest/stats
 * Returns quality/cost metrics for each AI model/source.
 */
export async function GET() {
  try {
    const stats = getAISuggestionStats();

    // Estimate costs per model (approximate $/1M tokens)
    const costPer1MTokens: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.50, output: 10.00 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-5.4': { input: 3.00, output: 12.00 },
      'claude-sonnet-4-5-20250514': { input: 3.00, output: 15.00 },
      'claude-opus-4-6': { input: 15.00, output: 75.00 },
      'grok-3': { input: 3.00, output: 15.00 },
    };

    const enriched = stats.map((s) => {
      const pricing = s.model ? costPer1MTokens[s.model] : null;
      const estimatedCostUsd = pricing
        ? (s.totalPromptTokens / 1_000_000) * pricing.input +
          (s.totalCompletionTokens / 1_000_000) * pricing.output
        : null;

      return {
        ...s,
        estimatedCostUsd: estimatedCostUsd ? Math.round(estimatedCostUsd * 10000) / 10000 : null,
      };
    });

    return NextResponse.json({ stats: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
