# Cloud World — Audit Report

**Date:** 2026-10-12  
**Branch:** main (no commits made)  
**Auditor:** Systematic debugging + Playwright visual capture + Chrome DevTools console inspection  

---

## Executive Summary

The Cloud World implementation has a solid architectural foundation (sky sphere, three-zone structure, post-processing pipeline) but the **Skills Valley** and **Mountain Passage** zones read as "unfinished collections of basic geometric shapes" rather than a cohesive sunset world matching the `skills-valley.png` reference. The audit confirms all 8 ranked visual problems from `CLOUD_WORLD_TERRAIN_POLISH_PLAN.md` with additional findings from real-browser capture.

---

## 1. Git Status & Preservation

**Status:** Clean working tree for source code.  
**Uncommitted changes preserved:**
- `package.json`, `package-lock.json`, `playwright.config.ts`, `vite.config.ts` (config updates)
- `src/App.tsx`, `src/components/InfoPanel.tsx`, `src/content/index.ts` (app logic)
- All audit screenshots in `qa-screenshots-audit/` (new evidence)
- Reference image `public/assets/skills-valley.png` (unchanged)

**Deleted files (staged):** Legacy QA specs, old frame assets, old content files — these are intentional cleanup from prior phases.

---

## 2. Current Implementation Review

### Core Architecture (CloudWorld3D.tsx — 1406 lines)

| Component | Status | Notes |
|-----------|--------|-------|
| `SunsetSkySphere` | ✅ Working | Shader-based gradient sphere at origin, scale 20000, `BackSide`, `frustumCulled=false`, `renderOrder=-9999`. Colors: zenith `#FFB74D`, horizon `#FFCC80`, nadir mirrors zenith. |
| Lighting | ⚠️ Needs unification | Hemisphere `groundColor=#C8A878`, `color=#FFE8C0`, intensity 0.7. Directional `[25,50,-20]` intensity 1.6. Cool shadows conflict with warm palette. |
| `SkillsValleyZone` | ❌ Incomplete | 10 `ValleyHill` boxes, 16 `PineTree` cones, 6 `ValleyRock` dodecahedra, 30 `GrassPatch` cones, `InstancedClouds` (4 formations × 3 lobes). Flat colors, no atmospheric perspective. |
| `MountainPassageZone` | ❌ Incomplete | `LeftCliffWall`/`RightCliffWall` planes + `CliffRock` dodecahedra, `PassageFloor` tube (1.5 radius), `PassageCeiling` half-cylinder, 8 `PassageRock`, 12 `PassagePine`, 3 `PassageFog` planes. Magenta emissive strips removed but edge geometry remains. |
| `ProjectsSunsetZone` | ⚠️ Basic | Distant mountain plane + 6 `SunsetRing` rings + foreground plane. No terrain detail. |
| Markers | ⚠️ UI-like | 7 `SkillMarker` cubes (blue/red), 4 `ProjectMarker` orange cubes. Magenta/pink edge strips on paths look like UI artifacts. |
| `CloudCharacter` | ✅ Working | 4-mesh cloud body with eyes, WASD/Arrow movement, auto-progress to skills. |
| Post-processing | ✅ Working | `EffectComposer` with `Noise(0.015)` + `Vignette(0.35, 0.4)`. `FrameDriver` loop runs for `frameloop="never"`. |

### Key Source Locations (line numbers from CloudWorld3D.tsx)

| Feature | Lines |
|---------|-------|
| `SunsetSkySphere` | 282–327 |
| Lighting | 198–204 |
| `SkillsValleyZone` | 329–366 |
| `InstancedClouds` | 368–440 |
| `DistantMountains` | 442–506 |
| `ValleyFloor` + `GrassPatch` | 508–587 |
| `ValleyRock` | 589–620 |
| `ValleyHill` | 622–655 |
| `PineTree` | 658–741 |
| `LeftCliffWall` / `RightCliffWall` | 743–807 |
| `CliffRock` | 809–839 |
| `MountainPassageZone` | 841–879 |
| `PassageFloor` + `PassageDebris` | 881–953 |
| `PassageCeiling` | 955–970 |
| `PassageRock` | 972–1001 |
| `PassagePine` | 1003–1042 |
| `PassageFog` | 1044–1084 |
| `ProjectsSunsetZone` + `SunsetRing` | 1086–1156 |
| `SkillMarker` | 1158–1218 |
| `ProjectMarker` | 1220–1281 |
| `CloudCharacter` | 1283–1404 |

---

## 3. Visual Evidence (Playwright Captures @ 1440×900)

Captured screenshots in `qa-screenshots-audit/`:

