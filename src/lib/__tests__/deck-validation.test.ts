import { describe, it, expect } from 'vitest';
import { validateDeck, type ValidationIssue } from '../deck-validation';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{1}{R}',
    cmc: 2,
    type_line: 'Instant',
    oracle_text: null,
    colors: '["R"]',
    color_identity: '["R"]',
    keywords: '[]',
    set_code: 'tst',
    set_name: 'Test Set',
    collector_number: '1',
    rarity: 'common',
    image_uri_small: null,
    image_uri_normal: null,
    image_uri_large: null,
    image_uri_art_crop: null,
    price_usd: null,
    price_usd_foil: null,
    legalities: '{"standard":"legal","modern":"legal","commander":"legal"}',
    power: null,
    toughness: null,
    loyalty: null,
    produced_mana: null,
    edhrec_rank: null,
    layout: 'normal',
    updated_at: '2024-01-01',
    subtypes: null,
    arena_id: null,
    ...overrides,
  };
}

function makeDeckEntries(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    card_id: `card-${i}`,
    quantity: 1,
    board: 'main',
    card: makeCard({ id: `card-${i}`, name: `Card ${i}` }),
    ...overrides,
  }));
}

function findIssue(issues: ValidationIssue[], substring: string) {
  return issues.find((i) => i.message.includes(substring));
}

