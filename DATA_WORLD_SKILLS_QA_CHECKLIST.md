# DATA_WORLD_SKILLS_QA_CHECKLIST.md — Stage K refinement: implementation & acceptance plan

For use when the refined design plan is approved and implementation starts. Preview: `npx vite preview --port 4173` → `http://localhost:4173/#/data-world`. Probe hooks: `window.__worldProbe()`, `window.__worldScene`, `scene.transportPhases`, `scene.chapterBeingBuilt`, `scene.isBlackedOut`, `scene.isPlayerOccluded`. Playwright via repo `node_modules` (`npx playwright` / node scripts as in `qa/`).

## 1. Staged implementation plan

| Stage | Work | Exit criteria |
|---|---|---|
| K1 | Add the 16 `skills-*` PNGs to `public/assets/data-world/` + register texture keys in `preload()` (`skills-strip`, `skills-portal-return-f0..f3`, `skills-portal-forward-f0..f3`, `skills-station-<id>[-lit]`) | all keys present in `__worldScene.textures.list` while in skills |
| K2 | `buildSkillsArtwork()` in `WorldScene` (mirror of `buildSurfaceArtwork`): strip (750,620) o(0.5,1) depth 2; return portal (0,560) o(0,1) depth 3; forward portal (1350,560) o(0.5,1) depth 3; create `skills-portal-*-anim` (4×200 ms, repeat; freeze on f0 under reduced motion) | display-list inventory matches design plan §2 depths; portal anims exist and play |
| K3 | Hide both pipe containers on `chapter === 'skills'` in `buildPipes` and in the `onArrive` visibility loop (extend the existing `hiddenBySurfaceArtwork` guard); hide plate/sign children; hide ledge rect fills (slabs baked into strip) | pipe triggers still arm (`armedPipeId` fires at x=60 / x=1350); no sign child at world x<0 |
| K4 | Station textures: `skills-station-<id>[-lit]` at the existing 96×104 StationViews, procedural canvas only as missing-key fallback | `stationCount=6`, per-id keys, lit swap on proximity ±132 |
| K5 | Gem gating: `buildInteractionProbe` only on `chapter === 'cliff'` (if approved for Stage K; otherwise defer to cleanup) | no `foundation-probe` in skills display list; gameplay suite still passes on cliff |
| K6 | Full QA pass (below) + commit | all items pass |

## 2. Visual acceptance criteria (measurable)

- [ ] Skills renders strip + 2 portals + 6 station PNGs; zero procedural `station-skill-*-idle` canvas textures in the skills texture list.
- [ ] Depth order: video < strip(2) < portals(3) < pipes(4, hidden) < label/gem(5) < stations(6) < robot(10); assert via `__worldScene.children.list`.
- [ ] Strip spans world x 0..1500, y 280..620; transparent above world y≈300 (video visible there); no seam at scrollX clamps (0 and 1500−viewW).
- [ ] Ground line at 90%±1% of viewport height at all four viewports: `(560−scrollY)/viewH`.
- [ ] Return portal spans x 0..200 with mouth on x=60; visible on arrival at every viewport incl. mobile (arrival scrollX≈90 → wing pixels at 90..200 on screen); no sign/art child at world x<0.
- [ ] Forward portal spans x 1260..1440, mouth on x=1350; off-screen on arrival at every viewport (1350 > view right edge at scrollX 0/0/11/90).
- [ ] Walk corridor y 460..560 free of opaque art except portal/station bases — screenshot while walking at x = 144, 440, 700, 830, 960, 1090, 1350.
- [ ] Robot (56×62) never obscured by strip/portals/stations while walking, jumping, or on ledges; during pipe climb the sinking robot is occluded by the portal's opaque base (player depth 2 < portal 3).
- [ ] Ledges: strip walkway slabs pixel-aligned with physics rects (300,420,120×16) and (520,350,96×16).
- [ ] Palette audit: strip/portal/station pixels only from the approved palette ± pre-baked glow tints. No brand logos anywhere in frame. No "previous/next world" text; only baked "SURFACE" / "PROJECTS" signage.
- [ ] Portals animate (frame changes over 800 ms) in normal mode; frozen on frame 0 under reduced motion; stations static idle→lit swap only.
- [ ] "SKILLS" chapter name baked into strip, readable at 1440×900 and 390×844 on arrival.

