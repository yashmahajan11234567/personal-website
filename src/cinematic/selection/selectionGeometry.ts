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

import type { Path } from '../../store/gameStore';

export interface Rect {
  /** Fraction of scene width, 0-1. */
  x: number;
  /** Fraction of scene height, 0-1. */
  y: number;
  width: number;
  height: number;
}

export type LayoutMode = 'wide' | 'compact' | 'tablet' | 'mobile';

/** Minimum interactive target, CSS px (brief section 14). */
export const MIN_TARGET_PX = 44;
/** Mobile targets grow for touch (plan section 14). */
export const MOBILE_TARGET_PX = 72;

export function layoutMode(width: number): LayoutMode {
  if (width >= 1280) return 'wide';
  if (width >= 1024) return 'compact';
  if (width >= 768) return 'tablet';
  return 'mobile';
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
  viewportWidth: number
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
 * The head block spans x 0.403-0.578, so the words stay clear of that range:
 * PERSONAL ends at 0.379 and PORTFOLIO begins at 0.612.
 */
export const HEADLINE_RECTS = {
  left: { x: 0.0367, y: 0.3542, width: 0.3422, height: 0.1556 } as Rect,
  right: { x: 0.6117, y: 0.3542, width: 0.3602, height: 0.1556 } as Rect,
};

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
