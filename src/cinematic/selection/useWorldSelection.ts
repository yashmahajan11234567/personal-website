/**
 * World selection — the interaction state machine (Task 6).
 *
 * Selection happens INSIDE the cinematic, on the board plates themselves, at the
 * S5 hold. There is no selection page, no card grid, and no "Choose Your Path"
 * heading (brief section 12).
 *
 * Inputs (plan section 11):
 *   pointer hover -> subtle plate response + accent glow
 *   Tab           -> focus, visible ring
 *   Enter / Space -> select
 *   touch         -> first tap previews, second tap on the same board selects
 *
 * Nothing is ever auto-selected. Reduced motion shows the final state with both
 * boards live and waits for an explicit choice (brief section 15).
 */

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Path } from '../../store/gameStore';

export interface WorldSelectionOptions {
  /** Disabled until the selection hold is reached. */
  enabled: boolean;
  /** Fired once, on explicit confirmation. Drives the handoff (Task 8). */
  onSelect: (path: Path) => void;
  /** Announce a state change to assistive tech. */
  onAnnounce?: (message: string) => void;
}

export interface WorldSelectionHandlers {
  hover: (path: Path | null) => void;
  focus: (path: Path | null) => void;
  /** Activate a board. Keyboard and pointer both route here. */
  activate: (path: Path) => void;
  /**
   * Touch path: the first tap previews a board, a second tap on the SAME board
   * selects. A hover-dependent design that selects on first contact is the
   * usual way this pattern fails on touch.
   */
  tap: (path: Path) => void;
  /** True once a board has been selected, so further activation is ignored. */
  isLocked: boolean;
}

export function useWorldSelection({
  enabled,
  onSelect,
  onAnnounce,
}: WorldSelectionOptions): WorldSelectionHandlers {
  const setHovered = useGameStore((s) => s.setHoveredBoard);
  const setFocused = useGameStore((s) => s.setFocusedBoard);
  const selected = useGameStore((s) => s.selectedPath);

  const selectedRef = useRef<Path | null>(null);
  selectedRef.current = selected;
  const previewRef = useRef<Path | null>(null);

  // Clear transient state whenever the boards stop being interactive, and reset
  // the touch preview so a later entry to the hold starts clean.
  useEffect(() => {
    if (enabled) return;
    setHovered(null);
    setFocused(null);
    previewRef.current = null;
  }, [enabled, setHovered, setFocused]);

  const hover = useCallback(
    (path: Path | null) => {
      if (!enabled || selectedRef.current) return;
      setHovered(path);
    },
    [enabled, setHovered]
  );

  const focus = useCallback(
    (path: Path | null) => {
      if (!enabled || selectedRef.current) return;
      setFocused(path);
    },
    [enabled, setFocused]
  );

  const activate = useCallback(
    (path: Path) => {
      if (!enabled || selectedRef.current) return;
      selectedRef.current = path;
      onSelect(path);
    },
    [enabled, onSelect]
  );

  const tap = useCallback(
    (path: Path) => {
      if (!enabled || selectedRef.current) return;
      if (previewRef.current === path) {
        activate(path);
        return;
      }
      previewRef.current = path;
      setHovered(path);
      onAnnounce?.(
        `${path === 'data' ? 'Data' : 'Cloud'} world highlighted. Tap again to enter.`
      );
    },
    [enabled, activate, setHovered, onAnnounce]
  );

  // Escape clears a selection and returns to the hold.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedRef.current) {
        selectedRef.current = null;
        previewRef.current = null;
        useGameStore.getState().clearSelection();
        onAnnounce?.('Selection cleared. Choose a world.');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onAnnounce]);

  // Pointer leaving the window must not leave a glow stuck on.
  useEffect(() => {
    const clear = () => {
      if (enabled) setHovered(null);
    };
    window.addEventListener('pointerleave', clear);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('pointerleave', clear);
      window.removeEventListener('blur', clear);
    };
  }, [enabled, setHovered]);

  return { hover, focus, activate, tap, isLocked: selected !== null };
}
