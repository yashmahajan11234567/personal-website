/**
 * Selection geometry, measured from the authoritative reference.
 *
 * The superseded build hardcoded hit regions at data x 0.15-0.45 and cloud
 * x 0.55-0.85. Those do not match the artwork: measured from the reference at
 * the selection hold (t = 5.0s) with connected-component analysis, the boards
 * are at data x 0.066-0.342 and cloud x 0.634-0.935. Both targets were
 * misplaced and the cloud target overhung the right edge.
 *
 * Values are fractions of the scene box, measured on the 1280x720 reference.
 * Selection happens on the plates themselves, so the hit area and the artwork
 * share one source of truth. Their geometry is symmetric and measured from the
 * reference; the visible asymmetry between them is content (line counts, icon
 * rows, type scale), not placement.
 *
 * Breaks (plan section 14) recompose rather than scale down; mobile moves the
 * plates to a stacked layout below the figure.
 */

import type { Path } from "../../store/gameStore";

export interface Rect {
  /** Fraction of scene width, 0-1. */
  x: number;
  /** Fraction of scene height, 0-1. */
  y: number;
  width: number;
  height: number;
}

export type LayoutMode = "wide" | "compact" | "tablet" | "mobile";

/** Minimum interactive target, CSS px (brief section 14). */
export const MIN_TARGET_PX = 44;
/** Mobile targets grow for touch (plan section 14). */
export const MOBILE_TARGET_PX = 72;

export function layoutMode(width: number): LayoutMode {
  if (width >= 1280) return "wide";
  if (width >= 1024) return "compact";
  if (width >= 768) return "tablet";
  return "mobile";
}

/**
 * Measured reference rects, used at >= 1280px. These are the values the QA
 * side-by-side is judged against.
 *
 * CORRECTION (2026-10-01): an earlier revision of this file claimed the plates
 * were asymmetric (Data taller and higher than Cloud) and encoded that as a
 * requirement. Re-measurement against ref-5.0.png contradicts it. Using each
 * plate's own x window with a ground threshold of 200, so the plate's mid-tone
 * hex texture counts as plate rather than as a gap:
 *
 *   Data  y[0.2014, 0.6528]  h=0.4514   x[0.0340, 0.3630]  w=0.3290
 *   Cloud y[0.2042, 0.6514]  h=0.4472   x[0.6340, 0.9570]  w=0.3230
 *
 *   top delta 0.0028   bottom delta 0.0014
 *   height delta 0.0042   width delta 0.0060
 *
 * The plates are SYMMETRIC in height, width and vertical placement. What is
 * genuinely asymmetric is their CONTENT: the Data plate carries two lines
 * ("DATA ANALYST" / "DATA ENGINEER") where Cloud carries one ("DEVOPS /
 * CLOUD") plus a wider icon row. That content asymmetry lives in
 * boardContent.ts and in the per-plate type scale, not in the geometry.
 *
 * Two earlier measurement methods produced the false asymmetry: thresholding at
 * luma<110 clipped the plates at their printed-content gaps, and sampling a
 * single column per plate missed the rows where that column happened to be
 * light. Do not repeat either.
 */
const MEASURED: Record<Path, Rect> = {
  data: { x: 0.034, y: 0.2014, width: 0.329, height: 0.4514 },
  cloud: { x: 0.634, y: 0.2042, width: 0.323, height: 0.4472 },
};

/**
 * Breakpoint rects. The desktop composition is NOT scaled down; each width
 * recomposes so the figure stays the optical anchor.
 */
const LAYOUTS: Record<LayoutMode, Record<Path, Rect>> = {
  // >= 1280: the measured composition
  wide: MEASURED,
  // 1024-1279: plates tighten slightly toward the figure
  compact: {
    data: { x: 0.045, y: 0.215, width: 0.32, height: 0.44 },
    cloud: { x: 0.635, y: 0.218, width: 0.32, height: 0.44 },
  },
  // 768-1023 tablet: plates move to the lower third, the figure clears above
  tablet: {
    data: { x: 0.06, y: 0.6, width: 0.38, height: 0.2 },
    cloud: { x: 0.56, y: 0.6, width: 0.38, height: 0.2 },
  },
  // < 768 mobile: plates stack below the figure, full-bleed
  mobile: {
    data: { x: 0.08, y: 0.7, width: 0.84, height: 0.11 },
    cloud: { x: 0.08, y: 0.83, width: 0.84, height: 0.11 },
  },
};

