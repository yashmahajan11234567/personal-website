/**
 * Cloud World 2.0 — locked content registry.
 *
 * The approved world content, exactly as locked by the design documents:
 * one starting harbour, six skill stalls, three project houses, the Docker
 * Whale, and the third-person visitor.
 *
 * HARD RULE (doc 02 §1.9 / doc 04 §9): no invented portfolio facts. Stall and
 * house panels are projected from the audited content modules in
 * `src/content/*`. Only the world's own connective copy (welcome, controls,
 * zone descriptions) is authored here, and it makes no claims about the
 * portfolio's contents.
 */

import { CLOUD_PROJECTS } from '../../content/projects.cloud';
import { DATA_SKILLS } from '../../content/skills.data';
import type { Project, Skill } from '../../content/types';
import { P } from './palette';
import type { Berth, Deck, Hotspot, IslandSpec, WorldLabel } from './types';

/* ------------------------------------------------------------------ */
/* Geography                                                           */
/* ------------------------------------------------------------------ */

export const ISLANDS: IslandSpec[] = [
  { id: 'spawn', label: 'Starting Island', cx: -46, cz: -46, r: 8, seed: 101, wobble: 0.15 },
  { id: 'harbour', label: 'Welcome Harbour', cx: 36, cz: 36, r: 28, seed: 202, wobble: 0.22 },
  { id: 'beacon', label: 'Beacon Islet', cx: 64, cz: -38, r: 7, seed: 303, wobble: 0.18 },
];

export const HARBOUR = ISLANDS[1];
export const HARBOUR_CX = HARBOUR.cx;
export const HARBOUR_CZ = HARBOUR.cz;

/** Deck layer: planks occupy y=1 (centre), walkable surface is y=2. */
export const DECK_SURFACE = 2;

export const DECKS: Deck[] = [
  { x0: -41, x1: -30, z0: -49, z1: -46, y: DECK_SURFACE, label: 'Arrival Dock' },
  { x0: -8, x1: 16, z0: 33, z1: 39, y: DECK_SURFACE, label: 'Harbour Pier' },
  { x0: 50, x1: 60, z0: -46, z1: -42, y: DECK_SURFACE, label: 'Beacon Jetty' },
];

export const BERTHS: Berth[] = [
  { x: -22, z: -47.5, heading: Math.PI / 2, dockLabel: 'Arrival Dock', label: 'Arrival Dock' },
  { x: -16, z: 36, heading: -Math.PI / 2, dockLabel: 'Harbour Pier', label: 'Harbour Pier' },
  { x: 45, z: -44, heading: -Math.PI / 2, dockLabel: 'Beacon Jetty', label: 'Beacon Jetty' },
];

/** Starting position: on the spawn shore beside the arrival dock. */
export const SPAWN = { x: -45.5, z: -47.5, heading: Math.PI / 2 };

/** The whale stays in open water and inside the reef ring. */
export function canSailTo(x: number, z: number, shoreDistance: (x: number, z: number) => number): boolean {
  if (Math.hypot(x, z) > 300) return false;
  return shoreDistance(x, z) > 2.4;
}

/* ------------------------------------------------------------------ */
/* The six skill stalls (locked)                                       */
/* ------------------------------------------------------------------ */

export interface StallSpec {
  id: string;
  panelId: string;
  title: string;
  subtitle: string;
  /** world x of the stall centre; the row runs along z = STALL_ROW_Z */
  x: number;
  awningA: number;
  awningB: number;
  accent: number;
  icon: string;
  /** id in skills.cloud.ts / skills.data.ts for content projection */
  skillId: string;
}

export const STALL_ROW_Z = 44;
/** interaction radius: player must stand within this many blocks of (x, STALL_ROW_Z) */
export const STALL_REACH = 8;

