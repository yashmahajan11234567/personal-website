/**
 * PIP network geometry.
 *
 * Reference: Create_video_zooming_into_walls_*.mp4. A single point of light at
 * the centre; thin white lines draw OUTWARD from it; the network branches at
 * varied angles and spreads toward the corners until it fills the frame. The
 * lines visibly EXTEND along their length rather than fading in -- that
 * directional growth is the defining motion, and it is why each branch below
 * carries its own arrival window and is drawn as a partial polyline.
 *
 * Coordinates are in UNIT SPACE (0..1 of the canvas), so the same generated
 * network is correct at any resolution and needs no regeneration on resize.
 */

import { mulberry32, range, rangeInt, clamp01 } from './random';

/** One straight run of pipe. */
export interface PipeSegment {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Progress at which this segment starts extending (0..1). */
  readonly startAt: number;
  /** Progress at which this segment is fully drawn (0..1). */
  readonly endAt: number;
  /** Depth band 0 (far) .. 2 (near). */
  readonly band: number;
}

/** A junction dot, lit as its branch arrives. */
export interface Joint {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly band: number;
  readonly at: number;
}

export interface PipNetwork {
  readonly segments: readonly PipeSegment[];
  readonly joints: readonly Joint[];
  /** The origin spark, per the reference's opening point of light. */
  readonly origin: { x: number; y: number };
}

/** Depth bands, far -> near. Drives parallax and line weight. */
export const BAND_ALPHA = [0.3, 0.52, 0.85] as const;
export const BAND_WIDTH = [0.6, 1.05, 1.7] as const;

/**
 * The figure is NOT kept out of, and the network is NOT steered around it.
 *
 * Two earlier versions both tried to protect it geometrically, and both were
 * measurably worse:
 *
 *  - Hard rejection: the origin at x 0.38 sits inside the figure's own band, so
 *    every branch died on its first segment. The PIP rendered 0.10% ink
 *    against the clouds' 4.43% -- effectively nothing.
 *  - Deflection: it steered every run toward one side, so the network grew
 *    leftward only (x range 0.0125..0.3800) and left half the frame empty.
 *
 * Both were solving a problem the layer order already solves. The environment
 * sits at z-index 1 and the figure at z-index 4, and the figure is opaque
 * painted artwork -- so a pipe passing behind it is occluded for free.
 *
 * The reference shows a network filling the frame with the subject standing in
 * front of it. Occlusion gives exactly that, with no constraint on the
 * geometry at all, which also lets the network spread symmetrically.
 */

/**
 * Build the network.
 *
 * `originX` sits just left of centre, which is where the Data world begins.
 *
 * An earlier default of 0.24 looked reasonable but the 8x4 coverage map came
 * back with the whole right half of the frame empty -- the network reached only
 * x 0.78, so it read as decoration attached to the Data plate rather than as an
 * environment filling the scene. 0.42 plus the density cap spreads it across
 * the frame while still favouring the Data side.
 * The reference's centre spark is a property of ITS composition (an empty frame
 * with nothing else in it), not something to copy literally into a scene that
 * already has a figure at the centre.
 *
 * Growth is breadth-first-ish: a queue of tips is expanded for several
 * generations, each tip spawning two or three branches. Generations land in
 * successive progress windows, which is what produces the reference's
 * "network expands outward over several seconds" read.
 */
export function buildPipNetwork(originX = 0.42, seed = 0x5eed1): PipNetwork {
  const rand = mulberry32(seed);
  const segments: PipeSegment[] = [];
  const joints: Joint[] = [];

  const origin = { x: originX, y: 0.5 };

  type Tip = { x: number; y: number; band: number; gen: number };
  const tips: Tip[] = [{ x: origin.x, y: origin.y, band: 2, gen: 0 }];

  const GENERATIONS = 8;
  /*
   * Tips expanded per generation. Growth is exponential without a brake -- 2-3
   * branches over 8 generations reaches 3^8 -- so this caps the frontier. The
   * cap rises with the generation so the network densifies in the trunk and
   * thins toward the extremities, matching the reference's weight
   * distribution.
   *
   * Density is a correctness requirement, not decoration: at 185 segments the
   * measured 8x4 coverage map had the entire right half of the frame empty and
   * the network read as "localized to the left panel" rather than filling the
   * environment.
   */
  const MAX_TIPS_BASE = 12;
  // Each generation occupies a slice of the progress window, leaving the tail
  // for the final settle so the last pipes finish drawing rather than stopping.
  const genWindow = (gen: number): [number, number] => {
    const from = (gen / GENERATIONS) * 0.86;
    return [from, from + 0.86 / GENERATIONS];
  };

  for (let gen = 0; gen < GENERATIONS; gen++) {
    const [gFrom, gTo] = genWindow(gen);
    const next: Tip[] = [];

    const MAX_TIPS = MAX_TIPS_BASE + gen * 2;
    const budget = Math.min(tips.length, MAX_TIPS);
    for (let ti = 0; ti < budget; ti++) {
      const tip = tips[(ti * 7) % tips.length];
      const branches = rangeInt(rand, 2, 3);

      for (let b = 0; b < branches; b++) {
        /*
         * Branch heading. The reference's pipes run at a mix of orthogonal and
         * ~45° angles -- a blueprint, not a starburst -- so headings are chosen
         * from that set with a small jitter rather than uniformly at random,
         * which would produce a dandelion.
         */
        const headingChoices = [
          0,
          Math.PI / 2,
          Math.PI,
          -Math.PI / 2,
          Math.PI / 4,
          -Math.PI / 4,
          (3 * Math.PI) / 4,
          -(3 * Math.PI) / 4,
        ];
        const base = headingChoices[rangeInt(rand, 0, headingChoices.length - 1)];
        const angle = base + range(rand, -0.28, 0.28);

        const runCount = rangeInt(rand, 3, 6);
        let px = tip.x;
        let py = tip.y;

        // Band relaxes outward: the near band is the trunk, the far band the
        // extremities. That is what produces the depth/parallax read.
        const band = Math.max(0, Math.min(2, tip.band + rangeInt(rand, -1, 0)));

        for (let s = 0; s < runCount; s++) {
          const len = range(rand, 0.035, 0.105);
          const a = angle + range(rand, -0.42, 0.42);
          const nx = px + Math.cos(a) * len;
          const ny = py + Math.sin(a) * len;

          /*
           * Only the frame's edge stops a run. The figure does not -- it is at a
           * higher z-index and occludes whatever passes behind it, so steering
           * around it here would only distort the network (see the note above).
           */
          if (nx < 0.01 || nx > 0.99 || ny < 0.01 || ny > 0.99) {
            break;
          }

          const segFrom = gFrom + ((s / runCount) * (gTo - gFrom)) / 1.6;
          const segTo = segFrom + (gTo - gFrom) / runCount;

          segments.push({
            x0: px,
            y0: py,
            x1: nx,
            y1: ny,
            startAt: clamp01(segFrom),
            endAt: clamp01(segTo),
            band,
          });

          px = nx;
          py = ny;

          if (s === runCount - 1) {
            // Terminal joint, and a new tip to grow from next generation.
            joints.push({ x: px, y: py, r: range(rand, 0.7, 1.7), band, at: segTo });
            next.push({ x: px, y: py, band, gen: gen + 1 });
          }
        }
      }
    }

    tips.length = 0;
    tips.push(...next);
  }

  // The origin spark reads as a bright node once anything is flowing through it.
  joints.push({ x: origin.x, y: origin.y, r: 2.6, band: 2, at: 0 });

  return { segments, joints, origin };
}