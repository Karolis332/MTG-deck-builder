/**
 * Shared vocabulary for where an AI suggestion came from — used by both the
 * suggestion API (source/sources_tried) and any UI that labels a suggestion.
 */

export type SuggestionSource =
  | 'collaborative-filtering'
  | 'ollama'
  | 'openai'
  | 'synergy'
  | 'rules'
  | 'edhrec'
  | 'ml';

export interface SourceLabel {
  label: string;
  short: string;
  tone: 'model' | 'llm' | 'rules';
}

export const SOURCE_LABEL: Record<SuggestionSource, SourceLabel> = {
  'collaborative-filtering': { label: 'Trained model (CF + bandit)', short: 'MODEL', tone: 'model' },
  ml: { label: 'Trained model', short: 'MODEL', tone: 'model' },
  edhrec: { label: 'EDHREC data', short: 'EDHREC', tone: 'model' },
  ollama: { label: 'Local LLM (Ollama)', short: 'LOCAL LLM', tone: 'llm' },
  openai: { label: 'GPT', short: 'GPT', tone: 'llm' },
  synergy: { label: 'Synergy engine', short: 'SYNERGY', tone: 'rules' },
  rules: { label: 'Rule-based', short: 'RULES', tone: 'rules' },
};
