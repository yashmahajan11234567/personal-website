# Full-Portfolio Audit Report — 2026-10-16

**UPDATE (same day, later session): K1, K2, K3 were approved and are now FIXED.
See section 9 at the end of this report for the implementation evidence, bundle
before/after, and exact test results. Sections 1–8 below record the audit as
it stood when the defects were found; the "blocked on approval" status in
section 3 is superseded for K1–K3.**

Scope: every route and world — hero (`/`), Data World (`#/data-world`),
Cloud World (`#/cloud-world`) — at dev (:5195) and production (:4173) builds.

Companion evidence: `CLOUD_WORLD_ITERATION_LOG.md` (2026-10-16 entry),
fresh screenshots under `qa-screenshots-audit2/`, audit scripts `qa/audit2-*.mjs`.

---

## 1. Routes and features audited

| Route / feature | Evidence |
|---|---|
| Hero cinematic (layers, fitter, pin lifecycle) | `qa/audit2-hero.mjs`, screenshots, 0 errors |
| Hero selection hold (2 boards) | pixel probe + vision pass |
| Hero keyboard route (Enter→scroll→Tab→activate) | `qa/audit2-enter-scroll2.mjs` |
| Hero reduced-motion track | `qa/audit2-reduced-motion.mjs` (full-scroll latch) |
| Hero responsive 390/768/1440 | `qa/audit2-responsive.mjs` (no h-scroll anywhere) |
| Skip link | `qa/audit2-skiplink.mjs` (found K1) |
| Data World boot, Enter dismissal, movement | `qa/audit2-dataworld.mjs` |
| Data World contents drawer + InfoPanel open/close (Back, Escape) | same |
| Data World exit → hero, leak cycles ×3 | `qa/audit2-leaks.mjs` |
| Data World GitHub links | curl HEAD against every content URL |
| Cloud World corridor/clearance | `qa/stage1-corridor-audit.cjs` PASS |
| Cloud World tunnel traversal | `qa/stage2b-walkthrough.mjs` z 0→194.3 |
| Cloud World lantern pulse | `qa/lantern-check.mjs` 1.151–1.65, never dark |
| Cloud World interactions (skill+project cards) | `qa/stage1-interactions-final.mjs` 29/29 |
| Cloud World card suite (scrim/lock/Escape/390px) | `qa/stage3-verify-final.mjs` 48/48 |
| Cloud World final regression (FPS/exit/re-enter) | `qa/stage4-final-regression.mjs` 13/13 |
| Cloud World sign text layout (10 signs) | `qa/stage1-layout-probe.mjs` ALL FIT |
| Production routing (deep links, Back, reload, unknown hash) | `qa/audit2-prod-sweep.mjs` |
| Bundle analysis | dist/assets sizes, import-graph inspection |

## 2. Skills and tools actually used

`frontend-cinematic-qa` (Playwright hygiene, R3F wait patterns, geometry-first
verification, vision rate-limit handling), `systematic-debugging`
(root-cause-before-fix; e.g. the K1 hash trace), `playwright-skill`,
`chrome-devtools`-equivalent evidence via Playwright console/network/pageerror
pipes (no separate DevTools MCP session was opened; all console/network/layout
evidence came from Playwright instrumentation — stated plainly).
Vision inspection on 6 fresh captures, cross-checked with pixel/math probes
per the skill's geometry-first rule.

## 3. Defects found

### Fixed this session
| ID | Sev | Defect | Root cause | Fix |
|---|---|---|---|---|
| F1 | P1 | `Bluestock_fintech` GitHub URL 404s on two panels | repo renamed on GitHub to `Bluestock-fintech` | URL updated in `projects.data.ts`, `skills.data.ts`; verified 200 |
| F2 | P1 | Cloud World project cards had no repository link (2026-10-15 requirement N5 unimplemented) | card component never rendered `entry.github` | `CloudCard.tsx` renders one validated link; suites updated to assert href ≡ data |
| F3 | P2 | first-pass link color 4.38:1 vs cream (< 4.5:1 AA) | hue picked for style, contrast never computed | #17677A → 6.09:1 / 5.36:1 (computed) |
| F4 | P3 | drawer help says "activate the Close button"; no Close exists | panel redesign replaced it with Back | copy fixed in `WorldShell.tsx`; stale InfoPanel comment corrected |

