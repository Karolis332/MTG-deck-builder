import { describe, it, expect } from 'vitest';
import { bracketMatchColor } from '../tiles/BracketTile';

describe('bracketMatchColor', () => {
  it('is green when classified bracket matches target', () => {
    expect(bracketMatchColor(3, 3)).toBe('text-green-400');
  });

  it('is orange when the deck is over-tuned for the target', () => {
    expect(bracketMatchColor(4, 3)).toBe('text-orange-400');
  });

  it('is blue when the deck is under the target', () => {
    expect(bracketMatchColor(2, 3)).toBe('text-blue-400');
  });
});