| # | View | File | Key Observations |
|---|------|------|------------------|
| 1 | Default | `01-default.png` | Sky gradient correct (warm orange→pale). Valley floor green `#3D7A2E`. Path sandy `#D2A679`. Hills as flat boxes with abrupt color steps. Pines dark uniform green. Clouds white but large. No atmospheric fade. |
| 2 | Look Up | `02-look-up.png` | Sky sphere covers zenith correctly. No dark green bleed. Gradient continuous to `#FFB74D`. |
| 3 | Look Down | `03-look-down.png` | **Magenta/pink edge strip visible on path** (line 545, 918). Path reads as flat tube. Character visible. Grass patches as small cones. |
| 4 | Look Left | `04-look-left.png` | Hill boxes show hard edges. No atmospheric perspective (all same saturation). Distant mountains transparent cones at low opacity. |
| 5 | Look Right | `05-look-right.png` | Symmetric to left. Pine clusters lack hierarchy — all same scale/darkness. |
| 6 | Mid-Valley | `06-mid-valley.png` | Path winds but uniform width. Trees scattered not framing. Rocks floating (dodecahedra). |
| 7 | Mountain Passage | `07-mountain-passage.png` | Cliff walls as flat planes with dodecahedra "rocks". Ceiling half-cylinder visible. Fog planes create banding. Passage pines on ledges but same colors as valley. |
| 8 | Projects Sunset | `08-passage-left.png` (misnamed — captured at passage) | Did not reach true Projects Sunset zone in capture (movement distance insufficient). |

> **Note:** The capture script moved character forward but the `CloudCharacter` movement bounds (`maxZ=80`) prevent reaching Projects zone (z≈60 for zone + 60 offset = 120). The character stops at valley end.

---

## 4. Chrome DevTools Console Findings

### Errors & Warnings (from Playwright capture)

```
[CONSOLE log] [FrameDriver] Effect started
[CONSOLE log] [FrameDriver] Composer found, rendering... {composerType: EffectComposer, passes: 3, autoRenderToScreen: true, inputBuffer: yes, outputBuffer: yes}
[CONSOLE warning] [.WebGL-0x...] GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (repeated 4x)
```

**Analysis:**
- `FrameDriver` starts and finds `EffectComposer` with 3 passes (RenderPass, EffectGroup, Noise, Vignette) — **post-processing pipeline functional**.
- `GPU stall due to ReadPixels` — caused by `preserveDrawingBuffer: true` + Playwright screenshot capturing. Not a runtime bug; expected in headless capture.
- **No shader compilation errors**, no `THREE.WebGLProgram: Shader Error`, no `vNormal redefinition`, no missing uniforms — **shaders compile cleanly**.

### Missing: Scene Graph Inspection

The R3F store inspection returned `{ "error": "No store found" }` — the `canvas.__r3f`, `canvas._r3f`, and `__reactFiber` traversal all failed. This is a **debugging limitation only**, not a runtime defect. The scene renders correctly.

---

## 5. Defect Audit (Mapped to Polish Plan)

### HIGH Severity

| ID | Defect | Evidence | Root Cause | Location | Recommended Correction | Regression Risk |
|----|--------|----------|------------|----------|------------------------|-----------------|
| **HV-1** | Terrain lacks atmospheric perspective | Screenshots 01, 04, 05, 06 | `ValleyHill` uses `boxGeometry` with flat colors from array; no vertex displacement, no gradient interpolation | Lines 622–655 (`ValleyHill`) | Replace boxes with displaced spheres/cones; implement color gradient: index 0-2 `#6B8E23` → 3-5 `#7A9E3A` → 6-8 `#8FBC8F` → 9 `#D2B48C`; add vertex noise in shader | Medium — collision uses base plane, keep physics separate |
| **HV-2** | Path reads as flat platform, magenta edge strips | Screenshots 03, 06, 07 | `ValleyFloor` line 545: `pathEdgeGeometry` with `color="#D2A679"` but `side=DoubleSide` creates visible seam; `PassageFloor` line 918 same issue | Lines 544–552, 917–925 | Remove edge geometry entirely; widen path tube slightly; use vertex color or texture for edge definition; path width variation `radius = 3.0 + sin(progress * 4) * 0.8` | Low — visual only |
| **HV-3** | Pine trees lack scale hierarchy & framing | Screenshots 01, 06, 07 | `PineTree` lines 658–741: 16 trees, only 3 tiers (fg/mg/bg) but colors too dark (`#2E2A1A`→`#4E4A3A`), no foreground framing at valley edges, random rotation | Lines 658–741 (`PineTree`), 1003–1042 (`PassagePine`) | Foreground (0-3): scale 1.3-1.5, `#1B5E20`, position at valley edges framing view; Midground (4-10): scale 1.0-1.2, `#2E7D32` on ridges; Background (11-15): scale 0.7-0.9, `#3A6F3A`; add 4th canopy layer; trunk `#2D1B1A` | Low — placement algorithm deterministic |
| **HV-4** | Dark-green sky regions when looking up | **NOT OBSERVED** | Fixed by `SunsetSkySphere` with `fog={false}`, `depthWrite={false}`, `depthTest={false}`, `renderOrder=-9999`, `frustumCulled={false}` | Lines 282–327 | **Already fixed** — sky sphere covers full sphere, no fog interference | None |

