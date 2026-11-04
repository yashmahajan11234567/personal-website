import type { DestId } from '../experience.data';

/**
 * Camera poses. ONE shared selected pose per destination is derived from the
 * island's world position: the camera sits to the island's front-right so the
 * island lands on the LEFT of frame (the HTML panel owns the right half).
 * The other islands stay in the scene, outside the frustum — framing only.
 *
 * Overview: side-by-side row — lighthouse left, windmill centre (slightly back), pagoda right.
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

/* Island anchor positions in world space (must match Island.tsx placement).
 * Side-by-side row: lighthouse left, windmill centre (slightly back), pagoda right.
 * Equal horizontal spacing ~50 units. Windmill pushed back ~12 units for depth. */
export const ISLAND_POS: Record<DestId, [number, number, number]> = {
  lighthouse: [-50, 0, 0],
  windmill: [0, 0, 12],
  pagoda: [50, 0, 0],
};

/**
 * Selected pose for an island: camera offset from the island so that the
 * island appears left-of-centre. Offset direction is chosen per island so the
 * camera looks inward across the scene.
 * 
 * Camera positioning based on island bounding box (MODEL_HEIGHT = 42):
 * - Island vertical center is at ~21 units (half of 42)
 * - Camera should target the island's upper third (~30-35) to show landmark and top
 * - Camera distance ~45-55 units for proper framing (2.5-3x island height)
 * - Camera height ~20-25 units for elevated three-quarter view
 * - Camera offset horizontally to position island on left third of screen
 * 
 * Per-island tuning based on landmark characteristics:
 * - Lighthouse: tall tower (~40+ units), needs more distance, target upper tower
 * - Windmill: blades at top, medium distance, target blade hub
 * - Pagoda: tiered roof (~35 units), close distance, target roof peak
 */
export function selectedPose(id: DestId): Pose {
  const [ix, iy, iz] = ISLAND_POS[id];
  
  // Per-island camera tuning - calculated for MODEL_HEIGHT = 42
  // distance = 2.5-3x island height (42) = 105-126, but adjusted for viewport
  // effective distance = 45-55 from island center
  // target = island center + vertical offset to show upper portion
  // height = camera elevation for three-quarter view
  // fov = narrower for detail, wider for context
  
  const configs: Record<DestId, { 
    distance: number; 
    height: number; 
    fov: number; 
    targetOffset: number; 
    horizontalOffset: number;
  }> = {
    lighthouse: { 
      distance: 52,   // ~2.5x island height - tall tower needs breathing room
      height: 22,     // elevated view to see tower top
      fov: 42,        // narrower FOV for tall landmark
      targetOffset: 30, // target at y=30 (upper third of 42)
      horizontalOffset: 0.85, // camera to front-right
    },
    windmill: { 
      distance: 48,   // medium distance
      height: 20,     // see blade rotation clearly
      fov: 45,        // wider for blade sweep
      targetOffset: 28, // target blade hub area
      horizontalOffset: 0.9,
    },
    pagoda: { 
      distance: 45,   // closer for tiered detail
      height: 22,     // elevated for tiered roof
      fov: 42,        // focused framing
      targetOffset: 32, // target roof peak
      horizontalOffset: 0.85,
    },
  };
  
  const cfg = configs[id];
  const { distance, height, fov, targetOffset, horizontalOffset } = cfg;
  
  // Camera sits to the island's front-RIGHT (positive x for right side)
  // pos: [ix + distance * horizontalOffset, iy + height, iz + distance * 0.35]
  // target: [ix, iy + targetOffset, iz] - look at landmark focal point
  return {
    pos: [ix + distance * horizontalOffset, iy + height, iz + distance * 0.35],
    target: [ix, iy + targetOffset, iz],
    fov,
  };
}

export const TRANSITION_DURATION = 1.7;
