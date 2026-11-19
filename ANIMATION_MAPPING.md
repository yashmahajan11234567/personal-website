# ANIMATION_MAPPING.md — robot sheets → required states (Phase 1 audit)

Required states (from the phase spec) vs. available robot frames (see ROBOT_ASSET_INVENTORY.md):

| State | Available asset | Frames | Notes |
|-------|----------------|--------|-------|
| IDLE | `image_74d837.png` f0; `image_32f416.png` f0 | 1–2 | 74d837 f0 is a clean front-facing idle; 32f416 f0 also idle. Pick one; optionally alternate as the current `idleA`/`idleB` breathing pair (74d837 f1/f2 are steps, not breathing — so use 74d837 f0 + 32f416 f0 as the 2-frame idle, or single-frame idle under reduced motion as today). |
| WALK | `image_b9a866.png` (8×256px) | 8 | Full walk cycle, vision-verified. Direct replacement for `walkA..walkD` (currently 4 frames @110ms → use 8 frames @~70ms or keep 4-frame subset). |
| RUN | `image_5e8414.png` f1 | 1 | Only a single run pose; needs bg/alpha cleanup. If kept, run = fast walk (reuse b9a866 at higher rate) — **partial gap**. |
| JUMP | `image_5e8414.png` f0 | 1 | Bent-legs jump pose. Maps to current single `jump` frame. |
| FALL | `image_29d3a9.png` (2×887px) | 1–2 | Floating/arms-out poses; plausible FALL. Needs bg removal. **Attribution UNVERIFIED beyond vision description** — could also read as a gesture. |
| LAND | `image_5e8414.png` f2 (crouch) | 1 | Crouch = landing squash. Current implementation has no LAND state (falls straight back to idle/walk); adding it is optional juice — **gap in current design too**. |
| PIPE_ENTER | `image_5fc247.png` frames 1–7 (of 8) | 7 | Stand→step→hands on rim→body in→feet in→gone. Vision-verified enter sequence. Frame 8 (re-emerge) is the start of exit. |
| PIPE_TRAVEL | none needed | — | During `conduit`/`blackout` the player is hidden (`occludePlayer`) behind a full-screen overlay; no frames required. **Covered by design.** |
| PIPE_EXIT | `image_c0d96f.png` (~6 slices) + `image_5fc247.png` f8 | 6–7 | Climb-out from hidden to fully standing. Vision-verified. Reverse of enter is also possible with 5fc247. |
| INTERACT | `image_32f416.png` f2–f3 | 2 | Battery hold + point. Current implementation has **no INTERACT animation** (gem/probe only) — this would be a new addition; optional in Phase 2 scope ("preserve gameplay", so wire it only if it doesn't change input semantics). |

## Gaps (explicit)

1. No dedicated RUN cycle — only one run pose (#4 f1). Mitigate: play walk cycle faster, or skip run (current game has a single speed 150 px/s anyway — no run state exists in the controller).
2. FALL attribution uncertain (#6). Mitigate: reuse #4 f0/f1 or a walk frame mid-air; current `fall` frame exists and works.
3. LAND is a crouch pose only; current code has no land state — keep behavior identical, optionally add.
4. INTERACT not present in current controller — optional.
5. Frame sizes are non-uniform after cropping (per-frame alpha bbox varies) — must normalize per frame with feet anchored at the bottom edge.

## Proposed animation architecture (compatible with existing Phaser code)

Keep the existing **texture-per-frame + `setTexture`** architecture (no Phaser AnimationManager), because `updateAnimation()` already selects frames by name and tests/QA hook `player.texture.key`:

1. At asset-prep time (offline script or a build step), slice each supplied PNG into frames, crop to alpha bbox, pad to a uniform cell with the **feet at the bottom edge**, and emit individual PNGs or one atlas.
2. Load them in `preload()` as `this.load.spritesheet('player-robot', atlas, {frameWidth, frameHeight})` **or** keep canvas textures: draw each sliced frame into a `createCanvas` texture named `player-robot-<state>-<i>` (matches `registerPlayerTextures`).
3. Replace `PLAYER_TEXTURE_PREFIX` `'player-hoodie'` → `'player-robot'` and extend the frame map: `idleA/idleB`, `walkA..walkH` (from b9a866), `jump`, `fall`, `tubeEnter0..6` (5fc247 f1–7), `tubeExit0..6` (c0d96f slices), optionally `interact0/1`.
4. `updateAnimation()` mapping stays identical in shape: airborne→jump/fall, idle→idleA/B timer, walk→cycle through N frames at 110ms/N.
5. `placePlayerForClimb` plays the enter/exit strips across the phase duration (`entering` 640ms / `emerging`) instead of a static frame + scale; keep the depth (2 in / 10 out) and body pinning so the pipe lip occludes correctly.
6. Rendering: engine already has `pixelArt: true`, camera `setRoundPixels(true)`, integer zoom 2 — nearest-neighbor is preserved; no change needed. Source frames (256×682) downscale to ~18×48 world px at zoom 2 → crisp.
