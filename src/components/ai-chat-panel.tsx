'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ChatAction {
  action: 'cut' | 'add';
  cardId: string;
  cardName: string;
  quantity: number;
  reason: string;
  imageUri?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
  actionsApplied?: boolean;
}

interface AIChatPanelProps {
  deckId: number;
  onApplyActions: (actions: ChatAction[]) => Promise<boolean>;
  className?: string;
}

export function AIChatPanel({ deckId, onApplyActions, className }: AIChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for context (exclude actions from content for OpenAI)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai-suggest/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deckId,
          prompt: text,
          history,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message || 'No response',
            actions: data.actions?.length > 0 ? data.actions : undefined,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to connect to AI service.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyActions = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.actions || msg.actionsApplied) return;

    const success = await onApplyActions(msg.actions);
    if (success) {
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, actionsApplied: true } : m))
      );
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl',
          className
        )}
      >
        <ChatIcon className="h-4 w-4" />
        AI Chat
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex h-[500px] w-[380px] flex-col rounded-xl border border-border bg-card shadow-2xl',
        className
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <ChatIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Deck Tuner</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setMessages([]);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Clear chat"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <ChatIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Ask me anything about your deck.
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                'Replace my weakest creatures',
                'Add more card draw',
                'Fix my mana curve',
                'What cards should I cut?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="block w-full rounded-lg border border-border px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col',
              msg.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <div
              className={cn(
                'max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-accent-foreground'
              )}
            >
              {msg.content}
            </div>

            {/* Action cards */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="mt-1.5 w-full max-w-[90%] space-y-1">
                {msg.actions.map((act, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
                  >
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold',
                        act.action === 'cut'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      )}
                    >
                      {act.action === 'cut' ? 'CUT' : 'ADD'}
                    </span>
                    <span className="flex-1 truncate text-[11px]">
                      {act.cardName}
                    </span>
                    <span className="max-w-[80px] truncate text-[9px] text-muted-foreground">
                      {act.reason}
                    </span>
                  </div>
                ))}

                <button
                  onClick={() => handleApplyActions(i)}
                  disabled={msg.actionsApplied}
                  className={cn(
                    'mt-1 w-full rounded-lg py-1.5 text-[11px] font-medium transition-colors',
                    msg.actionsApplied
                      ? 'bg-green-500/20 text-green-400 cursor-default'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {msg.actionsApplied ? 'Applied' : `Apply ${msg.actions.length} changes`}
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="rounded-xl bg-accent px-3 py-2">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask AI to tune your deck..."
            disabled={loading}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <SendIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22,2 15,22 11,13 2,9 22,2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
