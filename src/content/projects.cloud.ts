/**
 * CLOUD / DEVOPS world projects.
 *
 * Order is by strength of unambiguous personal contribution.
 *
 * AUTHORSHIP — THE THREE CASES THAT MATTER
 *
 * 1. RxVerify — `extended-existing`. The original Flask application was written
 *    by Ruturaj Warkad. The productionization work (Docker, Compose, CI/CD,
 *    Terraform, Ansible, deployment) is the contribution claimed here, and
 *    `contribution` describes ONLY that added work. The original author is named
 *    in `collaborators` because crediting them is required, not optional.
 *
 * 2. MediGen — `solo`. All 45 commits are the author's.
 *
 * 3. Go microservices — `collaborative`. Joint college project. Git commit counts
 *    are NOT a contribution measure here: development happened on one machine,
 *    so the committing identity is structurally skewed regardless of who did
 *    what. The audit's method note records this explicitly. It is never
 *    presented as solo work, and it is never described as "I only added the
 *    repository" — that framing is as unsupported as claiming sole authorship.
 *    `collaborators` names the partner.
 *
 * KUBERNETES IS ABSENT FROM THIS FILE BY DESIGN. No project in this world uses
 * it. It appears only as a TRAINING skill on an optional branch.
 */

import type { Project } from './types';

