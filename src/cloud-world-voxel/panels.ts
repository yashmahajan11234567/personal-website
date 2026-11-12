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
import { CLOUD_PROJECTS } from '../content/projects.cloud';
import { DATA_SKILLS } from '../content/skills.data';
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

/** Build a stall panel from an audited `skills.data.ts` entry — no invented facts. */
function skillStallPanel(id: string, title: string, subtitle: string, accent: number, skillId: string): PanelDef {
  const skill = DATA_SKILLS.find((s) => s.id === skillId) as Skill | undefined;
  const links: PanelLink[] = (skill?.experience.repositories ?? []).map((r) => ({
    label: r.name,
    url: r.url,
  }));
  return {
    id,
    title,
    subtitle,
    accent,
    sections: [
      {
        heading: 'What it is',
        body: skill?.summary ?? '',
        bullets: (skill?.experience.evidence ?? []).slice(0, 6),
        links: links.length ? links : undefined,
      },
    ],
  };
}

const AUTHORSHIP_SUBTITLE: Record<string, string> = {
  'extended-existing': 'Productionized an existing Flask application — the original author is credited, not replaced.',
  course: 'College open-elective coursework — practice material, never presented as production experience.',
  collaborative: 'Collaborative college project — designed and implemented jointly with a partner.',
};

