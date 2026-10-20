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
      repositories: [{ name: 'digital-prescription-verification-devops', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' }],
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
      repositories: [{ name: 'Medigen', url: 'https://github.com/yashmahajan11234567/Medigen' }],
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
      repositories: [{ name: 'Medigen', url: 'https://github.com/yashmahajan11234567/Medigen' }],
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
      repositories: [{ name: 'Medigen', url: 'https://github.com/yashmahajan11234567/Medigen' }],
    },
    visual: { kind: 'orchestration-deck', treatment: 'solid' },
  },
  {
    id: 'ci-cd',
    name: 'CI/CD',
    world: 'cloud',
    category: 'delivery',
    summary: 'Three-job GitHub Actions pipeline: lint/test, security scan, GHCR build.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'RxVerify .github/workflows/ci.yml — three jobs: Test & Lint (ruff, pytest), Security Scan (pip-audit, Trivy on CRITICAL/HIGH), Build & Push (Buildx to GHCR with GHA cache)',
        'Jenkinsfile declarative pipeline and .gitlab-ci.yml implementing the same stages — one logic, three syntaxes',
        'Earlier RxVerify phase used an eight-job pipeline with workflow_dispatch-gated terraform apply and ansible deploy (replaced in the current workflow)',
        'AWS credentials come from secrets, never hardcoded',
      ],
      repositories: [{ name: 'digital-prescription-verification-devops', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' }],
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
      repositories: [{ name: 'digital-prescription-verification-devops', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' }],
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
      repositories: [{ name: 'digital-prescription-verification-devops', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' }],
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
      repositories: [{ name: 'Medigen', url: 'https://github.com/yashmahajan11234567/Medigen' }, { name: 'digital-prescription-verification-devops', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' }],
    },
    visual: { kind: 'sealed-vault', treatment: 'solid' },
  },
  {
    id: 'observability',
    name: 'Observability',
    world: 'cloud',
    category: 'observability',
    summary: 'Prometheus/Grafana/Loki stack on Kubernetes, from /metrics to dashboards.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'RxVerify exposes /metrics via prometheus-flask-exporter; ServiceMonitor (job=rxverify, port 5000) scrapes it — live audit recorded up{job="rxverify"}=1',
        'Grafana dashboards provisioned via ConfigMap — 5-panel RxVerify DevOps dashboard; Grafana/Prometheus/Loki pods verified Running on Minikube',
        'Loki + Promtail DaemonSet aggregate logs with job=rxverify labels; range queries returned streams',
        'SRE docs: SLIs/SLOs with PromQL queries (availability, p95 latency, 5xx rate), error-budget policy, blameless postmortem from the rollback incident',
        'dictConfig logging with request-id propagation; Prometheus alert rules with runbooks in the collaborative Go project',
      ],
      repositories: [
        { name: 'digital-prescription-verification-devops', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
        { name: 'Medigen', url: 'https://github.com/yashmahajan11234567/Medigen' },
        { name: 'Real-Time-Balance-Visibility-in-Microservice-Based-Money-Transfers', url: 'https://github.com/yashmahajan11234567/Real-Time-Balance-Visibility-in-Microservice-Based-Money-Transfers' },
      ],
    },
    visual: { kind: 'telemetry-array', treatment: 'solid' },
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    world: 'cloud',
    category: 'infrastructure',
    summary: 'Manifests, Minikube deployment with probes, rolling updates and rollback.',
    experience: {
      experienceType: 'BOTH',
      evidence: [
        'RxVerify k8s/ tree: Deployment with RollingUpdate (maxSurge 1 / maxUnavailable 0), readiness and liveness probes on /health, resource requests/limits, Secret, PVC, Service and ServiceMonitor',
        'Deployed to Minikube (start-cluster.sh: build, image load, kubectl apply -k k8s/); pods verified Running',
        'Rolling update and rollback exercised: bad image forced CrashLoopBackOff, kubectl rollout undo restored health — recorded as an incident writeup',
        'SQLite persistence across pod restarts via a PersistentVolumeClaim',
        'Coursework manifests in the DevOps Masterclass repository (K8s/ tree) — practice material',
      ],
      trainingContext:
        'Learned in DevOps coursework, then applied to the RxVerify project: manifests authored, deployed on Minikube, and rollout/rollback demonstrated live. Not deployed to a managed cloud cluster.',
      repositories: [
        { name: 'digital-prescription-verification-devops', url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops' },
        { name: 'Full-Stack-AI-DevOps-Masterclass', url: 'https://github.com/yashmahajan11234567/Full-Stack-AI-DevOps-Masterclass' },
      ],
    },
    visual: { kind: 'training-ground', treatment: 'solid' },
  },
];