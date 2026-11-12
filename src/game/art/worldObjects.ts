/**
 * World objects: skill stations, project stations, and the transport pipe.
 *
 * All procedural, all drawn from the shared palette in `facilityArt`. The
 * governing idea is that a skill and a project are the SAME kind of object at
 * two different scales and levels of importance — a skill is a terminal bolted
 * to the wall, a project is a larger, freestanding station with its own screen.
 * That way the world reads as one facility instead of a menu with sprites.
 */

import {
  DATA_PALETTE,
  drawCollar,
  drawConduit,
  drawVerticalConduit,
  stampPixelText,
  stampPixelTextCentred,
  wrapPixelText,
  GLYPH_H,
} from './facilityArt';

/* ------------------------------------------------------------------ *
 * Skill station — the small terminal the player walks up to
 * ------------------------------------------------------------------ */

export interface SkillStationArt {
  /** Full label, e.g. "SQL / T-SQL". Drawn small under the title. */
  label: string;
  /** Short tag stamped on the screen face. */
  tag: string;
}

/**
 * A skill station: a floor-mounted pedestal with an angled screen.
 *
 * `proximity` (0..1) is baked into a SEPARATE texture rather than applied as a
 * tint or a scale on the live object. Two reasons: a tint would wash the pixel
 * palette toward the accent colour, and an animated scale would fight the
 * pixel grid. Swapping to a pre-drawn "lit" texture keeps every pixel exactly
 * where the artist put it, and makes the highlight identical for every visitor
 * and every test run.
 */
export const drawSkillStation = (
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  art: SkillStationArt,
  proximity: boolean,
): void => {
  const W = size.width;
  const H = size.height;
  const baseY = H - 1;

  // Pedestal body.
  ctx.fillStyle = proximity ? DATA_PALETTE.structureLit : DATA_PALETTE.structureMid;
  ctx.fillRect(Math.floor(W / 2) - 16, baseY - 14, 32, 14);
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(Math.floor(W / 2) - 16, baseY - 14, 32, 1);
  ctx.fillStyle = DATA_PALETTE.metal;
  ctx.fillRect(Math.floor(W / 2) - 16, baseY - 13, 2, 12);
  ctx.fillRect(Math.floor(W / 2) + 14, baseY - 13, 2, 12);

  // Base flare, so it sits on the floor rather than floating.
  ctx.fillStyle = proximity ? DATA_PALETTE.signal : DATA_PALETTE.structureLit;
  ctx.fillRect(Math.floor(W / 2) - 20, baseY - 3, 40, 3);

  // Housing: a chunky monitor block above the pedestal.
  const boxX = Math.floor(W / 2) - 24;
  const boxY = baseY - 46;
  const boxW = 48;
  const boxH = 34;
  ctx.fillStyle = DATA_PALETTE.structureMid;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = DATA_PALETTE.metalLit;
  ctx.fillRect(boxX, boxY, boxW, 2);
  ctx.fillStyle = proximity ? DATA_PALETTE.signal : DATA_PALETTE.structureDark;
  ctx.fillRect(boxX, boxY + boxH - 2, boxW, 2);
  ctx.fillStyle = DATA_PALETTE.metal;
  ctx.fillRect(boxX, boxY, 2, boxH);
  ctx.fillRect(boxX + boxW - 2, boxY, 2, boxH);

  // Screen: black when idle, cyan-lit when the player is close. This is the
  // single clearest "you can interact with me" signal in the world.
  const scrX = boxX + 4;
  const scrY = boxY + 4;
  const scrW = boxW - 8;
  const scrH = boxH - 10;
  ctx.fillStyle = DATA_PALETTE.voidBlack;
  ctx.fillRect(scrX, scrY, scrW, scrH);
  if (proximity) {
    ctx.fillStyle = DATA_PALETTE.signalDim;
    ctx.fillRect(scrX, scrY, scrW, scrH);
    ctx.fillStyle = DATA_PALETTE.signal;
    ctx.fillRect(scrX, scrY + scrH - 1, scrW, 1);
    // Scanning rule: a single lit line, positioned statically so a
    // reduced-motion visitor sees the identical frame.
    ctx.fillStyle = DATA_PALETTE.signalBright;
    ctx.fillRect(scrX + 2, scrY + Math.floor(scrH / 2), scrW - 4, 1);
  }

  // Tag on the screen face.
  stampPixelTextCentred(
    ctx,
    Math.floor(W / 2),
    proximity ? scrY + 4 : scrY + Math.floor((scrH - GLYPH_H) / 2),
    art.tag,
    proximity ? DATA_PALETTE.text : DATA_PALETTE.signalDim,
    1,
  );

  // Label plate under the housing.
  const plateW = art.label.length * 6 + 8;
  const plateX = Math.floor(W / 2 - plateW / 2);
  ctx.fillStyle = DATA_PALETTE.structureDark;
  ctx.fillRect(plateX, baseY - 9, plateW, 9);
  ctx.fillStyle = proximity ? DATA_PALETTE.signal : DATA_PALETTE.structureLit;
  ctx.fillRect(plateX, baseY - 9, plateW, 1);
  stampPixelTextCentred(
    ctx,
    Math.floor(W / 2),
    baseY - 8,
    art.label.toUpperCase(),
    proximity ? DATA_PALETTE.text : DATA_PALETTE.textDim,
    1,
  );
};

