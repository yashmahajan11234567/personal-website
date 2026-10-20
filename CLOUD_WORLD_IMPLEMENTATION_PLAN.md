# Cloud World — Clear Path, Spacious World, Projects Mountain, Project Cards

**Date:** 2026-10-15 (supersedes the 2026-10-14 plan; all four stages of that
cycle completed and logged — see `CLOUD_WORLD_ITERATION_LOG.md` for the
evidence trail). **Status:** Stage 1 in progress under the new requirements.

**Route under test:** `http://localhost:4173/#/cloud-world` (production build).
**Protected scope (never touched):** `src/game/**`, `src/content/worlds.data.ts`,
`src/content/types.ts`, `src/App.tsx`, routing, shared navigation,
`advance(time / 1000, true)` timing line, smiling-cloud avatar geometry.

---

## Audit — root causes for the NEW requirements (measured from source + live build)

### N1 — Skill signs crowd/obstruct the route (req 1)
- `SKILL_STOPS` place signs at `pathCenterX(z) ± 6.2u` with board scale 2.6.
  The cloud plank's base lobe is `sx=1.55` local → half-width `1.55×2.6 ≈ 4.03u`,
  so the board edge reaches `6.2 − 4.03 ≈ 2.2u` from the path centerline while
  `pathHalfWidth` runs 2.6–3.8u → **the sign boards literally overhang the
  walking path**. This is the "signs obstruct the route" the recording shows.
- Hit-spheres (`1.9×scale`) are invisible and non-colliding, but at scale 2.6
  they reach `6.2 − 4.9 ≈ 1.3u` from centerline → hover/click fires from the
  path itself.
- Tree scatter keeps `d < 5.5 → skip` from centerline; a foreground broadleaf
  (blob reach ≈ 3.1u at scale 1.7) can overhang the path edge on max-halfWidth
  stretches (5.5 − 3.1 = 2.4 < 3.8). Rare but real.
- Fix: signs at ±9.5u, scale 3.0 (skills) / 3.6 (projects), tree scatter
  clearance 5.5 → 6.5 (mirrored in the shared obstacle model), corridor audit
  script that walks the whole route and asserts clearance.

### N2 — Mountain too close to the final skill (req 2)
- Last skill z≈84(+nudge), PROJECTS sign z=88, tunnel mouth z=100 → only ~16u
  of open ground after the last skill; the mountain "appears" at the end of
  Skills Valley. Camera/orbit constants (`CANYON_Z0=97`, `CANYON_Z1=178`) and
  the path-straightening windows (`smoothstep(92,108)`/`(168,184)`) all
  assume the old z layout.
- Fix: shift the whole mountain zone +30u — tunnel z 130..200, approach
  46u+ of open terrain, lanterns z≈122, PROJECTS billboard z≈112 (visible
  from the vista), projects markers z 218..238, avatar z-clamp 235→252,
  canyon camera clamps and path-straightening windows shifted to match.
  Everything derived from the same constants so the bore/path/camera stay
  coherent.

### N3 — Project cards: wrong set + no working links (req 3)
- `PROJECT_DATA` lists `rxverify, medigen, go-microservices`.
- **DevOps Masterclass verified REAL:** repo
  `github.com/yashmahajan11234567/Full-Stack-AI-DevOps-Masterclass`
  (public, 119 commits, 72 by the owner; created 2026-06-23). Contents:
  two multi-service lab apps (`app1-hello`: node+python+springboot behind one
  compose file; `app2-tax-calculator`: node/python/spring/frontend), 7 GitHub
  Actions workflows (build-test + docker-build-push jobs; checkout@v7,
  setup-node@v6, `npm ci`, `npm test --if-present`). Root README is a title
  only; no repo description → the card copy must be derived from the
  verified structure, honest that it is coursework/lab practice.
- Correction to the brief: the content model's `Project` interface DOES have
  `github?: string` (`types.ts:281`) and all three cloud projects carry real
  URLs — the previous cycle removed the card link to satisfy "exactly one
  button", not because the field was missing. The new brief asks for a valid
  project link again → add one project link per card, driven by `github`,
  validated nonempty/absolute, alongside the single Return button.
- `worlds.data.ts` (PROTECTED) keeps `projectOrder: rxverify, medigen,
  go-microservices` — so the switch is Cloud-World-only: new
  `devops-masterclass` entry in `projects.cloud.ts` (NOT protected) + the
  Cloud World's own `PROJECT_DATA` list drops `medigen`, adds
  `devops-masterclass`. The 2D game world's progression is untouched.

### N4 — Project sign titles unreadable (req 4)
- `getTitleTexture` shrinks a single line to fit `0.9×2048px`:
  "RxVerify — Digital Prescription Verification" (44 chars) lands at
  **≈87px on a 1024px-tall canvas** — that is why the boards read as smudges.
