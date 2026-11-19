/**
 * NEON DISTRICT — seeded procedural city artwork.
 * All generators are deterministic per chapter seed, so every reload
 * produces identical textures (required for screenshot-stable QA).
 */

import Phaser from 'phaser';

/** Constants inlined from worldConfig (not exported). */
const SUB_FLOOR_DEPTH = 56;

/** Neon palette used across layers (module scope for reuse). */
const NEON_COLS = ['#22d3ee', '#8b5cf6', '#ec4899', '#f97316', '#00e5ff', '#a855f7'];

/** Simple mulberry32 PRNG — fast, seeded, period 2^32. */
export const rng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
};

/** Stable 32-bit hash from string (djb2). */
export const hashStr = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
};

/** Chapter-specific seed = hash("neon:${chapter}:${worldWidth}"). */
export const chapterSeed = (chapterId: string, worldWidth: number): number =>
  hashStr(`neon:${chapterId}:${worldWidth}`);

/** Texture-key prefix for all neon layers. */
export const neonKey = (layer: string, chapter: string, w: number, h: number, extra = '') =>
  `neon-${layer}-${chapter}-${w}x${h}${extra ? `-${extra}` : ''}`;

/* ------------------------------------------------------------------ */
/* Sky (screen-fixed gradient + stars + moon glow)                     */
/* ------------------------------------------------------------------ */
export const makeSky = (
  scene: Phaser.Scene,
  camWidth: number,
  camHeight: number,
  chapter: string,
  worldWidth: number,
): string => {
  const key = neonKey('sky', chapter, camWidth, camHeight);
  if (scene.textures.exists(key)) return key;

  const seed = chapterSeed(chapter, worldWidth);
  const r = rng(seed + 1);
  const tex = scene.textures.createCanvas(key, camWidth, camHeight);
  if (!tex) return key;
  const ctx = tex.getContext();

  // Vertical gradient: #04060e (top) → #0b1226 (bottom)
  const grad = ctx.createLinearGradient(0, 0, 0, camHeight);
  grad.addColorStop(0, '#04060e');
  grad.addColorStop(1, '#0b1226');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, camWidth, camHeight);

  // Stars: sparse 1-2px dots, varying brightness
  const starCount = Math.floor(camWidth * camHeight / 35000);
  for (let i = 0; i < starCount; i++) {
    const x = r() * camWidth;
    const y = r() * camHeight;
    const sz = r() < 0.7 ? 1 : 2;
    const bright = 0.3 + r() * 0.7;
    ctx.fillStyle = `rgba(200,220,255,${bright})`;
    ctx.fillRect(x, y, sz, sz);
  }

  // Moon glow: soft radial blob
  const mx = camWidth * (0.78 + r() * 0.1);
  const my = camHeight * (0.12 + r() * 0.1);
  const mr = Math.max(camWidth, camHeight) * (0.18 + r() * 0.06);
  const moonGrad = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
  moonGrad.addColorStop(0, 'rgba(160,190,255,0.22)');
  moonGrad.addColorStop(0.5, 'rgba(100,140,220,0.08)');
  moonGrad.addColorStop(1, 'rgba(60,90,180,0)');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Far skyline — distant silhouettes, sparse windows, haze base       */
