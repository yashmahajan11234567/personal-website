# ROBOT_ASSET_INVENTORY.md — supplied orange clockwork robot images (Phase 1 audit)

Source: 7 PNGs attached in chat (`/Users/yashsiphone/Library/Application Support/Hermes/composer-images/`). No archives (zip/etc.) were attached.

Method: PIL for dimensions/mode/alpha/background; column-run alpha analysis + per-frame content hashes for frame boundaries and duplicate detection; `vision_analyze` for content identification. Vision was intermittently timing out; items marked UNVERIFIED are backed by programmatic analysis only.

| # | File | Size (px) | Mode | Background | Frames (verified) | Frame size | Content (animation) |
|---|------|-----------|------|------------|-------------------|------------|---------------------|
| 1 | `image_b9a866.png` | 2048×682 | RGBA | transparent (corners α=0) | 8 in a row | 256×682 | **Walk cycle** — 8 poses, legs/arms striding (vision-verified). All 8 hashes distinct. |
| 2 | `image_5fc247.png` | 2048×682 | RGBA | transparent | 8 in a row | 256×682 | **Pipe enter/exit** — stand beside blue pipe → step on → hands on rim → upper body in → legs in → feet in → gone → re-emerge standing (vision-verified frame sequence). |
| 3 | `image_32f416.png` | 2048×682 | RGBA | transparent | 4 in a row | 512×682 | **Interact** — idle → step → holds up blue battery icon → points at it (vision-verified). |
| 4 | `image_5e8414.png` | 2048×682 | RGBA | **white, and every pixel uniformly semi-transparent (α≈208–218)** — needs alpha repair + bg removal | 4 in a row | 512×682 | jump (bent legs) → run → crouch → stand (vision-verified). Content bbox fills whole frame because of the white bg. |
| 5 | `image_74d837.png` | 2048×682 | RGBA but fully opaque | **near-white solid (253,253,255)** — needs bg removal | 3 in a row | 682×682 | idle → step right → step left (vision-verified). |
| 6 | `image_29d3a9.png` | 1774×887 | RGBA but fully opaque | **near-white solid** — needs bg removal | 2 in a row | 887×887 | floating, arms at sides → right arm raised (vision-verified). Reads as FALL/float or a gesture. |
| 7 | `image_c0d96f.png` | 2048×682 | RGBA | transparent (mostly partial alpha, soft edges) | ~6 slices | ~341×682 | **Pipe emerge / climb-out** — only hat tip above blue pipe rim → head → hands gripping rim → torso crouched in mouth → standing on rim → fully out beside pipe with shadow (vision-verified on 6-slice contact sheet). |

## Frame-boundary verification (programmatic)

- Alpha column-run detection + per-frame MD5 (alpha-masked) confirms equal-width grids: 2048/8 = 256 px frames for #1/#2; 2048/4 = 512 px for #3/#4; 2048/3 = 682 px for #5; 1774/2 = 887 px for #6; #7 is one connected strip, sliceable at ~341 px (6 slices).
- **Duplicate frames: 0** in every sheet (all hashes distinct).
- Per-frame content bboxes vary (e.g. #1 frames bbox top y=18–47, bottom 624–674 of 682): frames are **not uniformly cropped** — each frame must be cropped to its own alpha bbox and feet-anchored, or the robot will bob/jitter. Feet sit ≈8–58 px above the frame bottom depending on frame.
- Artifacts: #4 has a uniform ~0.82 alpha veil over a white background (export artifact); #5/#6 have baked-in white backgrounds; #7 has soft/partial alpha edges (fine for pixel art at 2× zoom after nearest-neighbor downscale, but pre-multiplied fringe possible).
- Character (consistent across sheets): round orange/copper robot body, large cyan/blue eyes, brown pointed hat with a gear emblem, orange gear protruding at the head side, gray mechanical backpack, stubby arms/legs.
- All sheets are **single-row sprite strips** (not multi-row atlases), not standalone illustrations.

## Summary

- Complete sheets on transparent bg: #1 (walk, 8f), #2 (pipe enter+exit, 8f), #3 (interact, 4f), #7 (pipe emerge, ~6f).
- Sheets needing cleanup (white bg / alpha veil): #4 (jump/run/crouch/stand, 4f), #5 (idle/steps, 3f), #6 (float/gesture, 2f).
