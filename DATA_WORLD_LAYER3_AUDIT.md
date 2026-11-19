# DATA_WORLD_LAYER3_AUDIT.md — Layer 3 (Core / Projects) audit, Phase 1: read-only

Scope: audit and design planning only. No source code, assets, geometry, portals, or
content were modified. Five planning documents were created; nothing else.

## 0. Git state (verified before and after this audit)

- Branch: `restore/data-world-386991f`
- HEAD: `2a95931a2ae6a4945b929487d4ede2abee864ab8` (= the completed Layer 2 commit, as briefed)
- Working tree BEFORE: 106 `git status --porcelain` entries — 28 modified tracked PNGs
  under `qa-screenshots-acceptance/` and `qa-screenshots-verify-fullscreen/`, plus untracked
  planning docs, QA scripts and screenshot dirs from earlier phases. All preserved untouched.
- Working tree AFTER: same 106 entries + exactly 5 new untracked files (the Layer 3 docs).
- No commits, no pushes, no resets, no stash.

## 1. Files inspected

- `src/game/engine.ts` — the only Phaser lifecycle owner (`mountWorld`/`unmount`)
- `src/game/config/worldConfig.ts` (965 lines) — the single source of world geometry
- `src/game/scenes/WorldScene.ts` (2672 lines) — scene, camera, stations, pipes, transport wiring
- `src/game/scenes/pipeTransport.ts` — the 12-phase transport state machine
- `src/game/scenes/dataPipeSkin.ts` — Data World pipe skin (mouth/plate/sign/tunnel)
- `src/game/scenes/interactionBus.ts` — engine→React event bus
- `src/game/art/worldObjects.ts` — `drawSkillStation`, `drawProjectStation`, `drawPipeMouth`, `drawSurfacePortal`
- `src/game/art/facilityArt.ts` — shared palette, `SUB_FLOOR_DEPTH = 56`
- `src/game/assets/robot/manifest.ts` — `ROBOT_FRAME_WIDTH = 56`, `ROBOT_FRAME_HEIGHT = 62`
- `src/components/WorldShell.tsx` / `InfoPanel.tsx` / `BackgroundVideoLayer.tsx` / `WorldShell.css`, `src/App.css`
- `src/content/` — `index.ts`, `types.ts`, `worlds.data.ts`, `projects.data.ts`, `skills.data.ts`
- `public/assets/data-world/*.png` — all 34 files measured (dimensions below)
- `public/assets/backgrounds/{surface,infrastructure,core}/bg.mp4` — chapter video backgrounds
- `public/assets/dashboards/*.png` — the 5 committed dashboard previews
- QA harness: `qa/accept-dataworld-*.mjs`, `qa/dw-verify.mjs` (Playwright, `BASE = http://[::1]:4173/`, preview via `npx vite preview --port 4173`)
- Layer 2 planning docs: `DATA_WORLD_SKILLS_{AUDIT,DESIGN_PLAN,ASSET_REQUIREMENTS,QA_CHECKLIST}.md`, `DATA_WORLD_FINAL_ISSUES_AUDIT.md`
- Live GitHub verification via `gh api` of: `Bluestock-fintech`, `Sql-data-warehouse`, `PRIMETradeAI`, `Projects` (all public, all exist)

## 2. Architecture in one paragraph

One Phaser 4 engine, configuration-driven. `worldConfig.ts` holds TWO layers: `WorldConfig`
(WHERE things are — geometry) and `src/content` (WHAT they say). Each chapter (`cliff`,
`skills`, `projects`) is an ISOLATED world of its own width — `chapterWorld()` builds exactly
one chapter, so an unvisited chapter does not exist in memory. Pipe travel swaps scenes
(`scene.stop()` + `scene.start()` inside the transport's `build` phase, behind a full-screen
blackout), it never teleports coordinates. React owns the shell, DOM mirror and InfoPanel;
Phaser owns the canvas. Events cross via `interactionBus` (`proximity` / `activate` / `close` /
`chapter` / `probe`). The canvas is full-screen (`Scale.RESIZE`, `pixelArt: true`,
`transparent: true`, `noAudio`) inside `.placeholder-world` (`position:absolute; inset:0;
100vw/100dvh`).

