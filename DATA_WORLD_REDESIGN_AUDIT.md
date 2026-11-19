# DATA WORLD — REDESIGN AUDIT (Phase A)

Scope: read-only audit of the Data World implementation in `personal-website-river`.
No source files, assets, git state, or configuration were modified by this audit.
Prepared 2026-11-16. Reference images for the three levels are supplied separately by the owner; this document audits what exists now.

---

## 1. Git state and preservation report

Captured before any inspection (per the Phase A safety requirements):

- **Branch**: `restore/data-world-386991f`
- **HEAD**: `c7184c859d5da67a77ded67a9178faea5e1e290d` ("robot integration in data world")
- **Tags/checkpoints present**: `checkpoint/miniature-baseline`, `checkpoint/neon-district-pre`, `checkpoint/pre-fullscreen-563a1fd`, `pre-final-mission-checkpoint`, `recovery/pre-miniature-restore-1794718587`
- **Modified (uncommitted), preserved untouched**:
  - `src/components/WorldShell.tsx`, `src/components/WorldShell.css`
  - `src/game/config/worldConfig.ts`, `src/game/engine.ts`, `src/game/scenes/WorldScene.ts`
  - `qa/accept-dataworld-gameplay.mjs`
  - 18 screenshots under `qa-screenshots-acceptance/` and `qa-screenshots-verify-fullscreen/`
- **Untracked (preserved untouched)**: prior audit docs (`DATA_WORLD_*.md`, `NEON_DISTRICT_*.md`, `ROBOT_*.md`, `VIDEO_*.md`, `PIPE_TRANSITION_AUDIT.md`, `ANIMATION_MAPPING.md`, `CURRENT_CHARACTER_AUDIT.md`), `src/components/BackgroundVideoLayer.{tsx,css}`, `src/game/art/neonCity.ts`, `public/assets/backgrounds/`, `docs/screenshots/`, several `qa/` probes and screenshot dirs.
- **Restrictions honored**: no reset/clean/stash/revert/checkout, no deletions, no commits, no pushes, no code changes. This audit wrote only the three new `DATA_WORLD_REDESIGN_*` documents.

---

## 2. Current architecture

### 2.1 Stack and entry points

- Route `#/data-world` (`src/App.tsx:45`) renders `<WorldShell world="data" onExit={returnToHero} />` (App.tsx:269-270). `returnToHero` resets the zustand game store and clears the hash — that is the "return to portfolio" path.
- `src/components/WorldShell.tsx` is the only React component that knows Phaser exists. It lazy-loads `src/game/engine.ts` via dynamic `import()`, so the hero bundle never contains Phaser.
- `src/game/engine.ts` `mountWorld()` builds one `Phaser.Game` (`AUTO`, `transparent: true`, `pixelArt: true`, `Scale.RESIZE`, arcade physics, `noAudio: true`) with a single scene `WorldScene` (key `'world'`). `unmount()` is idempotent and removes the canvas.

### 2.2 Shell layout (`WorldShell.tsx` + `WorldShell.css`)

- `.placeholder-world` is the full-screen stage (`position: fixed; inset: 0; 100vw x 100dvh; z-index: 100`). Inside it:
  - `<h1>` world name (visually present, Phase 1 contract).
  - `BackgroundVideoLayer` (data world only) — React-owned `<video>` pairs sitting at z-index 0 behind the transparent Phaser canvas.
  - `.world-canvas` (`position: absolute; inset: 0; z-index: 1; overflow: hidden`) — the Phaser parent; `Scale.RESIZE` makes the canvas track it, so the game is full-screen at any viewport.
  - **Exit control**: `button.world-exit` (`data-testid="world-exit"`), text "Back to portfolio", top-left (top/left 10px, z-index 41, min-height 44px, hover + focus-visible styles in CSS). Calls `onExit`. It is shell-level, so it is present in all three chapters automatically.
  - Contents toggle `button.world-index-toggle` top-right (z 16) opening `.world-index` drawer (z 15) — a DOM list of all 6 skills + 4 projects as real buttons that open the same panels.
  - Entry plate `.world-entry` (z 40, `role="dialog"`, dismissible by Enter/Escape/click/button) shown on world mount.
  - `.world-a11y` — visually-hidden accessibility mirror (controls, `world-status`, `world-interaction` live regions, 7 `<kbd>` elements — Phase 1 contract).
