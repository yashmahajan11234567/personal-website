/**
 * Cloud field geometry.
 *
 * Reference: Clouds_entering_and_hovering_*.mp4. A saturated orange field with
 * flat 2D clouds -- white tops, beige undersides -- that GROW and MULTIPLY in
 * from the frame edges until they populate the space. No lateral drift and no
 * rotation in the reference; the sense of arrival comes from scale and
 * population, not travel.
 *
 * Two departures from the reference, both deliberate:
 *
 *  1. DEPTH. The reference is a single flat plane with uniform opacity. Here
 *     three depth bands carry different scale, alpha and blur, because the
 *     brief asks for "different sizes/positions/depth" and because a flat field
 *     behind a large detailed figure reads as wallpaper rather than depth.
 *
 *  2. A SLIGHT DRIFT. The reference is static once placed. The brief asks for
 *     an "alive" environment, and the brief also warns against cartoonish
 *     motion, so drift is capped at a few px/s -- present enough to avoid a
 *     frozen image, slow enough never to read as an animation.
 *
 * Coordinates are in unit space (0..1), like the PIP network.
 */

import { mulberry32, range, rangeInt, clamp01 } from './random';

/** One puff within a cloud. */
export interface Puff {
  readonly dx: number; // offset from the cloud's centre, unit space
  readonly dy: number;
  readonly r: number;
  /** 0 = body, 1 = the pale top highlight. */
  readonly lift: number;
}

export interface Cloud {
  readonly cx: number;
  readonly cy: number;
  /** Overall scale multiplier for the cluster. */
  readonly scale: number;
  readonly band: number;
  readonly puffs: readonly Puff[];
  /** Progress at which this cloud starts appearing (0..1). */
  readonly startAt: number;
  /** Progress at which it is fully present (0..1). */
  readonly endAt: number;
  /** Very slow horizontal drift, unit space per second. */
  readonly drift: number;
  /** Slow vertical bob, unit space per second. */
  readonly bob: number;
  /** Per-cloud phase so they do not bob in unison. */
  readonly phase: number;
}

export interface CloudField {
  readonly clouds: readonly Cloud[];
}

/** Per band: [alpha, blur px at 1280 wide, scale multiplier]. */
export const CLOUD_BAND_ALPHA = [0.3, 0.52, 0.78] as const;
export const CLOUD_BAND_BLUR = [6, 2.5, 0] as const;
export const CLOUD_BAND_SCALE = [1.35, 1.0, 0.8] as const;

/**
 * The figure is not avoided here either -- same reasoning as pipNetwork.ts. The
 * environment renders at z-index 1 and the figure at 4, so a cloud passing
 * behind it is occluded by opaque artwork. A cloud crossing the figure's band
 * is a DEPTH cue, not an obstruction: it reads as a nearer cloud partially
 * hidden by the subject, which is closer to the reference than a cloud field
 * with an empty notch cut out of the middle.
 *
 * A first version did push the NEAREST band out of the figure's band, on the
 * theory that a large opaque cloud on the face would obstruct it. That is a real
 * concern, but the layer order already answers it, and the notch made the field
 * visibly gapped around the subject.
 */

export function buildCloudField(seed = 0xc10d): CloudField {
  const rand = mulberry32(seed);
  const clouds: Cloud[] = [];

  const COUNT = 22;
  for (let i = 0; i < COUNT; i++) {
    /*
     * Band assignment is deliberately mixed rather than sorted by index, so
     * near and far clouds interleave across the frame instead of forming a
     * banded gradient.
     */
    const band = rangeInt(rand, 0, 2);

    /*
     * Bias placement toward the hovered side (Cloud is on the right) while
     * still covering the frame, so the environment feels emitted from that
     * half of the world rather than pasted on top of it.
     *
     * The range is deliberately wide. A first version biased to
     * range(0.34, 1), which sounds generous but lands centres only in
     * x 0.42..0.93 -- the entire left half of the frame was empty, and the field
     * read as pasted onto the right edge rather than filling the environment.
     * The distribution is centred on 0.5 with a mild rightward pull, so the
     * frame reads as populated while the side still feels favoured.
     */
    const sideBias = range(rand, 0.08, 0.94);
    const cx = clamp01(sideBias);

    const cy = range(rand, 0.06, 0.94);

    const puffCount = rangeInt(rand, 5, 9);
    const puffs: Puff[] = [];
    const spread = range(rand, 0.07, 0.13);

    for (let p = 0; p < puffCount; p++) {
      puffs.push({
        // Clusters are wider than tall, like the reference's clouds.
        dx: range(rand, -spread, spread),
        dy: range(rand, -spread * 0.5, spread * 0.34),
        r: range(rand, 0.022, 0.05),
        // Puffs higher in the cluster get the pale top; lower ones the body.
        lift: clamp01(0.5 - puffs.length * 0.04 + range(rand, -0.15, 0.15)),
      });
    }

    /*
     * Arrival window. Staggered across the build so the field populates
     * progressively. The first cloud arrives just after the atmosphere, which
     * is the brief's 20% -> 40% beat.
     *
     * The windows now run to the END of the progress range. They used to stop
     * around 0.46, which meant the canvas went fully transparent while the
     * progress value was still mid-build: on leave the measured ink collapsed
     * 5.14% -> 3.88% -> 1.61% -> 0 across three samples instead of easing down.
     * The brief asks for the leave to "dissolve/recede naturally", and the
     * reference holds its cloud group for seconds before it disappears, so the
     * last cloud should still be arriving at full progress.
     */
    const slot = i / (COUNT - 1);
    const startAt = 0.16 + slot * 0.62 + range(rand, -0.05, 0.05);
    const endAt = clamp01(startAt + range(rand, 0.22, 0.36));

    /*
     * Puff radius is in unit space, and the renderer multiplies it by
     * `unit = min(backingW, backingH)`. At 0.028-0.062 that is 20-45px on a
     * 720px-tall canvas -- individually fine, but with only 14 clouds the field
     * read as "a few circular motifs in the corners" rather than a populated
     * sky. Count and spread both go up; radius goes down slightly so the total
     * coverage rises without each cloud becoming a blob.
     */

    clouds.push({
      cx,
      cy,
      scale: range(rand, 0.78, 1.22) * CLOUD_BAND_SCALE[band],
      band,
      puffs,
      startAt,
      endAt,
      // Direction is mixed so the field does not read as wind.
      drift: range(rand, -0.0055, 0.0055),
      bob: range(rand, 0.0018, 0.0052),
      phase: range(rand, 0, Math.PI * 2),
    });
  }

  return { clouds };
}