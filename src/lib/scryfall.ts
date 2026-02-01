import { SCRYFALL_API_BASE, SCRYFALL_RATE_LIMIT_MS } from './constants';
import type { ScryfallCard, ScryfallList, ScryfallAutocomplete, CardIdentifier } from './types';

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < SCRYFALL_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, SCRYFALL_RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'MTGDeckBuilder/0.1.0',
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return rateLimitedFetch(url, options);
    }
    throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function searchCards(
  query: string,
  page = 1
): Promise<ScryfallList<ScryfallCard>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    include_extras: 'false',
    include_multilingual: 'false',
    include_variations: 'false',
  });

  const response = await rateLimitedFetch(
    `${SCRYFALL_API_BASE}/cards/search?${params}`
  );
  return response.json();
}

export async function getCardById(id: string): Promise<ScryfallCard> {
  const response = await rateLimitedFetch(`${SCRYFALL_API_BASE}/cards/${id}`);
  return response.json();
}

export async function getCardByName(
  name: string,
  exact = true
): Promise<ScryfallCard> {
  const params = new URLSearchParams({
    [exact ? 'exact' : 'fuzzy']: name,
  });
  const response = await rateLimitedFetch(
    `${SCRYFALL_API_BASE}/cards/named?${params}`
  );
  return response.json();
}

export async function autocomplete(query: string): Promise<string[]> {
  if (query.length < 2) return [];
  const params = new URLSearchParams({ q: query });
  const response = await rateLimitedFetch(
    `${SCRYFALL_API_BASE}/cards/autocomplete?${params}`
  );
  const data: ScryfallAutocomplete = await response.json();
  return data.data;
}

export async function getCollection(
  identifiers: CardIdentifier[]
): Promise<{ found: ScryfallCard[]; not_found: CardIdentifier[] }> {
  const found: ScryfallCard[] = [];
  const not_found: CardIdentifier[] = [];

  // Process in batches of 75 (Scryfall limit)
  for (let i = 0; i < identifiers.length; i += 75) {
    const batch = identifiers.slice(i, i + 75);
    const response = await rateLimitedFetch(
      `${SCRYFALL_API_BASE}/cards/collection`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: batch }),
      }
    );
    const data = await response.json();
    found.push(...(data.data || []));
    not_found.push(...(data.not_found || []));
  }

  return { found, not_found };
}

export async function getRandomCard(): Promise<ScryfallCard> {
  const response = await rateLimitedFetch(`${SCRYFALL_API_BASE}/cards/random`);
  return response.json();
}

export async function getBulkDataUrl(): Promise<string> {
  const response = await rateLimitedFetch(`${SCRYFALL_API_BASE}/bulk-data/oracle-cards`);
  const data = await response.json();
  return data.download_uri;
}

export function getCardImageUri(
  card: ScryfallCard,
  size: 'small' | 'normal' | 'large' | 'art_crop' = 'normal'
): string {
  if (card.image_uris) {
    return card.image_uris[size];
  }
  if (card.card_faces?.[0]?.image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  return '';
}

export function scryfallToDbCard(card: ScryfallCard) {
  const imageUris = card.image_uris || card.card_faces?.[0]?.image_uris;
  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || null,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text || card.card_faces?.map((f) => f.oracle_text).join('\n//\n') || null,
    colors: card.colors ? JSON.stringify(card.colors) : null,
    color_identity: JSON.stringify(card.color_identity),
    keywords: JSON.stringify(card.keywords),
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    image_uri_small: imageUris?.small || null,
    image_uri_normal: imageUris?.normal || null,
    image_uri_large: imageUris?.large || null,
    image_uri_art_crop: imageUris?.art_crop || null,
    price_usd: card.prices?.usd || null,
    price_usd_foil: card.prices?.usd_foil || null,
    legalities: JSON.stringify(card.legalities),
    power: card.power || null,
    toughness: card.toughness || null,
    loyalty: card.loyalty || null,
    produced_mana: card.produced_mana ? JSON.stringify(card.produced_mana) : null,
    edhrec_rank: card.edhrec_rank || null,
    layout: card.layout,
  };
}