- `html.game-world-active, body.game-world-active { overflow: hidden }` locks page scroll while a world is open (applied in App.tsx).

### 2.3 World model — one engine, config-driven, chapter-isolated (`src/game/config/worldConfig.ts`)

- `DATA_WORLD`: height 900, `groundY = 560`, palette (bg `#04060e`, ground `#141c30`, groundTop cyan `#22d3ee`). `CLOUD_WORLD` exists as config only; `PLAYABLE_WORLDS = ['data']`.
- **Three chapters, each an isolated coordinate space** (`WorldChapter`): `cliff` (width 900, spawn x=120), `skills` (width 1500, spawn x=144), `projects` (width 1000, spawn x=144). `chapterWorld()` builds exactly one chapter's world; the scene holds only that. Chapter travel swaps scenes (`scene.stop()` + `setConfig` + `scene.start()`) inside the transport's blackout phase, so an unvisited chapter's geometry does not exist in memory.
- **Pipes** (`WorldPipe`, 44x60 mouth, `PIPE_HALF_WIDTH=22`, `PIPE_HEIGHT=60`): every chapter has an entry pipe at x=60; cliff and skills have an exit pipe at `width-150`. Routes via `chapterViaPipe`: cliff exit → skills; skills entry → cliff (back), skills exit → projects; projects entry → skills. Projects has `exitPipe: null`. **This exactly matches the required portal graph** (Surface→Skills, Skills→Surface+Projects, Projects→Skills).
- **Stations** are content-driven: `buildStations()` reads `skillsForWorld('data')` / `projectsForWorld('data')` and lays them out from x=200 with fitted pitch (skill pitch 130, project pitch 250, min 96, exit-pipe clearance 130). Cliff has no stations.
- Player physics constants (`PLAYER`): body 10x14 hitbox, speed 150 px/s, jump 230, gravity 900, coyote 90ms, buffer 110ms. `INTERACT_RANGE=132`, `PIPE_TRIGGER_RANGE=30`, `PIPE_TRAVEL_MS=1100`.
- Camera (`CAMERA`): integer zoom target 2, clamped by `zoomForViewport = min(2, viewportH / CONTENT_BAND)`, `CONTENT_BAND = 264`; `verticalBiasRatio 0.4` puts the ground line at ~90% of viewport height; look-ahead 56px; followRate 7.5 (frame-rate-corrected `1 - exp(-rate*dt)`).

### 2.4 Scene rendering (`src/game/scenes/WorldScene.ts`, 2270 lines)

Per chapter, `create()` runs: procedural textures → (non-data worlds only: `buildEnvironment()` parallax) → camera setup → `buildTerrain()` → `buildPlayer()` → `buildStations()` → `buildPipes()` → `buildInteractionProbe()` → transport → input → resize handler.

