/**
 * Typography layer — PERSONAL / PORTFOLIO as scroll-scrubbed objects.
 *
 * Brief section 10 and plan section 8: the words are cinematic objects, not
 * headings. Their entrance, position, scale, movement, transformation and exit
 * are all driven by scroll. They do NOT simply fadeIn/fadeOut — the exit is a
 * physical translation up and out of frame, matching the reference's
 * t 1.25-1.75s window where the top-band ink drops from 32.8% to 9.1% as the
 * words leave that band (measured, reference beat S2).
 *
 * Type is live DOM text (D2) rather than baked pixels, so it is selectable,
 * accessible, responsive, and replaceable from boardContent.ts.
 */

import { useEffect, useRef } from 'react';
import { subscribeToProgress, readProgress } from '../timeline/progressBus';
import { beatProgress, beat } from '../timeline/beats';
import { HEADLINE } from '../data/boardContent';
import { HEADLINE_RECTS as RECTS } from '../selection/selectionGeometry';
import './TypographyLayer.css';

/** Beats each word is alive for. */
const IGNITION = beat('ignition');
const ANCHOR = beat('anchor');

interface WordSpec {
  text: string;
  side: 'left' | 'right';
  /** Direction of entrance, in vw. */
  enterX: number;
}

const WORDS: WordSpec[] = [
  { text: HEADLINE.left, side: 'left', enterX: -14 },
  { text: HEADLINE.right, side: 'right', enterX: 14 },
];

export interface TypographyLayerProps {
  /**
   * Skip the entrance and exit and hold the anchored composition.
   *
   * Passed explicitly rather than sniffed via matchMedia inside this layer:
   * under reduced motion there is no ScrollTrigger, so progressBus never fires
   * and the words would otherwise be frozen at their ignition state (scale
   * 0.86, translated off-frame) rather than legible.
   */
  settled?: boolean;
}

export function TypographyLayer({ settled = false }: TypographyLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffect(() => {
    const anchor = () => {
      for (const spec of WORDS) {
        const el = wordRefs.current[spec.side];
        if (!el) continue;
        el.style.transform = 'translate3d(0, 0, 0) scale(1)';
        el.style.opacity = '1';
      }
    };

    if (settled) {
      anchor();
      return;
    }

    const apply = (progress: number) => {
      // Entrance spans ignition + the first half of anchor (reference S0-S1).
      const inT = clampSpan(progress, IGNITION.start, ANCHOR.start + (ANCHOR.end - ANCHOR.start) * 0.5);
      // Exit spans the lift beat entirely (reference S2).
      const outT = beatProgress(progress, 'lift');

      for (const spec of WORDS) {
        const el = wordRefs.current[spec.side];
        if (!el) continue;

        // --- entrance: x + scale, eased ---
        const e = easeOutExpo(inT);
        const x = spec.enterX * (1 - e);
        const scale = 0.86 + 0.14 * e;

        // --- exit: translate up and out of frame, with a slight scale-up ---
        // Physical departure, not a fade. Opacity only softens the last 15%
        // so the word does not clip harshly at the frame edge.
        const o = easeInCubic(outT);
        const y = -42 * o;
        const exitScale = 1 + 0.14 * o;
        const opacity = 1 - Math.max(0, (o - 0.85) / 0.15) * 0.35;

        const finalScale = scale * exitScale;
        el.style.transform = `translate3d(${x.toFixed(3)}vw, ${y.toFixed(3)}vh, 0) scale(${finalScale.toFixed(4)})`;
        el.style.opacity = opacity.toFixed(3);
      }
    };

    apply(readProgress());
    return subscribeToProgress(({ progress }) => apply(progress));
  }, [settled]);

  return (
    <div ref={rootRef} className="cinematic-type" aria-hidden="false">
      {WORDS.map((spec) => {
        const rect = spec.side === 'left' ? RECTS.left : RECTS.right;
        return (
          <span
            key={spec.side}
            className={`cinematic-type__word cinematic-type__word--${spec.side}`}
            ref={(el) => {
              wordRefs.current[spec.side] = el;
            }}
            data-testid={`headline-${spec.side}`}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
            }}
          >
            {spec.text}
          </span>
        );
      })}
    </div>
  );
}

/** Map progress within [a,b] to 0-1. */
function clampSpan(progress: number, a: number, b: number): number {
  if (b <= a) return progress >= b ? 1 : 0;
  if (progress <= a) return 0;
  if (progress >= b) return 1;
  return (progress - a) / (b - a);
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInCubic(t: number): number {
  return t * t * t;
}
