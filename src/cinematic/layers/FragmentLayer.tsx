/**
 * Fragment layer - voxel fragments, orbital lines, and technical grid.
 *
 * Sits between HaloLayer (z-index 5) and FigureLayer (z-index 6): fragments
 * drift behind the figure, never obscuring the face or plates. Three visual
 * registers, all monochrome:
 *
 *   1. Charcoal voxel fragments - varied squares with deliberate placement
 *      (denser in a band around the figure, sparser at the frame edges).
 *   2. Two thin elliptical orbital lines encircling the figure - dashed,
 *      slowly rotating, purely decorative and pointer-transparent.
 *   3. A faint technical grid - 64px squares at ~4% opacity, giving the pale
 *      ground a plotted/technical character.
 *
 * All motion is CSS transforms on a small fixed set of elements; no rAF, no
 * canvas, no React state.
 */
import './FragmentLayer.css';

/** Voxel fragments, hand-placed for composition rather than randomly scattered. */
const FRAGMENTS: Array<{ x: number; y: number; size: number; depth: number; delay: number; dur: number }> = [
  // Ring around the figure - densest band
  { x: 22, y: 20, size: 10, depth: 0.9, delay: 0, dur: 16 },
  { x: 78, y: 24, size: 8, depth: 0.7, delay: 1.2, dur: 18 },
  { x: 16, y: 42, size: 6, depth: 0.5, delay: 2.4, dur: 15 },
  { x: 84, y: 44, size: 12, depth: 1.0, delay: 0.6, dur: 20 },
  { x: 26, y: 62, size: 7, depth: 0.6, delay: 1.8, dur: 17 },
  { x: 74, y: 66, size: 9, depth: 0.8, delay: 3.0, dur: 14 },
  { x: 34, y: 14, size: 5, depth: 0.4, delay: 2.1, dur: 19 },
  { x: 66, y: 12, size: 6, depth: 0.5, delay: 0.9, dur: 16 },
  // Outer scatter
  { x: 6, y: 30, size: 8, depth: 0.7, delay: 1.5, dur: 21 },
  { x: 93, y: 34, size: 6, depth: 0.5, delay: 2.7, dur: 18 },
  { x: 10, y: 74, size: 10, depth: 0.8, delay: 0.3, dur: 22 },
  { x: 90, y: 78, size: 7, depth: 0.6, delay: 3.4, dur: 17 },
  { x: 42, y: 8, size: 5, depth: 0.4, delay: 1.1, dur: 20 },
  { x: 58, y: 6, size: 8, depth: 0.7, delay: 2.9, dur: 15 },
  { x: 4, y: 56, size: 5, depth: 0.4, delay: 2.2, dur: 18 },
  { x: 96, y: 58, size: 9, depth: 0.9, delay: 1.7, dur: 16 },
  { x: 30, y: 88, size: 6, depth: 0.5, delay: 0.4, dur: 21 },
  { x: 70, y: 90, size: 8, depth: 0.7, delay: 2.6, dur: 19 },
  { x: 48, y: 84, size: 5, depth: 0.4, delay: 1.9, dur: 17 },
  { x: 20, y: 8, size: 4, depth: 0.3, delay: 3.1, dur: 22 },
  { x: 82, y: 8, size: 5, depth: 0.4, delay: 0.8, dur: 18 },
  { x: 14, y: 18, size: 7, depth: 0.6, delay: 2.0, dur: 20 },
  { x: 88, y: 16, size: 6, depth: 0.5, delay: 1.4, dur: 16 },
  { x: 38, y: 92, size: 7, depth: 0.6, delay: 3.3, dur: 15 },
];

export function FragmentLayer() {
  return (
    <div className="cinematic-fragments" aria-hidden="true">
      {/* Technical grid - the plotted-paper substrate. */}
      <div className="cinematic-fragments__grid" />
      {/* Orbital lines - two thin ellipses encircling the figure. */}
      <div className="cinematic-fragments__orbit cinematic-fragments__orbit--outer" />
      <div className="cinematic-fragments__orbit cinematic-fragments__orbit--inner" />
      {/* Voxel fragments. */}
      {FRAGMENTS.map((f, i) => (
        <div
          key={i}
          className="cinematic-fragment"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: 0.3 + f.depth * 0.35,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.dur}s`,
            // Depth scales the drift distance: nearer fragments travel more.
            ['--frag-depth' as string]: String(f.depth),
          }}
        />
      ))}
    </div>
  );
}
