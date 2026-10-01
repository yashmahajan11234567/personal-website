/**
 * Grain and vignette layer.
 *
 * Sits above the ground and the figure but never intercepts pointer events, and
 * is marked aria-hidden. Carries no colour identity — the scene is monochrome at
 * rest (D4); the only colour in the piece is the hover accent glow.
 */

import './GrainLayer.css';

export function GrainLayer() {
  return (
    <div className="cinematic-grain" aria-hidden="true" data-testid="cinematic-grain">
      <div className="cinematic-grain__vignette" />
      <div className="cinematic-grain__noise" />
    </div>
  );
}
