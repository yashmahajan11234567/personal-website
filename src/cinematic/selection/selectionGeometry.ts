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
 * A LITTLE MORE SIZE, AND BOTH WORDS SPACED LIKE EACH OTHER
 *
 * Follow-up request: PORTFOLIO still read cramped, and the headline a size up.
 *
 * Two things had to be established first, because both invalidate the obvious
 * one-lever fix.
 *
 * 1. HEIGHT BUYS NOTHING AT 1280. The fitter reports, at the current geometry,
 *
 *        left   sizeForHeight 112.32   sizeForWidth 102.98
 *        right  sizeForHeight 112.32   sizeForWidth 101.61
 *
 *    so WIDTH binds at both boxes with ~10px of headroom on the height side. A
 *    sweep over dH = 0 / 0.004 / 0.008 / 0.012 / 0.016 returned an IDENTICAL
 *    font size for every step. Height was left untouched.
 *
 * 2. WIDENING THE RIGHT BOX ALONE INVERTS THE PARITY. The shared size is the min
 *    across both words, so widening the right box raises the shared size; the left
 *    word's advances then grow inside an UNCHANGED left box and PERSONAL's
 *    tracking FALLS. Measured: +0.004 on the right box moves the gap from +6.0%
 *    straight to -6.2%, with no parity point between. The left box has to grow
 *    too, which is why the previous pass could only close the gap to 5-6% at
 *    1280 rather than to parity.
 *
 * Because both boxes are width-bound, widening one only helps until the other
 * becomes the binding constraint. Each box can grow two ways, and the directions
 * cost different resources:
 *
 *     left outward  -> spends the left outer margin   (was 3.60%, floor 3.0%)
 *     left inward   -> spends left figure clearance   (~46px spare)
 *     right inward  -> spends right figure clearance  (~49px spare)
 *     right outward -> spends the right outer margin  (was 3.50%, ref 2.81%)
 *
 * Figure clearance is the cheaper resource and does not move the outer edge, so
 * the extra width comes mostly from INWARD growth on both boxes, with only 0.004
 * spent outward on the right. That also keeps PORTFOLIO moving right rather than
 * left: its box starts 0.012 further left but is 0.016 wider, so the ink's right
 * edge still travels outward, and the measured outer margin tightens 3.50% ->
 * 3.14%, i.e. PORTFOLIO sits closer to the frame edge, not further from it.
 *
 * The four-lever result was searched against the live fitter at 1280x720 with the
 * figure silhouette measured from rendered pixels, gated on parity <=2%, outer
 * margins inside the reference envelope, and >=22px of cap-line clearance. 13
 * candidates passed; the one taken is the largest of them that keeps real margin
 * on every gate rather than spending clearance to the floor:
 *
 *     font size   101.32px -> 106.02px   (+4.6%)
 *     tracking    equal on both words, by construction (see TypographyLayer.tsx)
 *     outer ink   left 3.60% / right 2.85%   (reference 3.67% / 2.81%)
 *
 * The right box was then NARROWED to 0.405. That was only possible once parity
 * stopped depending on geometry: with both words handed the same tracking by the
 * fitter, the box width is pure right-hand bearing rather than a tracking lever,
 * so it can be trimmed to restore the frame margin. Measured, the margin trades
 * against size monotonically, and 0.405 lands the right ink edge on the
 * reference's own 2.81% at every viewport:
 *
 *     width    size kept    right margin
 *     0.4214     100.0%         2.01%
 *     0.4050      96.1%         2.85%   <- taken
 *     0.3900      92.6%         3.43%
 *
 * 96% of the size is kept because cap height is what reads as "bigger"; the margin
 * is what reads as safe.
 *
 * Both words grow together, because they render at ONE shared size by design;
 * making PORTFOLIO alone larger would undo the shared-baseline fix recorded above.
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
/**
 * The two headline fit boxes, as fractions of the frame.
 *
 * LOCKED OVERSIZED EDITORIAL COMPOSITION (2026-10-03). The words are deliberately
 * LARGER than the frame and pass BEHIND the figure; they are not trying to fit
 * beside it. Read this comment as the CURRENT design, not as a derivation.
 *
 *      left  x 0.002   PERSONAL starts inside the frame, first letter INTACT
 *      right x 0.025   PORTFOLIO runs off the right edge by ~2.2% of the viewport
 *      both  y 0.14  w 0.996  h 0.5
 *
 * WHY THE BLEED IS ASYMMETRIC, AND WHY THAT IS THE POINT
 *
 * The obvious move is to mirror the crop on both sides. That is wrong, and
 * cropping recognition is the reason:
 *
 *   - Crop a word's FIRST letter and it stops being a word. "ERSONAL" is not
 *     "PERSONAL"; the opening glyph is what the eye locks onto to read it.
 *   - Crop a word's LAST letters and it degrades gracefully. "PORTFOLI" still
 *     reads as PORTFOLIO almost instantly.
 *
 * So the crop is spent only on the right word, and the left word starts inside
 * the frame. `cinematic.spec.ts` now asserts exactly this asymmetry
 * (`firstLettersIntact`), so the intent is locked by a test rather than left to
 * whoever next tunes the numbers.
 *
 * WHY THE TYPEGOES BEHIND THE FIGURE
 *
 * At this size each word paints ~1250-1480px wide, against a figure whose
 * silhouette leaves only ~419px on the left and ~435px on the right. No placement
 * can fit a word that wide into a region that narrow, so the two candidate
 * solutions were "shrink the type" or "let the subject occlude it". The user
 * chose the second: `.cinematic-type` is z-index 3 and `.cinematic-figure` is 4,
 * so the figure's face, glasses, body and board paint OVER the letters. That is
 * the editorial treatment - type interrupted by the subject - and it is why the
 * size could stay locked instead of being negotiated down to whatever gap was
 * left over.
 *
 * MEASURED, at 1440x900
 *
 *   PERSONAL  ink x    3..1247   (439.2px, League Gothic, tracking 0)
 *   PORTFOLIO ink x  196..1472   (439.2px)
 *   figure     ink x  419..1005
 *   right bleed 32px = 2.2% of viewport, and 2.1-2.3% at EVERY viewport from
 *   390 to 1920 - a proportional editorial crop, not a per-breakpoint accident.
 *
 * Both boxes keep the SAME width (0.996) so the shared-tracking fixed point
 * cannot be dragged down by whichever word is tighter, but their X positions are
 * INDEPENDENT - they are two separate typographic elements, not one shared box.
 * Y and H are shared because both words must sit on one baseline band.
 *
 * WHAT IS STILL FITTED, AND WHY IT IS NOT "BLIND"
 *
 * The fitter in TypographyLayer is size-first: it solves cap height from the
 * box's HEIGHT and clamps to the box's WIDTH, then hands whatever width is left
 * over to `MIN_TRACK_EM` (currently 0, so the leftover goes to the glyphs
 * themselves rather than to air between them). So width still bounds the size -
 * widening these boxes further is the only way to grow the type, and y/h only
 * move the caps. The x values below decide WHERE the words sit, never how big
 * they are.
 */
