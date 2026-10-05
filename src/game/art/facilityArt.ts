/**
 * Procedural environment art for the Data World.
 *
 * Everything here is drawn at runtime into `CanvasTexture`s. There are no image
 * files, no loader, and no asset pack: the whole industrial facility is a few
 * thousand `fillRect` calls at boot. That keeps the world genuinely pixelised
 * (hard edges, limited palette, dithered bands) and costs the bundle nothing,
 * which matters because this chunk is fetched only when a world is opened.
 *
 * THE VISUAL DIRECTION
 *
 * The reference is an underground data facility, not a sewer. The difference is
 * entirely in how a pipe is drawn: sewer pipe is a rounded, dirty, wet tube;
 * data conduit is a squared-off industrial cylinder with a bright flow line,
 * segment collars, and hard-lit metal banding. So every pipe here is built from
 * flat rectangles with a one-pixel highlight edge and a distinct collar — no
 * gradients, no curves, no rust.
 *
 * Depth is three real layers, each on its own scroll factor:
 *   far  (0.15) — silhouetted towers and distant conduit runs, near-black
 *   mid  (0.45) — large conduits with flow lines, structural gantries
 *   near (1.00) — the playable floor, its supports, and everything lit
 *
 * All randomness is a deterministic hash of the coordinate, never `Math.random`,
 * so two runs produce byte-identical art and a screenshot regression is real.
 */

import {
  GLYPH_H,
  stampPixelText,
  stampPixelTextCentred,
  wrapPixelText,
} from './pixelFont';

/**
 * The font primitives are re-exported so art modules have one import site for
 * everything they draw with. `pixelFont` stays a leaf module; this re-export is
 * the only thing that depends on it.
 */
export { GLYPH_H, stampPixelText, stampPixelTextCentred, wrapPixelText };

/** Deterministic value noise in [0,1). Cheap, stable, good enough for structure. */
const hash = (x: number, y = 0): number => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
};

/**
 * Monochrome + cyan Data palette.
 *
 * Deliberately narrow: near-black structure, three grey steps for readable
 * metal banding, and cyan reserved for data flow and interaction. Cyan never
 * fills a surface — it marks something live, which is what keeps a screen full
 * of pipes from turning into a blue wash.
 */
export const DATA_PALETTE = {
  voidBlack: '#04060a',
  structureDark: '#0c111a',
  structureMid: '#1a2230',
  structureLit: '#2b3646',
  metal: '#48566b',
  metalLit: '#6e7f96',
  signalDim: '#1d4a5c',
  signal: '#38b6d9',
  signalBright: '#8ceaff',
  text: '#e8f4ff',
  textDim: '#8fa4bd',
} as const;

export interface FacilityArtConfig {
  /** Total world width the facility spans. */
  worldWidth: number;
  /** World height. */
  worldHeight: number;
  /** The floor surface y. Structures hang from above and rise from below it. */
  groundY: number;
}

/* ------------------------------------------------------------------ *
 * Generic texture helper
 * ------------------------------------------------------------------ */

/**
 * Create (or reuse) a canvas texture and hand back its 2D context.
 *
 * `createCanvas` is used rather than `generateTexture` so the pixels can be
 * composed with plain canvas calls — no Phaser Graphics object per shape, which
 * is what would otherwise cost hundreds of draw calls every frame.
 *
 * Returns null when the texture already exists. Callers that want to draw must
 * therefore only call this ONCE per key and keep the returned context for the
 * `finish()` call; a second call with the same key is a no-op by design, so
 * nothing is ever drawn twice into the same texture.
 */
export const canvasTexture = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
): CanvasRenderingContext2D | null => {
  if (scene.textures.exists(key)) {
    return null;
  }
  const texture = scene.textures.createCanvas(key, Math.max(1, width), Math.max(1, height));
  if (!texture) return null;
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  // Stash the texture so the caller can refresh exactly once, at the end.
  (ctx as CanvasRenderingContext2D & { __tex?: Phaser.Textures.CanvasTexture }).__tex = texture;
  return ctx;
};

/** Commit a context created by {@link canvasTexture} to its texture. */
export const finish = (ctx: CanvasRenderingContext2D): void => {
  (ctx as CanvasRenderingContext2D & { __tex?: Phaser.Textures.CanvasTexture }).__tex?.refresh();
};

/* ------------------------------------------------------------------ *
 * A single industrial pipe/conduit, reusable at any size
 * ------------------------------------------------------------------ */

/**
 * Draw one squared-off data conduit, horizontally, with its top-left at (0,0).
 *
 * Construction, top to bottom: dark body, a lit upper bevel, a bright one-pixel
 * highlight where light catches the crown, the flow line down the middle, and a
 * darker underside. Collars are separate structures drawn on top, not part of
 * this call, so collars can be spaced independently of pipe length.
 *
 * `flow` draws the cyan data-flow stripe and the direction chevrons. Structural
 * pipes pass `false` and stay grey, which is how the background reads as
 * "infrastructure" and the midground as "carrying data" without both glowing.
 */
