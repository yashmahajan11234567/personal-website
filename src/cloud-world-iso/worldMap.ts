/**
 * World map: single source of truth for terrain, harbours, docks, buildings,
 * decor and hotspots. Exported to map.json for the ground-texture renderer.
 *
 * Units: metres. Map is MAP_W x MAP_H cells (1 cell = 1 m).
 * Iso screen projection (matches iso.ts): sx = (x - y) * 32 + ORIGIN_X,
 * sy = (x + y) * 16 + ORIGIN_Y with ORIGIN_X = MAP_H * 32, ORIGIN_Y = 0.
 */
import { WalkGrid, CELL_WATER, CELL_LAND, CELL_DOCK, CELL_BLOCKED } from './iso.ts';

export const MAP_W = 64;
export const MAP_H = 104;
export const ORIGIN_X = MAP_H * 32;
export const ORIGIN_Y = 0;

export function channelX(y: number): number {
  return 30 + 7 * Math.sin(y * 0.05) + 3 * Math.sin(y * 0.13 + 1.7);
}
export function channelHalfW(y: number): number {
  return 4.5 + 1.0 * Math.sin(y * 0.07 + 0.5);
}

export interface Hotspot {
  id: string;
  kind: 'about' | 'sign' | 'skill' | 'project' | 'boat';
  x: number; y: number; r: number;
  frame: string; atlas: 'welcome' | 'skills' | 'projects' | 'shared';
  label: string;
  contentId?: string; // PORTFOLIO id for panel
  skills?: string[];  // for multi-skill stations
}

export interface Placement {
  frame: string; atlas: 'welcome' | 'skills' | 'projects' | 'shared';
  x: number; y: number; scale?: number; hotspotId?: string; skills?: string[];
}

export interface DockZone {
  id: string; name: string;
  x: number; y: number; w: number; h: number; // world rect (in water, next to pier)
  pierX: number; pierY: number; // where the character disembarks (on the pier)
}

