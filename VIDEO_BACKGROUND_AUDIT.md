# VIDEO_BACKGROUND_AUDIT.md — Phase A audit of the Data World

Scope: read-only audit of the current repository. No source file was modified,
nothing was committed or pushed. Only this document (and the four sibling
Phase A documents) were created.

Claim labels: **VERIFIED** = read from the repo / executed command output in this
session. **INFERRED** = follows from verified code but not executed.
**UNFERIFIED** = needs runtime confirmation during implementation.

---

## 1. Repository state (VERIFIED via `git` this session)

- Branch: `restore/data-world-386991f`
- HEAD: `c7184c859d5da67a77ded67a9178faea5e1e290d` ("robot integration in data world")
- Remote sync: `refs/heads/restore/data-world-386991f` on origin points at the
  same commit `c7184c8` — local branch is in sync with its own remote branch.
  Other remote branches: `main` @ `ffb1b8e`, `cloud-world-dockside` @ `95702e8`.
- Tags present: `checkpoint/miniature-baseline`, `checkpoint/neon-district-pre`,
  `checkpoint/pre-fullscreen-563a1fd`, `pre-final-mission-checkpoint`,
  `recovery/pre-miniature-restore-1794718587`. Preserved; untouched.

### Working tree — modified (M) and untracked (??), reported per the brief

Modified tracked files:
- `src/game/config/worldConfig.ts` — palette change only (diff: 5 hex colours in
  `DATA_WORLD.palette`, e.g. `background` `#04060a` → `#04060e`,
  `groundTop` `#6e7f96` → `#22d3ee`). No geometry change.
- `src/game/scenes/WorldScene.ts` — 135 insertions / 163 deletions vs HEAD
  (the neon-city/robot rework; the committed version predates it).
- 24 PNGs under `qa-screenshots-acceptance/` and `qa-screenshots-verify-fullscreen/`
  (re-captured evidence; binary diffs only).

Untracked:
- `src/game/art/neonCity.ts` — the entire procedural neon-city generator.
  **Risk: this file is uncommitted.** Any implementation phase must commit it
  first (with approval) or the video redesign would build on untracked code.
- Planning docs in repo root (`ANIMATION_MAPPING.md`, `CURRENT_CHARACTER_AUDIT.md`,
  `DATA_WORLD_COMPREHENSIVE_RENDERING_AUDIT.md`, `DATA_WORLD_REPAIR_PLAN.md`,
  `NEON_DISTRICT_*.md`, `PIPE_TRANSITION_AUDIT.md`, `ROBOT_*.md`),
  `docs/screenshots/`, and several `qa-screenshots-*` directories.

---

## 2. Stack and entry points (VERIFIED)

- `package.json`: `phaser ^4.2.1` (installed **4.2.1**), `react ^19.2.8`,
  `vite ^8.3.0`, `zustand ^5.0.15`, Playwright `^1.63.0` (Node CLI scripts in `qa/`).
- `vite.config.ts`: `publicDir: 'public'`, `assetsInlineLimit: 0` (assets are
  emitted as files, never inlined into JS). Phaser is deliberately kept out of
  `manualChunks` and loaded via dynamic `import('../game/engine')` from
  `WorldShell.tsx` — the hero bundle never contains Phaser.
- Routing (`src/App.tsx`): hash routing, `#/data-world` →
  `<WorldShell key="data-world" world="data" onExit={returnToHero} />`.
  While any world is open, `html/body` get class `game-world-active`
  (`overflow: hidden` lock, rule lives in `WorldShell.css`).

## 3. Phaser mount and canvas (VERIFIED — `src/game/engine.ts`)

`mountWorld({ world, reducedMotion, parent })` is the ONLY place a
`Phaser.Game` is constructed. Current config:

- `type: Phaser.AUTO`, `parent` = the `.world-canvas` div,
- `backgroundColor: config.palette.background` (`#04060e`) — **the canvas clear
  colour is opaque today**,
- `pixelArt: true`,
- `scale: { mode: Phaser.Scale.RESIZE, autoCenter: CENTER_BOTH, width/height from parent }`,
- `physics: physicsFor()` (arcade, gravity y 900, fixed 60fps step),
- `audio: { noAudio: true }`, `banner: false`, `scene: [WorldScene]`.

**No `transparent: true` is set.** Phaser 4.2.1 types confirm the option exists
(`transparent?: boolean` in the game config types, verified in
`node_modules/phaser/types/phaser.d.ts`). Phaser 4.2.1 also ships a native
video GameObject (`Phaser.GameObjects.Video`, `this.add.video(...)`,
`this.load.video(...)` — verified in the same types).

Unmount is idempotent and also removes any leftover `canvas` elements from the
parent; React owns the container, Phaser owns the canvas.

## 4. React shell and DOM structure (VERIFIED — `WorldShell.tsx` / `WorldShell.css` / `App.css`)

- `.placeholder-world` (App.css): `position: absolute; inset: 0; width: 100vw;
  height: 100dvh; overflow: hidden` — full-viewport stage.
