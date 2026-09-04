'use client';

import { useEffect } from 'react';

export interface CommandCenterHotkeyHandlers {
  applyAllSuggestions: () => void;
  dismissTopSuggestion: () => void;
  closeOverlay: () => void;
  setTargetBracket: (n: number) => void;
  toggleConsultantPane: () => void;
  toggleAnalysisPane: () => void;
  toggleCheatSheet: () => void;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

/**
 * Deck-editor-wide hotkeys. `/` (focus search) and Ctrl+Z/Ctrl+Shift+Z (undo/redo)
 * already live in DeckWorkspace / use-deck-editor respectively — this hook only
 * covers the ones added for command-center polish.
 */
export function useCommandCenterHotkeys(handlers: CommandCenterHotkeyHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'a':
        case 'A':
          e.preventDefault();
          handlers.applyAllSuggestions();
          return;
        case 'd':
        case 'D':
          e.preventDefault();
          handlers.dismissTopSuggestion();
          return;
        case 'Escape':
          handlers.closeOverlay();
          return;
        case '[':
          handlers.toggleConsultantPane();
          return;
        case ']':
          handlers.toggleAnalysisPane();
          return;
        case '?':
          handlers.toggleCheatSheet();
          return;
        default:
          if (e.key >= '1' && e.key <= '5') {
            handlers.setTargetBracket(Number(e.key));
          }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
