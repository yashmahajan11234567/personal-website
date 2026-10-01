/**
 * Handoff timing, shared by the CSS and the mount timer.
 *
 * The CSS animations are driven by --handoff-ms, set on the hero element, so
 * CSS and JS cannot disagree about how long the transition is.
 */

/**
 * Total handoff duration.
 *
 * 820ms: long enough for the chosen plate to read as dominant and the accent to
 * bloom before anything dissolves, short enough that the world does not feel
 * like it is waiting on a load. Nothing here implies a network round trip — it
 * is a designed transition, not a progress indicator.
 */
export const HANDOFF_MS = 820;

/** The world mounts at the very end of the transition. */
export const HANDOFF_MOUNT_DELAY_MS = HANDOFF_MS;