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
  skyZenith: 0x3f7fe0,
  skyMid: 0x74b3ee,
  skyHorizon: 0xb6dcf5,
  skyHaze: 0xd6ecfa,

  /* ---- ocean ---- */
  oceanDeep: 0x1a6aa8, // [17]
  oceanDeepAlt: 0x1f74b3, // derived: the second blue of the open-water checker
  oceanMid: 0x2b8fd4, // [17]
  oceanShallow: 0x4cc4dd, // [17] deepened a step: the first pass read as neon
  oceanLagoon: 0x86e2ea, // derived: innermost lagoon ring
  oceanSurf: 0xa9eef2, // derived: the last ring before the foam line
  foam: 0xffffff, // [17]

  /* ---- terrain ---- */
  sand: 0xf2e2b8, // [17]
  sandDark: 0xdfc894, // derived: sand side band
  grassTop: 0x7ec850, // [17]
  grassDark: 0x4a9e3f, // [17]
  rockSide: 0x7e6fd6, // [17]
  rockSideDark: 0x5b4fb8, // [17]

  /* ---- timber ---- */
  wood: 0xa06a44, // [17]
  woodDark: 0x7a4c30, // [17]
  woodLight: 0xc08a5c, // derived: deck planks

  /* ---- architecture ---- */
  wallCream: 0xf5e6c8, // [17]
  wallCreamDark: 0xe3d0ab, // derived: wall shading / base course
  roofBlue: 0x3f7fd0, // [17]
  roofBlueDark: 0x2f63a8, // derived: roof ridge
  roofTerracotta: 0xd8703e, // [17]
  roofTerracottaDark: 0xb25428, // derived: roof ridge
  stone: 0x9a9a9a, // [17]
  stoneDark: 0x7c7c7c, // derived
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
