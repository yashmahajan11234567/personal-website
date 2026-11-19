# CURRENT_CHARACTER_AUDIT.md — Data World playable character (Phase 1 audit)

- Repo: `personal-website-river`
- Branch: `restore/data-world-386991f`
- Commit: `d177e4c6e5668d52ecc9d63c8e43aa5f42f0cf9b` (working tree clean at audit time)
- Engine: **Phaser 4.2.1** (`node_modules/phaser/package.json`), `type: Phaser.AUTO` (WebGL, Canvas fallback), `scale: Phaser.Scale.RESIZE`, `pixelArt: true`, `audio: { noAudio: true }` — see `src/game/engine.ts` (`mountWorld`).

## Key finding: the character has NO image assets

The current avatar is **procedurally generated pixel art**, drawn in code and registered as canvas textures at boot. There are no sprite-sheet files on disk for the player (the only images under `src/assets`/`public/assets` are hero/world art, not the character).

- `src/game/art/playerSprite.ts` (692 lines):
  - `WIDTH = 32`, `HEIGHT = 48` (world px per frame).
  - `FRAMES`: 10 frames of 48 key-string rows, each 32 chars, mapped through `COLOURS` to ARGB in `toPixels()`, written via one `putImageData` per frame onto a `createCanvas` texture.
  - Frame names: `idleA, idleB, walkA, walkB, walkC, walkD, jump, fall, tubeEnter, tubeExit`.
  - Exports: `PLAYER_FRAMES`, `PlayerFrameName`, `PLAYER_FRAME_WIDTH/HEIGHT`, `PLAYER_BODY` (`halfWidth: 8, height: 42, originOffsetY: 45`), `registerPlayerTextures(scene, prefix = 'player-hoodie')` — idempotent, creates textures named `player-hoodie-<frameName>`.
- Texture prefix used by the scene: `PLAYER_TEXTURE_PREFIX = 'player-hoodie'` (`src/game/scenes/WorldScene.ts:77`), registered in `create()` at line 357.

## Creation & physics — `WorldScene.buildPlayer()` (WorldScene.ts:809)

- `this.physics.add.sprite(world.spawn.x, world.spawn.y, 'player-hoodie-idleA')`
- `setOrigin(0.5, 1)` (feet-anchored), `setDepth(10)`.
- Body (`Phaser.Physics.Arcade.Body`): `setCollideWorldBounds(true)`, **`setSize(10, 14)`** (`PLAYER.bodyWidth/bodyHeight`), `setOffset((48-10)/2, 48-14)` = (19, 34) — hitbox inset, feet at sprite bottom.
- `setMaxVelocity(PLAYER.speed=150, 520)`, `setDragX(1100)`, `setBounce(0)`.
- `physics.add.collider(player, this.platforms)`; platforms = static group incl. ground slab (`buildTerrain`, line 742).
- Mid-journey spawn (`swappingChapter`) → `setVisible(false)` until the `emerging`/`settle` phase reveals it.
- `PLAYER` tuning (`src/game/config/worldConfig.ts:270`): `speed 150 px/s`, `acceleration 900`, `drag 1100`, `jumpVelocity 230`, `gravityY 900`, `airControl 0.7`, `coyoteMs 90`, `jumpBufferMs 110`, `deadzone {96,72}`, `lerp 0.12`.

## Movement & animation — WorldScene.ts

- Movement lives in `update()` (~line 1940–2015): horizontal intent `intentVelocityX` integrated with **real dt** (`a*dt`, drag, clamp ±150), `setFlipX` on direction; Arcade horizontal integration disabled (vertical left to Arcade: gravity/jump arc unchanged). Coyote time + jump buffer via `lastGroundedAt`/`jumpPressedAt`.
- **No Phaser AnimationManager is used.** `setAnimationFrame(name)` (line 1735) does `player.setTexture('player-hoodie-<name>')` if the texture exists; `updateAnimation()` (line 1749) picks: airborne → `jump`/`fall` by `velocity.y` sign; stationary → `idleA`/`idleB` alternating every 620 ms (frozen on `idleA` under reduced motion); walking → `walkA..walkD` cycling every 110 ms.

