'use client';

// ponytail: module-level store instead of React Context — toast() needs to be callable from
// plain functions (fetch handlers, non-component code) without every caller being a context
// consumer; useSyncExternalStore gives ToastHost live updates without a Provider wrapper.
import { useSyncExternalStore } from 'react';

export type ToastTone = 'ok' | 'warn' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  title: string;
  tone: ToastTone;
  action?: ToastAction;
}

interface ToastOptions {
  title: string;
  tone?: ToastTone;
  ttl?: number;
  action?: ToastAction;
}

const MAX_TOASTS = 3;
const DEFAULT_TTL = 4000;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

const EMPTY: Toast[] = [];

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(opts: ToastOptions): number {
  const id = nextId++;
  toasts = [...toasts, { id, title: opts.title, tone: opts.tone ?? 'ok', action: opts.action }].slice(-MAX_TOASTS);
  emit();
  const ttl = opts.ttl ?? DEFAULT_TTL;
  if (ttl > 0) setTimeout(() => dismissToast(id), ttl);
  return id;
}

export function useToast() {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return { toasts: list, toast, dismiss: dismissToast };
}
