# DATA WORLD SURFACE — FRESH QA CHECKLIST

**Branch:** `restore/data-world-386991f`  
**HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d`  
**Date:** 2026-11-16  
**Status:** Staged verification plan — to be executed after implementation approval.

---

## 1. Staged Implementation Plan

| Stage | Scope | Files Modified | Verification |
|-------|-------|----------------|--------------|
| **1. Artwork layout** | `buildSurfaceArtwork`: new scales (entry 0.541, portal 0.539), positions (entry x=10, portal leftX=635), anchors, depths | `WorldScene.ts` | Visual: entry/portal fully visible, not clipped, correct proportions |
| **2. Hide legacy visuals (cliff)** | `buildTerrain`: suppress 6 ledge rects + rims; `buildStations`: suppress chapter label; `buildPipes`: hide both cliff pipe containers | `WorldScene.ts`, `dataPipeSkin.ts` | Visual: no floating grey ledges, no “DATA WORLD” label, no duplicate START/NEXT portals |
| **3. Camera & vertical framing** | Verify `zoomForViewport`, `verticalBiasRatio=0.4`, ground at 90% viewport | `WorldScene.ts` (no changes expected) | All viewports: ground line at ~90%, art tops visible |
| **4. Gameplay regression** | Ensure all physics, triggers, transport, probes unchanged | — | All existing acceptance tests pass |
| **5. Responsive & accessibility** | Verify 4 viewports, reduced motion, all test IDs | — | `accept-responsive.mjs`, `accept-dataworld-gameplay.mjs`, `accept-dataworld-exit.mjs` pass |
| **6. Visual acceptance** | Screenshot comparison at each viewport | — | No horizontal overflow, background visible, robot readable |

---

## 2. Visual Acceptance Criteria (Per Viewport)

### 2.1 1440×900 (Primary — Faculty Demo)
| Check | Expected | Verification Method |
|-------|----------|---------------------|
| Initial Surface view | Entry left (x=10), platform continuous, portal right (x≈635), background video visible above y≈225 | Screenshot `surface-1440x900-initial.png` |
| Entry structure | “DATA WORLD / ENTRY” sign readable, doors at ground level, magenta/cyan neon | Visual inspect |
| Robot on platform | Spawn at x=120 (inside entry footprint), depth 10 > art depth 3, feet on walkable line | `__worldProbe.grounded === true`, screenshot |
| Portal | “NEXT: SKILLS” text on blue arch, base at ground, centered on x=750 | Visual inspect |
| Full chapter composition | No horizontal overflow, no duplicate labels, no grey ledge bars, no double doors/portals | Screenshot + visual diff |
| No artwork clipping | Entry top > view top, portal top > view top, platform spans full width | Screenshot |
| Portal interaction | Walk to x≈750 → `armedPipeId="cliff-to-skills"` → Enter triggers transition | Playwright: `accept-dataworld-traversal.mjs` |
| Surface → Skills transition | Pipe ride (1100ms), arrive in Skills chapter, chapter announced | `accept-dataworld-traversal.mjs` |
| Return to Portfolio | Click `world-exit` → hero route, h1 present | `accept-dataworld-exit.mjs` |
| Zero console errors | `pageerror` + `console.error` count = 0 | All tests |

### 2.2 1280×800
| Check | Expected |
|-------|----------|
| Canvas + no horizontal overflow | `resp-data-1280.png`, overflow ≤ 2px |
| Ground line at ~90% viewport | Visual |
| Entry/portal fully visible | Visual |
| Background video visible | Visual |

### 2.3 768×1024 (Tablet Portrait)
| Check | Expected |
|-------|----------|
| Canvas + no horizontal overflow | `resp-data-768.png`, overflow ≤ 2px |
| Tall viewport → more background above art | Visual |
| Touch/mobile motion works | `accept-mobile-touch.mjs` (if exists) |

### 2.4 390×844 (Mobile)
| Check | Expected |
|-------|----------|
| Canvas + no horizontal overflow | `resp-data-390.png`, overflow ≤ 2px |
| Zoom quantized correctly (1.5 or 2.0) | `__worldProbe.camZoom` |
| Entry/portal not squished | Visual |
| Contents drawer toggles | `world-index-toggle` works |

### 2.5 Reduced Motion (1440×900, `prefers-reduced-motion: reduce`)
| Check | Expected |
|-------|----------|
| Camera snaps (no lerp) | `__worldProbe.camScrollX` jumps |
| Conduit shown but static | Visual |
| Tube enter/exit frames play | Robot animation |
| All gameplay functional | `accept-dataworld-gameplay.mjs` with reduced motion context |

---

## 3. Functional Acceptance Criteria (Existing Test Suites)

| Test File | Must Pass | Key Assertions |
|-----------|-----------|----------------|
| `qa/accept-dataworld-gameplay.mjs` | ✅ | WASD motion, jump, boundary clamp, panel open/close via keyboard, zero errors |
| `qa/accept-dataworld-traversal.mjs` | ✅ | Walk through chapters, ride pipes, open panel, visit ≥2 chapters, panel opens |
| `qa/accept-dataworld-exit.mjs` | ✅ | `world-exit` click returns to hero, hash + h1 |
| `qa/accept-responsive.mjs` | ✅ | 4 viewports: canvas present, no h-overflow, zero errors; reduced motion context |
| `qa/accept-dataworld-robot.mjs` | ✅ | Robot sprite height, animation frames, hitbox |
| `qa/accept-dataworld-fullscreen.mjs` | ✅ | Full-screen canvas at all sizes |
| `qa/test_console_errors.mjs` | ✅ | Zero browser console errors |
| `qa/test_chapter_switch.mjs` | ✅ | Chapter transitions work both directions |
| `qa/surface_final_test.mjs` | ✅ | Surface-specific visual checks |

**All tests run via:** `npx playwright test qa/*.mjs` (or individual `node qa/*.mjs` with dev server at `http://[::1]:4173/`).

---

## 4. Visual Regression Baseline

**New baseline screenshots to capture after implementation:**

| Viewport | File | Description |
|----------|------|-------------|
| 1440×900 | `surface-final-1440x900-initial.png` | Initial view, entry left, portal right |
| 1440×900 | `surface-final-1440x900-entry.png` | Close-up entry structure |
| 1440×900 | `surface-final-1440x900-portal.png` | Close-up portal |
| 1440×900 | `surface-final-1440x900-robot.png` | Robot standing on platform |
| 1280×800 | `surface-final-1280x800-initial.png` | — |
| 768×1024 | `surface-final-768x1024-initial.png` | — |
| 390×844 | `surface-final-390x844-initial.png` | — |
| 1440×900 reduced | `surface-final-1440x900-reduced.png` | Reduced motion |

**Comparison:** Visual diff against reference composition proportions (not pixel-perfect — artwork preserved).

---

## 5. Specific Visual Defects to Verify Fixed

| Defect (from Audit) | Fixed When |
|---------------------|------------|
| Entry structure oversized (42% viewport width) | Stage 1: entry width 231 world px = 462 screen px = 32% |
| Portal oversized (42% viewport width) | Stage 1: portal width 230 world px = 460 screen px = 32% |
| Entry top clipped at spawn | Stage 1: entry top world y=241 > view top 155 |
| Portal top clipped at spawn | Stage 1: portal top world y=225 > view top 155 |
| 6 grey ledge bars floating in air | Stage 2: suppressed on cliff |
| “DATA WORLD” label floating at x=40 | Stage 2: suppressed on cliff |
| Two START doors (artwork + pipe skin) | Stage 2: entry pipe skin hidden |
| Two NEXT: SKILLS portals (artwork + pipe skin) | Stage 2: exit pipe skin hidden |
| Background video not visible above art | Stage 1: art tops at y=225–241, view top 155 → 70–86 world px = 140–172 screen px visible |

---

## 6. Gameplay Regression Checks (Must Not Break)

| Contract | Test / Probe |
|----------|--------------|
| Robot spawns grounded at (120, 560) | `__worldProbe.grounded === true` at t=0 |
| 6 ledge physics bodies at exact coords | `CLIFF_PLATFORMS` unchanged; collision works |
| Ground collision full width | Player cannot fall through |
| Pipe trigger at x=60 (entry) & x=750 (exit) | `armedPipeId` set when player near |
| Chapter transition cliff→skills→projects→skills→cliff | `accept-dataworld-traversal.mjs` visits ≥2 chapters |
| Pipe travel 1100ms, blackout, emerge | Visual + `__worldProbe.travelling` |
| Portal hover lights up | `proximityActive` → lit texture |
| Interaction bus events fire | `world-interaction` live region updates |
| InfoPanel opens/closes via Enter/Escape | `accept-dataworld-gameplay.mjs` panel flow |
| Camera follows with look-ahead, vertical bias | `__worldProbe.lookAheadX`, ground at 90% |
| `__worldProbe` all fields present | Diagnostics object shape unchanged |
| `world-exit` returns to hero | `accept-dataworld-exit.mjs` |
| `world-index-toggle` opens drawer | `accept-dataworld-gameplay.mjs` |
| Reduced motion: camera snaps, no conduit scroll | `accept-responsive.mjs` reduced motion context |

---

## 7. Acceptance Gate Checklist (Per Stage)

### Stage 1 Gate: Artwork Layout
- [ ] Entry at x=10, width 231, base at groundY, top visible at 1440×900
- [ ] Platform full width 900, walkable at groundY
- [ ] Portal leftX=635, width 230, base at groundY, top visible
- [ ] No stretching (aspect preserved)
- [ ] Depths: platform 2, entry 3, portal 3, robot 10

### Stage 2 Gate: Legacy Cleanup
- [ ] No grey ledge rectangles visible on cliff
- [ ] No magenta ledge rims visible on cliff
- [ ] No “DATA WORLD” chapter label on cliff
- [ ] No procedural entry pipe visual (START door, ORIGIN sign)
- [ ] No procedural exit pipe visual (NEXT: SKILLS portal, JUMP TO START sign)
- [ ] Gem probe still at x=480 (gameplay)
- [ ] Pipe triggers still functional (invisible containers)

### Stage 3–6 Gates: Verified by Test Suites
- [ ] All 8 test suites pass (Section 3)
- [ ] 4 responsive viewports pass
- [ ] Reduced motion passes
- [ ] Zero console errors
- [ ] Screenshots captured for baseline

---

## 8. Rollback Plan

If any stage breaks gameplay contracts:
1. `git diff` the modified files (`WorldScene.ts`, `dataPipeSkin.ts`)
2. Revert only the specific change (patch/revert hunk)
3. Re-run failed test to confirm fix
4. Document deviation in implementation log

**No commits until all gates pass.** Work stays in working tree.

---

## 9. Open Questions for Implementation

1. **Pipe skin hiding:** Add `hideCliffPipes()` in `WorldScene` after `buildPipes()` that calls `mouth.setVisible(false)` on both cliff pipe containers, or add a `visible: false` option to `createDataPipeSkin` for cliff pipes?
2. **Ledge visual suppression:** Change `buildTerrain` L798–806 to `if (!isCliff) { draw rect + rim }` — keep physics bodies.
3. **Chapter label suppression:** `buildStations` L1114–1118 wrap in `if (!isCliff)`.
4. **Gem probe:** Keep as-is (depth 5, x=480) — no visual conflict with new artwork.

---

*End of QA Checklist. Ready for execution upon design plan approval.*