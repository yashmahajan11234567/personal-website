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

import { useEffect, useRef } from "react";
import { subscribeToProgress, readProgress } from "../timeline/progressBus";
import { beat } from "../timeline/beats";
import { HEADLINE } from "../data/boardContent";
import { HEADLINE_RECTS as RECTS } from "../selection/selectionGeometry";
import "./TypographyLayer.css";

/** Beats each word is alive for. */
const ANCHOR = beat("anchor");
const LIFT = beat("lift");

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
const MIN_TRACK_EM = 0;

/*
 * Ceiling on the fitted tracking, in em.
 *
 * See the fixed point in measure(). The loosest tracking the roomier word would
 * have received from the original leftover-per-gap rule is 0.10em at 1280, so that
 * is used as the cap: the solve may raise the tighter word up to it, but never
 * past what the reference composition itself shows.
 *
 * TIGHTENED, AND THIS IS A SIZE LEVER, NOT A STYLISTIC ONE.
 *
 * The fit distributes ALL leftover box width as tracking rather than keeping it
 * as a floor, so on a generous box the size/tracking split is decided by where
 * the fixed point lands -- and it lands well above the floor. Measured at
 * 1280x720 with the boxes widened to the silhouette limit: 152.78px at 0.0445em,
 * i.e. tracking 2.2x MIN_TRACK_EM, with roughly 12% of the box width being spent
 * on air between letters instead of on cap height.
 *
 * Tracking and size trade directly against each other in the same box, so
 * clamping the ceiling down converts that wasted air back into size: the solve
 * keeps MIN_TRACK_EM (readable, restrained) and grows the caps by the amount the
 * ceiling releases. The brief for this pass explicitly rules out using excessive
 * letter spacing to fake size, which makes spending box width on air the wrong
 * place to spend it.
 *
 * 0.026em keeps a visible gap between letters -- roughly 1/38 of the cap height,
 * well clear of the cramped look this fit replaced -- while handing the rest of
 * the width to the type.
 */
/*
 * SIZE-FIRST TRACKING, AND WHY THE OLD FITTING WAS WASTING THE BOX.
 *
 * MEASURED DEFECT (1440x900, League Gothic at the current 0.448 boxes):
 *
 *     box width            645px
 *     glyphs rendered at   187.52px
 *     size with ZERO track 229.5px   <- what the same box can actually hold
 *     ink used             564.2px of 645px  (87.5%)
 *     tracking spent       4.65px per gap  (0.0248em)
 *     PORTFOLIO lead       64.0px of dead space before its first glyph
 *
 * So the fitter was handing out ~81px of its own 645px box as letter-spacing and
 * alignment slack rather than as cap height. That is the "wasted tracking" this
 * pass removes, and it was worth ~22% of the type size on its own.
 *
 * WHY IT HAPPENED. The solve has always taken the MINIMUM per-gap slack across
 * the two words as the shared tracking (so both words get identical letter gaps),
 * and then handed EVERYTHING that minimum leaves in the box back out as more
 * tracking, rather than growing the size. PORTFOLIO has 9 letters to PERSONAL's
 * 8 in a box of the same width, so PORTFOLIO's per-gap slack is always the
 * tighter of the pair -- it sets the track, and the pair then sits at whatever
 * that produces instead of at the size the box supports.
 *
 * THE FIX. Size is solved FIRST against a FIXED, restrained tracking floor, and
 * the slack each word is left with becomes the word's position inside its box --
 * never extra tracking. The shared size is then the largest both words can hold
 * at that fixed track, which is exactly the width-bound optimum the box allows.
 *
 * MIN_TRACK_EM is therefore now the TRACK, not a floor the solve may exceed: the
 * fixed point clamps to it directly, so tracking is held at a restrained 0.02em
 * (a clear, readable gap -- roughly 1/50 of the cap height) and the whole box
 * goes to the glyphs.
 *
 * At 1440x900 this moves the headline from 187.5px to ~229px: the maximum the
 * current side-by-side boxes can hold at any tracking.
 */
const TRACK_EM = MIN_TRACK_EM;