export const CLOUD_PROJECTS: readonly Project[] = [
  {
    id: 'rxverify',
    title: 'RxVerify — Digital Prescription Verification',
    world: 'cloud',
    authorship: 'extended-existing',
    contribution:
      'Took an existing Flask application and productionized it: containerization, multi-service orchestration, an eight-job CI/CD pipeline, AWS infrastructure as code, configuration management, automated deployment, and a deployment validation step.',
    collaborators: [
      {
        name: 'Ruturaj Warkad',
        role: 'Original author of the Flask application that this work builds on',
      },
    ],
    description:
      'A digital prescription verification system. This entry covers the DevOps and productionization work: turning an existing application into a containerised, continuously delivered, infrastructure-as-code deployment on AWS.',
    technologies: [
      'Docker',
      'Docker Compose',
      'GitHub Actions',
      'Terraform',
      'AWS',
      'Ansible',
      'Flask',
      'Gunicorn',
      'pytest',
    ],
    workflow: {
      metaphor: 'productionization-rig',
      stages: [
        {
          id: 'existing-app',
          label: 'Existing application',
          detail: 'Flask app originally written by Ruturaj Warkad — the starting point, not my work',
        },
        { id: 'docker', label: 'Docker', detail: 'Application containerised for deployment' },
        { id: 'compose', label: 'Docker Compose', detail: 'Multi-service orchestration with PostgreSQL' },
        { id: 'tests', label: 'Tests', detail: '183 passing, 2 skipped' },
        {
          id: 'ci',
          label: 'CI/CD',
          detail: 'Eight jobs across 330 lines; apply and deploy gated on workflow_dispatch plus the production environment',
        },
        {
          id: 'terraform',
          label: 'Terraform',
          detail: 'Eight AWS resources declared; terraform validate passes',
        },
        { id: 'aws', label: 'AWS', detail: 'VPC, subnet, security group, and EC2 provisioned as code' },
        { id: 'ansible', label: 'Ansible', detail: 'Configuration applied from a generated inventory' },
        {
          id: 'deploy',
          label: 'Deployment',
          detail: 'Automated deploy finished by a health-check poll and a /login smoke test',
        },
      ],
    },
    results: [
      '183 tests passed, 2 skipped — executed during the audit',
      'terraform validate passes — executed during the audit',
      'CI/CD pipeline: 8 jobs, 330 lines',
      'Terraform: 8 AWS resources, 133 lines',
      'Production deployment gated behind workflow_dispatch and a production environment',
      'No plaintext credentials in the repository; secrets.yml is untracked with example files committed',
    ],
    limitations: [
      'The application layer was authored by a collaborator; the claim here is the DevOps and productionization layer',
      'Deployment targets a single EC2 instance rather than a highly available topology',
    ],
    github: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops',
    evidence: [
      '.github/workflows/ci-cd.yml — the eight-job pipeline',
      'terraform/main.tf — eight AWS resources, validate passes',
      'ansible/deploy.yml — the provisioning playbook',
      'pytest run — 183 passed, 2 skipped',
    ],
  },
  {
    id: 'medigen',
    title: 'MediGen — OCR Document Pipeline',
    world: 'cloud',
    authorship: 'solo',
    contribution:
      'Built the container architecture, image preprocessing pipeline, API, and frontend, including the health-check contract and readiness gating.',
    description:
      'An OCR document-processing service: images are preprocessed and parsed into structured documents behind a FastAPI service with a React frontend, delivered as a container stack.',
    technologies: [
      'Docker',
      'Docker Compose',
      'nginx',
      'FastAPI',
      'React',
      'PaddleOCR',
      'OpenCV',
      'Alembic',
      'Render',
      'pytest',
    ],
    workflow: {
      metaphor: 'service-pod',
      stages: [
        { id: 'app', label: 'Application', detail: 'React frontend with a FastAPI backend' },
        {
          id: 'build',
          label: 'Multi-stage build',
          detail: 'node:18-alpine builder to nginx:alpine runtime, non-root user',
        },
        {
          id: 'compose',
          label: 'Compose',
          detail: 'Healthchecks on every service, readiness gated with service_healthy, Alembic migrations run before startup',
        },
        { id: 'deploy', label: 'Deploy', detail: 'Render blueprint with a declared health check path' },
      ],
    },
    results: [
      '174 unit tests passing',
      'Non-root container user (uid/gid 1001) across four Dockerfiles',
      'nginx serves gzip with immutable caching on fingerprinted assets',
    ],
    limitations: [
      'No CI/CD pipeline — no .github, .gitlab-ci.yml, Jenkinsfile, or CircleCI config exists',
      'No infrastructure as code and no cloud provider SDK usage',
      'Deployed to Render (PaaS), not to a cloud provider',
    ],
    github: 'https://github.com/yashmahajan11234567/Medigen',
    evidence: [
      'Four Dockerfiles — multi-stage builds, non-root users',
      'docker-compose.yml — readiness gating and healthchecks',
      'render.yaml — deployment blueprint',
      '174 unit tests passing',
    ],
  },
  {
    id: 'go-microservices',
    title: 'Go Microservices — Real-Time Balance Visibility',
    world: 'cloud',
    authorship: 'collaborative',
    contribution:
      'Joint architecture and design discussion, joint implementation of the services and project structure, and container configuration, developed together with a partner.',
    collaborators: [
      {
        name: 'Project partner',
        role: 'Co-implemented the services, architecture, and container configuration jointly',
      },
    ],
    description:
      'A microservices-based real-time balance visibility system with service decomposition, PostgreSQL persistence, containerised deployment, CI workflows, and observability instrumentation. Collaborative college project, designed and implemented jointly.',
    technologies: [
      'Go',
      'PostgreSQL',
      'Docker',
      'GitHub Actions',
      'Prometheus',
      'OpenTelemetry',
    ],
    workflow: {
      metaphor: 'service-cluster',
      stages: [
        { id: 'services', label: 'Services', detail: 'Go services with hexagonal layering' },
        {
          id: 'persistence',
          label: 'Persistence',
          detail: 'PostgreSQL with 46 migrations and a double-entry ledger using idempotency and outbox patterns',
        },
        {
          id: 'ci',
          label: 'CI workflows',
          detail: 'Six workflows, actions pinned by SHA, SBOM and build provenance',
        },
        { id: 'containers', label: 'Containers', detail: 'Digest-pinned base images' },
        { id: 'observability', label: 'Observability', detail: 'Prometheus alert rules with runbooks, OpenTelemetry collector' },
        { id: 'resilience', label: 'Fault injection', detail: 'Toxiproxy-based resilience testing' },
      ],
    },
    results: [
      'Six SHA-pinned CI workflows with SBOM and build provenance',
      '46 database migrations; 246 test files',
    ],
    limitations: [
      'Collaborative college project — not solo work',
      'Commit history is not representative of the division of work, because development was performed collaboratively on one machine',
      'go.mod declares the partner\'s module path and a Go version that is not a public release, so the repository does not build under this account and no live demo is claimed',
    ],
    github:
      'https://github.com/yashmahajan11234567/Real-Time-Balance-Visibility-in-Microservice-Based-Money-Transfers',
    evidence: [
      'deploy/ — container and observability configuration',
      '.github/workflows/ — six pinned workflows with SBOM',
      '46 migrations implementing a double-entry ledger',
    ],
  },
];