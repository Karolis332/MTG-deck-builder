'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CardInline, CardInlineText } from '@/components/card-inline';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

interface CardImageInfo {
  image_uri_small: string | null;
  image_uri_normal: string | null;
}

interface GrpIdCardInfo extends CardImageInfo {
  card_name: string;
}

interface TelemetryAction {
  id: number;
  match_id: string;
  game_number: number;
  turn_number: number;
  phase: string;
  action_type: string;
  player: string;
  grp_id: number | null;
  card_name: string | null;
  details: string | null;
  action_order: number;
}

interface MatchSummary {
  match_id: string;
  player_name: string | null;
  opponent_name: string | null;
  result: string;
  format: string | null;
  turns: number;
  opening_hand: string | null;
  mulligan_count: number | null;
  on_play: number | null;
  life_progression: string | null;
  draw_order: string | null;
  sideboard_changes: string | null;
  opponent_cards_by_turn: string | null;
  cards_played: string | null;
  opponent_cards_seen: string | null;
}

interface AnalysisResult {
  overall_grade?: string;
  summary?: string;
  key_moments?: Array<{
    turn: number;
    description: string;
    assessment: string;
    suggestion?: string;
  }>;
  patterns?: string[];
  mulligan_assessment?: string;
  mana_efficiency?: string;
  threat_assessment?: string;
  top_improvement?: string;
  raw?: string;
}

interface MatchDetailModalProps {
  matchId: string;
  onClose: () => void;
}