## 3. World dimensions and camera (source-confirmed)

| Constant | Value | Source |
|---|---|---|
| World height (all chapters) | 900 | `WORLD_HEIGHT` |
| Ground surface Y (all chapters) | 560 | `GROUND_Y` |
| Ceiling band starts | y=640 (`CEILING_FROM`) | worldConfig |
| Authored content band | 264 px (`CONTENT_BAND = GROUND_Y - 296`) | worldConfig |
| Sub-floor slab depth | 56 (`SUB_FLOOR_DEPTH`) | facilityArt |
| Player physics body | 10×14, offset into 56×62 frame, origin (0.5,1), depth 10 | `PLAYER`, buildPlayer |
| Walk speed / jump / gravity | 150 px/s / 230 / 900 px/s² | `PLAYER` |
| Camera zoom | target 2, clamped by `zoomForViewport(h) = min(2, h/264)`, floored to 0.25 steps, min 1 | `CAMERA`, WorldScene |
| Camera origin | (0,0) so scroll = view top-left at any zoom; `useBounds=false`, manual clamp | setupCamera |
| Vertical bias | `verticalBiasRatio = 0.40` → ground line at ~90% of viewport height | `CAMERA` |
| Camera clamp | scrollX ∈ [0, width−viewW], scrollY ∈ [0, height−viewH] | updateCamera |
| Look-ahead / follow | 56 px at speed ≥12, `1−exp(−7.5·dt)` easing | `CAMERA` |
| Viewport | canvas = full window (RESIZE); at 1440×900 → zoom 2, view 720×450; at 390×844 → zoom 2, view 195×422 | engine + zoomForViewport |

Per-chapter geometry today:

| Chapter | Width | Spawn | Platforms | Pipes |
|---|---|---|---|---|
| cliff (Surface) | 900 | (120, 560) | 6 ledges: (320,470,96,16), (520,400,80,16), (700,340,80,16,oneWay), (470,430,120,16), (620,360,80,16), (760,290,96,16,oneWay) | entry `cliff-entry` x=60; exit `cliff-to-skills` x=750 |
| skills (Infrastructure) | 1500 | (90, 560) | none (Stage K removed the 2 floating ledges) | entry `skills-entry` x=60; exit `skills-to-projects` x=1350 |
| projects (Core — THIS LAYER) | **1000** | (144, 560) = 60+84 | **2 floating ledges: (320,430,128,16), (520,360,96,16,oneWay)** | entry `projects-entry` x=60; **exitPipe: null** |

## 4. Platform geometry and artwork (measured, not from comments)

Surface (cliff) — `buildSurfaceArtwork`:
- `surface-platform.png` 1266×617 → scaled to full world width 900 (scale 0.711), bottom at
  `groundY + 124·scale`; walkable surface is source y≈563. Depth 2.
- `surface-entry.png` 428×589 → scale 0.4295, display ≈184×253, origin (0,1) at (10, 560). Depth 3.
- `surface-skills-portal.png` 427×621 → scale 0.4144, display ≈177×257, origin (0,1) at
  (662.35, 560), chosen so the visible portal is centred on the exit trigger x=750. Depth 3.

Skills — `buildSkillsArtwork` (the Layer 2 / Stage K pattern Layer 3 should mirror):
- Ground tileset: `skills-ground-left/mid/mid-alt/right.png` = 423+508+506+426 = **1863 px source
  width**, 236 px tall each; one uniform scale = `1500/1863 ≈ 0.8051`, assembled edge-to-edge from
  x=0 with TOP edge at groundY=560 (never one chunk stretched), depth 2. Display height ≈190.
- Utility props (decor, no collision, depth 2): `util-pipe-h` 324×85 @x=430 s0.8, `util-vent`
  216×147 @660 s0.5, `util-support` 320×141 @1150 s0.6, `util-pipe-v` 185×142 @1495 origin-x 1 s0.8.
