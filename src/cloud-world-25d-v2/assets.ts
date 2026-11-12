/**
 * Asset registry — curated paths from the 493 GLB manifest.
 * Only loads what we actually need for Welcome Harbour.
 */

// Tree variants (instanced)
export const TREE_ASSETS = {
  twisted: '/assets/cw25d/models/vegetation/trees/twistedtree_1.glb',
  pine: '/assets/cw25d/models/vegetation/trees/pine_1.glb',
  common: '/assets/cw25d/models/vegetation/trees/commontree_1.glb',
  dead: '/assets/cw25d/models/vegetation/trees/deadtree_1.glb',
};

// Bush/grass/flowers/rocks
export const BUSH_ASSET = '/assets/cw25d/models/vegetation/bushes/bush_common.glb';
export const GRASS_ASSETS = [
  '/assets/cw25d/models/vegetation/grass/grass_common_short.glb',
  '/assets/cw25d/models/vegetation/grass/grass_common_tall.glb',
  '/assets/cw25d/models/vegetation/grass/grass_wispy_short.glb',
  '/assets/cw25d/models/vegetation/grass/grass_wispy_tall.glb',
];
export const ROCK_ASSETS = [
  '/assets/cw25d/models/vegetation/rocks/rock_medium_1.glb',
  '/assets/cw25d/models/vegetation/rocks/rock_medium_2.glb',
  '/assets/cw25d/models/vegetation/rocks/rock_medium_3.glb',
];

// Buildings (modular)
export const BUILDING_ASSETS = {
  tavern: '/assets/cw25d/models/buildings/modular/building_tavern_red.glb',
  home_a: '/assets/cw25d/models/buildings/modular/building_home_a_red.glb',
  home_b: '/assets/cw25d/models/buildings/modular/building_home_b_red.glb',
  tower: '/assets/cw25d/models/buildings/modular/building_tower_a_red.glb',
  castle: '/assets/cw25d/models/buildings/modular/building_castle_red.glb',
  well: '/assets/cw25d/models/buildings/modular/building_well_red.glb',
  windmill: '/assets/cw25d/models/buildings/modular/building_windmill_red.glb',
  watermill: '/assets/cw25d/models/buildings/modular/building_watermill_red.glb',
  market: '/assets/cw25d/models/buildings/modular/building_market_red.glb',
  blacksmith: '/assets/cw25d/models/buildings/modular/building_blacksmith_red.glb',
  barracks: '/assets/cw25d/models/buildings/modular/building_barracks_red.glb',
  archery: '/assets/cw25d/models/buildings/modular/building_archeryrange_red.glb',
  lumbermill: '/assets/cw25d/models/buildings/modular/building_lumbermill_red.glb',
  mine: '/assets/cw25d/models/buildings/modular/building_mine_red.glb',
  stage: '/assets/cw25d/models/buildings/modular/building_stage_a.glb',
  scaffolding: '/assets/cw25d/models/buildings/modular/building_scaffolding.glb',
  bridge_a: '/assets/cw25d/models/buildings/modular/building_bridge_a.glb',
  bridge_b: '/assets/cw25d/models/buildings/modular/building_bridge_b.glb',
};