/**
 * WHY THE HEADLINE IS BUILT FROM THE FIGURE'S CORRIDOR, NOT FROM THE FRAME
 *
 * This is the current design, not a derivation, so read the numbers rather than
 * the archaeology above it.
 *
 *      PERSONAL   [  avatar  ]   PORTFOLIO
 *
 * The user asked for the words to be LARGE and SPACED, to NOT overlap each other,
 * to NOT sit behind the avatar's head, to sit at the VERTICAL MIDDLE rather than
 * up in the top band, and for the frame to read FILLED. The previous composition
 * satisfied none of that, and the measurements say exactly why:
 *
 *   size            439.2px      (cap height 325px = 36% of the frame height)
 *   PERSONAL ink    1243px wide
 *   PORTFOLIO ink   1276px wide
 *   two words       2519px of ink in a 1440px frame
 *   overlap         1071px  = 84% of EACH word
 *   cap band centre 35.2% of frame height   (the "too far up" complaint)
 *
 * Both boxes were 0.996 of the frame wide, so each word was laid across the whole
 * viewport and they printed on top of each other. That was the unreadable mass,
 * and no amount of nudging could fix it: at this size the two words need 1.75x
 * the frame's width.
 *
 * THE ARITHMETIC THAT SETS THE SIZE
 *
 * League Gothic's advance per em of font size, measured on the live render:
 *
 *     PERSONAL    2.830 em     PORTFOLIO   2.905 em
 *
 * so the painted ink is `size * 2.830` and `size * 2.905`. The avatar's painted
 * silhouette leaves a corridor on each side, and both words must fit inside their
 * own corridor for "not behind the head" to be true:
 *
 *     size <= leftCorridor / 2.830      size <= rightCorridor / 2.905
 *
 * At 1440x900 the widest such band caps the size at 220px -- a 50% reduction from
 * 439px. That is not a taste judgement, it is the font's own advance, and it is
 * why the two requirements ("as large as possible" and "clear of the avatar")
 * have a single hard ceiling between them.
 *
 * WHY THE CORRIDOR IS A CONSTANT FRACTION
 *
 * `FIGURE_RECT` is a fixed fraction of the frame, so the silhouette scales with
 * the viewport and the corridor does too. Measured at full asset resolution, the
 * figure's painted silhouette across the cap band is:
 *
 *     left  edge  0.431 of viewport width
 *     right edge  0.557 of viewport width
 *
 * identically at 1920, 1600, 1440, 1366, 1280, 1024, 768 and 390 wide. That is
 * what lets one set of fractions describe the composition at every viewport
 * without a per-breakpoint table.
 *
 * WHAT IS SPENT WHERE
 *
 * Each side corridor is split between an outer margin and a gap off the figure:
 *
 *     left   0.008 margin | 0.012 gap | 0.411 word box
 *     right  0.569 box   | 0.012 gap | 0.008 margin
 *
 * The gap is the honest one: it is what keeps PORTFOLIO's first letters off the
 * avatar's head, which is the specific complaint that produced this layout. The
 * margin exists because the glyph run's painted ink sits a few px OUTSIDE its
 * advance box (the last glyph's right side bearing plus the 0.006em stroke), so a
 * zero margin would still bleed ~17px past the frame edge.
 *
 * WHY THE RIGHT WORD IS THE WIDER BOX
 *
 * PORTFOLIO is 9 letters to PERSONAL's 8 but the fitter sizes both at ONE shared
 * size, so its ink is 2.7% wider for the same cap height. Given equal corridors
 * it would therefore bind first and drag the shared size down. Handing the right
 * side the slightly larger corridor it actually has (0.423 against 0.411) keeps
 * the binding constraint on PERSONAL, and the shared-size solve stays stable.
 *
 * VERTICAL CENTRE
 *
 * `y` is chosen so the painted CAP band lands at 44% of the frame height: below
 * the 35.2% it used to sit at, close enough to the optical middle that the frame
 * reads centred rather than top-heavy, and high enough to keep the larger words
 * the corridor allows. The cap band sits 0.43em below the line box's top edge in
 * League Gothic (baseline at 0.8em, cap height 0.74em), so `y = 0.34` puts the
 * band at 0.44 at every 16:9 viewport and within 0.01 of it at 4:3.
 *
 * `height` is deliberately generous (0.26). The fitter takes the SMALLER of its
 * width and height limits, so an over-tall box cannot inflate the type -- it only
 * guarantees the width limit is the one that binds, which is what makes the size
 * predictable instead of aspect-dependent.
 *
 * WHAT THIS COSTS, STATED PLAINLY
 *
 * 1440x900   439.2px -> 220px   (-50%)   frame fill 87.6%
 * 1920x1080  585.1px -> 293px   (-50%)   frame fill 87.5%
 * 1280x720   390.6px -> 195px   (-50%)   frame fill 87.4%
 * 390x844    119.8px ->  57px   (-52%)   frame fill 78%
 *
 * The words are half the size they were. That is the price of separating them
 * from each other and from the avatar's head in the same band, and the user was
 * shown the number before this was written. The gain is that the frame now reads
 * as three distinct masses instead of two overlapping ones: the words are
 * individually legible, nothing crosses the face, and the composition fills the
 * page instead of spilling off both edges.
 */
