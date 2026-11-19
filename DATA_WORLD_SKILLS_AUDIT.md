# DATA_WORLD_SKILLS_AUDIT.md — Stage K: Skills chapter audit

Audit-only document. No source files, assets, or uncommitted work were modified to produce it.

## 0. Git state (verified before and after this audit)

| Item | Value | Status |
|---|---|---|
| Repository | `/Users/yashsiphone/personal-website-river` | VERIFIED |
| Branch | `restore/data-world-386991f` | VERIFIED (`git branch --show-current`) |
| HEAD | `befcbb898d4e92be5a2c2ae89ff8cfd278cd058e` — `feat(data-world): complete Surface chapter implementation` | VERIFIED, matches the Stage S checkpoint in the brief |
| Working tree | 116 modified/untracked entries before audit; **116 after** — byte-identical set, nothing reset/cleaned/stashed/committed | VERIFIED (`git status --short \| wc -l`) |

Runtime probes ran against the already-built `dist/` served by `vite preview` on `http://localhost:4173` (dist mtime newer than all `src` mtimes; built engine chunk references `surface-skills-portal` and `infrastructure/bg.mp4`, so the build matches the working tree).

## 1. Files inspected

| File | Role |
|---|---|
| `src/game/config/worldConfig.ts` (953 ln) | Single source of world geometry: chapters, stations, pipes, platforms, PLAYER, CAMERA, INTERACT_RANGE, PIPE_TRIGGER_RANGE |
| `src/game/scenes/WorldScene.ts` (2446 ln) | The only scene: builds ONE chapter at a time, terrain, player, stations, pipes, transport host callbacks, camera, diagnostics |
| `src/game/scenes/pipeTransport.ts` (508 ln) | 12-phase chapter-transition state machine (world-agnostic) |
| `src/game/scenes/dataPipeSkin.ts` (358 ln) | Per-pipe procedural visuals (mouth, plate, sign, tunnel) + chapter label texture |
| `src/game/art/worldObjects.ts` (513 ln) | Procedural skill/project stations, pipe mouth, surface portal art |
| `src/game/art/facilityArt.ts` (1007 ln) | DATA_PALETTE, conduit/collar/elbow/junction primitives, subfloor, sign board; ceiling/midground/far (dead — see §7) |
| `src/game/art/neonCity.ts` (743 ln) | Seeded procedural city layers; only called from `buildEnvironment()`, which is skipped for `data` |
| `src/game/art/pixelArt.ts`, `pixelFont.ts`, `playerSprite.ts` | Gem + legacy player drawing, 5x7 pixel font |
| `src/game/assets/robot/manifest.ts` | 27 robot PNG frames, cell 56x62, bottom-anchored |
| `src/game/engine.ts` | Phaser mount/unmount, transparent canvas, RESIZE scale mode, pixelArt, noAudio |
| `src/components/WorldShell.tsx` / `.css` | React mount boundary, entry plate, a11y mirror, contents drawer, exit control; `.world-canvas` is `100vw x 100dvh`, z-index 1 |
| `src/components/BackgroundVideoLayer.tsx` / `.css` | Per-chapter dual-`<video>` crossfade loop behind the transparent canvas (z-index 0) |
| `src/content/skills.data.ts`, `worlds.data.ts`, `content/index.ts` | 6 data skills (sql, python, excel, power-bi, tableau, streamlit) drive the 6 stations |
| Assets | `public/assets/data-world/*.png`, `public/assets/backgrounds/{surface,infrastructure,core}/`, `public/assets/skills-valley.png`, `public/assets/iso/skills.*` |
| QA | `qa/accept-dataworld-*.mjs`, `qa/dw-verify.mjs` (per project notes), probe hooks below |

## 2. Skills chapter configuration (source-confirmed)

From `worldConfig.ts`:

