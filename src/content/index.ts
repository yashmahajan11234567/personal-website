/**
 * Assembled content index and integrity validation.
 *
 * `PORTFOLIO` is the single entry point every consumer uses. A renderer asks it
 * for a world, a skill, or a project by id — it never imports the individual
 * data files and never hardcodes a portfolio fact.
 *
 * `validateContent()` is exported so integrity is checkable rather than assumed.
 * It runs in development and is covered by the content-model test, so a
 * duplicate id or a dangling world reference fails loudly instead of surfacing
 * later as a missing panel in the game.
 */

import { CLOUD_PROJECTS } from './projects.cloud';
import { CLOUD_SKILLS } from './skills.cloud';
import { DATA_PROJECTS } from './projects.data';
import { DATA_SKILLS } from './skills.data';
import type { PortfolioContent, Project, Skill, WorldConfig, WorldId } from './types';
import { WORLD_CONFIGS } from './worlds.data';

/**
 * Index an array by id, failing loudly on a duplicate.
 *
 * A silent last-write-wins would let two entries claim the same id and the
 * integrity check would still pass, so the collision is raised here instead.
 */
function indexById<T extends { id: string }>(items: readonly T[], label: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    if (out[item.id] !== undefined) {
      throw new Error(`Duplicate ${label} id: "${item.id}"`);
      }
    out[item.id] = item;
    }
  return out;
  }

const ALL_SKILLS: readonly Skill[] = [...DATA_SKILLS, ...CLOUD_SKILLS];
const ALL_PROJECTS: readonly Project[] = [...DATA_PROJECTS, ...CLOUD_PROJECTS];

const SKILLS_BY_ID = indexById(ALL_SKILLS, 'skill');
const PROJECTS_BY_ID = indexById(ALL_PROJECTS, 'project');

const WORLDS_BY_ID: Readonly<Record<WorldId, WorldConfig>> = indexById(
  WORLD_CONFIGS,
  'world',
  ) as Readonly<Record<WorldId, WorldConfig>>;

export const PORTFOLIO: PortfolioContent = {
  worlds: WORLDS_BY_ID,
  skills: SKILLS_BY_ID,
  projects: PROJECTS_BY_ID,
  };

/** Every skill in a world, in progression order, with the optional branch last. */
export function skillsForWorld(world: WorldId): readonly Skill[] {
  const config = PORTFOLIO.worlds[world];
  const ordered = config.skillOrder.map((id) => PORTFOLIO.skills[id]);
  const branch = config.optionalBranch
  ? [PORTFOLIO.skills[config.optionalBranch.skillId]]
  : [];
  return [...ordered, ...branch].filter((skill): skill is Skill => skill !== undefined);
  }

/** Every project in a world, in progression order. */
export function projectsForWorld(world: WorldId): readonly Project[] {
  const config = PORTFOLIO.worlds[world];
  return config.projectOrder
  .map((id) => PORTFOLIO.projects[id])
  .filter((project): project is Project => project !== undefined);
  }

/** The optional-branch skill for a world, if it has one. */
export function branchSkillForWorld(world: WorldId): Skill | undefined {
  const branch = PORTFOLIO.worlds[world].optionalBranch;
  return branch ? PORTFOLIO.skills[branch.skillId] : undefined;
  }

/** A single integrity problem found by {@link validateContent}. */
export interface ContentIssue {
  readonly kind:
  | 'duplicate-id'
  | 'unknown-world'
  | 'dangling-skill-ref'
  | 'dangling-project-ref'
  | 'world-mismatch'
  | 'missing-collaborator'
  | 'training-without-context'
  | 'training-inside-project'
        /*
         * Added after the audit measured a live `href="Bluestock_fintech,
         * Sql-data-warehouse"` in the shipped DOM. A bare repo NAME was the declared
         * type, so a broken link was type-valid and nothing flagged it. This rule
         * makes a non-absolute repository URL a content issue rather than a silent
         * broken anchor.
         */
  | 'bad-repository-url'
        /* Added with the dashboard gallery: previews must be real committed files. */
  | 'bad-dashboard-preview';
  readonly detail: string;
  }

/**
 * Check every structural rule the content model depends on.
 *
 * Returns a list rather than throwing so a caller can report all problems at
 * once; an empty list means the content set is internally consistent.
 */
