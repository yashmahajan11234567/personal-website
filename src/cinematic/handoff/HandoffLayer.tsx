/**
 * Handoff veil — the dissolve that resolves the cinematic into the world.
 *
 * Q6 constrains this heavily: it must NOT become a loading screen, a card
 * screen, a large coloured overlay, a new cinematic, or an invented camera
 * move. So this is a single monochrome curtain. It is invisible for the first
 * third of the handoff (letting the chosen plate read as dominant), then
 * fades to EXACTLY the world placeholder's own background (--color-bg-dark,
 * #1a1a1a). Because the veil lands on the same colour the world mounts with,
 * the swap at the end of the transition is invisible — no white flash, no
 * loading state, no spinner.
 *
 * Deliberately no content, no label, no progress indicator. Purely a
 * cross-dissolve.
 */

import './HandoffLayer.css';

export interface HandoffLayerProps {
  /**
   * Under reduced motion there is no dissolve and no dwell — the world mounts
   * immediately. The veil stays fully transparent (see the reduced-motion block
   * in HandoffLayer.css) so nothing flashes.
   */
  reducedMotion: boolean;
}

export function HandoffLayer({ reducedMotion }: HandoffLayerProps) {
  return (
    <div
      className="cinematic-handoff"
      data-static={reducedMotion || undefined}
      aria-hidden="true"
      data-testid="cinematic-handoff"
    />
  );
}