import type { DestId } from '../experience.data';
import { getModelBounds } from './modelBounds';

/**
 * Camera poses.
 *
 * Overview: approved triangle — lighthouse centre-back, windmill left-front,
 * pagoda right-front.
 *
 * Selected: ONE pose per destination derived from the island's measured
 * bounding box (modelBounds) so the complete island — top structures down to
 * the bottom tip — stays in frame even while the user drag-rotates it. The
 * look-at target is biased to the island's right so the island lands
 * left-of-centre; the HTML panel owns the right side.
 */
export interface Pose {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const OVERVIEW_POSE: Pose = {
  pos: [0, 28, 110],
  target: [0, 8, -5],
  fov: 55,
};

/* Island anchor positions in world space (must match IslandGroup placement).
 * Approved triangle: lighthouse centre-back, windmill left-front, pagoda right-front. */
export const ISLAND_POS: Record<DestId, [number, number, number]> = {
  lighthouse: [0, 0, -14],
  windmill: [-44, 0, 10],
  pagoda: [44, 0, 10],
};

export const SELECTED_FOV = 45;

/**
 * Selected-island camera pose computed from the model's bounding box.
 *
 * - Vertical fit:  dV = (sizeY / 2) / tan(fovV / 2)
 * - Rotation-swept width (drag-rotate about Y grows the footprint to the
 *   diagonal): dH = (sqrt(sizeX^2 + sizeZ^2) / 2) / (tan(fovV/2) * aspect)
 * - distance = max(dV, dH) * 1.12 + 4  (margin so nothing crops)
 * - camera sits front-right of the island at ~sizeY * 0.55 height
 * - target is the island's vertical centre, shifted +x by 0.22 of the frame
 *   half-width so the island renders left-of-centre (panel owns the right)
 */
export function selectedPose(id: DestId, aspect = 16 / 9): Pose {
  const [ix, iy, iz] = ISLAND_POS[id];
  const b = getModelBounds(id);
  const sizeY = b ? b.size[1] : 32;
  const fov = SELECTED_FOV;
  const tanV = Math.tan(((fov / 2) * Math.PI) / 180);
  const effAspect = Math.max(aspect, 1); // portrait is overridden frontal in CameraRig
  // Conservative 3D fit: every box corner (including the near-bottom corner and
  // the rotation-swept diagonal) lies on a sphere of radius r3 about the
  // centre, so require asin(r3 / d) <= half-angle in the tighter axis.
  const r3 = b ? Math.hypot(b.size[0], b.size[1], b.size[2]) / 2 : 24;
  const halfV = ((fov / 2) * Math.PI) / 180;
  const halfH = Math.atan(tanV * effAspect);
  const half = Math.min(halfV, halfH);
  const d = (r3 / Math.sin(half)) * 1.05 + 2;

  const dirX = 0.55;
  const dirZ = 0.72;
  const len = Math.hypot(dirX, dirZ);
  // near-level camera (half island height) keeps the vertical fit symmetric
  const pos: [number, number, number] = [
    ix + (dirX / len) * d,
    iy + sizeY * 0.52,
    iz + (dirZ / len) * d,
  ];

  // aim at the island's bounding-box centre; the left-of-centre placement is
  // applied as a projection view-offset in CameraRig (does not distort fit)
  const target: [number, number, number] = [ix, iy + sizeY * 0.5, iz];

  return { pos, target, fov };
}

export const TRANSITION_DURATION = 1.7;
