'use client';

import { cn } from '@/lib/utils';
import type { DeckData } from '@/hooks/use-deck-editor';
import { MatchHistoryPanel } from '@/components/match/MatchHistoryPanel';
import type { DbCard } from '@/lib/types';
import { CraftPathPanel } from '@/components/craft-path-panel';
import { PilotGuidePanel } from '@/components/pilot-guide-panel';
import { SparklesIcon, ComboIcon, Spinner } from './icons';

export interface BuildExplanation {
  strategy: string;
  roleBreakdown: Record<string, string[]>;
  cardReasons: Record<string, string>;
  modelUsed: string;
  buildTimeMs: number;
  commanderName: string;
  themes: string;
}

export interface ComboEntry {
  id: string;
  description: string | null;
  prerequisites: string | null;
  mana_needed: string | null;
  popularity: number | null;
  cards: Array<{ card_name: string; must_be_commander: boolean }>;
  results: Array<{ feature_name: string }>;
}

interface AnalysisRailProps {
  deck: DeckData;
  deckId: number;
  isCommanderFormat: boolean;
  showExplanation: boolean;
  explanation: BuildExplanation | null;
  onDismissExplanation: () => void;
  showCombos: boolean;
  onToggleCombos: () => void;
  combosLoading: boolean;
  includedCombos: ComboEntry[];
  almostIncludedCombos: ComboEntry[];
  onRescanCombos: () => void;
  // Optional until page.tsx passes them (it already holds setSelectedCard / setConsultantPrefill for LiveRail).
  onOpenCard?: (card: DbCard) => void;
  onAskConsultant?: (prompt: string) => void;
}