/*
 * The same value in PIXELS, which is what the solve actually consumes.
 *
 * `letterSpacing` is applied in px and the solve's room calculation is
 *     room = usableW - count * track
 * with `usableW` in px, so the track term must be px too. Assigning the em
 * constant straight into that arithmetic made every gap 0.02px -- measured
 * tracking 0.0001em and 88% box fill, i.e. the letters were set almost touching
 * while the box was still 12% empty. `trackPx` below is derived from the SOLVED
 * font size, not from the reference size, so it is exactly MIN_TRACK_EM em at
 * whatever size the words end up.
 */

/*
 * Ink the glyphs paint OUTSIDE their advance box, in em.
 *
 * `-webkit-text-stroke: 0.006em` (see TypographyLayer.css) paints a symmetric
 * stroke of that width centred on each glyph outline, so it extends STROKE_WIDTH
 * beyond the left and right edges of the text run. The Range measurement that drives
 * the fit reports the ADVANCE box, not the ink, so a word that exactly fills its
 * measured box still paints over it: measured PORTFOLIO rendering 524.16px of ink
 * inside a 518.39px box, overrunning by 5.8px.
 *
 * Twice the stroke width, because both ends overhang. This is subtracted from every
 * box's usable width before the size/track solve, so the fit reserves it.
 *
 * Kept as a literal rather than read from the stylesheet because the fit runs
 * before layout settles and needs the value synchronously; the two must be changed
 * together.
 */
const STROKE_OVERHANG_EM = 0.012;

/*
 * Reference size the advance measurement is taken at.
 *
 * See measureWord: the per-unit advance MUST be measured from a fixed size rather
 * than from whatever the previous pass happened to write, or the solve feeds on
 * its own output. 100px is simply a round, comfortably non-clamped reference.
 */
const REF_PX = 100;

