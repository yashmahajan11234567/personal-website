/**
 * Procedural pixel art for the Phase 1 world.
 *
 * Same precedent as the existing hero environment: everything is drawn at
 * runtime, so there are no image files to download and no asset pack to load.
 * Textures are built once per game instance on a `CanvasTexture`, which keeps
 * them tiny (a 16x16 player is 256 pixels) and lets `pixelArt: true` keep the
 * nearest-neighbour scaling crisp.
 *
 * The player is a 16x16 character with a readable silhouette — head, shoulders,
 * legs, and a distinguishing accent — rather than a generic coloured box.
 */

/** Palette for the player, keyed by role so the silhouette stays coherent. */
const PLAYER_PALETTE = {
  outline: '#0b0d12',
  skin: '#e8b48c',
  hair: '#2b2118',
  torso: '#3f7fd6',
  torsoShade: '#2f63a8',
  leg: '#28425f',
  accent: '#f2c14e',
} as const;

/**
 * 16x16 player art, one string per row. Each character is a palette key:
 *
 *   `.` transparent   `o` outline   `s` skin   `h` hair
 *   `t` torso          `T` torsoShade `l` leg     `a` accent
 *
 * Idle/left/right share one sheet and flip horizontally on `setFlipX`, so the
 * character reads as facing where it is going.
 */
const PLAYER_IDLE = [
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohssssssho...',
  '...ohssssssho...',
  '....ossssso.....',
  '.....oswso......',
  '..ooootttttoo...',
  '.osttttttttto...',
  '.ostttttttrto...',
  '.osttttttrtto...',
  '..oTttttttTo....',
  '....olllllo.....',
  '....ol.l.lo.....',
  '...ol...l.lo....',
  '...oa...a.ao....',
] as const;

/**
 * Draw the player into a 16x16 canvas-backed texture.
 *
 * Phaser 4 note: the sprite-level physics helpers (`setVelocityX`, `setBounce`,
 * `setCollideWorldBounds`) no longer exist. Movement and collision are set on
 * `sprite.body`, so this module only paints pixels.
 */
export const drawPlayer = (scene: Phaser.Scene, textureKey = 'player'): void => {
  if (scene.textures.exists(textureKey)) return;

  const texture = scene.textures.createCanvas(textureKey, 16, 16);
  if (!texture) return;

  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 16, 16);
  ctx.imageSmoothingEnabled = false;

  const colour = (key: string): string => {
    switch (key) {
      case 'o':
        return PLAYER_PALETTE.outline;
      case 'h':
        return PLAYER_PALETTE.hair;
      case 's':
      case 'w':
        return PLAYER_PALETTE.skin;
      case 't':
        return PLAYER_PALETTE.torso;
      case 'T':
        return PLAYER_PALETTE.torsoShade;
      case 'l':
        return PLAYER_PALETTE.leg;
      case 'a':
        return PLAYER_PALETTE.accent;
      default:
        return '';
    }
  };

  for (let y = 0; y < PLAYER_IDLE.length; y += 1) {
    const row = PLAYER_IDLE[y];
    for (let x = 0; x < row.length; x += 1) {
      const key = row[x];
      if (key === '.') continue;
      const fill = colour(key);
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  texture.refresh();
};

/**
 * Draw a flat, dithered-looking far band: vertical bars of `far` over the
 * background, giving parallax depth without any image asset.
 */
export const drawFarBand = (scene: Phaser.Scene, config: {
  width: number;
  height: number;
  bandTop: number;
  colour: string;
}): void => {
  const key = `far-${config.bandTop}`;
  if (scene.textures.exists(key)) return;

  const w = config.width;
  const h = Math.max(1, config.height - config.bandTop);
  const texture = scene.textures.createCanvas(key, w, h);
  if (!texture) return;

  const ctx = texture.getContext();
  ctx.fillStyle = config.colour;
  for (let x = 0; x < w; x += 32) {
    // Deterministic bar heights: no Math.random, so runs are reproducible.
    const barH = 24 + ((x / 32) % 4) * 12;
    ctx.fillRect(x, h - barH, 20, barH);
  }
  texture.refresh();
};

/**
 * The interactive-object marker. Phase 1 only establishes the mechanism, so
 * this is a simple pulsing-free gem: no motion, so reduced-motion users get an
 * identical experience.
 */
export const drawInteractionGem = (scene: Phaser.Scene): void => {
  const key = 'gem';
  if (scene.textures.exists(key)) return;

  const texture = scene.textures.createCanvas(key, 12, 12);
  if (!texture) return;

  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 12, 12);
  ctx.fillStyle = '#7fe3c4';
  ctx.fillRect(4, 1, 4, 2);
  ctx.fillRect(2, 3, 8, 4);
  ctx.fillRect(4, 7, 4, 2);
  ctx.fillStyle = '#d8fff2';
  ctx.fillRect(4, 3, 2, 2);
  texture.refresh();
};