// Right rail: build explanation + stats/analysis/pilot/craft/validation/match-log/combos stack —
// unchanged behaviour, lifted verbatim out of the old page.tsx two-pane layout.
export function AnalysisRail({
  deck,
  deckId,
  isCommanderFormat,
  showExplanation,
  explanation,
  onDismissExplanation,
  showCombos,
  onToggleCombos,
  combosLoading,
  includedCombos,
  almostIncludedCombos,
  onRescanCombos,
  onOpenCard,
  onAskConsultant,
}: AnalysisRailProps) {
  const format = deck.format;

  return (
    <div className="p-3">
      {showExplanation && explanation && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-slide-up">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">AI Build Strategy</span>
            </div>
            <button onClick={onDismissExplanation} className="text-[10px] text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>

          <p className="mb-2 text-xs text-foreground/80">{explanation.strategy}</p>

          {explanation.themes && (
            <div className="mb-2 flex flex-wrap gap-1">
              {explanation.themes.split(', ').map((t) => (
                <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            {Object.entries(explanation.roleBreakdown).map(([role, cards]) => (
              <details key={role} className="group">
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground">
                  <span className="transition-transform group-open:rotate-90">&#9654;</span>
                  {role} ({cards.length})
                </summary>
                <div className="ml-4 mt-1 space-y-0.5">
                  {cards.map((cardName) => (
                    <div key={cardName} className="flex items-start gap-1 text-[10px]">
                      <span className="text-foreground/80">{cardName}</span>
                      {explanation.cardReasons[cardName] && (
                        <span className="text-muted-foreground">— {explanation.cardReasons[cardName]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-3 text-[9px] text-muted-foreground">
            <span>Model: {explanation.modelUsed?.split('-').slice(0, 2).join(' ')}</span>
            <span>Built in {((explanation.buildTimeMs || 0) / 1000).toFixed(1)}s</span>
          </div>
        </div>
      )}

      {isCommanderFormat && (
        <>
          <PilotGuidePanel deckId={deckId} className="mb-3" />
          <CraftPathPanel
            commanderName={deck.cards.find((c) => c.board === 'commander')?.name ?? null}
            format={format}
            className="mb-3"
          />
        </>
      )}

      <MatchHistoryPanel deckId={deckId} onOpenCard={onOpenCard} onAskConsultant={onAskConsultant} className="mb-4" />

      {isCommanderFormat && (
        <div className="mb-4">
          <button
            onClick={onToggleCombos}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/30"
          >
            <div className="flex items-center gap-2">
              <ComboIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Combos</span>
              {includedCombos.length > 0 && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {includedCombos.length}
                </span>
              )}
              {almostIncludedCombos.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  +{almostIncludedCombos.length} near
                </span>
              )}
            </div>
            <span className={cn('text-xs text-muted-foreground transition-transform', showCombos && 'rotate-180')}>&#9660;</span>
          </button>

          {showCombos && (
            <div className="mt-2 space-y-3 rounded-xl border border-border bg-card p-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Powered by Commander Spellbook</span>
                <button
                  onClick={onRescanCombos}
                  disabled={combosLoading}
                  className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground transition-colors hover:bg-accent/80 disabled:opacity-50"
                >
                  {combosLoading ? 'Scanning...' : 'Scan for Combos'}
                </button>
              </div>

              {combosLoading && (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="h-5 w-5 text-primary" />
                  <span className="ml-2 text-xs text-muted-foreground">Analyzing deck for combos...</span>
                </div>
              )}

              {!combosLoading && includedCombos.length === 0 && almostIncludedCombos.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No combos found. Click &quot;Scan for Combos&quot; to check.
                </p>
              )}

              {!combosLoading && includedCombos.length === 0 && almostIncludedCombos.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  No complete combos yet — expand near-misses below for cards to consider adding.
                </p>
              )}

              {includedCombos.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-green-400">
                    Combos in Your Deck ({includedCombos.length})
                  </h4>
                  <div className="space-y-2">
                    {includedCombos.map((combo) => (
                      <details key={combo.id} className="group rounded-lg border border-green-500/20 bg-green-500/5 p-2">
                        <summary className="flex cursor-pointer items-center gap-2 text-xs">
                          <span className="transition-transform group-open:rotate-90">&#9654;</span>
                          <span className="flex-1 font-medium">{combo.cards.map((c) => c.card_name).join(' + ')}</span>
                          {combo.popularity != null && combo.popularity > 0 && (
                            <span className="shrink-0 text-[9px] text-muted-foreground">pop: {combo.popularity}</span>
                          )}
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {combo.description && <p className="text-[10px] text-foreground/80">{combo.description}</p>}
                          {combo.prerequisites && (
                            <p className="text-[10px] text-muted-foreground">
                              <span className="font-medium">Prerequisites:</span> {combo.prerequisites}
                            </p>
                          )}
                          {combo.results.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {combo.results.map((r) => (
                                <span key={r.feature_name} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                  {r.feature_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {almostIncludedCombos.length > 0 && (() => {
                const deckCardNames = new Set(deck.cards.map((c) => c.name));
                const sorted = [...almostIncludedCombos]
                  .map((combo) => ({ ...combo, missingCount: combo.cards.filter((c) => !deckCardNames.has(c.card_name)).length }))
                  .sort((a, b) => a.missingCount - b.missingCount);

                return (
                  <details className="group/near">
                    <summary className="flex cursor-pointer items-center gap-2 text-xs">
                      <span className="transition-transform group-open/near:rotate-90">&#9654;</span>
                      <h4 className="text-xs font-semibold text-amber-400">Near-Miss Combos ({almostIncludedCombos.length})</h4>
                      {includedCombos.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">— check these for potential additions</span>
                      )}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {sorted.slice(0, 15).map((combo) => (
                        <details key={combo.id} className="group rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                          <summary className="flex cursor-pointer items-center gap-2 text-xs">
                            <span className="transition-transform group-open:rotate-90">&#9654;</span>
                            <span className="flex-1">
                              {combo.cards.map((c) => (
                                <span
                                  key={c.card_name}
                                  className={cn('font-medium', deckCardNames.has(c.card_name) ? 'text-foreground' : 'text-red-400')}
                                >
                                  {c.card_name}
                                  {combo.cards.indexOf(c) < combo.cards.length - 1 ? ' + ' : ''}
                                </span>
                              ))}
                            </span>
                            <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                              {combo.missingCount === 1 ? 'Missing 1 card' : `Missing ${combo.missingCount} cards`}
                            </span>
                          </summary>
                          <div className="mt-2 space-y-1 pl-4">
                            {combo.description && <p className="text-[10px] text-foreground/80">{combo.description}</p>}
                            <div className="text-[10px]">
                              <span className="font-medium text-amber-400">Missing: </span>
                              {combo.cards.filter((c) => !deckCardNames.has(c.card_name)).map((c) => c.card_name).join(', ')}
                            </div>
                            {combo.results.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {combo.results.map((r) => (
                                  <span key={r.feature_name} className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                                    {r.feature_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                      {sorted.length > 15 && (
                        <p className="text-center text-[10px] text-muted-foreground">+{sorted.length - 15} more near-miss combos</p>
                      )}
                    </div>
                  </details>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