- Portals: 8 frames each, source **220×288**, 10 fps → 0.8 s loop, reduced-motion = static frame 0.
  - return: origin (0,1) at x=0, display width 165 → art spans 0..165, glowing opening ≈31.5..141,
    so the arm zone 38..82 sits INSIDE the visible opening.
  - forward: origin (0.5,1) at x=1350, display width 180 → spans 1260..1440, centred on trigger 1350.
  - Grounding: `y = groundY + textureBottomPad(key)·dispH + GROUND_OVERLAP_PX(3)`, re-applied per
    animation frame (frames carry ~5 px transparent bottom pad).

Projects (Core) — CURRENT STATE, important: there is **no `buildProjectsArtwork`**. In
`buildTerrain`, `artCoveredLedges` is true only for cliff/skills, so today the projects chapter
renders: procedural subfloor + ground rim, the TWO LEDGES AS VISIBLE DEBUG RECTANGLES (dark fill +
cyan rim), 4 procedural `drawProjectStation` canvases (176×132), ONE procedural pipe skin at x=60
(the hide-guards cover only cliff and skills), and the procedural chapter label at (40, 560−62−46
= 452), depth 5. Background is the video `backgrounds/core/bg.mp4` (BackgroundVideoLayer maps
chapter `projects` → `core`). So Layer 3's job is exactly: portal art ×2, ground tileset,
server art ×4 (idle/lit), and hiding the procedural pipe containers like Layer 2 did.

## 5. Portals and transport (Audit B)

Pipe constants: `PIPE_HALF_WIDTH = 22`, `PIPE_HEIGHT = 60` → mouth rect = x±22, y−60..y (44×60).
`pipeRect()` is used for both trigger and rendering. Trigger: `pipeNearX` arms within
|dx| ≤ `PIPE_TRIGGER_RANGE(30) + 22` = 52; `updatePipes` actually fires only when
|dx| ≤ 22 (arm zone). So for a pipe at x: near zone = x±52, **arm/fire zone = x±22**.

- Skills → Core trigger: `skills-to-projects` at x=1350 (skills width 1500 − 150).
  Arm zone 1328..1372; near zone 1298..1402. Portal art spans 1260..1440 → fire zone inside the
  visible opening. VERIFIED by QA `accept-dataworld-cards-portal.mjs` (SKILLS x list, phase log).
- Core → Skills trigger TODAY: only the entry pipe `projects-entry` at x=60 (arm zone 38..82).
  `chapterViaPipe` maps an entry pipe to `previousChapter` = `skills`, so return travel already
  works through the arrival pipe. There is NO separate return portal yet (`exitPipe: null`).
  Layer 3 adds a dedicated return portal (see LAYOUT_PLAN).
- The Layer 2 alignment fix (DATA_WORLD_FINAL_ISSUES_AUDIT ISSUE 1): the trigger position is
  authoritative; the portal ARTWORK was moved so the visible opening contains the arm zone
  (skills return: art spans 0..165 around trigger x=60). Rule for Layer 3: place art first, then
  verify arm zone ⊆ visible opening.
- Transport: 12 phases `approach→activate→entering→occluded→conduit→blackout→build→position→
  reveal→emerging→settle→idle`, per-phase ms summing to `TOTAL_TRAVEL_MS = 3048`
  (`PIPE_TRAVEL_MS = 1100` is a legacy exported const, not the real duration). Camera at
  activation: none portal-specific — destination `create()` snaps to
  `(landingPoint.x, groundY−100)` = chapter spawn; on arrival `snapCameraTo(player.x,
  player.y−100)`. `onArrive` shows EVERY pipe of the active chapter (the Layer 2 fix that restored
  the exit pipe) and respects per-chapter art-hidden guards.
