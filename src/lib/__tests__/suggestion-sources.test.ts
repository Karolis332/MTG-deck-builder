import { describe, it, expect } from 'vitest';
import { SOURCE_LABEL, type SuggestionSource } from '@/lib/suggestion-sources';

describe('SOURCE_LABEL', () => {
  it('has a label entry for every SuggestionSource with the right tone', () => {
    const expectedTones: Record<SuggestionSource, 'model' | 'llm' | 'rules'> = {
      'collaborative-filtering': 'model',
      ml: 'model',
      edhrec: 'model',
      ollama: 'llm',
      openai: 'llm',
      synergy: 'rules',
      rules: 'rules',
    };
    for (const [source, tone] of Object.entries(expectedTones)) {
      expect(SOURCE_LABEL[source as SuggestionSource].tone).toBe(tone);
      expect(SOURCE_LABEL[source as SuggestionSource].label.length).toBeGreaterThan(0);
    }
    expect(SOURCE_LABEL['collaborative-filtering'].short).toBe('MODEL');
  });
});