export const HEADLINE_RECTS = {
  left: { x: 0.017, y: 0.344, width: 0.398, height: 0.26 } as Rect,
  right: { x: 0.567, y: 0.344, width: 0.429, height: 0.26 } as Rect,
};

/**
 * The figure's painted silhouette across the headline's cap band, as a fraction
 * of frame width, and where the words are meant to sit vertically.
 *
 * Exported so the tests assert against the SAME measured silhouette the geometry
 * is derived from, rather than re-deriving it from the box rect.
 */
export const HEADLINE_CORRIDOR = {
  /**
   * Figure silhouette's left edge. PERSONAL's corridor ends here.
   *
   * Measured at FULL asset resolution inside the headline's own cap band, not
   * from the element box: the box carries a transparent margin, and an earlier
   * pass read the box and got 0.431, which is 25px to the right of the truth.
   * That wrong constant is what let the words run 7px into the figure's shoulder
   * at 1920 and 2px at 1600 while the numbers looked healthy.
   */
  figureLeft: 0.4056,
  /**
   * Figure silhouette's right edge. PORTFOLIO's corridor starts here.
   *
   * Stable across every breakpoint measured: 0.5573, 0.5583, 0.5406, 0.5573,
   * 0.5573, 0.5390, 0.5395 at 1920 / 1600 / 1440 / 1366 / 1280 / 1024 / 390.
   * The spread is sub-pixel quantisation of the figure's own outline, not a
   * breakpoint difference -- so a single constant is correct, and the left edge
   * needs the same care (it reads 0.4056 at every 16:9 width).
   */
  figureRight: 0.5573,
  /**
   * Where the painted cap band lands, as a fraction of frame height.
   *
   * 0.44 is the CENTRE of what the corridor allows, not the middle of the frame.
   * Pushing it to 0.47 was measured and failed: the figure's shoulders flare
   * outward below the head, so the corridor narrows as the band descends. At 0.47
   * the words hit the silhouette at 1920 (-53px) and 1280 (-31px); back at 0.44
   * they clear it at every breakpoint. The figure is the optical centre of this
   * composition, and its head sits above the frame's own midpoint, so the type
   * reading as centred means centred on the SUBJECT.
   */
  capBandCentre: 0.44,
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