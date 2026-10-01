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
 * They are NOT symmetric -- the Data board is taller (two lines) and sits
 * higher than the Cloud board. A symmetric two-card layout is explicitly
 * rejected (plan section 3.3, risk R5).
 *
 * Breaks (plan section 14) recompose rather than scale down; mobile moves the
 * boards to a stacked layout below the figure.
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
 * side-by-side is judged against -- the asymmetry is load-bearing.
 */
const MEASURED: Record<Path, Rect> = {
  data: { x: 0.066, y: 0.247, width: 0.276, height: 0.307 },
  cloud: { x: 0.634, y: 0.303, width: 0.301, height: 0.241 },
};

/**
 * Breakpoint rects. The desktop composition is NOT scaled down; each width
 * recomposes so the figure stays the optical anchor.
 */
const LAYOUTS: Record<LayoutMode, Record<Path, Rect>> = {
  // >= 1280: the measured composition, widened slightly on very large screens
  wide: MEASURED,
  // 1024-1279: boards tighten toward the figure, gap narrows
  compact: {
    data: { x: 0.055, y: 0.262, width: 0.3, height: 0.29 },
    cloud: { x: 0.645, y: 0.315, width: 0.3, height: 0.235 },
  },
  // 768-1023 tablet: boards move to the lower third, the figure clears above
  tablet: {
    data: { x: 0.06, y: 0.6, width: 0.38, height: 0.2 },
    cloud: { x: 0.56, y: 0.6, width: 0.38, height: 0.2 },
  },
  // < 768 mobile: boards stack below the figure, full-bleed
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
 * Figure geometry, measured at the selection hold. Used by the figure layer to
 * size itself. The figure never moves (D5), so these are constants.
 */
export const FIGURE_RECT: Rect = {
  x: 0.291,
  y: 0.104,
  width: 0.407,
  height: 0.808,
};

/**
 * Headline word boxes, measured at the S1 anchor. The head block spans
 * x 0.403-0.578, so the words must stay clear of that range.
 */
export const HEADLINE_RECTS = {
  left: { x: 0.03, y: 0.06, width: 0.27, height: 0.13 } as Rect,
  right: { x: 0.68, y: 0.06, width: 0.29, height: 0.13 } as Rect,
};

/** Head block, used to assert the words never collide with the figure's head. */
export const HEAD_BLOCK: Rect = {
  x: 0.403,
  y: 0.104,
  width: 0.175,
  height: 0.249,
};