export const drawConduit = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  thickness: number,
  options: { flow?: boolean; dim?: boolean } = {},
): void => {
  const { flow = false, dim = false } = options;
  const body = dim ? DATA_PALETTE.structureDark : DATA_PALETTE.structureMid;
  const bevel = dim ? DATA_PALETTE.structureMid : DATA_PALETTE.metal;
  const crown = dim ? DATA_PALETTE.metal : DATA_PALETTE.metalLit;

  ctx.fillStyle = body;
  ctx.fillRect(x, y, length, thickness);

  // Upper bevel + one-pixel crown highlight: reads as light from above.
  ctx.fillStyle = bevel;
  ctx.fillRect(x, y, length, 2);
  ctx.fillStyle = crown;
  ctx.fillRect(x, y, length, 1);

  // Underside shadow.
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(x, y + thickness - 1, length, 1);

  if (!flow) return;

  // Data-flow stripe, inset from both edges so the pipe still reads as a pipe.
  const stripeY = y + Math.floor(thickness / 2);
  ctx.fillStyle = DATA_PALETTE.signalDim;
  ctx.fillRect(x + 2, stripeY, Math.max(0, length - 4), 1);
  ctx.fillStyle = DATA_PALETTE.signal;
  // A run of lit segments rather than a solid line: this is what reads as
  // "packets in transit" instead of "painted stripe".
  const pitch = 12;
  for (let i = 4; i < length - 4; i += pitch) {
    ctx.fillRect(x + i, stripeY, 4, 1);
  }
};

/** A collar/joint band, drawn over a conduit at `x`. */
export const drawCollar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  thickness: number,
  width = 4,
): void => {
  ctx.fillStyle = DATA_PALETTE.structureLit;
  ctx.fillRect(x, y - 1, width, thickness + 2);
  ctx.fillStyle = DATA_PALETTE.metalLit;
  ctx.fillRect(x, y - 1, width, 1);
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(x, y + thickness, width, 1);
};

/**
 * Vertical conduit, used for background runs and gantry legs.
 * Same construction as the horizontal one, transposed by hand (no rotate, so
 * the pixel grid never lands off-integer).
 */
export const drawVerticalConduit = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  thickness: number,
  options: { flow?: boolean; dim?: boolean } = {},
): void => {
  const { flow = false, dim = false } = options;
  const body = dim ? DATA_PALETTE.structureDark : DATA_PALETTE.structureMid;
  ctx.fillStyle = body;
  ctx.fillRect(x, y, thickness, length);
  ctx.fillStyle = dim ? DATA_PALETTE.structureMid : DATA_PALETTE.metal;
  ctx.fillRect(x, y, 1, length);
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(x + thickness - 1, y, 1, length);
  if (flow) {
    const sx = x + Math.floor(thickness / 2);
    ctx.fillStyle = DATA_PALETTE.signalDim;
    ctx.fillRect(sx, y + 2, 1, Math.max(0, length - 4));
    ctx.fillStyle = DATA_PALETTE.signal;
    for (let i = 6; i < length - 4; i += 14) ctx.fillRect(sx, y + i, 1, 5);
  }
};

/* ------------------------------------------------------------------ *
 * Ceiling structure — what the 2x camera reveals
 * ------------------------------------------------------------------ */

/**
 * An elbow: a 90-degree pipe bend joining a horizontal run to a vertical one.
 *
 * The previous art could only draw straight runs, which is why pipes read as
 * "thin lines" rather than as plumbing: a facility is defined by its bends and
 * junctions far more than by its straight spans. This draws a squared elbow in
 * L shape — no curves, no anti-aliased arcs — so the pixel grid stays intact.
 *
 * `direction` picks which corner the bend occupies:
 *   'down'  — comes from the left, turns down at x
 *   'up'    — comes from the left, turns up at x
 *   'right' — comes from above, turns right at y
 *   'left'  — comes from above, turns left at y
 */
export const drawElbow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  thickness: number,
  direction: 'down' | 'up' | 'right' | 'left',
  length = 60,
): void => {
  const body = DATA_PALETTE.structureMid;
  const bevel = DATA_PALETTE.metal;
  const crown = DATA_PALETTE.metalLit;

  if (direction === 'down' || direction === 'up') {
    const verticalAt = direction === 'down' ? x : x;
    const runY = direction === 'down' ? y : y;
    const goY = direction === 'down' ? y + length : y - length;

    // Horizontal arm arriving at the bend.
    ctx.fillStyle = body;
    ctx.fillRect(x - length, runY, length, thickness);
    ctx.fillStyle = bevel;
    ctx.fillRect(x - length, runY, length, 2);
    ctx.fillStyle = crown;
    ctx.fillRect(x - length, runY, length, 1);
    ctx.fillStyle = DATA_PALETTE.voidBlack;
    ctx.fillRect(x - length, runY + thickness - 1, length, 1);

    // Vertical arm leaving it.
    const top = direction === 'down' ? runY : goY;
    ctx.fillStyle = body;
    ctx.fillRect(verticalAt, top, thickness, length);
    ctx.fillStyle = bevel;
    ctx.fillRect(verticalAt, top, 2, length);
    ctx.fillStyle = DATA_PALETTE.voidBlack;
    ctx.fillRect(verticalAt + thickness - 1, top, 1, length);

    // The corner block itself, which is what makes it read as ONE pipe bending
    // rather than two pipes overlapping.
    ctx.fillStyle = body;
    ctx.fillRect(x, runY, thickness, thickness);
    ctx.fillStyle = crown;
    ctx.fillRect(x, runY, thickness, 1);
    return;
  }

  // 'right' | 'left' — a vertical run arriving from above, bending horizontally.
  const horizontalX = direction === 'right' ? x : x - length;
  ctx.fillStyle = body;
  ctx.fillRect(x, y - length, thickness, length);
  ctx.fillStyle = bevel;
  ctx.fillRect(x, y - length, 2, length);
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(x + thickness - 1, y - length, 1, length);

  ctx.fillStyle = body;
  ctx.fillRect(horizontalX, y, length, thickness);
  ctx.fillStyle = bevel;
  ctx.fillRect(horizontalX, y, length, 2);
  ctx.fillStyle = crown;
  ctx.fillRect(horizontalX, y, length, 1);
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(horizontalX, y + thickness - 1, length, 1);

  ctx.fillStyle = body;
  ctx.fillRect(horizontalX, y, thickness, thickness);
  ctx.fillStyle = crown;
  ctx.fillRect(horizontalX, y, 1, thickness);
};