export const STALLS: StallSpec[] = [
  {
    id: 'stall-docker',
    panelId: 'docker',
    title: 'Docker Fish Market',
    subtitle: 'Multi-stage builds with non-root runtime users.',
    x: 8,
    awningA: P.fishBlue,
    awningB: P.wallCream,
    accent: P.fishBlue,
    icon: '🐳',
    skillId: 'docker',
  },
  {
    id: 'stall-cicd',
    panelId: 'cicd',
    title: 'CI/CD Workshop',
    subtitle: 'Three-job pipeline: lint/test, security scan, GHCR build.',
    x: 16,
    awningA: P.awningTerracotta,
    awningB: P.wallCream,
    accent: P.pipeGrey,
    icon: '⚙️',
    skillId: 'ci-cd',
  },
  {
    id: 'stall-cloud',
    panelId: 'terraform',
    title: 'Cloud & Infrastructure',
    subtitle: 'Terraform + Ansible — eight real AWS resources, validated.',
    x: 24,
    awningA: P.flowerPurple,
    awningB: P.wallCream,
    accent: P.roofTerracotta,
    icon: '☁️',
    skillId: 'terraform',
  },
  {
    id: 'stall-k8s',
    panelId: 'k8s',
    title: 'Kubernetes / Container Orchestration',
    subtitle: 'Manifests, Minikube probes, rolling updates and rollback.',
    x: 32,
    awningA: P.awningBlue,
    awningB: P.wallCream,
    accent: P.roofBlue,
    icon: '⎈',
    skillId: 'kubernetes',
  },
  {
    id: 'stall-python',
    panelId: 'python',
    title: 'Programming Workshop',
    subtitle: 'Python / pandas — analysis applied to validated data.',
    x: 40,
    awningA: P.flowerYellow,
    awningB: P.wallCream,
    accent: P.flowerYellow,
    icon: '🐍',
    skillId: 'python',
  },
  {
    id: 'stall-sql',
    panelId: 'sql',
    title: 'Data & AI Laboratory',
    subtitle: 'SQL / T-SQL — schema design, medallion pipelines and star schemas.',
    x: 48,
    awningA: P.cargoGreen,
    awningB: P.wallCream,
    accent: P.cargoGreen,
    icon: '🗄️',
    skillId: 'sql',
  },
];

/* ------------------------------------------------------------------ */
/* The three project houses (locked)                                   */
/* ------------------------------------------------------------------ */

export type RoofShape = 'gable' | 'hip';

export interface HouseSpec {
  id: string;
  panelId: string;
  /** offset from the harbour island centre */
  lx: number;
  lz: number;
  /** facing quarter for placement (0=N,1=E,2=S,3=W style rotation) */
  quarter: 0 | 1 | 2 | 3;
  width: number;
  depth: number;
  wallH: number;
  roof: number;
  roofDark: number;
  roofShape: RoofShape;
  landmark: 'flag' | 'antenna';
  accent: number;
  title: string;
  subtitle: string;
  label: string;
  icon: string;
  projectId: string;
}

export const HOUSES: HouseSpec[] = [
  {
    id: 'house-go',
    panelId: 'go-microservices',
    lx: 4,
    lz: -4,
    quarter: 2,
    width: 9,
    depth: 7,
    wallH: 4,
    roof: P.roofBlue,
    roofDark: P.roofBlueDark,
    roofShape: 'gable',
    landmark: 'flag',
    accent: P.containerCyan,
    title: 'Go Microservices',
    subtitle: 'Real-Time Balance Visibility',
    label: 'Go Microservices — Real-Time Balance Visibility',
    icon: '⚙️',
    projectId: 'go-microservices',
  },
  {
    id: 'house-rxverify',
    panelId: 'rxverify',
    lx: 20,
    lz: -4,
    quarter: 2,
    width: 9,
    depth: 7,
    wallH: 4,
    roof: P.roofTerracotta,
    roofDark: P.roofTerracottaDark,
    roofShape: 'hip',
    landmark: 'antenna',
    accent: P.flowerYellow,
    title: 'RxVerify',
    subtitle: 'Digital Prescription Verification',
    label: 'RxVerify — Digital Prescription Verification',
    icon: '💊',
    projectId: 'rxverify',
  },
  {
    id: 'house-devops',
    panelId: 'devops-masterclass',
    lx: 4,
    lz: 16,
    quarter: 2,
    width: 9,
    depth: 7,
    wallH: 4,
    roof: P.roofBlue,
    roofDark: P.roofBlueDark,
    roofShape: 'hip',
    landmark: 'flag',
    accent: P.cargoGreen,
    title: 'Full-Stack AI DevOps Masterclass',
    subtitle: 'College open-elective coursework — practice material.',
    label: 'Full-Stack AI DevOps Masterclass',
    icon: '♾️',
    projectId: 'devops-masterclass',
  },
];

/* ------------------------------------------------------------------ */
/* Panels — projected from the audited content modules                 */
/* ------------------------------------------------------------------ */

export interface PanelLink {
  label: string;
  url: string;
}

export interface PanelSection {
  heading?: string;
  body?: string;
  bullets?: string[];
  chips?: string[];
  links?: PanelLink[];
}

export interface PanelDef {
  id: string;
  title: string;
  subtitle?: string;
  accent: number;
  sections: PanelSection[];
}

