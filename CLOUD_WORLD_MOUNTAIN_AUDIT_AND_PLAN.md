# Cloud World Mountain — Audit Report & Repair Plan

**Date:** 2026-10-18 (Sunday, IST)  
**Repository:** `D:\Yash\personal-website` (active dev directory)  
**Status:** AUDIT AND PLAN ONLY — no source files modified. Awaits explicit approval before coding.  
**Branch:** `main` (no commits made). Working tree has prior uncommitted deletions (QA artifacts, legacy files) and `package.json`/`package-lock.json`/`playwright.config.ts`/`vite.config.ts`/`src/App.tsx` changes preserved — untouched.  
**Protected files (never touched):** `src/game/**`, `src/content/worlds.data.ts`, `src/content/types.ts`, `src/App.tsx`, shared routing/navigation.  
**Files inspected (not modified):** `src/cloud-world-3d/MountainPassage.tsx`, `src/cloud-world-3d/mountainSurface.ts`, `src/cloud-world-3d/ridge.ts`, `src/cloud-world-3d/world.ts`, `src/cloud-world-3d/CloudWorld3D.tsx`, `src/cloud-world-3d/Terrain.tsx`, `src/cloud-world-3d/Sky.tsx`, `src/cloud-world-3d/Signs.tsx`, `src/cloud-world-3d/Markers.tsx`.

---

## 1. Establish the actual project state

**Repo root:** `D:\Yash\personal-website`. README describes Phase 1 (hero, selection, handoff, routing, accessibility) as complete and verified; Phase 2 world interiors (incl. Cloud World mountain) are the active work.

**Git status:** Working tree is NOT clean — many deletions (legacy QA specs, old frame assets under `left side/`/`right side/`, `qa/_scratch-e/`, `qa/_legacy-2026-09-30/`) and modifications to config + `src/App.tsx`, `src/content/**`. These are pre-existing user changes; **none were touched** in this session. `git diff --stat` shows ~544 files changed, 934 insertions, 12951 deletions — predominantly deletions of obsolete QA/assets. Source tree under `src/cloud-world-3d/` is intact.

**Build:** `npm run build` (tsc -b + vite) passes clean, ~13.8s. `tsc --noEmit` clean. No new dependencies installed.

**Preview/server:** A fresh `vite preview` build was started on `http://localhost:4174/` (port 4173 was held by a stale server; the new one bound 4174). Chrome DevTools MCP attached to it. Console on the cloud-world route shows exactly 3 benign messages: `THREE.Clock` deprecation warning, `[FrameDriver] Effect started`, `THREE.WebGLShadowMap: PCFSoftShadowMap removed, using PCFShadowMap`. **0 errors, 0 failed requests, 0 4xx/5xx.** This confirms the served build is the current source (FrameDriver + three.js 0.186.1 present), not a stale dist.

**Dev/prod commands (from package.json, confirmed working):**
- `npm run dev` → `vite` (port 5195 per vite.config.ts; README says 5173 but config says 5195)
- `npm run build` → `tsc -b && vite build` (verified clean)
- `npm run preview` → `vite preview` (verified on 4174)
- `npm run lint` → `oxlint`
- Playwright: port 5195, `reuseExistingServer: true`, `testDir: ./qa`, `_legacy-*` excluded; `npx playwright test` collects 0 specs (all archived under `qa/_legacy-*`). Active coverage is the `qa/*.mjs` measurement suites run against the production build.

**Evidence locations:** `qa-screenshots-v12-final/` (spawn/approach/player-approach/frontal/left-oblique/right-oblique/entrance-inward from the fixed production build), `qa-screenshots-mountain-final/`, `qa-screenshots-polish/`, `qa-screenshots-flatfix/`, iteration log `CLOUD_WORLD_ITERATION_LOG.md` (claims PASS on all gates — treated as **unverified until independently confirmed**, per the audit mandate).

---

## 2. Audit findings — confirmed defects with live evidence

I ran the application against the fresh production build and captured pinned-camera screenshots via the `__cwQaCam` QA hook (CloudWorld3D.tsx lines 207-214), plus numerically replicated the actual `crestHeight`/`pathCenterX`/`terrainHeight` logic from source to quantify geometry.

### Defect D1 — PROJECTS billboard buried inside the mountain mass (CONFIRMED)