interface WordSpec {
  text: string;
  side: "left" | "right";
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
  { text: HEADLINE.left, side: "left" },
  { text: HEADLINE.right, side: "right" },
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
   * stretching, and give BOTH WORDS THE SAME FONT SIZE.
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
   *
   * WHY ONE SHARED SIZE (the two words are aligned, not merely similar)
   *
   * Fitting each word to its own box solved two DIFFERENT font sizes, because
   * the two boxes have different widths and therefore different width limits.
   * Measured result: PERSONAL 114.28px vs PORTFOLIO 109.49px at 1440x900, a
   * 4.79px size difference and a 4.7px BASELINE difference -- the words looked
   * misaligned even though their boxes share a y and a height. At 1024x768 the
   * baseline was off by 2.1px and at 390 mobile by 1.3px.
   *
   * The shared size is the SMALLER of the two independent solves, which is
   * exactly the size both words can render at without either overflowing its own
   * box. Identical cap height means an identical baseline, so the two words sit
   * on one line. This is computed across all words in a single pass before any
   * of them is written, because the solve for one word must not depend on
   * whether the other has already been processed.
   */
  useEffect(() => {
    const fits: Array<{
      el: HTMLElement;
      glyphs: HTMLElement;
      /** The MEASURED box: its height is the cap-height target. */
      box: HTMLElement;
      side: "left" | "right";
    }> = [];
    for (const spec of WORDS) {
      const el = fitRefs.current[spec.side];
      const glyphs = glyphRefs.current[spec.side];
      const box = boxRefs.current[spec.side];
      if (el && glyphs && box) fits.push({ el, glyphs, box, side: spec.side });
    }
    if (fits.length === 0) return;

    let cancelled = false;

    /*
     * One word, measured but NOT yet written.
     *
     * The measurement is split out so every word can be measured FIRST and then
     * written with a single shared font size. Writing inside the measurement loop
     * would make each word's solve depend on whether the other had already been
     * processed, which is exactly what produced the mismatched sizes.
     */
    interface Measured {
      glyphs: HTMLElement;
      /** Which word this is, so pass 3 can apply the per-side alignment. */
      side: "left" | "right";
      boxW: number;
      /** Box HEIGHT, the cap-height target. Needed again in the coupled solve. */
      boxH: number;
      /** Cap height per unit font-size, measured at REF_PX. */
      perSizeH: number;
      sizeLimit: number;
      count: number;
      /** Advance sum at `sizeLimit`, needed to re-derive tracking at a smaller size. */
      advanceAtLimit: number;
      /** Painted side bearings, per unit font-size. Outside the advance sum. */
      bearingL: number;
      bearingR: number;
      prev: { containerType: string; width: string };
    }

    const measureWord = (fit: (typeof fits)[number]): Measured | null => {
      const boxW = fit.box.clientWidth;
      const boxH = fit.box.clientHeight;
      if (!boxW || !boxH) return null;

      const glyphs = fit.glyphs;
      const fitStyle = fit.el.style;
      const glyphStyle = glyphs.style;
      const prev = {
        containerType: fitStyle.containerType,
        width: fitStyle.width,
      };

      /*
       * Lift the container constraint so the run lays out at its true width.
       * `scrollWidth` cannot be read directly: the fit wrapper is an inline-size
       * container, so it clamps the run and `scrollWidth` just echoes
       * `clientWidth` -- always a ratio of 1.0.
       *
       * The font-size is pinned to REF_PX before the container is removed, so
       * lifting it cannot change the type size mid-measurement.
       *
       * NOTE what the restore deliberately does NOT do: `fontSize`. An earlier
       * version restored it, which threw away the solved size and silently
       * reverted every word to its unsized CSS value -- so the whole cap-height
       * solve had no effect on what actually rendered. The solved size is the
       * OUTPUT of this function and must survive it.
       */
      const unfreeze = () => {
        fitStyle.containerType = prev.containerType;
        fitStyle.width = prev.width;
      };

      fitStyle.containerType = "normal";
      fitStyle.width = "max-content";

      /*
       * Measure GLYPH ADVANCES, excluding the trailing letter-space.
       *
       * A `Range` over the text node includes the letter-spacing CSS adds after
       * the FINAL glyph, which is space outside the word. Treating that as ink
       * makes the fit ask for more tracking on every pass, so the run walks
       * outward: measured 518px of "ink" in a 438px box, with tracking climbing
       * 12 -> 14 -> 19px across successive fixes.
       */
      /*
       * SIDE BEARINGS: the ink that an advance measurement cannot see.
       *
       * `actualBoundingBoxLeft/Right` measure from the alignment POINT to the
       * painted edge of a glyph. Impact and League Gothic both carry side
       * bearings on their capitals, so the PAINTED run is wider than the advance
       * sum -- by the bearings on the first and last glyph only, which
       * letter-spacing cannot reclaim because it is added BETWEEN glyphs.
       *
       * Measured at 1280x720, the modelled run under-predicted the painted run
       * by 7.8px (PERSONAL) and 9.5px (PORTFOLIO), against a stroke reserve of
       * only 1.9px. The consequence was real: PORTFOLIO painted 7.6px PAST its
       * own fit box at 1280, and 11.3px at 1920 -- clipping on the side that
       * carries the frame margin.
       *
       * So the solve reserves them explicitly, and "fits" means what the eye
       * sees rather than what the layout engine reports.
       */
      /*
             * OUTWARD BEARING: how far the painted run passes its OWN ADVANCE BOX.
             *
             * This replaces a reserve that measured the last CHARACTER instead of the
             * run. `actualBoundingBoxRight` on the single final glyph is measured from
             * THAT GLYPH'S alignment point, so it returns that glyph's entire advance
             * width -- the run's own advance is the sum of all nine, and the two are
             * not comparable. For PORTFOLIO at REF_PX:
             *
             *     last glyph "O"   advance 36px   actualBoundingBoxRight 32px
             *     whole run        advance 290px  actualBoundingBoxRight 286px
             *
             * The run's ink ends 4px INSIDE the run's advance box (League Gothic's
             * capitals carry positive side bearings, so the last glyph's ink stops
             * before its own advance edge), and on the left the run's ink starts 4px
             * OUTSIDE its alignment point. So the reserve was 0.32em on the right --
             * about 32% of the whole word's font size thrown away -- to guard an overhang
             * that does not exist.
             *
             * The measured cost was 11% of the type size: the same box solved to 187.3px
             * with the old reserve and to 212.5px with this one, at identical tracking.
             *
             * Measuring the whole run is also the only figure that is dimensionally
             * consistent with what the box has to contain: the box holds the run's
             * advance, so the reserve must be the difference between the run's ink and
             * the run's advance. Both ends are taken from the same measurement, so a
             * face with a protruding opening glyph (`actualBoundingBoxLeft < 0`) is
             * handled by the same arithmetic rather than by the asymmetry the previous
             * version asserted by hand.
             */
            const bearingsEm = () => {
              const cvs = document.createElement("canvas");
              const ctx = cvs.getContext("2d");
              if (!ctx) return { l: 0, r: 0 };
              const cs = getComputedStyle(glyphs);
              ctx.font = `${REF_PX}px ${cs.fontFamily}`;
              const run = ctx.measureText(glyphs.textContent ?? "");
              // Only outward: ink past the advance box on either end.
              return {
                l: Math.max(0, -run.actualBoundingBoxLeft || 0) / REF_PX,
                r: Math.max(0, (run.actualBoundingBoxRight || 0) - run.width) / REF_PX,
              };
            };

      const inkOf = () => {
        const range = document.createRange();
        range.selectNodeContents(glyphs);
        const r = range.getBoundingClientRect();
        const cs = getComputedStyle(glyphs);
        const cvs = document.createElement("canvas");
        const ctx = cvs.getContext("2d");
        if (!ctx) return { w: r.width, h: r.height };
        ctx.font = `${REF_PX}px ${cs.fontFamily}`;
        const cap = ctx.measureText("P").actualBoundingBoxAscent;
        return { w: r.width, h: cap > 0 ? cap : r.height };
      };

            /*
             * THE SOLVE MUST NOT DEPEND ON ITS OWN PREVIOUS OUTPUT.
       *
       * This was a real defect, not a rounding curiosity. The measurement was
       * taken at `resolved` -- the font-size the PREVIOUS pass wrote -- and then
       * divided by `resolved` to get a per-unit advance. So pass N+1 derived its
       * answer from pass N's output, and the whole thing was a feedback loop.
       *
       * `getBoundingClientRect` returns a rounded, whole-pixel width, so at small
       * sizes the rounding dominated. Measured advance per pass, with identical
       * geometry and nothing changed between runs:
       *
       *     768x1024   252, 252, 258, 252, 258, 252 px
       *     390x844    125, 131, 125, 131, 125, 131 px
       *     1280x720   418, 426, 426, 422, 426, 422 px
       *
       * At 768 the per-unit advance wobbled 3.963 -> 3.908 (1.4%), which moved
       * `sizeLimit` across the height/width crossover and made the rendered
       * tracking flip between two values -- mobile's PERSONAL/PORTFOLIO parity
       * gap swung 8.63% -> -16.72% -> 9.95% across re-solves of the SAME page.
       * 1280 happened to land on the same pixel each pass so the bug was invisible
       * there, which is why earlier passes measured a stable-looking headline.
       *
       * The fix is to measure at a FIXED reference size (REF_PX). The per-unit
       * advance is then a property of the face and the text, not of history, and
       * the solve is idempotent: running it twice gives the same answer twice.
       *
       * `marginRight` is also cleared here for the same reason. It is pass N's
       * `margin-right: -track`, applied to the very span being measured, so it
       * contaminated `n0`. Clearing it costs nothing because the value is
       * rewritten at the end of the pass anyway.
       */
      const prevMargin = glyphStyle.marginRight;
      const prevTransform = glyphStyle.transform;
      const prevMarginLeft = glyphStyle.marginLeft;
      glyphStyle.marginRight = "0px";
      // Also cleared: the box-centring lead written by the previous pass, for the
      // same reason -- it would otherwise shrink the measured run.
      glyphStyle.marginLeft = "0px";
      glyphStyle.fontSize = `${REF_PX}px`;
      glyphStyle.letterSpacing = "0px";

            /*
             * MEASURE WITHOUT A TRANSITION ON THE PROPERTY BEING MEASURED.
             *
             * `globals.css` neutralises animation under
             * `prefers-reduced-motion: reduce` with
             * `transition-duration: 0.01ms !important` on EVERY element. That turns each
             * `font-size` write into a TRANSITIONED change, and a transitioned value is
             * not reflected in the computed style synchronously: the run keeps reporting
             * its PREVIOUS size until the browser has ticked a frame. Reading `offsetWidth`
             * does not force it either.
             *
             * Measured at 1440x900, PERSONAL, League Gothic. The run's true advance is
             * 281px at 100px type and 422px at 150px:
             *
             *     write 100px, read immediately          677.5px   <- stale, 2.4x too wide
             *     transition:none, write, read           281.0px   <- correct, synchronously
             *
             * The stale read is what broke the reduced-motion hero. `perSizeW` came out
             * 6.78 instead of 2.81, so the width limit solved to ~85px instead of
             * ~202px and the words rendered at 297.24px: 48% oversized, overrunning the
             * figure silhouette by 447px and clipping PORTFOLIO off the right edge at
             * every viewport measured.
             *
             * So the transition is switched off for the span of the measurement and
             * restored immediately after. Nothing renders during a measurement pass, so
             * nothing can be seen transitioning; the approved solved size is written
             * later, in pass 3, once this has been restored.
             */
      const prevTransition = glyphStyle.transition;
      glyphStyle.transition = "none";

      const n0 = inkOf();
      glyphStyle.transition = prevTransition;
      const bear = bearingsEm();
      if (!n0.w || n0.w <= 0 || !n0.h || n0.h <= 0) {
        unfreeze();
        glyphStyle.marginRight = prevMargin;
        glyphStyle.marginLeft = prevMarginLeft;
        glyphStyle.transform = prevTransform;
        return null;
      }

      /*
       * TWO constraints, and taking only the first is what broke the narrower
       * viewports.
       *
       * Height: cap height must fit `boxH * CAP_FILL`.
       * Width: the run must fit `boxW` even at the MINIMUM tracking, i.e.
       *   `advances + gaps * MIN_TRACK * size <= boxW`.
       *
       * The height target alone worked at 16:9 but not elsewhere, because the
       * box is a fraction of the scene: its HEIGHT scales with viewport height
       * while its WIDTH scales with viewport width. On 1024x768 the box is
       * 364x129 and on 390x844 it is 139x142 -- far narrower per unit height, so
       * a cap-height-filling word overflowed. Both advances and cap height scale
       * linearly with font-size, so the width limit is solved in closed form:
       *
       *   size <= boxW / (k * (1 + gaps * MIN_TRACK_EM))
       *
       * where `k` is the advance sum per unit of font-size.
       */
      const perSizeW = n0.w / REF_PX;
      const perSizeH = n0.h / REF_PX;
      const count = Math.max(1, (glyphs.textContent ?? "").length);
      // CSS adds a letter-space after EVERY glyph, so the run is `count` steps
      // wide, not `count - 1`. See the note on `stepsOf`.
      const gaps = count;

      const sizeForHeight = (boxH * CAP_FILL) / perSizeH;
      // Reserving the stroke and the outer glyphs' side bearings here as well as
      // in `usableW`: those pixels paint OUTSIDE the advance box, so leaving them
      // out of the width limit makes the limit optimistic by exactly the amount
      // the run later overflows by.
      const bearPerSize = bear.l + bear.r;
      const sizeForWidth =
        (boxW - (STROKE_OVERHANG_EM + bearPerSize) * REF_PX) /
        (perSizeW * (1 + gaps * MIN_TRACK_EM));
      const sizeLimit = Math.max(1, Math.min(sizeForHeight, sizeForWidth));

      const m: Measured = {
        glyphs,
        side: fit.side,
        boxW,
        boxH,
        perSizeH,
        sizeLimit,
        count,
        advanceAtLimit: perSizeW * sizeLimit,
        bearingL: bear.l,
        bearingR: bear.r,
        prev,
      };

      glyphStyle.fontSize = `${sizeLimit.toFixed(2)}px`;
      /*
       * Same hazard as the first read: a transitioned font-size reports the previous
       * size, which would read as a ~140% disagreement against `perSizeW` and wrongly
       * win as the "fresh sample".
       */
      const prevTransition2 = glyphStyle.transition;
      glyphStyle.transition = "none";
      const n1 = inkOf();
      glyphStyle.transition = prevTransition2;
      unfreeze();
      /*
       * Verify against a SECOND independent measurement, and keep it as a
       * per-unit figure.
       *
       * n1.w is the advance sum at `sizeLimit`, so using it directly as
       * `advanceAtLimit` and then dividing by `sizeLimit` downstream round-trips
       * a rounded whole-pixel value -- the same history-dependent feedback that
       * REF_PX was introduced to remove, reintroduced one line later. It also
       * made the solve size-limit-dependent in a way the closed-form model does
       * not predict: with the same boxes it disagreed by 30% (172.9px modelled,
       * 132.4px rendered).
       *
       * So normalise the confirming measurement against the size it was taken at,
       * and let the per-unit value from the fixed REF_PX measurement be the
       * primary. A second sample that disagrees by more than 1% means the browser
       * is not laying out linearly (a font swap, or a fallback in use), in which
       * case the fresh sample wins because it describes what is actually painted.
       */
      if (n1.w > 0) {
        const perUnitFromN1 = n1.w / sizeLimit;
        if (Math.abs(perUnitFromN1 - perSizeW) / perSizeW > 0.01) {
          m.advanceAtLimit = perUnitFromN1 * sizeLimit;
        }
      }
      return m;
    };

    const measure = () => {
      if (cancelled) return;

      // Pass 1: measure every word without committing a size.
          const measured = fits
            .map((fit) => ({ fit, m: measureWord(fit) }))
            .filter(
              (x): x is { fit: (typeof fits)[number]; m: Measured } => x.m !== null,
            );
          if (measured.length === 0) return;

      /*
       * Pass 2: solve the shared SIZE and the shared TRACKING TOGETHER.
       *
       * They are not independent, and that coupling is the whole difficulty:
       *
       *     advances = k * S              (k = advance sum per unit size)
       *     track     = (boxW - advances) / gaps
       *     fits      <=> k*S + gaps*track <= boxW
       *
       * The previous two-step order -- take the size from min(height limit,
       * width-at-MIN_TRACK), then hand out whatever slack is left -- does NOT
       * satisfy that last inequality once the two words are given ONE track. The
       * parity track is the MEAN of the words' per-gap slacks, so it can exceed
       * one word's own slack, and that word then renders WIDER than its box:
       * measured PORTFOLIO at 540px of ink inside a 522px box, overrunning by
       * 18px. It did not visibly clip only because the frame edge was further out.
       *
       * So it is solved as a fixed point. Start from the conservative size, derive
       * the parity track from the slack that size leaves, re-solve the size against
       * THAT track as the floor, and repeat. It converges in two or three rounds on
       * every viewport measured, and the round count is fixed, so the result is
       * deterministic -- unlike the earlier history-dependent measurement.
       *
       * PARITY IS EXACT HERE, not approximate, because both words are handed the
       * same `track`. Chasing it through box widths instead does not work: parity is
       *
       *     (W_L - k_L*S)/7 == (W_R - k_R*S)/8
       *
       * which is not scale-invariant, so a width pair that satisfies it at one
       * aspect misses at the next (measured +3.1% at 1920, +12.0% at 1280, and
       * -11.5% at 360x800).
       */
      const kOf = (m: Measured) => m.advanceAtLimit / m.sizeLimit;
      const stepsOf = (m: Measured) => m.count;
      /** Cap-height limit for a word. */
      const sizeForHeightOf = (m: Measured) => (m.boxH * CAP_FILL) / m.perSizeH;

      /*
       * Usable width per word, after reserving the stroke overhang. Everything below
       * solves against this rather than the raw box width, so the painted ink fits
       * the box rather than merely its advances.
       */
      const usableW = measured.map((x) => {
        const reserve =
          (STROKE_OVERHANG_EM + x.m.bearingL + x.m.bearingR) * x.m.sizeLimit;
        const raw = x.m.boxW - reserve;
        return raw > 1 ? raw : 1;
      });

      let sharedSize = Math.max(
        1,
        measured.reduce(
          (acc, x) => Math.min(acc, x.m.sizeLimit),
          Number.POSITIVE_INFINITY,
        ),
      );
      /*
       * SIZE-FIRST SOLVE (replaces the tracking-distributing fixed point).
       *
       * The previous loop searched for a (size, track) pair whose fixed point
       * landed inside a tracking band, and the pair converged at 187.5px /
       * 0.0248em -- spending a quarter of each box on air. This solves the size
       * directly against a FIXED tracking, which is the width-bound optimum:
       *
       *     advances = k * S
       *     laid out = k*S + count*track          (CSS adds a space per glyph)
       *     <=>  S <= (usableW - count*track) / k
       *
       * Tracking is held at TRACK_EM for both words, so the letter gaps stay
       * identical by construction and the cap height takes every pixel the box
       * has left. Whatever each word still has spare becomes its position inside
       * its box (below), rather than more letter-spacing.
       */
      let solvedTrackPx = TRACK_EM;
      for (let round = 0; round < 6; round++) {
        /*
         * The shared track, derived from the slack this size leaves in each box.
         *
         * It is the MINIMUM of the words' own per-gap slack, never their average.
         *
         * Averaging is what made PORTFOLIO paint past its own box. PORTFOLIO has
         * 9 letters to PERSONAL's 8, and its box is the narrower of the two, so it
         * is always the tighter of the pair: at 1440x900 its slack per gap was
         * 1.4px while PERSONAL's was 13px, and the mean of 7.2px handed both words
         * a value PORTFOLIO could not honour. Measured overflow of the painted ink
         * past the box edge was +2.01px at 1440x900, and PORTFOLIO overflowed at
         * 4 of the 6 viewports checked -- invisible here only because the frame edge
         * sat further out, which is exactly the latent clip that surfaces at some
         * other aspect ratio.
         *
         * The MINIMUM still hands both words ONE value, so the letter gaps stay
         * exactly equal -- parity is a property of the value being shared, not of
         * how it is derived. Taking the min costs nothing in size: the size solve
         * below already takes the min over words, so the two agree.
         *
         * The ceiling exists because track and size trade against each other: more
         * track needs a smaller size to fit the same box, and a smaller size leaves
         * more slack, which permits more track. An uncapped fixed point runs away --
         * measured converging to 29.88px of tracking on a 127.84px word (0.234em) at
         * 1920, wildly gapped and visibly smaller than before. TRACK_CEILING_EM is
         * the loosest tracking that still reaches the reference's cap height.
         */ let tightest = Number.POSITIVE_INFINITY;
        for (let i = 0; i < measured.length; i++)
          tightest = Math.min(
            tightest,
            (usableW[i] - kOf(measured[i].m) * sharedSize) /
              stepsOf(measured[i].m),
          );
        /*
         * The track is FIXED, not searched. `tightest` is still computed above
         * and is what guarantees the pair CAN honour it (it is the floor the
         * size solve below enforces), but it no longer inflates the value.
         */
        /* em -> px at the size being solved, so the gap is 0.02em of cap
         * height whatever size the words land on. */
        const nextTrack = TRACK_EM * sharedSize;

        // Largest size every word can render at the FIXED track.
        let nextSize = Number.POSITIVE_INFINITY;
        for (let i = 0; i < measured.length; i++) {
          const room = usableW[i] - stepsOf(measured[i].m) * nextTrack;
          nextSize = Math.min(
            nextSize,
            room > 0 ? room / kOf(measured[i].m) : 1,
          );
        }
        nextSize = Math.max(
          1,
          Math.min(nextSize, ...measured.map((x) => sizeForHeightOf(x.m))),
        );

        const settled = Math.abs(nextSize - sharedSize) < 0.01;
        sharedSize = nextSize;
        solvedTrackPx = nextTrack;
        if (settled) break;
      }

      /*
       * Where the tracked run sits INSIDE its box, as a fraction of the leftover
       * width between the box edge and the tracked run.
       *
       * 0 pins the run to the box's left edge, keeping the box's right edge exactly
       * where HEADLINE_RECTS puts it. That is the safe value: the words are pinned
       * to the frame edges by the reference, and an earlier 0.9 centred the run
       * instead, which pushed PORTFOLIO's ink 7px PAST the figure silhouette (ink at
       * 702px, figure edge at 709px) -- a real overlap, not a near miss.
       *
       * So the run is left-aligned in its box, and the leftover width simply becomes
       * the word's right-hand bearing.
       *
       * RIGHT WORDS ARE RIGHT-ALIGNED, so the leftover becomes a LEFT bearing.
       *
       * Left-aligning both words is correct for PERSONAL and wrong for PORTFOLIO.
       * Each word's painted width is narrower than its box by that word's own
       * leftover, and the two leftovers differ because the words differ in letter
       * count and advance. So left-aligning both pushes the outer margins apart by
       * exactly that difference. Measured at 1280x720 with symmetric boxes: the
       * left word's ink began 2.4% from the frame edge while the right word's ended
       * 6.3% short of it -- a 3.9% imbalance, clearly lopsided, and it is an
       * artefact of the alignment rule rather than a property of the composition.
       *
       * The reference's own opening frame is asymmetric in the same direction --
       * PERSONAL x 0.0367..0.3789 and PORTFOLIO x 0.6117..0.9719, so the right
       * word runs closer to its edge. Pinning each word to the frame edge it
       * actually borders restores that: the left word takes the box's left edge,
       * the right word the box's right edge, and the leftover falls on the side
       * facing the figure, where it reads as letter spacing rather than as a hole
       * in the margin.
       */
      const ALIGN: Record<"left" | "right", "start" | "end"> = {
        left: "start",
        right: "end",
      };

      // Pass 3: write the shared size and hand out the leftover width as tracking.
      for (const { fit, m } of measured) {
        const side = m.side;
        const glyphStyle = m.glyphs.style;
        glyphStyle.fontSize = `${sharedSize.toFixed(2)}px`;

        /*
         * Hand out whatever width is left as tracking.
         *
         * CSS adds letter-spacing after EVERY glyph including the last, so the
         * laid-out width is `advances + count * track` while the visible word is
         * `advances + (count - 1) * track`. The trailing step is real layout
         * space but not ink, so it is cancelled with a negative margin of
         * exactly one step. Distributing over `count` and cancelling one leaves
         * `count - 1` gaps of visible air between the letters.
         *
         * When a word was forced DOWN to the shared size its advance sum shrinks
         * proportionally, so the leftover width -- and therefore the tracking --
         * is recomputed from the shared size rather than reused from the limit.
         */
        const advances = (m.advanceAtLimit / m.sizeLimit) * sharedSize;
        const steps = m.count;
        /*
         * The parity track, not this word's own leftover share. Because every word
         * is handed the SAME value, the two words' gaps are equal by construction.
         */
        /*
         * The SOLVED track, in px.
         *
         * This used to read the `TRACK_EM` constant directly, which is an em
         * figure: every gap came out 0.02px, measured tracking 0.0001em with the
         * letters nearly touching and the box still 17% empty. The solve's own
         * output is `TRACK_EM * sharedSize`, which is 0.02em of whatever size the
         * words landed on.
         */
        const track = solvedTrackPx;

        /*
         * Where the tracked run sits in the box.
         *
         * This is computed from the run's OWN width, not from the fit's slack
         * term. `thisSlack` subtracts `reserve` (the stroke overhang and the outer
         * glyphs' side bearings), which exists to make the SIZE solve conservative;
         * subtracting it a second time here double-counts it, and the leftover
         * came out as -3.07px instead of +48px. A right-aligned word then took
         * that negative value as its left margin and drifted LEFT of its box, so
         * the outer margin stayed lopsided at 2.4% / 11.2%.
         *
         * The geometry, from the box outwards:
         *
         *   runWidth = advances + steps*track     the element's border box
         *                                          (steps = count: CSS adds a
         *                                          letter-space after every glyph
         *                                          INCLUDING the last)
         *   the trailing step is layout space, not ink, so the element's right
         *   edge sits one step right of the painted right edge of the word
         *
         * The run's ELEMENT right edge must land on the box's right edge:
         *
         *   boxLeft + lead + runWidth - track  == boxRight
         *
         * which solves to `lead = boxW - runWidth + track`, the form used below.
         *
         * This was measured wrong on the first attempt because it aligned the
         * painted INK rather than the element. Painted ink extends past the
         * element on the right by the stroke overhang plus the final glyph's
         * right side bearing -- 0.332em, about 51px at this size -- and lining
         * the ink up to the box edge pushed the element 3.7px OUTSIDE the box,
         * carrying the word past the frame. The remaining slack after the lead
         * (57.0px measured) is that overhang, so the frame margin still holds
         * and the composition stays inside the viewport.
         *
         * A left-aligned word takes lead 0, which pins its ink to the box's left
         * edge and leaves the leftover as a right-hand bearing facing the figure.
         */
        const runWidth = advances + steps * track;
        const lead = ALIGN[side] === "end" ? m.boxW - runWidth + track : 0;

        glyphStyle.letterSpacing = `${track.toFixed(3)}px`;
        // Trailing letter-space cancel, always exactly one step and never mixed
        // with the alignment lead.
        glyphStyle.marginRight = `${(-track).toFixed(3)}px`;
        glyphStyle.marginLeft = `${lead.toFixed(3)}px`;
        glyphStyle.transformOrigin = "0 50%";
        glyphStyle.transform = "none";
        void fit;
      }
    };

    measure();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const anchor = () => {
      for (const spec of WORDS) {
        const el = wordRefs.current[spec.side];
        if (!el) continue;
        el.style.transform = "translate3d(0, 0, 0) scale(1)";
        el.style.opacity = "1";
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
        LIFT.end,
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
        const rect = spec.side === "left" ? RECTS.left : RECTS.right;
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