- **Background for Data World**: `if (this.config.id !== 'data') this.buildEnvironment()` — the procedural neon-city parallax (`src/game/art/neonCity.ts`: sky, far/midsky/mid/fg layers, ground, rain, fog, vehicles, holo billboards, signs, glow, shadow, steam) is **skipped for data**. The camera background is transparent (`rgba(0,0,0,0)`), so the visible backdrop is the React `BackgroundVideoLayer`: per-chapter looping mp4 + poster under `public/assets/backgrounds/{surface,infrastructure,core}/bg.mp4` (cliff→surface, skills→infrastructure, projects→core), dual-`<video>` crossfade loop state machine, poster fallback under reduced motion.
- **Terrain** (`buildTerrain`): `drawSubFloor` texture (`data-subfloor-56`, one 64px bay tiled: base, lit edge, bay seams, ribs, dim cyan conduit) drawn as the floor face; physics ground is a static rectangle capped at `SUB_FLOOR_DEPTH=56`; a 2px cyan rim rectangle at `groundY+1`. The `neon-ground-*` image is only drawn `if (this.textures.exists(...))` — for data it never exists (neonCity not generated), so the floor visual = subfloor texture + rim. **Platforms are plain `add.rectangle` fills in `palette.ground` plus a 2px `groundTop` rim** — see §3 for the floating-bar analysis.
- **Stations** (`buildStations`): one image per station, origin (0.5,1) at ground, depth 6. Two pre-drawn canvas textures per station — `*-idle` and `*-lit` — swapped on proximity (skill 96x104, project 176x132; drawn by `drawSkillStation`/`drawProjectStation` in `src/game/art/worldObjects.ts`: pedestal + monitor + tag on screen + label plate; project: 3-tier dais + console with 3 screen panels + banner sign on two posts with wrapped title).
- **Pipes** (`buildPipes` → `createDataPipeSkin` in `dataPipeSkin.ts`): one container per pipe at (x, groundY), depth 4, containing mouth image (44x60, `drawPipeMouth`: black outline, `#66CCFF` cap, `#0066CC` body, `#88E0FF` highlight, energy-streaks when lit), chapter plate above the mouth (`drawChapterPlate`, e.g. "NEXT: SKILLS"), sign board left of the mouth (`drawSignBoard`, e.g. "JUMP TO START", with arrow + post), and a hidden tunnel TileSprite used during travel. `setActive(bool)` swaps dormant/lit mouth textures.
- **Chapter label**: `chapterLabelTexture` image near spawn at `groundY - ROBOT_FRAME_HEIGHT - 46`, depth 5 ("DATA WORLD" / "SKILLS" / "PROJECTS").
- **Robot** (`buildPlayer`, assets in `src/game/assets/robot/`): 26 bundled PNG frames in a uniform **56x62 cell, bottom-anchored**; sprite origin (0.5,1), depth 10, physics hitbox kept at the Phase 1 10x14 box offset to the feet (so all Phase 1 collision/jump assertions still hold). Animations are manual texture swaps in `updateAnimation()`: idleA/idleB breathing (620ms), walkA–walkH (90ms cycle), jump/fall while airborne; `tubeEnter0-7` / `tubeExit0-5` strips drive the pipe climb (depth dropped to 2 so the pipe rim occludes the robot). `preload()` loads all frames as `player-robot-*`. Legacy Phase 1 `drawPlayer` 16x16 'player' texture and the 'gem' probe are still registered; the gem at world x=480 emits `foundation-probe` (Phase 1 contract, retained).
- **Transport** (`pipeTransport.ts`): 12-phase machine — `approach, activate, entering, occluded, conduit, blackout, build, position, reveal, emerging, settle, idle`. Total `PIPE_TRAVEL_MS=1100`; per-phase durations (blackout 340, build 16, reveal 260, emerging 640, settle 220...). Trigger: `pipeNearX` within range and |dx| ≤ `PIPE_HALF_WIDTH` arms the pipe, fires once on the next tick. During travel the scene locks the player, plays climb frames, covers the screen with a scrolling full-screen conduit TileSprite (depth 900) + opaque blackout rectangle (depth 901, both scrollFactor 0), then `build` stops/starts the scene into the destination behind the black, and `onArrive` restores all of the destination chapter's own pipes (`world.pipes`), snaps the camera, and unlocks.
- **Camera** (`setupCamera`/`updateCamera`): zoom via `zoomForViewport`, origin (0,0), `useBounds=false` (Phaser's zoom clamp is broken; the scene clamps scroll explicitly each frame to `[0, world.width-viewW] x [0, world.height-viewH]`), frame-rate-corrected easing, look-ahead, reduced-motion snaps. Resize re-tiles parallax strips and re-derives zoom (`handleResize`).
- **Interaction bus** (`interactionBus.ts`): typed events `probe | proximity | activate | close | chapter` crossing engine→React only. `WorldShell` subscribes after mount: `proximity` mirrors the nearest station into the DOM (`world-nearby`, `aria-current`), `activate` opens `InfoPanel`, `close` closes it, `chapter` updates `world-chapter` and the video layer. Enter opens the focused station; Escape closes; `setPanelOpen` pauses world input when a panel is open from either path. A window-level keydown replay works around Phaser's `preventDefault` so Enter/Space still activate focused DOM buttons.
- **Pointer interaction on stations**: each station sprite is `setInteractive({ useHandCursor: true })` with a plain rectangular hit area; `pointerdown` sets focus and emits `activate` (guarded against open panel / travel). **There is currently no mouse-hover glow** — lighting is proximity (player distance) only. See §5.
- **Diagnostics**: `window.__worldProbe()` (Phase 1 fields unchanged + Phase 2 additions: chapter, focusedStationId, stationLit, travelling, armedPipeId, stationCount, pipeCount, camZoom, etc.) and `window.__worldScene`.

### 2.5 Content model (the actual data behind stations)

`src/content/index.ts` + `worlds.data.ts` + `skills.data.ts` + `projects.data.ts`:

- **Six skills, in world order** (`skillOrder`): `sql` (SQL / T-SQL), `python` (Python / pandas), `excel`, `power-bi`, `tableau`, `streamlit` — all `treatment: 'solid'`, each with evidence + repository links.
- **The four actual projects** (`projectOrder` in `worlds.data.ts`, records in `projects.data.ts`):
  1. `nifty100-financial-analysis` — **Nifty-100 Financial Analysis** (Bluestock-fintech; 714 tests / 699 passing; limitations stated).
  2. `sql-data-warehouse` — **SQL Data Warehouse & ETL** (medallion bronze/silver/gold; currently non-runnable, stated as limitation).
  3. `primetradeai` — **PRIMETradeAI** (T-SQL + sklearn + Streamlit over Hyperliquid trades; sample CSV only).
  4. `data-analytics-dashboards` — **Data Analytics Dashboards** (five dashboards in Excel/Tableau/Power BI under one repo, with committed preview PNGs in `public/assets/dashboards/`).
- The Mutual Fund analytics work is deliberately absent from the content model (synthetic inputs). Station labels/tags are derived from these records (`tagForSkill`, `tagForProject`); panels (`InfoPanel.tsx`) render the full records including authorship, limitations, and GitHub links.

### 2.6 Existing QA harness

`qa/accept-dataworld-gameplay.mjs`, `qa/accept-dataworld-exit.mjs` (asserts `world-exit` present/visible, click → `location.hash === ''` + hero `h1`, zero console errors), `qa/accept-responsive.mjs` (canvas + no horizontal overflow at 1920/1440/768/390, reduced-motion context), plus `qa/dw-verify.mjs`-style navigation probes. Playwright via Node (`npx playwright`), preview at `http://[::1]:4173/`. Screenshots land in `qa-screenshots-acceptance/`.

---

## 3. Floating-bar source analysis

**Primary source — the platform ledges.** `buildTerrain()` draws every `WorldPlatform` as a bare `this.add.rectangle(..., colour(palette.ground))` with only a 2px cyan rim line on top (`WorldScene.ts:769-780`). Because the data-world canvas is transparent and the backdrop is a video, these read as flat floating rectangles with nothing under them. Count per chapter:

- cliff: 6 ledges — (320,470,96x16), (520,400,80x16), (700,340,80x16 oneWay), (470,430,120x16), (620,360,80x16), (760,290,96x16 oneWay)
- skills: 2 — (300,420,120x16), (520,350,96x16 oneWay)
- projects: 2 — (320,430,128x16), (520,360,96x16 oneWay)

**Secondary contributors** (all world-space rectangles over the video background): the chapter label plate floating at `groundY-108`; pipe sign boards (`drawSignBoard`) and chapter plates (`drawChapterPlate`) — these are intentional signage, not bugs; the station banner posts; the travel overlay (screen-space, only during transitions — not a floating bar in normal play).

**Removal constraint**: the ledges are also physics bodies in the static group; Phase 1/2 tests assert jump apex, landing and collision against them, and the cliff's first three ledges are carried verbatim from Phase 1. So the fix is **visual, not physical**: keep the static bodies, replace or hide the bare rectangle rendering (e.g. render with `drawPlatformSlab`-style art with supports down to the floor, attach to background structures, or set the visual invisible while the body stays). Do not delete entries from `CLIFF_PLATFORMS` etc.

Note also: `neonCity.ts` (holo billboards with glyph bars, neon sign boards, gantry lattice) is dormant for the data world — if `buildEnvironment()` were ever enabled for data, its floating billboards/signs would add more bar-like elements. Keep it skipped unless the redesign explicitly re-enables procedural layers.

---

## 4. Existing signs, labels, portals, navigation

- **Pipe portals**: `drawPipeMouth` 44x60 blue column + `drawChapterPlate` above ("NEXT: SKILLS" / "NEXT: PROJECTS" / "START") + `drawSignBoard` beside ("JUMP TO START" / "NEXT CHAPTER" / "ORIGIN" / "ARRIVAL"). Interactive by walking into the mouth (trigger range 30+22px); hover/arm swaps to the lit texture; click is not required. Routes match the required graph exactly (§2.3).
- **Chapter label** near spawn; **station name plates** under skill housings; **project banners** above consoles.
- **Return to portfolio**: `.world-exit` "Back to portfolio" top-left, always present (shell-level), hover/focus styles, 44px min target, QA-asserted. Distinct from portals (DOM button vs in-world pipe).
- All three levels share one implementation — there is no per-level code; differences come only from `worldConfig.ts` values (widths, spawn, pipes, platforms, stations) and the per-chapter video in `VIDEO_MAP`.

---

## 5. Interaction and hover findings

- **Station hover (mouse)**: not implemented. Only `pointerdown` (click opens panel) and hand cursor exist. Proximity lighting is player-distance-based (`updateStations`, INTERACT_RANGE=132, nearest wins, texture swap idle↔lit). The redesign's "mouse hover → glow" must be added as `pointerover`/`pointerout` on the station sprites, merged with the proximity rule (lit if hovered OR nearest-in-range), without touching movement (stations don't intercept keyboard input; the hit area is a rect over the sprite — fine).
- **Station click**: opens `InfoPanel` via `activate` event (both pointer and Enter paths), guarded by `panelOpen` and `transport.isTravelling`.
- **Portal hover**: the lit mouth texture exists (`setActive`) but is only driven by arm/proximity during travel. Add pointerover on the pipe container → `setActive(true)`.
- **Exit button**: hover/focus-visible already styled (WorldShell.css:588-597).
- **DOM mirror**: contents drawer lists every station as a button opening the same panel; `aria-current` mirrors canvas proximity. Kept as the no-canvas route to content.
- **Hover must not interfere with the robot**: hover effects on station sprites don't affect physics; just ensure pointer events on pipes/stations don't block canvas pointer events used elsewhere (there are none besides stations).

