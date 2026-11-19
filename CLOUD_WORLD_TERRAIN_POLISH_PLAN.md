# Cloud World — Terrain & Composition Polish Plan

**Status:** Implemented 2026-10-13 — full 3D rewrite per this plan (see `src/cloud-world-3d/` modular files); verified via Playwright + headed browser + pixel checks + production build (results in `qa-screenshots-v2/qa-results.json` and `journey.json`)
**Audit Date:** 2026-10-11
**Branch:** main (no commits made)

---

## Executive Summary

The sky gradient and cloud scale fixes are working well across all camera angles. However, Skills Valley and Mountain Passage still read as "unfinished collections of basic geometric shapes" rather than a cohesive sunset world matching the `skills-valley.png` reference. The current implementation uses flat colored primitives (cubes, cones, planes) with no textures, inconsistent lighting, and scattered object placement that lacks the intentional composition of the reference.

---

## Ranked Visual Problems (by Impact)

### 1. **Terrain lacks atmospheric perspective & cohesive layering** (HIGH)
**Evidence:** Screenshots 01-default, 04-look-left, 06-mid-valley
- **Current:** Flat colored planes/boxes (`#2D6B23`, `#D2B48C`, `#8FBC8F`) with no gradient transitions
- **Reference:** Rolling hills with clear atmospheric perspective: foreground olive `#6B8E23` → midground sage `#8FBC8F` → background tan `#D7CCC8`
- **Source:** `ValleyHill` (lines 634-667), `ValleyFloor` (lines 520-572)

### 2. **Path reads as flat platform, not winding trail** (HIGH)
**Evidence:** Screenshots 03-look-down, 06-mid-valley, 07-mountain-passage
- **Current:** Single `TubeGeometry` with uniform width (3.5) and flat color `#D2A679`; magenta/pink strips appear as UI artifacts
- **Reference:** Winding sandy path `#E0C097` with natural edges, gentle curves, varying width
- **Source:** `ValleyFloor` (lines 520-572), `PassageFloor` (lines 855-908)

### 3. **Pine trees lack scale, depth, and intentional placement** (HIGH)
**Evidence:** Screenshots 01-default, 06-mid-valley, 07-mountain-passage
- **Current:** 16 deterministic cones at fixed radius (40±25) with 3-layer dark greens `#1A3D2E`/`#15281A`/`#0D1A0F`; random rotation; no foreground framing
- **Reference:** Tall dark foreground pines `#1B5E20` framing view; midground clusters `#2E7D32` on hills; clear silhouette hierarchy
- **Source:** `PineTree` (lines 670-715), `PassagePine` (lines 978-1016)

### 4. **Rocks/grass read as scattered primitives, not integrated detail** (MEDIUM)
**Evidence:** Screenshots 01-default, 04-look-left, 05-look-right
- **Current:** `ValleyRock` (6 dodecahedra `#2A2A3A` at radius 55±25), `GrassPatch` (20 simple cones `#2A6A1A` along path); `ValleyRock`/`PassageRock` dodecahedra at random angles
- **Reference:** Subtle scattered rocks along path edges; organic grass patches; no floating geometry
- **Source:** `ValleyRock` (lines 589-620), `GrassPatch` (lines 562-598), `PassageRock` (lines 947-976)

### 5. **Cloud composition lacks depth & horizon relationship** (MEDIUM)
**Evidence:** Screenshots 01-default, 02-look-up, 07-mountain-passage
- **Current:** 4 formations × 3 lobes at fixed Y (14-22) with `MeshBasicMaterial` white; too large, no atmospheric fade
- **Reference:** Fluffy cream-white clouds `#FFFFFF`/`#F5F5F5` with soft shading; larger near horizon, smaller overhead; subtle warm tint
- **Source:** `InstancedClouds` (lines 381-452)