const AUTHORSHIP_SUBTITLE: Record<string, string> = {
  'extended-existing':
    'Productionized an existing Flask application — the original author is credited, not replaced.',
  course: 'College open-elective coursework — practice material, never presented as production experience.',
  collaborative: 'Collaborative college project — designed and implemented jointly with a partner.',
};

/** Build a stall panel from an audited skill entry — zero invented facts. */
function skillPanel(stall: StallSpec): PanelDef {
  const skill = (DATA_SKILLS as readonly Skill[]).find((s) => s.id === stall.skillId);
  const links: PanelLink[] = (skill?.experience.repositories ?? []).map((r) => ({
    label: r.name,
    url: r.url,
  }));
  return {
    id: stall.panelId,
    title: stall.title,
    subtitle: stall.subtitle,
    accent: stall.accent,
    sections: [
      {
        heading: 'What it is',
        body: skill?.summary ?? stall.subtitle,
        bullets: (skill?.experience.evidence ?? []).slice(0, 6),
        links: links.length ? links : undefined,
      },
    ],
  };
}

/** Build a house panel from an audited project entry — zero invented facts. */
function projectPanel(house: HouseSpec): PanelDef {
  const project = CLOUD_PROJECTS.find((p: Project) => p.id === house.projectId);
  if (!project) {
    throw new Error(`cloud-world-2: no content entry for project '${house.projectId}'`);
  }
  const links: PanelLink[] = project.github ? [{ label: 'Repository', url: project.github }] : [];
  const collab = (project.collaborators ?? []).map((c) => `${c.name} — ${c.role}`).join('; ');
  return {
    id: house.panelId,
    title: project.title,
    subtitle: AUTHORSHIP_SUBTITLE[project.authorship] ?? house.subtitle,
    accent: house.accent,
    sections: [
      { heading: 'What it is', body: project.description },
      {
        heading: 'My contribution',
        body: project.contribution,
        bullets: (project.results ?? []).slice(0, 4),
      },
      { heading: 'Limitations', bullets: [...project.limitations] },
      {
        heading: 'Built with',
        ...(collab ? { body: `With ${collab}.` } : {}),
        chips: [...project.technologies].slice(0, 12),
        links: links.length ? links : undefined,
      },
    ],
  };
}

/** Authored connective copy — the world's own voice, no portfolio claims. */
function worldPanel(id: string, title: string, subtitle: string, accent: number, sections: PanelSection[]): PanelDef {
  return { id, title, subtitle, accent, sections };
}

export const PANELS: Record<string, PanelDef> = {
  welcome: worldPanel(
    'welcome',
    'Welcome to Cloud World',
    'Explore the islands and discover my skills, experience and projects.',
    P.roofBlue,
    [
      {
        heading: 'The River Expedition',
        body:
          'A small voxel world built as a portfolio. The portfolio is the place: every skill and ' +
          'every project is pinned to something you can walk up to and read.',
        bullets: [
          'Walk with WASD or the arrow keys, hold Shift to run.',
          'Press E or click to open whatever is in front of you.',
          'Find the dock, board the Docker Whale, and sail to Welcome Harbour.',
        ],
      },
      {
        heading: 'Where to go first',
        body:
          'Follow the path off the starting island, step onto the arrival dock, and board the ' +
          'whale. The market runs along the harbour front; the village sits on the plateau behind it.',
      },
    ],
  ),
  controls: worldPanel('controls', 'How to Play', 'Everything the world needs from you.', P.roofTerracotta, [
    {
      heading: 'Land',
      bullets: [
        'WASD or arrow keys — walk',
        'Shift — run',
        'Space — jump',
        'E — interact with whatever is nearby',
        'Click — open a sign or building; click the ground to walk there',
        'Drag — orbit and pitch the camera; scroll — zoom',
      ],
    },
    {
      heading: 'Sea',
      bullets: [
        'Step onto a dock and press E to board the Docker Whale',
        'WASD steers the whale',
        'Press E alongside a landing to step ashore',
        'ESC closes the panel you are reading',
      ],
    },
  ]),
  whale: worldPanel('whale', 'The Docker Whale', 'Your vessel.', P.whaleBlue, [
    {
      heading: 'What it is',
      body:
        'A blue voxel whale carrying nothing but you. It is the only way between islands, and it ' +
        'will not beach itself — it stays inside the reef ring.',
    },
    {
      heading: 'Boarding',
      bullets: [
        'Walk to the end of any dock and press E to board.',
        'Steer with WASD; the whale turns to face where it is going.',
        'Press E alongside a landing to step ashore.',
      ],
    },
  ]),
  ...Object.fromEntries(STALLS.map((s) => [s.panelId, skillPanel(s)])),
  ...Object.fromEntries(HOUSES.map((h) => [h.panelId, projectPanel(h)])),
} as Record<string, PanelDef>;

