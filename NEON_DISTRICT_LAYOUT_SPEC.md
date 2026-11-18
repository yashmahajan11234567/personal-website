# NEON DISTRICT — World Layout Specification (Phase A)

Geometry is **unchanged** from `c7184c8`; only art/palette/skins change. All coordinates below are the current, verified values from `src/game/config/worldConfig.ts`.

## World constants (keep)
- `WORLD_HEIGHT = 900`, `GROUND_Y = 560`, `CEILING_FROM = 640`, `CONTENT_BAND = GROUND_Y - 296 = 264`.
- Camera: origin (0,0), zoom `min(2, viewH/264)` quantized to 0.25, `verticalBiasRatio = 0.40`, roundPixels, custom `updateCamera` + `snapCameraTo` with clamps; bounds `world.width × world.height`, lower clamp `groundY + 80`.
- Physics: Arcade, gravity per `physicsFor()`, player body 10×14 at offset ((56−10)/2, 62−14) = (23, 48), origin (0.5, 1), `collideWorldBounds`, static platform group.

## Chapters (isolated worlds; scene swap on travel — keep)
| Chapter | Width | Spawn | Entry pipe | Exit pipe | Platforms |
|---|---|---|---|---|---|
| cliff (Arrival) | 900 | (120, 560) | `cliff-entry` x=60 → cliff (ORIGIN) | `cliff-to-skills` x=750 → skills | 7 (CLIFF_PLATFORMS, y 290–470) |
| skills (Tech District) | 1500 | (144, 560) | `skills-entry` x=60 | `skills-to-projects` x=1350 → projects | 2 |
| projects (Project District) | 1000 | (144, 560) | `projects-entry` x=60 | none (terminal) | 2 |

- `EMERGE_OFFSET = 84` (spawn = pipe.x + 84).
- Routes: cliff→skills, skills→cliff, skills→projects, projects→skills — all four preserved.

## Stations (positions recomputed by `fitStations` — keep algorithm, change skin only)
- Skills: 6 stations fitted across the chapter at `SKILL_PITCH` (130px); projects: 4 stations at wider pitch (~210px). Station objects keep `id`, `kind`, `record` — `worldObjects.ts` draws new neon-terminal/holo art; lit/unlit texture swap mechanism unchanged; `interactionBus` events unchanged → React `InfoPanel` unchanged.
- Interaction: proximity (`armedPipeId` / `focusedStationId` in `__worldProbe`), Enter opens panel, Escape closes, panel locks movement (`setPanelOpen`).

## Transport (keep all 12 phases, re-skin visuals)
`approach → activate → entering(640ms) → occluded → conduit → blackout → build → position → reveal → emerging(640ms) → settle(220ms) → idle`.
- `placePlayerForClimb(x, y, t, 'in'|'out')` plays `tubeEnter0–7` / `tubeExit0–5` strips at depth 2 (behind pipe skin depth 4), scale 1, bottom-anchored.
- `occludePlayer` hides during `occluded`; `settle` restores depth 10 + idle.
- Visual change: pipe skin = neon transit gate; travel band/overlay recolored violet/cyan.

## Probe contract (tests depend on these — keep)
`window.__worldProbe()` → `ok, x, y, grounded, camScrollX/Y, canvasCount, worldWidth, worldHeight, velocityX, velocityY, facingRight, playerSpriteHeight, chapter, focusedStationId/Kind, stationLit, travelling, armedPipeId, panelOpen, stationCount`. `window.__worldScene` diagnostic handle. QA hooks are position-based, not art-based, so re-skinning is safe as long as positions/ids don't move.

## UI shell (keep)
- `WorldShell`: mounts engine into `.world-canvas` (100vw × 100dvh, `.placeholder-world` absolute inset 0), scroll lock via `game-world-active` on html+body, Contents drawer, Back-to-portfolio exit, InfoPanel overlay, entry plate ("ENTER THE WORLD").
- Content: `src/content/` — 6 data skills, 4 data projects with descriptions/technologies/github links. Unchanged.

## QA suites (baseline at c7184c8)
fullscreen 66/66 · traversal 5/5 · exit 3/3 · responsive 13/13 · robot 20/20 · gameplay 2/3 (the keyboard-panel check fails identically at baseline — pre-existing, must not be "fixed" by weakening, and must not regress further).