- World `data`: `height: 900`, `groundY: 560`, palette bg `#04060e`, ground `#141c30`, groundTop `#22d3ee`.
- `SKILLS_WIDTH = 1500` (widened from 1200 for exit-pipe clearance).
- Skills chapter: `spawn {x: 144, y: 560}` (60 + EMERGE_OFFSET 84), `entryPipe` `skills-entry` at x=60 (plate `START`, sign `ARRIVAL`), `exitPipe` `skills-to-projects` at x=1350 (plate `NEXT: PROJECTS`, sign `NEXT CHAPTER`).
- `SKILLS_PLATFORMS`: `{x:300,y:420,w:120,h:16}`, `{x:520,y:350,w:96,h:16,oneWay:true}`.
- Stations: `buildStations('skill','skills',1500,130)` → measured/runtime-confirmed x = **440, 570, 700, 830, 960, 1090** (pitch 130, run centred between STATION_RUN_START 200 and lastAllowed 1330), all `y=560`, kind `skill`, texture 96x104.
- Pipe geometry: `PIPE_HALF_WIDTH=22`, `PIPE_HEIGHT=60` → mouth rect 44x60 at `(x-22, 500)`. Trigger `PIPE_TRIGGER_RANGE=30` + half-width.
- `INTERACT_RANGE=132`, `PIPE_TRAVEL_MS=1100` (see §7 — unused).
- PLAYER: speed 150 px/s, jump 230, gravity 900, body 10x14, coyote 90ms, buffer 110ms. Robot sprite 56x62, depth 10.
- CAMERA: `zoom 2` (upper bound), `verticalBiasRatio 0.40`, `floorMargin 10`, lookAhead 56, followRate 7.5. `CONTENT_BAND = 560-296 = 264`; `zoomForViewport(h) = min(2, h/264)` floored to 0.25.

## 3. Runtime measurements (probe: `window.__worldProbe()` + `window.__worldScene`, Playwright Chromium, preview build)

Walking cliff → skills was executed for real at each viewport; transport phase log observed as all 12 phases in order: `approach, activate, entering, occluded, conduit, blackout, build, position, reveal, emerging, settle, idle`.

| Viewport | canvas | zoom | world view (w x h) | scroll at arrival (skills) | ground line at | max scroll |
|---|---|---|---|---|---|---|
| 1440x900 desktop | 1440x900 | 2 | 720x450 | (0, 155) | 90% | (780, 450) |
| 1280x800 laptop | 1280x800 | 2 | 640x400 | (0, 200) | 90% | (860, 500) |
| 768x1024 tablet | 768x1024 | 2 | 384x512 | (11, 99) | 90% | (1116, 388) |
| 390x844 mobile | 390x844 | 2 | 195x422 | (90, 179) | 90% | (1305, 478) |

All four viewports get zoom 2 (all heights ≥ 528 = 2×CONTENT_BAND). Screen mapping with origin (0,0): `screen = zoom × (world − scroll)`; canvas fills the viewport at (0,0).

Skills chapter, desktop 1440x900, at arrival (scroll 0,155) and at x≈866 (scroll 507,155):

- World: 1500x900, groundY 560, spawn (144,560); player measured at (197,560) after arrival drift, depth 10, 56x62, grounded.
- Stations (depth 6, tex 96x104, bottom-anchored at y=560): sql@440, python@570, excel@700, power-bi@830, tableau@960, streamlit@1090. At arrival screen x = 880, 1140, 1400, … (zoom 2); base screen y ≈ 811. Exit pipe at world 1350 → screen 2700: **not visible on arrival** ✓ (reveal works).
- Pipes (containers depth 4, visible): `skills-entry` @60, `skills-to-projects` @1350. Each container children: mouth Image 44x60 at (0,0); plate 120x18 at (0,-45); sign 132x50 at (-104,-4); tunnel TileSprite 44x60 (hidden). **Defect: the entry pipe's sign spans world x −110..22 — clipped off the left world edge** (only its right ~44 px can ever show at scrollX≥0). The exit pipe's sign spans 1180..1312 — fine.
- Physics bodies (measured): ground slab 1500x56 at (0,560); ledges 120x16 @ (300,420) and 96x16 @ (520,350). Ledge visuals are plain filled rectangles (depth 0) + 2px cyan rims (depth 1).
- Chapter label `data-pipe-chapter-skills` 110x20 at (40,452), depth 5 — screen (80,596) on desktop; off-screen on mobile arrival (scrollX 90 → screen −100).
- Gem `foundation-probe` 12x12 at (480,554), depth 5 — **present in the Skills chapter too** (Phase 1 overlap probe retained in every chapter).
- Depth values present in Skills display list: `0, 1, 4, 5, 6, 10, 900, 901` (19 objects total). No parallax layers exist for the data world.
- Video layer: `data-chapter="skills"`, one of six `<video>` elements playing (`infrastructure/bg.mp4`, 1280x720 @ 24 fps, 8.04 s, crossfade loop observed `data-loops=1`), `object-fit: cover` over 100vw x 100dvh behind the transparent canvas.
- `pipeSkins` map after visiting cliff then skills holds **4 entries** — the two cliff pipe containers are stale (destroyed display objects, kept `visible=false` by the `onArrive` loop). Textures for both chapters persist in the game-global texture manager (e.g. `surface-*`, `data-pipe-*-cliff-*` keys seen while in skills).

