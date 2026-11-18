# ROBOT_INTEGRATION_PLAN.md — Phase 2 plan (audit output only; nothing implemented)

Branch `restore/data-world-386991f` @ `d177e4c`. Scope: replace ONLY the playable character visuals; environment, layout, camera, physics, chapter flow unchanged.

## Compatibility analysis (Part C)

- **Controller reuse: yes, unchanged.** Movement/jump/physics are sprite-independent (`intentVelocityX`, Arcade vertical, body 10×14). The robot is drawn into the same 32×48-class sprite cell → no controller change.
- **Physics body: keep 10×14** (`PLAYER.bodyWidth/Height`, offset (19,34) from 48px height). If the robot cell height stays 48 world px, body math is untouched. Robot source frames are 256×682 (aspect ≈ 0.375); at 48 px tall the drawn width ≈ 18 px — narrower than the 32px cell, fits the 10px-wide hitbox visually.
- **Feet alignment**: sprite origin (0.5, 1), spawn y = GROUND_Y (560) — feet land exactly on the ground if each frame is cropped to its alpha bbox and **padded so the feet sit on the cell's bottom row**. Per-frame bboxes vary (bottom 624–674 of 682), so per-frame crop + bottom anchor is mandatory, else the robot floats/sinks.
- **Platforms**: unchanged; body 10×14 already fits existing ledges.
- **Camera**: `updateCamera`/`snapCameraTo` use only `player.x/y` and view-size math — **no camera changes**.
- **Pixel-art rendering**: `pixelArt: true` + integer zoom 2 + `setRoundPixels(true)` already give nearest-neighbor; downscaling 256×682 sources to ~18×48 at runtime via canvas drawImage with smoothing disabled, or pre-downscale at asset-prep time. No atlas vs individual textures constraint — but individual canvas textures named `player-robot-*` match the existing `setTexture` pipeline exactly; a Phaser spritesheet would also work. **Recommendation: individual frame textures (smallest diff).**
- **Asset cleanup needed before use**: `image_74d837.png`, `image_29d3a9.png` (white bg), `image_5e8414.png` (white bg + uniform α≈0.82 veil) need background removal / alpha repair; `image_b9a866.png`, `image_5fc247.png`, `image_32f416.png`, `image_c0d96f.png` are already transparent. Do NOT delete or overwrite the existing procedural art (`playerSprite.ts` stays as fallback until cutover).

## Hub visibility (Part F)

- Skills/Projects spawn at `(60+84, 560)` = (144, 560), beside the entry pipe at x=60; the emerge phase + depth 10 + `snapCameraTo` keep the avatar framed and on the ground line. The robot inherits all of this if origin (0.5,1), depth, and spawn logic are unchanged. The known "avatar invisible in hubs" failure mode is the `swappingChapter` hidden flag not being cleared — `settle`/`onArrive` already clears it; robot change must not touch that path.
- During transitions the pipe rim occludes the player at depth 2 — keep that ordering (see PIPE_TRANSITION_AUDIT: robot strip frames include pipe art; crop or composite accordingly).

## Proposed file changes (Phase 2)

1. `src/game/assets/robot/` (new): cleaned + sliced frame PNGs (or one atlas) — `idle0..1, walk0..7, jump, fall, (land), tubeIn0..6, tubeOut0..6, (interact0..1)`.
2. `src/game/art/playerSprite.ts`: add `registerRobotTextures(scene, prefix='player-robot')` (or a loader) — keep `playerSprite.ts` intact until cutover; new module `robotSprite.ts` preferred.
3. `src/game/scenes/WorldScene.ts`: `PLAYER_TEXTURE_PREFIX` → `'player-robot'`; `updateAnimation` walk array extended to 8 frames; `placePlayerForClimb` plays strip frames by phase `t`.
4. `src/game/config/worldConfig.ts`: no changes expected (body/spawn/speed unchanged).
5. `qa/`: add sprite-key assertions (e.g. texture key starts with `player-robot-`); existing suites (gameplay/exit/traversal/responsive/fullscreen) must pass unchanged — they assert positions/camera, not pixels.

## Risks & mitigations

- **Frame bob/jitter** from non-uniform crops → per-frame alpha-bbox crop + bottom-anchor; verify with a pixel diff test per frame.
- **White-fringe/alpha veil** on #4/#5/#6 → clean in asset prep (premultiplied alpha), verify corners α=0.
- **Pipe art baked into strip frames** double-draws the pipe → crop pipe out of strip frames or keep scale-sink occlusion with robot-only frames.
- **Sprite scale during climb** (1→0.45) with multi-frame strips may look odd → keep scale, map frames to t; alternative: no scale, frames alone (decide in Phase 2 with screenshots).
- **Zoom-2 softness**: source 256px wide → ~18px drawn; nearest-neighbor keeps it crisp; if mushy, pre-sharpen.
- **Test coupling**: QA hooks `__worldProbe` (position-based) — low risk; add texture-key checks to lock the swap.

## Ordered implementation stages

1. Asset prep script: clean bg/alpha, slice frames, crop+bottom-anchor, emit `src/game/assets/robot/*.png`; visual review of every frame.
2. `robotSprite.ts` registering `player-robot-*` canvas textures (mirror of `registerPlayerTextures`).
3. WorldScene: switch prefix; extend `updateAnimation` frame arrays; no physics/camera changes.
4. Pipe strips into `placePlayerForClimb` (frame index from phase t); keep depth/occlusion semantics.
5. Verify: `npm run build`; `qa/accept-dataworld-fullscreen.mjs` (66 checks), gameplay 4/4, exit 3/3, traversal 5/5, responsive 13/13; screenshots at 1440×900 + 390×844 for all three chapters and both pipe directions.

## Acceptance criteria

- Robot visible and animated (idle/walk/jump/fall) in all three chapters at desktop and mobile viewports.
- Ground line at 90%, avatar on screen, camera stable across cliff↔skills↔projects (all four routes + repeats).
- Robot visibly enters (5fc247 f1–7) and emerges (c0d96f) from pipes; no blinking/teleport.
- Zero page/console errors; all existing QA suites pass; existing procedural character code untouched until cutover, then removed only with approval.