// Props
export const PROP_ASSETS = {
  crate: '/assets/cw25d/models/buildings/crates/crate_a_big.glb',
  crate_small: '/assets/cw25d/models/buildings/crates/crate_a_small.glb',
  crate_long: '/assets/cw25d/models/buildings/crates/crate_long_a.glb',
  crate_open: '/assets/cw25d/models/buildings/crates/crate_open.glb',
  barrel: '/assets/cw25d/models/buildings/barrels/barrel.glb',
  fence: '/assets/cw25d/models/buildings/fences/fence_wood_straight.glb',
  fence_gate: '/assets/cw25d/models/buildings/fences/fence_wood_straight_gate.glb',
  lamp: '/assets/cw25d/models/props/lamps/lamp_standing.glb',
  path_long: '/assets/cw25d/models/buildings/paths/path_long.glb',
  path_short: '/assets/cw25d/models/buildings/paths/path_short.glb',
  flag: '/assets/cw25d/models/buildings/props/flag_red.glb',
  bucket: '/assets/cw25d/models/buildings/props/bucket_empty.glb',
  pallet: '/assets/cw25d/models/buildings/props/pallet.glb',
  sack: '/assets/cw25d/models/buildings/props/sack.glb',
  wheelbarrow: '/assets/cw25d/models/buildings/props/wheelbarrow.glb',
  weaponrack: '/assets/cw25d/models/buildings/props/weaponrack.glb',
  target: '/assets/cw25d/models/buildings/props/target.glb',
  tent: '/assets/cw25d/models/buildings/props/tent.glb',
  ladder: '/assets/cw25d/models/buildings/props/ladder.glb',
  resource_lumber: '/assets/cw25d/models/buildings/props/resource_lumber.glb',
};

// KayKit Medieval Hexagon (additional trees/rocks)
export const KAYKIT_TREES = [
  '/assets/cw25d/models/buildings/trees/tree_large.glb',
  '/assets/cw25d/models/buildings/trees/tree_single_a.glb',
  '/assets/cw25d/models/buildings/trees/tree_single_b.glb',
  '/assets/cw25d/models/buildings/trees/tree_small.glb',
];
export const KAYKIT_ROCKS = [
  '/assets/cw25d/models/buildings/rocks/mountain_a_grass_trees.glb',
  '/assets/cw25d/models/buildings/rocks/mountain_b_grass_trees.glb',
  '/assets/cw25d/models/buildings/rocks/mountain_c_grass_trees.glb',
  '/assets/cw25d/models/buildings/rocks/hill_single_a.glb',
  '/assets/cw25d/models/buildings/rocks/hill_single_b.glb',
  '/assets/cw25d/models/buildings/rocks/hill_single_c.glb',
];

// Character (KayKit Adventurers)
export const CHARACTER_ASSETS = {
  knight: '/assets/cw25d/models/characters/humanoid/knight.glb',
  mage: '/assets/cw25d/models/characters/humanoid/mage.glb',
  rogue: '/assets/cw25d/models/characters/humanoid/rogue.glb',
  rogue_hooded: '/assets/cw25d/models/characters/humanoid/rogue_hooded.glb',
  barbarian: '/assets/cw25d/models/characters/humanoid/barbarian.glb',
};

// Animation names (from GLB inspection)
export const CHARACTER_ANIMS = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  interact: 'Interact',
  cheer: 'Cheer',
} as const;

// Critical preload list (small, high-priority)
export const PRELOAD_CRITICAL = [
  CHARACTER_ASSETS.knight,
  BUILDING_ASSETS.tavern,
  BUILDING_ASSETS.tower,
  TREE_ASSETS.twisted,
  TREE_ASSETS.pine,
  BUSH_ASSET,
  ROCK_ASSETS[0],
];

// All preload (everything we might need)
export const PRELOAD_ALL = [
  ...PRELOAD_CRITICAL,
  BUILDING_ASSETS.home_a,
  BUILDING_ASSETS.castle,
  BUILDING_ASSETS.windmill,
  BUILDING_ASSETS.watermill,
  BUILDING_ASSETS.market,
  BUILDING_ASSETS.blacksmith,
  BUILDING_ASSETS.barracks,
  BUILDING_ASSETS.bridge_a,
  PROP_ASSETS.crate,
  PROP_ASSETS.barrel,
  PROP_ASSETS.fence,
  PROP_ASSETS.lamp,
  PROP_ASSETS.path_long,
  ...GRASS_ASSETS,
  ...ROCK_ASSETS,
  ...KAYKIT_TREES.slice(0, 2),
];

// Type for asset manifest entries
export interface AssetEntry {
  path: string;
  category: string;
  subcategory: string;
}