export interface WorldMapData {
  w: number; h: number;
  cells: number[]; // row-major, WalkGrid cell codes
  hotspots: Hotspot[];
  placements: Placement[];
  docks: DockZone[];
  spawn: { x: number; y: number };
  boatSpawn: { x: number; y: number };
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMap(): WorldMapData {
  const grid = new WalkGrid(MAP_W, MAP_H, CELL_LAND);
  for (let y = 0; y < MAP_H; y++) {
    const cx = channelX(y);
    const hw = channelHalfW(y);
    for (let x = 0; x < MAP_W; x++) {
      const d = Math.abs(x + 0.5 - cx);
      if (d < hw) grid.set(x, y, CELL_WATER);
      else if (d < hw + 2.2) grid.set(x, y, CELL_LAND); // sand ring
    }
  }
  const docks: DockZone[] = [];
  const hotspots: Hotspot[] = [];
  const placements: Placement[] = [];

  // ================= D1 Riverside Harbor (welcome) — east bank, y ≈ 88
  const y1 = 88;
  const cx1 = channelX(y1), hw1 = channelHalfW(y1);
  const waterEdgeE1 = Math.ceil(cx1 + hw1); // first land cell east of water
  const pierX1 = waterEdgeE1; // pier runs east from the water edge
  for (let y = y1 - 2; y <= y1 + 2; y++) for (let x = pierX1; x < pierX1 + 6; x++) grid.set(x, y, CELL_DOCK);
  docks.push({ id: 'd1', name: 'Riverside Harbor', x: cx1 + hw1 - 1.5, y: y1, w: 4, h: 3, pierX: pierX1 + 2.5, pierY: y1 });
  const wb = { x: pierX1 + 9, y: y1 - 4 };
  grid.rect(wb.x, wb.y, 7, 6, CELL_BLOCKED);
  placements.push({ frame: 'bld_welcome', atlas: 'welcome', x: wb.x + 3.5, y: wb.y + 3, hotspotId: 'about' });
  hotspots.push({ id: 'about', kind: 'about', x: wb.x + 3.5, y: wb.y + 6.6, r: 3.2, frame: 'bld_welcome', atlas: 'welcome', label: 'About me' });
  placements.push({ frame: 'sign_tutorial', atlas: 'welcome', x: pierX1 + 1.5, y: y1 - 3.5, hotspotId: 'sign_tutorial' });
  hotspots.push({ id: 'sign_tutorial', kind: 'sign', x: pierX1 + 1.5, y: y1 - 3.5, r: 2.2, frame: 'sign_tutorial', atlas: 'welcome', label: 'How to play' });
  placements.push({ frame: 'sign_nav_skills', atlas: 'welcome', x: pierX1 + 4, y: y1 + 4, hotspotId: 'sign_nav_skills' });
  hotspots.push({ id: 'sign_nav_skills', kind: 'sign', x: pierX1 + 4, y: y1 + 4, r: 2.2, frame: 'sign_nav_skills', atlas: 'welcome', label: 'Technology Dock upriver' });

  // ================= D2 Technology Dock (skills) — west bank, y ≈ 52
  const y2 = 52;
  const cx2 = channelX(y2), hw2 = channelHalfW(y2);
  const waterEdgeW2 = Math.floor(cx2 - hw2); // last water cell on the west side... first land cell west of water
  const pierX2 = waterEdgeW2 - 4; // pier extends 4 cells over the water edge
  for (let y = y2 - 3; y <= y2 + 3; y++) for (let x = pierX2; x < pierX2 + 6; x++) grid.set(x, y, CELL_DOCK);
  docks.push({ id: 'd2', name: 'Technology Dock', x: cx2 - hw2 + 1.5, y: y2, w: 4, h: 3, pierX: pierX2 + 5, pierY: y2 });
  const stations: { frame: string; sign: string; label: string; contentId: string; skills: string[] }[] = [
    { frame: 'st_aws', sign: 'sign_aws', label: 'AWS & Cloud', contentId: 'terraform', skills: ['terraform', 'observability'] },
    { frame: 'st_docker', sign: 'sign_docker', label: 'Docker & Containers', contentId: 'docker', skills: ['docker', 'container-hardening'] },
    { frame: 'st_k8s', sign: 'sign_k8s', label: 'Kubernetes', contentId: 'kubernetes', skills: ['kubernetes'] },
    { frame: 'st_cicd', sign: 'sign_cicd', label: 'CI/CD & Automation', contentId: 'ci-cd', skills: ['git', 'ci-cd', 'ansible'] },
    { frame: 'st_prog', sign: 'sign_prog', label: 'Programming & Data', contentId: 'compose', skills: ['compose', 'health-checks'] },
  ];
  stations.forEach((s, i) => {
    const x = pierX2 - 11; const y = y2 - 8 + i * 5;
    grid.rect(x, y, 7, 6, CELL_BLOCKED);
    placements.push({ frame: s.frame, atlas: 'skills', x: x + 3.5, y: y + 3, hotspotId: s.contentId, skills: s.skills });
    hotspots.push({ id: s.contentId, kind: 'skill', x: x + 3.5, y: y + 6.4, r: 3.4, frame: s.frame, atlas: 'skills', label: s.label, contentId: s.contentId, skills: s.skills });
    placements.push({ frame: s.sign, atlas: 'skills', x: x + 3.5, y: y - 2.2 });
  });
  placements.push({ frame: 'crane', atlas: 'skills', x: pierX2 - 1, y: y2 - 6 });
  placements.push({ frame: 'containers2', atlas: 'skills', x: pierX2 + 12, y: y2 + 6 });
  placements.push({ frame: 'sign_nav_projects', atlas: 'welcome', x: pierX2 - 4, y: y2 - 8, hotspotId: 'sign_nav_projects' });
  hotspots.push({ id: 'sign_nav_projects', kind: 'sign', x: pierX2 - 4, y: y2 - 8, r: 2.2, frame: 'sign_nav_projects', atlas: 'welcome', label: 'Riverside Village upriver' });

  // ================= D3 Riverside Village (projects) — east bank, y ≈ 16
  const y3 = 16;
  const cx3 = channelX(y3), hw3 = channelHalfW(y3);
  const waterEdgeE3 = Math.floor(cx3 + hw3);
  const pierX3 = waterEdgeE3 + 1;
  for (let y = y3 - 2; y <= y3 + 2; y++) for (let x = pierX3; x < pierX3 + 6; x++) grid.set(x, y, CELL_DOCK);
  docks.push({ id: 'd3', name: 'Riverside Village', x: cx3 + hw3 - 1.5, y: y3, w: 4, h: 3, pierX: pierX3 + 2.5, pierY: y3 });
  const projects: { frame: string; sign: string; label: string; contentId: string; x: number; y: number }[] = [
    { frame: 'bld_lab', sign: 'sign_rxverify', label: 'RxVerify — Verification Laboratory', contentId: 'rxverify', x: pierX3 + 7, y: y3 - 8 },
    { frame: 'bld_facility', sign: 'sign_masterclass', label: 'DevOps Masterclass — Infrastructure Facility', contentId: 'devops-masterclass', x: pierX3 + 18, y: y3 - 4 },
    { frame: 'bld_hub', sign: 'sign_gosvc', label: 'Go Microservices — Service Hub', contentId: 'go-microservices', x: pierX3 + 7, y: y3 + 6 },
  ];
  for (const p of projects) {
    const fw = p.frame === 'bld_hub' ? 11 : p.frame === 'bld_facility' ? 9 : 7;
    grid.rect(p.x, p.y, fw, 6, CELL_BLOCKED);
    placements.push({ frame: p.frame, atlas: 'projects', x: p.x + fw / 2, y: p.y + 3, hotspotId: p.contentId });
    hotspots.push({ id: p.contentId, kind: 'project', x: p.x + fw / 2, y: p.y + 6.4, r: 3.6, frame: p.frame, atlas: 'projects', label: p.label, contentId: p.contentId });
    placements.push({ frame: p.sign, atlas: 'projects', x: p.x + fw / 2, y: p.y - 2.4 });
  }

  // decor scatter (deterministic)
  const rand = rng(1337);
  const decor: Placement[] = [];
  for (let i = 0; i < 220; i++) {
    const x = rand() * MAP_W;
    const y = rand() * MAP_H;
    const c = grid.get(x, y);
    if (c !== CELL_LAND) continue;
    let clear = true;
    for (const p of placements) {
      if (Math.abs(p.x - x) < 6 && Math.abs(p.y - y) < 6) { clear = false; break; }
    }
    if (!clear) continue;
    const roll = rand();
    const frame = roll < 0.5 ? 'tree' : roll < 0.7 ? 'tree2' : roll < 0.8 ? 'pine' : roll < 0.9 ? 'rock' : 'crate';
    decor.push({ frame, atlas: 'shared', x, y, scale: 0.8 + rand() * 0.5 });
  }
  for (const d of docks) {
    decor.push({ frame: 'lamp', atlas: 'shared', x: d.pierX - 1, y: d.pierY - 2.5 });
    decor.push({ frame: 'lamp', atlas: 'shared', x: d.pierX + 2, y: d.pierY + 2.5 });
  }
  for (let y = 6; y < MAP_H - 4; y += 9) {
    const cx = channelX(y);
    decor.push({ frame: 'buoy', atlas: 'shared', x: cx - channelHalfW(y) + 0.8, y: y + 1 });
    decor.push({ frame: 'buoy', atlas: 'shared', x: cx + channelHalfW(y) - 0.8, y: y + 5 });
  }
  decor.push({ frame: 'beacon', atlas: 'shared', x: channelX(100) + channelHalfW(100) + 3, y: 100 });

  const cells: number[] = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) cells.push(grid.get(x, y));

  return {
    w: MAP_W, h: MAP_H, cells,
    hotspots, placements: [...placements, ...decor],
    docks,
    spawn: { x: pierX1 + 1.5, y: y1 + 1 },
    boatSpawn: { x: cx1 + hw1 - 2.5, y: y1 },
  };
}