## 3. Gameplay acceptance criteria (probe-asserted)

- [ ] `worldWidth=1500, worldHeight=900`, `chapter='skills'`, spawn/arrival (144,560), `grounded=true`, `stationCount=6`.
- [ ] Stations at x = 440,570,700,830,960,1090; walking to each sets `focusedStationId`; Enter opens InfoPanel (`world-interaction`, InfoPanel mounts with the right skill id); Escape closes; click on a station opens the panel without moving the player. Hitbox = sprite rect x±48, y 456..560.
- [ ] Walk speed 150 px/s (±5%) over 600 px; gravity 900 / jump 230 / coyote 90 ms unchanged; ledges land correctly; oneWay ledge (520,350) passes through from below.
- [ ] `foundation-probe` emits at x=480 on cliff (unchanged); absent in skills if K5 approved.
- [ ] Panel open blocks world input (`panelOpen=true`); close resumes.

## 4. Chapter transition tests (all four routes)

- [ ] cliff → skills via `cliff-to-skills` (x=750): `transportPhases` = the 12 phases in exact order; `chapterBeingBuilt='skills'` during blackout; `isBlackedOut` true→false; `isPlayerOccluded` true mid-travel; arrival at (144,560), camera pre-placed, `chapter='skills'` in probe and `world-chapter` testid.
- [ ] skills → projects via `skills-to-projects` (x=1350): same assertions, destination projects.
- [ ] projects → skills via `projects-entry` (reverse travel).
- [ ] skills → cliff via `skills-entry`; on cliff, surface artwork + hidden-pipe guard intact.
- [ ] After any number of swaps: exactly the active chapter's pipe containers `visible=true`; no stale visible skin; `pageerror` count = 0.
- [ ] Held-key across swap still moves the player (`heldAtSwap` path).

## 5. Responsive tests

| Viewport | Assert |
|---|---|
| 1440×900 | zoom 2, view 720×450, scrollX 0 on arrival, ground 90%, strip covers to camera bottom (≤611 world) |
| 1280×800 | zoom 2, view 640×400 |
| 768×1024 | zoom 2, view 384×512, scrollX 11 on arrival — worst-case camera bottom 611; strip must cover |
| 390×844 | zoom 2, view 195×422, scrollX ≈90 on arrival; return-portal wing visible; no horizontal page scroll |
| 844×390 landscape | zoom drops (≤2, ≥0.25 rule), viewH ≥ 264 content band visible |
| resize mid-play | canvas RESIZE re-zooms; single full-width strip needs no re-tiling; no edge gap |

## 6. Surface regression protection

- [ ] `git status` on `src/game/**`, `public/assets/data-world/surface-*`, `public/assets/backgrounds/surface/*`: no modifications attributable to the Skills stage; Surface code paths touched only by additive guards that keep cliff behavior identical.
- [ ] Re-run existing suites unchanged: `qa/accept-dataworld-gameplay.mjs`, `qa/accept-dataworld-exit.mjs`, `qa/accept-responsive.mjs`, `qa/accept-dataworld-traversal.mjs`, `qa/accept-dataworld-robot.mjs`, `dw-verify.mjs` — all pass.
- [ ] Cliff screenshots at 1440×900 match the existing baselines in `qa-screenshots-acceptance/` within the scripts' pixel tolerance.
- [ ] cliff → skills → cliff leaves surface artwork intact (pipe-visibility guard test in §4).
- [ ] No existing uncommitted work touched; new files are only `public/assets/data-world/skills-*` + the code edits of this stage; commit only after full pass.

## 7. Diagnostics & evidence per run

- `__worldProbe()` JSON at arrival + at each station + at both pipe triggers, per viewport.
- `__worldScene` display-list inventory (type/key/x/y/w/h/depth/visible) in cliff and skills.
- `transportPhases` log for each of the 4 routes.
- Screenshots per viewport at arrival / mid / exit (new `qa-screenshots-*` folder; never overwrite existing baselines).
- Console/pageerror log empty (except the known-safe video autoplay catch).