export function MatchDetailModal({ matchId, onClose }: MatchDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<TelemetryAction[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [cardImages, setCardImages] = useState<Record<string, CardImageInfo>>({});
  const [grpIdCards, setGrpIdCards] = useState<Record<number, GrpIdCardInfo>>({});
  const [fallbackCards, setFallbackCards] = useState<string[]>([]);
  const [fallbackImages, setFallbackImages] = useState<Record<string, CardImageInfo>>({});

  // AI Analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Try telemetry first (rich data)
        const telRes = await fetch(`/api/arena-telemetry?match_id=${encodeURIComponent(matchId)}`);
        const telData = await telRes.json();

        if (telData.actions?.length > 0) {
          setActions(telData.actions);
          setSummary(telData.summary || null);
          setCardImages(telData.cards || {});
          setGrpIdCards(telData.grpIdCards || {});
          setLoading(false);
          return;
        }

        // Fallback to arena-matches for cards_played view
        if (telData.summary) {
          setSummary(telData.summary);
        }

        const matchRes = await fetch(`/api/arena-matches?match_id=${encodeURIComponent(matchId)}`);
        const matchData = await matchRes.json();

        if (matchData.match) {
          if (!telData.summary) {
            setSummary(matchData.match as MatchSummary);
          }
          // Parse cards_played for legacy view
          if (matchData.match.cards_played) {
            try {
              const played = JSON.parse(matchData.match.cards_played) as string[];
              setFallbackCards(played.filter((n: string) => typeof n === 'string' && isNaN(Number(n))));
            } catch { /* ignore */ }
          }
          setFallbackImages(matchData.cards || {});
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [matchId]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/arena-telemetry/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      });
      const data = await res.json();
      if (data.error) {
        setAnalysisError(data.error);
      } else {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      setAnalysisError(String(err));
    } finally {
      setAnalyzing(false);
    }
  }, [matchId]);

  const getCardImage = (cardName: string | null, grpId: number | null): CardImageInfo | null => {
    if (cardName && cardImages[cardName]) return cardImages[cardName];
    if (grpId && grpIdCards[grpId]) return { image_uri_small: grpIdCards[grpId].image_uri_small, image_uri_normal: grpIdCards[grpId].image_uri_normal };
    return null;
  };

  const getCardName = (action: TelemetryAction): string => {
    if (action.card_name) return action.card_name;
    if (action.grp_id && grpIdCards[action.grp_id]) return grpIdCards[action.grp_id].card_name;
    return '';
  };

  const resolveGrpId = (grpId: number): { name: string; img: CardImageInfo | null } => {
    const info = grpIdCards[grpId];
    if (info) return { name: info.card_name, img: { image_uri_small: info.image_uri_small, image_uri_normal: info.image_uri_normal } };
    return { name: `#${grpId}`, img: null };
  };

  // Parse opening hand grpIds
  const openingHand = useMemo(() => {
    if (!summary?.opening_hand) return [];
    try {
      const ids = typeof summary.opening_hand === 'string'
        ? JSON.parse(summary.opening_hand) as number[]
        : [];
      return ids.map(id => {
        const info = grpIdCards[id];
        return info
          ? { name: info.card_name, imageSmall: info.image_uri_small, imageNormal: info.image_uri_normal }
          : { name: `grpId:${id}`, imageSmall: null, imageNormal: null };
      });
    } catch { return []; }
  }, [summary, grpIdCards]);

  // Parse life progression for chart
  const lifeData = useMemo(() => {
    if (!summary?.life_progression) return [];
    try {
      const progression = typeof summary.life_progression === 'string'
        ? JSON.parse(summary.life_progression) as Array<{ turn: number; player: number; opponent: number }>
        : [];
      return progression;
    } catch { return []; }
  }, [summary]);

  // Parse draw order
  const drawOrder = useMemo(() => {
    if (!summary?.draw_order) return [];
    try {
      const ids = typeof summary.draw_order === 'string'
        ? JSON.parse(summary.draw_order) as number[]
        : [];
      return ids;
    } catch { return []; }
  }, [summary]);

  // Parse sideboard changes
  const sideboardChanges = useMemo(() => {
    if (!summary?.sideboard_changes) return [];
    try {
      const changes = typeof summary.sideboard_changes === 'string'
        ? JSON.parse(summary.sideboard_changes) as Array<{ game: number; in: number[]; out: number[] }>
        : [];
      return changes;
    } catch { return []; }
  }, [summary]);

  // Parse opponent cards by turn
  const opponentCardsByTurn = useMemo(() => {
    if (!summary?.opponent_cards_by_turn) return [];
    try {
      const oct = typeof summary.opponent_cards_by_turn === 'string'
        ? JSON.parse(summary.opponent_cards_by_turn) as Record<string, number[]>
        : {};
      return Object.entries(oct)
        .map(([turn, ids]) => ({ turn: Number(turn), grpIds: ids }))
        .sort((a, b) => a.turn - b.turn);
    } catch { return []; }
  }, [summary]);

  // Group actions by turn
  const turnGroups = useMemo(() => {
    const groups = new Map<number, TelemetryAction[]>();
    for (const a of actions) {
      const turn = a.turn_number;
      if (!groups.has(turn)) groups.set(turn, []);
      groups.get(turn)!.push(a);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [actions]);

  const hasTelemetry = actions.length > 0;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8 text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading match data...</span>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Match Header */}
            {summary && <MatchHeader summary={summary} />}

            {/* Opening Hand */}
            {openingHand.length > 0 && (
              <div>
                <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">Opening Hand</h3>
                <div className="flex flex-wrap gap-2">
                  {openingHand.map((card, i) => (
                    <CardInline
                      key={i}
                      name={card.name}
                      imageUri={card.imageSmall}
                      imageUriNormal={card.imageNormal}
                    />
                  ))}
                </div>
                {summary?.mulligan_count != null && summary.mulligan_count > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Mulliganed {summary.mulligan_count} time{summary.mulligan_count > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Life Chart */}
            {lifeData.length > 1 && (
              <div>
                <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">Life Totals</h3>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lifeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis dataKey="turn" tick={{ fontSize: 10 }} stroke="#666" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#666" width={30} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', fontSize: '11px' }}
                        labelFormatter={(v) => `Turn ${v}`}
                      />
                      <Line type="monotone" dataKey="player" stroke="#d4a24e" strokeWidth={2} dot={false} name="You" />
                      <Line type="monotone" dataKey="opponent" stroke="#ef4444" strokeWidth={2} dot={false} name="Opponent" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Draw Order */}
            {drawOrder.length > 0 && (
              <div>
                <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">Draw Order</h3>
                <div className="flex flex-wrap gap-1.5">
                  {drawOrder.map((grpId, i) => {
                    const { name, img } = resolveGrpId(grpId);
                    return (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground/50">{i + 1}.</span>
                        {img ? (
                          <CardInline name={name} imageUri={img.image_uri_small} imageUriNormal={img.image_uri_normal} />
                        ) : (
                          <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">{name}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sideboard Changes */}
            {sideboardChanges.length > 0 && (
              <div>
                <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">Sideboard Changes</h3>
                <div className="space-y-3">
                  {sideboardChanges.map((change) => (
                    <div key={change.game} className="rounded-lg border border-border/50 p-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Before Game {change.game}
                      </div>
                      {change.in.length > 0 && (
                        <div className="mb-1.5">
                          <span className="mr-1.5 text-[10px] font-medium text-green-400">IN:</span>
                          <span className="flex flex-wrap gap-1 inline">
                            {change.in.map((grpId, i) => {
                              const { name, img } = resolveGrpId(grpId);
                              return img ? (
                                <CardInline key={i} name={name} imageUri={img.image_uri_small} imageUriNormal={img.image_uri_normal} />
                              ) : (
                                <span key={i} className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-300">{name}</span>
                              );
                            })}
                          </span>
                        </div>
                      )}
                      {change.out.length > 0 && (
                        <div>
                          <span className="mr-1.5 text-[10px] font-medium text-red-400">OUT:</span>
                          <span className="flex flex-wrap gap-1 inline">
                            {change.out.map((grpId, i) => {
                              const { name, img } = resolveGrpId(grpId);
                              return img ? (
                                <CardInline key={i} name={name} imageUri={img.image_uri_small} imageUriNormal={img.image_uri_normal} />
                              ) : (
                                <span key={i} className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">{name}</span>
                              );
                            })}
                          </span>
                        </div>
                      )}
                      {change.in.length === 0 && change.out.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">No changes</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opponent Cards by Turn */}
            {opponentCardsByTurn.length > 0 && (
              <div>
                <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">Opponent Cards by Turn</h3>
                <div className="space-y-1">
                  {opponentCardsByTurn.map(({ turn, grpIds }) => (
                    <div key={turn} className="flex items-start gap-2 text-xs">
                      <span className="shrink-0 w-10 text-right text-[10px] font-mono text-muted-foreground">T{turn}</span>
                      <div className="flex flex-wrap gap-1">
                        {grpIds.map((grpId, i) => {
                          const { name, img } = resolveGrpId(grpId);
                          return img ? (
                            <CardInline key={i} name={name} imageUri={img.image_uri_small} imageUriNormal={img.image_uri_normal} />
                          ) : (
                            <span key={i} className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">{name}</span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Turn Timeline (rich telemetry) */}
            {hasTelemetry && (
              <div>
                <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">Play-by-Play</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {turnGroups.map(([turn, turnActions]) => (
                    <div key={turn}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-heading text-xs font-semibold text-grimoire">Turn {turn}</span>
                        <div className="h-px flex-1 bg-border/50" />
                      </div>
                      <div className="space-y-1 pl-3">
                        {turnActions.map(action => {
                          const cardName = getCardName(action);
                          const img = getCardImage(action.card_name, action.grp_id);
                          const isSelf = action.player === 'self';

                          return (
                            <div key={action.id} className="flex items-center gap-2 text-xs">
                              <span className={cn(
                                'w-[3px] self-stretch rounded-full',
                                isSelf ? 'bg-amber-400/60' : 'bg-red-400/60'
                              )} />
                              <span className={cn(
                                'shrink-0 text-[10px] font-medium',
                                isSelf ? 'text-amber-400/90' : 'text-red-400/80'
                              )}>
                                {isSelf ? 'You' : 'Opp'}
                              </span>
                              <span className="text-muted-foreground">{formatActionType(action.action_type)}</span>
                              {cardName && img ? (
                                <CardInline
                                  name={cardName}
                                  imageUri={img.image_uri_small}
                                  imageUriNormal={img.image_uri_normal}
                                />
                              ) : cardName ? (
                                <span className="font-medium text-foreground">{cardName}</span>
                              ) : null}
                              {action.details && (
                                <span className="text-[10px] text-muted-foreground/70">{action.details}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Cards Played View (fallback for older matches) */}
            {!hasTelemetry && fallbackCards.length > 0 && (
              <div>
                <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">Cards Played</h3>
                <div className="flex flex-wrap gap-2">
                  {fallbackCards.map((name, i) => {
                    const img = fallbackImages[name];
                    return (
                      <CardInline
                        key={`${name}-${i}`}
                        name={name}
                        imageUri={img?.image_uri_small}
                        imageUriNormal={img?.image_uri_normal}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {!hasTelemetry && fallbackCards.length === 0 && !openingHand.length && !lifeData.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No detailed match data available for this match.
              </p>
            )}

            {/* AI Analysis Section */}
            {hasTelemetry && (
              <div className="border-t border-border pt-4">
                {!analysis && !analyzing && (
                  <button
                    onClick={runAnalysis}
                    className="btn-grimoire flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-heading tracking-wide text-primary transition-colors hover:bg-primary/10"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Analyze Match with AI
                  </button>
                )}

                {analyzing && (
                  <div className="flex items-center gap-3 py-4">
                    <Spinner className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Analyzing your play...</span>
                  </div>
                )}

                {analysisError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                    {analysisError}
                  </div>
                )}

                {analysis && <AnalysisDisplay analysis={analysis} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisDisplay({ analysis }: { analysis: AnalysisResult }) {
  if (analysis.raw) {
    return (
      <div className="rounded-lg border border-border/50 bg-accent/20 p-4">
        <h3 className="mb-2 font-heading text-sm font-semibold text-grimoire">AI Analysis</h3>
        <pre className="whitespace-pre-wrap text-xs text-foreground/80">{analysis.raw}</pre>
      </div>
    );
  }

  const GRADE_COLORS: Record<string, string> = {
    A: 'text-green-400 bg-green-500/10',
    B: 'text-blue-400 bg-blue-500/10',
    C: 'text-yellow-400 bg-yellow-500/10',
    D: 'text-orange-400 bg-orange-500/10',
    F: 'text-red-400 bg-red-500/10',
  };

  const gradeColor = analysis.overall_grade
    ? GRADE_COLORS[analysis.overall_grade[0]] || 'text-foreground bg-accent/50'
    : '';

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        {analysis.overall_grade && (
          <span className={cn('rounded-xl px-4 py-2 text-2xl font-bold font-heading', gradeColor)}>
            {analysis.overall_grade}
          </span>
        )}
        {analysis.summary && (
          <p className="flex-1 pt-1 text-sm text-foreground/90">{analysis.summary}</p>
        )}
      </div>

      {/* Key Moments */}
      {analysis.key_moments && analysis.key_moments.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Moments</h4>
          <div className="space-y-2">
            {analysis.key_moments.map((moment, i) => (
              <div key={i} className="rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">T{moment.turn}</span>
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase',
                    moment.assessment === 'good' ? 'bg-green-500/10 text-green-400' :
                    moment.assessment === 'mistake' ? 'bg-red-500/10 text-red-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  )}>
                    {moment.assessment}
                  </span>
                </div>
                <p className="text-xs text-foreground/80">{moment.description}</p>
                {moment.suggestion && (
                  <p className="mt-1 text-[11px] text-primary/80">
                    {moment.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment grid */}
      <div className="grid grid-cols-2 gap-3">
        {analysis.mulligan_assessment && (
          <AssessmentCard label="Mulligan" text={analysis.mulligan_assessment} />
        )}
        {analysis.mana_efficiency && (
          <AssessmentCard label="Mana Usage" text={analysis.mana_efficiency} />
        )}
        {analysis.threat_assessment && (
          <AssessmentCard label="Threat Assessment" text={analysis.threat_assessment} />
        )}
        {analysis.top_improvement && (
          <AssessmentCard label="Top Improvement" text={analysis.top_improvement} highlight />
        )}
      </div>

      {/* Patterns */}
      {analysis.patterns && analysis.patterns.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patterns</h4>
          <ul className="space-y-1">
            {analysis.patterns.map((p, i) => (
              <li key={i} className="text-xs text-foreground/70 pl-3 relative before:absolute before:left-0 before:content-['*'] before:text-primary">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AssessmentCard({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg border p-2.5',
      highlight ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-accent/10'
    )}>
      <div className={cn(
        'mb-1 text-[10px] font-semibold uppercase tracking-wider',
        highlight ? 'text-primary' : 'text-muted-foreground'
      )}>
        {label}
      </div>
      <p className="text-xs text-foreground/80">{text}</p>
    </div>
  );
}

function MatchHeader({ summary }: { summary: MatchSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Result badge */}
      <span className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-bold',
        summary.result === 'win' ? 'bg-green-500/10 text-green-400' :
        summary.result === 'loss' ? 'bg-red-500/10 text-red-400' :
        'bg-yellow-500/10 text-yellow-400'
      )}>
        {summary.result === 'win' ? 'Victory' : summary.result === 'loss' ? 'Defeat' : 'Draw'}
      </span>

      <div className="text-sm">
        <span className="text-muted-foreground">vs </span>
        <span className="font-medium">{summary.opponent_name || 'Unknown'}</span>
      </div>

      {summary.format && (
        <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {summary.format}
        </span>
      )}

      {summary.turns > 0 && (
        <span className="text-xs text-muted-foreground">{summary.turns} turns</span>
      )}

      {summary.on_play != null && (
        <span className={cn(
          'text-xs',
          summary.on_play ? 'text-green-400/80' : 'text-muted-foreground'
        )}>
          {summary.on_play ? 'On the play' : 'On the draw'}
        </span>
      )}
    </div>
  );
}

function formatActionType(type: string): string {
  const map: Record<string, string> = {
    'cast_spell': 'cast',
    'play_land': 'played',
    'draw': 'drew',
    'discard': 'discarded',
    'destroy': 'destroyed',
    'exile': 'exiled',
    'sacrifice': 'sacrificed',
    'resolve': 'resolved',
    'attack': 'attacked with',
    'block': 'blocked with',
    'activate_ability': 'activated',
    'trigger': 'triggered',
    'counter': 'countered',
    'return_to_hand': 'returned',
    'create_token': 'created',
    'life_change': 'life changed',
    'damage': 'dealt damage',
  };
  return map[type] || type.replace(/_/g, ' ');
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