/**
 * A junction box: where several conduits meet, with a lit indicator panel.
 *
 * Junctions are the detail that makes a pipe network read as engineered rather
 * than decorative — a bundle of parallel pipes that never joins looks like
 * wallpaper, whereas pipes meeting at labelled boxes looks like a facility.
 */
export const drawJunction = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 34,
): void => {
  ctx.fillStyle = DATA_PALETTE.structureLit;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = DATA_PALETTE.metalLit;
  ctx.fillRect(x, y, size, 2);
  ctx.fillRect(x, y, 2, size);
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(x + size - 1, y, 1, size);
  ctx.fillRect(x, y + size - 1, size, 1);

  // Recessed readout panel.
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(x + 5, y + 6, size - 10, size - 14);
  ctx.fillStyle = DATA_PALETTE.signalDim;
  ctx.fillRect(x + 6, y + 7, size - 12, 1);
  ctx.fillStyle = DATA_PALETTE.signal;
  const bars = Math.max(1, Math.floor((size - 14) / 5));
  for (let i = 0; i < bars; i += 1) {
    ctx.fillRect(x + 6 + i * 5, y + size - 9, 3, 2);
  }
};

/**
 * The ceiling: everything above the original 640px world height.
 *
 * The world was extended upward to 900px purely so that zooming the camera in
 * REVEALS structure instead of cropping to emptiness. Without this the 2x camera
 * would frame bare black above the gantries — the exact "empty dark room" the
 * visual direction forbids.
 *
 * Drawn as: heavy ceiling beams across the top, hanging cable trays, vertical
 * risers dropping toward the midground runs, and a bank of distant plant lights.
 * All of it is dimmer than the midground so it reads as "above and behind".
 */
