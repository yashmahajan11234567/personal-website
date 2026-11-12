/**
 * Panels — what the visitor reads when they walk up to a sign or a building.
 *
 * THE HARD RULE: no content is written here. Every panel is projected from the
 * portfolio's existing content modules, which are the audited single source of
 * truth (`src/content/*`, `src/experience/experience.data.ts`). If a fact is
 * not in those modules it does not appear in the world — that is what keeps the
 * village defensible when someone questions a claim.
 *
 * Only the world's own connective copy (the welcome text, the controls sign and
 * the whale's description) is authored here, and it makes no claims about the
 * portfolio's contents.
 */
import { PORTFOLIO, projectsForWorld, skillsForWorld } from '../content';
import { DESTINATIONS, DEST_ORDER } from '../experience/experience.data';
import type { Skill, SkillCategory } from '../content/types';
import { C } from './palette';

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
  /** voxel accent used on this building's sign plaque */
  accent: number;
  sections: PanelSection[];
}

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  storage: 'Storage & modelling',
  pipeline: 'Pipelines & orchestration',
  quality: 'Data quality & testing',
  analysis: 'Analysis & analytics',
  delivery: 'Delivery & automation',
  infrastructure: 'Infrastructure as code',
  observability: 'Observability & operations',
};

function groupSkills(skills: readonly Skill[]): PanelSection[] {
  const out: PanelSection[] = [];
  const seen = new Set<SkillCategory>();
  for (const s of skills) {
    if (seen.has(s.category)) continue;
    seen.add(s.category);
    const group = skills.filter((x) => x.category === s.category);
    out.push({
      heading: CATEGORY_LABEL[s.category],
      bullets: group.map((x) => `${x.name} — ${x.summary}`),
    });
  }
  return out;
}

