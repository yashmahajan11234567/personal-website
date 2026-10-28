/**
 * Halo layer — soft bright backlight behind the avatar.
 *
 * Sits between BoardLayer (z-index 2) and FigureLayer (z-index 6), so the halo
 * paints behind the figure but in front of the plates. Pure monochrome: white
 * illumination at the centre fading to transparent at the edges. No movement,
 * no colour, no rectangular boundary — a radial gradient composited directly
 * into the pale stage.
 */
import './HaloLayer.css';

export function HaloLayer() {
  return (
    <div className="cinematic-halo" aria-hidden="true" />
  );
}
