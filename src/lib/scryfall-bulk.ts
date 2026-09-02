// Streams card objects out of a Scryfall bulk-data download without holding the
// whole payload in memory. Scryfall moved bulk files to gzip'd JSON Lines in 2026
// (`jsonl_download_uri`); the plain JSON array (`download_uri`) path is kept as a
// fallback in case it returns.
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { Readable } from 'stream';

export function isJsonl(url: string): boolean {
  return /\.jsonl(\.gz)?(\?.*)?$/i.test(url);
}

export async function* iterateBulkCards(
  response: Response,
  url: string
): AsyncGenerator<Record<string, unknown>> {
  if (!isJsonl(url)) {
    const cards = (await response.json()) as Record<string, unknown>[];
    for (const card of cards) yield card;
    return;
  }
  if (!response.body) throw new Error('Bulk data response has no body');
  let stream: Readable = Readable.fromWeb(response.body as never);
  if (/\.gz(\?.*)?$/i.test(url)) stream = stream.pipe(createGunzip());
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) yield JSON.parse(trimmed) as Record<string, unknown>;
  }
}