function projectSection(p: (typeof PORTFOLIO.projects)[string]): PanelSection {
  const chips = [...p.technologies].slice(0, 10);
  const links: PanelLink[] = [];
  if (p.github) links.push({ label: 'Repository', url: p.github });
  if (p.demo) links.push({ label: 'Demo', url: p.demo });
  return {
    heading: p.title,
    body: p.contribution,
    bullets: (p.results ?? []).slice(0, 3),
    chips,
    links: links.length ? links : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* The panels themselves                                               */
/* ------------------------------------------------------------------ */

export const PANELS: Record<string, PanelDef> = {
  welcome: {
    id: 'welcome',
    title: 'Welcome to Cloud World',
    subtitle: 'Explore the islands and discover my skills, experience and projects.',
    accent: C.roofBlue,
    sections: [
      {
        heading: 'The River Expedition',
        body:
          'A small voxel world built as a portfolio. Nothing here is a web page with 3D ' +
          'objects dropped on top of it — the portfolio is the place. Every skill, every ' +
          'project and every role is pinned to something you can walk up to and read.',
        bullets: [
          'Walk with WASD or the arrow keys, hold Shift to run.',
          'Press E or click to open whatever is in front of you.',
          'Find the dock, board the Docker Whale, and sail to Welcome Harbour.',
        ],
      },
      {
        heading: 'Where to go first',
        body:
          'Follow the path north-east off the starting island, step onto the arrival dock, ' +
          'and board the whale. The village is on the elevated plateau behind the harbour.',
      },
    ],
  },

  controls: {
    id: 'controls',
    title: 'How to Play',
    subtitle: 'Everything the world needs from you.',
    accent: C.roofTerracotta,
    sections: [
      {
        heading: 'Land',
        bullets: [
          'WASD or arrow keys — walk',
          'Shift — run',
          'E — interact with whatever is nearby',
          'Click — open a sign or building',
          'Scroll / pinch — zoom the camera',
        ],
      },
      {
        heading: 'Sea',
        bullets: [
          'Step onto a dock and press E to board the Docker Whale',
          'WASD steers the whale',
          'Press E at any landing to step ashore',
          'ESC closes the panel you are reading',
        ],
      },
      {
        heading: 'Touch',
        bullets: [
          'Left stick — walk',
          'Drag the world — orbit the camera',
          'Interact button — the same as E',
        ],
      },
    ],
  },

  harbour: {
    id: 'harbour',
    title: 'Welcome Harbour',
    subtitle: 'Docks, market and the light that guides you in.',
    accent: C.roofTerracotta,
    sections: [
      {
        heading: 'The harbour',
        body:
          'Everything you need arrives by water: the quay, the market stalls, the boat sheds ' +
          'and the lighthouse on the headland. Moor at any berth and press E to step ashore.',
        bullets: [
          'The pier runs west out of the harbour floor — the whale moors off its outer end.',
          'The lighthouse marks the seaward approach; you can see it before you see the island.',
          'The stone stair east of the harbour climbs to the village.',
        ],
      },
    ],
  },

  village: {
    id: 'village',
    title: 'Portfolio Village',
    subtitle: 'Five houses, one life’s work, on the plateau above the harbour.',
    accent: C.roofBlue,
    sections: [
      {
        heading: 'What is up here',
        bullets: [
          'Skills House — every skill on the record, in learning order.',
          'Projects House — completed work with its real results and limits.',
          'Experience House — roles, dates and responsibilities.',
          'Cloud / DevOps House — containers, pipelines, infrastructure, observability.',
          'Data / AI House — analytics, modelling, pipelines and dashboards.',
        ],
      },
      {
        heading: 'How to read a house',
        body:
          'Each house has an open front. Walk up to a showcase and press E, or click the ' +
          'building, to open its panel. Nothing in the panel is written by the world — every ' +
          'line is projected from the portfolio content that has been verified against the ' +
          'repositories.',
      },
    ],
  },

  whale: {
    id: 'whale',
    title: 'The Docker Whale',
    subtitle: 'Your vessel.',
    accent: C.whaleBlue,
    sections: [
      {
        heading: 'What it is',
        body:
          'A blue voxel whale carrying a stack of shipping containers. It is the only way ' +
          'between islands, and it will not beach itself — it stays inside the reef ring.',
      },
      {
        heading: 'Boarding',
        bullets: [
          'Walk to the end of any dock and press E to board.',
          'Steer with WASD; the whale turns to face where it is going.',
          'Press E alongside a landing to step ashore.',
        ],
      },
    ],
  },

  skills: {
    id: 'skills',
    title: 'Skills House',
    subtitle: 'Every skill on the record, in the order it was actually learned.',
    accent: C.roofBlue,
    sections: [],
  },

  experience: {
    id: 'experience',
    title: 'Experience House',
    subtitle: 'Roles, dates and responsibilities exactly as the certificates state them.',
    accent: C.roofTerracotta,
    sections: [],
  },

  projects: {
    id: 'projects',
    title: 'Projects House',
    subtitle: 'Completed work, with what was measured and what is still limited.',
    accent: C.roofBlue,
    sections: [],
  },

  cloud: {
    id: 'cloud',
    title: 'Cloud / DevOps House',
    subtitle: 'Containers, pipelines, infrastructure as code and observability.',
    accent: C.whaleBlue,
    sections: [],
  },

  data: {
    id: 'data',
    title: 'Data / AI House',
    subtitle: 'Analytics, relational modelling, pipelines and dashboards.',
    accent: C.cargoGreen,
    sections: [],
  },
};

/* ---- fill the content-backed panels from the audited modules ---- */

PANELS.skills.sections = [
  {
    heading: 'Cloud & DevOps',
    bullets: skillsForWorld('cloud').map((s) => `${s.name} — ${s.summary}`),
    chips: skillsForWorld('cloud').map((s) => s.name),
  },
  {
    heading: 'Data',
    bullets: skillsForWorld('data').map((s) => `${s.name} — ${s.summary}`),
    chips: skillsForWorld('data').map((s) => s.name),
  },
  ...groupSkills(skillsForWorld('data')),
];

PANELS.experience.sections = DEST_ORDER.map((id) => {
  const d = DESTINATIONS.find((x) => x.id === id);
  if (!d) return { heading: id } as PanelSection;
  const bullets: string[] = [];
  if (d.highlights) {
    for (const h of d.highlights) bullets.push(typeof h === 'string' ? h : `${h.label}: ${h.text}`);
  }
  if (d.pathways) {
    for (const p of d.pathways) bullets.push(`${p.name} — ${p.desc}`);
  }
  const chips: string[] = [];
  if (d.skills) for (const g of d.skills) chips.push(...g.items);
  return {
    heading: [d.title, d.role, d.dates].filter(Boolean).join(' · '),
    body: d.overview,
    bullets: bullets.length ? bullets.slice(0, 6) : undefined,
    chips: chips.length ? chips : undefined,
  };
});

PANELS.projects.sections = [
  ...projectsForWorld('cloud').map(projectSection),
  ...projectsForWorld('data').map(projectSection),
];

PANELS.cloud.sections = [
  ...projectsForWorld('cloud').map(projectSection),
  {
    heading: 'Skills evidenced in this work',
    bullets: skillsForWorld('cloud').map((s) => `${s.name} — ${s.summary}`),
  },
];

PANELS.data.sections = [
  ...projectsForWorld('data').map(projectSection),
  {
    heading: 'Skills evidenced in this work',
    bullets: skillsForWorld('data').map((s) => `${s.name} — ${s.summary}`),
  },
];

/** Panels the visitor can open, in the order the HUD lists them. */
export const PANEL_ORDER = [
  'welcome',
  'controls',
  'harbour',
  'village',
  'skills',
  'experience',
  'projects',
  'cloud',
  'data',
  'whale',
];