/* ------------------------------------------------------------------ */
export const makeFarSkyline = (
  scene: Phaser.Scene,
  chapter: string,
  worldWidth: number,
  groundY: number,
): string => {
  const key = neonKey('far', chapter, worldWidth, groundY);
  if (scene.textures.exists(key)) return key;

  const seed = chapterSeed(chapter, worldWidth);
  const r = rng(seed + 2);
  const h = groundY;
  const tex = scene.textures.createCanvas(key, worldWidth, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  // Haze band at base (y = groundY-100 .. groundY)
  const hazeGrad = ctx.createLinearGradient(0, h - 100, 0, h);
  hazeGrad.addColorStop(0, 'rgba(120,140,200,0)');
  hazeGrad.addColorStop(1, 'rgba(120,140,200,0.08)');
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, h - 100, worldWidth, 100);

  // Tower silhouettes — building blocks spaced across width
  const towerCount = Math.floor(worldWidth / 180) + 1;
  for (let i = 0; i < towerCount; i++) {
    const x = i * 180 + r() * 40;
    const w = 80 + r() * 60;
    const top = h - (120 + r() * 180); // tower height 120..300
    const col = '#0d1526';
    ctx.fillStyle = col;
    ctx.fillRect(x, top, w, h - top);

    // Sparse tiny lit windows (1-2px)
    const winCols = Math.floor(w / 12);
    for (let cx = 0; cx < winCols; cx++) {
      if (r() < 0.12) {
        const wx = x + 6 + cx * 12;
        const winRows = Math.floor((h - top) / 14);
        for (let cy = 0; cy < winRows; cy++) {
          if (r() < 0.08) {
            const wy = top + 8 + cy * 14;
            const bright = 0.3 + r() * 0.5;
            ctx.fillStyle = r() < 0.6
              ? `rgba(34,211,238,${bright})` // cyan
              : `rgba(251,191,36,${bright})`; // warm
            ctx.fillRect(wx, wy, 2, 2);
          }
        }
      }
    }
  }

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Mid skyline — closer towers, neon edge lights, beacons             */
/* ------------------------------------------------------------------ */
export const makeMidSkyline = (
  scene: Phaser.Scene,
  chapter: string,
  worldWidth: number,
  groundY: number,
): string => {
  const key = neonKey('midsky', chapter, worldWidth, groundY);
  if (scene.textures.exists(key)) return key;

  const seed = chapterSeed(chapter, worldWidth);
  const r = rng(seed + 3);
  const h = groundY;
  const tex = scene.textures.createCanvas(key, worldWidth, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  const towerCount = Math.floor(worldWidth / 140) + 1;
  const neonColors = ['#22d3ee', '#8b5cf6', '#ec4899', '#00e5ff', '#a855f7'];
  for (let i = 0; i < towerCount; i++) {
    const x = i * 140 + r() * 30;
    const w = 90 + r() * 70;
    const top = h - (180 + r() * 220);
    const bodyCol = r() < 0.5 ? '#131c33' : '#182238';
    ctx.fillStyle = bodyCol;
    ctx.fillRect(x, top, w, h - top);

    // Neon edge lines (roof + sides)
    const nc = neonColors[Math.floor(r() * neonColors.length)];
    ctx.strokeStyle = nc;
    ctx.lineWidth = 1.5;
    // Roof edge
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top);
    ctx.stroke();
    // Left/right verticals (partial)
    const vh = (h - top) * (0.3 + r() * 0.2);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + vh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w, top);
    ctx.lineTo(x + w, top + vh);
    ctx.stroke();

    // Beacon on some towers
    if (r() < 0.25) {
      const bx = x + w / 2;
      const by = top - 8;
      ctx.fillStyle = nc;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Window grid (more dense than far)
    const cols = Math.floor(w / 10);
    const rows = Math.floor((h - top) / 12);
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (r() < 0.18) {
          const wx = x + 5 + cx * 10;
          const wy = top + 6 + cy * 12;
          const bright = 0.4 + r() * 0.5;
          ctx.fillStyle = r() < 0.55
            ? `rgba(34,211,238,${bright})`
            : `rgba(251,191,36,${bright})`;
          ctx.fillRect(wx, wy, 2, 2);
        }
      }
    }
  }

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Midground buildings — main interactive skyline, window grids,      */
/* holo billboards. Two variants (v0/v1) for flicker swap.            */
/* ------------------------------------------------------------------ */
export const makeMidground = (
  scene: Phaser.Scene,
  chapter: string,
  worldWidth: number,
  groundY: number,
  variant: 0 | 1,
): string => {
  const key = neonKey('mid', chapter, worldWidth, groundY, `v${variant}`);
  if (scene.textures.exists(key)) return key;

  const seed = chapterSeed(chapter, worldWidth) + (variant === 1 ? 0x9e3779b9 : 0);
  const r = rng(seed);
  const h = groundY;
  const tex = scene.textures.createCanvas(key, worldWidth, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  const buildingCount = Math.floor(worldWidth / 160) + 1;
  for (let i = 0; i < buildingCount; i++) {
    const x = i * 160 + r() * 25;
    const w = 110 + r() * 90;
    const top = h - (220 + r() * 200);
    const body = r() < 0.6 ? '#182238' : '#1d2a47';
    ctx.fillStyle = body;
    ctx.fillRect(x, top, w, h - top);

    // Roof detail
    const roofH = 6 + r() * 8;
    ctx.fillStyle = '#0d1526';
    ctx.fillRect(x, top - roofH, w, roofH);

    // Neon trim on roof edge
    const nc = NEON_COLS[Math.floor(r() * NEON_COLS.length)];
    ctx.strokeStyle = nc;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top - roofH);
    ctx.lineTo(x + w, top - roofH);
    ctx.stroke();

    // Holo billboard on some roofs (bright magenta/cyan rect with glyph bars)
    if (r() < 0.22) {
      const bw = 40 + r() * 50;
      const bx = x + (w - bw) / 2;
      const by = top - roofH - 2 - (40 + r() * 30);
      const holoCol = r() < 0.5 ? '#ec4899' : '#22d3ee';
      ctx.fillStyle = `${holoCol}80`; // 50% alpha
      ctx.fillRect(bx, by, bw, 40 + r() * 30);
      // Glyph bars
      for (let g = 0; g < 4; g++) {
        const gy = by + 8 + g * 12;
        ctx.fillStyle = holoCol;
        ctx.fillRect(bx + 6, gy, bw * (0.3 + r() * 0.5), 5);
      }
    }

    // Window grid
    const cols = Math.floor(w / 14);
    const rows = Math.floor((h - top) / 14);
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        const lit = variant === 1 ? (r() < 0.16) : (r() < 0.22);
        if (lit) {
          const wx = x + 7 + cx * 14;
          const wy = top + 7 + cy * 14;
          const bright = 0.45 + r() * 0.5;
          ctx.fillStyle = r() < 0.5
            ? `rgba(34,211,238,${bright})`
            : `rgba(251,191,36,${bright})`;
          ctx.fillRect(wx, wy, 3, 3);
        }
      }
    }

    // Lower facade neon accent stripe (random)
    if (r() < 0.3) {
      const sy = top + 80 + r() * 60;
      ctx.strokeStyle = NEON_COLS[Math.floor(r() * NEON_COLS.length)];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, sy);
      ctx.lineTo(x + w - 10, sy);
      ctx.stroke();
    }
  }

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Foreground rooftop/street layer — railings, cables, vents, signs   */
/* ------------------------------------------------------------------ */
export const makeForeground = (
  scene: Phaser.Scene,
  chapter: string,
  worldWidth: number,
  groundY: number,
): string => {
  const key = neonKey('fg', chapter, worldWidth, groundY);
  if (scene.textures.exists(key)) return key;

  const seed = chapterSeed(chapter, worldWidth) + 4;
  const r = rng(seed);
  const h = groundY;
  const tex = scene.textures.createCanvas(key, worldWidth, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  // Only the band y = groundY-220 .. groundY
  const bandTop = h - 220;
  ctx.clearRect(0, 0, worldWidth, h);

  // Dark foreground structures (buildings closest to camera)
  const structCount = Math.floor(worldWidth / 200) + 1;
  for (let i = 0; i < structCount; i++) {
    const x = i * 200 + r() * 40;
    const w = 100 + r() * 80;
    const top = bandTop + r() * 60;
    ctx.fillStyle = '#1d2a47';
    ctx.fillRect(x, top, w, h - top);
  }

  // Cable runs (quadratic bezier between poles)
  ctx.strokeStyle = '#2d3a56';
  ctx.lineWidth = 1.5;
  const poleCount = Math.floor(worldWidth / 180);
  for (let i = 0; i < poleCount; i++) {
    const x1 = i * 180 + 40 + r() * 20;
    const y1 = bandTop + 10 + r() * 30;
    const x2 = x1 + 160 + r() * 30;
    const y2 = bandTop + 10 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 40 - r() * 30, x2, y2);
    ctx.stroke();
  }

  // Railing along the front edge
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, h - 6);
  ctx.lineTo(worldWidth, h - 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Vent boxes (steam emitter positions will align with these)
  for (let i = 0; i < 3; i++) {
    const vx = 200 + i * (worldWidth / 3) + r() * 60 - 30;
    const vy = h - 50;
    ctx.fillStyle = '#182238';
    ctx.fillRect(vx - 12, vy - 20, 24, 24);
    // Vent slits
    ctx.fillStyle = '#354666';
    for (let s = 0; s < 4; s++) {
      ctx.fillRect(vx - 10, vy - 16 + s * 6, 20, 2);
    }
  }

  // Neon sign boards (baked in for static look; flicker handled by separate sprites)
  const signCount = Math.floor(worldWidth / 300) + 1;
  for (let i = 0; i < signCount; i++) {
    const sx = i * 300 + 100 + r() * 50;
    const sy = bandTop + 20 + r() * 80;
    const sw = 80 + r() * 40;
    const sh = 24 + r() * 16;
    const signCol = NEON_COLS[Math.floor(r() * NEON_COLS.length)];
    ctx.fillStyle = '#081020';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = signCol;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
    // Inner glyphs
    for (let g = 0; g < 3; g++) {
      const gy = sy + 6 + g * 6;
      ctx.fillStyle = signCol;
      ctx.fillRect(sx + 6, gy, sw * (0.4 + r() * 0.4), 3);
    }
  }

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Ground slab — 56px tall, cyan top rim, reflection streaks          */
/* ------------------------------------------------------------------ */
export const makeGround = (
  scene: Phaser.Scene,
  chapter: string,
  worldWidth: number
): string => {
  const key = neonKey('ground', chapter, worldWidth, SUB_FLOOR_DEPTH);
  if (scene.textures.exists(key)) return key;

  const seed = chapterSeed(chapter, worldWidth) + 5;
  const r = rng(seed);
  const h = SUB_FLOOR_DEPTH; // 56
  const tex = scene.textures.createCanvas(key, worldWidth, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  // Base slab
  ctx.fillStyle = '#141c30';
  ctx.fillRect(0, 0, worldWidth, h);

  // Cyan top rim (2px)
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(0, 0, worldWidth, 2);

  // Panel seams
  ctx.strokeStyle = '#1d2a47';
  ctx.lineWidth = 1;
  const seamCount = Math.floor(worldWidth / 80);
  for (let i = 1; i < seamCount; i++) {
    const x = i * 80;
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Reflection streaks under the rim (vertical gradient lines)
  const streakCount = Math.floor(worldWidth / 25);
  for (let i = 0; i < streakCount; i++) {
    const x = i * 25 + r() * 8;
    const streakH = 8 + r() * 20;
    const col = r() < 0.4
      ? 'rgba(34,211,238,'
      : r() < 0.7
        ? 'rgba(139,92,246,'
        : 'rgba(236,72,153,';
    const alpha = 0.08 + r() * 0.1;
    const grad = ctx.createLinearGradient(0, 2, 0, 2 + streakH);
    grad.addColorStop(0, `${col}${alpha})`);
    grad.addColorStop(1, `${col}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, 2, 1 + r() * 2, streakH);
  }

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Rain tiles (256x256) — diagonal streaks                            */
/* ------------------------------------------------------------------ */
export const makeRain = (
  scene: Phaser.Scene,
  depthIndex: 0 | 1,
): string => {
  const key = neonKey('rain', '', 0, 0, `d${depthIndex}`);
  if (scene.textures.exists(key)) return key;

  const size = 256;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;
  const ctx = tex.getContext();

  // Deterministic RNG seeded per depth layer for screenshot stability
  const r = rng(0x5241494e + depthIndex); // 'RAIN' + 0/1
  const streakCount = depthIndex === 0 ? 80 : 60;
  const len = depthIndex === 0 ? 120 : 80;
  const angle = Math.PI / 4;
  for (let i = 0; i < streakCount; i++) {
    const x = r() * size;
    const y = r() * size;
    const alpha = 0.15 + r() * 0.15;
    ctx.strokeStyle = `rgba(160,200,255,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * Math.cos(angle), y + len * Math.sin(angle));
    ctx.stroke();
  }
  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Fog tiles (512x128) — soft horizontal gradient blobs               */
/* ------------------------------------------------------------------ */
export const makeFog = (
  scene: Phaser.Scene,
  fogIndex: 0 | 1,
): string => {
  const key = neonKey('fog', '', 0, 0, `f${fogIndex}`);
  if (scene.textures.exists(key)) return key;

  const w = 512, h = 128;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  const r = rng(0x464f47 + fogIndex); // 'FOG' + 0/1
  const blobCount = fogIndex === 0 ? 5 : 3;
  for (let i = 0; i < blobCount; i++) {
    const cx = r() * w;
    const cy = r() * h;
    const rx = 150 + r() * 150;
    const ry = 40 + r() * 40;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, 'rgba(120,140,200,0.07)');
    grad.addColorStop(1, 'rgba(120,140,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Vehicle sprite — small dark body + headlight                        */
/* ------------------------------------------------------------------ */
export const makeVehicle = (
  scene: Phaser.Scene,
  index: number,
): string => {
  const key = neonKey('veh', '', 0, 0, `v${index}`);
  if (scene.textures.exists(key)) return key;

  const w = 48, h = 16;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  // Body
  ctx.fillStyle = '#0d1526';
  ctx.fillRect(0, 2, w, h - 4);
  // Roof
  ctx.fillRect(4, 0, w - 8, 4);
  // Headlight (front) / taillight (back)
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(w - 2, 4, 2, h - 8); // front
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(0, 4, 2, h - 8); // back

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Holo billboard (magenta/cyan with glyph bars)                      */
/* ------------------------------------------------------------------ */
export const makeHolo = (
  scene: Phaser.Scene,
  index: number,
): string => {
  const key = neonKey('holo', '', 0, 0, `h${index}`);
  if (scene.textures.exists(key)) return key;

  const w = 96, h = 160;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  const col = index % 2 === 0 ? '#ec4899' : '#22d3ee';
  ctx.fillStyle = `${col}80`;
  ctx.fillRect(0, 0, w, h);

  // Glyph bars
  for (let g = 0; g < 6; g++) {
    const gy = 16 + g * 22;
    ctx.fillStyle = col;
    const r = rng(0x484f4c + index * 7 + g); // 'HOL' + unique
    ctx.fillRect(10, gy, w * (0.3 + r() * 0.5), 8);
  }
  // Corner markers
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, 3, h);
  ctx.fillRect(w - 3, 0, 3, h);
  ctx.fillRect(0, 0, w, 3);
  ctx.fillRect(0, h - 3, w, 3);

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Neon sign sprite (abstract glyphs, color varies)                   */
/* ------------------------------------------------------------------ */
export const makeSign = (
  scene: Phaser.Scene,
  index: number,
): string => {
  const key = neonKey('sign', '', 0, 0, `s${index}`);
  if (scene.textures.exists(key)) return key;

  const w = 120, h = 40;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  const colors = ['#22d3ee', '#8b5cf6', '#ec4899', '#f97316'];
  const c = colors[index % colors.length];

  ctx.fillStyle = '#081020';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, h);

  // Glyphs
  for (let g = 0; g < 4; g++) {
    const gy = 6 + g * 7;
    ctx.fillStyle = c;
    const r = rng(0x534947 + index * 5 + g); // 'SIG' + unique
    ctx.fillRect(8, gy, w * (0.2 + r() * 0.6), 4);
  }

  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Player glow / shadow                                               */
/* ------------------------------------------------------------------ */
export const makeGlow = (scene: Phaser.Scene): string => {
  const key = neonKey('glow', '', 0, 0);
  if (scene.textures.exists(key)) return key;
  const size = 64;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, 'rgba(34,211,238,0.45)');
  grad.addColorStop(0.5, 'rgba(34,211,238,0.12)');
  grad.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
  ctx.fill();
  tex.refresh();
  return key;
};

export const makeShadow = (scene: Phaser.Scene): string => {
  const key = neonKey('shadow', '', 0, 0);
  if (scene.textures.exists(key)) return key;
  const w = 48, h = 12;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)/2);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(w/2, h/2, w/2, h/2, 0, 0, Math.PI*2);
  ctx.fill();
  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* Steam particle (tiny soft white blob)                              */
/* ------------------------------------------------------------------ */
export const makeSteam = (scene: Phaser.Scene): string => {
  const key = neonKey('steam', '', 0, 0);
  if (scene.textures.exists(key)) return key;
  const size = 16;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
  ctx.fill();
  tex.refresh();
  return key;
};

/* ------------------------------------------------------------------ */
/* One-call bootstrap: generate all large layers for a chapter        */
/* ------------------------------------------------------------------ */
export const generateAllForChapter = (
  scene: Phaser.Scene,
  chapter: string,
  worldWidth: number,
  groundY: number,
  camWidth: number,
  camHeight: number,
) => {
  makeSky(scene, camWidth, camHeight, chapter, worldWidth);
  makeFarSkyline(scene, chapter, worldWidth, groundY);
  makeMidSkyline(scene, chapter, worldWidth, groundY);
  makeMidground(scene, chapter, worldWidth, groundY, 0);
  makeMidground(scene, chapter, worldWidth, groundY, 1);
  makeForeground(scene, chapter, worldWidth, groundY);
  makeGround(scene, chapter, worldWidth);
  // FX textures (singletons)
  makeRain(scene, 0); makeRain(scene, 1);
  makeFog(scene, 0); makeFog(scene, 1);
  makeVehicle(scene, 0); makeVehicle(scene, 1); makeVehicle(scene, 2); makeVehicle(scene, 3);
  makeHolo(scene, 0); makeHolo(scene, 1); makeHolo(scene, 2);
  makeSign(scene, 0); makeSign(scene, 1); makeSign(scene, 2); makeSign(scene, 3); makeSign(scene, 4);
  makeGlow(scene); makeShadow(scene); makeSteam(scene);
};