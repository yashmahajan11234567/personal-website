/**
 * Portfolio content model — type definitions.
 *
 * This is the contract between portfolio CONTENT and whatever renders it. The
 * eventual Phaser world, the accessible DOM mirror, and any project panel are
 * all consumers of these types. None of them may hardcode a skill name, a
 * project title, or an author.
 *
 * The pattern is the existing one. `cinematic/data/boardContent.ts` states the
 * rule this file exists to generalise: *"Everything the viewer reads as content
 * lives here, not in pixels and not in JSX, so it can be replaced without
 * touching artwork."* The hero separates copy from pixels; this separates
 * portfolio facts from rendering.
 *
 * WHY THESE FIELDS ARE SHAPED THIS WAY
 *
 * `experienceType`, `authorship`, and `limitations` are NOT optional metadata.
 * Every claim in this portfolio has to survive a technical interview, and the
 * audit found three specific ways a portfolio overstates itself:
 *
 *   1. Presenting coursework as production experience. Hence `experienceType`:
 *      Kubernetes is real and practised, and it is TRAINING. The type makes
 *      saying otherwise a type error rather than a judgement call.
 *   2. Presenting collaborative work as solo. Hence `authorship` plus
 *      `collaborators`: the Go microservices project is joint work, and the
 *      person who must be credited is a required field, not a comment.
 *   3. Presenting broken things as working. Hence `limitations`: the SQL
 *      warehouse will not run, and saying so is a required field rather than
 *      something a future author can quietly drop.
 *
 * These are required (not `?`) on purpose. Making honesty the path of least
 * resistance is the entire point of encoding it in types.
 */

/** The two playable worlds. Matches the hero's existing `Path` values. */
export type WorldId = 'data' | 'cloud';

/**
 * How the skill was actually exercised.
 *
 * PROJECT  — demonstrated in a repository, with implementation evidence.
 * TRAINING — learned and practised in coursework or labs. Real skill, but no
 *            project demonstrates it. Never place these inside a project.
 * BOTH     — coursework AND project implementation.
 * UNCERTAIN— evidence exists but is too thin to classify. Kept so a claim can
 *            be recorded honestly instead of being forced into a bucket.
 */
export type ExperienceType = 'PROJECT' | 'TRAINING' | 'BOTH' | 'UNCERTAIN';

/**
 * Who built the project.
 *
 * solo               — authored alone.
 * collaborative      — joint work. `collaborators` must name the other party.
 * extended-existing  — took over someone else's application. `collaborators`
 *                      names the original author; `contribution` must describe
 *                      only the work actually added.
 * course             — coursework or a learning exercise, not production work.
 */
export type Authorship =
  | 'solo'
  | 'collaborative'
  | 'extended-existing'
  | 'course';

/** Grouping used for world layout and for the skill index. */
export type SkillCategory =
  | 'storage'
  | 'pipeline'
  | 'quality'
  | 'analysis'
  | 'delivery'
  | 'infrastructure'
  | 'observability';

/**
 * How a skill is drawn in the world.
 *
 * This is presentation metadata only — it tells a renderer WHAT KIND of object
 * to build, never what to write on it. All wording comes from `Skill`.
 */
export interface SkillVisual {
  /**
   * Object archetype. A renderer maps this to geometry; it is not a component
   * name and carries no import.
   */
  readonly kind:
    | 'database-terminal'
    | 'pipeline-vessel'
    | 'inspection-arch'
    | 'code-station'
    | 'text-parser'
    | 'selector-gate'
    | 'dashboard-screen'
    | 'repository-terminal'
    | 'build-stage'
    | 'pulse-monitor'
    | 'orchestration-deck'
    | 'pipeline-gantry'
    | 'infra-builder'
    | 'automation-station'
    | 'training-ground'
    | 'telemetry-array'
    | 'sealed-vault';
  /**
   * `solid` for project-demonstrated skills; `scaffold` for TRAINING.
   *
   * This distinction is load-bearing, not decorative. A training station drawn
   * in the same solid style as a project object reads as project experience
   * before any label is read.
   */
  readonly treatment: 'solid' | 'scaffold';
}

/** Evidence backing a skill claim, plus training context where relevant. */
export interface SkillExperience {
  readonly experienceType: ExperienceType;
  /** Implementation facts. Every line traces to the evidence audit. */
  readonly evidence: readonly string[];
  /**
   * Required when `experienceType` is TRAINING or BOTH — the context that makes
   * the claim honest ("practised via Docker Desktop in DevOps coursework").
   * Absent for pure PROJECT skills, which need no such disclaimer.
   */
  readonly trainingContext?: string;
  /** Where the evidence lives, for a panel's "show me" affordance. */
  readonly repository?: string;
}