### Confirmed, blocked on protected-path approval
| ID | Sev | Defect | Why blocked |
|---|---|---|---|
| K1 | P1 | Skip-link activation inside a world (Tab→Enter) sets hash `#main`; `worldForHash('#main')` → 'hero' → world unmounts, recruiter ejected | root cause in protected `App.tsx` |
| K2 | P2 | Keyboard-only users cannot reach world selection: the Enter-to-scroll listener requires focus inside `.cinematic-hero` (tabIndex=-1, unreachable); the skip link is the only tab stop | fix touches protected `App.tsx` or `CinematicHero.tsx` |
| K3 | P2 | Hero eagerly ships the whole three.js stack: `App.tsx` statically imports `CloudWorld3D`; index chunk 1431 KB (Phaser, by contrast, is lazy: engine chunk 1398 KB loads on world mount) | one-line dynamic import in protected `App.tsx` |
| K4 | P3 | IBM Plex Mono fetched from fonts.googleapis.com (external, render-blocking) | bundling requires installing `@fontsource/ibm-plex-mono` (dependency installs prohibited this session) |

Reproduction for K1: open `#/cloud-world`, press Tab (focuses skip link),
press Enter → hash becomes `#main`, hero renders, world gone (verified on both
worlds, `qa/audit2-skiplink.mjs`).

## 4. Build / lint / test commands actually run