/** Panels the visitor can browse with arrow keys, in HUD order. */
export const PANEL_ORDER = [
  'welcome',
  'controls',
  'docker',
  'cicd',
  'terraform',
  'k8s',
  'python',
  'sql',
  'go-microservices',
  'rxverify',
  'devops-masterclass',
  'whale',
];

/** Nearest berth to a world point — boarding + disembark target. */
export function nearestBerthOf(x: number, z: number): Berth {
  let best = BERTHS[0];
  let bestD = Infinity;
  for (const b of BERTHS) {
    const d = Math.hypot(b.x - x, b.z - z);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
};

/* ------------------------------------------------------------------ */
/* Hotspots & labels (assembled after geometry knows the ground)       */
/* ------------------------------------------------------------------ */

export function buildHotspots(surfaceY: (x: number, z: number) => number | null): {
  hotspots: Hotspot[];
  labels: WorldLabel[];
} {
  const hotspots: Hotspot[] = [];
  const labels: WorldLabel[] = [];

  const put = (id: string, panelId: string, label: string, x: number, z: number, r = 5) => {
    const g = surfaceY(x, z);
    if (g === null) return;
    hotspots.push({ id, panelId, label, x, y: g + 1, z, r });
  };

  /* starting island */
  put('hs-welcome', 'welcome', 'Welcome to Cloud World', -44, -45, 7);
  put('hs-controls', 'controls', 'How to Play', -46, -51, 6);

  /* whale berths — over water, fixed heights */
  for (const b of BERTHS) {
    hotspots.push({
      id: `hs-berth-${b.dockLabel}`,
      panelId: 'whale',
      label: `Docker Whale — press E to ${b.dockLabel === 'Arrival Dock' ? 'board' : 'dock'}`,
      x: b.x,
      y: DECK_SURFACE + 1,
      z: b.z,
      r: 7,
    });
  }

  /* harbour */
  put('hs-welcome-hall', 'welcome', 'Welcome Hall', HARBOUR_CX + 18, HARBOUR_CZ + 6, 8);
  put('hs-lighthouse', 'welcome', 'The Harbour Light', HARBOUR_CX - 20, HARBOUR_CZ - 8, 7);

  /* village entry */
  put('hs-village', 'welcome', 'Portfolio Village', HARBOUR_CX - 9, HARBOUR_CZ + 13, 8);

  /* the six stalls — hotspot 4 blocks west (x-4) and 8 blocks in front (z-8)
   * of the stall centre so it sits in the walkable approach corridor SOUTH of
   * the awning (awning projects 2 blocks to z=40..41, blocking z=38..45 via
   * nav clearance). z=36 is clear; reach 8 covers the stall face at z=42. */
  for (const s of STALLS) {
    const g = surfaceY(s.x - 4, STALL_ROW_Z - 8);
    const y = g === null ? DECK_SURFACE + 1 : g + 1;
    hotspots.push({
      id: `hs-${s.id}`,
      panelId: s.panelId,
      label: s.title,
      x: s.x - 4,
      y,
      z: STALL_ROW_Z - 8,
      r: STALL_REACH,
    });
  }

  /* the three houses: hotspot in front of each open front + floating label.
   * For quarter 2 (front faces south), the default 1-block offset sits in the
   * house's own clearance zone — step out 3 blocks to reach walkable ground. */
  for (const h of HOUSES) {
    const hx = HARBOUR_CX + h.lx;
    let hz = HARBOUR_CZ + h.lz + (h.quarter === 2 ? -h.depth / 2 - 1 : h.depth / 2 + 1);
    // quarter 2 (south-facing): clearance extends ~1.5 blocks south of front face;
    // step out 3 blocks to find walkable ground.
    if (h.quarter === 2) hz -= 2.5; // from -1 to -3.5 (3 blocks south of front)
    const g = surfaceY(hx, hz);
    if (g !== null) {
      hotspots.push({
        id: `hs-${h.id}`,
        panelId: h.panelId,
        label: h.label,
        x: hx,
        y: g + 1,
        z: hz,
        r: 8,
      });
      labels.push({ label: h.label, x: hx, y: g + 9, z: hz, accent: h.accent });
    }
  }

  return { hotspots, labels };
}