## Camera dependency — `updateCamera` (line 1550), `snapCameraTo` (line ~1527)

- Depends only on `player.x / player.y` (+ look-ahead, `CAMERA.verticalBiasRatio = 0.4`), `cam.setOrigin(0,0)`, zoom from `cam.height`, clamps scroll to `[0, world − view]`. **Sprite-independent** — a new character needs no camera changes as long as origin stays (0.5, 1) and size ≈ 32×48.

## Pipe interaction & chapter transitions

- Trigger: `updatePipes()` (line 1835) — `pipeNearX(world, player.x)` proximity, arm only when `|player.x − pipe.x| ≤ PIPE_HALF_WIDTH`, then `time.delayedCall(0, …)` guarded by `transport.isTravelling`; destination resolved via `chapterViaPipe` (entry pipes lead back, exit pipes onward); `transport.start(pipe, destination, player.x, player.y)`.
- Transport state machine: `src/game/scenes/pipeTransport.ts` (508 lines). 12 phases: `approach, activate, entering(640ms), occluded, conduit, blackout, build(16ms), position, reveal(260ms), emerging, settle(220ms), idle`.
- Visuals via the `PipeSkin` interface implemented inline in WorldScene (~lines 1020–1150):
  - `lockPlayer` zeroes velocity/acceleration/intent.
  - `placePlayerForClimb(x, y, t, climbing)`: scale `1 → 0.45` (in) / `0.45 → 1` (out), y offset `± t*48*0.42` (sinks below ground line so the pipe lip covers the sprite), texture `tubeEnter`/`tubeExit`, depth 2 (in) / 10 (out), `body.reset` pins physics. **Currently a single static frame per direction plus scale** — the multi-frame robot strips must replace this.
  - `occludePlayer(true)` hides the sprite entirely during blackout; restored on `settle` (scale 1, depth 10, `idleA`).
  - `setBlackout(on)`: full-viewport `scrollFactor(0)` rectangle at depth 901 + scrolling conduit `TileSprite` band.
  - `buildDestination` swaps scene (`scene.stop(); scene.start()`) behind the blackout; `positionDestinationCamera` → `snapCameraTo(cameraTarget.x, groundY−100)` (origin-corrected, no camera jump); `landingPointFor` = chapter `spawn`.
  - `onArrive`: restores visibility, `snapCameraTo(player.x, player.y−100)`, re-seeds `camTargetX/Y`, restores **all** chapter pipes' visibility (`chapterPipeIds`), announces chapter to React.
- Pipe art: `src/game/scenes/dataPipeSkin.ts` — `createDataPipeSkin` builds a mouth container (canvas textures `<PREFIX>-mouth-<id>` / `-lit-`, sign board, tunnel band); mouth drawn above the player while entering (player depth 2 < pipe front rim).

## Chapter spawn / hub positioning (Part F input)

- `src/game/config/worldConfig.ts` `DATA_CHAPTERS`: cliff `spawn {x:120, y:GROUND_Y=560}` (open ground); skills & projects `spawn {x: 60 + EMERGE_OFFSET(=84) = 144, y: 560}` — i.e. **right at the entry pipe**, revealed by the emerge sequence. Entry pipe at x=60, exit pipe at `width − 150`.
- Avatar visibility in hubs is therefore: hidden at `create()` while `swappingChapter`, climbs out via `placePlayerForClimb('out')`, depth 10 above stations (depth 6) and ground art; camera snaps to it so it is framed on arrival.

## QA surface

- `window.__worldProbe()` exposes `x, y, grounded, camScrollX/Y, camZoom, canvasCount, …` — tests assert positions/grounded/camera, **not sprite pixels or texture keys** (grep of `qa/*.mjs` for `player-hoodie` → 0 matches). Replacing textures should not break existing suites; new sprite-key assertions would be additive.