- `npm run build` — pass, 3 runs (13.3s / 14.5s / 9.6s), zero TS errors
- `npm run lint` (oxlint) — 0 errors; warnings only in qa/* scripts + 1 pre-existing hook warning
- `npx playwright test --list` — 0 specs collected (config excludes `qa/_legacy-*`; active suites are `qa/*.mjs`, all run)
- `node qa/stage1-corridor-audit.cjs` — PASS (×2)
- `node qa/lantern-check.mjs` — min 1.151 / max 1.65 / n=16
- `node qa/stage1-interactions-final.mjs` — 29/29 (after F2, assertions strengthened)
- `node qa/stage3-verify-final.mjs` — 48/48 (same)
- `node qa/stage2b-walkthrough.mjs` — traversal PASS
- `node qa/stage4-final-regression.mjs` — 13/13
- `node qa/stage1-layout-probe.mjs` — ALL LAYOUTS FIT
- `qa/audit2-*.mjs` — 10 scripts, all executed, results inline above

Exact pass counts: 29/29, 48/48, 13/13, PASS×2, ALL-FIT; zero console/page
errors in every single run this session; zero 4xx/5xx except the (real,
external) Bluestock 404 that motivated F1.

## 5. Screenshots (all fresh, this session)

`qa-screenshots-audit2/`:
- `hero-1440x900.png`, `hero-scrolled.png` (vision-passed), `hero-reduced-motion-hold.png`, `hero-390x844.png`
- `dw-01-boot` … `dw-06-back-to-hero` (data world journey)
- `cloudworld/01-billboard-approach.png` (vision: fully readable, unobstructed)
- `cloudworld/03-bore-interior.png` (vision + zoom: open, lit, floor solid)
- `cloudworld/04-rxverify-sign.png`, `05-sunset-arrival.png`, `06-skills-approach.png`
- `cloudworld/card-rxverify-with-link.png` (F2/F3 evidence), `cloudworld/card-390x844.png`
- `responsive/*` (mobile + tablet, all three routes)

## 6. Performance measurements

- Draw calls 346, triangles 487k, 480-frame mirror — same envelope as the
  accepted Stage-4 baseline; no optimization performed, none needed at these numbers.
- Bundle: index 1431 KB (eager, includes three.js — K3), engine 1398 KB (lazy),
  vendor 120 KB.
- Heap across 3 enter/exit cycles per world: data 117→120 MB, cloud 66→80 MB,
  no monotonic growth; 0 stray canvases/pin-spacers after each cycle.

## 7. Remaining uncertainty

- Accessibility was audited by keyboard journeys, focus traversal, contrast
  math, and semantic inspection — no full screen-reader pass was run.
- Vision inspections are single-model readings; every geometric claim
  (clearance, lantern range, board fit) was cross-checked numerically.
- Cloud World movement physics was re-verified by the suites above, not
  re-tuned; diagonal-speed variance noted in the 2026-10-13 log remains
  measurement noise, not re-measured on an idle machine.

## 8. Git state

- Nothing committed, nothing pushed, no dependency installed, no asset downloaded.
- Protected paths (`src/game/**`, `worlds.data.ts`, `types.ts`, `App.tsx`,
  routing) — untouched by this session; pre-existing working-tree changes to
  `App.tsx`/`worlds.data.ts` (the user's Cloud World integration) preserved as found.
- All 529 pre-existing deletions (`left side/` frames, legacy qa artifacts) preserved.
- New files: `qa/audit2-*.mjs` (10 audit scripts), this report,
  `CLOUD_WORLD_ITERATION_LOG.md` entry.
- Modified by this session: `src/content/projects.data.ts`, `src/content/skills.data.ts`,
  `src/components/WorldShell.tsx` (1 line), `src/components/InfoPanel.tsx` (comment only),
  `src/cloud-world-3d/CloudCard.tsx`, `src/cloud-world-3d/CloudCard.css`,
  `qa/stage1-interactions-final.mjs`, `qa/stage3-verify-final.mjs`.

---

## 9. K1 + K2 + K3 — approved and implemented (2026-10-16, later session)

User approval received for all three protected-path fixes. Scope held to the
minimum: `src/App.tsx` (K1+K3), `src/cinematic/CinematicHero.tsx` (K2,
non-protected), `src/App.css` (fallback style). No other protected file
touched; the user's pre-existing uncommitted changes preserved (verified by
re-diff: App.tsx vs HEAD still contains their integration changes plus only
the additions below).

### Changes

**K1 — skip link no longer ejects the world** (`App.tsx`)
- New `isInPageAnchor(hash)`: any hash that is non-empty and does not start
  with `#/` is an in-page anchor, not a route.
- `applyHash` returns early for such hashes: the current world stays mounted;
  the browser's own scroll-to-anchor runs. Only an EMPTY hash still means
  "leave the world and return to the hero" (Back button / exit flows
  unchanged). Unknown `#/...` routes still fall to the hero (re-verified).

**K2 — keyboard-only world selection** (`CinematicHero.tsx`)
- The Enter/Space-to-selection-hold listener moved from the hero container
  (unreachable: `tabIndex={-1}`, the page's only tab stop is the skip link)
  to `window`, with guards so it cannot misfire now that it sees every
  keydown:
  1. no-op unless the store still says `currentWorld === 'hero'` (once a
     world is chosen the shortcut is dead);
  2. no-op while any `[role="dialog"][aria-modal="true"]` is open (info
     panel, cloud card own the keyboard);
  3. no-op when focus is on a BUTTON/A/INPUT/SELECT/TEXTAREA inside the hero
     (their Enter/Space means "activate this") — unchanged from before;
  4. unchanged coarse-pointer and reduced-motion opt-outs.
- Hero lint warnings after the change: 2 warnings, both pre-existing in HEAD
  (verified by linting the HEAD copy: same 2). Zero new lint findings.

**K3 — Cloud World lazy-loaded** (`App.tsx` + fallback style in `App.css`)
- `React.lazy(() => import('./cloud-world-3d'))` replaces the static import;
  the route is wrapped in `<Suspense>` whose fallback is an `aria-hidden`
  full-viewport div painted `var(--color-bg, #f5f5f5)` (the app background —
  body is light, so the handoff shows no dark flash).

### Bundle before → after (measured on dist/assets, same machine)

| Chunk | Before | After | Role |
|---|---|---|---|
| index (eager) | 1431.4 KB | **276 KB** (−80.7%) | hero + data world shell |
| cloud-world-3d (NEW, lazy) | — | 1156 KB | three.js + R3F + Cloud World, loads on route mount |
| engine (lazy, Phaser) | 1398.3 KB | 1398.3 KB | unchanged, already on-demand |
| vendor (gsap+ zustand) | 120.5 KB | 121.0 KB | unchanged |

The hero's first-load JS dropped by ~1.16 MB. The lazy chunk is requested
only when the cloud route mounts (verified by network instrumentation below).

### Exact test results (all re-run AFTER the changes, prod :4173 unless noted)

- `npm run build` — ✓ built in 13.19s, zero TS errors
- `npx oxlint src/App.tsx src/App.css src/cinematic/CinematicHero.tsx` — 0
  errors, 2 warnings (both pre-existing in HEAD, verified against the HEAD copy)
- `qa/audit2-kfixes.mjs` (new, dedicated) — ALL PASS:
  - K3 hero load: lazy chunk NOT requested on `/`; hero renders; 0 console errors
  - K3 cloud navigation: chunk loads, canvas mounts, fallback removed,
    `__cwAvatarHist` > 30 samples, 0 failed requests
  - K3 deep-link reload inside `#/cloud-world`: world boots through the lazy
    path; hash preserved; 0 errors
  - K3 exit/re-enter ×2: hero restores each time, world re-mounts each time
  - K1 data world: after Tab+Enter on skip link — hash `#main`, hero NOT
    rendered, world STILL MOUNTED, 0 errors
  - K1 cloud world: same result, 0 errors
  - K2 keyboard-only journey (dev :5195): Tab→Tab→Enter scrolled to 4410
    (was: 0 before the fix), both boards latched tabbable, Tab focused
    `world-board-data`, Enter activated it → `#/data-world` mounted, 0 errors
  - K2 in-world guard: Enter inside the data world does not scroll-jack and
    does not eject — hash unchanged, world still mounted
- `qa/stage1-interactions-final.mjs` — **29/29 pass** (incl. per-project
  repository-link href ≡ data assertions)
- `qa/stage3-verify-final.mjs` — **48/48 pass**
- `qa/stage4-final-regression.mjs` — **13/13 pass** (movement, FPS mirror,
  346 draw calls, Escape exit, re-enter, 0 console/network errors)
- `qa/stage1-corridor-audit.cjs` — **PASS** (0 corridor intrusions, first
  sign 19.37u from spawn, 0 console errors)
- `qa/audit2-prod-sweep.mjs` — re-run post-change: hero / data-world /
  cloud-world / unknown `#/bogus-route`→hero / browser Back / reload-in-cloud
  ALL CORRECT, 0 errors, 0 4xx
- `npx playwright test` — 0 specs collected (config excludes `qa/_legacy-*`
  by design); the active coverage is the qa/*.mjs suites above, all executed.

### Git state after the K-fixes

- Nothing committed, pushed, installed, or downloaded.
- Files changed for K1–K3: `src/App.tsx`, `src/App.css`,
  `src/cinematic/CinematicHero.tsx`, plus new `qa/audit2-kfixes.mjs`.
- `src/game/**`, `src/content/types.ts`, `src/content/worlds.data.ts` remain
  untouched by this session.

---

## 10. RxVerify re-audit + skills refresh (2026-10-17)

Repository inspected: `digital-prescription-verification-devops`, local clone at
`C:\Users\hitoy\Downloads\digital-prescription-verification-devops`, HEAD
`d5c1b62` (local) vs `origin/main` `778e9cd` ("project complete", pushed
2026-10-17 — the Mac work IS on GitHub; the earlier "25 minutes ago" web view
and the fetched ref agree). All findings below are from `git show origin/main:…`
against that commit. The RxVerify repo was NOT modified.

### Confirmed improvements (evidence)
- **Kubernetes is now project-demonstrated**: `k8s/` tree at origin/main —
  Deployment (RollingUpdate maxSurge 1/maxUnavailable 0, readiness+liveness
  probes on /health, cpu/mem requests+limits, Secret, PVC), Service,
  ServiceMonitor, kustomization; `start-cluster.sh` deploys to Minikube;
  `docs/incident-example.md` records a live rollout-undo recovery;
  `reports/live-health-audit.md` records pods Running and SQLite surviving
  pod restarts.
- **Monitoring stack**: Prometheus ServiceMonitor (job=rxverify :5000),
  Grafana 5-panel dashboard via ConfigMap, Loki + Promtail DaemonSet;
  app exposes /metrics (prometheus-flask-exporter). Live-verified:
  `up{job="rxverify"}=1`, Loki range queries returning streams.
- **CI pipeline changed**: old 8-job pipeline GONE → 3-job ci.yml
  (ruff+pytest / pip-audit+Trivy CRITICAL-HIGH gate / Buildx→GHCR).
- **PostgreSQL removed → SQLite** (compose + PVC). Old "PostgreSQL (prod)"
  claims are stale on the remote.
- **App work**: blueprint split (src/admin|doctor|pharmacist|auth), RBAC
  decorators, notifications model+routes, admin CRUD, seeding fixes.
- **Tests**: 19/19 Playwright E2E recorded against Minikube
  (reports/functional-test-results.md); pytest 5 tests; Maven demo 4/4.
  The old "183 tests" suite was deleted upstream.
- Terraform (8 AWS resources, validate-passed) and Ansible playbook
  unchanged from the previous audit and still accurate.

### Deliberately NOT claimed
- **Helm**: README's table lists Helm, but zero Helm commands/Chart.yaml
  exist anywhere in scripts/workflows — monitoring was installed via
  kube-prometheus-stack interactively (plan doc); no committed artifact.
  Not added as a skill.
- **Jenkins/GitLab CI as standalone skills**: files exist (Jenkinsfile,
  .gitlab-ci.yml) — mentioned inside the CI/CD skill evidence, not claimed
  as separate competencies.
- **Traces/OpenTelemetry**: explicitly "would go here" in the demo script —
  planned, not implemented. Not claimed for RxVerify.
- **Production readiness / SLA**: docs label the SLA "Demonstration Only";
  single EC2 target. Limitations state this.

### Portfolio changes made
- `src/content/skills.cloud.ts`:
  - `kubernetes`: TRAINING → **BOTH**; RxVerify k8s/ evidence (probes,
    RollingUpdate/rollback, PVC persistence, Minikube deploy), coursework
    retained as secondary; treatment scaffold → solid (project-backed).
  - `ci-cd`: stale "eight-job" claims → current three-job pipeline (+ the
    historical note), Jenkinsfile/GitLab equivalents as evidence.
  - `observability`: now leads with the RxVerify Prometheus/Grafana/Loki
    deployment (ServiceMonitor, provisioned dashboard, Loki ingestion,
    SRE docs); repo link to RxVerify added.
- `src/content/projects.cloud.ts` (rxverify): description rewritten to the
  current system (Minikube + probes + rollback, monitoring stack, GHCR
  pipeline, app-side audit fixes); technologies add Kubernetes, Minikube,
  Prometheus, Grafana, Loki, Playwright; workflow stages corrected
  (SQLite not PostgreSQL, 3-job CI not 8, k8s + monitoring stages added,
  stale "183 tests" removed); results/limitations/evidence re-pointed to
  the current files; limitations now state Minikube-only and thin Loki volume.
- `src/cloud-world-3d/categories.ts`: cover notes refreshed (K8s/Minikube
  inside Containerization; Prometheus/Grafana/Loki inside CI/CD &
  Observability); Containerization tagline adds Minikube.

### Verification (fresh build + live browser)
- `npm run build` ✓; tsc ✓; TRAINING-leak integrity check: 0 offenders.
- Live: Containerization overlay lists Kubernetes with **no training chip**
  + new Minikube cover note; RxVerify card shows new description, chips
  (Kubernetes · Minikube · Docker · …), correct repo link (vision pass);
  all 4 category overlays re-verified by click (titles, skill lists,
  1 button / 0 links each).
- Regression: stage1 31/31 · stage3 48/48 · stage4 13/13 · tunnel traversal
  0→191.7 path-lock 0.47u · 0 console errors.
