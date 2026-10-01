/**
 * Cinematic beat boundaries.
 *
 * Derived by frame-differencing the authoritative reference video
 * (reference/authoritative-reference.mp4, 1280x720, 24fps, 8.000s) at 8fps.
 * See .gsd/plans/phase-1-cinematic-rebuild.md sections 3 and 4.
 *
 * Reference -> scroll mapping (D1: the video is authoritative).
 *
 * Measured by frame-differencing all 192 frames of the reference video.
 * See .gsd/VIDEO-TRANSITION-ANALYSIS.md for the full measurement tables.
 *
 *   scroll 0.00-0.04  ref 0.00-0.33s   ignition  static opening, no plates
 *   scroll 0.04-0.18  ref 0.33-1.42s   anchor    headline EXITS UPWARD
 *   scroll 0.18-0.23  ref 1.42-1.83s   lift      near-still breath
 *   scroll 0.23-0.50  ref 1.83-3.96s   boards    both plates RISE from below
 *   scroll 0.50-1.00  ref 4.00-7.96s   selection STATIC hold, interactive
 *
 * Two corrections from the previous revision, both measured against the video:
 *
 * 1. The board beat was 0.28-0.46; the video requires 0.23-0.50. Boards were
 *    arriving roughly 40% of the scroll too late.
 * 2. The old `lock` beat is GONE. The video has no separate settle window --
 *    the plates simply finish rising at t 3.96s and are then static for the
 *    remaining 4 seconds. There is nothing to lock into.
 *
 * The reference's last four seconds are a static hold (frame diff <= 1.5%),
 * so selection receives half the scroll track. The user must be able to sit
 * at the choice.
 */

export type CinematicPhase =
  | 'ignition'
  | 'anchor'
  | 'lift'
  | 'boards'
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
 * Measured against the reference video's actual motion -- see
 * .gsd/VIDEO-TRANSITION-ANALYSIS.md. These are not stylistic choices: each
 * boundary corresponds to a frame where the reference's motion measurably
 * starts or stops.
 *
 *   boards    0.23-0.50  ref t 1.83-3.96s  plates rise from below frame bottom
 *   selection 0.50-1.00  ref t 4.00-7.96s  static hold, interactive
 *
 * The selection hold gets half the track because the reference spends half its
 * runtime motionless at the choice.
 */
export const BEATS: readonly Beat[] = [
  { id: 'ignition', start: 0.0, end: 0.04 },
  { id: 'anchor', start: 0.04, end: 0.18 },
  { id: 'lift', start: 0.18, end: 0.23 },
  { id: 'boards', start: 0.23, end: 0.5 },
  { id: 'selection', start: 0.5, end: 1.0 },
] as const;

/** Progress at which the world boards become interactive. */
export const SELECTION_START = BEATS[BEATS.length - 1].start;

/**
 * Reference timestamp (seconds) at which the reference reaches its locked
 * composition. Measured: the plates finish rising at frame 95 (t 3.96s) and
 * nothing moves after frame 96.
 */
export const REFERENCE_LOCK_TIME = 3.96;

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
 *
 * S0-S4 (ignition -> boards) consume the first 50% of this; the selection hold
 * consumes the rest, matching the reference's 4s-of-8s motionless ending.
 */
export function trackHeightVh(viewportWidth: number): number {
  return viewportWidth < 768 ? 520 : 700;
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
