/**
 * Content model integrity tests.
 *
 * These are not visual QA. They check the CLAIMS: that the portfolio content is
 * internally consistent, and — more importantly — that the honesty rules the
 * audit established are enforced by the data rather than by convention.
 *
 * The assertions about authorship and Kubernetes are the point of this file. A
 * portfolio is judged on whether every claim survives questioning, and the audit
 * found three specific ways this one could overstate itself. Those three rules
 * are now tests:
 *
 *   1. Shared work names the other party.
 *   2. A TRAINING claim carries its coursework context.
 *   3. A TRAINING skill never appears inside a project workflow.
 *
 * Written with Playwright because it is the only test runner in this repository
 * (see qa/_legacy-2026-09-30/README). These tests need no browser and never
 * open a page, so they run fast and in any order.
 */

import {
  PORTFOLIO,
  branchSkillForWorld,
  projectsForWorld,
  skillsForWorld,
  trainingSkillsInProjects,
  validateContent,
} from '../../src/content';
import { expect, test } from '@playwright/test';

const WORLD_IDS = ['data', 'cloud'] as const;

test.describe('content model integrity', () => {
  test('the content set has no structural issues', () => {
    expect(validateContent()).toEqual([]);
  });

  test('ids are unique across skills and projects', () => {
    const skillIds = Object.keys(PORTFOLIO.skills);
    const projectIds = Object.keys(PORTFOLIO.projects);
    expect(new Set(skillIds).size).toBe(skillIds.length);
    expect(new Set(projectIds).size).toBe(projectIds.length);
  });

  test('both worlds are present and populated', () => {
    for (const world of WORLD_IDS) {
      expect(PORTFOLIO.worlds[world]).toBeDefined();
      expect(skillsForWorld(world).length).toBeGreaterThan(0);
      expect(projectsForWorld(world).length).toBeGreaterThan(0);
    }
  });

  test('every skill carries a summary and at least one evidence line', () => {
    for (const skill of Object.values(PORTFOLIO.skills)) {
      expect(skill.summary.trim().length).toBeGreaterThan(0);
      expect(skill.experience.evidence.length).toBeGreaterThan(0);
      for (const line of skill.experience.evidence) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('every project has limitations', () => {
    for (const project of Object.values(PORTFOLIO.projects)) {
      // Required, so this is structurally guaranteed -- asserted anyway because
      // it is the field that keeps the portfolio defensible.
      expect(project.limitations.length, `${project.id} limitations`).toBeGreaterThan(0);
      for (const note of project.limitations) {
        // A real limitation, not a placeholder. "None identified" is the only
        // accepted way to have nothing to report.
        expect(note.trim().length, `${project.id} limitation is empty`).toBeGreaterThan(0);
        expect(note.toLowerCase()).not.toMatch(/\b(todo|tbd|n\/a|placeholder|lorem)\b/);
      }
    }
    });

    test('every project states its authorship and contribution', async () => {
    for (const project of Object.values(PORTFOLIO.projects)) {
    expect(project.authorship.trim().length, `${project.id} authorship`).toBeGreaterThan(0);
    expect(project.contribution.trim().length, `${project.id} contribution`).toBeGreaterThan(0);
    }
    });

    test('every skill states an experience type', async () => {
    for (const skill of Object.values(PORTFOLIO.skills)) {
    expect(skill.experience.experienceType.trim().length).toBeGreaterThan(0);
    }
    });

    test('every project has technologies and a workflow', async () => {
    for (const project of Object.values(PORTFOLIO.projects)) {
    expect(project.technologies.length).toBeGreaterThan(0);
    expect(project.workflow.stages.length).toBeGreaterThan(0);
    expect(project.description.trim().length).toBeGreaterThan(0);
    }
    });

  test('provided links are absolute https URLs', () => {
    for (const project of Object.values(PORTFOLIO.projects)) {
    for (const url of [project.github, project.demo].filter(
    (value): value is string => typeof value === 'string',
    )) {
    expect(url).toMatch(/^https:\/\//);
    expect(() => new URL(url)).not.toThrow();
    }
    }
  });
});

test.describe('authorship honesty', () => {
  test('collaborative and extended-existing projects name the other party', () => {
    for (const project of Object.values(PORTFOLIO.projects)) {
      if (project.authorship === 'collaborative' || project.authorship === 'extended-existing') {
        expect(project.collaborators, `${project.id} must credit collaborators`).toBeDefined();
        expect(project.collaborators?.length ?? 0).toBeGreaterThan(0);
        for (const collaborator of project.collaborators ?? []) {
          expect(collaborator.name.trim().length).toBeGreaterThan(0);
          expect(collaborator.role.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('solo projects claim no collaborators', () => {
    for (const project of Object.values(PORTFOLIO.projects)) {
      if (project.authorship === 'solo') {
        expect(project.collaborators ?? []).toHaveLength(0);
      }
    }
  });

  test('Go microservices is collaborative, not solo, and discloses the commit skew', () => {
    const project = PORTFOLIO.projects['go-microservices'];
    expect(project).toBeDefined();
    expect(project.authorship).toBe('collaborative');
    // The contribution must describe joint work rather than sole ownership.
    expect(project.contribution.toLowerCase()).toContain('joint');

    // The machine-of-origin disclosure has to survive into the rendered data.
    const limitations = (project.limitations ?? []).join(' ').toLowerCase();
    expect(limitations).toContain('collaborative');
    expect(limitations).toContain('commit history is not representative');
  });

  test('RxVerify is an extended-existing project crediting the original author', () => {
    const project = PORTFOLIO.projects['rxverify'];
    expect(project).toBeDefined();
    expect(project.authorship).toBe('extended-existing');
    expect(project.collaborators?.[0]?.name).toContain('Ruturaj');

    // The workflow must START from the existing application, and that stage must
    // be attributed rather than presented as new work.
    const first = project.workflow.stages[0];
    expect(first.id).toBe('existing-app');
    expect(`${first.label} ${first.detail ?? ''}`.toLowerCase()).toContain('ruturaj');
  });
});

test.describe('Kubernetes is training only', () => {
  test('is classified TRAINING with coursework context', () => {
    const skill = PORTFOLIO.skills['kubernetes'];
    expect(skill).toBeDefined();
    expect(skill.experience.experienceType).toBe('TRAINING');
    expect(skill.experience.trainingContext?.toLowerCase()).toContain('coursework');
  });

  test('renders with scaffold treatment so it cannot read as project evidence', () => {
    expect(PORTFOLIO.skills['kubernetes'].visual.treatment).toBe('scaffold');
    expect(PORTFOLIO.skills['kubernetes'].visual.kind).toBe('training-ground');
  });

  test('sits on an optional branch, not the critical path', () => {
    const world = PORTFOLIO.worlds.cloud;
    expect(world.optionalBranch?.skillId).toBe('kubernetes');
    expect(world.skillOrder).not.toContain('kubernetes');
    // It must not gate progression.
    expect(world.projectOrder).not.toContain('kubernetes');
    expect(branchSkillForWorld('cloud')?.id).toBe('kubernetes');
  });

  test('never appears inside any project workflow or technology list', () => {
    expect(trainingSkillsInProjects()).toEqual([]);
  });

  test('is absent from the RxVerify and MediGen workflows specifically', () => {
    for (const id of ['rxverify', 'medigen']) {
      const project = PORTFOLIO.projects[id];
      const haystack = [
        ...project.workflow.stages.map((stage) => `${stage.label} ${stage.detail ?? ''}`),
        ...project.technologies,
      ]
        .join(' ')
        .toLowerCase();
      expect(haystack).not.toContain('kubernetes');
    }
  });
});

test.describe('evidence discipline', () => {
  test('no project claims a Kubernetes deployment', () => {
    for (const project of Object.values(PORTFOLIO.projects)) {
      expect(project.technologies.map((t) => t.toLowerCase())).not.toContain('kubernetes');
    }
  });

  test('MediGen does not claim CI/CD, which it does not have', () => {
    const medigen = PORTFOLIO.projects['medigen'];
    const stages = medigen.workflow.stages.map((stage) => stage.id);
    expect(stages).not.toContain('ci');
    expect(stages).not.toContain('cicd');
    expect(medigen.limitations?.join(' ').toLowerCase()).toContain('no ci/cd');
  });

  test('known-broken projects state their limitations', () => {
    const warehouse = PORTFOLIO.projects['sql-data-warehouse'];
    expect(warehouse.limitations?.join(' ').toLowerCase()).toContain('non-runnable');

    const nifty = PORTFOLIO.projects['nifty100-financial-analysis'];
    expect(nifty.limitations?.join(' ').toLowerCase()).toContain('etl');
  });

  test('the synthetic mutual-fund analysis is absent from the content', () => {
    const serialised = JSON.stringify(PORTFOLIO).toLowerCase();
    expect(serialised).not.toContain('mutual fund');
    expect(serialised).not.toContain('nav history');
  });

  test('no claim originates from the excluded mockup material', () => {
    const serialised = JSON.stringify(PORTFOLIO).toLowerCase();
    for (const fiction of ['logistech', '4.2m', '94.2%', 'instacart', 'house price']) {
      expect(serialised, `mockup claim "${fiction}" must not appear`).not.toContain(fiction);
    }
  });

  test('every project reports a recognised authorship value', () => {
    const allowed = ['solo', 'collaborative', 'extended-existing', 'course'];
    for (const project of Object.values(PORTFOLIO.projects)) {
      expect(allowed).toContain(project.authorship);
    }
  });

  test('every skill reports a recognised experience type', () => {
    const allowed = ['PROJECT', 'TRAINING', 'BOTH', 'UNCERTAIN'];
    for (const skill of Object.values(PORTFOLIO.skills)) {
      expect(allowed).toContain(skill.experience.experienceType);
    }
  });
});