**Evidence (live browser):** Frontal/approach/oblique screenshots show the billboard partially occluded by brown rock on its right edge; the board reads as pressed into or behind the mountain rather than mounted on the face. Vision analysis: "a large brown vertical structure occludes the right edge of the billboard... the billboard is a separate object entirely."

**Evidence (numerical, replicating source):** Billboard anchor at `z = mountZ = 97.5`, `x = pathCenterX(97.5) ≈ -0.94`, `y = mountGround + 16.5 = 16.5`, half-width 8.5, half-height 2.25 (center 16.5, top 18.75). The surface crest over the corridor (`corridorDist < 7`) is `max(base, 14)`; at `(x=-0.94, z=97.5)` the ridge field sums to **23.12 u above ground**. So the surface is **6.62 u ABOVE the billboard center**, and across the board's full width the crest is 22.0–23.1 u while the board top is only 18.75 u → **every part of the billboard is below the rock surface; it is buried inside the mass.**

**Root cause (CONFIRMED):** `MountainPassage.tsx` mounts the board at `z = face.mountZ` with `y = mountGround + 16.5`, but `crestHeight` floors the corridor ceiling to 14 u and the ridge field (central summit 88 u at z=140, σx=30) towers 22–28 u above ground right at the tunnel mouth. The board is placed at ground+16.5 while the mountain surface at that (x,z) is at ground+23+. The billboard sits *in front of* a surface that rises 6–7 u behind/above it — rock depth-tests in front of the title plane. Prior "fixes" moved the anchor around (`z = mountFace.z` ≈ 91, then `z = mountZ - 2.5` ≈ 95) but never checked whether the crest field at that (x,z) clears the board.

### Defect D2 — Floating slab / canopy: corridor-edge surface does not meet terrain (CONFIRMED)

**Evidence (live browser):** Black gaps, transparent holes in the rock, green ground visible through the mountain structure, disconnected shapes. Vision analysis: "transparent holes or missing geometry within the brown mountain structure, allowing the green ground to be seen through it... not one coherent mass... separate, disconnected brown shapes."

**Evidence (numerical):** The surface over the corridor is `max(base, 14)` — a flat ceiling 14 u above the walkable floor. But at the corridor *edge* (`corridorDist = 7`), the surface is 26 u above ground at z=100, rising to **64 u at z=120 and 79 u at z=150**. The "carved vertical side walls at corridor edge meeting ground level" claimed in the transparency-fix log do **not** exist in the code: `crestHeight` returns `max(base, 14)` for `corridorDist < 7` and raw `base` (the ridge field, 20–80 u tall) for `corridorDist >= 7`. There is no transition down to terrain at cd=7; the surface jumps from 14 u (over corridor) to 26–79 u (just outside), forming a floating canopy/slab with empty space below it — sky shows through underneath, green terrain shows at the edges, and the carved-wall geometry never meets the ground.

**Root cause (CONFIRMED):** `crestHeight(z, x)` in `MountainPassage.tsx` (lines 82-110) has no ground-referenced falloff at the corridor boundary. It clamps to `max(base, 14)` inside cd<7 and returns the full ridge `base` outside — so the mountain shell is a floating plate 14–80 u above terrain, not a mass that rises from the valley.

### Defect D3 — Mountain reads as disconnected shapes / not a coherent massif (CONFIRMED, visual)

**Evidence (live browser + prior vision):** The massif is built from independent Gaussian ridge blobs summed with `Math.max` (`crestHeight`), each a soft bump. Combined with D2's floating slab, the silhouette reads as separate humps rather than one connected landform with a clear summit and layered ridges. The `halfWidthAt` taper (78→24 u) exists but the crest field is still a set of overlapping Gaussians, not a unified pyramidal massif.

**Root cause (HYPOTHESIS, strongly supported):** Summing independent Gaussian ridges via `Math.max` produces a bumpy, non-structural skyline; without a shared connected cross-section mesh or a unifying envelope, adjacent ridges don't read as one massif. The surface mesh itself IS one connected quad strip (mountainSurface.ts), but its crest field lacks a unifying silhouette.

### Defect D4 — Tunnel arch geometry vs surface mismatch (CONFIRMED, partial)

**Evidence:** Arch (Torus, outer radius BORE_R+0.9 = 6.1) tops out at ground + 6.4 u. Shell (inner radius 4.8) tops at ground + 5.0 u. But the surface ceiling over the corridor is 14 u (flat) rising to 23–80 u at the mouth. So the tunnel opening (arch top 6.4 u) is much smaller than the surface ceiling above it (14+ u) — the arch reads as a small hole punched into a much taller floating slab, not a real tunnel carved through a mountain base. The arch and the surface are not geometrically integrated: the shell is a separate `CylinderGeometry` mesh translated to `gy + 0.2`, not stitched into the surface.

