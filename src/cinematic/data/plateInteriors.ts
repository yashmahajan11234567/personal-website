/**
 * Plate interior artwork descriptors.
 *
 * The reference plates are NOT flat black fields. Measured from the reference
 * video's selection hold (frame 96, t 4.0s), each plate interior splits as:
 *
 *   light  >150 : ~20%      (frame, rules, icons, type)
 *   mid 60-150  : ~56%      (the DOMINANT tone -- printed panels and hatching)
 *   dark  <60   : ~23%      (shadow bands and deep recesses)
 *
 * The previous implementation rendered a flat fill at luma ~14, which is why
 * the plates read as solid black next to the reference. These descriptors
 * drive the interior components below; the geometry (position, width, height)
 * remains owned by selectionGeometry.ts and is deliberately untouched.
 *
 * Tone is monochrome throughout. World identity comes from the hover glow
 * (D4), never from the interior itself.
 *
 * Sources: .gsd/VIDEO-TRANSITION-ANALYSIS.md section 6.1,
 * qa-screenshots/ref-data-plate.png, qa-screenshots/ref-cloud-plate.png
 */

import type { Path } from '../../store/gameStore';

/** A bar in a data mark. Height is a fraction of the mark's own box. */
export interface BarMark {
  h: number;
}

/** Pipeline nodes, left to right. */
export interface PipelineMark {
  /** Node index -> label. Undefined slots render as an empty port. */
  nodes: (string | null)[];
}

/**
 * Interior descriptors, one per world.
 *
 * Kept as data rather than JSX so the artwork is replaceable and the components
 * stay reusable, per the brief.
 */
export interface PlateInterior {
  /** Monochrome base fill, CSS colour. Mid-tone, not black. */
  base: string;
  /** Fine diagonal hatch, CSS colour, drawn over `base`. */
  hatch: string;
  /** Structural grid lines. */
  grid: string;
  /** Icon row layout across the plate's top band. */
  marks: PlateMark[];
  /** Small monospace caption under each mark. */
  captions: string[];
  /** Short label strip along the plate's lower-left. */
  telemetry: string;
}

export type PlateMark =
  /** Rising bar chart. */
  | { kind: 'bars'; data: BarMark[] }
  /** Concentric gear / processing ring. */
  | { kind: 'ring'; teeth: number }
  /** Dotted network map. */
  | { kind: 'net'; points: [number, number][] }
  /** Command flow: boxes joined by an arrowed path. */
  | { kind: 'flow'; data: PipelineMark }
  /** Orbit: two lobes with a body in each. */
  | { kind: 'orbit' }
  /** Stacked cloud outlines. */
  | { kind: 'clouds'; count: number }
  /** Small cog, used in the corner cluster. */
  | { kind: 'cog'; teeth: number };

export const PLATE_INTERIORS: Record<Path, PlateInterior> = {
  data: {
    // Measured reference interior is dominated by 60-150 mid-tones, not black.
    // #4e4e4e lands at luma ~78, inside that band, and yields roughly the
    // reference's 57% mid-tone share.
    //
    // Deliberately a NEUTRAL grey. The reference plate interior measures a mean
    // chroma of 1.0 (max 8-10), so an earlier blue-grey base at rgb(74,78,82)
    // -- chroma 8 across every pixel -- was measurably more tinted than the
    // original. D4 keeps world identity in the hover glow, never in the plate.
    base: '#4e4e4e',
    hatch: 'rgba(255,255,255,0.06)',
    grid: 'rgba(255,255,255,0.085)',
    marks: [
      { kind: 'bars', data: [{ h: 0.28 }, { h: 0.45 }, { h: 0.6 }, { h: 0.78 }, { h: 1.0 }] },
      { kind: 'ring', teeth: 8 },
      { kind: 'net', points: [
        [0.08, 0.3], [0.22, 0.18], [0.38, 0.42], [0.52, 0.22], [0.66, 0.5],
        [0.78, 0.3], [0.9, 0.46], [0.44, 0.68], [0.16, 0.62], [0.7, 0.74],
      ] },
    ],
    captions: ['THROUGHPUT', 'PIPELINE', 'DISTRIBUTION'],
    telemetry: 'NODES 12 · REGIONS 04',
  },
  cloud: {
    base: '#4e4e4e',
    hatch: 'rgba(255,255,255,0.06)',
    grid: 'rgba(255,255,255,0.085)',
    marks: [
      { kind: 'flow', data: { nodes: ['CMD', 'RUN', 'IMG', 'LIVE'] } },
      { kind: 'orbit', },
      { kind: 'clouds', count: 3 },
    ],
    captions: ['COMMAND', 'SCHEDULER', 'FABRIC'],
    telemetry: 'CLUSTERS 06 · REGIONS 04',
  },
};