- `.world-canvas` (WorldShell.css): `position: absolute; inset: 0; width: 100vw;
  height: 100dvh; background: #070b14; overflow: hidden`. Phaser appends the
  canvas here; `.world-canvas canvas { display:block; width:100%; height:100% }`.
  `InfoPanel` is rendered **inside** `.world-canvas` (z-index 20, InfoPanel.css).
- Overlay z-index stack (all inside/over `.placeholder-world`): parallax/sky are
  in-canvas; DOM overlays: drawer 15, contents toggle 16, InfoPanel 20, entry
  plate 40, exit button 41. `[data-testid]` hooks: `world-canvas`, `world-status`,
  `world-interaction`, `world-exit`, `world-entry`, `world-index-toggle`,
  `world-chapter`, `world-nearby`, `index-skill-<id>`, `index-project-<id>`.
- `globals.css` sets `img, picture, video, canvas, svg { display:block; max-width:100% }`
  — a `<video>` inside `.world-canvas` inherits `display:block; max-width:100%`,
  so the background-video CSS must set width/height/position explicitly.
- `WorldShell` mounts the engine lazily, then subscribes to `interactionBus` and
  mirrors: `chapter` events → `setChapter` (rendered at `[data-testid="world-chapter"]`),
  `proximity` → focused station, `activate` → opens `InfoPanel`, `close` → closes.

## 5. WorldScene lifecycle and current background (VERIFIED — `WorldScene.ts`, 2263 lines)

- `setConfig({ world, chapter? })` resolves exactly ONE chapter via
  `chapterWorld(world, chapter)`; the scene never holds unbuilt chapters.
- `create()` order: diagnostics handle (`window.__worldScene`) → procedural
  textures (`drawPlayer`, `drawInteractionGem`) → `buildEnvironment()` →
  physics bounds + camera bounds + `cameras.main.setBackgroundColor(world.palette.background)`
  → optional camera snap → `buildTerrain()` → `buildPlayer()` → `buildStations()`
  → `buildPipes()` → `buildInteractionProbe()` → `buildTransport()` (only if
  absent) → `setupCamera()` → `buildTravelOverlay()` → `setupInput()` →
  `scale.on('resize')` + `handleResize` → `exposeDiagnostics()` → announce chapter.
- **Current background = `buildEnvironment()`**: one screen-fixed sky `Image`
  (scrollFactor 0, depth −40, opaque gradient + stars + moon) plus FOUR
  parallax `TileSprite` strips — far 0.12/−30, midsky 0.25/−28, mid 0.45/−20,
  fg 0.7/−10 — all horizontal-only parallax (`setScrollFactor(f, 1)`),
  re-tiled on resize by `handleResize`. All textures are seeded canvas art from
  `src/game/art/neonCity.ts` (`generateAllForChapter`), keyed
  `neon-<layer>-<worldId>-<w>x<h>`.
- `buildTerrain()`: sub-floor texture (`drawSubFloor`, 56px), neon ground image
  (`neon-ground-...`, depth 1), static physics ground body, per-platform rects +
  cyan rim. Collision geometry is independent of the background art.
- Robot: `buildPlayer()` loads 32 PNG frames via `preload()`
  (`src/game/assets/robot/manifest.ts`, imported with `?url`), 56x62 cells,
  bottom-anchored, depth 10, Arcade body 10x14 with offsets; glow depth 9,
  shadow depth 2. Walk/idle/jump/fall + `tubeEnter0..7`/`tubeExit0..5` strips
  driven by `updateAnimation()` and the transport.
- Stations: one `Image` per station (depth 6), lit/unlit texture swap,
  `pointerdown` → `emitInteraction({kind:'activate'})`; proximity via
  `INTERACT_RANGE = 132`. Chapter label image at depth 5. Pipes via
  `createDataPipeSkin` (depth ~4). Interaction gem at world x=480 emits
  `foundation-probe` (Phase 1 contract).
- **Camera**: `setupCamera()` — zoom from `zoomForViewport` (min of `CAMERA.zoom=2`
  and `height/CONTENT_BAND`, quantised to 0.25 for pixelArt), origin (0,0),
  `stopFollow()`, `useBounds = false`; `updateCamera()` computes scroll manually
  each frame with `CAMERA.verticalBiasRatio = 0.40` (ground line at ~90% of
  viewport) and clamped to `[0, world.width − viewW]` × `[0, world.height − viewH]`.
- **Chapter switching**: `PipeTransport` with 12 phases (`TRANSPORT_PHASES`:
  approach, activate, entering, occluded, conduit, blackout, **build**,
  position, reveal, emerging, settle, idle). The `build` phase does
  `scene.stop()` + `setConfig({chapter})` + `scene.start()` **behind a full-screen
  blackout** (`travelOverlay` rectangle depth 901 + scrolling `travelBand` depth
  900, both scrollFactor 0). Held keys survive the swap via window-level
  `heldAtSwap` tracking. `PIPE_TRAVEL_MS = 1100`.
