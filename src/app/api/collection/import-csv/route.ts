import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

/**
 * Import collection from CSV (Untapped.gg format)
 *
 * Format: Id, Name, Set, Color, Rarity, Count, PrintCount
 * Example: 6947, Enlightened Tutor, MIR, White, Uncommon, 4, 0
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return unauthorizedResponse();
  }

  try {
    const { csv, source: importSource } = await request.json() as { csv: string; source?: 'paper' | 'arena' };
    const collectionSource = importSource || 'paper';

    if (!csv || typeof csv !== 'string') {
      return NextResponse.json(
        { error: 'CSV data required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Debug: Check database has cards
    const cardCount = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number };
    console.log(`[CSV Import] Database has ${cardCount.count} cards`);

    // Parse CSV
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must have header and at least one row' },
        { status: 400 }
      );
    }

    // Skip header line
    const dataLines = lines.slice(1);

    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Parse CSV line respecting quotes (handles commas inside quoted fields)
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === '\t') && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim()); // Push last field

      if (parts.length < 6) {
        errors.push(`Invalid line format: ${line}`);
        skipped++;
        continue;
      }

      // Parse columns: Id, Name, Set, Color, Rarity, Count, PrintCount
      const cardName = parts[1]?.replace(/^["']|["']$/g, '').trim(); // Remove quotes and trim
      const count = parseInt(parts[5]) || 0;

      // Skip if count is 0
      if (count === 0) {
        skipped++;
        continue;
      }

      console.log(`[CSV Import] Processing: "${cardName}" (count: ${count})`);

      // Find card in database (try exact match first, then fuzzy)
      let card = db
        .prepare('SELECT id, name FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1')
        .get(cardName) as { id: string; name: string } | undefined;

      if (!card) {
        console.log(`[CSV Import] ⚠️  Exact match failed for "${cardName}", trying LIKE search...`);
        card = db
          .prepare('SELECT id, name FROM cards WHERE name LIKE ? COLLATE NOCASE LIMIT 1')
          .get(`%${cardName}%`) as { id: string; name: string } | undefined;
      }

      if (!card) {
        console.log(`[CSV Import] ❌ CARD NOT FOUND: "${cardName}"`);
        errors.push(`"${cardName}"`);
        skipped++;
        continue;
      }

      console.log(`[CSV Import] ✅ Found: "${card.name}" (id: ${card.id})`)

      // Check if card already in collection for this source
      const existing = db
        .prepare('SELECT quantity FROM collection WHERE user_id = ? AND card_id = ? AND source = ?')
        .get(authUser.userId, card.id, collectionSource) as { quantity: number } | undefined;

      if (existing) {
        // Update quantity
        db.prepare('UPDATE collection SET quantity = ? WHERE user_id = ? AND card_id = ? AND source = ?')
          .run(count, authUser.userId, card.id, collectionSource);
        updated++;
      } else {
        // Insert new
        db.prepare('INSERT INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, ?, ?)')
          .run(authUser.userId, card.id, count, collectionSource);
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      errors: errors.slice(0, 10), // First 10 errors only
      total: dataLines.length,
      message: `Imported ${imported} cards, updated ${updated} cards, skipped ${skipped} cards`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'CSV import failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
