/**
 * Cinematic beat boundaries.
 *
 * Derived by frame-differencing the authoritative reference video
 * (reference/authoritative-reference.mp4, 1280x720, 24fps, 8.000s) at 8fps.
 * See .gsd/plans/phase-1-cinematic-rebuild.md sections 3 and 4.
 *
 * Reference -> scroll mapping (D1: the video is authoritative):
 *
 *   ref 0.000 - 0.375s  S0  open hold      figure + PERSONAL/PORTFOLIO
 *   ref 0.375 - 1.250s  S1  figure enters  ground lifts, words settle
 *   ref 1.250 - 1.750s  S2  settle
 *   ref 1.750 - 3.125s  S3  boards rise    DATA + CLOUD/DEVOPS enter from below
 *   ref 3.125 - 4.000s  S4  lock           final selection composition
 *   ref 4.000 - 8.000s  S5  selection hold STATIC -- interactive from here
 *
 * The reference's last four seconds are a static hold (frame diff < 1.5%),
 * so S5 receives the largest share of the scroll track. The user must be
 * able to sit at the choice.
 */

export type CinematicPhase =
  | 'ignition'
  | 'anchor'
  | 'lift'
  | 'boards'
  | 'lock'
  | 'selection';

export interface Beat {
  readonly id: CinematicPhase;
  /** Inclusive start, 0-1 of the pinned scroll track. */
  readonly start: number;
  /** Exclusive end, 0-1 of the pinned scroll track. */
  readonly end: number;
}

/**
 * Beat boundaries as fractions of the pinned scroll track.
 *
 * S1 spans 6-20% and S3 spans 28-46% to mirror the reference's 0.875s and
 * 1.375s windows respectively. S5 holds 52-100%.
 */
export const BEATS: readonly Beat[] = [
  { id: 'ignition', start: 0.0, end: 0.06 },
  { id: 'anchor', start: 0.06, end: 0.2 },
  { id: 'lift', start: 0.2, end: 0.28 },
  { id: 'boards', start: 0.28, end: 0.46 },
  { id: 'lock', start: 0.46, end: 0.52 },
  { id: 'selection', start: 0.52, end: 1.0 },
] as const;

/** Progress at which the world boards become interactive. */
export const SELECTION_START = BEATS[BEATS.length - 1].start;

/** Reference timestamp (seconds) at which the reference reaches its locked composition. */
export const REFERENCE_LOCK_TIME = 4.0;

export function phaseAt(progress: number): CinematicPhase {
  const p = clamp01(progress);
  for (const beat of BEATS) {
    if (p < beat.end) return beat.id;
  }
  return BEATS[BEATS.length - 1].id;
}

export function beat(id: CinematicPhase): Beat {
  const found = BEATS.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown beat: ${id}`);
  return found;
}

/**
 * Normalised progress *within* a beat, 0-1. Returns 0 outside the beat.
 * Layers use this to drive their own local choreography.
 */
export function beatProgress(progress: number, id: CinematicPhase): number {
  const b = beat(id);
  const p = clamp01(progress);
  if (p <= b.start) return 0;
  if (p >= b.end) return 1;
  return (p - b.start) / (b.end - b.start);
}

/**
 * Scroll-track height in viewport units. 700vh desktop / 520vh mobile.
 * S0-S4 consume the first 52% of this; S5 (the selection hold) consumes the rest.
 */
export function trackHeightVh(viewportWidth: number): number {
  return viewportWidth < 768 ? 520 : 700;
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
