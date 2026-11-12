/**
 * Cloud World 2.0 — frozen colour palette.
 *
 * Derived from `03_VISUAL_DIRECTION_ASSET_BIBLE.md` §6.1. Every voxel, prop,
 * sign and UI accent must use a token from this table. This is a FRESH
 * implementation palette written for Cloud World 2.0; it encodes the same
 * approved design tokens as the art bible but is an independent file owned by
 * this module.
 */

export const P = {
  /* ---- sky (sunset demo rig) ---- */
  skyZenith: 0x4a90e2,
  skyMid: 0x8cc3f0,
  skyHorizon: 0xcdebf9,
  skyHaze: 0xd6ecfa,

  /* ---- night rig sky ---- */
  nightZenith: 0x1a1a2e,
  nightMid: 0x4a148c,
  nightHorizon: 0xe8e8ff,

  /* ---- ocean ---- */
  oceanDeep: 0x1e86c0,
  oceanMid: 0x3fa4e0,
  oceanShallow: 0x5acde5,
  foam: 0xffffff,

  /* ---- terrain ---- */
  sand: 0xf4e8c4,
  sandDark: 0xe8d8a8,
  grassTop: 0x8dd35e,
  grassDark: 0x5bb04d,
  rockSide: 0x7e6fd6,
  rockSideDark: 0x5b4fb8,

  /* ---- timber ---- */
  wood: 0xb87a50,
  woodDark: 0x9c5e40,
  woodLight: 0xc08a5c,

  /* ---- architecture ---- */
  wallCream: 0xf8ecdc,
  wallCreamDark: 0xe8d8c0,
  roofBlue: 0x4a90e2,
  roofBlueDark: 0x3a70c2,
  roofTerracotta: 0xd8703e,
  roofTerracottaDark: 0xb25428,
  stone: 0xb0b0b0,
  stoneDark: 0x8c8c8c,
  glass: 0x8ec8e8,
  glassDark: 0x4a7fa8,

  /* ---- vegetation ---- */
  leaf: 0x3f8f3f,
  leafLight: 0x5fb84f,
  trunk: 0x8a5a3b,
  cactus: 0x4aa85a,

  /* ---- flowers ---- */
  flowerPink: 0xff6b9d,
  flowerYellow: 0xffd93d,
  flowerPurple: 0x9b59b6,
  flowerWhite: 0xfdfdf5,

  /* ---- docker whale ---- */
  whaleBlue: 0x2a5fc4,
  whaleAccent: 0x1a3f8f,
  whaleLight: 0x5c8ee8,
  whaleBelly: 0xdbe7f7,
  containerBlue: 0x3f86d8,
  containerCyan: 0x6fc6ea,
  containerFrame: 0x1c2a44,

  /* ---- props / signage ---- */
  lantern: 0xffe9a8,
  lanternGlow: 0xffb300,
  awningBlue: 0x3f7fd0,
  awningTerracotta: 0xd8564a,
  cargoGreen: 0x3f9e6a,
  cargoRust: 0xa8523a,
  signBoard: 0x2b2b2b,
  signText: 0xffffff,
  emissiveCyan: 0x00e5ff,
  emissiveWindow: 0xffd54f,

  /* ---- skill stall accents (locked six) ---- */
  fishBlue: 0x4a90c8,
  pipeGrey: 0x7a8794,
  fishOrange: 0xff8c42,

  /* ---- character ---- */
  charSkin: 0xe0ac70,
  charHair: 0x5a3a22,
  charShirt: 0xf5efe2,
  charPants: 0x3d4455,
  charBoots: 0x6e4a2c,
  charScarf: 0xd8453e,
  charBackpack: 0x9a7b4f,

  /* ---- ui ---- */
  uiPanelBg: 0x1d2430,
  uiAccent: 0x4a90e2,
} as const;

export type PaletteToken = keyof typeof P;

/** sRGB hex string for CSS (HUD, panels). Accepts a palette token key OR a
 * raw palette number — panels store numbers, HUD code passes token keys. */
export function hexString(token: PaletteToken | number): string {
  const value = typeof token === 'number' ? token : P[token];
  return '#' + (value ?? 0x888888).toString(16).padStart(6, '0');
}