### 6. **Lighting & color palette doesn't unify the scene** (MEDIUM)
**Evidence:** All screenshots
- **Current:** Hemisphere `groundColor=#C8A878` (warm) but directional `[25,50,-20]` casts cool shadows; terrain greens too dark (`#2C5F2D`)
- **Reference:** Warm golden-hour throughout; sage/olive greens lit by warm sun; cohesive palette
- **Source:** Canvas lighting (lines 198-204), `ValleyHill` colors, `PineTree` colors

### 7. **Magenta/pink strips & colored cubes need clarification** (LOW)
**Evidence:** Screenshots 01-default, 03-look-down, 04-look-left, 05-look-right
- **Current:** Magenta `TubeGeometry` edge on path (looks like UI); blue/red/black cubes scattered as markers
- **Source:** `ValleyFloor` edge geometry (line 545), `PassageFloor` edge (line 892), `SkillMarker` (lines 1131-1191), `PROJECT_DATA` markers (lines 1193-1254)

### 8. **Character missing from third-person view** (LOW)
**Evidence:** Screenshot 03-look-down
- **Current:** `CloudCharacter` exists but not visible in look-down
- **Source:** `CloudCharacter` (lines 1256-1377)

---

## Staged Implementation Order

### Stage 1: Terrain Foundation & Atmospheric Perspective
**Files:** `ValleyHill`, `ValleyFloor`, `DistantMountains`
**Changes:**
- Replace `ValleyHill` box geometry with displaced sphere/cone meshes using vertex noise
- Implement hill color gradient: `index 0-2: #6B8E23` (olive) → `3-5: #7A9E3A` → `6-8: #8FBC8F` (sage) → `9: #D2B48C` (tan)
- Add vertex displacement in shader for organic silhouette
- `ValleyFloor`: Replace flat plane with subdivided mesh + vertex noise; warmer base color `#3D7A2E`
- `DistantMountains`: Layered cones with atmospheric opacity gradient (far=0.4, mid=0.6, near=0.8)

**Acceptance:** Hills show clear foreground→background color progression; floor has subtle undulation

---

### Stage 2: Path as Winding Trail
**Files:** `ValleyFloor`, `PassageFloor`
**Changes:**
- Increase `TubeGeometry` segments (200→300) for smoother curves
- Add subtle width variation: `radius = 3.0 + sin(progress * 4) * 0.8`
- Path edges: Taper from center (3.5) to edges (4.0) with darker sand `#B8956B`
- Remove magenta `TubeGeometry` edge; replace with subtle darker sand strip
- `PassageFloor`: Narrower (1.2→1.5), darker `#1A1A2A`; orange emissive edges reduced intensity 0.4→0.25

**Acceptance:** Path winds naturally; edges defined by color not magenta; passage feels like canyon

---

### Stage 3: Pine Tree Hierarchy & Placement
**Files:** `PineTree`, `PassagePine`
**Changes:**
- **Foreground (index 0-3):** Scale 1.3-1.5, dark `#1B5E20`, position at valley edges framing view
- **Midground (index 4-10):** Scale 1.0-1.2, `#2E7D32`, on hill ridges
- **Background (index 11-15):** Scale 0.7-0.9, `#3A6F3A`, on distant hills
- Add 4th canopy layer for fuller silhouette; trunk `#2D1B1A`
- `PassagePine`: Darker `#0A1A0A`/`#0E220E`/`#122A12`; position on cliff ledges not floating

**Acceptance:** Tall dark pines frame foreground view; clear size hierarchy; passage pines on ledges

---

### Stage 4: Cloud Composition & Atmosphere
**Files:** `InstancedClouds`
**Changes:**
- Reduce formations to 3 (was 4); total lobes 9 (was 12)
- Y positions: 18-22 (was 14-22) — lower to avoid clipping
- Add subtle warm tint: formation 1 `#FFF8E7`, 2 `#FFF8E7`, 3 `#FFFAE0`
- Vary lobe scales per formation: foreground larger (5-7), background smaller (3-5)
- Add subtle `emissive: #FFF8E7` intensity 0.1 for glow against sky