export const drawCeiling = (
  scene: Phaser.Scene,
  config: FacilityArtConfig & { ceilingFrom: number },
): void => {
  /*
   * The texture is `groundY` tall, not `worldHeight`.
   *
   * The world is 900 tall but the camera can never frame below y=640 (groundY plus
   * the floor margin), so a 900-tall texture would carry 340px of rows that are
   * never on screen. Sizing to `groundY` is safe for this layer specifically
   * because all of its art is in the band y=280..540 — well above the floor line.
   */
  const key = `facility-ceiling-${config.worldWidth}-${config.ceilingFrom}-${config.groundY}`;
  const ctx = canvasTexture(scene, key, config.worldWidth, config.groundY);
  if (!ctx) return;

  const { worldWidth: W } = config;

  /*
   * EVERYTHING IS PLACED AGAINST THE VISIBLE BAND, NOT AGAINST THE WORLD TOP.
   *
   * Measured: at 2x zoom with `verticalBias: 150` the camera shows y=280..541.
   * The first version of this function drew from y=0 — beams across the top of a
   * 900px world, trays at y=34 and y=96, lights at y=150..240 — and the camera
   * could not scroll high enough to see any of it. It was ~600 lines of drawing
   * producing nothing on screen.
   *
   * `BAND_TOP` is the top of the visible band, and every structure is positioned
   * relative to it. The world above stays black, which is correct: it is the
   * unlit space above the lit facility, and the camera never frames it.
   */
  const BAND_TOP = 296;

  /*
   * NO OPAQUE BACKGROUND FILL — THIS IS THE FIX THAT MAKES THE LAYER VISIBLE.
   *
   * Measured on the real textures: this function used to fill all 3840x560 px with
   * opaque `voidBlack`, and so did `drawFarSkyline`. Layer order is far (depth -30)
   * then ceiling (-25) then mid (-20), so the ceiling's opaque fill ERASED the far
   * skyline entirely. A pixel census of the three exported textures found:
   *
   *     facility-far       72.3% opaque #04060a
   *     facility-ceiling   93.8% opaque #04060a   <- painted over the far layer
   *     facility-mid       76.4% alpha = 0        <- the only transparent layer
   *
   * Only `mid` composited correctly, so every beam, cable tray, riser and plant
   * light drawn here — and the whole distant skyline behind it — never reached the
   * screen. The scene was rendering one layer over a black field, which is exactly
   * why a frame sample found 66% of scanlines holding a single colour.
   *
   * Only the BACKMOST layer may paint an opaque backdrop. Everything in front of it
   * must leave empty pixels transparent so the layers behind show through, which is
   * what produces the depth read the design calls for. `drawFarSkyline` keeps its
   * opaque fill because it IS the backmost layer.
   */


  /*
   * Heavy transverse beams spanning the band, with a lit lower lip. These hang
   * DOWN from the top of the visible area, so they read as the ceiling pressing
   * into frame rather than as a border at the edge of the world.
   */
  for (let bx = 0; bx < W; bx += 220) {
    const jitter = Math.floor(hash(bx, 7) * 40);
    const x = bx + jitter;
    ctx.fillStyle = DATA_PALETTE.structureDark;
    ctx.fillRect(x, BAND_TOP, 26, 74);
    ctx.fillStyle = DATA_PALETTE.structureMid;
    ctx.fillRect(x, BAND_TOP + 68, 26, 6);
    ctx.fillStyle = DATA_PALETTE.metal;
    ctx.fillRect(x, BAND_TOP + 68, 26, 1);
    // Bolt plates along the beam.
    for (let by = BAND_TOP + 12; by < BAND_TOP + 64; by += 26) {
      ctx.fillStyle = DATA_PALETTE.structureLit;
      ctx.fillRect(x + 8, by, 10, 4);
    }
  }

  // Two cable trays crossing the band, with stepped cable runs beneath them.
  for (const [ty, thick] of [[BAND_TOP + 26, 10], [BAND_TOP + 88, 8]] as const) {
    drawConduit(ctx, 0, ty, W, thick, { flow: false, dim: true });
    const pitch = 64;
    for (let x = 24; x < W; x += pitch) {
      const sag = Math.floor(hash(x, ty) * 10);
      ctx.fillStyle = DATA_PALETTE.structureLit;
      // Stepped catenary, so the cable stays on the pixel grid.
      for (let s = 0; s <= sag; s += 2) {
        ctx.fillRect(x + s, ty + thick + s, 1, 1);
      }
    }
  }

  /*
   * Vertical risers dropping through the band toward the midground conduit runs.
   * These are the structures that make the upper space read as a facility rather
   * than as empty black with a beam across it. They start at the band top and
   * terminate just above the thickest midground run, so they visibly CONNECT the
   * two layers instead of hanging in nothing.
   */
  for (let r = 0; r < 22; r += 1) {
    const rx = 80 + r * 176 + Math.floor(hash(r, 11) * 70);
    if (rx > W - 40) break;
    const thick = 12 + Math.floor(hash(r, 12) * 10);
    // Drop to a fixed terminus just above the 40px run at y=424.
    const length = 424 - (BAND_TOP + 12) + Math.floor(hash(r, 13) * 26);
    drawVerticalConduit(ctx, rx, BAND_TOP + 12, length, thick, {
      flow: hash(r, 14) > 0.72,
      dim: true,
    });
    // Flange where the riser meets its horizontal run.
    ctx.fillStyle = DATA_PALETTE.structureLit;
    ctx.fillRect(rx - 3, BAND_TOP + 12 + length, thick + 6, 7);
    ctx.fillStyle = DATA_PALETTE.metal;
    ctx.fillRect(rx - 3, BAND_TOP + 12 + length, thick + 6, 1);
  }

  /*
   * Distant plant lights strung through the band. These are the "distant lights"
   * that give the upper space scale and stop it reading as flat black.
   */
  for (let l = 0; l < 40; l += 1) {
    const lx = 40 + l * 98 + Math.floor(hash(l, 21) * 40);
    if (lx > W - 20) break;
    const ly = BAND_TOP + 60 + Math.floor(hash(l, 22) * 150);
    if (ly > 540) continue;
    ctx.fillStyle = DATA_PALETTE.structureDark;
    ctx.fillRect(lx - 4, ly - 2, 18, 5);
    ctx.fillStyle = DATA_PALETTE.signalDim;
    ctx.fillRect(lx, ly, 10, 1);
    if (hash(l, 23) > 0.66) {
      ctx.fillStyle = DATA_PALETTE.signal;
      ctx.fillRect(lx + 2, ly, 3, 1);
    }
  }

  finish(ctx);
};

/* ------------------------------------------------------------------ *
 * Layer 1 — far background: towers, distant runs, depth haze
 * ------------------------------------------------------------------ */

/**
 * The far layer: silhouetted data-centre towers behind a haze, with distant
 * conduit runs crossing them.
 *
 * Towers vary in height and width from a hash of their index, and each carries a
 * sparse scatter of lit windows — the "distant lights" that give the layer its
 * scale. Window colour is dim cyan, never white, so it stays subordinate to the
 * midground.
 */
