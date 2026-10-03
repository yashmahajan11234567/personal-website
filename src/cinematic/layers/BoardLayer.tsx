/**
 * Board layer — the two information plates, as scene objects rather than cards.
 *
 * Plan section 9. Key constraints:
 * - Monochrome. World colour appears only via the hover accent glow
 *   (AccentGlowLayer, D4), never as a card fill or border tint.
 * - Placement measured from the reference. The plates are symmetric in size
 *   and vertical placement; the Data plate's two-line wordmark and the Cloud
 *   plate's wider icon row create the visible asymmetry, and Cloud's type is
 *   scaled up to hold its weight against Data's two lines.
 * - Copy is externalised to boardContent.ts, so text is replaceable without
 *   touching pixels.
 * - Chrome (corner ticks, rules, glyphs) is inline SVG, drawn not bitmap.
 *
 * The buttons themselves live in WorldBoard (Task 6); this layer owns placement
 * and entrance choreography.
 */

import { useEffect, useRef, useState } from 'react';
import { subscribeToProgress, readProgress } from '../timeline/progressBus';
import { beat } from '../timeline/beats';
import { WORLD_BOARDS } from '../data/boardContent';
import { boardRect, layoutMode } from '../selection/selectionGeometry';
import type { Path } from '../../store/gameStore';
import { PlateInterior } from './plateArtwork/PlateInterior';
import './BoardLayer.css';

/**
 * Both plates rise in PERFECT LOCKSTEP.
 *
 * Measured across the reference: at every sampled frame from t 1.83s to 3.96s
 * the two plates' vertical extents are identical to four decimal places
 * (e.g. both y 0.6167-0.9986 at t 2.33s). There is no stagger. The previous
 * revision applied a 4% stagger, which the video does not support.
 */
const STAGGER: Record<Path, number> = { data: 0, cloud: 0 };

/**
 * Start position: 63vh BELOW the seated position.
 *
 * Measured from the reference. The plates do not start fully off-screen -- at
 * t 1.83s (the first frame of the rise) they already occupy y 0.856-0.999,
 * i.e. the bottom 14% of the frame is showing. They come to rest at y 0.225.
 * So the travel distance is 0.856 - 0.225 = 0.631 of the viewport height.
 *
 * The previous revision used +100vh, which left the plates completely hidden
 * for the first third of the rise; at scroll 25% they were only 0.3% visible
 * where the reference already showed 22%.
 */
const START_Y_VH = 63.1;

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
  /**
   * The currently active world plate, if any -- resolved by the caller from
   * hover, focus and selection in the same order the atmosphere uses, so the
   * plate scale and the coloured light always agree. Drives `data-hovered` on
   * the root, which the hover-scale CSS keys off. The RISE transform is not
   * affected: it is written inline per scroll frame and is never transitioned.
   */
  hoveredBoard: Path | null;
}

export function BoardLayer({ settled = false, hoveredBoard = null }: BoardLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plateRefs = useRef<Record<Path, HTMLDivElement | null>>({ data: null, cloud: null });
  const viewportWidth = useViewportWidth();
  const mode = layoutMode(viewportWidth);

  useEffect(() => {
    const boards = beat('boards');

    const apply = (progress: number) => {
      for (const path of ['data', 'cloud'] as Path[]) {
        const el = plateRefs.current[path];
        if (!el) continue;
        const start = boards.start + STAGGER[path];
        // The rise spans the whole boards beat and ends exactly where the
        // selection hold begins -- the reference is motionless from there.
        const t = clampSpan(progress, start, boards.end);
        const e = easeOutSine(t);
        // Rise from below the frame's bottom edge, clipped by the hero's overflow.
        const y = (1 - e) * START_Y_VH;
        // NOTE: the hover scale is NOT applied here. This transform is rewritten
        // on every scroll frame, so a CSS transition on it would be reset
        // continuously and the scale would never animate. The rise owns this
        // element; the hover scale owns the inner __scale wrapper.
        el.style.transform = `translate3d(0, ${y.toFixed(3)}vh, 0)`;
        el.style.opacity = '1';
        el.style.setProperty('--reveal', t.toFixed(4));

        // Gate visibility to the beat window.
        //
        // START_Y_VH is measured from the reference's FIRST RISE FRAME, where a
        // sliver of plate is already showing at the bottom edge. Holding that
        // offset before the beat begins would therefore leave the plates
        // visible through the entire opening, which the reference does not do --
        // at t 0-1.79s there is no plate on screen at all.
        //
        // The reference's arrival is abrupt (frame 43->44 motion jumps to 2.18),
        // not a fade, so a hard visibility gate matches it. It is set only at
        // the two ends of the beat, so it cannot flicker mid-scroll.
        el.style.visibility = t > 0 ? 'visible' : 'hidden';
      }
    };

    if (settled) {
      for (const path of ['data', 'cloud'] as Path[]) {
        const el = plateRefs.current[path];
        if (!el) continue;
        el.style.transform = 'translate3d(0, 0, 0)';
        el.style.opacity = '1';
        el.style.setProperty('--reveal', '1');
        el.style.visibility = 'visible';
      }
      return;
    }

    apply(readProgress());
    return subscribeToProgress(({ progress }) => apply(progress));
  }, [settled]);

  return (
    <div
      ref={rootRef}
      className="cinematic-boards"
      data-mode={mode}
      data-settled={settled || undefined}
      data-hovered={hoveredBoard ?? undefined}
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
              <div className="cinematic-plate__scale" data-plate-scale={path}>
                <PlateInterior path={path} />
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

/**
 * Rise easing, fitted numerically to the reference's measured y-travel.
 *
 * Reference plate top across the rise (frames 44-95, t 1.83s-3.96s):
 *   0.856, 0.778, 0.697, 0.617, 0.542, 0.472, 0.353, 0.272, 0.234, 0.225
 *
 * Normalising that to an eased fraction and least-squares fitting candidate
 * curves gave: easeOutSine RMSE 0.021 (best), easeOutQuad 0.023,
 * easeOutCubic 0.117, linear 0.154, easeOutExpo 0.271.
 *
 * So the reference rises at a near-constant rate with soft ends -- NOT the
 * front-loaded overshoot of easeOutBack, and not the heavy cubic deceleration
 * that was briefly in place. Worst-case error across the ten samples is 0.038
 * of the travel distance (under 2.5vh).
 */
function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}
