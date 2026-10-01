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

/*
 * How much of the measured box height the cap height should fill.
 *
 * The reference's headline ink is 0.1556 of frame height (112px at 720p) and
 * the words fill it, so the target is close to 1. It is set just under 1
 * because the distressed mask erodes the top and bottom of every glyph, and
 * a value of exactly 1 would push the eroded ink a pixel outside the box.
 */
const CAP_FILL = 0.94;

/*
 * Floor on the distributed tracking, in em.
 *
 * Tracking is what opens the letters up, so a zero or negative floor would
 * reintroduce the cramping this replaced. 0.02em is a visible but restrained
 * gap; the fit normally computes something well above it.
 */
const MIN_TRACK_EM = 0.02;

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
  const boxRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  /*
   * Fit each word to its measured box by DISTRIBUTING TRACKING, not by
   * stretching.
   *
   * WHY THIS CHANGED. The previous fit forced the glyph run to fill the box
   * width with `scaleX`, and measured `scaleX` was 1.20-1.29 on both words at
   * every viewport -- the type was being pulled 20-29% wider than its own
   * proportions, which is exactly the "oversized + cramped + distorted"
   * complaint. The stretch was an accident of the font stack, not a design
   * choice: Archivo Black and Anton are NOT installed on this machine, so the
   * stack falls through to Impact, a condensed face. Measured per-letter
   * advance over cap height:
   *
   *   Impact              0.406      <- what actually renders here
   *   reference (f0003)   0.489      <- the target proportions
   *   Arial Black         0.536
   *   (Archivo Black / Anton / Arial Narrow Bold are unavailable and silently
   *    fall back to the generic sans, measured at 0.601)
   *
   * Impact is too NARROW for the reference's proportions, so fitting it by
   * width stretched it 1.28x to compensate.
   *
   * So the word is now sized by CAP HEIGHT and the leftover width is handed out
   * as letter-spacing. That gives an undistorted word (no `scaleX`), opens the
   * letters instead of cramping them, and -- unlike a hardcoded `cqw` size --
   * it adapts to whichever face actually resolves, so the result holds on a
   * machine that does have Archivo Black.
   */
  useEffect(() => {
    const fits: Array<{
      el: HTMLElement;
      glyphs: HTMLElement;
      /** The MEASURED box: its height is the cap-height target. */
      box: HTMLElement;
    }> = [];
    for (const spec of WORDS) {
      const el = fitRefs.current[spec.side];
      const glyphs = glyphRefs.current[spec.side];
      const box = boxRefs.current[spec.side];
      if (el && glyphs && box) fits.push({ el, glyphs, box });
    }
    if (fits.length === 0) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      for (const fit of fits) {
        const boxW = fit.box.clientWidth;
        const boxH = fit.box.clientHeight;
        if (!boxW || !boxH) continue;

        const glyphs = fit.glyphs;
        const fitStyle = fit.el.style;
        const glyphStyle = glyphs.style;
        const prev = {
          containerType: fitStyle.containerType,
          width: fitStyle.width,
        };

        /*
         * Lift the container constraint so the run lays out at its true width.
         * `scrollWidth` cannot be read directly: the fit wrapper is an
         * inline-size container, so it clamps the run and `scrollWidth` just
         * echoes `clientWidth` -- always a ratio of 1.0.
         *
         * The resolved font-size is frozen to px BEFORE the container is
         * removed, so lifting it cannot change the type size mid-measurement.
         *
         * NOTE what `unfreeze` deliberately does NOT restore: `fontSize`. An
         * earlier version restored it, which threw away the solved size and
         * silently reverted every word to its unsized CSS value -- so the whole
         * cap-height solve had no effect on what actually rendered. The solved
         * size is the OUTPUT of this function and must survive it.
         */
        const unfreeze = () => {
          fitStyle.containerType = prev.containerType;
          fitStyle.width = prev.width;
        };

        const resolved = parseFloat(getComputedStyle(glyphs).fontSize);
        if (Number.isFinite(resolved)) glyphStyle.fontSize = `${resolved}px`;
        fitStyle.containerType = 'normal';
        fitStyle.width = 'max-content';
        glyphStyle.letterSpacing = '0px';

        const inkOf = () => {
          /*
           * Measure GLYPH ADVANCES, excluding the trailing letter-space.
           *
           * A `Range` over the text node includes the letter-spacing CSS adds
           * after the FINAL glyph, which is space outside the word. Treating
           * that as ink makes the fit ask for more tracking on every pass, so
           * the run walks outward: measured 518px of "ink" in a 438px box, with
           * tracking climbing 12 -> 14 -> 19px across successive fixes.
           *
           * So the trailing step is subtracted, giving the width the tracking has
           * to balance: `advances + gaps * track`.
           */
          const range = document.createRange();
          range.selectNodeContents(glyphs);
          const r = range.getBoundingClientRect();
          return { w: r.width, h: r.height };
        };

        /**
         * Advance sum with NO tracking, and its cap height. Both are measured
         * against a frozen px font-size so lifting the container cannot change
         * the type mid-measurement.
         */
        const measureUnscaled = () => {
          glyphStyle.letterSpacing = '0px';
          glyphStyle.marginRight = '0px';
          const m = inkOf();
          return { w: m.w, h: m.h };
        };

        // Pass 1: natural, untracked.
        const n0 = measureUnscaled();
        if (!n0.w || n0.w <= 0 || !n0.h || n0.h <= 0) {
          unfreeze();
          continue;
        }

        /*
         * Pass 2: solve the font size.
         *
         * There are TWO independent constraints, and taking only the first is
         * what broke the narrower viewports.
         *
         * Height: cap height must fit `boxH * CAP_FILL`.
         * Width: the run must fit `boxW` even at the MINIMUM tracking, i.e.
         *   `advances + gaps * MIN_TRACK * size <= boxW`.
         *
         * The height target alone worked at 16:9 but not elsewhere, because the
         * box is a fraction of the scene: its HEIGHT scales with viewport height
         * while its WIDTH scales with viewport width. On 1024x768 the box is
         * 350x120 and on 390x844 it is 133x131 -- far narrower per unit height,
         * so a cap-height-filling word overflowed (measured 382px of ink in a
         * 350px box, and 414px in a 133px box). Both advances and cap height
         * scale linearly with font-size, so the width limit is solved in closed
         * form rather than by iteration:
         *
         *   size <= boxW / (k * (1 + gaps * MIN_TRACK_EM))
         *
         * where `k` is the advance sum per unit of font-size, measured in pass 1.
         */
        const perSizeW = n0.w / resolved;
        const perSizeH = n0.h / resolved;
        const count = Math.max(1, (glyphs.textContent ?? '').length);
        const gaps = Math.max(1, count - 1);

        const sizeForHeight = (boxH * CAP_FILL) / perSizeH;
        const sizeForWidth = boxW / (perSizeW * (1 + gaps * MIN_TRACK_EM));
        const solvedSize = Math.max(1, Math.min(sizeForHeight, sizeForWidth));

        glyphStyle.fontSize = `${solvedSize.toFixed(2)}px`;

        // Pass 3: re-measure at the solved size, still untracked.
        const n1 = measureUnscaled();
        unfreeze();

        if (!n1.w || n1.w <= 0) continue;

        /*
         * Hand out whatever width is left as tracking.
         *
         * CSS adds letter-spacing after EVERY glyph including the last, so the
         * laid-out width is `advances + count * track` while the visible word is
         * `advances + (count - 1) * track`. The trailing step is real layout
         * space but not ink, so it is cancelled with a negative margin of
         * exactly one step. Distributing over `count` and cancelling one leaves
         * `count - 1` gaps of visible air between the letters.
         */
        let track = (boxW - n1.w) / count;

        /*
         * Guard the degenerate case. If the face is so wide that filling the box
         * needs NEGATIVE tracking, the word would re-cram -- the failure this
         * change exists to remove. In that case keep a small positive floor and
         * accept a narrower word rather than compressing the letters again.
         */
        if (track < MIN_TRACK_EM * solvedSize) {
          track = MIN_TRACK_EM * solvedSize;
        }

        glyphStyle.letterSpacing = `${track.toFixed(3)}px`;
        glyphStyle.marginRight = `${(-track).toFixed(3)}px`;
        glyphStyle.transformOrigin = '0 50%';
        glyphStyle.transform = 'none';
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
              boxRefs.current[spec.side] = el;
            }}
            data-testid={`headline-${spec.side}`}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              // Explicit, because the fit solves the type size from the box
              // HEIGHT as well as its width. Without it `clientHeight` is 0 and
              // the cap-height pass has nothing to solve against.
              height: `${rect.height * 100}%`,
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