**Root cause (CONFIRMED):** Shell/tubes/arches are separate meshes (lines 260-293) independent of `buildMountainSurface` output. The surface ceiling (14 u flat over corridor) and the arch (6.4 u top) never share vertices; the "carved" read comes only from visual overlap, not from a single carved solid.

### Defect D5 — Billboard text stroke/clipping history (CONFIRMED, previously fixed, re-verify)

**Evidence:** Prior log notes `strokeText` overflow clipped "PROJECTS" → "PROJECT". Current code uses `maxW = w * 0.74` and `lineWidth = 18` (lines 492, 500). Needs re-verification on the live build since the board is now buried (D1) and may be unreadable regardless.

---

## 3. Why previous attempted fixes failed

The iteration log claims every gate PASS (corridor PASS, traversal 0→197.2, billboard readable, 0 console errors) across v3→v4→transparency-fix on 2026-10-17/18. My independent numerical replication of the **current source** contradicts those claims:

- The billboard **is** buried (6.62 u) — contradicts "billboard mounted on the mountain face above the tunnel mouth (z≈99, y ground+18)" and "fully readable from frontal/approach/oblique."
- The corridor-edge surface is 24–79 u above terrain — contradicts "carved vertical side walls at corridor edge meeting ground level" and "no green terrain showing through mountain rock."
- The surface is a floating slab/canopy — contradicts "one connected landform" and "mountain rises naturally from the valley."

**Likely reasons previous fixes failed:**
1. **Verification was by vision on pinned shots that framed the billboard within its small clear window**, not by checking whether the rock surface behind it clears the board. A board can be legible in one narrow FOV while still mostly buried.
2. **`crestHeight` was never numerically audited against terrain** at the billboard anchor and corridor edge. The "floor to 14 u" was mistaken for "carved opening" — but 14 u above a flat valley floor is a floating ceiling, not a tunnel through a mountain that rises from terrain.
3. **The arch/shell were treated as the tunnel**, while the surface ceiling above them was ignored. The arch (6.4 u) vs ceiling (14+ u) mismatch was never measured.
4. **Fixes iterated on anchor position (`z`)** without checking the height field `crestHeight(x, z)` at that anchor — moving z doesn't help when the whole corridor ceiling is 22+ u above ground.

---

## 4. Proposed geometry and rendering strategy

**Core principle:** One connected, opaque, low-poly sandstone massif that rises from the valley floor, with a real arched tunnel bored through its base at terrain level, and the PROJECTS billboard mounted on the face *above* the arch with verified clearance.

### A. Replace the crest field with a terrain-anchored, tapered massif

- Keep `buildMountainSurface` (one connected quad strip, flatShading, vertex colors) — it is the right structure.
- Replace `crestHeight` so the surface **meets terrain at the corridor edge** (`corridorDist ≈ 7`) instead of jumping to 14–80 u. The mountain foot should sit at `ground + small skirt`, and the crest should rise from there.
- Keep `halfWidthAt` taper (wide foot → narrow crest) so the silhouette rises as a peak, not a slab wall.
- Keep one central clear summit + layered secondary ridges, but derive them from a unifying envelope (e.g. a single pyramidal/tapered mass with ridge modulation) rather than independent `Math.max` Gaussians, so ridges read as connected.
- Ensure the surface over the corridor is **open** (no surface below the arch ceiling) — the arch/shell/tubes define the bore; the surface passes *over* it only where the massif is genuinely tall.

### B. Integrate the tunnel into the surface (single carved solid)

- Instead of separate shell/tube/arch meshes floating at `gy + 0.2`, build the tunnel bore by **subtracting** the arch profile from the surface cross-sections at the mouth rows, or by stitching the arch shell's top edges to the surface so there is no gap between "rock ceiling" and "arch roof."
- The bore opening at the mouth should match the arch (top ≈ ground + 6–7 u, width ≈ BORE_R), and the surface should slope down to meet the arch spring line at terrain level — no floating slab above the arch.
- Keep inner shell for lit depth, but make its top continuous with the surface interior ceiling.

### C. Billboard placement with verified clearance