- Pipe skin visuals (procedural, depth 4 container at (pipe.x, pipe.y)): 44×60 mouth, chapter
  plate above (≥120×18), sign board left of the mouth (≥132×50 incl. post), tunnel band. On cliff
  and skills the container is hidden because artwork replaces it; triggers stay armed regardless.

## 6. Stations and interaction (Audit D baseline)

- `buildStations` fits a run into `[STATION_RUN_START=200, min(width−EXIT_PIPE_CLEARANCE(130),
  width−40)−40]` with pitch = clamp(`min(spacing, available/(count−1))`, ≥ `MIN_STATION_SPACING`
  96), then centres the run. Verified against QA: skills (width 1500, spacing 130, count 6) →
  pitch 130, startX 440 → x = **440, 570, 700, 830, 960, 1090** (matches the QA SKILLS array).
  Projects today (width 1000, `PROJECT_SPACING` 250, count 4) → available = 630,
  fitSpacing = 210 → x = **200, 410, 620, 830**, y=560.
- Sizes: skill stations use PNG pairs `skills-station-<id>.png` / `-lit.png` (source 362×362,
  displayed 96×104, origin (0.5,1), grounded by opaque bounds). Project stations currently fall
  back to procedural canvas **176×132** (`drawProjectStation`: dais + 80×34 console + 3 screens +
  banner). Sprite origin (0.5,1), depth 6. Hitbox = the whole sprite rect (independent of alpha).
- Hover: `updateStations` lights the NEAREST station within `INTERACT_RANGE = 132` (horizontal
  distance only) by swapping idle→lit texture (pre-drawn, no tint/scale), re-grounding on pad
  change. Click: `sprite.setInteractive({useHandCursor:true})` + `pointerdown` → sets focus and
  emits `activate` (guarded by `!panelOpen && !travelling`); Enter opens the focused station,
  Escape closes. `emitInteraction` → WorldShell → `openPanel('project', id)` → `InfoPanel`.
- InfoPanel project panel renders: title as the GitHub link (`data-testid="project-title-link"`),
  description, authorship (+collaborators), contribution, dashboard gallery (real committed
  PNGs, `object-fit: contain`), technologies, workflow stages, results, **limitations (always)**,
  and an evidence file list. DOM index buttons: `data-testid="index-project-<id>"`.
- Content: `worlds.data.ts` `projectOrder` = the 4 ids; `projectsForWorld('data')` drives stations,
  the DOM index and panel lookup — so station count/labels are content-driven, geometry is config.

## 7. Depth / render order (scene-wide)

parallax −40..−10 (skipped for `data`; React video layer instead) → subfloor/physics ground (0/1)
→ ground rim (1) → platform tiles / surface platform (2) → utils (2) → pipe container (4) →
chapter label (5) → stations (6) → player glow (9) → player (10) → travel band (900) →
blackout overlay (901).

## 8. QA harness available to Layer 3

`window.__worldProbe()` exposes: x, y, grounded, camScrollX/Y, canvasCount, worldWidth/Height,
velocityX/Y, facingRight, playerSpriteHeight, **chapter, focusedStationId, focusedStationKind,
stationLit, travelling, armedPipeId, stationCount, pipeCount, panelOpen, locked**, camZoom,
camViewWidth/Height, lookAheadX. `window.__worldScene` exposes the live scene (pipeSkins,
stations). Existing suites: accept-dataworld-{gameplay,traversal,exit,fullscreen,robot,
skills-stagek,cards-portal}, accept-responsive, accept-content-parity, accept-dataworld-exit.

## 9. Constraints carried into Layer 3

Pixel-art integrity (integer zoom, 0.25 steps, roundPixels); opaque-bounds grounding
(`textureBottomPad` + 3 px overlap); pre-drawn idle/lit texture swap for hover (no tint/scale);
trigger authoritative, artwork must contain the arm zone; only the active chapter exists;
both portals' triggers stay armed even when their procedural containers are hidden by art;
reduced-motion = static portal frame 0 but transport still completes; no audio; transparent
canvas over the chapter video; preserve all Phase 1/2 probe fields and QA selectors.