export const drawFarSkyline = (
  scene: Phaser.Scene,
  config: FacilityArtConfig,
): void => {
  const key = `facility-far-${config.worldWidth}-${config.groundY}`;
  const ctx = /*
     * Sized to `groundY`, matching the strip that consumes it (see
     * `buildParallaxLayer`). A `worldHeight`-tall texture put 340 rows of opaque
     * sub-floor fill below the floor line: never seen, but allocated and blitted
     * every frame, and it covered the ceiling layer's transparent region.
     */
    canvasTexture(scene, key, config.worldWidth, config.groundY);
  if (!ctx) return;

  const { worldWidth: W, groundY } = config;

  // Depth haze at the base of the towers: a dithered fade so the layer has a
  // floor instead of sitting on a hard line.
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(0, 0, W, groundY);

  let x = 0;
  let i = 0;
  while (x < W) {
    const width = 40 + Math.floor(hash(i, 1) * 70);
    const height = 90 + Math.floor(hash(i, 2) * 230);
    const top = groundY - 40 - height;

    // Tower body in the darkest structural tone: this layer must never
    // compete with the platforms the player stands on.
    ctx.fillStyle = DATA_PALETTE.structureDark;
    ctx.fillRect(x, top, width, height + 40);

    // A one-pixel lit edge on the right of each tower gives the silhouette a
    // consistent light direction across the whole skyline.
    ctx.fillStyle = DATA_PALETTE.structureMid;
    ctx.fillRect(x + width - 1, top, 1, height + 40);

    // Sparse lit windows.
    const cols = Math.max(1, Math.floor(width / 14));
    const rows = Math.max(1, Math.floor(height / 18));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        const seed = hash(i * 97 + c * 13 + r * 7, 3);
        if (seed < 0.82) continue;
        ctx.fillStyle = seed > 0.94 ? DATA_PALETTE.signal : DATA_PALETTE.signalDim;
        ctx.fillRect(x + 4 + c * 14, top + 6 + r * 18, 3, 4);
      }
    }

    // Antenna mast on some towers.
    if (hash(i, 4) > 0.6) {
      ctx.fillStyle = DATA_PALETTE.structureMid;
      ctx.fillRect(x + Math.floor(width / 2), top - 18, 1, 18);
      ctx.fillStyle = DATA_PALETTE.signalDim;
      ctx.fillRect(x + Math.floor(width / 2), top - 20, 1, 2);
    }

    x += width + 8 + Math.floor(hash(i, 5) * 40);
    i += 1;
  }

  /*
   * Distant conduit runs crossing in front of the towers, dim and unlit.
   *
   * The towers above are anchored to `groundY`, so they land inside the visible
   * band on their own. These runs were not: at y=40/94/148 they sat above the top
   * of a camera that can only reach y=280, so the far layer's pipes were invisible
   * while the layer still paid for drawing them. They are now placed inside the
   * band, above the midground runs and below the tower tops, which is also where
   * distant infrastructure belongs visually.
   */
  for (let k = 0; k < 3; k += 1) {
    const y = 312 + k * 60 + Math.floor(hash(k, 11) * 20);
    const thickness = 6 + k * 2;
    drawConduit(ctx, 0, y, W, thickness, { dim: true });
    for (let cx = 120 + k * 200; cx < W; cx += 260) {
      drawCollar(ctx, cx, y, thickness);
    }
  }

  // Vertical risers linking the runs, so the network looks connected.
  for (let k = 0; k < 14; k += 1) {
    const vx = 60 + Math.floor(hash(k, 21) * (W - 120));
    const vy = 60 + Math.floor(hash(k, 22) * 120);
    drawVerticalConduit(ctx, vx, vy, 180 + Math.floor(hash(k, 23) * 120), 5, { dim: true });
  }

  finish(ctx);
};

/* ------------------------------------------------------------------ *
 * Layer 2 — midground: large conduits, gantries, machinery
 * ------------------------------------------------------------------ */

/**
 * The midground: the structures that make the world a facility.
 *
 * Three horizontal conduit runs at different heights and thicknesses, each with
 * collars, plus gantry frames that cross them. This layer carries the cyan flow
 * lines, because it is the layer that says "data is moving through here".
 */
