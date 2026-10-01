/**
 * World board — one plate, one button.
 *
 * The plate rendered by BoardLayer is visual; this is the interactive control
 * that sits on top of it. It is a real <button> so it is keyboard reachable,
 * announced, and operable with Enter/Space for free (brief section 14).
 *
 * Nothing interactive is aria-hidden, and the target is floored at 44x44 CSS px
 * (72px on mobile) by CSS `min-width`/`min-height`, matching the floor applied
 * to the hit geometry in selectionGeometry.ts.
 */

import { WORLD_BOARDS } from '../data/boardContent';
import type { Path } from '../../store/gameStore';
import type { WorldSelectionHandlers } from './useWorldSelection';
import './WorldBoard.css';

export interface WorldBoardProps {
  path: Path;
  /** Interactive only at the selection hold (or under reduced motion). */
  enabled: boolean;
  /** True once a world has been chosen; dims the unchosen board. */
  locked: boolean;
  /** This board is the chosen one. */
  chosen: boolean;
  handlers: WorldSelectionHandlers;
}

export function WorldBoard({ path, enabled, locked, chosen, handlers }: WorldBoardProps) {
  const content = WORLD_BOARDS[path];

  return (
    <button
      type="button"
      className="world-board"
      data-world={path}
      data-chosen={chosen || undefined}
      data-dimmed={locked && !chosen ? true : undefined}
      disabled={!enabled || locked}
      tabIndex={enabled && !locked ? 0 : -1}
      aria-label={content.ariaLabel}
      data-testid={`world-board-${path}`}
      onPointerEnter={() => handlers.hover(path)}
      onPointerLeave={() => handlers.hover(null)}
      onFocus={() => handlers.focus(path)}
      onBlur={() => handlers.focus(null)}
      onClick={(event) => {
        // Coarse pointers get the two-tap path so a first contact never
        // commits a world by accident. Fine pointers select immediately.
        if (event.detail === 0) {
          // Keyboard activation (Enter/Space) — select.
          handlers.activate(path);
          return;
        }
        const coarse =
          typeof window !== 'undefined' &&
          window.matchMedia('(hover: none), (pointer: coarse)').matches;
        if (coarse) handlers.tap(path);
        else handlers.activate(path);
      }}
    >
      <span className="world-board__ring" aria-hidden="true" />
    </button>
  );
}