describe('validateDeck', () => {
  describe('deck size checks', () => {
    it('warns when standard deck is under 60 cards', () => {
      const cards = makeDeckEntries(40);
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'minimum is 60')).toBeDefined();
      expect(findIssue(issues, 'minimum is 60')?.level).toBe('warning');
    });

    it('does not warn when standard deck has 60+ cards', () => {
      const cards = makeDeckEntries(60);
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'minimum')).toBeUndefined();
    });

    it('errors when commander deck exceeds 100 cards', () => {
      const cards = makeDeckEntries(101);
      const issues = validateDeck(cards, 'commander');
      expect(findIssue(issues, 'exactly 100')).toBeDefined();
      expect(findIssue(issues, 'exactly 100')?.level).toBe('error');
    });

    it('warns when commander deck is under 100 cards', () => {
      const cards = makeDeckEntries(80);
      const issues = validateDeck(cards, 'commander');
      expect(findIssue(issues, 'exactly 100')).toBeDefined();
      expect(findIssue(issues, 'exactly 100')?.level).toBe('warning');
    });

    it('passes when commander deck has exactly 100 cards', () => {
      const cards = makeDeckEntries(100);
      const issues = validateDeck(cards, 'commander');
      expect(findIssue(issues, 'exactly 100')).toBeUndefined();
    });
  });

  describe('sideboard checks', () => {
    it('errors when sideboard exceeds 15 cards', () => {
      const main = makeDeckEntries(60);
      const side = [
        {
          card_id: 'side-1',
          quantity: 16,
          board: 'sideboard',
          card: makeCard({ id: 'side-1', name: 'Sideboard Card' }),
        },
      ];
      const issues = validateDeck([...main, ...side], 'standard');
      expect(findIssue(issues, 'maximum is 15')).toBeDefined();
    });

    it('allows sideboard of 15 or fewer', () => {
      const main = makeDeckEntries(60);
      const side = [
        {
          card_id: 'side-1',
          quantity: 15,
          board: 'sideboard',
          card: makeCard({ id: 'side-1', name: 'Sideboard Card' }),
        },
      ];
      const issues = validateDeck([...main, ...side], 'standard');
      expect(findIssue(issues, 'maximum is 15')).toBeUndefined();
    });

    it('skips sideboard check for commander', () => {
      const main = makeDeckEntries(100);
      const side = [
        {
          card_id: 'side-1',
          quantity: 20,
          board: 'sideboard',
          card: makeCard({ id: 'side-1', name: 'Side Card' }),
        },
      ];
      const issues = validateDeck([...main, ...side], 'commander');
      expect(findIssue(issues, 'maximum is 15')).toBeUndefined();
    });
  });

  describe('commander designation', () => {
    it('warns when commander format has no commander', () => {
      const cards = makeDeckEntries(100);
      const issues = validateDeck(cards, 'commander');
      expect(findIssue(issues, 'No commander designated')).toBeDefined();
    });

    it('does not warn when commander is designated', () => {
      const main = makeDeckEntries(99);
      const commander = [
        {
          card_id: 'cmd-1',
          quantity: 1,
          board: 'commander',
          card: makeCard({ id: 'cmd-1', name: 'Commander' }),
        },
      ];
      const issues = validateDeck([...main, ...commander], 'commander');
      expect(findIssue(issues, 'No commander designated')).toBeUndefined();
    });

    it('also applies to brawl format', () => {
      const cards = makeDeckEntries(60);
      const issues = validateDeck(cards, 'brawl');
      expect(findIssue(issues, 'No commander designated')).toBeDefined();
    });
  });

  describe('copy limits', () => {
    it('errors when more than 4 copies in standard', () => {
      const cards = [
        {
          card_id: 'bolt',
          quantity: 5,
          board: 'main',
          card: makeCard({ id: 'bolt', name: 'Lightning Bolt' }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'More than 4 copies')).toBeDefined();
    });

    it('allows exactly 4 copies in standard', () => {
      const cards = [
        {
          card_id: 'bolt',
          quantity: 4,
          board: 'main',
          card: makeCard({ id: 'bolt', name: 'Lightning Bolt' }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'More than 4 copies')).toBeUndefined();
    });

    it('enforces singleton in commander', () => {
      const other = makeDeckEntries(98);
      const duplicate = [
        {
          card_id: 'dup',
          quantity: 2,
          board: 'main',
          card: makeCard({ id: 'dup', name: 'Duplicate Card' }),
        },
      ];
      const cmd = [
        {
          card_id: 'cmd',
          quantity: 1,
          board: 'commander',
          card: makeCard({ id: 'cmd', name: 'Commander' }),
        },
      ];
      const issues = validateDeck([...other, ...duplicate, ...cmd], 'commander');
      expect(findIssue(issues, 'Singleton rule violated')).toBeDefined();
    });

    it('allows unlimited basic lands', () => {
      const cards = [
        {
          card_id: 'plains',
          quantity: 20,
          board: 'main',
          card: makeCard({ id: 'plains', name: 'Plains' }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'More than 4 copies')).toBeUndefined();
    });

    it('allows unlimited Relentless Rats', () => {
      const cards = [
        {
          card_id: 'rats',
          quantity: 30,
          board: 'main',
          card: makeCard({ id: 'rats', name: 'Relentless Rats' }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'More than 4 copies')).toBeUndefined();
    });

    it('allows unlimited Shadowborn Apostle', () => {
      const cards = [
        {
          card_id: 'apostle',
          quantity: 30,
          board: 'main',
          card: makeCard({ id: 'apostle', name: 'Shadowborn Apostle' }),
        },
      ];
      const issues = validateDeck(cards, 'commander');
      expect(findIssue(issues, 'Singleton rule violated')).toBeUndefined();
    });

    it('counts copies across boards', () => {
      const cards = [
        {
          card_id: 'bolt-main',
          quantity: 3,
          board: 'main',
          card: makeCard({ id: 'bolt-main', name: 'Lightning Bolt' }),
        },
        {
          card_id: 'bolt-side',
          quantity: 3,
          board: 'sideboard',
          card: makeCard({ id: 'bolt-side', name: 'Lightning Bolt' }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'More than 4 copies')).toBeDefined();
    });
  });

  describe('format legality', () => {
    it('errors for cards not legal in format', () => {
      const cards = [
        {
          card_id: 'banned',
          quantity: 4,
          board: 'main',
          card: makeCard({
            id: 'banned',
            name: 'Banned Card',
            legalities: '{"standard":"banned"}',
          }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'Not legal in standard')).toBeDefined();
    });

    it('allows legal cards', () => {
      const cards = makeDeckEntries(60);
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'Not legal')).toBeUndefined();
    });

    it('allows restricted cards', () => {
      const cards = [
        {
          card_id: 'restricted',
          quantity: 1,
          board: 'main',
          card: makeCard({
            id: 'restricted',
            name: 'Restricted Card',
            legalities: '{"vintage":"restricted"}',
          }),
        },
      ];
      const issues = validateDeck(cards, 'vintage');
      expect(findIssue(issues, 'Not legal')).toBeUndefined();
    });

    it('handles not_legal status', () => {
      const cards = [
        {
          card_id: 'notlegal',
          quantity: 4,
          board: 'main',
          card: makeCard({
            id: 'notlegal',
            name: 'Not Legal Card',
            legalities: '{"standard":"not_legal"}',
          }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'Not legal in standard')).toBeDefined();
    });

    it('skips legality check when format is null', () => {
      const cards = [
        {
          card_id: 'any',
          quantity: 4,
          board: 'main',
          card: makeCard({
            id: 'any',
            name: 'Any Card',
            legalities: '{"standard":"banned"}',
          }),
        },
      ];
      const issues = validateDeck(cards, null);
      expect(findIssue(issues, 'Not legal')).toBeUndefined();
    });

    it('handles malformed legalities JSON gracefully', () => {
      const cards = [
        {
          card_id: 'bad',
          quantity: 4,
          board: 'main',
          card: makeCard({
            id: 'bad',
            name: 'Bad JSON Card',
            legalities: 'not-valid-json',
          }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      expect(findIssue(issues, 'Not legal')).toBeUndefined();
    });

    it('handles null legalities', () => {
      const cards = [
        {
          card_id: 'null',
          quantity: 4,
          board: 'main',
          card: makeCard({ id: 'null', name: 'Null Card', legalities: null }),
        },
      ];
      expect(() => validateDeck(cards, 'standard')).not.toThrow();
    });

    it('deduplicates illegal card names', () => {
      const cards = [
        {
          card_id: 'banned-main',
          quantity: 2,
          board: 'main',
          card: makeCard({ id: 'banned-main', name: 'Banned Card', legalities: '{"standard":"banned"}' }),
        },
        {
          card_id: 'banned-side',
          quantity: 2,
          board: 'sideboard',
          card: makeCard({ id: 'banned-side', name: 'Banned Card', legalities: '{"standard":"banned"}' }),
        },
      ];
      const issues = validateDeck(cards, 'standard');
      const legalityIssue = findIssue(issues, 'Not legal');
      // Should only show "Banned Card" once
      expect(legalityIssue?.cardNames?.filter((n) => n === 'Banned Card')).toHaveLength(1);
    });

    it('truncates long illegal card lists to 5', () => {
      const cards = Array.from({ length: 8 }, (_, i) => ({
        card_id: `illegal-${i}`,
        quantity: 4,
        board: 'main',
        card: makeCard({
          id: `illegal-${i}`,
          name: `Illegal Card ${i}`,
          legalities: '{"standard":"banned"}',
        }),
      }));
      const issues = validateDeck(cards, 'standard');
      const legalityIssue = findIssue(issues, 'Not legal');
      expect(legalityIssue?.message).toContain('and 3 more');
    });
  });

  describe('edge cases', () => {
    it('returns empty issues for empty deck', () => {
      expect(validateDeck([], 'standard')).toEqual([]);
    });

    it('handles unknown format gracefully', () => {
      const cards = makeDeckEntries(40);
      const issues = validateDeck(cards, 'unknown_format');
      // Should use default deck size (60)
      expect(findIssue(issues, 'minimum is 60')).toBeDefined();
    });
  });
});
