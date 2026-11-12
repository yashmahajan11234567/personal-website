/**
 * Cloud World Voxel — the frozen colour palette (brief 02 / ART_DIRECTION §2).
 *
 * RULE: no colour outside this table. Every prop, sign, building and terrain
 * block reuses a token from here, which is what makes the world read as one
 * visual language instead of assembled parts.
 *
 * Tokens marked [17] are the seventeen adopted design tokens; the remaining
 * entries are derived accents (each one a shade or complement of an adopted
 * token, used only for detail work such as window frames and lantern light).
 */

export const C = {
  /* ---- sky (ref 3: periwinkle zenith -> pale horizon, never white) ---- */
  skyZenith: 0x4a90e2, // brighter sky blue
  skyMid: 0x8cc3f0,
  skyHorizon: 0xcdebf9,
  skyHaze: 0xd6ecfa,

  /* ---- ocean ---- */
  oceanDeep: 0x1e86c0, // [17] brighter blue
  oceanDeepAlt: 0x2a90c8, // derived: the second blue of the open-water checker
  oceanMid: 0x3fa4e0, // [17]
  oceanShallow: 0x5acde5, // [17]
  oceanLagoon: 0x86e2ea, // derived: innermost lagoon ring
  oceanSurf: 0xa9eef2, // derived: the last ring before the foam line
  foam: 0xffffff, // [17]

  /* ---- terrain ---- */
  sand: 0xf4e8c4, // [17] brighter sand
  sandDark: 0xe8d8a8, // derived: sand side band
  grassTop: 0x8dd35e, // [17] brighter green
  grassDark: 0x5bb04d, // [17]
  rockSide: 0x7e6fd6, // [17]
  rockSideDark: 0x5b4fb8, // [17]

  /* ---- timber ---- */
  wood: 0xb87a50, // [17] brighter warm wood
  woodDark: 0x9c5e40, // [17]
  woodLight: 0xc08a5c, // derived: deck planks

  /* ---- architecture ---- */
  wallCream: 0xf8ecdc, // [17]
  wallCreamDark: 0xe8d8c0, // derived: wall shading / base course
  roofBlue: 0x4a90e2, // [17]
  roofBlueDark: 0x3a70c2, // derived: roof ridge
  roofTerracotta: 0xd8703e, // [17]
  roofTerracottaDark: 0xb25428, // derived: roof ridge
  stone: 0xb0b0b0, // [17]
  stoneDark: 0x8c8c8c, // derived
  glass: 0x8ec8e8,
  glassDark: 0x4a7fa8,

  /* ---- vegetation ---- */
  leaf: 0x3f8f3f, // [17]
  leafLight: 0x5fb84f, // [17]
  trunk: 0x8a5a3b,
  cactus: 0x4aa85a,

  /* ---- flowers ---- */
  flowerPink: 0xff6b9d,
  flowerYellow: 0xffd93d,
  flowerPurple: 0x9b59b6,
  flowerWhite: 0xfdfdf5,

  /* ---- docker whale (ref 5) ---- */
  whaleBlue: 0x2a5fc4, // [17]
  whaleAccent: 0x1a3f8f, // [17]
  whaleLight: 0x5c8ee8,
  whaleBelly: 0xdbe7f7,
  containerBlue: 0x3f86d8,
  containerCyan: 0x6fc6ea,
  containerFrame: 0x1c2a44,

  /* ---- props / ui world-space detail ---- */
  lantern: 0xffe9a8,
  awningBlue: 0x3f7fd0,
  awningTerracotta: 0xd8564a,
  cargoGreen: 0x3f9e6a,
  cargoRust: 0xa8523a,

  /* ---- skill stall themes ---- */
  fishOrange: 0xff8c42, // pufferfish → AWS
  pipeGrey: 0x7a8794,   // pipe → CI/CD
  fishBlue: 0x4a90c8,   // blue whale fish → Docker
} as const;

export type ColorToken = keyof typeof C;
export type VoxelColor = number;

/** Convert a palette token to a hex string (used by HTML overlays + QA). */
export function hex(token: ColorToken): string {
  return '#' + C[token].toString(16).padStart(6, '0');
}

/** The seventeen adopted tokens, in the order they appear in the design doc. */
export const ADOPTED_TOKENS: ColorToken[] = [
  'oceanDeep',
  'oceanMid',
  'oceanShallow',
  'foam',
  'sand',
  'grassTop',
  'grassDark',
  'rockSide',
  'rockSideDark',
  'wood',
  'woodDark',
  'roofBlue',
  'roofTerracotta',
  'wallCream',
  'stone',
  'whaleBlue',
  'whaleAccent',
];
