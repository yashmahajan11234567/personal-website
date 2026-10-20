/**
 * World configuration — palette, progression order, and the optional branch.
 *
 * Order is DATA here, not code. The engine reads `skillOrder` and
 * `projectOrder`; changing a progression means editing this file, never the
 * engine.
 *
 * KUBERNETES PLACEMENT
 *
 * Kubernetes is wired through `optionalBranch`, which puts it after Ansible and
 * off the critical path. Two properties follow from that shape:
 *
 *   1. It can never gate progression — completion does not depend on it.
 *   2. It is not inside any project's workflow — `skillOrder` and
 *      `projectOrder` are the only progression inputs, and this branch is
 *      neither.
 *
 * The audit's rule is that a training skill must never be readable as project
 * experience. `scaffold` treatment on the skill, plus a branch off the main
 * path, is how that is enforced structurally rather than by convention.
 */

import type { WorldConfig } from './types';

export const WORLD_CONFIGS: readonly WorldConfig[] = [
  {
    id: 'data',
    name: 'Data Analyst / Data Engineer',
    heading: 'Data Analyst and Data Engineer',
    skillOrder: ['sql', 'python', 'excel', 'power-bi', 'tableau', 'streamlit'],
        projectOrder: [
          'nifty100-financial-analysis',
          'sql-data-warehouse',
          'primetradeai',
          'data-analytics-dashboards',
        ],
    palette: {
      background: '#0b1220',
      accent: '#22d3ee',
      structure: '#1e3a5f',
      highlight: '#67e8f9',
    },
  },
  {
    id: 'cloud',
    name: 'Cloud / DevOps',
    heading: 'Cloud and DevOps Engineer',
    skillOrder: [
      'git',
      'docker',
      'health-checks',
      'compose',
      'ci-cd',
      'terraform',
      'ansible',
    ],
    projectOrder: ['rxverify', 'devops-masterclass', 'go-microservices'],
    // Kubernetes is reachable but never required. See the note above.
    optionalBranch: {
      skillId: 'kubernetes',
      afterSkillId: 'ansible',
    },
    palette: {
      background: '#1a0f08',
      accent: '#f97316',
      structure: '#7c2d12',
      highlight: '#fdba74',
    },
  },
];