export const drawMidground = (scene: Phaser.Scene, config: FacilityArtConfig): void => {
  const key = `facility-mid-${config.worldWidth}-${config.groundY}`;
  const ctx = /*
     * Sized to `groundY`, matching the strip that consumes it (see
     * `buildParallaxLayer`). A `worldHeight`-tall texture put 340 rows of opaque
     * sub-floor fill below the floor line: never seen, but allocated and blitted
     * every frame, and it covered the ceiling layer's transparent region.
     */
    canvasTexture(scene, key, config.worldWidth, config.groundY);
  if (!ctx) return;

  const { worldWidth: W, groundY } = config;

  /*
   * FIVE conduit runs, and every one of them THICKER than before.
   *
   * Measured failure this fixes: at 1x zoom a 20px conduit occupied 3.8% of
   * viewport height and read as a hairline, which is what made the world look
   * like a wireframe demo rather than a facility full of pipes. The camera now
   * zooms to 2x (see CAMERA in worldConfig), and the run thicknesses are scaled
   * to match: the thickest is now 40px, which is 40% of the 100px of world height
   * the camera actually shows. A pipe that fills half the visible height cannot
   * be mistaken for a line.
   *
   * Heights are spaced so the runs never merge into one undifferentiated mass,
   * and the thickest sits lowest where it reads against the floor lip.
   */
  /*
   * POSITIONED AGAINST THE VISIBLE BAND, NOT AGAINST `groundY`.
   *
   * Measured first, then placed. At 2x zoom the camera shows 261 world px and
   * `verticalBias: 150` frames y=280..541. Expressing the runs as fractions of
   * `groundY` put three of the five — including the 40px one — above the top of
   * the screen, where they were correctly drawn and completely invisible. A
   * structure that is off-camera is worth exactly nothing, so these are absolute
   * world y values chosen to sit inside the band, and the comment states the band
   * so the next person does not re-introduce the fraction.
   *
   * Vertical spread, deliberately uneven: a 62px gap between the first two reads
   * as separate services, while the lower pair sit close enough to read as one
   * bundled main running behind the floor line.
   */
  const runs = [
    { y: 312, thickness: 16, flow: true },
    { y: 360, thickness: 24, flow: true },
    { y: 424, thickness: 40, flow: true },
    { y: 478, thickness: 22, flow: false },
    { y: 520, thickness: 14, flow: false },
  ];

  for (const [index, run] of runs.entries()) {
    drawConduit(ctx, 0, run.y, W, run.thickness, { flow: run.flow });
    // Collars every 180px, offset per run so they do not line up vertically.
    // Collar width scales with the run so a thick pipe gets a heavy joint.
    const collarW = Math.max(5, Math.round(run.thickness * 0.28));
    for (let cx = 90 + index * 60; cx < W; cx += 180) {
      drawCollar(ctx, cx, run.y, run.thickness, collarW);
    }
    // Support brackets dropping from each collar to the next structure down.
    if (index < runs.length - 1) {
      const next = runs[index + 1];
      for (let cx = 90 + index * 60; cx < W; cx += 180) {
        ctx.fillStyle = DATA_PALETTE.structureLit;
        ctx.fillRect(cx + 1, run.y + run.thickness, 4, next.y - (run.y + run.thickness));
        // A gusset where the bracket meets the run below it.
        ctx.fillStyle = DATA_PALETTE.metal;
        ctx.fillRect(cx + 1, next.y - 3, 10, 3);
      }
    }
  }

  /*
   * Elbows and junctions — the difference between "pipes" and "plumbing".
   *
   * Five parallel straight runs across 3840px read as repeating wallpaper no
   * matter how thick they are, because a real facility's pipes turn, drop and
   * merge. Elbows hang off the upper runs and junction boxes sit where runs
   * cross, so the eye can trace a path through the network instead of reading
   * five stripes.
   */
  for (let e = 0; e < 14; e += 1) {
    const ex = 120 + e * 268 + Math.floor(hash(e, 41) * 90);
    if (ex > W - 120) break;
    const run = runs[1 + (e % 2)];
    const thick = run.thickness;
    const downward = hash(e, 42) > 0.5;
    drawElbow(ctx, ex, run.y, thick, downward ? 'down' : 'up', 70 + Math.floor(hash(e, 43) * 60));
    // Flange plate on the bend.
    ctx.fillStyle = DATA_PALETTE.structureLit;
    ctx.fillRect(ex - 3, run.y - 3, thick + 6, thick + 6);
    ctx.fillStyle = DATA_PALETTE.metal;
    ctx.fillRect(ex - 3, run.y - 3, thick + 6, 2);
  }

  for (let j = 0; j < 10; j += 1) {
    const jx = 220 + j * 380 + Math.floor(hash(j, 44) * 110);
    if (jx > W - 60) break;
    const jy = runs[2].y + runs[2].thickness + 14;
    drawJunction(ctx, jx, jy, 34);
    // Short drop tying the junction back into the run above it.
    drawVerticalConduit(ctx, jx + 13, runs[2].y + runs[2].thickness, 14, 8, { flow: true });
  }

  // Gantry frames: squared-off portal structures. These are the "large
  // environmental structures" that stop the background reading as wallpaper.
  for (let g = 0; g < 7; g += 1) {
    const gx = 140 + g * 250 + Math.floor(hash(g, 31) * 60);
    if (gx > W - 80) break;
    /*
     * Gantry posts span from just above the topmost visible run down to the floor.
     * The old `groundY * 0.18` (y=101) put the cross beam far above the visible
     * band, so the gantries read as bare vertical bars with no visible beam — the
     * lattice that was supposed to make them read as portal structures was off
     * screen. 268 is inside the 280..541 band and above every conduit run.
     *
     * Re-banded to 300: with the first conduit run moved to y=312, a beam at 268
     * sat above the top of the authored band and was cut off by the frame edge. A
     * gantry whose cross beam is clipped reads as a plain vertical post, which is
     * exactly what the lattice exists to prevent.
     */
    const top = 300;
    const bottom = groundY;
    const post = 10;

    ctx.fillStyle = DATA_PALETTE.structureLit;
    ctx.fillRect(gx, top, post, bottom - top);
    ctx.fillStyle = DATA_PALETTE.metal;
    ctx.fillRect(gx, top, 2, bottom - top);
    ctx.fillRect(gx + post - 2, top, 2, bottom - top);

    const right = gx + 150;
    ctx.fillStyle = DATA_PALETTE.structureLit;
    ctx.fillRect(right, top, post, bottom - top);
    ctx.fillStyle = DATA_PALETTE.metal;
    ctx.fillRect(right, top, 2, bottom - top);
    ctx.fillRect(right + post - 2, top, 2, bottom - top);

    // Cross beam with lattice.
    ctx.fillStyle = DATA_PALETTE.structureMid;
    ctx.fillRect(gx, top, right + post - gx, 12);
    ctx.fillStyle = DATA_PALETTE.structureLit;
    ctx.fillRect(gx, top, right + post - gx, 2);
    for (let lx = gx + 10; lx < right; lx += 22) {
      ctx.fillStyle = DATA_PALETTE.structureDark;
      ctx.fillRect(lx, top + 2, 12, 10);
      ctx.fillStyle = DATA_PALETTE.signalDim;
      ctx.fillRect(lx, top + 6, 12, 1);
    }

    // Machinery block clamped to one post, with a lit indicator.
    if (hash(g, 32) > 0.5) {
      const bx = gx + post;
      const by = 406; // inside the visible band; a `groundY * 0.62` fraction landed on a run
      ctx.fillStyle = DATA_PALETTE.structureLit;
      ctx.fillRect(bx, by, 34, 26);
      ctx.fillStyle = DATA_PALETTE.metalLit;
      ctx.fillRect(bx, by, 34, 2);
      ctx.fillStyle = DATA_PALETTE.voidBlack;
      ctx.fillRect(bx + 4, by + 6, 26, 12);
      ctx.fillStyle = DATA_PALETTE.signal;
      ctx.fillRect(bx + 7, by + 10, 12, 2);
      ctx.fillRect(bx + 7, by + 14, 7, 2);
      ctx.fillStyle = DATA_PALETTE.signalBright;
      ctx.fillRect(bx + 26, by + 8, 2, 2);
    }
  }

  /*
   * No fill below the floor line any more.
   *
   * This used to paint `structureDark` over `(0, groundY, W, worldHeight - groundY)`
   * so the floor would sit on something solid. But the texture is now sized to
   * `groundY` (see the `canvasTexture` call above), so that rectangle has zero
   * height and silently became a no-op — while the sub-floor slab in the scene
   * (`drawSubFloor`) now provides the solid ground surface. Removing it keeps the
   * layer honest: everything this texture draws is something meant to be seen.
   */

  finish(ctx);
};