## 4. Skills chapter lifecycle (traced in code, arrival verified at runtime)

1. **Entry from Surface**: player walks into `cliff-to-skills` (x=750, trigger range 52) → 12-phase transport → blackout → `scene.stop()/setConfig({chapter:'skills'})/scene.start()` → destination built behind black → camera snapped to landing point (spawn 144,560) before first frame → reveal → `emerging` plays `tubeExit0..5` → settle → `onArrive` shows **all pipes of the active chapter** (`world.pipes`), hides others, unlocks input.
2. **Arrival state**: player hidden during swap (`swappingChapter`), visible at settle; held keys re-adopted via window-level `heldAtSwap` tracking.
3. **Normal gameplay**: walk/jump, station proximity (INTERACT_RANGE 132) lights nearest station by texture swap, Enter/click opens React `InfoPanel`, Escape closes; gem overlap emits `foundation-probe`.
4. **Exit to Projects**: `skills-to-projects` (x=1350) → same transport → projects chapter (spawn 144).
5. **Return from Projects**: `projects-entry` pipe → `chapterViaPipe` maps an entry pipe to `previousChapter` → back to skills.
6. **Return to Surface**: `skills-entry` pipe → `previousChapter(skills)` = cliff; on cliff, procedural pipe containers are hidden and replaced by the surface PNG artwork (entry + portal) — that guard is re-applied in `onArrive`.

Chapter swap destroys the whole display list and rebuilds one chapter; nothing of an unvisited chapter exists (structural, by design).

## 5. Current Skills visuals — inventory and problems

What the chapter actually renders today (measured object list, §3):

- Background: the **infrastructure video** (`Create_cyberpunk_pixel_art_video_c6b94408.mp4`, smooth painterly CGI, not pixel art; contains hanging **brand-logo signs — AWS, GitHub, Docker, Kubernetes, Python** and SQL/chart icons on the pipe, per `VIDEO_ASSET_INSPECTION_REPORT.md` and poster inspection) behind a transparent canvas.
- Foreground: flat tiled 64px subfloor bay (cyan rim), two plain rectangle ledges, two 44x60 procedural pipe mouths + plates + signs, one 110x20 chapter label, six **identical generic terminals** (48x34 monitor + pedestal, 96x104 texture; only the 6-char tag and label differ), a 12x12 gem, the robot.

Problems:

1. **No Skills-specific environment exists.** Unlike Surface (three chunky pixel-art PNGs over the video), Skills is generic procedural objects over a painterly video — a different visual universe from the approved Surface chapter.
2. **Style clash inside one frame**: smooth CGI video behind hard pixel-art sprites; video is brighter/detailed, foreground is flat minimal rects.
3. **Logo signs in the background video** conflict with the Stage K direction ("avoid turning the environment into a row of logos").
4. Entry pipe sign board clipped off the left world edge (§3).
5. Six stations are visually indistinguishable except text; no per-skill identity (content model already provides `visual.kind`: database-terminal, code-station, analytics-monitor ×3, repository-terminal — currently unused by the art).
6. Floor is a repeating 64px tile — reads flat at zoom 2 compared with Surface's authored platform PNG.
7. Chapter label is a tiny procedural plate, duplicated role with entry signage on Surface.

## 6. Gameplay / lifecycle contracts to preserve

- Chapter-swap transport and its 12 phases; destination built only behind the blackout.
- Pipe trigger ranges, `pipeNearX`, `chapterViaPipe` reverse-travel semantics; `onArrive` shows all of the active chapter's pipes.
- Player physics (speed/jump/gravity/coyote/buffer), 10x14 body, robot 56x62 frames, spawn (144,560).
- Camera zoom rule, origin (0,0), `verticalBiasRatio 0.40`, clamps `[0, width−viewW] × [0, height−viewH]`, look-ahead, frame-rate-corrected easing, resize re-zoom.
- Station layout math (`buildStations`, pitch 130, run 440..1090), INTERACT_RANGE 132, click/Enter activation, panel open/close gating.
- Diagnostics hooks: `__worldProbe()` (Phase 1 fields + chapter/stations/pipes/travelling/camZoom/camView…), `__worldScene`, `transportPhases`, `chapterBeingBuilt`, `isBlackedOut`, `isPlayerOccluded`; interaction bus events (`proximity`/`activate`/`close`/`chapter`/`probe`) → DOM mirror testids (`world-chapter`, `world-nearby`, `world-interaction`, `world-status`, `world-exit`, `world-index-*`).
- Portfolio return behavior (`RETURN TO PORTFOLIO`), entry plate, contents drawer, reduced-motion paths.
- Surface chapter code and assets — untouched by this stage.

