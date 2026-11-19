# NEON DISTRICT — Technical Architecture Plan, Risks & Compatibility (Phase A)

## Architecture decision: hybrid, Phaser-only (no Three.js)
Justification: the gameplay layer is already Phaser 4.2.1 (Arcade physics, custom camera, RESIZE scale, scene-swap chapters) and all QA hooks are position/probe-based. A second renderer would duplicate input, physics and camera work for zero gameplay benefit. The "animated cyberpunk city" is achievable in 2D Phaser with pre-rendered parallax tileSprites + offset-driven weather + a handful of sprites — the current scene already runs 4 parallax tileSprite layers this way at 60fps-class headless. So: **keep Phaser, replace the art modules**.

## Module plan
| Module | Change |
|---|---|
| `src/game/art/neonCity.ts` | **NEW.** Seeded generators for sky/far/mid/midground/foreground/ground/subfloor/rain/fog/vehicle/glow textures (see asset inventory). |
| `src/game/art/facilityArt.ts` | Keep file (cloud world may use it? — verified: only WorldScene imports it). Phase B: `buildEnvironment` switches to neonCity layers; facilityArt left in place but unused by data world. |
| `src/game/art/worldObjects.ts` | Re-skin `drawSkillStation` / `drawProjectStation` / `drawPipeMouth` / `drawPipeRun` / `drawChapterPlate` to neon-terminal/holo/gate art. Same signatures, anchors, depths, lit/unlit pairs. |
| `src/game/scenes/dataPipeSkin.ts` | Recolor to neon gate; container/depth/anchor/mouth logic unchanged. |
| `src/game/scenes/WorldScene.ts` | `buildEnvironment()` calls neonCity layers + new ambient systems (rain/fog/traffic/steam/flicker) with a per-scene `AmbientFx` helper; player glow+shadow added in `buildPlayer`; travel band/overlay recolored. Camera/physics/transport/probe untouched. |
| `src/game/config/worldConfig.ts` | Palette hexes → NEON DISTRICT palette. Chapter widths/spawns/pipes/platforms/stations unchanged. |
| `src/game/scenes/pipeTransport.ts` | No change (phases/timing owned here). |
| `src/components/*`, `App.css`, `WorldShell.css` | No change (fullscreen shell, scroll lock, panels, overlays all stay). |
| `src/content/*` | No change. |

## Ambient FX system (new, in WorldScene or small `ambientFx.ts`)
- Rain: 2 tileSprites (scroll with foreground-ish factors 0.85/0.95), `tilePositionY += speed*dt`, `tilePositionX += drift*dt`.
- Fog: 2 tileSprites at far/mid factors, slow X drift.
- Traffic: ≤5 sprites on layers 2–3, constant vx, wrap at width; hidden under reduced motion.
- Windows: each midground building texture ships 2 variants; `time.addEvent` swaps variant every 2–7s (seeded). No per-frame redraw.
- Neon flicker: per-sign `alpha = base * (flickerSeed < 0.98 ? 1 : 0.35)` on a 120ms timer — deterministic-ish, cheap.
- Holo pulse: `alpha = 0.75 + 0.25*sin(t)` on holo sprites.
- Steam: 2 emitters at vent x positions, 3 particles/sec, recycled.
- All ambient updates in one `updateAmbient(dt)` called from `update()`; paused when `document.hidden` or `reducedMotion` (except nothing — full stop under reduced motion, per existing convention).
- No allocations in the frame loop (reuse sprites, write properties only).

## Compatibility requirements (hard)
1. `__worldProbe` keys unchanged; player x/y/grounded semantics unchanged → suites stay green.
2. Chapter swap (scene.stop/start in `build`) must still rebuild ambient FX — ambient objects are scene children, destroyed with the scene; re-created in `create()`.
3. `playerSpriteHeight` probe reads `player.height` = 62 (robot cell) — keep cell size.
4. Pipe skin container depth 4 / player depth 2 during climb / depth 10 idle — unchanged so occlusion works.
5. Fullscreen: layers must be tileSprites origin (0,0) sized `world.width × layerHeight`, `setScrollFactor(f, 1)` — vertical parallax forbidden.
6. `pixelArt: true` + zoom quantized 0.25 + roundPixels — keep; new textures must look fine nearest-neighbour at 2× (draw at world-px resolution, let zoom pixelate, matching robot/hoodie aesthetic).
7. Build must pass `npm run build` (tsc) — new module fully typed.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Vision service flaky (2 of 3 refs failed) | Design anchored to written spec + 2 analyzed refs; verify visually via Playwright screenshots + pixel checks, not vision_analyze. |
| Busy background hides player/stations | Robot has glow+shadow; stations keep lit state + gem; keep fog/rain alpha low; pixel-check contrast at station x positions. |
| Texture memory at 1500px width × 560 height × 6 layers | Reuse per-layer textures across chapters where identical (same width chapters share); cap heights; measure via probe. |
| Ambient FX hurt headless test perf | All FX pause under `document.hidden`; headless Playwright pages are "visible" but tests already pass with current 4 layers; keep sprite count ≤ 20. |
| Pre-existing gameplay 2/3 (keyboard panel) | Baseline-documented; do not touch; distinguish any NEW failures in Phase E. |
| Chapter rebuild wipes timers/emitters | Create ambient FX in `create()` after environment; dispose on `shutdown()` (already called by engine unmount). |
| pixelArt nearest at 2× makes gradients band | Dither noise added in generators (seeded), gradients kept subtle. |

## Phase plan (per task)
- **A (this doc set):** audit + design + layout + inventory + plan. ✅ checkpoint tag created.
- **B:** neonCity.ts generators + layer wiring + rain/fog/traffic + fullscreen/responsive verification at 4 viewports.
- **C:** station/pipe re-skins, robot glow/shadow, travel band recolor, all 4 routes re-verified.
- **D:** polish — flicker/holo/windows/steam tuning, district distinctiveness, transition flash.
- **E:** full QA (6 suites + new neon acceptance), screenshots per district × viewport, perf probe, report. Commit/push only on explicit permission.
