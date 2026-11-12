import Phaser from 'phaser';

/**
 * The Data World visual skin for the pipe transport.
 *
 * This is the only place that knows what a Data World pipe looks like. The
 * transport itself is world-agnostic (see `pipeTransport.ts`), so Cloud World
 * will add its own skin beside this one and reuse the identical transition code.
 *
 * THE ANIMATION
 *
 * Three phases over `PIPE_TRAVEL_MS`:
 *   0.00 - 0.40  the player sinks into the mouth (mouth scales down and fades)
 *   0.40 - 0.60  the player is repositioned behind the scene's full-screen conduit
 *   0.60 - 1.00  the player rises out at the destination (inverse of the first)
 *
 * Under reduced motion the mouth still fades and the tunnel still appears, because
 * the tunnel is how the visitor knows they travelled somewhere. What is dropped is
 * the sliding motion, not the fact of the transition — a reduced-motion visitor
 * still sees the world change chapter.
 *
 * CONTAINER COORDINATES
 *
 * Everything lives in one container anchored at the pipe's mouth centre, so
 * children are positioned RELATIVE to that anchor. The mouth sits at the
 * container origin, the chapter plate above it, the sign beside it, and the
 * tunnel band exactly on top of the mouth so it replaces the art while running.
 */

import type { ChapterId, WorldPipe } from '../config/worldConfig';
import { PIPE_HEIGHT, PIPE_HALF_WIDTH, pipeRect } from '../config/worldConfig';
import { DATA_PALETTE, drawSignBoard } from '../art/facilityArt';
import { drawPipeMouth, drawChapterPlate } from '../art/worldObjects';
import { stampPixelText } from '../art/pixelFont';
import type { TransportSkin } from './pipeTransport';

/** Texture name prefix, so a rebuild cannot collide with a stale texture. */
const PREFIX = 'data-pipe';

/** Sign geometry. */
const SIGN_H = 24;
const SIGN_POST_H = 26;

/** Chapter plate geometry. */
const PLATE_H = 18;

/** Gap between the sign board and the pipe mouth. */
const SIGN_GAP = 16;

export interface DataPipeSkinResult {
  skin: TransportSkin;
  /** The container holding every pipe visual, for teardown and diagnostics. */
  mouth: Phaser.GameObjects.Container;
  /** Swap between the dormant and powered tube art. Idempotent. */
  setActive: (active: boolean) => void;
}

/**
 * Build the Data World pipe visuals for one pipe and return the skin the
 * transport drives.
 *
 * All art is procedural: no image files, no loader, no network.
 */