---

## 6. Robot compatibility findings

- Robot = 26 PNGs, 56x62 frame, bottom-anchored, ~44px tall robot; hitbox 10x14 at the feet (Phase 1 box preserved). Origin (0.5,1), depth 10 (2 while in a pipe).
- Animations: idle breathing (idleA/idleB, 620ms), 8-frame walk (90ms), jump/fall, 8+6 tube enter/exit strips — all driven by `setTexture`, no Phaser AnimationManager (intentional).
- Movement: time-based horizontal integration (`intentVelocityX`, dt-clamped), Arcade for vertical; coyote/buffer; world-edge clamps; collideWorldBounds.
- Camera tracks the robot with zoom/bias/look-ahead; chapter swap re-adopts held keys via window-level tracking.
- **Design constraint for the redesign**: any new platform/station/portal art must be sized around a 56x62 sprite with a 10x14 foot hitbox standing on `groundY=560` (and ledges at their configured y values). Do not scale, stretch, or re-anchor the robot frames; `pixelArt: true` + integer zoom mean the art must stay on the pixel grid.

---

## 7. Technical risks and dependencies

1. **Phase 1/2 test contracts pin current values**: `PLAYER`, `physicsFor`, `DATA_WORLD.height/groundY/spawn`, the seven platform rects, the gem probe at x=480, `.placeholder-world` selectors, 7 `<kbd>`s, `world-exit` testid, `__worldProbe` fields. Visual changes must not alter these; if they must, tests need explicit updates (flag any such change).
2. **Transparent canvas + video background**: any new world-space art draws over the video; opaque art panels will occlude it by design. Decide per element whether it should be transparent-PNG overlay or full background replacement. Reference images that include full backgrounds may imply replacing `BackgroundVideoLayer` per chapter — that's a bigger change to `WorldShell.tsx`.
3. **Texture-key existence guards**: data world skips `generateAllForChapter`, so `neon-ground-*`, `neon-glow`/`neon-shadow` (note: keys are actually `neon-glow--0x0` etc., so the current `textures.exists('neon-glow')` checks never match — player glow/shadow are silently absent today) are absent. If new art depends on neonCity textures, generation must be re-enabled deliberately per chapter seed.
4. **Chapter swap destroys the display list mid-transport**: new art must be rebuilt in `create()` per chapter like current code; nothing may cache world objects across `scene.stop()/start()` (see the `pipeSkins`/`setActive` trap documented in `onArrive`).
5. **Station hover vs proximity merge**: two lit-state drivers (mouse, player) must be combined carefully so the texture swap stays idempotent and deterministic for tests (`stationLit` probe field).
6. **Performance**: all art is canvas-generated at boot or bundled PNGs; keep new assets as small PNGs or procedural canvas textures; avoid full-world-width textures (the sub-floor uses a 64px tiled bay for this reason); `pixelArt: true` requires integer zoom multiples of 0.25.
7. **Responsive**: `Scale.RESIZE` + `zoomForViewport` + `handleResize`; new full-world art must be generated per chapter width (`chapterSeed`) or tiled; verify no horizontal overflow at 390px (existing acceptance test).
8. **Video files are ~4.4-4.9 MB each** under `public/assets/backgrounds/`; if reference images replace them, mind total page weight and reduced-motion poster fallback.
9. **Uncommitted work**: 6 source files + QA file are modified but uncommitted on `restore/data-world-386991f`; the redesign branches from this state. Do not reset; commit or stash is the owner's call.