/* ------------------------------------------------------------------ *
 * Sub-floor: the visible band of structure beneath the walkable surface
 * ------------------------------------------------------------------ */

/**
 * How deep the drawn sub-floor is, in world px.
 *
 * The camera's lower clamp stops 18px below `GROUND_Y` (see `CAMERA.floorMargin`),
 * so nothing below roughly 74px is ever on screen. The slab is capped to this so
 * the rest of the 340px between the floor and the bottom of a 900px world is not
 * allocated, drawn and depth-sorted for nobody.
 */
export const SUB_FLOOR_DEPTH = 56;

/**
 * The sub-floor slab, with ribs, seams and a conduit run along its face.
 *
 * WHY THIS IS A TEXTURE AND NOT A FLAT RECTANGLE
 *
 * The floor was `this.add.rectangle(..., palette.ground)` — one flat `#1a2230`
 * fill spanning the full world width. A pixel sample of the rendered frame found
 * it to be the single largest object on screen and a major reason the scene read
 * as empty: 66% of scanlines contained exactly one distinct colour.
 *
 * A large flat area reads as unfinished no matter how good the rest of the scene
 * is, so the slab now carries the same visual grammar as everything else: a lit
 * upper edge where it meets the walkable surface, structural ribs at a regular
 * pitch, vertical seams between bays, a horizontal seam line, and a dim cyan
 * conduit with lit segments running the length of the facility.
 *
 * The texture holds ONE 64px bay, not the whole world width, and the scene tiles
 * it across the slab — so every feature is placed on that 64px grid to repeat
 * seamlessly. `depth` is the only parameter because the bay width is fixed.
 */
export const drawSubFloor = (scene: Phaser.Scene, depth: number): void => {
  const key = `data-subfloor-${depth}`;
  if (scene.textures.exists(key)) return;

  /*
   * One 64px bay, tiled. Drawing the whole world width instead would allocate a
   * 3840x56 texture for 56 rows of content; the repeat is identical.
   */
  const BAY = 64;
  const texture = scene.textures.createCanvas(key, BAY, depth);
  if (!texture) return;
  const ctx = texture.getContext();
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  // Base slab.
  ctx.fillStyle = DATA_PALETTE.structureMid;
  ctx.fillRect(0, 0, BAY, depth);

  // Lit upper edge, matching the walkable surface rim above it.
  ctx.fillStyle = DATA_PALETTE.structureLit;
  ctx.fillRect(0, 0, BAY, 2);

  // Vertical bay seams, with a lit edge so each bay reads as a separate casting.
  ctx.fillStyle = DATA_PALETTE.structureDark;
  ctx.fillRect(0, 4, 2, depth - 4);
  ctx.fillStyle = DATA_PALETTE.metal;
  ctx.fillRect(2, 4, 1, depth - 6);

  // Horizontal seam across the bay.
  ctx.fillStyle = DATA_PALETTE.structureDark;
  ctx.fillRect(0, Math.floor(depth * 0.58), BAY, 2);

  // Structural ribs on a regular pitch.
  for (let rx = 10; rx < BAY - 4; rx += 22) {
    ctx.fillStyle = DATA_PALETTE.structureLit;
    ctx.fillRect(rx, 8, 6, depth - 12);
    ctx.fillStyle = DATA_PALETTE.voidBlack;
    ctx.fillRect(rx + 2, 12, 2, depth - 20);
  }

  /*
   * A dim conduit with a lit segment. This is the detail that stops the slab
   * reading as a plain rectangle: it gives the eye a horizontal line to follow
   * and echoes the pipe language used everywhere above.
   */
  const cy = Math.floor(depth * 0.58) - 8;
  ctx.fillStyle = DATA_PALETTE.signalDim;
  ctx.fillRect(4, cy, BAY - 8, 2);
  ctx.fillStyle = DATA_PALETTE.signal;
  ctx.fillRect(8, cy, 10, 2);

  texture.refresh();
};