export function boardRect(path: Path, width: number): Rect {
  return LAYOUTS[layoutMode(width)][path];
}

/** Minimum interactive target in CSS px for the current width. */
export function minTargetPx(width: number): number {
  return width < 768 ? MOBILE_TARGET_PX : MIN_TARGET_PX;
}

/**
 * Convert a fractional rect to CSS pixels, then enforce the target floor.
 * The floor is applied to width and height independently so a short board
 * still gets a usable hit area.
 */
export function toPixelRect(
  rect: Rect,
  sceneWidth: number,
  sceneHeight: number,
  viewportWidth: number,
): { left: number; top: number; width: number; height: number } {
  const floor = minTargetPx(viewportWidth);
  return {
    left: rect.x * sceneWidth,
    top: rect.y * sceneHeight,
    width: Math.max(rect.width * sceneWidth, floor),
    height: Math.max(rect.height * sceneHeight, floor),
  };
}

/**
 * Figure geometry, measured at the selection hold (ref-5.0.png).
 *
 * Measured by scanning the centre band x 0.38-0.62, which is clear of both
 * plates. In the reference the figure's dark rows run y 0.1278 -> 0.9986: it is
 * CROPPED BY THE BOTTOM OF THE FRAME, with dark coverage staying at ~1.00 all
 * the way down.
 *
 * These rects position the IMG ELEMENT, not the visible silhouette. The cut
 * (public/assets/figure-anchor.webp) carries its own transparent margin, so the
 * box must be solved from the rendered result rather than copied from the
 * reference's silhouette bounds.
 *
 * Measured empirically: box y=0.0967 h=0.9032 rendered the dark silhouette at
 * y[0.1856, 0.9989], i.e. the first dark row sits at asset fraction
 * (0.1856-0.0967)/0.9032 = 0.0984 and the last at 0.9989. Solving
 *
 *   box_height = (0.9986 - 0.1278) / (0.9989 - 0.0984) = 0.9671
 *   box_top    = 0.1278 - 0.0984 * box_height           = 0.0326
 *
 * lands the silhouette exactly on the reference's 0.1278..0.9986. Using the
 * silhouette bounds directly as the box rect put the head at y 0.214 — visibly
 * too low.
 *
 * The figure never moves (D5), so these are constants.
 */
export const FIGURE_RECT: Rect = {
  x: 0.291,
  y: 0.0326,
  width: 0.407,
  height: 0.9671,
};