- Fix: measure-based wrapping (1→2→3 lines) with a font floor, per-title
  layout, cream halo stroke for contrast, wider project boards (scale 3.6),
  text kept inside the silhouette (max width ≈0.74 of canvas).

### N5 — Popup (req 5): keep, extend
- Full-screen scrim + cloud card + single Return button shipped and verified
  last cycle (20/23 → all 23 after probe fixes). Preserve; add the project
  link (N3) while keeping exactly ONE return action.

---

## Stage table (new requirements)

| # | Stage | Files | Fixes |
|---|-------|-------|-------|
| 1 | Clear skill path: signs outward (±9.5u), larger (3.0), wrapped lettering, corridor audit | `CloudWorld3D.tsx`, `Signs.tsx`, `world.ts`, `Vegetation.tsx`, `Markers.tsx` | N1, N4 (sign text) |
| 2 | Spacious transition + mountain/billboard/lanterns shift (+30u), full-mountain vista | `MountainPassage.tsx`, `CloudWorld3D.tsx`, `CloudCharacter.tsx`, `world.ts`, `Terrain.tsx` | N2 |
| 3 | DevOps Masterclass entry + Cloud-World project switch + working project links | `projects.cloud.ts`, `CloudWorld3D.tsx`, `CloudCard.tsx`, `CloudCard.css` | N3 |
| 4 | Project sign title wrap + bigger boards (longest title tested explicitly) | `Signs.tsx`, `Markers.tsx` | N4 |
| 5 | Popup polish w/ project link, single Return preserved | `CloudCard.tsx/.css` | N5 |
| 6 | Full regression + visual verification (route, tunnel, cards, movement, FPS) | verification only | all |

Execution per stage: implement → `npm run build` → Playwright at :4173 →
screenshots (same pinned positions per stage) → vision/pixel review → fix →
retest → log in `CLOUD_WORLD_ITERATION_LOG.md` → report → **STOP for approval**.

### Stage 1 detail (current)
- `SKILL_SIGN_STATIONS`: first sign z=16 (≥16u from spawn), stations ~13u
  apart through z≈94, alternating sides.
- `clearSignPosition(z, side, 9.5)`: signs center ≥9.5u from centerline;
  board edge ≥4.5u clear of the path; also enforce ≥6u spacing from every
  other placed sign.
- Tree scatter clearance 5.5 → 6.5 in BOTH `Vegetation.getTreeSpecs()` and
  `world.getSignTreeObstacles()` (they must stay in lockstep — same seed,
  same consumption order, same rejection rule).
- `Signs.tsx` text: measure-based wrap (1/2/3 lines), font floor 300px (big),
  cream halo, maxW 0.74; skills scale 3.0, project signs scale 3.6.
- Corridor audit script `qa/stage1-corridor-audit.cjs`: walks z −10..100
  (spawn→last skill), asserts (a) no tree/rock/shrub within corridor
  (halfW+0.6), (b) every sign board ≥1.5u outside corridor, (c) sight-line
  to each sign face unobstructed at approach, (d) titles readable
  (vision on approach screenshots).

### Stage 2 detail
- Constants shift: `TUNNEL_Z0 100→130`, `TUNNEL_Z1 170→200`, lanterns
  z≈122, PROJECTS billboard z≈112 left, path-straightening smoothstep
  windows (92,108)→(122,138) and (168,184)→(198,214), `CANYON_Z0 97→127`,
  `CANYON_Z1 178→208`, avatar z-clamp 235→252, character path-lock window
  95..175 → 125..205, project markers z 196..226 → 218..238 (fits terrain
  z≤260), terrain warm-band gates shifted (+30). All gates derived from one
  set of named constants so nothing drifts.
- Vista verification: pinned cam at z≈100 and z≈115 showing the full
  mountain silhouette + billboard + mouth before entry; walk-through bore
  shots at the new z; re-run live clearance audit against
  `__cwMountainDomes` (0 intersections required).
- Billboard: `PROJECTS` sign scale 3.4, left side, facing approach, clear
  of mountain mass (clearance-gated), visible ≥40u out.

### Stage 3 detail
- Add `devops-masterclass` to `projects.cloud.ts` (verified facts only —
  title, honest lab/coursework framing, compose+CI structure, 7 workflows,
  solo authorship, real URL, limitations: coursework/lab, no production
  deployment, no IaC beyond workflow files).
- `PROJECT_DATA` in CloudWorld3D: `['rxverify','devops-masterclass','go-microservices']`.
- `CloudCard`: project link from `entry.github` when it matches
  `/^https:\/\/github\.com\/\S+$/`, target=_blank rel=noopener; Return
  button stays the only close action. Test: all 3 project cards' link href
  == data; 2 skill cards unchanged.