/* ------------------------------------------------------------------ *
 * Foreground structure: the floor the player actually walks on
 * ------------------------------------------------------------------ */

/**
 * A drawn platform slab, with a lit top edge, structural ribs underneath, and
 * cyan conduit running along its face.
 *
 * Physics is NOT here — the scene creates collision rectangles from config.
 * This is decoration that agrees with those rectangles. `lipColor` lets a
 * platform read as an interactive station rather than as plain floor.
 */
export const drawPlatformSlab = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { lipColor?: string; accent?: boolean } = {},
): void => {
  const { lipColor = DATA_PALETTE.signal, accent = false } = options;

  ctx.fillStyle = DATA_PALETTE.structureMid;
  ctx.fillRect(x, y, width, height);

  // Lit top surface, two pixels: the pixel rim that makes a landing plane
  // unambiguous at a glance.
  ctx.fillStyle = accent ? lipColor : DATA_PALETTE.metalLit;
  ctx.fillRect(x, y, width, 2);

  // Ribs under the slab.
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  for (let rx = x + 6; rx < x + width - 4; rx += 16) {
    ctx.fillRect(rx, y + 3, 4, Math.max(1, height - 5));
  }

  // Conduit stripe along the face.
  if (accent) {
    ctx.fillStyle = DATA_PALETTE.signalDim;
    ctx.fillRect(x + 2, y + Math.floor(height / 2), Math.max(0, width - 4), 1);
    ctx.fillStyle = DATA_PALETTE.signal;
    for (let cx = x + 6; cx < x + width - 6; cx += 16) {
      ctx.fillRect(cx, y + Math.floor(height / 2), 6, 1);
    }
  }
};

export interface SignArtOptions {
  /** Text on the sign. Kept short on purpose. */
  text: string;
  /** Sign width in pixels. */
  width: number;
  /** Sign height in pixels. */
  height: number;
  /** Text colour. */
  colour?: string;
  /** Draw an arrow at the right edge. */
  arrow?: boolean;
  /** Draw a post under the sign. */
  post?: boolean;
  /** Total texture height, when a post is drawn below the board. */
  textureHeight?: number;
}

/**
 * A standing sign board: dark panel, cyan border, pixel text, optional arrow and
 * post. Used for "JUMP TO START" and the chapter markers.
 *
 * The post is drawn into the same texture below the board rather than as a
 * separate sprite, so the whole sign is one object with one depth and one
 * origin — no chance of the post and the board separating when the camera moves.
 */
export const drawSignBoard = (
  ctx: CanvasRenderingContext2D,
  options: SignArtOptions,
): void => {
  const {
    text,
    width,
    height,
    colour = DATA_PALETTE.signalBright,
    arrow = false,
    post = true,
    textureHeight = height,
  } = options;

  const boardY = 0;
  const postHeight = post ? Math.max(0, textureHeight - height) : 0;

  // Post first, so the board overlaps its top.
  if (post && postHeight > 0) {
    const postW = 4;
    const postX = Math.floor(width / 2 - postW / 2);
    ctx.fillStyle = DATA_PALETTE.structureLit;
    ctx.fillRect(postX, height - 1, postW, postHeight + 1);
    ctx.fillStyle = DATA_PALETTE.metal;
    ctx.fillRect(postX, height - 1, 2, postHeight + 1);
  }

  // Board.
  ctx.fillStyle = DATA_PALETTE.structureDark;
  ctx.fillRect(0, boardY, width, height);
  ctx.fillStyle = DATA_PALETTE.signalDim;
  ctx.fillRect(0, boardY, width, 1);
  ctx.fillRect(0, boardY + height - 1, width, 1);
  ctx.fillRect(0, boardY, 1, height);
  ctx.fillRect(width - 1, boardY, 1, height);

  // Inner cyan rule, inset by 3, so the panel has a frame rather than a border.
  ctx.fillStyle = DATA_PALETTE.signal;
  ctx.fillRect(3, 3, width - 6, 1);
  ctx.fillRect(3, height - 4, width - 6, 1);

  // Text, vertically centred in the board.
  const scale = 1;
  const textH = GLYPH_H * scale;
  const textY = boardY + Math.floor((height - textH) / 2);
  stampPixelTextCentred(ctx, width / 2, textY, text, colour, scale);

  // Arrow: a three-step chevron in signal colour.
  if (arrow) {
    const ax = width - 14;
    const ay = boardY + Math.floor(height / 2);
    ctx.fillStyle = DATA_PALETTE.signalBright;
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(ax + i, ay - 3 + i, 2, 1);
      ctx.fillRect(ax + i, ay + 3 - i, 2, 1);
    }
  }
};