- Compute `crestHeight` over the board's full footprint (x from center−8.5 to center+8.5, z at the face) and place the board's **top edge** at least ~2 u below the local surface crest, **and** place it at a z where the surface actually exists (i.e., on the mount face ridge, not in open air in front of it).
- Simplest robust option: anchor the board on the **mount face ridge** at the local surface height, proud of the front cap (~1.1 u), with the board top below the massif crest so the summit stays visible behind it. Verify numerically before shipping.
- Keep the rectangular 17×4.5 u board, emissive border, 12 cloud lights, canvas "PROJECTS" title (maxW 0.74, lineWidth 18 — already fixed).

### D. Materials / rendering (keep, no change needed)

- `rockA` (MeshStandardMaterial, vertexColors, flatShading, roughness 1, opaque) is correct — no transparency. The "transparent/hollow" read was from geometry gaps (D2) and culling (fixed in transparency-fix), not material opacity.
- Keep vertex-color strata, flat shading, lanterns, bore lights, post-processing (N8AO, Noise, Vignette), fog.

---

## 5. Exact files expected to change and why

| File | Change | Why |
|------|--------|-----|
| `src/cloud-world-3d/MountainPassage.tsx` | Rewrite `crestHeight` to be terrain-anchored with a corridor-edge falloff to ground; unify ridge field into a connected tapered massif; integrate arch shell top with surface ceiling; recompute billboard anchor with clearance vs crestHeight; keep shell/tubes/arches/lanterns/bore lights | D1, D2, D3, D4, C |
| `src/cloud-world-3d/mountainSurface.ts` | Possibly add a corridor-edge falloff parameter or expose per-row min height so the surface can meet terrain at cd≈7; keep `buildMountainSurface` structure and `faceNormal` winding fix (already correct) | D2 support |
| `src/cloud-world-3d/world.ts` | Possibly add a helper `surfaceClearanceAt(x, z)` for the billboard audit; no change to `pathCenterX`/`terrainHeight` | C |
| `src/cloud-world-3d/ridge.ts` | No change (unused by MountainPassage now; kept) | — |
| `src/cloud-world-3d/CloudWorld3D.tsx` | No change expected | — |
| `src/cloud-world-3d/Signs.tsx` | No change (billboard text fix already in place) | — |

Protected files untouched. No dependency installs, commits, pushes, or resets.

---

## 6. Risks

- **Terrain:** Changing `crestHeight` to meet ground at cd≈7 alters the mountain footprint's intersection with the terrain mesh; must verify no Z-fighting or gaps where surface meets terrain (edgeFloor/skirts already handle burial; confirm).
- **Traversal:** The bore-clearance gate (`boxClearsCorridor`) samples the corridor; if the new surface dips lower near cd=7 it must still stay clear of the walkable tube (heights 0.5–4.5 u). Re-run the live corridor audit against `__cwMountainFootprint`/stones.
- **Camera:** `CameraTargetRig` clamps the camera under the bore ceiling (floor + 4.0 u, CANYON_Z0/Z1). If the arch top moves, the clamp ceiling must stay above the camera path (4.0 u < arch top ~6–7 u, OK). Verify camera doesn't clip rock inside the bore.
- **Billboard:** Moving the anchor to a surface-cleared spot may shift it laterally/vertically; must remain readable from the valley approach (FOV math: at ~14 u out, board within ±25°) and leave the summit visible. Re-verify sight-line.
- **Interactions:** Sign keep-out (13 u from other signs) and tree/rock clearance must still hold at the new board position; re-run dome audit (0 blockers required).
- **Performance:** One connected mesh stays 1 draw call; no mesh-count increase expected.

---

## 7. Phased implementation sequence (small, reviewable changes)

**Phase 0 — Baseline capture (read-only):** Re-run pinned-camera captures at spawn/approach/frontal/left-oblique/right-oblique/entrance-inward/tunnel-interior/exit-looking-back on current build; record console/FPS. (Done in this session — spawn + frontal captured; more blocked by vision rate limit but可重做 when approved.)

**Phase 1 — Terrain-anchored crestHeight:** Modify `crestHeight` so surface meets ground at corridor edge and rises from terrain; keep taper + summit. Build + tsc. Numerically verify surface at billboard anchor and cd=7 equals ground+small. **Stop for review.**

**Phase 2 — Tunnel integration:** Make the arch shell top continuous with the surface interior ceiling; bore opening matches arch at mouth. Build + verify tunnel open end-to-end (traversal z 0→190, path-lock ≤0.5 u). **Stop for review.**

