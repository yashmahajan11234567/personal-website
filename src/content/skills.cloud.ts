/**
 * CLOUD / DEVOPS world skill set.
 *
 * Every `evidence` line traces to the approved evidence audit. Verified counts
 * (8 CI jobs, 8 AWS resources, 183 passing tests, 174 unit tests) come from the
 * audit's direct execution, not from README claims.
 *
 * PROGRESSION ORDER
 *
 *   Git → Docker → Health checks → Compose → CI/CD → Terraform/AWS → Ansible
 *
 * CI/CD sits BEFORE Terraform because that is the real dependency direction:
 * the pipeline validates the Dockerfile and runs tests long before it plans any
 * infrastructure. Ordering them the other way would misrepresent how the work
 * actually happens.
 *
 * KUBERNETES
 *
 * Kubernetes is TRAINING. It is a genuine, practised skill and it belongs in the
 * inventory — but no repository contains a single Kubernetes manifest, so it is
 * `scaffold`-treated and lives on an optional branch. It must never appear
 * inside a project workflow. See `worlds.data.ts` for the branch wiring and the
 * `optionalBranch` field that keeps it off the critical path.
 */

import type { Skill } from './types';

export const CLOUD_SKILLS: readonly Skill[] = [
  {
    id: 'git',
    name: 'Git',
    world: 'cloud',
    category: 'delivery',
    summary: 'Branch discipline and commit-gated delivery.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Workflows pin third-party actions by commit SHA rather than mutable tags',
        'Production deployment is gated behind workflow_dispatch plus a production environment',
        'Deploys are triggered deliberately, never by an ordinary push',
      ],
      repository: 'digital-prescription-verification-devops',
    },
    visual: { kind: 'repository-terminal', treatment: 'solid' },
  },
  {
    id: 'docker',
    name: 'Docker',
    world: 'cloud',
    category: 'delivery',
    summary: 'Multi-stage builds with non-root runtime users.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Multi-stage build: node:18-alpine builder to nginx:alpine runtime',
        'npm ci for reproducible installs; COPY --from=builder for the built assets',
        'Non-root appuser (uid/gid 1001) in all four Dockerfiles',
        'OpenCV shared libraries installed as real runtime dependencies',
      ],
      repository: 'Medigen',
    },
    visual: { kind: 'build-stage', treatment: 'solid' },
  },
  {
    id: 'health-checks',
    name: 'Health Checks',
    world: 'cloud',
    category: 'observability',
    summary: 'One health contract, consistent across every tier.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'HEALTHCHECK declared in three Dockerfiles',
        '/health endpoint implemented in the application',
        'nginx exposes /health as well',
        'The same contract is honoured at every tier, so readiness is unambiguous',
      ],
      repository: 'Medigen',
    },
    visual: { kind: 'pulse-monitor', treatment: 'solid' },
  },
  {
    id: 'compose',
    name: 'Docker Compose',
    world: 'cloud',
    category: 'delivery',
    summary: 'Multi-service orchestration with real readiness gating.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'postgres:15-alpine, backend, and frontend services with a named volume',
        'depends_on with condition: service_healthy — the service waits for actual health, not just start',
        'Healthchecks declared on all three services',
        'Alembic migrations run as an entrypoint step before the server starts',
      ],
      repository: 'Medigen',
    },
    visual: { kind: 'orchestration-deck', treatment: 'solid' },
  },
  {
    id: 'ci-cd',
    name: 'CI/CD',
    world: 'cloud',
    category: 'delivery',
    summary: 'An eight-job pipeline ending in a gated, smoke-tested deploy.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Eight jobs across 330 lines: validation, postgres tests, docker validation, terraform validation, ansible validation, plan, apply, deploy',
        'terraform apply and ansible deploy both gated on workflow_dispatch plus environment: production',
        'Deploy finishes with a health-check poll loop and a /login smoke test',
        'AWS credentials come from secrets, never hardcoded',
      ],
      repository: 'digital-prescription-verification-devops',
    },
    visual: { kind: 'pipeline-gantry', treatment: 'solid' },
  },
  {
    id: 'terraform',
    name: 'Terraform / AWS',
    world: 'cloud',
    category: 'infrastructure',
    summary: 'Eight real AWS resources, validated.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Eight AWS resources declared: aws_vpc, aws_subnet, aws_security_group, aws_internet_gateway, aws_route_table, aws_route, aws_route_table_association, aws_instance',
        'terraform validate passes — executed during the audit, not assumed',
        'Six declared variables with provider and required_providers configuration',
      ],
      repository: 'digital-prescription-verification-devops',
    },
    visual: { kind: 'infra-builder', treatment: 'solid' },
  },
  {
    id: 'ansible',
    name: 'Ansible',
    world: 'cloud',
    category: 'infrastructure',
    summary: 'Provisioning driven by a generated inventory.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'deploy.yml playbook at 133 lines',
        'generate_inventory.py (68 lines) derives hosts from Terraform output',
        'Playbook substantially rewritten during the productionization work',
      ],
      repository: 'digital-prescription-verification-devops',
    },
    visual: { kind: 'automation-station', treatment: 'solid' },
  },
  {
    id: 'container-hardening',
    name: 'Container Hardening',
    world: 'cloud',
    category: 'infrastructure',
    summary: 'Non-root users and pinned base images.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Non-root appuser (uid/gid 1001) across the Dockerfiles',
        'Digest-pinned base images rather than mutable tags',
        'gitleaks / govulncheck / Trivy scanning in the security workflow',
      ],
      repository: 'Medigen, digital-prescription-verification-devops',
    },
    visual: { kind: 'sealed-vault', treatment: 'solid' },
  },
  {
    id: 'observability',
    name: 'Observability',
    world: 'cloud',
    category: 'observability',
    summary: 'Request-id correlation and Prometheus instrumentation.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'dictConfig logging with contextvars request-id propagation',
        'RequestIdFilter injects a request id into every log line',
        'Thread-safe sliding-window rate limiter with Retry-After responses',
        'Prometheus alert rules with runbook annotations in the collaborative project',
      ],
      repository: 'Medigen, Real-Time-Balance-Visibility-in-Microservice-Based-Money-Transfers',
    },
    visual: { kind: 'telemetry-array', treatment: 'solid' },
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    world: 'cloud',
    category: 'infrastructure',
    summary: 'Hands-on training — practised in coursework, not used in a project.',
    experience: {
      experienceType: 'TRAINING',
      evidence: [
        'Hands-on cluster and resource work practised during DevOps coursework',
        'Practised through Docker Desktop; resources were created and later torn down',
        'NOT demonstrated in any portfolio repository — zero Kubernetes manifests exist',
      ],
      trainingContext:
        'Learned and practised during DevOps coursework. Not used in RxVerify, MediGen, or any other project, and must not be presented as production experience.',
    },
    visual: { kind: 'training-ground', treatment: 'scaffold' },
  },
];