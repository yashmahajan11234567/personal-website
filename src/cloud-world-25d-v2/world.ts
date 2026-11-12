/**
 * Cloud World v2 — Welcome Harbour world constants, analytic terrain, and layout.
 * Ported & enhanced from v1 world25d.ts with harbour-scale constants.
 */
export const WORLD = {
  // Island
  ISLAND_R: 30,
  BEACH_R: 35,
  SEA_R: 70,

  // Dock (walkable rectangle at y = DOCK_Y)
  DOCK: { x0: 24, x1: 36, z0: -3, z1: 3, y: 0.55 },

  // Spawn
  SPAWN: { x: 14, z: 3 },

  // Boat spawn (just off dock)
  BOAT_SPAWN: { x: 38, z: 0 },

  // Fog
  FOG: { color: 0x8fd3f4, near: 50, far: 180 },

  // Walkable test
  isWalkable(x: number, z: number): boolean {
    const r = Math.hypot(x, z);
    if (r <= this.ISLAND_R + 0.5) return true;
    if (x >= this.DOCK.x0 && x <= this.DOCK.x1 && z >= this.DOCK.z0 && z <= this.DOCK.z1) return true;
    return false;
  },

  // Terrain height — single source of truth for mesh + character
  terrainHeight(x: number, z: number): number {
    const r = Math.hypot(x, z);
    if (r <= this.ISLAND_R) {
      // Radial hill with noise detail
      return 1.3 + 0.32 * Math.sin(x * 0.55 + 1.7) * Math.cos(z * 0.5 - 0.6) + 0.18 * Math.sin(x * 1.3 + z * 1.1);
    }
    if (r <= this.BEACH_R) {
      const t = (r - this.ISLAND_R) / (this.BEACH_R - this.ISLAND_R);
      return 1.3 * (1 - t) + 0.15 * t;
    }
    const t = Math.min(1, (r - this.BEACH_R) / 8);
    return 0.15 - 3.2 * t; // sink under water
  },

  // Walkable height at (x,z) — null if not walkable
  walkableHeight(x: number, z: number): number | null {
    const r = Math.hypot(x, z);
    if (r <= this.ISLAND_R + 0.5) return this.terrainHeight(x, z);
    if (x >= this.DOCK.x0 && x <= this.DOCK.x1 && z >= this.DOCK.z0 && z <= this.DOCK.z1) return this.DOCK.y;
    return null;
  },
};

/** Deterministic scatter positions for vegetation/props (seed = 1) */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const rng = seededRandom(1);
function rand(): number { return rng(); }

export const TREE_SPOTS: { x: number; z: number; type: string }[] = [
  // twisted trees
  { x: -8.2, z: -12.1, type: 'twistedtree_1' },
  { x: 10.5, z: -18.3, type: 'twistedtree_2' },
  { x: -14.7, z: 8.4, type: 'twistedtree_3' },
  { x: 18.9, z: 14.2, type: 'twistedtree_4' },
  { x: -20.1, z: -4.8, type: 'twistedtree_5' },
  // pines
  { x: -16.3, z: -10.2, type: 'pine_1' },
  { x: 12.8, z: 16.5, type: 'pine_2' },
  { x: -5.4, z: -19.7, type: 'pine_3' },
  { x: 22.1, z: -8.3, type: 'pine_4' },
  { x: -18.6, z: 12.9, type: 'pine_5' },
  // common trees
  { x: 6.7, z: -14.8, type: 'commontree_1' },
  { x: -11.3, z: 15.6, type: 'commontree_2' },
  { x: 19.4, z: 5.2, type: 'commontree_3' },
];

export const BUSH_SPOTS: { x: number; z: number }[] = [];
export const GRASS_SPOTS: { x: number; z: number }[] = [];
export const FLOWER_SPOTS: { x: number; z: number; color: number }[] = [];
export const ROCK_SPOTS: { x: number; z: number }[] = [];

// Generate deterministic scatter
function genScatter(count: number, minR: number, maxR: number, excludeDock = true) {
  const spots: { x: number; z: number }[] = [];
  while (spots.length < count) {
    const r = minR + rand() * (maxR - minR);
    const theta = rand() * Math.PI * 2;
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    if (excludeDock && x >= WORLD.DOCK.x0 - 2 && x <= WORLD.DOCK.x1 + 2 && z >= WORLD.DOCK.z0 - 2 && z <= WORLD.DOCK.z1 + 2) continue;
    if (x >= -3 && x <= 4 && z >= -4 && z <= 4) continue; // spawn exclusion
    // Check distance from existing
    let tooClose = false;
    for (const s of spots) {
      if (Math.hypot(s.x - x, s.z - z) < 1.2) { tooClose = true; break; }
    }
    if (!tooClose) spots.push({ x, z });
  }
  return spots;
}

