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
 * 2. DevOps Masterclass — `course`. College open-elective coursework. Every
 *    fact in the entry was verified against the live repository (seven
 *    workflow files, the Devops/ and K8s/ trees, 40 commits). It is presented
 *    as coursework, never as production experience, per the audit's hardest
 *    rule.
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
      'Took an existing Flask application and productionized it end to end: containerization, Kubernetes on Minikube with probes and rollback, a GitHub Actions pipeline to GHCR, a Prometheus/Grafana/Loki monitoring stack, AWS infrastructure as code, Ansible provisioning, and functional-audit fixes across the app (RBAC, admin CRUD, notifications).',
    collaborators: [
      {
        name: 'Ruturaj Warkad',
        role: 'Original author of the Flask application that this work builds on',
      },
    ],
    description:
      'A prescription verification system (doctors issue, pharmacists verify by ID, admins manage) deployed to Minikube with readiness/liveness probes and rollback, monitored by Prometheus, Grafana and Loki, delivered by a GitHub Actions pipeline to GHCR, with Terraform/Ansible provisioning for AWS EC2.',
    technologies: [
      'Kubernetes',
      'Minikube',
      'Docker',
      'Docker Compose',
      'GitHub Actions',
      'Prometheus',
      'Grafana',
      'Loki',
      'Terraform',
      'AWS',
      'Ansible',
      'Flask',
      'Gunicorn',
      'pytest',
      'Playwright',
    ],
    workflow: {
      metaphor: 'productionization-rig',
      stages: [
        {
          id: 'existing-app',
          label: 'Existing application',
          detail: 'Flask app originally written by Ruturaj Warkad — the starting point, not my work',
        },
        { id: 'app', label: 'App work', detail: 'RBAC roles (doctor/pharmacist/admin), admin CRUD, notifications, seeding fixes — validated by a 19/19 Playwright pass' },
        { id: 'docker', label: 'Docker', detail: 'Single-stage slim image, gunicorn on :5000, named volume for the SQLite file' },
        { id: 'compose', label: 'Docker Compose', detail: 'Local stack with persistent prescription data' },
        { id: 'tests', label: 'Tests', detail: 'pytest suite + 10 Playwright E2E scripts (19/19 recorded in the functional audit)' },
        {
          id: 'ci',
          label: 'CI/CD',
          detail: 'Three jobs: ruff+pytest, pip-audit+Trivy (CRITICAL/HIGH gate), Buildx push to GHCR',
        },
        {
          id: 'k8s',
          label: 'Kubernetes',
          detail: 'Minikube via kustomize: RollingUpdate, /health probes, resource limits, Secret, PVC persistence',
        },
        {
          id: 'observability',
          label: 'Monitoring',
          detail: 'Prometheus ServiceMonitor, Grafana 5-panel dashboard (ConfigMap), Loki + Promtail log aggregation',
        },
        {
          id: 'terraform',
          label: 'Terraform',
          detail: 'Eight AWS resources declared (VPC through EC2); terraform validate passes',
        },
        { id: 'ansible', label: 'Ansible', detail: 'Docker install + image build + container run on EC2, health-check final step' },
      ],
    },
    results: [
      'Playwright E2E: 19/19 pass recorded against the Minikube deployment (functional audit)',
      'Kubernetes: RollingUpdate + kubectl rollout undo demonstrated; PVC kept SQLite across pod restarts',
      'Monitoring live-verified: Prometheus up{job="rxverify"}=1, Grafana dashboard rendering, Loki ingestion returning streams',
      'CI pipeline: 3 jobs to GHCR; Trivy fails the build on CRITICAL/HIGH',
      'Terraform: 8 AWS resources, validate passes; Ansible playbook ends in a health-check probe',
    ],
    limitations: [
      'The application layer was authored by a collaborator; the claim here is the DevOps layer plus the functional-audit fixes',
      'Kubernetes runs on Minikube (local cluster), not a managed cloud cluster',
      'Deployment targets a single EC2 instance rather than a highly available topology',
      'Loki holds gunicorn startup logs in the recorded demo; app-level log volume is thin',
    ],
    github: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops',
    evidence: [
      'k8s/ — deployment.yaml (probes, limits, PVC), servicemonitor.yaml, grafana-dashboard-configmap.yaml, loki.yaml, promtail.yaml, kustomization.yaml',
      '.github/workflows/ci.yml — the three-job pipeline',
      'reports/functional-test-results.md — 19/19 Playwright pass; reports/live-health-audit.md — monitoring live-verified',
      'docs/sre.md — SLIs/SLOs and error-budget policy; docs/incident-example.md — rollback incident writeup',
      'terraform/main.tf — eight AWS resources; ansible/deploy.yml — the provisioning playbook',
    ],
  },
  {
    id: 'devops-masterclass',
    title: 'Full-Stack AI DevOps Masterclass',
    world: 'cloud',
    authorship: 'course',
    contribution:
      'Completed the coursework end to end: built and containerised the practice applications, wrote the GitHub Actions CI workflows, and authored the Kubernetes manifests for local and cloud deployments.',
    description:
      'A coursework repository from a college open elective: small containerised web applications (Node.js, Python, Spring Boot) with Docker Compose stacks, GitHub Actions CI workflows, and Kubernetes deployment exercises across local, AWS, Azure, and GCP.',
    technologies: [
      'Docker',
      'Docker Compose',
      'GitHub Actions',
      'Kubernetes',
      'Node.js',
      'Python',
      'Java',
    ],
    workflow: {
      metaphor: 'service-cluster',
      stages: [
        { id: 'apps', label: 'Applications', detail: 'Hello and tax-calculator apps in Node.js, Python, and Spring Boot' },
        { id: 'containers', label: 'Containers', detail: 'One Dockerfile per service; multi-app Docker Compose stacks' },
        {
          id: 'ci',
          label: 'CI workflows',
          detail: 'Seven workflow files: per-app build/test pipelines plus environment and secrets exercises',
        },
        {
          id: 'k8s',
          label: 'Kubernetes',
          detail: 'Deployment, Service, ConfigMap, and Secret manifests exercised on local, AWS, Azure, and GCP',
        },
      ],
    },
    results: [
      'Seven GitHub Actions workflow files committed in .github/workflows',
      'Containerised applications for all three language stacks',
      'Kubernetes manifests covering deployments, services, config, and secrets',
    ],
    limitations: [
      'Coursework from a college open elective — practice material, not production experience',
      'No cloud provider resources are provisioned by the repository itself; the K8s exercises were run against local clusters',
    ],
    github: 'https://github.com/yashmahajan11234567/Full-Stack-AI-DevOps-Masterclass',
    evidence: [
      '.github/workflows/ — seven workflow files',
      'Devops/ — containerised applications and Docker Compose stacks',
      'K8s/ — Kubernetes manifests for local and cloud exercises',
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