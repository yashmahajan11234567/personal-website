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
import { beat } from '../timeline/beats';
import { HEADLINE } from '../data/boardContent';
import { HEADLINE_RECTS as RECTS } from '../selection/selectionGeometry';
import './TypographyLayer.css';

/** Beats each word is alive for. */
const ANCHOR = beat('anchor');
const LIFT = beat('lift');

interface WordSpec {
  text: string;
  side: 'left' | 'right';
}

/*
 * The words are PRESENT AND STATIC from the first frame.
 *
 * Measured on reference frames 1-14: the ink extents of both words are
 * identical on every frame (PERSONAL x 0.0367..0.3789, PORTFOLIO
 * x 0.6117..0.9719), with a per-frame delta of exactly 0.0000.
 *
 * A previous revision gave the words an entrance of -14vw / +14vw, which meant
 * that at scroll 0 -- the OPENING state, the first thing anyone sees -- the
 * words sat off-frame and rendered as "SONA" and "PORT". That entrance is not
 * in the reference. There is no lateral entrance; the words are simply there,
 * and the first movement is the EXIT.
 */
const WORDS: WordSpec[] = [
  { text: HEADLINE.left, side: 'left' },
  { text: HEADLINE.right, side: 'right' },
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
  const fitRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const glyphRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  /*
   * Fit each word's glyph run to its measured box.
   *
   * The CSS gives the glyph run `font-size: 20.5cqw`, sized against the fit
   * wrapper. That gets the right ballpark but cannot guarantee the fit: the
   * fallback font stack (Archivo Black -> Anton -> Impact -> ...) has different
   * metrics per machine, and a run that overflows its box is CLIPPED by it.
   * Measured before this existed: `scrollWidth` 991px inside a 438px box,
   * rendering "PERS" instead of "PERSONAL".
   *
   * The correction is measured, not assumed, and it is measured from the
   * UNTRANSFORMED layout. That distinction matters: a `Range` over an already
   * transformed run reports the transformed width, so re-measuring on resize
   * would divide by the ratio again and converge to no-op (observed: the
   * second pass computed 1.0000 and cleared the transform).
   *
   * `scrollWidth` is used for the layout width rather than a Range, because it
   * reports the untransformed content box. It slightly overstates the true ink
   * extent -- side bearings, and the distressed mask erodes the edges -- so a
   * small residual under-fill is expected and measured (see below), but it is
   * stable across reflows, which correctness under repeated resize requires.
   */
  useEffect(() => {
    const fits: Array<{ el: HTMLElement; glyphs: HTMLElement }> = [];
    for (const spec of WORDS) {
      const el = fitRefs.current[spec.side];
      const glyphs = glyphRefs.current[spec.side];
      if (el && glyphs) fits.push({ el, glyphs });
    }
    if (fits.length === 0) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      for (const fit of fits) {
        const boxW = fit.el.clientWidth;
        if (!boxW) continue;

        /*
         * Capture the natural (unconstrained) width.
         *
         * `scrollWidth` cannot be read directly: the fit wrapper is an inline-
         * size container, so it clamps the run's layout width to the box and
         * `scrollWidth` reports exactly `clientWidth` -- always a ratio of 1.0.
         *
         * So the constraint is lifted for the measurement: the container type
         * is switched off, `width: max-content` lets the run lay out at its
         * true width, and the resolved font-size (currently expressed in `cqw`)
         * is frozen to px first so removing the container cannot change the
         * type size mid-measurement. Everything is restored immediately after.
         */
        const glyphs = fit.glyphs;
        const fitStyle = fit.el.style;
        const glyphStyle = glyphs.style;
        const prevFit = {
          containerType: fitStyle.containerType,
          width: fitStyle.width,
        };
        const prevFontSize = glyphStyle.fontSize;

        // Freeze the resolved size so the measurement cannot depend on the
        // container we are about to remove.
        const resolved = parseFloat(getComputedStyle(glyphs).fontSize);
        if (Number.isFinite(resolved)) glyphStyle.fontSize = `${resolved}px`;

        fitStyle.containerType = 'normal';
        fitStyle.width = 'max-content';

        const natural = glyphs.scrollWidth;

        // Restore.
        fitStyle.containerType = prevFit.containerType;
        fitStyle.width = prevFit.width;
        glyphStyle.fontSize = prevFontSize;

        if (!natural) continue;

        const ratio = boxW / natural;
        glyphStyle.transformOrigin = '0 50%';
        glyphStyle.transform = `scaleX(${ratio.toFixed(4)})`;
      }
    };

    measure();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', measure);
    };
  }, []);

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
      /*
       * There is NO entrance.
       *
       * Measured on reference frames 1-14: both words sit at exactly
       * PERSONAL x 0.0367..0.3789 and PORTFOLIO x 0.6117..0.9719 on every
       * single frame, delta 0.0000. The type is present from the first frame
       * and the first movement it makes is the exit.
       *
       * The previous revision ramped x and scale in over `ignition` + half of
       * `anchor`, which meant the OPENING state -- the first thing anyone sees
       * -- showed the words off-frame and clipped to "SONA" and "PORT".
       * Scroll 0 must be the reference's frame 1, not an entrance in progress.
       */

      // Exit spans anchor's second half THROUGH lift, i.e. it must COMPLETE by
      // the end of `lift` at scroll 0.23 -- and per the reference the type is
      // already clearing the frame by t 1.42s (scroll 0.18).
      //
      // The previous revision ran the exit over `lift` ALONE (0.20-0.28), which
      // left the headline on screen through the first fifth of the scroll while
      // the reference had cleared it. Running it from the midpoint of anchor
      // through the end of lift matches the measured t 0.33-1.83s window.
      const outT = clampSpan(
        progress,
        ANCHOR.start + (ANCHOR.end - ANCHOR.start) * 0.5,
        LIFT.end
      );

      for (const spec of WORDS) {
        const el = wordRefs.current[spec.side];
        if (!el) continue;

        // --- exit: translate up and out of frame, with a slight scale-up ---
        // Physical departure, not a fade. -120vh carries the word a full
        // viewport ABOVE its resting place, so it clears the frame's top edge
        // rather than lingering at head height.
        const o = easeInCubic(outT);
        const y = -120 * o;
        const exitScale = 1 + 0.14 * o;
        // Opacity only softens the last 15% so the word does not clip harshly
        // at the frame edge.
        const opacity = 1 - Math.max(0, (o - 0.85) / 0.15) * 0.35;

        el.style.transform = `translate3d(0, ${y.toFixed(3)}vh, 0) scale(${exitScale.toFixed(4)})`;
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
            {/* The distressed-edge mask lives on this inner span. */}
            <span
              className="cinematic-type__fit"
              ref={(el) => {
                fitRefs.current[spec.side] = el;
              }}
            >
              <span
                className="cinematic-type__glyphs"
                ref={(el) => {
                  glyphRefs.current[spec.side] = el;
                }}
              >
                {spec.text}
              </span>
            </span>
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

function easeInCubic(t: number): number {
  return t * t * t;
}