---

## 8. What should be retained, redesigned, or removed

- **Retain**: robot frames + animation state machine + 10x14 hitbox; chapter-isolated architecture and 12-phase pipe transport; interaction bus + DOM mirror/drawer + `world-exit` shell button; video background layer (unless references replace it); content-driven station generation from `src/content`; camera system (zoom policy, bias 0.4, explicit clamps); transparent canvas + `pixelArt`; gem probe and Phase 1 contracts; `drawSubFloor` tiled-bay technique.
- **Redesign**: platform/ledge visuals (bare rects → designed slabs with supports or hidden); station art (`drawSkillStation`/`drawProjectStation`) to match the reference signs; pipe/portal skin (`drawPipeMouth`, plate, sign) to match reference portals; floor presentation vs the video background; sign/plate typography styling; exit button label to "RETURN TO PORTFOLIO" (keep testid); add mouse-hover glow on stations, pipes, and the exit button.
- **Remove/replace (visual only, physics stays)**: the 10 bare platform rectangles as visuals; the floating chapter label plate if the references place chapter identity elsewhere; legacy 16x16 `player` texture registration if unused (verify no test reads it).

---

## 9. Confirmation

No implementation files, assets, tests, or git objects were modified, created (except these three plan documents), committed, or pushed during this audit. All findings above are from read-only inspection of the working tree at HEAD `c7184c8` on branch `restore/data-world-386991f`.
