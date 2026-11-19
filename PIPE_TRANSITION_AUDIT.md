# PIPE_TRANSITION_AUDIT.md — pipe lifecycle (Phase 1 audit)

Files: `src/game/scenes/pipeTransport.ts` (state machine, 508 lines), `src/game/scenes/WorldScene.ts` (`updatePipes` 1835, skin callbacks ~1020–1150, `onArrive` ~1184), `src/game/scenes/dataPipeSkin.ts` (pipe art), `src/game/config/worldConfig.ts` (pipes per chapter, `pipeNearX`, `chapterViaPipe`, `PIPE_HALF_WIDTH`).

## Lifecycle (12 phases, `TRANSPORT_PHASES`)

`approach → activate → entering(640ms) → occluded → conduit → blackout → build(16ms) → position → reveal(260ms) → emerging → settle(220ms) → idle`

1. **Activation** (`updatePipes`): `pipeNearX(world, player.x)` finds nearest pipe; arms only when `|player.x − pipe.x| ≤ PIPE_HALF_WIDTH`; `time.delayedCall(0, …)` fires `transport.start(...)` on the next frame, guarded by `transport.isTravelling`. Destination from `chapterViaPipe` — entry pipes lead back, exit pipes onward (using `near.destination` directly would make reverse travel a no-op — documented in code).
2. **Movement lock** (`lockPlayer`): `body.setVelocity(0,0)`, `setAcceleration(0,0)`, `intentVelocityX = 0` (scene integrates x itself).
3. **Entering** (640ms): `placePlayerForClimb(x, y, t, 'in')` — moves the sprite toward the mouth, **scale 1 → 0.45**, y offset `+t·48·0.42` (sinks below ground line), texture `tubeEnter`, **depth 2** (behind the pipe front rim, which sits higher), `body.reset` pins the body. → Currently a *single static frame* + scale.
4. **Occluded**: `occludePlayer(true)` → `setVisible(false)` (deliberate: no silhouette during travel).
5. **Conduit + blackout**: full-viewport opaque rectangle (depth 901, `scrollFactor(0)`) + scrolling `TileSprite` band; `travelBand.tilePositionX` advanced in `updatePipes` with dt scaling.
6. **Build** (16ms): `scene.stop(); scene.start()` with the destination chapter config — the new chapter's `create()` runs **behind the blackout**, spawns the player `setVisible(false)` (`swappingChapter`), and places the camera via `cameraTarget` → `snapCameraTo` (origin-corrected; no visible camera flight).
7. **Position**: `positionDestinationCamera` — `setBounds` + `useBounds=false`, `snapCameraTo(cameraTarget.x, groundY−100)`, `stopFollow()`.
8. **Reveal** (260ms): blackout lifts; destination visible with player still hidden.
9. **Emerging**: `placePlayerForClimb(x, y, t, 'out')` — scale 0.45 → 1, rises `−(1−t)·48·0.42`, texture `tubeExit`, depth 10. → single static frame today.
10. **Settle** (220ms): `occludePlayer(false)` (visible, scale 1, depth 10, `idleA`), `onArrive` → `snapCameraTo(player.x, player.y−100)`, camTarget re-seeded, **all chapter pipes made visible** (`chapterPipeIds` set — the old entry-only rule hid the armed exit pipe and caused blind teleports), chapter announced to React, `playerLocked` released, input restored.

## Race conditions / repeated triggers / sync issues found

- Arming uses a one-frame `delayedCall(0)` plus `isTravelling` guard and `armedPipe !== near` — brushing the mouth edge does not insta-travel; leaving the zone clears `armedPipe` and re-arms on return. OK.
- Double-start is guarded; mid-travel key holds are tracked via window keydown/keyup (`trackHeldDown` etc.) and re-adopted after scene restart because Phaser deletes Key objects on shutdown.
- **Animation sync gap for the robot**: `entering`/`emerging` drive a *static* `tubeEnter`/`tubeExit` texture with scale — the supplied robot has real multi-frame enter (5fc247 f1–7) and emerge (c0d96f) strips. Phase 2 must map strip frame index to phase `t` (frame = floor(t · nFrames)) inside `placePlayerForClimb`, keeping scale/depth/body behavior.
- Occlusion relies on pipe rim depth > player depth 2 while entering; robot strip frames **include the pipe art itself** (c0d96f slices show the blue pipe). If the strip is drawn as the player sprite, the pipe will scale/move with the player — better to keep the existing pipe skin static and draw only the robot portion (crop the strip's pipe out or composite), or accept the pipe moving with the shrink. Flag for Phase 2.
- `build` phase is 16ms — destination `create()` must stay cheap (it is: canvas textures are idempotent).

## Visibility guarantees the robot must keep

- Hidden from `create()` while `swappingChapter`; revealed only by `settle`.
- Full occlusion during blackout; no partial-alpha silhouette.
- Depth 10 at rest (above stations depth 6, ground rim depth 1); depth 2 while entering so the pipe lip covers it.
- Feet anchored: sprite origin (0.5, 1) at `spawn.y = GROUND_Y` — robot frames must be bottom-anchored after cropping.