/* ------------------------------------------------------------------ *
 * Project station — the larger, more important object
 * ------------------------------------------------------------------ */

/**
 * A project station: a wide console on a raised dais, with a banner sign above.
 *
 * Deliberately larger and more architectural than a skill station so the
 * Projects area reads as more important than Skills without needing a label to
 * say so.
 */
export const drawProjectStation = (
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  art: { title: string; stageCount: number },
  proximity: boolean,
): void => {
  const W = size.width;
  const H = size.height;
  const baseY = H - 1;

  // Dais: three stepped tiers, so the station has mass at its base.
  for (let tier = 0; tier < 3; tier += 1) {
    const inset = tier * 8;
    ctx.fillStyle = tier === 0 ? DATA_PALETTE.structureLit : DATA_PALETTE.structureMid;
    ctx.fillRect(8 + inset, baseY - 6 - tier * 5, W - 16 - inset * 2, 6);
    ctx.fillStyle = DATA_PALETTE.metal;
    ctx.fillRect(8 + inset, baseY - 6 - tier * 5, W - 16 - inset * 2, 1);
  }

  // Console body.
  const bodyX = Math.floor(W / 2) - 40;
  const bodyY = baseY - 48;
  const bodyW = 80;
  const bodyH = 34;
  ctx.fillStyle = DATA_PALETTE.structureMid;
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
  ctx.fillStyle = proximity ? DATA_PALETTE.signal : DATA_PALETTE.metalLit;
  ctx.fillRect(bodyX, bodyY, bodyW, 2);
  ctx.fillStyle = DATA_PALETTE.metal;
  ctx.fillRect(bodyX, bodyY, 2, bodyH);
  ctx.fillRect(bodyX + bodyW - 2, bodyY, 2, bodyH);
  ctx.fillStyle = proximity ? DATA_PALETTE.signalDim : DATA_PALETTE.structureDark;
  ctx.fillRect(bodyX, bodyY + bodyH - 2, bodyW, 2);

  // Screens: three panels, one per pipeline stage shown in the content model.
  const panels = 3;
  const gap = 4;
  const panelW = Math.floor((bodyW - 8 - gap * (panels - 1)) / panels);
  for (let p = 0; p < panels; p += 1) {
    const px = bodyX + 4 + p * (panelW + gap);
    ctx.fillStyle = DATA_PALETTE.voidBlack;
    ctx.fillRect(px, bodyY + 5, panelW, bodyH - 12);
    if (proximity) {
      ctx.fillStyle = DATA_PALETTE.signalDim;
      ctx.fillRect(px + 1, bodyY + 6, panelW - 2, bodyH - 14);
      ctx.fillStyle = DATA_PALETTE.signal;
      // A bar per panel: reads as "this stage has data" at pixel size.
      const barH = 3 + ((p * 5) % 7);
      ctx.fillRect(px + 3, bodyY + bodyH - 8 - barH, panelW - 6, barH);
    } else {
      ctx.fillStyle = DATA_PALETTE.structureLit;
      ctx.fillRect(px + 2, bodyY + bodyH - 8, panelW - 4, 1);
    }
  }

  // Banner sign above the console, on two posts.
  const bannerW = Math.min(W - 24, art.title.length * 6 + 20);
  const bannerX = Math.floor(W / 2 - bannerW / 2);
  const bannerY = 4;
  const bannerH = 22;
  ctx.fillStyle = DATA_PALETTE.structureLit;
  ctx.fillRect(bannerX + 8, bannerY + bannerH, 4, bodyY - bannerY - bannerH);
  ctx.fillRect(bannerX + bannerW - 12, bannerY + bannerH, 4, bodyY - bannerY - bannerH);

  ctx.fillStyle = DATA_PALETTE.structureDark;
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  ctx.fillStyle = proximity ? DATA_PALETTE.signalBright : DATA_PALETTE.signalDim;
  ctx.fillRect(bannerX, bannerY, bannerW, 1);
  ctx.fillRect(bannerX, bannerY + bannerH - 1, bannerW, 1);
  ctx.fillRect(bannerX, bannerY, 1, bannerH);
  ctx.fillRect(bannerX + bannerW - 1, bannerY, 1, bannerH);

  // Title, wrapped onto at most two lines so a long project name still fits.
  const maxChars = Math.max(6, Math.floor((bannerW - 12) / 6));
  const lines = wrapPixelText(art.title.toUpperCase(), maxChars).slice(0, 2);
  const startY = bannerY + Math.floor((bannerH - lines.length * (GLYPH_H + 1)) / 2);
  lines.forEach((line, index) => {
    stampPixelTextCentred(
      ctx,
      Math.floor(W / 2),
      startY + index * (GLYPH_H + 1),
      line,
      proximity ? DATA_PALETTE.text : DATA_PALETTE.textDim,
      1,
    );
  });
};

