/**
 * The Phaser engine: the ONLY module that constructs or destroys a game.
 *
 * React never imports Phaser. React imports this file lazily, calls `mount`,
 * and calls `unmount`. Everything about the game's lifetime — listeners, the
 * canvas, the renderer, the RAF loop — is contained here so the React side can
 * stay ignorant of Phaser entirely.
 *
 * The exact failure this file is built to prevent:
 *
 *   hero -> enter world -> leave world -> return to hero -> enter world again
 *
 * which must produce no duplicate canvas, no stale instance, no leaked
 * listener, and no crash. `unmount()` is therefore idempotent and always
 * followed by `createGame` on the next mount, rather than a game that is
 * restarted in place.
 */

import Phaser from 'phaser';
import { physicsFor } from './config/worldConfig';
import type { WorldId } from './config/worldConfig';
import { isPlayable, WORLD_CONFIGS } from './config/worldConfig';
import { WorldScene } from './scenes/WorldScene';
import { resetInteractionBus } from './scenes/interactionBus';

export interface MountOptions {
  world: WorldId;
  reducedMotion: boolean;
  /** Container the canvas is appended to. Phaser does not clear it otherwise. */
  parent: HTMLElement;
}

export interface GameHandle {
  /** Stop the loop, destroy the renderer, remove the canvas and listeners. */
  unmount: () => void;
}

export const canMount = (world: WorldId): boolean => isPlayable(world);

/**
 * Mount a world. Throws if the world has no playable implementation, because
 * silently rendering an unbuilt world is worse than refusing.
 */
export const mountWorld = ({ world, reducedMotion, parent }: MountOptions): GameHandle => {
  const config = WORLD_CONFIGS[world];
  if (!config || !isPlayable(world)) {
    throw new Error(`World "${world}" has no playable implementation in Phase 1.`);
  }

  /*
   * Start from a clean bus. This MUST happen before the scene is created and
   * before React subscribes — a listener left over from a previous mount would
   * otherwise receive this world's events. Resetting later (inside `create()`)
   * would instead erase the live React listener and break the event path.
   */
  resetInteractionBus();

  // The scene is constructed here so `setConfig` can run before `create`.
  const scene = new WorldScene();
  scene.setConfig({ world: config, reducedMotion });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: config.palette.background,
    // `pixelArt` keeps nearest-neighbour scaling so the 16px art stays crisp.
    pixelArt: true,
    // RESIZE makes the canvas track its container, which is what lets the same
    // build work on a 390px phone and a 1920px desktop with no branching.
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth || 960,
      height: parent.clientHeight || 540,
    },
    physics: physicsFor(),
    // Audio is unused in Phase 1; no autoplay-policy surprises, no empty loader.
    disableContextMenu: true,
    banner: false,
    scene: [scene],
  });

  let destroyed = false;

  return {
    unmount: () => {
      // Idempotent: React StrictMode double-invokes effects in development,
      // so unmount can arrive twice for one mount.
      if (destroyed) return;
      destroyed = true;

      // Stop scene listeners first, then drop any React-side interaction
      // subscribers, then tear the instance down.
      const sceneInstance = game.scene.getScene('world');
      (sceneInstance as WorldScene | null)?.shutdown?.();

      // Phaser's own destroy stops the loop, removes the canvas, and releases
      // the WebGL context. `true` also disposes the renderer entirely.
      game.destroy(true);

      // Belt and braces: if anything left a canvas in our container, remove it.
      // Phaser removes its own, so this should be a no-op — it exists so a
      // renderer quirk cannot leave a visible ghost canvas behind.
      parent.querySelectorAll('canvas').forEach((c) => c.remove());

      resetInteractionBus();
    },
  };
};