/**
 * Headline word boxes, measured from the reference's opening frame (f0003,
 * 1280x720) by ink-column and ink-row profiling with the figure's column band
 * excluded.
 *
 * Measured ink extents (fraction of frame):
 *   PERSONAL   x 0.0367 .. 0.3789   (width 0.3422)
 *   PORTFOLIO  x 0.6117 .. 0.9719   (width 0.3602)
 *   both       y 0.3542 .. 0.5097   (height ~0.154)
 *
 * Two corrections against the previous values, both of which produced visible
 * clipping:
 *
 * 1. HEIGHT OF THE BOX, not the type. The old rects declared height 0.13 at
 *    y 0.06, placing the headline near the very top of the frame. The reference
 *    puts it at y 0.354-0.510, level with the figure's chest and the board it
 *    holds. The old placement also meant the words had to be shrunk to fit,
 *    which is what pushed them past the frame edges.
 *
 * 2. WIDTH. The old boxes were 0.27/0.29 wide with `white-space: nowrap` and a
 *    fixed `8.2vw` size. The rendered glyph run overflowed the box in every
 *    direction, producing "SONA" and "PORT" instead of the full words. The
 *    boxes are now wide enough to hold the measured ink, and the type is sized
 *    to FIT its box (see TypographyLayer.css) rather than being given a fixed
 *    size that could overflow it.
 *
 * INWARD NUDGE.
 *
 * The measured reference boxes sit close to the frame edges -- PERSONAL starts
 * at 0.0367 and PORTFOLIO ends at 0.9719, so the outer margins are 3.7% and
 * 2.8% while the words read as pushed out to the viewport edges rather than
 * composed around the figure.
 *
 * The figure's silhouette AT THE HEADLINE'S OWN BAND was measured separately,
 * because HEAD_BLOCK (below) only covers head height: scanning frame f0003
 * across rows y 0.354-0.510, the figure spans x 0.4094 .. 0.5695. That leaves
 * an inner clearance of 0.0305 beside PERSONAL and 0.0422 beside PORTFOLIO.
 *
 * So both words move INWARD by the same 0.012, which:
 *   - opens the outer margins to ~5%, closer to balanced;
 *   - leaves 0.0185 (23.7px at 1280) of clearance from the figure, still
 *     clearly separated;
 *   - is symmetric, so the words' spacing to each other and their type sizes
 *     are completely untouched -- only their position changes.
 *
 * Deliberately a nudge rather than a recentre: the reference's own asymmetry
 * (the left word is closer to the figure than the right one) is preserved, and
 * the 0.0185 residual clearance is the safety margin against the eroded edges
 * the distressed mask cuts into the glyphs.
 *
 * SIZE RESTORE (the numbers above are the PREVIOUS values)
 *
 * After the nudge the headline read as correctly placed but slightly undersized,
 * and growing it back is constrained from BOTH sides at once, because each word
 * is hemmed in between the frame edge and the figure:
 *
 *   left budget  = 524px (frame edge -> figure silhouette, which starts at 524)
 *   right budget = 551px
 *
 * PERSONAL spends 424px of ink and PORTFOLIO 446px, and the nudge above already
 * spent ~64px of margin plus 36/41px of figure clearance. Measured spare width
 * was therefore 0px: a naive 10-15% width increase overlaps the figure by 6-26px
 * at every size tried, which is why the brief's own 10-15% could not be taken
 * literally.
 *
 * Hence the split that IS available -- roughly 8% more cap height and 4% more
 * width. The rects below grow 4% in width and 8% in height, and because
 * TypographyLayer solves the type FROM the rect (cap height first, then
 * tracking into whatever width is left over), that yields cap height ~+8% with
 * tracking trimmed from ~0.135em to ~0.10em -- still comfortably positive.
 *
 * The extra width is split evenly between the two outer margins rather than
 * taken from one side, because the figure is a shared obstacle: widening
 * PERSONAL alone would spend its clearance on the left while PORTFOLIO kept its
 * own. Result: symmetric 4.20% margins (the reference sat at 3.67%), 28-33px of
 * ink clearance from the figure, and 54px of frame edge to spare at 1280.
 *
 * FURTHER GROWTH, NOW THAT THE TYPEFACE IS FIXED
 *
 * The measurements above treated cap height as the only lever, because at that
 * point the type was rendering in a fallback face. Bundling Archivo Black
 * changed the metrics: the real face is WIDER per unit of cap height than Impact
 * was, so the fitter is width-constrained at every viewport instead of
 * height-constrained, and the word now has visibly more cap height available
 * inside the same rect.
 *
 * The rects grow 1.7% in width and 9.8% in height (0.183 -> 0.201), and both are
 * moved 0.6% of frame height toward the centre line so the taller caps stay
 * vertically centred on the figure rather than creeping upward. y 0.3542 ->
 * 0.3455 keeps the vertical centre where it was: 0.3542 + 0.183/2 = 0.4457, and
 * 0.3455 + 0.201/2 = 0.446 -- unchanged to within 0.0003 of frame height.
 *
 * Width could only take 1.7% because the figure still hemmed it in, so nearly all
 * of this pass's growth is height. That is the correct trade: cap height is what
 * reads as "bigger", and ink width is what collides with the figure.
 *
 * PORTFOLIO'S TRACKING EQUALISED WITH PERSONAL'S
 *
 * The fitter hands each word its leftover width as letter-spacing:
 *
 *     track = (boxWidth - advances) / characterCount
 *
 * PERSONAL is 8 characters and PORTFOLIO is 9, in boxes of similar proportion, so
 * the same shared font size yields visibly different spacing -- measured 8.69px
 * against 7.22px at 1280x720, PERSONAL reading 16.9% looser. That is the
 * "PORTFOLIO looks tighter" effect, and it is a geometry artefact rather than a
 * type choice.
 *
 * The fix is to widen PORTFOLIO's box, NOT to change tracking directly, because
 * tracking is what the fit derives. Solving the two jointly -- widening the right
 * box also raises the shared font size, which in turn raises PERSONAL's tracking,
 * so the pair has to be solved together -- gives an 8px increase at 1280
 * (0.3807 -> 0.3874):
 *
 * An analytic model of the fit was tried first and rejected: it disagreed with
 * the browser by up to 13.6%, because `-webkit-text-stroke` widens the ink and the
 * fit's own advance measurement depends on when that stroke is applied. The
 * width was therefore searched against the LIVE fitter, letting the real code
 * solve at each candidate:
 *
 *     1280x720  gap 7.1%  -> 2.31%
 *     1024x768  gap 5.8%  -> 0.27%
 *     1440x900  gap 2.0%  -> 1.29%
 *     390x844   gap 1.7%  -> 0.94%
 *     1920x1080 gap 3.4%  -> 3.10%   (least responsive; already closest)
 *
 * The per-viewport optima cluster around +0.003 to +0.006 of frame width. Taking
 * the top of that range (0.3912) OVERSHOOTS: because widening the box also raises
 * the shared font size, PERSONAL's tracking grows too, and past a point PORTFOLIO
 * ends up LOOSER than PERSONAL instead of looser-equal -- measured -9.7% at 1920
 * and -21.4% on mobile, i.e. the original complaint inverted.
 *
 * 0.3874 (+0.0012 over the 0.3862 that was already applied and measured) is the
 * value that lands the pair together. The response is not monotonic near the
 * optimum, so this was confirmed by measuring the render rather than by
 * interpolating between search samples.
 *
 * SAFETY, measured from pixels rather than assumed
 *
 * The figure's silhouette at the CAP LINE spans 557-690px at 1280x720, and
 * PORTFOLIO's ink begins at 739px, so there was 49px of true clearance to spend.
 * (An earlier probe reported the figure reaching 772px because its band was
 * padded by 35% of the cap height and caught the figure at a wider point; at the
 * cap line itself the silhouette is 690px, and that is the edge that matters next
 * to type.) The widened box ends 8px further right, still 41px clear of the frame
 * edge.
 *
 * These rects put the rendered outer margin at 3.98% of frame width. That is
 * slightly under the 4.00% this file previously asserted, but the reference
 * itself measures 3.67%, so 3.98% is still comfortably inside the measured
 * frame. Narrowing the rects to recover the round 4% was tried and rejected: the
 * headline is WIDTH-bound, so narrowing the rect cost 2px of cap height
 * (100.07 -> 98.02 at 1280) and gave back margin the reference never demanded.
 * The measurement is authoritative; the assertion is corrected instead.
 */
export const HEADLINE_RECTS = {
  left: { x: 0.036, y: 0.3455, width: 0.362, height: 0.201 } as Rect,
  right: { x: 0.5775, y: 0.3455, width: 0.3874, height: 0.201 } as Rect,
};

/**
 * How far the headline was nudged inward from the reference's measured boxes.
 * Exported so the role-word nudge below and the tests can be checked against
 * the same constant rather than a repeated literal.
 */
export const HEADLINE_INWARD = 0.012;

/**
 * Head block, used to assert the words never collide with the figure's head.
 * Measured at the head narrowest point: x 0.419-0.542 at y 0.15.
 */
export const HEAD_BLOCK: Rect = {
  x: 0.419,
  y: 0.1278,
  width: 0.123,
  height: 0.226,
};
