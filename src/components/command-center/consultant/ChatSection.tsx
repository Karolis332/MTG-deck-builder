'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { renderMarkdown } from './renderMarkdown';
import { ChatActionRow } from './ChatActionRow';
import { SuggestionCard, buildApplyPayload } from './SuggestionCard';
import { actionKey, actionsAsChanges, chatActionToSuggestion, pairedCutIndices, pickCardForAction } from './chatActionCards';
import type { DbCard } from '@/lib/types';
import type { ChatAction, ChatMessage, ProposedChange } from './types';

/** Pure helper — detects the "no API key, local engine" fallback from the chat message text. */
export function isLocalEngineResponse(message: string): boolean {
  return /no ai api key|local data engine/i.test(message);
}

interface ChatSectionProps {
  deckId: number;
  prefill?: string;
  onApplyChanges: (
    changes: ProposedChange[],
    meta: { impressionId?: string; candidatesShown: string[] }
  ) => Promise<boolean>;
  onActionsApplied?: (cardNames: string[]) => void;
  /** `undo` from the deck editor — attached as the toast's Undo action. */
  onUndo?: () => void;
  onOpenCard?: (card: DbCard) => void;
}

export function ChatSection({ deckId, prefill, onApplyChanges, onActionsApplied, onUndo, onOpenCard }: ChatSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Map<number, Set<number>>>(new Map());
  const [appliedActions, setAppliedActions] = useState<Map<number, Set<number>>>(new Map());
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  // actionKey → DbCard (resolved) | null (not found). Absent = still resolving.
  const [resolvedCards, setResolvedCards] = useState<Record<string, DbCard | null>>({});
  const inflightRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (prefill) {
      setInput(prefill);
      setCollapsed(false);
      inputRef.current?.focus();
    }
  }, [prefill]);

  useEffect(() => {
    const lastIdx = messages.length - 1;
    if (lastIdx < 0) return;
    const last = messages[lastIdx];
    if (last.role === 'assistant' && last.actions?.length && !checkedActions.has(lastIdx)) {
      setCheckedActions((prev) => {
        const next = new Map(prev);
        next.set(lastIdx, new Set(last.actions!.map((_, i) => i)));
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Resolve chat actions to real cards so they can render as SuggestionCards.
  useEffect(() => {
    const pending = messages
      .flatMap((m) => m.actions ?? [])
      .filter((a) => !(actionKey(a) in resolvedCards) && !inflightRef.current.has(actionKey(a)));
    const unique = [...new Map(pending.map((a) => [actionKey(a), a])).values()];
    if (unique.length === 0) return;
    unique.forEach((a) => inflightRef.current.add(actionKey(a)));
    Promise.all(
      unique.map(async (a) => {
        try {
          const res = await fetch(`/api/cards/search?q=${encodeURIComponent(a.cardName)}&limit=5`);
          const data = await res.json();
          return [actionKey(a), pickCardForAction(a, data.cards ?? []) ?? null] as const;
        } catch {
          return [actionKey(a), null] as const;
        }
      })
    ).then((entries) => {
      entries.forEach(([k]) => inflightRef.current.delete(k));
      setResolvedCards((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
  }, [messages, resolvedCards]);

  const resolveAction = (a: ChatAction) => resolvedCards[actionKey(a)];

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;

    if (!overrideText) {
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setInput('');
    }
    setLoading(true);
    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const history = await new Promise<ChatMessage[]>((resolve) => {
        setMessages((prev) => {
          resolve(prev);
          return prev;
        });
      });

      const res = await fetch('/api/ai-suggest/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deckId,
          prompt: text,
          history: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortController.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const event = JSON.parse(payload);
              if (event.type === 'text') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: last.content + event.content };
                  return updated;
                });
              } else if (event.type === 'complete') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    const content = event.message || last.content;
                    updated[updated.length - 1] = {
                      ...last,
                      content,
                      actions: event.actions?.length > 0 ? event.actions : undefined,
                      localEngine: isLocalEngineResponse(content),
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // malformed SSE line — skip
            }
          }
        }
      } else {
        const data = await res.json();
        const content = data.error ? `Error: ${data.error}` : data.message || 'No response';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content,
            actions: data.actions?.length > 0 ? data.actions : undefined,
            localEngine: isLocalEngineResponse(content),
          },
        ]);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to connect to AI service.' }]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, deckId]);

  const toggleAction = (msgIdx: number, actionIdx: number) => {
    setCheckedActions((prev) => {
      const next = new Map(prev);
      const set = new Set(prev.get(msgIdx) || []);
      set.has(actionIdx) ? set.delete(actionIdx) : set.add(actionIdx);
      next.set(msgIdx, set);
      return next;
    });
  };

  const uncheck = (msgIdx: number, indices: number[]) => {
    setCheckedActions((prev) => {
      const next = new Map(prev);
      const set = new Set(prev.get(msgIdx) || []);
      indices.forEach((i) => set.delete(i));
      next.set(msgIdx, set);
      return next;
    });
  };

  /** Apply one resolved add (plus its adjacent cut) straight from its SuggestionCard. */
  const applyOne = async (msgIdx: number, actionIdx: number, card: DbCard) => {
    const msg = messages[msgIdx];
    if (!msg.actions) return;
    const key = `${msgIdx}:${actionIdx}`;
    setApplyingKey(key);
    const changes = actionsAsChanges(msg.actions, resolveAction);
    const payload = buildApplyPayload(chatActionToSuggestion(msg.actions[actionIdx], card), changes);
    const ok = await onApplyChanges(payload.changes as ProposedChange[], { candidatesShown: payload.candidatesShown });
    setApplyingKey(null);
    if (!ok) {
      toast({ title: 'Could not apply change', tone: 'error' });
      return;
    }
    const touched = payload.changes.length === 2 ? [actionIdx - 1, actionIdx] : [actionIdx];
    setAppliedActions((prev) => {
      const next = new Map(prev);
      next.set(msgIdx, new Set([...(prev.get(msgIdx) || []), ...touched]));
      return next;
    });
    uncheck(msgIdx, touched);
    onActionsApplied?.([card.name]);
    toast({ title: `Added ${card.name}`, action: onUndo ? { label: 'Undo', onClick: onUndo } : undefined });
  };

  const handleApplyActions = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.actions || msg.actionsApplied) return;
    const checked = checkedActions.get(msgIndex);
    const applied = appliedActions.get(msgIndex);
    const selected = msg.actions.filter((_, i) => (checked?.has(i) ?? true) && !applied?.has(i));
    if (selected.length === 0) return;
    const ok = await onApplyChanges(
      actionsAsChanges(selected, resolveAction),
      { candidatesShown: selected.map((a) => a.cardName) }
    );
    if (ok) {
      setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, actionsApplied: true } : m)));
      onActionsApplied?.(selected.map((a) => a.cardName));
      toast({
        title: `Applied ${selected.length} change${selected.length === 1 ? '' : 's'}`,
        action: onUndo ? { label: 'Undo', onClick: onUndo } : undefined,
      });
    } else {
      toast({ title: 'Could not apply changes', tone: 'error' });
    }
  };

  return (
    <section className="hud-panel border-b border-border/60">
      <button onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <span className="text-sm font-semibold uppercase tracking-wide">Chat</span>
        <span className="ml-auto text-muted-foreground">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="flex flex-col">
          <div ref={scrollRef} className="max-h-80 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">Ask me anything about your deck.</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  )}
                >
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
                {msg.role === 'assistant' && msg.localEngine && (
                  <span className="mt-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    Local engine (no API key)
                  </span>
                )}
                {msg.actions && msg.actions.length > 0 && (() => {
                  const actions = msg.actions;
                  const checked = checkedActions.get(i);
                  const applied = appliedActions.get(i);
                  const checkedCount = checked?.size ?? actions.length;
                  const cardFor = (j: number) => (actions[j].action === 'add' ? resolveAction(actions[j]) : undefined);
                  const hiddenCuts = pairedCutIndices(actions, (j) => !!cardFor(j));
                  const changes = actionsAsChanges(actions, resolveAction);
                  return (
                    <div className="mt-1.5 w-full max-w-[95%] space-y-1">
                      {actions.map((act, j) => {
                        if (hiddenCuts.has(j)) return null;
                        const card = cardFor(j);
                        if (card) {
                          return (
                            <SuggestionCard
                              key={j}
                              suggestion={chatActionToSuggestion(act, card)}
                              proposedChanges={changes}
                              badge="LLM"
                              applying={applyingKey === `${i}:${j}`}
                              applied={msg.actionsApplied || applied?.has(j)}
                              dismissed={!(checked?.has(j) ?? true) && !applied?.has(j)}
                              onOpenCard={(c) => onOpenCard?.(c)}
                              onApply={() => applyOne(i, j, card)}
                              onDismiss={() => uncheck(i, actions[j - 1]?.action === 'cut' ? [j - 1, j] : [j])}
                            />
                          );
                        }
                        return (
                          <ChatActionRow
                            key={j}
                            action={act}
                            checked={checked?.has(j) ?? true}
                            disabled={msg.actionsApplied || applied?.has(j)}
                            onToggle={() => toggleAction(i, j)}
                          />
                        );
                      })}
                      <button
                        onClick={() => handleApplyActions(i)}
                        disabled={msg.actionsApplied || checkedCount === 0}
                        className={cn(
                          'w-full rounded-lg py-1.5 text-sm font-medium transition-colors',
                          msg.actionsApplied
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                        )}
                      >
                        {msg.actionsApplied ? 'Applied' : `Apply ${checkedCount} of ${actions.length}`}
                      </button>
                    </div>
                  );
                })()}
              </div>
            ))}
            {loading && <div className="text-xs text-muted-foreground">thinking…</div>}
          </div>

          <div className="flex gap-2 border-t border-border/60 px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading) sendMessage();
                }
              }}
              placeholder="Ask AI to tune your deck..."
              disabled={loading}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