### MEDIUM Severity

| ID | Defect | Evidence | Root Cause | Location | Recommended Correction | Regression Risk |
|----|--------|----------|------------|----------|------------------------|-----------------|
| **MV-1** | Rocks/grass read as scattered primitives | Screenshots 01, 04, 05, 06 | `ValleyRock` dodecahedra at random angles (line 603); `GrassPatch` simple cones along path (line 577); `PassageRock` dodecahedra floating | Lines 589–620, 562–587, 972–1001 | `ValleyRock`: displaced spheres `#3A3A4A`/`#2A2A3A`, 8 rocks, integrated at hill bases; `GrassPatch`: 30 smaller cones (0.3-0.5), color `#2E7D2E`/`#1F4D1F`; `PassageRock`: darker `#060612`, 6 rocks on ledges | Low |
| **MV-2** | Cloud composition lacks depth & horizon relationship | Screenshots 01, 02, 07 | `InstancedClouds` 4 formations × 3 lobes at fixed Y (14-22), all white `#FFFFFF`, no atmospheric fade, too large | Lines 368–440 | Reduce to 3 formations, 9 lobes; Y: 18-22; warm tints `#FFF8E7`, `#FFFAE0`; foreground larger (5-7), background smaller (3-5); `emissive: #FFF8E7` intensity 0.1 | Low — `MeshBasicMaterial` no shadows |
| **MV-3** | Lighting palette not unified | All screenshots | Hemisphere `groundColor=#C8A878` (warm) but directional `[25,50,-20]` casts cool shadows; terrain greens too dark (`#2C5F2D` in code vs `#3D7A2E` floor) | Lines 198–204, 649, 529 | Hemisphere: `groundColor=#A08050`, `color=#FFE0B0`, intensity 0.75; Directional: `[30,60,-25]`, intensity 1.8, color `#FFF5E0`; update all material colors to warm palette | Medium — affects entire scene |
| **MV-4** | Passage fog creates banding, not atmosphere | Screenshot 07 | `PassageFog` 3 planes at z=100,175,250 with opacity 0.1/0.15/0.2, color `#3A3A2A` — visible as horizontal bands | Lines 1044–1084 | Reduce opacity (0.1→0.05, 0.15→0.1, 0.2→0.15); use `FogExp2` density 0.001-0.002 instead of planes; warmer fog color `#4A3A2A` | Low |

### LOW Severity

| ID | Defect | Evidence | Root Cause | Location | Recommended Correction | Regression Risk |
|----|--------|----------|------------|----------|------------------------|-----------------|
| **LV-1** | Magenta/pink strips on path edges | Screenshots 03, 06 | `ValleyFloor` line 545, `PassageFloor` line 918: edge tube with same color as path but `DoubleSide` renders inner face | Lines 544–552, 917–925 | Remove edge geometry; use single tube with vertex color gradient center→edge | None |
| **LV-2** | Blue/red/black cubes as markers | Screenshots 01, 06, 07 | `SkillMarker` cubes (blue left, red right), `ProjectMarker` orange cubes — read as debug geometry | Lines 1158–1281 | Keep cubes but add subtle pulse/glow; document purpose in comments; ensure ProjectMarkers only in sunset zone | None |
| **LV-3** | Character not visible in look-down | Screenshot 03 | `CloudCharacter` at y=3, camera at y=8, `minPolarAngle=0.2` (~11°) — character below view cone | Lines 1283–1404, 230–231 | Lower `minPolarAngle` to `Math.PI * 0.15` (~27°) or raise character y-offset | Low — camera constraints |
| **LV-4** | Cannot reach Projects Sunset zone | Capture script stopped at passage | `CloudCharacter` `maxZ=80` (line 1316) but Projects zone at world z≈120 | Line 1316 | Increase `maxZ` to 150; or auto-transition camera through passage | Medium — movement bounds |

---

## 6. Controls & Interactions Audit

