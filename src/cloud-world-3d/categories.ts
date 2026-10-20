import { PORTFOLIO } from '../content';
import type { Skill } from '../content/types';

/**
 * Skills Valley category signs — 2026-10-16 redesign.
 *
 * The valley previously held one sign per skill (7 boards); the redesign
 * replaces them with FOUR category boards. The brief names skills (AWS,
 * Prometheus, Loki, Grafana, Minikube) that do not exist as standalone
 * entries in the authoritative inventory — they are aspects of the real
 * skills below (Terraform/AWS, Observability, Kubernetes), so nothing is
 * invented: the board text mentions the technology inside the skill it
 * belongs to, and the overlay lists the REAL skills with their real
 * summaries.
 *
 * Rule: every id in `skillIds` must resolve in PORTFOLIO.skills — a
 * non-resolving id drops the skill (and is logged in dev) rather than
 * rendering an invented entry. All 10 cloud skills + the two data skills
 * named by the brief (python, sql) stay reachable through their category.
 */

export interface CategorySkillEntry {
  id: string;
  name: string;
  summary: string;
  /** Real repository names behind this skill, from the content model. */
  repositories: string[];
  /** Experience classification, shown as a chip (never read as production). */
  experienceType: Skill['experience']['experienceType'];
}

export interface SkillCategory {
  /** Stable category id (marker/overlay resolution key). */
  id: string;
  /** Sign-face and overlay title. */
  title: string;
  /** One-line subtitle shown on the overlay under the category name. */
  tagline: string;
  skillIds: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'cloud-infrastructure',
    title: 'Cloud & Infrastructure',
    tagline: 'Infrastructure as code and version-controlled delivery (incl. AWS).',
    skillIds: ['terraform', 'git'],
  },
  {
    id: 'cicd-observability',
    title: 'CI/CD & Observability',
    tagline: 'Pipelines, health contracts and the Prometheus/Grafana/Loki stack.',
    skillIds: ['ci-cd', 'observability', 'health-checks'],
  },
  {
    id: 'containerization',
    title: 'Containerization',
    tagline: 'Containers from build to cluster (Docker, Compose, Kubernetes, Minikube).',
    skillIds: ['docker', 'compose', 'container-hardening', 'kubernetes'],
  },
  {
    id: 'dev-automation',
    title: 'Development & Automation',
    tagline: 'Provisioning automation, data scripting and analysis tooling.',
    skillIds: ['ansible', 'python', 'sql'],
  },
];
/**
 * Overlay data for one category, resolved live from PORTFOLIO.
 *
 * Non-resolving ids are skipped (never invented). The `covered` lines name
 * the technologies the brief asked about (AWS, Prometheus, Grafana, …) that
 * are practiced INSIDE a real skill, so the overlay can state the mapping
 * honestly instead of implying standalone skills exist.
 */
export function getCategoryEntries(categoryId: string): CategorySkillEntry[] {
  const cat = SKILL_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  const out: CategorySkillEntry[] = [];
  for (const id of cat.skillIds) {
    const s = PORTFOLIO.skills[id];
    if (!s) continue;
    out.push({
      id: s.id,
      name: s.name,
      summary: s.summary,
      repositories: (s.experience.repositories ?? []).map((r) => r.name),
      experienceType: s.experience.experienceType,
    });
  }
  return out;
}

/** Cover note lines per category — technologies folded into real skills.
 *  Updated 2026-10-17 after the RxVerify re-audit: Kubernetes and the
 *  Prometheus/Grafana/Loki stack are now PROJECT-demonstrated in RxVerify,
 *  so the old "training only" cover notes are gone. */
export const CATEGORY_COVER_NOTES: Record<string, string[]> = {
  'cloud-infrastructure': [
    'AWS infrastructure is practiced inside Terraform / AWS (8 resources, terraform validate-passed).',
  ],
  'cicd-observability': [
    'GitHub Actions pipelines (plus Jenkinsfile and GitLab CI equivalents) are practiced inside CI/CD.',
    'Prometheus, Grafana and Loki are practiced inside Observability — deployed on Minikube with a provisioned RxVerify dashboard.',
  ],
  containerization: [
    'Minikube cluster workflows (kustomize deploys, rolling updates, rollback) are practiced inside Kubernetes.',
  ],
  'dev-automation': [],
};