BUSH_SPOTS.push(...genScatter(32, 4, 28));
GRASS_SPOTS.push(...genScatter(18, 5, 25));
FLOWER_SPOTS.push(...genScatter(14, 6, 26).map((p, i) => ({ ...p, color: [0xff6b9d, 0xffd93d, 0x9b59b6, 0xffffff][i % 4] })));
ROCK_SPOTS.push(...genScatter(8, 8, 30));

// Dock props (crates, barrels, lamps)
export const DOCK_PROPS = [
  { type: 'crate', x: 25.5, z: -1.8, rot: 0.3 },
  { type: 'crate', x: 26.8, z: -2.2, rot: -0.2 },
  { type: 'barrel', x: 28.2, z: 2.1, rot: 0 },
  { type: 'barrel', x: 29.5, z: -1.5, rot: 0 },
  { type: 'lamp', x: 25, z: 2.5, rot: 0 },
  { type: 'lamp', x: 34, z: -2.5, rot: 0 },
];

// Building positions (modular assembly)
export const BUILDINGS = [
  // Welcome Building (tavern at center plaza)
  { id: 'welcome', x: 12, z: -8, type: 'tavern', color: 'red', rot: Math.PI / 2 },
  // Lighthouse (tower at point)
  { id: 'lighthouse', x: -22, z: 24, type: 'tower', color: 'blue', rot: 0 },
];

// Hotspots for interaction
export interface HotspotDef {
  id: string;
  kind: 'about' | 'sign' | 'skill' | 'project' | 'vehicle';
  label: string;
  contentId?: string;
  skills?: string[];
  x: number;
  z: number;
  r: number;
}

export const HOTSPOTS: HotspotDef[] = [
  { id: 'about', kind: 'about', label: 'About Me', x: 12, z: -8, r: 3.5 },
  { id: 'sign_tutorial', kind: 'sign', label: 'How to Play', x: 26, z: 2.8, r: 2.2 },
  { id: 'skills_sign', kind: 'sign', label: 'Skills Harbour', x: 28, z: -2.5, r: 2.2 },
  { id: 'projects_sign', kind: 'sign', label: 'Projects Harbour', x: 30, z: 0, r: 2.2 },
  { id: 'whale', kind: 'vehicle', label: 'Board Docker Whale', x: 38, z: 0, r: 5 },
];

// Content IDs for info cards
export const CONTENT = {
  about: {
    title: 'About Me',
    body: 'Cloud / DevOps Engineer. Built RxVerify productionization (K8s, CI/CD, Terraform, Ansible, Observability). Full-Stack AI DevOps Masterclass coursework. Go microservices for real-time balance visibility. Passionate about reliable infrastructure and developer experience.',
    skills: ['Kubernetes', 'Docker', 'Terraform', 'Ansible', 'GitHub Actions', 'Prometheus', 'Grafana', 'Go', 'Python'],
  },
  tutorial: {
    title: 'How to Play',
    body: 'WASD / Arrow Keys — Move\nShift — Run\nE — Board boat / Interact\nClick — Open info cards\nESC — Close card / Exit boat\nMouse — Orbit camera (hold right click)',
    skills: [],
  },
  skills: {
    title: 'Skills Harbour (Coming Soon)',
    body: 'Sail the Docker Whale to discover the Skills Harbour — 8 Cloud/DevOps skills with real project evidence: Git, Docker, Health Checks, Compose, CI/CD, Terraform, Ansible, Observability. Kubernetes available as training branch.',
    skills: ['Git', 'Docker', 'Health Checks', 'Compose', 'CI/CD', 'Terraform', 'Ansible', 'Observability'],
  },
  projects: {
    title: 'Projects Harbour (Coming Soon)',
    body: 'Three verified projects await: RxVerify (productionization rig), DevOps Masterclass (service cluster), Go Microservices (service cluster). Each has real workflow stages, measured results, and stated limitations.',
    skills: ['RxVerify', 'DevOps Masterclass', 'Go Microservices'],
  },
  whale: {
    title: 'The Docker Whale',
    body: 'Your vessel for harbour exploration. Board at the dock (E), steer with WASD, disembark at any dock (E). The whale sails within the sea ring — it cannot beach.',
    skills: ['Docker', 'Container'],
  },
};