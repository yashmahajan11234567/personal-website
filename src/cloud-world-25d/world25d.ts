/**
 * Cloud World 2.5D — shared world constants + analytic terrain.
 * Welcome Harbour prototype (Part H): one island, one dock, one whale boat.
 */

export const ISLAND_R = 24; // grass radius
export const BEACH_R = 27; // sand ring outer radius
export const SEA_R = 58; // boat clamp
export const DOCK = { x0: 22.5, x1: 31, z: 1.6, y: 0.55 }; // deck rect + height
export const BOAT_SPAWN = { x: 34, z: 0 };
export const WORLD_FOG = { color: '#cfe6f5', near: 70, far: 260 };

/** Analytic island height — single source of truth for mesh + character. */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r <= ISLAND_R) {
    return 1.3 + 0.32 * Math.sin(x * 0.55 + 1.7) * Math.cos(z * 0.5 - 0.6) + 0.18 * Math.sin(x * 1.3 + z * 1.1);
  }
  if (r <= BEACH_R) {
    const t = (r - ISLAND_R) / (BEACH_R - ISLAND_R);
    return 1.3 * (1 - t) + 0.15 * t;
  }
  const t = Math.min(1, (r - BEACH_R) / 6);
  return 0.15 - 3.2 * t; // sink under water
}

/** Is (x,z) walkable, and at what height? */
export function walkable(x: number, z: number): number | null {
  const r = Math.hypot(x, z);
  if (r <= ISLAND_R + 0.4) return terrainHeight(x, z);
  if (x >= DOCK.x0 && x <= DOCK.x1 && Math.abs(z) <= DOCK.z) return DOCK.y;
  return null;
}

export interface HotspotDef {
  id: string;
  kind: 'about' | 'sign' | 'skill' | 'project';
  label: string;
  contentId?: string;
  skills?: string[];
  x: number;
  z: number;
  r: number;
}

/** Welcome Harbour hotspots (Skills/Projects harbours added after prototype sign-off). */
export const HOTSPOTS: HotspotDef[] = [
  { id: 'about', kind: 'about', label: 'About me', x: 13, z: -9, r: 3.4 },
  { id: 'sign_tutorial', kind: 'sign', label: 'How to play', x: 24.6, z: 2.6, r: 2.0 },
];

/** Station mapping shared with the iso world (content ids from src/content). */
export const STATIONS = [
  { frame: 'st_aws', label: 'AWS & Cloud', contentId: 'terraform', skills: ['terraform', 'observability'] },
  { frame: 'st_docker', label: 'Docker & Containers', contentId: 'docker', skills: ['docker', 'container-hardening'] },
  { frame: 'st_k8s', label: 'Kubernetes', contentId: 'kubernetes', skills: ['kubernetes'] },
  { frame: 'st_cicd', label: 'CI/CD & Automation', contentId: 'ci-cd', skills: ['git', 'ci-cd', 'ansible'] },
  { frame: 'st_prog', label: 'Programming & Data', contentId: 'compose', skills: ['compose', 'health-checks'] },
] as const;

export const PROJECTS = [
  { frame: 'bld_lab', label: 'RxVerify — Verification Laboratory', contentId: 'rxverify' },
  { frame: 'bld_facility', label: 'DevOps Masterclass — Infrastructure Facility', contentId: 'devops-masterclass' },
  { frame: 'bld_hub', label: 'Go Microservices — Service Hub', contentId: 'go-microservices' },
] as const;