- Diagnostics: `window.__worldProbe()` returns `{ok, x, y, grounded, camScrollX,
  camScrollY, canvasCount, worldWidth, worldHeight, velocityX, velocityY,
  facingRight, playerSpriteHeight, chapter, focusedStationId, focusedStationKind,
  stationLit, travelling, armedPipeId, stationCount, pipeCount, panelOpen,
  locked, camZoom, camViewWidth, camViewHeight, lookAheadX}`; `window.__worldScene`
  exposes the scene. Both are removed in `shutdown()`.
- `worldConfig.ts`: `DATA_WORLD` height 900, groundY 560, chapters
  `cliff` (w 900) / `skills` (w 1500) / `projects` (w 1000), entry `cliff`,
  pipes at x=60 (entry) and width−150 (exit, null in projects). Palette
  background `#04060e`.

## 6. What the neonCity generator actually feeds (VERIFIED by grep)

`generateAllForChapter` makes sky, far, midsky, mid v0/v1, fg, ground, rain,
fog, 4 vehicles, 3 holos, 5 signs, glow, shadow, steam. **Only sky, far, midsky,
mid, fg, ground, glow and shadow are consumed** by `WorldScene`
(`buildEnvironment`, `buildTerrain`, `buildPlayer`). The rain/fog/vehicle/holo/
sign/steam generators are currently **dead code** — no particle emitters or
sprites use them in the scene. `facilityArt.ts`'s `drawCeiling`/`drawFarSkyline`/
`drawMidground` are likewise not called from `WorldScene` (only `DATA_PALETTE`,
`SUB_FLOOR_DEPTH`, `canvasTexture`, `drawSubFloor` are imported).

## 7. QA infrastructure (VERIFIED)

- `qa/accept-dataworld-{gameplay,traversal,exit,fullscreen,robot}.mjs`,
  `qa/accept-responsive.mjs`, plus `playwright.config.ts` (own port 5195,
  `reuseExistingServer: false`) and `tests/`. Node Playwright scripts run against
  `npx vite preview --port 4173` (`BASE = 'http://[::1]:4173/'`), viewport
  1440x900, using `window.__worldProbe()`, `window.__worldScene`, `canvas`,
  `[data-testid="world-exit"]` etc., capturing into `qa-screenshots-*`.
  Headless Chromium with `--use-angle=d3d11 --enable-gpu`; screenshots are the
  visual record because the WebGL drawing buffer is not preserved (`toDataURL`
  returns black — noted in WorldScene comments).

## 7b. Phase A approval addendum (working-tree status, re-verified after review)

Exact status of the three files in question, confirmed with `git status` /
`git ls-files` / `git diff --stat` (read-only; nothing reset, cleaned,
reverted or overwritten):

- `src/game/config/worldConfig.ts` — **tracked, modified, unstaged**
  (` M`); diff is palette-only (10 lines, 5 hex colours in `DATA_WORLD.palette`).
- `src/game/scenes/WorldScene.ts` — **tracked, modified, unstaged** (` M`);
  298 lines changed (140 insertions / 168 deletions) vs HEAD.
- `src/game/art/neonCity.ts` — **untracked** (`??`); `git ls-files
  --error-unmatch` confirms it is NOT in the index.

These modifications pre-date Phase A; Phase A itself added only the five
`VIDEO_*.md` documents. No stash entries exist; all five tags are intact;
HEAD is unchanged at `c7184c8`.

## 8. Risks and constraints for the video redesign

1. **The canvas is opaque today** (`backgroundColor` + camera
   `setBackgroundColor` + opaque sky/parallax layers). A DOM video behind the
   canvas is only visible if the game is created with `transparent: true`, the
   camera background is alpha-0, and the sky + 4 parallax layers are skipped.
   All three are one-line-scale changes but must be verified at runtime
   (WebGL clear-alpha behaviour) — UNVERIFIED until implementation.
2. **`WorldScene.ts` and `worldConfig.ts` are modified but uncommitted**, and
   `neonCity.ts` is untracked. The video phase must not start from a dirty
   baseline without a decision on committing this work.
3. **Chapter swap destroys the scene** (`scene.stop()/start()`), so any
   Phaser-side video object would be torn down mid-playback. A DOM video owned
   by React survives scene swaps untouched — this is the decisive architectural
   argument for the DOM-layer approach (see ARCHITECTURE_PLAN).
4. The transport already blacks out the screen during the `build` phase —
   the natural, flash-free moment to swap the video source.
5. `prefers-reduced-motion` is already honoured for parallax (scrollFactor forced
   to 1); the video layer must honour it too (poster instead of autoplay).
6. Autoplay: videos must be `muted` + `playsinline` to autoplay under browser
   policy (INFERRED from standard policy; verify on Safari in QA).
7. Portrait viewports (390x844) with `object-fit: cover` crop the sides of a
   16:9 video — composition must be center-safe (see ASSET_REQUIREMENTS).
8. `assetsInlineLimit: 0` means Vite emits imported assets as files, but large
   videos should live in `public/` anyway to stay out of the module graph
   entirely and remain cacheable static files.