## 7. Legacy / duplicate / dead inventory

- `facilityArt.ts`: `drawCeiling`, `drawMidground`, `drawFarSkyline`, `drawPlatformSlab`, `drawPipeRun` have **zero callers** (dead since the video-background switch). `drawElbow`/`drawJunction` are called only by dead `drawMidground`. Live there: palette, conduit/collar/vertical primitives, `drawSubFloor`, `drawSignBoard`, font re-exports.
- `neonCity.ts` (`generateAllForChapter` and all `neon-*` layers/sky) is called only from `buildEnvironment()`, which is skipped when `config.id === 'data'` — dead for the only playable world. Consequence: the `neon-ground-data-<w>` image branch in `WorldScene.buildTerrain` is a **no-op** (texture never exists); the visible ground is the `data-subfloor-56` texture on the physics-body image.
- `PIPE_TRAVEL_MS = 1100` is unused (only mentioned in a `dataPipeSkin` comment); actual travel duration = sum of `PHASE_MS` = **3048 ms**.
- `public/assets/skills-valley.png` (1280x720, bright daylight palette) — **no references in `src/`**; legacy.
- `public/assets/iso/skills.png` + `skills.json` — referenced only by `src/cloud-world-iso/IsoScene.ts` (an unused world variant), not by the Data World game.
- `pipeSkins` accumulation across chapter swaps (§3) — stale hidden containers + persistent textures; harmless today (guarded), worth knowing before adding per-chapter art.
- Stale comment: `buildSurfaceArtwork` says platform source "bottom at y=687"; actual PNG is 617 tall. Walkable-surface comment y≈563 matches measured bright rim rows 565–567.
- `foundation-probe` gem renders in every chapter including Skills (Phase 1 contract — keep, but it is a visible leftover in Skills).

## 8. Asset inventory (measured, not from comments)

| Asset | Source px | Tight visible bbox (alpha>128) | Opaque % | Notes |
|---|---|---|---|---|
| `data-world/surface-platform.png` | 1266x617 RGBA | (0,117)-(1234,611) → 1234x494 | 34.4% | displayed 900x438 at (450,648.2) origin (0.5,1), depth 2; walkable rim rows 565–567 → world y = 560 via walkableToBottom=124×0.711 |
| `data-world/surface-entry.png` | 428x589 RGBA | (13,69)-(428,584) → 415x515 | 72.5% | displayed 183.8x253 at (10,560) origin (0,1), depth 3, scale 0.4295 |
| `data-world/surface-skills-portal.png` | 427x621 RGBA | (3,233)-(424,616) → 421x383 | 53.7% | displayed 176.9x257.3 at (662.35,560) origin (0,1), depth 3, scale 0.4144; centres on exit pipe x=750 |
| `backgrounds/infrastructure/bg.mp4` + poster | 1280x720 @24fps, 8.04s, ~4.9MB | — | — | Skills bg; non-seamless loop handled by dual-video crossfade; painterly CGI with logo signs |
| `backgrounds/surface/bg.mp4`, `backgrounds/core/bg.mp4` | same specs | — | — | Surface/Projects bgs |
| robot frames | 27 PNGs, cell 56x62 | — | — | `src/game/assets/robot/*.png` |

Surface palette extracted from the platform subfloor code: `#211735` base, `#CF31AD` magenta rim, `#17D3F4` cyan, `#1A0D23` seams, `#0A0410` rib cores, `#8B2270` dim conduit; portal blues `#66CCFF/#0066CC/#88E0FF`. `DATA_PALETTE` (facilityArt) for procedural bits.

## 9. Constraints

- World 1500x900 with groundY 560 is shared across chapters; Skills keeps its width so camera/scroll contracts hold.
- Zoom is integer (pixelArt), max 2, driven by viewport **height** only; all four brief viewports land on zoom 2.
- Max camera view bottom ≈ groundY + 0.1×viewH ≤ **611** world px (tablet worst case), so floor art must cover to y≈612; content band top y=296 (BAND_TOP).
- Mobile view is only 195 world px wide; on arrival scrollX≈90, so the entry pipe (x=60) is **off-screen left on mobile** — entry art should extend right of ~x=100 to be visible there.
- Exit pipe must stay beyond the arrival view (world 1350 > 720 desktop view) — preserved by keeping SKILLS_WIDTH and pipe x.