export const createDataPipeSkin = (
  scene: Phaser.Scene,
  pipe: WorldPipe,
  reducedMotion: boolean,
): DataPipeSkinResult => {
  const rect = pipeRect(pipe);
  const mouthKey = `${PREFIX}-mouth-${pipe.id}`;
  /** The powered variant, swapped in on proximity. */
  const litKey = `${PREFIX}-mouth-lit-${pipe.id}`;
  const plateKey = `${PREFIX}-plate-${pipe.id}`;
  const signKey = `${PREFIX}-sign-${pipe.id}`;
  const tunnelKey = `${PREFIX}-tunnel-${pipe.id}`;

  /* ---------------------------------------------------------------- *
   * Textures
   * ---------------------------------------------------------------- */

  if (!scene.textures.exists(mouthKey)) {
    const texture = scene.textures.createCanvas(mouthKey, rect.width, rect.height);
    if (texture) {
      drawPipeMouth(texture.getContext(), rect, 0);
      texture.refresh();
    }
  }

  /*
   * THE LIT TEXTURE — the tube's "powered" state.
   *
   * Drawn once at build time rather than redrawn per frame: a canvas texture
   * repaint on every proximity change is wasted work, and Phaser's `setTint`
   * cannot brighten a multi-colour canvas meaningfully (it multiplies, so the
   * black outline stays black and the blues just get darker).
   *
   * Two textures swapped by `setTexture` is how the activation tell is done
   * here. `dataPipeSkin` picks between them on proximity.
   */
  if (!scene.textures.exists(litKey)) {
    const texture = scene.textures.createCanvas(litKey, rect.width, rect.height);
    if (texture) {
      drawPipeMouth(texture.getContext(), rect, 1);
      texture.refresh();
    }
  }

  // The chapter plate above the mouth names the destination.
  const plateW = Math.max(120, pipe.plate.length * 6 + 24);
  if (!scene.textures.exists(plateKey)) {
    const texture = scene.textures.createCanvas(plateKey, plateW, PLATE_H);
    if (texture) {
      drawChapterPlate(texture.getContext(), { width: plateW, height: PLATE_H }, pipe.plate);
      texture.refresh();
    }
  }

  // The sign stands beside the pipe. This is the "JUMP TO START" prompt.
  const signW = Math.max(132, pipe.signText.length * 6 + 20);
  if (!scene.textures.exists(signKey)) {
    const texture = scene.textures.createCanvas(signKey, signW, SIGN_H + SIGN_POST_H);
    if (texture) {
      drawSignBoard(texture.getContext(), {
        text: pipe.signText,
        width: signW,
        height: SIGN_H,
        textureHeight: SIGN_H + SIGN_POST_H,
        arrow: true,
        post: true,
      });
      texture.refresh();
    }
  }

  // The tunnel band: a repeating conduit run that scrolls during travel. It MUST
  // be a tile sprite at runtime so `tilePositionX` actually scrolls the texture —
  // on a plain Image that property silently does nothing.
  const tunnelW = rect.width;
  if (!scene.textures.exists(tunnelKey)) {
    const texture = scene.textures.createCanvas(tunnelKey, 128, PIPE_HEIGHT);
    if (texture) {
      const ctx = texture.getContext();
      ctx.fillStyle = DATA_PALETTE.voidBlack;
      ctx.fillRect(0, 0, 128, PIPE_HEIGHT);
      // Lit crown, dark underside: same light direction as every other pipe.
      ctx.fillStyle = DATA_PALETTE.structureMid;
      ctx.fillRect(0, 0, 128, 4);
      ctx.fillStyle = DATA_PALETTE.signalDim;
      ctx.fillRect(0, 4, 128, 1);
      ctx.fillStyle = DATA_PALETTE.structureDark;
      ctx.fillRect(0, PIPE_HEIGHT - 4, 128, 4);
      // Flow streaks at three depths, brighter as they come forward.
      for (let depth = 0; depth < 3; depth += 1) {
        const inset = 4 + depth * 6;
        ctx.fillStyle = depth === 2 ? DATA_PALETTE.signal : DATA_PALETTE.signalDim;
        ctx.fillRect(inset, 6 + depth * 8, 128 - inset * 2, 1);
      }
      // Collars, so the band reads as a pipe rather than a gradient.
      ctx.fillStyle = DATA_PALETTE.structureLit;
      for (let cx = 16; cx < 128; cx += 32) ctx.fillRect(cx, 0, 3, PIPE_HEIGHT);
      texture.refresh();
    }
  }

  /* ---------------------------------------------------------------- *
   * Object graph — all coordinates relative to the container origin
   * ---------------------------------------------------------------- */

  const container = scene.add.container(pipe.x, pipe.y);
  // Depth above the floor so the player walks in front of the far pipe art.
  container.setDepth(4);

  const mouthImage = scene.add.image(0, 0, mouthKey).setOrigin(0.5, 0.5);
  container.add(mouthImage);

  const plate = scene.add
    .image(0, -PIPE_HEIGHT / 2 - PLATE_H / 2 - 6, plateKey)
    .setOrigin(0.5, 0.5);
  container.add(plate);

  // The sign's board sits at ground level, to the left of the mouth. Its post
  // runs down into the floor, so the board is raised by the post height.
  const sign = scene.add
    .image(
      -(PIPE_HALF_WIDTH + signW / 2 + SIGN_GAP),
      PIPE_HEIGHT / 2 - SIGN_H / 2 - SIGN_POST_H + 4,
      signKey,
    )
    .setOrigin(0.5, 0.5);
  container.add(sign);

  const tunnel = scene.add
    .tileSprite(0, 0, tunnelW, PIPE_HEIGHT, tunnelKey)
    .setOrigin(0.5, 0.5)
    .setVisible(false);
  container.add(tunnel);

  /* ---------------------------------------------------------------- *
   * Skin
   * ---------------------------------------------------------------- */

  /** Per-pipe scroll offset. Instance state, never module state. */
  let scroll = 0;

  const skin: TransportSkin = {
    name: 'data',

    // Art is placed at build time; this satisfies the interface and gives a
    // future skin the single hook it would need for a one-off redraw.
    draw: () => {},

    hide: () => {
      container.setVisible(false);
    },

    show: () => {
      container.setVisible(true);
    },

    /*
     * The conduit rush, and nothing else.
     *
     * The transport is now a twelve-phase machine, so this skin no longer owns a
     * 0..1 progress curve for the whole travel: the player climbing in and out is
     * the host's job, and the screen blackout is the scene's. What remains here is
     * purely the "moving through a conduit" read, which is a scroll of the tunnel
     * art plus a scroll of the full-screen band the scene owns.
     *
     * `t` runs 0..1 across the conduit phase only.
     */
    conduit: (t: number) => {
      if (tunnel.visible) {
        /*
         * Reduced motion: the conduit is still SHOWN, so the visitor sees the
         * world change chapter, but it does not scroll and does not brighten. The
         * transition is preserved; only the movement is removed. A full-motion
         * visitor gets the rush.
         */
        if (!reducedMotion) {
          scroll += 8;
          tunnel.tilePositionX = scroll;
        }
        tunnel.setAlpha(reducedMotion ? 0.85 : 0.55 + t * 0.45);
      }
    },

    conduitEnd: () => {
      tunnel.setVisible(false).setAlpha(0);
      // The mouth and its signage return to rest; `show()` handles the container,
      // but the tunnel is a sibling that must be reset explicitly.
      mouthImage.setScale(1);
      mouthImage.setAlpha(1);
      sign.setAlpha(1);
      // A tube must not stay lit after the player has gone through it.
      mouthImage.setTexture(mouthKey);
    },
  };

  /*
   * THE ACTIVATION TELL.
   *
   * `setActive(true)` swaps in the lit texture — brighter cap, brighter
   * interior, stronger highlight, visible data streaks. This is the single
   * clearest "this tube will take you somewhere" signal in the world, and it is
   * driven by proximity so the visitor never has to guess which object is live.
   *
   * Idempotent, and it resets on `conduitEnd` so a tube does not stay lit after
   * the player has travelled through it.
   */
  const setActive = (active: boolean) => {
    mouthImage.setTexture(active ? litKey : mouthKey);
  };

  setActive(false);

  return { skin, mouth: container, setActive };
};

/**
 * Build a chapter label plate, shown at the start of each chapter so the visitor
 * always knows where they are.
 *
 * Separate from the pipe's own plate because a chapter label is about where you
 * ARE, while the pipe plate is about where you are GOING.
 */
export const chapterLabelTexture = (
  scene: Phaser.Scene,
  chapter: ChapterId,
  label: string,
): string => {
  const key = `${PREFIX}-chapter-${chapter}`;
  if (scene.textures.exists(key)) return key;

  const width = Math.max(110, label.length * 6 + 20);
  const height = 20;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return key;

  const ctx = texture.getContext();
  ctx.fillStyle = DATA_PALETTE.structureDark;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = DATA_PALETTE.signalDim;
  ctx.fillRect(0, 0, width, 1);
  ctx.fillRect(0, height - 1, width, 1);
  stampPixelText(ctx, 8, Math.floor((height - 7) / 2), label, DATA_PALETTE.signalBright, 1);
  texture.refresh();
  return key;
};