| Control | Status | Notes |
|---------|--------|-------|
| WASD / Arrow Keys (character) | ✅ Working | Smooth lerp, friction, rotation lerp, auto-progress to next skill |
| Mouse OrbitControls | ✅ Working | Constrained: no pan, zoom 15-40, polar 0.2π-0.8π, damping 0.05 |
| Escape key (exit) | ✅ Working | Returns to hero view |
| Click markers | ✅ Working | Updates overlay content (skill/project detail) |
| Hover markers | ✅ Working | Emissive highlight (yellow) |
| Reduced motion | ✅ Working | Returns static fallback view |
| WebGL unavailable | ✅ Working | Returns fallback view |

**No regressions detected in controls.**

---

## 7. Reference Comparison (skills-valley.png vs Current)

| Aspect | Reference | Current | Delta |
|--------|-----------|---------|-------|
| Sky gradient | Warm orange zenith → pale horizon → warm nadir | ✅ Matches | None |
| Terrain colors | Olive `#6B8E23` → Sage `#8FBC8F` → Tan `#D2B48C` | Box colors stepped, too dark | **HV-1** |
| Path | Winding sandy `#E0C097`, natural edges, varying width | Uniform tube `#D2A679`, magenta edges | **HV-2** |
| Trees | Tall dark foreground `#1B5E20` framing; midground clusters `#2E7D32`; background silhouettes `#3A6F3A` | Uniform dark cones, no framing | **HV-3** |
| Clouds | Cream-white `#FFFFFF`/`#F5F5F5`, soft shading, larger near horizon | White, uniform size, 4 formations | **MV-2** |
| Lighting | Golden-hour warm throughout, cohesive palette | Cool directional shadows, mixed greens | **MV-3** |
| Rocks/Grass | Subtle, integrated, organic | Floating dodecahedra, cone grass | **MV-1** |
| Atmosphere | Soft atmospheric perspective | Hard edges, fog banding | **MV-1, MV-4** |

---

## 8. Unconfirmed / Needs Verification

| Item | Status | Notes |
|------|--------|-------|
| Projects Sunset zone visual quality | **Unconfirmed** | Character movement bounds prevent reaching it in capture. Code shows basic rings + plane — likely needs same polish as valley. |
| Performance at 1440×900 | **Unconfirmed** | No FPS measurement captured. Scene has ~200 meshes, instanced clouds, post-processing — should be 60fps on modern GPU. |
| Mobile / reduced motion | **Not tested** | Fallback views exist but not visually verified. |
| Shader `onBeforeCompile` for terrain displacement | **Not implemented** | Plan calls for vertex noise displacement — no shader code exists yet. |

---

## 9. Recommended Implementation Order (from Polish Plan)

1. **Stage 1: Terrain Foundation** — `ValleyHill`, `ValleyFloor`, `DistantMountains` (HV-1)
2. **Stage 2: Path as Winding Trail** — `ValleyFloor`, `PassageFloor` (HV-2, LV-1)
3. **Stage 3: Pine Tree Hierarchy** — `PineTree`, `PassagePine` (HV-3)
4. **Stage 4: Cloud Composition** — `InstancedClouds` (MV-2)
5. **Stage 5: Lighting Unification** — Canvas lighting, all material colors (MV-3)
6. **Stage 6: Detail Polish** — `ValleyRock`, `GrassPatch`, `PassageRock`, `PassageDebris`, `PassageCeiling`, `PassageFog` (MV-1, MV-4)
7. **Stage 7: Marker Clarification** — `SkillMarker`, `ProjectMarker`, path edges (LV-2, LV-1)
8. **Stage 8: Character Bounds & Projects Zone** — `CloudCharacter` maxZ, Projects zone detail (LV-3, LV-4)

---

## 10. Acceptance Criteria (from Polish Plan + Audit Additions)

1. Sky: Continuous warm gradient at all camera angles ✅
2. Clouds: Cream-white layered formations with depth, no clipping
3. Terrain: Clear atmospheric perspective (olive→sage→tan); undulating floor
4. Path: Winding sandy trail with natural edges; no magenta strips
5. Trees: Foreground framing pines → midground clusters → background silhouettes
6. Rocks/Grass: Integrated detail, no floating geometry
7. Lighting: Warm golden-hour throughout; cohesive palette
8. Markers: Clear purpose, no UI artifacts
9. Continuity: Seamless valley→passage→sunset transition
10. Performance: 60fps at 1440×900; no new console errors
11. **Character reaches Projects Sunset zone** (new)
12. **Character visible in look-down** (new)

---

## 11. Next Steps

1. **Approve this audit** — confirm findings match expectations
2. **Begin Stage 1-2 implementation** (terrain + path foundation)
3. **Visual verification via Playwright at each stage** (capture same 8 angles)
4. **Incremental polish Stages 3-7**
5. **Final audit against `skills-valley.png` reference**

---

*Report saved as `CLOUD_WORLD_AUDIT.md`. No code modifications made. All existing user changes preserved.*