**Acceptance:** Clouds feel layered with depth; warm cream tint; no clipping at top of screen

---

### Stage 5: Lighting Unification & Color Polish
**Files:** Canvas lighting, `ValleyHill`, `PineTree`, `ValleyFloor`
**Changes:**
- Hemisphere: `groundColor=#A08050` (warmer sand), `color=#FFE0B0`, intensity 0.75
- Directional: position `[30, 60, -25]` (more overhead), intensity 1.8, warmer color `#FFF5E0`
- `ValleyHill` colors: exact reference palette (see Stage 1)
- `PineTree`: exact reference palette (see Stage 3)
- `ValleyFloor`: base `#3D7A2E` with subtle vertex color variation

**Acceptance:** Single cohesive warm palette; shadows warm not cool; greens readable

---

### Stage 6: Detail Polish & Cleanup
**Files:** `ValleyRock`, `GrassPatch`, `PassageRock`, `PassageDebris`, `PassageCeiling`, `PassageFog`
**Changes:**
- `ValleyRock`: Replace dodecahedra with displaced spheres `#3A3A4A`/`#2A2A3A`; 8 rocks (was 6)
- `GrassPatch`: Smaller cones (0.3-0.5), color `#2E7D2E`/`#1F4D1F`; 30 patches (was 20)
- `PassageRock`: Darker `#060612`/`#040408`; 6 rocks (was 8)
- `PassageDebris`: Remove or make subtle `#1A1A2A` scale 0.3
- `PassageCeiling`: Darker `#0A0A1A`, larger radius 70
- `PassageFog`: Reduce opacity 0.15→0.1, 0.25→0.15, 0.35→0.2

**Acceptance:** Rocks feel integrated; grass subtle; passage atmospheric not foggy

---

### Stage 7: Marker/Navigation Clarification
**Files:** `SkillMarker`, `ProjectMarker`, `ValleyFloor`, `PassageFloor`
**Changes:**
- Path edges: Remove magenta `TubeGeometry`; use subtle sand color transition
- `SkillMarker`: Keep cubes but ensure they're clearly markers (add subtle pulse/glow)
- `ProjectMarker`: Orange cubes at Projects Sunset only; not in valley
- Document each object's purpose in code comments

**Acceptance:** No UI-like magenta strips; markers clearly distinct from terrain

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vertex displacement breaks collision/pathfinding | Medium | High | Keep `ValleyFloor` base plane for physics; displacement visual only |
| Tree placement blocks path | Low | High | Add path clearance check in placement algorithm |
| Cloud `MeshBasicMaterial` doesn't receive shadows | Low | Medium | Keep unlit for glow; accept no shadows on clouds |
| Performance with displaced terrain | Low | Low | Limit displacement to vertex shader; 40×40 grid max |
| Path width variation affects movement bounds | Low | Medium | Clamp character X to path center ±2.5 |

---

## Acceptance Criteria (Final)

1. **Sky:** Continuous warm gradient at all camera angles ✅ (already fixed)
2. **Clouds:** Cream-white layered formations with depth, no clipping
3. **Terrain:** Clear atmospheric perspective (olive→sage→tan); undulating floor
4. **Path:** Winding sandy trail with natural edges; no magenta strips
5. **Trees:** Foreground framing pines → midground clusters → background silhouettes
6. **Rocks/Grass:** Integrated detail, no floating geometry
7. **Lighting:** Warm golden-hour throughout; cohesive palette
8. **Markers:** Clear purpose, no UI artifacts
9. **Continuity:** Seamless valley→passage transition
10. **Performance:** 60fps at 1440×900; no new console errors

---

## Next Steps

1. **Review & Approve** this plan
2. **Stage 1-2** implementation (terrain + path foundation)
3. **Visual verification** via Playwright at each stage
4. **Stages 3-7** incremental polish
5. **Final audit** against `skills-valley.png` reference

---

*Plan saved as `CLOUD_WORLD_TERRAIN_POLISH_PLAN.md`. Awaiting approval before implementation.*