export function validateContent(content: PortfolioContent = PORTFOLIO): readonly ContentIssue[] {
  const issues: ContentIssue[] = [];
  const skillIds = new Set(Object.keys(content.skills));
  const projectIds = new Set(Object.keys(content.projects));

  // Duplicate ids: the indexer throws, but a hand-edited record could bypass it.
  for (const [id, skill] of Object.entries(content.skills)) {
    if (skill.id !== id) {
      issues.push({ kind: 'duplicate-id', detail: `skill key "${id}" has id "${skill.id}"` });
      }
    }
  for (const [id, project] of Object.entries(content.projects)) {
    if (project.id !== id) {
      issues.push({ kind: 'duplicate-id', detail: `project key "${id}" has id "${project.id}"` });
      }
    }

  for (const world of Object.values(content.worlds)) {
    // Progression references must resolve, and must belong to this world.
    for (const id of world.skillOrder) {
      if (!skillIds.has(id)) {
        issues.push({ kind: 'dangling-skill-ref', detail: `world "${world.id}" -> skill "${id}"` });
        } else if (content.skills[id].world !== world.id) {
        issues.push({
            kind: 'world-mismatch',
            detail: `world "${world.id}" lists skill "${id}" belonging to "${content.skills[id].world}"`,
            });
        }
      }
    for (const id of world.projectOrder) {
      if (!projectIds.has(id)) {
        issues.push({ kind: 'dangling-project-ref', detail: `world "${world.id}" -> project "${id}"` });
        } else if (content.projects[id].world !== world.id) {
        issues.push({
            kind: 'world-mismatch',
            detail: `world "${world.id}" lists project "${id}" belonging to "${content.projects[id].world}"`,
            });
        }
      }
    if (world.optionalBranch) {
      const { skillId, afterSkillId } = world.optionalBranch;
      if (!skillIds.has(skillId)) {
        issues.push({ kind: 'dangling-skill-ref', detail: `branch skill "${skillId}"` });
        } else if (content.skills[skillId].world !== world.id) {
        issues.push({
            kind: 'world-mismatch',
            detail: `branch skill "${skillId}" belongs to "${content.skills[skillId].world}"`,
            });
        }
      if (!world.skillOrder.includes(afterSkillId)) {
        issues.push({
            kind: 'dangling-skill-ref',
            detail: `branch anchor "${afterSkillId}" is not on the main path`,
            });
        }
      }
    }

  for (const skill of Object.values(content.skills)) {
    if (!content.worlds[skill.world]) {
      issues.push({ kind: 'unknown-world', detail: `skill "${skill.id}" -> "${skill.world}"` });
      }
    // A training claim without context is an unsupported claim.
    const needsContext =
    skill.experience.experienceType === 'TRAINING' ||
    skill.experience.experienceType === 'BOTH';
    if (needsContext && !skill.experience.trainingContext) {
      issues.push({
          kind: 'training-without-context',
          detail: `skill "${skill.id}" is ${skill.experience.experienceType} with no trainingContext`,
          });
      }
        /*
         * EVERY REPOSITORY URL MUST BE ABSOLUTE.
         *
         * This is the regression guard for a real shipped defect. The previous field
         * was `repository: string` holding a display NAME, and `InfoPanel` put it
         * straight into an `href` — so every skill link in the build pointed at a
         * comma-separated fragment. Requiring an absolute http(s) URL here means the
         * same mistake fails validation instead of producing a broken anchor that
         * looks fine in a screenshot.
         */
    for (const repo of skill.experience.repositories ?? []) {
      if (!/^https?:\/\/\S+$/.test(repo.url)) {
        issues.push({
            kind: 'bad-repository-url',
            detail: `skill "${skill.id}" repository "${repo.name}" has non-absolute url "${repo.url}"`,
            });
        }
      }
    }

  for (const project of Object.values(content.projects)) {
    if (!content.worlds[project.world]) {
      issues.push({ kind: 'unknown-world', detail: `project "${project.id}" -> "${project.world}"` });
      }
    // Shared work must name who else was involved, and say what they did.
    const sharesAuthorship =
    project.authorship === 'collaborative' || project.authorship === 'extended-existing';
    if (sharesAuthorship && (!project.collaborators || project.collaborators.length === 0)) {
      issues.push({
          kind: 'missing-collaborator',
          detail: `project "${project.id}" is ${project.authorship} with no collaborators`,
          });
      }
        /*
         * DASHBOARD PREVIEWS MUST BE REAL COMMITTED FILES
         *
         * The brief forbade generating fake dashboard screenshots, so the rule that
         * enforces it is structural: a preview must be a repo-absolute path to a
         * committed image, never an http(s) URL (which would mean a runtime
         * third-party dependency) and never a bare filename. The Phase 2 suite
         * additionally asserts each path exists on disk with the measured byte size.
         */
    const seenDashboardIds = new Set<string>();
    for (const dash of project.dashboards ?? []) {
      if (seenDashboardIds.has(dash.id)) {
        issues.push({
            kind: 'bad-dashboard-preview',
            detail: `project "${project.id}" repeats dashboard id "${dash.id}"`,
            });
        }
      seenDashboardIds.add(dash.id);
      if (!/^\/assets\/[\w./-]+\.(png|jpg|jpeg|webp)$/.test(dash.previewPath)) {
        issues.push({
            kind: 'bad-dashboard-preview',
            detail: `project "${project.id}" dashboard "${dash.id}" previewPath "${dash.previewPath}" is not a committed image path`,
            });
        }
      if (dash.technology.trim() === '') {
        issues.push({
            kind: 'bad-dashboard-preview',
            detail: `project "${project.id}" dashboard "${dash.id}" has no technology`,
            });
        }
      }
    }

  return issues;
  }

/**
 * A TRAINING skill must never appear inside a project workflow.
 *
 * Enforced here rather than left to review, because the audit's hardest rule is
 * that coursework must not read as production experience — and a skill leaking
 * into a project flow is exactly how that happens.
 */
export function trainingSkillsInProjects(content: PortfolioContent = PORTFOLIO): readonly string[] {
  const training = new Set(
    Object.values(content.skills)
    .filter((skill) => skill.experience.experienceType === 'TRAINING')
    .map((skill) => skill.name.toLowerCase()),
    );
  if (training.size === 0) return [];

  const offenders: string[] = [];
  for (const project of Object.values(content.projects)) {
    const haystack = [
      ...project.workflow.stages.map((stage) => `${stage.label} ${stage.detail ?? ''}`),
      ...project.technologies,
      ]
    .join(' ')
    .toLowerCase();
    for (const name of training) {
      if (haystack.includes(name)) offenders.push(`${project.id}: ${name}`);
      }
    }
  return offenders;
  }