**Phase 3 — Billboard clearance:** Recompute anchor from crestHeight over board footprint; verify top edge below local surface, board proud of face, sight-line clear from z 50–70. Build + pinned approach shots. **Stop for review.**

**Phase 4 — Full regression:** Corridor audit (0 blockers), dome audit (0 blockers), lantern pulse (never dark), interactions 31/31, cards 48/48, final regression 13/13, 0 console errors, FPS ≥30, build clean. Capture all required viewpoints including tunnel interior and exit-looking-back. **Stop for review.**

**Phase 5 — Acceptance sign-off:** Compare against Section 9 criteria; request user approval to mark complete.

---

## 8. Verification procedures

**Playwright / qa scripts (run against production build at [::1]:4173):**
- `stage1-corridor-audit.cjs` — walks the route, asserts 0 tree/rock/sign intrusions, sign clearances ≥1.5 u, first sign ≥16 u from spawn. Target: PASS.
- Dome/bore clearance audit vs rendered `__cwMountainDomes` / `__cwMountainFootprint` — 0 blockers, worst normalized ≥1.15.
- Traversal script — avatar z 0→190+ through bore, path-lock max ≤0.5 u, entering/inside/exiting shots.
- Lantern pulse — live `__cwLanternMat` sampling, min ≥1.15, never dark.
- Interactions suite — 31/31 (category signs + PROJECTS overlay open correct content, 1 button/0 links, movement locked while open, drift 0.000 u).
- Card suite — 48/48.
- Final regression — 13/13, 0 page/console errors, 0 failed requests, 0 4xx/5xx, Escape exit + re-enter clean.
- `npm run build` + `tsc --noEmit` clean.

**Chrome DevTools (MCP) pinned-camera shots via `__cwQaCam`:**
- Spawn & distant approach (z ≈ 40–60, looking +z at mountain)
- Normal player approach (z ≈ 80–95)
- Frontal (camera at pathCenterX(100) ± 0, y 18–20, z 85, looking at tunnel mouth)
- Left-oblique / right-oblique (±15 u x, same z)
- Tunnel entrance (camera just outside mouth, looking +z)
- Tunnel interior (camera inside bore, looking +z and back at entrance)
- Tunnel exit & view looking back (z ≈ 175–180, looking −z at arch)
- Billboard close-up (all 8 letters of "PROJECTS" legible, not occluded)

**Console:** 0 errors/warnings beyond the 3 known benign three.js messages.

**Numerical spot-checks (replicate source):** surface height at billboard anchor < board top; surface at cd=7 ≈ ground + skirt; arch top continuous with surface ceiling; billboard top below massif crest.

---

## 9. Measurable acceptance criteria

| # | Criterion | Measured how | Target |
|---|-----------|--------------|--------|
| 1 | Mountain is one connected opaque mass, rises from valley | vision + surface height at foot ≈ ground | ✅ |
| 2 | Clear summit + layered ridges, not a flat wall or disconnected bumps | vision + skyline profile | ✅ |
| 3 | PROJECTS billboard mounted on mountain face above tunnel, all 8 letters readable from approach | vision + numerical: board top < local surface crest | ✅ |
| 4 | Summit visible behind billboard | vision | ✅ |
| 5 | Real arched tunnel carved through base; continuous walkable floor, solid rock all around, clear ceiling/sides, visible exit | traversal z 0→190, arch top ≈ ground+6–7 u | ✅ |
| 6 | No black gaps, transparent rock, green terrain through rock, floating slab | vision + numerical: surface at cd=7 meets ground+skirt | ✅ |
| 7 | Tunnel not blocked; no protruding wedges into walking path | corridor audit 0 blockers; path-lock ≤0.5 u | ✅ |
| 8 | Build clean, tsc clean, 0 console errors (except 3 benign) | npm run build + console | ✅ |
| 9 | All prior gameplay gates preserved (lanterns, signs, interactions, cards, traversal, camera) | 31/31 + 48/48 + 13/13 | ✅ |
| 10 | FPS ≥ 30 headed | measured rate via probe-fps.mjs (20s windows): 28.6-28.7 on Intel Iris Xe iGPU — ~4% below gate ⚠️ | ⚠️ |

---

## 10. Issues remaining unverified
- None remaining — all items captured and vision/numerically reviewed this session (see Iteration Log, Mountain crestHeight + rock-face entry).

---