export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly world: WorldId;
  readonly category: SkillCategory;
  readonly experience: SkillExperience;
  readonly visual: SkillVisual;
  /** One line of plain description. Never a metric. */
  readonly summary: string;
}

/** One step of a project's pipeline, in execution order. */
export interface WorkflowStage {
  readonly id: string;
  readonly label: string;
  /** What actually happens at this step. Evidence-backed, never aspirational. */
  readonly detail?: string;
}

/**
 * A project's actual workflow.
 *
 * `metaphor` picks the world OBJECT (a warehouse, a pipeline vessel, a service
 * pod) and `stages` are the walkthrough inside it. Both are derived from what
 * the project genuinely does — three different projects get three different
 * shapes because three different things happen in them.
 */
export interface ProjectWorkflow {
  readonly metaphor:
    | 'warehouse'
    | 'pipeline-vessel'
    | 'analytics-terminal'
    | 'productionization-rig'
    | 'service-pod'
    | 'service-cluster';
  readonly stages: readonly WorkflowStage[];
}

/** A person who shares authorship. Required for collaborative/extended work. */
export interface Collaborator {
  readonly name: string;
  /** What they did, stated so the credit is specific. */
  readonly role: string;
}

export interface Project {
  readonly id: string;
  readonly title: string;
  readonly world: WorldId;
  readonly authorship: Authorship;
  /**
   * What YOU contributed, in your words.
   *
   * For `extended-existing` this must describe only the added work, never the
   * original application. For `collaborative` it must not imply sole ownership.
   */
  readonly contribution: string;
  /** Must be present whenever authorship is not 'solo'. */
  readonly collaborators?: readonly Collaborator[];
  /** What the project does. */
  readonly description: string;
  /** Only technologies verified in the repository. */
  readonly technologies: readonly string[];
  readonly workflow: ProjectWorkflow;
  /** Outcomes that were actually measured or executed. */
  readonly results?: readonly string[];
  /**
   * Known limitations, stated plainly. REQUIRED, with no exception.
   *
   * Every project must supply either a real limitation or an explicit
   * "None identified" -- never an empty array and never a placeholder. Making it
   * optional meant the honest projects had to remember it, and a project with no
   * limitation would look identical to one nobody checked.
   *
   * This is the field that keeps the portfolio defensible: a project that does
   * not run must say so here, and omitting a known limitation is how a claim
   * becomes indefensible under questioning.
   */
  readonly limitations: readonly string[];
  readonly github?: string;
  readonly demo?: string;
  /**
   * Where the evidence lives. Not a claim about the project — a pointer to the
   * files that back it, for a panel's "show me" affordance.
   */
  readonly evidence?: readonly string[];
}

/**
 * Per-world configuration: which skills and projects appear, and in what order.
 *
 * Order is the progression. It is data, not code, so the sequence can change
 * without touching the engine.
 */
export interface WorldConfig {
  readonly id: WorldId;
  readonly name: string;
  /** Accessible identity for this world, mirroring the hero's HERO_HEADING. */
  readonly heading: string;
  /** Skill ids in progression order. */
  readonly skillOrder: readonly string[];
  /** Project ids in progression order. */
  readonly projectOrder: readonly string[];
  /**
   * An off-critical-path branch. Used for Kubernetes: reachable, never
   * required, so training content can never gate progression.
   */
  readonly optionalBranch?: {
    readonly skillId: string;
    /** Station the branch leaves from. */
    readonly afterSkillId: string;
  };
  /** Palette for the world's rendering. Values are CSS colours. */
  readonly palette: {
    readonly background: string;
    readonly accent: string;
    readonly structure: string;
    readonly highlight: string;
  };
}

/**
 * The whole content set, addressed by id.
 *
 * Deliberately a plain record rather than a class or a map with behaviour: a
 * renderer can look up `content.projects[id]` and get `Project | undefined`
 * without any instance ceremony.
 */
export interface PortfolioContent {
  readonly worlds: Readonly<Record<WorldId, WorldConfig>>;
  readonly skills: Readonly<Record<string, Skill>>;
  readonly projects: Readonly<Record<string, Project>>;
}