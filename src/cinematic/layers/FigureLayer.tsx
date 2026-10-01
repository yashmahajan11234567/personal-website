/**
 * Figure layer — the visual anchor.
 *
 * HARD REQUIREMENT (brief section 4, decision D5): the central figure must
 * remain stable for the entire cinematic. Measurement of the authoritative
 * reference confirms this is correct behaviour, not a compromise -- the figure's
 * dark-pixel centroid stays at x 0.491-0.492 across all 8 seconds.
 *
 * Therefore this component contains NO transform bound to scroll progress. It
 * is a plain, absolutely positioned image. Camera movement is produced by
 * GroundLayer and TypographyLayer instead.
 *
 * The only permitted motion is an optional <=0.6% specular breath on the plate
 * highlight, which is an optical effect rather than a transform of the figure.
 * It is off by default and can be enabled per-layer.
 */

import { FIGURE_RECT } from '../selection/selectionGeometry';
import './FigureLayer.css';

export interface FigureLayerProps {
  /**
   * Opt-in specular breath on the plate highlight. Kept <= 0.6% and off by
   * default; drop it entirely if it reads as instability.
   */
  enableSpecular?: boolean;
}

export function FigureLayer({ enableSpecular = false }: FigureLayerProps) {
  return (
    <div
      className={`cinematic-figure${enableSpecular ? ' cinematic-figure--specular' : ''}`}
      style={{
        // Measured reference rect. Fixed, never animated.
        left: `${FIGURE_RECT.x * 100}%`,
        top: `${FIGURE_RECT.y * 100}%`,
        width: `${FIGURE_RECT.width * 100}%`,
        height: `${FIGURE_RECT.height * 100}%`,
      }}
      data-testid="cinematic-figure"
      aria-hidden="true"
    >
      <img
        className="cinematic-figure__image"
        src="/assets/figure-anchor.webp"
        alt=""
        width={781}
        height={668}
        decoding="async"
        /*
         * object-fit is explicitly `fill` (the default), NOT `contain`.
         *
         * The cut is already trimmed to the silhouette, and the measured
         * reference has the figure cropped by the bottom frame edge — its dark
         * rows run to y 0.9986. `contain` letterboxes the image inside its box,
         * which left the figure floating with empty ground beneath it.
         * `fill` stretches the image to exactly the measured rect.
         */
        style={{ objectFit: 'fill' }}
      />
      {enableSpecular && <span className="cinematic-figure__specular" />}
    </div>
  );
}
