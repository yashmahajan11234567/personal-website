/**
 * Phase 1 world configuration.
 *
 * One shared engine, configuration-driven worlds. Data and Cloud differ only by
 * the values in here — there is deliberately no second engine, no duplicated
 * scene, and no per-world subclass. Adding the Cloud world in a later phase must
 * be a new entry in `WORLD_CONFIGS`, not a new engine.
 *
 * Dimensions are the WORLD size, not the canvas size: the world is wider than
 * the viewport and the camera scrolls it. `view` is the initial canvas size,
 * replaced at runtime by the scale manager for the real container.
 */

export type WorldId = 'data' | 'cloud';

export interface WorldPlatform {
  /** World-space left edge. */
  x: number;
  /** World-space top edge. */
  y: number;
  /** Platform width in pixels. */
  width: number;
  /** Platform height in pixels. */
  height: number;
  /** Whether the player can pass through from below. */
  oneWay?: boolean;
}

export interface WorldPalette {
  /** Sky / clear colour behind everything. */
  background: string;
  /** Distant parallax band. */
  far: string;
  /** Ground and platform body. */
  ground: string;
  /** Lighter top edge on ground and platforms, for a readable pixel rim. */
  groundTop: string;
  /** Grid lines and decorative marks. */
  grid: string;
}

export interface WorldConfig {
  id: WorldId;
  /** Human name used in the accessibility mirror and the heading. */
  name: string;
  /** Total world width. Wider than any viewport so the camera has work to do. */
  width: number;
  /** Total world height. */
  height: number;
  /** Ground surface y, in world space. */
  groundY: number;
  /** Player spawn, in world space. */
  spawn: { x: number; y: number };
  platforms: WorldPlatform[];
  palette: WorldPalette;
}

export const PLAYER = {
  /** Rendered sprite size. 16px-inspired: the character is drawn at 16x16. */
  size: 16,
  /** Physics hitbox. Slightly shorter than the sprite so it clears platform lips. */
  bodyWidth: 10,
  bodyHeight: 14,
  /** Walk speed in px/s. Deliberately unhurried — responsive, not fast. */
  speed: 90,
  /** Ground acceleration in px/s^2. High enough to feel immediate. */
  acceleration: 900,
  /** Deceleration when no key is held. */
  drag: 1100,
  /** Jump impulse in px/s. Tuned against `gravityY` below. */
  jumpVelocity: 230,
  /** Downward gravity in px/s^2. */
  gravityY: 900,
  /** Air control multiplier. Below 1 so a jump commits to its arc. */
  airControl: 0.7,
  /** Coyote time in ms: grace after walking off a ledge. */
  coyoteMs: 90,
  /** Jump buffer in ms: a jump pressed just before landing still fires. */
  jumpBufferMs: 110,
  /** Camera deadzone inset, so small hops do not drag the view. */
  deadzone: { width: 96, height: 72 },
  /** Camera lerp. Lower = tighter follow, higher = lazier. */
  lerp: 0.12,
} as const;

/**
 * Physics values that stay constant across worlds. Exported as a factory so a
 * future world cannot accidentally mutate the shared object.
 */
export const physicsFor = () => ({
  default: 'arcade' as const,
  arcade: {
    gravity: { x: 0, y: PLAYER.gravityY },
    // Pixel snapping only; no debug overlay, no decorative physics.
    debug: false,
    fps: 60,
  },
});

/** The Data world: the minimum playable foundation required in Phase 1. */
export const DATA_WORLD: WorldConfig = {
  id: 'data',
  name: 'Data World',
  // 1920 wide is wider than every desktop viewport under test, so the camera
  // must follow rather than show the whole world at once.
  width: 1920,
  height: 640,
  groundY: 560,
  spawn: { x: 120, y: 480 },
  platforms: [
    // A stepped opening so the first jump is trivial, then real gaps.
    { x: 320, y: 470, width: 96, height: 16 },
    { x: 520, y: 400, width: 80, height: 16 },
    { x: 700, y: 340, width: 80, height: 16, oneWay: true },
    { x: 900, y: 430, width: 120, height: 16 },
    { x: 1160, y: 360, width: 80, height: 16 },
    { x: 1320, y: 290, width: 96, height: 16, oneWay: true },
    { x: 1560, y: 430, width: 160, height: 16 },
  ],
  palette: {
    background: '#070b14',
    far: '#0f1a2e',
    ground: '#16233d',
    groundTop: '#2f4a7a',
    grid: '#1d2c48',
  },
};

/**
 * Cloud exists as configuration only. Phase 1 ships no gameplay for it, so the
 * engine refuses to build a world whose config is not yet playable — see
 * `isPlayable` in the engine. Cloud becomes playable in a later phase by
 * flipping that flag, with no engine change.
 */
export const CLOUD_WORLD: WorldConfig = {
  id: 'cloud',
  name: 'Cloud World',
  width: 1920,
  height: 640,
  groundY: 560,
  spawn: { x: 120, y: 480 },
  platforms: [
    { x: 360, y: 460, width: 96, height: 16 },
    { x: 620, y: 380, width: 96, height: 16 },
    { x: 940, y: 420, width: 128, height: 16 },
    { x: 1300, y: 340, width: 96, height: 16 },
  ],
  palette: {
    background: '#0d0a14',
    far: '#1b1430',
    ground: '#241a3d',
    groundTop: '#4a3785',
    grid: '#2e2352',
  },
};

/**
 * Which worlds Phase 1 can actually build a playable scene for.
 *
 * Cloud is absent on purpose. This is the guard that stops the shared engine
 * from silently rendering an unbuilt world when someone navigates to it.
 */
export const PLAYABLE_WORLDS: readonly WorldId[] = ['data'];

export const isPlayable = (id: WorldId): boolean => PLAYABLE_WORLDS.includes(id);

export const WORLD_CONFIGS: Record<WorldId, WorldConfig> = {
  data: DATA_WORLD,
  cloud: CLOUD_WORLD,
};
