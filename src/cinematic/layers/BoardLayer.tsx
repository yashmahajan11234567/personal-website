/**
 * Board layer — the two information plates, as scene objects rather than cards.
 *
 * Plan section 9. Key constraints:
 * - Monochrome. World colour appears only via the hover accent glow
 *   (AccentGlowLayer, D4), never as a card fill or border tint.
 * - ASYMMETRIC placement, matching the measured reference. The Data board is
 *   taller (two lines) and sits higher than the Cloud board. A symmetric
 *   two-card grid is explicitly rejected (risk R5).
 * - Copy is externalised to boardContent.ts, so text is replaceable without
 *   touching pixels.
 * - Chrome (corner ticks, rules, glyphs) is inline SVG, drawn not bitmap.
 *
 * The buttons themselves live in WorldBoard (Task 6); this layer owns placement
 * and entrance choreography.
 */

import { useEffect, useRef, useState } from 'react';
import { useProgressBus, readProgress } from '../timeline/progressBus';
import { beat } from '../timeline/beats';
import { WORLD_BOARDS } from '../data/boardContent';
import { boardRect, layoutMode } from '../selection/selectionGeometry';
import type { Path } from '../../store/gameStore';
import './BoardLayer.css';

/**
 * Boards rise during the `boards` beat, staggered by 4% of the track so they
 * do not arrive in lockstep (reference t 1.75-3.125s shows asymmetric motion).
 */
const STAGGER: Record<Path, number> = { data: 0, cloud: 0.04 };

/**
 * Viewport width, updated on resize. Board placement is breakpoint-dependent
 * and asymmetric, so it cannot be expressed as a single CSS rule — it is
 * computed from the measured rects in selectionGeometry.ts. Resize is rare, so
 * re-rendering on it is acceptable (it is scroll that must not re-render).
 */
function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return width;
}

export interface BoardLayerProps {
  /** Skip the rise and hold the locked composition (reduced motion, Task 7). */
  settled?: boolean;
}

export function BoardLayer({ settled = false }: BoardLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plateRefs = useRef<Record<Path, HTMLDivElement | null>>({ data: null, cloud: null });
  const viewportWidth = useViewportWidth();
  const mode = layoutMode(viewportWidth);

  useEffect(() => {
    const boards = beat('boards');
    const lock = beat('lock');

    const apply = (progress: number) => {
      for (const path of ['data', 'cloud'] as Path[]) {
        const el = plateRefs.current[path];
        if (!el) continue;
        const start = boards.start + STAGGER[path];
        // A short overshoot as each plate seats, matching the reference's
        // settle between t 3.125s and 4.0s.
        const t = clampSpan(progress, start, lock.end);
        const e = easeOutBack(t);
        const y = (1 - e) * 52;
        const opacity = Math.min(1, t * 2.4);
        el.style.transform = `translate3d(0, ${y.toFixed(3)}vh, 0)`;
        el.style.opacity = opacity.toFixed(3);
        el.style.setProperty('--reveal', t.toFixed(4));
      }
    };

    if (settled) {
      for (const path of ['data', 'cloud'] as Path[]) {
        const el = plateRefs.current[path];
        if (!el) continue;
        el.style.transform = 'translate3d(0, 0, 0)';
        el.style.opacity = '1';
        el.style.setProperty('--reveal', '1');
      }
      return;
    }

    apply(readProgress());
    return useProgressBus(({ progress }) => apply(progress));
  }, [settled]);

  return (
    <div
      ref={rootRef}
      className="cinematic-boards"
      data-mode={mode}
      data-settled={settled || undefined}
    >
      {(['data', 'cloud'] as Path[]).map((path) => {
        const content = WORLD_BOARDS[path];
        const rect = boardRect(path, viewportWidth);
        return (
          <div
            key={path}
            className={`cinematic-boards__slot cinematic-boards__slot--${path}`}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
            }}
            data-testid={`board-slot-${path}`}
          >
            <div
              className="cinematic-plate"
              ref={(el) => {
                plateRefs.current[path] = el;
              }}
              data-plate={path}
            >
              <PlateChrome side={path} />
              <div className="cinematic-plate__body">
                {content.lines.map((line) => (
                  <span key={line} className="cinematic-plate__line">
                    {line}
                  </span>
                ))}
              </div>
              <div className="cinematic-plate__status">{content.status}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Inline SVG chrome: corner ticks, header rule, and the world's glyph. */
function PlateChrome({ side }: { side: Path }) {
  return (
    <svg
      className="cinematic-plate__chrome"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* corner ticks */}
      <path className="tick" d="M2 12 L2 2 L12 2" />
      <path className="tick" d="M88 2 L98 2 L98 12" />
      <path className="tick" d="M98 88 L98 98 L88 98" />
      <path className="tick" d="M12 98 L2 98 L2 88" />
      {/* header rule */}
      <line className="rule" x1="2" y1="17" x2="98" y2="17" />
      {side === 'data' ? (
        <g className="glyph glyph--data" transform="translate(80 4) scale(0.14)">
          <rect x="0" y="60" width="30" height="80" />
          <rect x="45" y="20" width="30" height="120" />
          <rect x="90" y="90" width="30" height="50" />
        </g>
      ) : (
        <g className="glyph glyph--cloud" transform="translate(78 2) scale(0.15)">
          <path d="M20 90 a34 34 0 0 1 6-67 a44 44 0 0 1 84 8 a30 30 0 0 1 -6 59 z" />
        </g>
      )}
    </svg>
  );
}

function clampSpan(progress: number, a: number, b: number): number {
  if (b <= a) return progress >= b ? 1 : 0;
  if (progress <= a) return 0;
  if (progress >= b) return 1;
  return (progress - a) / (b - a);
}

/** Gentle overshoot, matching the reference's settle. */
function easeOutBack(t: number): number {
  const c1 = 1.18;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}