### Stage 4 detail
- Longest title ("RxVerify — Digital Prescription Verification" and the new
  DevOps Masterclass title) rendered on the sign at the final scale: assert
  via canvas-texture pixel probe (text pixels present in 2–3 bands, none
  clipped at silhouette edge) + vision read.

### Stage 5 detail
- Re-verify all Stage-3-of-old-cycle popup assertions with the link added:
  exactly one `.cloud-card-return`; link count on project cards = 1; skill
  cards = 0 links; movement lock; ×5 open/close; Escape; 390×844.

### Stage 6 detail
- Full route: spawn→valley→vista→bore→sunset; console 0 errors; FPS ≥30
  headed; `advance(time / 1000, true)` verbatim; build clean; regression of
  every prior acceptance criterion (lantern pulse, clearance audit, path
  lock, camera clamps).

## Baseline assets (unchanged)
`qa-screenshots-newreq-baseline/`, `qa-screenshots-stage1-newreq/`,
`qa-screenshots-stage2-newreq/`, `qa-screenshots-stage3-newreq/` — prior
cycle evidence. New stage shots go to `qa-screenshots-r2-stage<N>/`.

---

# 2026-10-16 redesign execution record (supersedes the stage table above)

Both briefs (four category signs; mountain + on-face PROJECTS) are COMPLETE —
full evidence in `CLOUD_WORLD_ITERATION_LOG.md` (2026-10-16 redesign entry)
and `qa-screenshots-redesign/`. Summary of shipped state:

- Skills Valley: exactly four category boards (z 18L/34R/50L/64R, scale 2.4),
  overlays driven by `src/cloud-world-3d/categories.ts` from PORTFOLIO.
- Mountain: layered massif (larger interpenetrating domes + base skirts +
  vertex-color strata), 0 bore blockers at the 1.15 margin.
- PROJECTS: mounted variant of CloudSign hanging on the mount-face panel
  directly above the tunnel mouth; valley billboard removed.
- Suites updated to the new contract: stage1 31/31, stage3 48/48, stage4
  13/13, corridor PASS, traversal PASS.

---

# 2026-10-17 mountain polish + billboard redesign (execution record)

Both briefs COMPLETE — evidence in `CLOUD_WORLD_ITERATION_LOG.md` (2026-10-17
entry) and `qa-screenshots-polish/`. Shipped state:

- Mountain: angular ridge system (`src/cloud-world-3d/ridge.ts`) — connected
  crest lines, flat facets, plateau `edgeFloor` for the mount panel, one
  merged mesh + vertex-color strata + flatShading. 0 bore blockers.
- PROJECTS: rectangular 17×4.5u framed billboard with emissive border + 12
  staggered cloud lights, mounted on the plateau face above the tunnel;
  cloud-shaped sign removed.
- All prior gameplay guarantees re-verified: traversal, path-lock, corridor,
  lanterns, 31/31 + 48/48 + 13/13 suites, 0 console errors.

---

# 2026-10-17 mountain reconstruction v3 (execution record)

User rejected the ridge-wedge build ("triangular slabs"). Replaced with ONE
connected surface mesh (`mountainSurface.ts`): cross-sections stitched along
the footprint — separate silhouettes impossible by construction. Iterations
c1-c7 (vision + pixel band-probe each cycle) fixed the billboard mount (panel
plateau + true front anchor), the left-of-portal sky slot (shoulders widened,
portal brow, footprint 110), and the dark mouth (bore lights 20 @ portal).
Final vision pass: coherent mass from approach/frontal/oblique; billboard
clear; arch carved and lit. Regression: 31/31 + 48/48 + 13/13, traversal
197.2, corridor PASS, lanterns 1.219-1.65, 0 console errors. Full evidence in
CLOUD_WORLD_ITERATION_LOG.md (2026-10-17 v3 entry) and qa-screenshots-polish/.

# Mountain flat-wall regression fixed — 2026-10-17
- CAUSE: stitching loop N=8 vs 13-point profile in mountainSurface.ts → missing right-slope faces (black triangles) + shallow 21° wall at footprint ±110.
- FIX: N=PROFILE.length (consistent outward winding, skirts stitched); peak 44u; footprint ±78; edgeFloor 0.12; profile steepened at crest.
- VERIFIED: tsc clean; build ✓; approach/frontal/oblique show distinct peak + irregular ridgeline + connected mass; tunnel traversing (entering 105.8→inside 137.2→exiting 178.8, path-lock 0.45u); interactions 31/31; regression 13/13; 0 console errors.
- Files changed: src/cloud-world-3d/mountainSurface.ts, src/cloud-world-3d/MountainPassage.tsx. Protected files untouched. Nothing committed/pushed.