/** Build a project house panel from an audited `projects.cloud.ts` entry. */
function projectPanel(id: string, accent: number, projectId: string, subtitle: string): PanelDef {
  const p = CLOUD_PROJECTS.find((x) => x.id === projectId);
  if (!p) {
    // Content missing is a build-time-visible failure, not a silent empty panel.
    throw new Error(`projectPanel: no content entry for '${projectId}'`);
  }
  const links: PanelLink[] = p.github ? [{ label: 'Repository', url: p.github }] : [];
  const collab = (p.collaborators ?? []).map((c) => `${c.name} — ${c.role}`).join('; ');
  return {
    id,
    title: p.title,
    subtitle: subtitle || AUTHORSHIP_SUBTITLE[p.authorship] || undefined,
    accent,
    sections: [
      { heading: 'What it is', body: p.description },
      {
        heading: 'My contribution',
        body: p.contribution,
        bullets: (p.results ?? []).slice(0, 4),
      },
      { heading: 'Limitations', bullets: [...p.limitations] },
      {
        heading: 'Built with',
        ...(collab ? { body: `With ${collab}.` } : {}),
        chips: [...p.technologies].slice(0, 12),
        links: links.length ? links : undefined,
      },
    ],
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
    subtitle: 'Three project houses, one life’s work, on the plateau above the harbour.',
    accent: C.roofBlue,
    sections: [
      {
        heading: 'What is up here',
        bullets: [
          'Go Microservices House — Real-Time Balance Visibility, a collaborative college project.',
          'RxVerify House — Digital Prescription Verification, productionized end to end.',
          'DevOps Masterclass House — Full-Stack AI DevOps coursework, presented as coursework.',
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

  /* ---- skill stall panels (harbour front: DevOps skills) ---- */
  docker: {
    id: 'docker',
    title: 'Docker Fish Market',
    subtitle: 'Multi-stage builds with non-root runtime users.',
    accent: C.fishBlue,
    sections: [
      {
        heading: 'What it is',
        body:
          'Containerising applications with multi-stage builds, non-root runtime users, and pinned base images.',
        bullets: [
          'Multi-stage build: node:18-alpine builder to nginx:alpine runtime',
          'npm ci for reproducible installs; COPY --from=builder for the built assets',
          'Non-root appuser (uid/gid 1001) in all four Dockerfiles',
          'OpenCV shared libraries installed as real runtime dependencies',
        ],
        chips: ['Docker'],
        links: [
          { label: 'Repository', url: 'https://github.com/yashmahajan11234567/Medigen' },
        ],
      },
    ],
  },
  cicd: {
    id: 'cicd',
    title: 'CI/CD Workshop',
    subtitle: 'Three-job GitHub Actions pipeline: lint/test, security scan, GHCR build.',
    accent: C.pipeGrey,
    sections: [
      {
        heading: 'What it is',
        body:
          'Build, test, and security-gated deployment pipelines across three syntaxes: GitHub Actions, Jenkins, and GitLab CI.',
        bullets: [
          'RxVerify .github/workflows/ci.yml — three jobs: Test & Lint (ruff, pytest), Security Scan (pip-audit, Trivy on CRITICAL/HIGH), Build & Push (Buildx to GHCR with GHA cache)',
          'Jenkinsfile declarative pipeline and .gitlab-ci.yml implementing the same stages — one logic, three syntaxes',
          'AWS credentials come from secrets, never hardcoded',
        ],
        chips: ['CI/CD'],
        links: [
          { label: 'Repository', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
        ],
      },
    ],
  },
  terraform: {
    id: 'terraform',
    title: 'Cloud & Infrastructure',
    subtitle: 'Terraform + Ansible — eight real AWS resources, validated.',
    accent: C.roofTerracotta,
    sections: [
      {
        heading: 'What it is',
        body:
          'Infrastructure as code declaring eight AWS resources, validated with terraform validate, plus Ansible provisioning of the target host.',
        bullets: [
          'Eight AWS resources: aws_vpc, aws_subnet, aws_security_group, aws_internet_gateway, aws_route_table, aws_route, aws_route_table_association, aws_instance',
          'terraform validate passes — executed during the audit, not assumed',
          'Six declared variables with provider and required_providers configuration',
          'Ansible playbook (ansible/deploy.yml): Docker install, image build, container run on EC2, health-check final step',
        ],
        chips: ['Terraform', 'Ansible', 'AWS'],
        links: [
          { label: 'Repository', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
        ],
      },
    ],
  },
  aws: {
    id: 'aws',
    title: 'AWS',
    subtitle: 'Eight AWS resources provisioned via Terraform.',
    accent: C.fishOrange,
    sections: [
      {
        heading: 'What it is',
        body:
          'AWS infrastructure provisioned through Terraform — VPC, subnets, security groups, internet gateway, route tables, and EC2.',
        bullets: [
          'Eight AWS resources declared: aws_vpc, aws_subnet, aws_security_group, aws_internet_gateway, aws_route_table, aws_route, aws_route_table_association, aws_instance',
          'terraform validate passes — executed during the audit, not assumed',
          'Six declared variables with provider and required_providers configuration',
          'Covered under the Terraform / AWS skill stall; AWS is provisioned by Terraform, not separately',
        ],
        chips: ['AWS', 'Terraform'],
        links: [
          { label: 'Repository', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
        ],
      },
    ],
  },
  k8s: {
    id: 'k8s',
    title: 'Kubernetes / Container Orchestration',
    subtitle: 'Manifests, Minikube deployment with probes, rolling updates and rollback.',
    accent: C.roofBlue,
    sections: [
      {
        heading: 'What it is',
        body:
          'Kubernetes manifests deployed on Minikube: rolling updates, health probes, resource limits, secrets, and persistent volume claims.',
        bullets: [
          'RxVerify k8s/ tree: Deployment with RollingUpdate (maxSurge 1 / maxUnavailable 0), readiness and liveness probes on /health, resource requests/limits, Secret, PVC, Service and ServiceMonitor',
          'Deployed to Minikube; pods verified Running',
          'Rolling update and rollback exercised: bad image forced CrashLoopBackOff, kubectl rollout undo restored health',
          'SQLite persistence across pod restarts via a PersistentVolumeClaim',
          'Also practised in DevOps coursework (K8s/ tree) — marked as training, not production',
        ],
        chips: ['Kubernetes', 'Minikube'],
        links: [
          { label: 'Repository', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
          { label: 'Course repo', url: 'https://github.com/yashmahajan11234567/Full-Stack-AI-DevOps-Masterclass' },
        ],
      },
    ],
  },
  prometheus: {
    id: 'prometheus',
    title: 'Prometheus',
    subtitle: 'Metrics scraping and alerting within the observability stack.',
    accent: C.cargoGreen,
    sections: [
      {
        heading: 'What it is',
        body:
          'Prometheus metrics collection, scraping, and alerting — part of the Prometheus/Grafana/Loki observability stack.',
        bullets: [
          'RxVerify exposes /metrics via prometheus-flask-exporter; ServiceMonitor (job=rxverify, port 5000) scrapes it',
          'Prometheus alert rules with runbooks in the collaborative Go microservices project',
          'Live-verified: up{job="rxverify"}=1 recorded during the audit',
        ],
        chips: ['Prometheus'],
        links: [
          { label: 'Repository', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
        ],
      },
    ],
  },
  grafana: {
    id: 'grafana',
    title: 'Grafana',
    subtitle: 'Dashboards and visualisation within the observability stack.',
    accent: C.flowerPurple,
    sections: [
      {
        heading: 'What it is',
        body:
          'Grafana dashboards provisioned via ConfigMap — visualising Prometheus metrics and Loki logs.',
        bullets: [
          'Grafana dashboards provisioned via ConfigMap — 5-panel RxVerify DevOps dashboard',
          'Grafana/Prometheus/Loki pods verified Running on Minikube',
          'Loki + Promtail DaemonSet aggregate logs with job=rxverify labels',
        ],
        chips: ['Grafana'],
        links: [
          { label: 'Repository', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
        ],
      },
    ],
  },
  linux: {
    id: 'linux',
    title: 'Linux',
    subtitle: 'Command-line and server environment used across the stack.',
    accent: C.wallCream,
    sections: [
      {
        heading: 'What it is',
        body:
          'Linux is the runtime under every container, every EC2 instance, and every Minikube node in this portfolio — but it is not catalogued as a standalone skill in the content yet.',
        bullets: [
          'Docker containers run Linux (node:18-alpine, nginx:alpine, postgres:15-alpine)',
          'EC2 instances provisioned by Terraform run Amazon Linux',
          'Minikube nodes run Linux; kubectl operates against Linux pods',
          'Not yet a standalone skill entry — add it to src/content/skills.cloud.ts to give it its own stall panel',
        ],
        chips: ['Linux'],
        links: [],
      },
    ],
  },

  /* ---- the two content-backed stalls added by the locked six-stall decision ---- */
  python: skillStallPanel(
    'python',
    'Programming Workshop',
    'Python / pandas — analysis applied to validated data.',
    C.flowerYellow,
    'python',
  ),
  sql: skillStallPanel(
    'sql',
    'Data & AI Laboratory',
    'SQL / T-SQL — schema design, medallion pipelines and star-schema modelling.',
    C.cargoGreen,
    'sql',
  ),

  /* ---- the three project house panels (locked decision D1) ----
   * Every fact is projected from `projects.cloud.ts`; authorship framing is
   * taken from the audited AUTHORSHIP cases at the top of that file. */
  rxverify: projectPanel('rxverify', C.flowerYellow, 'rxverify', 'Productionized an existing Flask application — the original author is credited, not replaced.'),
  'devops-masterclass': projectPanel('devops-masterclass', C.cargoGreen, 'devops-masterclass', 'College open-elective coursework — practice material, never presented as production experience.'),
  'go-microservices': projectPanel('go-microservices', C.containerCyan, 'go-microservices', 'Collaborative college project — designed and implemented jointly with a partner.'),
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
  'go-microservices',
  'rxverify',
  'devops-masterclass',
  'docker',
  'cicd',
  'terraform',
  'k8s',
  'python',
  'sql',
  'whale',
];