/* ------------------------------------------------------------------ *
 * The transport pipe — the chapter-transition mechanic
 * ------------------------------------------------------------------ */

/**
 * A transport pipe mouth, drawn as a squared industrial conduit end-cap.
 *
 * The reference is a futuristic conduit, so this is a rectangular portal with
 * a bright inner glow, not a rounded sewer mouth. The interior is drawn as a
 * short run of nested frames, because that is what reads as a tunnel the
 * player can fall into rather than a hole in the wall.
 */
/**
 * The Data Transport Tube — drawn from the supplied reference.
 *
 * WHAT CHANGED AND WHY
 *
 * The previous tube was a wide, squat housing with nested receding frames and
 * corner bolts. It read as a piece of plumbing set into a wall: a dark cavity
 * with a bright slot in the middle. The reference is the opposite — a TALL,
 * NARROW, upright rectangular column with a heavy black outline, a light-blue
 * cap, and a saturated blue interior carrying a single vertical cyan highlight.
 * It is a data conduit you step into, not a drain.
 *
 * THE REFERENCE PALETTE, USED AS GIVEN
 *
 *     outline   #000000   2px, wrapping the whole form
 *     cap       #66CCFF   2px band inside the top rim
 *     body      #0066CC   the interior field
 *     highlight #88E0FF   2px vertical stripe on the left interior wall
 *
 * These are brighter and more saturated than the surrounding facility, and that
 * is deliberate: the tube is the one object a visitor must be able to identify
 * from across the screen, so it carries its own palette rather than borrowing
 * the facility greys. The cyan glow states modulate THESE values instead of
 * introducing new ones.
 *
 * GEOMETRY
 *
 * Proportions follow the reference's roughly 4:5 height-to-width. The mouth is
 * drawn as a vertical column: cap, then a black-rimmed opening whose interior
 * is a blue field with the highlight stripe down its left wall. The interior
 * darkens toward the bottom so the column reads as receding into the floor
 * rather than as a flat blue rectangle.
 */
