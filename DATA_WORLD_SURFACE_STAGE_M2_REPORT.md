# DATA WORLD — SURFACE STAGE M2 REPORT

**Branch:** `restore/data-world-386991f`  
**HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d`  
**Date:** 2026-11-16  
**No commits, no pushes, no destructive git operations.**

---

## 1. Correction applied (only `src/game/scenes/WorldScene.ts`, `buildSurfaceArtwork()`)

| Element | Before | After (approved) | Live-verified |
|---|---|---|---|
| Entry scale | 0.5410 | **0.4295** | scaleX = 0.4295 ✓ |
| Entry position / origin | (10, 560), (0,1) | **(10, 560), (0,1)** — unchanged | x=10, y=560 ✓ |
| Entry display size | 231.5×318.6 | **183.8×253.0** | dw=183.8, dh=253.0 ✓ |
| Entry world rect | (10,241.4)–(241.5,560) | **(10,307)–(193.8,560)** | ✓ |
| Portal scale | 0.5397 | **0.4144** | scaleX = 0.4144 ✓ |
| Portal position | (634.78, 560) | **(662.35, 560)**, origin (0,1) | x=662.35, y=560 ✓ |
| Portal display size | 230.4×335.1 | **176.9×257.3** | dw=176.9, dh=257.3 ✓ |
| Portal world rect | (634.8,224.9)–(865.2,560) | **(662.4,302.7)–(839.3,560)** | ✓ |
| Platform | scale 0.7109, (450,648.15), (0.5,1), depth 2, 900×438.6 | **unchanged** | verified identical ✓ |

Depths unchanged (platform 2, entry/portal 3). Hidden legacy visuals (cliff pipe mouths, chapter label, ledge rims) kept hidden; ledge rim rect, all physics bodies, pipe triggers, probe x=480 untouched. No other source files changed; Stage M docs untouched.

## 2. Live verification at 1440×900 (Playwright, zoom 2, scrollY 155)

- Spawn probe: `x=120, y=560, grounded=true, chapter=cliff, pipeCount=2, camZoom=2` — robot stands naturally on the platform.
- Entry screen rect: (20,304)–(388,810) = **368×506 px (26%×56% of viewport)** — fully visible, proportionate.
- Portal at spawn: screen (1325,295)–(1679,810) — intentional right-edge sliver, as approved.
- Portal after rightward traversal (camScrollX=150.8): screen **(1028,295)–(1382,810)** — fully inside the 1440 viewport; at max scrollX=180 → (966,295)–(1319,810), fully visible. ✓
- Horizontal overflow at 1440×900: **0 px**.
- Console/page errors: **none**.

## 3. QA suites (all pass)

| Suite | Result |
|---|---|
| `qa/accept-dataworld-gameplay.mjs` | **4/4 pass** (exit 0) |
| `qa/accept-dataworld-exit.mjs` | **3/3 pass** (exit 0) |
| `qa/accept-responsive.mjs` | **13/13 pass** (exit 0) — 4 viewports + reduced motion, no h-overflow |
| `qa/accept-dataworld-fullscreen.mjs` | **66/66** (exit 0) |
| `qa/accept-dataworld-robot.mjs` | **20/20** (exit 0) |

## 4. Gameplay / transition preservation (manually exercised)

- Surface → Skills: holding D arms the exit pipe and transitions (`chapter=skills`) ✓
- Skills → Surface: holding A returns (`chapter=cliff, x=78, grounded=true`) ✓
- Jump: airborne at y=534 (vy=−65), lands back at y=560 grounded ✓
- Movement, camera, probes, exit button: covered by passing suites; zero console errors.

## 5. Screenshots

- `qa-screenshots-acceptance/m2-1440x900-spawn.png` — initial spawn
- `qa-screenshots-acceptance/m2-1440x900-entry.png` — entry close-up region
- `qa-screenshots-acceptance/m2-1440x900-portal.png` — portal at camScrollX≈151
- `qa-screenshots-acceptance/m2-1440x900-portal-approach.png` — portal approach at max scroll
- `qa-screenshots-acceptance/m2-1440x900-skills.png` — after Surface→Skills transition
- `qa-screenshots-acceptance/m2-1280x800-spawn.png`, `m2-768x1024-spawn.png`, `m2-390x844-spawn.png`

Preview server: `http://localhost:4173/#/data-world` (vite preview, serving the new build).

## 6. Git state

- Before: 135 porcelain lines (tracked-modified set saved to `/tmp/git-stageM2-before.txt`).
- After: identical tracked-modified set (verified by diff — only new untracked files are this report and the `m2-*.png` screenshots).
- `git diff --stat src/game/scenes/WorldScene.ts`: 317 insertions / 176 deletions **cumulative vs HEAD** (includes the pre-existing uncommitted Stage S changes; this stage's hunk is only the entry/portal scale+position block in `buildSurfaceArtwork()`).
- Branch `restore/data-world-386991f`, HEAD `c7184c859d5da67a77ded67a9178faea5e1e290d`. **No commits or pushes occurred.**

---

Stopped as instructed. Awaiting visual approval before any further stage.