export const drawPipeMouth = (
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  /** 0 = dormant, 1 = fully lit. Drives cap brightness and interior glow. */
  energy: number = 0,
): void => {
  const W = Math.max(12, Math.round(size.width));
  const H = Math.max(16, Math.round(size.height));

  const OUTLINE = '#000000';
  const CAP = '#66CCFF';
  const BODY = '#0066CC';
  const HIGHLIGHT = '#88E0FF';

  /** Blend toward white as `energy` rises, so activation brightens the cap. */
  const lit = (hex: string, amount: number): string => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const mix = (c: number) => Math.round(c + (255 - c) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  };

  const e = Math.max(0, Math.min(1, energy));

  /*
   * OPENING AT THE TOP — this is a ground-level entrance, not a wall column.
   *
   * A thin dark rim defines the hole without closing it. The interior recedes
   * downward from that rim, getting darker toward the bottom (below ground),
   * and the highlight runs down the left wall from the opening.
   */
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(0, 0, W, 1); // top rim
  ctx.fillRect(0, 0, 1, H); // left bar
  ctx.fillRect(W - 1, 0, 1, H); // right bar

  // --- INTERIOR: fills from just below the rim downward -------------------
  const innerX = 1;
  const innerY = 1;
  const innerW = W - 2;
  const innerH = H - 1;
  ctx.fillStyle = lit(BODY, e * 0.30);
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // Darker toward the bottom: the tube recedes below ground.
  const shadeH = Math.max(2, Math.floor(innerH * 0.55));
  const grad = ctx.createLinearGradient(0, innerY, 0, innerY + shadeH);
  grad.addColorStop(0, 'rgba(0, 30, 80, 0)');
  grad.addColorStop(1, 'rgba(0, 20, 60, 0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(innerX, innerY, innerW, shadeH);

  // --- HIGHLIGHT: vertical stripe on the left interior wall, from rim down ---
  const hlH = Math.max(2, Math.floor(innerH * 0.70));
  ctx.fillStyle = lit(HIGHLIGHT, e * 0.5);
  ctx.fillRect(innerX + 1, innerY, 2, hlH);

  // A thin brighter core line inside the highlight.
  ctx.fillStyle = `rgba(220, 250, 255, ${0.35 + e * 0.45})`;
  ctx.fillRect(innerX + 1, innerY, 1, hlH);

  // --- SIDE WALL SHADOW: darker on the right interior edge -----------------
  ctx.fillStyle = 'rgba(0, 20, 70, 0.55)';
  ctx.fillRect(innerX + innerW - 2, innerY, 2, innerH);

  // --- DATA STREAKS: subtle vertical energy movement when active ----------
  if (e > 0.05) {
    ctx.fillStyle = `rgba(180, 240, 255, ${0.16 + e * 0.30})`;
    const streak = Math.max(1, Math.floor(innerW / 6));
    for (let i = 0; i < 3; i += 1) {
      const sx = innerX + 3 + ((i * 7 + Math.round(e * 10)) % Math.max(1, innerW - 5));
      const sh = Math.max(3, Math.floor(innerH * 0.22));
      const sy = innerY + ((i * 11 + Math.round(e * 18)) % Math.max(1, innerH - sh));
      ctx.fillRect(sx, sy, streak, sh);
    }
  }

  // --- BOTTOM: dark closure below the interior ----------------------------
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(0, H - 2, W, 2);

  // A cyan underline at the bottom rim: the "powered" tell.
  ctx.fillStyle = lit(CAP, e * 0.6);
  ctx.fillRect(1, H - 3, W - 2, 1);
};


export const drawPipeRun = (
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
): void => {
  const W = size.width;
  const H = size.height;
  drawConduit(ctx, 0, 0, W, H, { flow: true });
  for (let cx = 60; cx < W; cx += 120) {
    drawCollar(ctx, cx, 0, H, 6);
  }
  // Support struts down to whatever is below.
  ctx.fillStyle = DATA_PALETTE.structureLit;
  for (let sx = 90; sx < W; sx += 240) {
    ctx.fillRect(sx, H, 5, 22);
  }
  drawVerticalConduit(ctx, W - 60, H, 22, 5, { dim: true });
};

/**
 * A chapter marker plate: a wide, low band naming the next area, mounted on the
 * wall above the pipe. Gives the pipe a stated destination so "enter the pipe"
 * reads as "go to Skills" rather than as an unexplained jump.
 */
export const drawChapterPlate = (
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  text: string,
): void => {
  const W = size.width;
  const H = size.height;
  ctx.fillStyle = DATA_PALETTE.structureDark;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = DATA_PALETTE.signalDim;
  ctx.fillRect(0, 0, W, 1);
  ctx.fillRect(0, H - 1, W, 1);
  ctx.fillStyle = DATA_PALETTE.signal;
  ctx.fillRect(2, 2, 4, 1);
  ctx.fillRect(W - 6, H - 3, 4, 1);
  stampPixelText(ctx, 6, Math.floor((H - GLYPH_H) / 2), text.toUpperCase(), DATA_PALETTE.text, 1);
};