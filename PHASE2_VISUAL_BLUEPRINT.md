# Cloud World — Phase 2 Visual Blueprint

**Source of truth**: Inspected `src/cloud-world-3d/CloudWorld3D.tsx`, `public/assets/skills-valley.png`, `public/assets/projects-sunset.png`, `public/assets/Flying_through_valley_and_mountain_20261006115423.mp4`, `src/content/worlds.data.ts`, `src/content/projects.data.ts`, `src/content/skills.data.ts`, current 1440×900 screenshots.

---

## 1. Coordinate System & Zone Architecture (Verified)

| Zone | Current Position | Target Position | Character Access |
|------|------------------|-----------------|------------------|
| **Skills Valley** | `[0, 0, 0]` | `[0, 0, 0]` (anchor) | z: -100 → 100 |
| **Mountain Passage** | `[0, 0, -30]` ❌ behind valley | `[0, 0, 100]` → `[0, 0, 250]` | z: 100 → 250 |
| **Projects Sunset** | `[0, 0, 60]` ❌ inside valley | `[0, 0, 250]` → `[0, 0, 400]` | z: 250 → 400 |

**Character bounds (current)**: `maxX: 25`, `minZ: -25`, `maxZ: 80`  
**Character bounds (required)**: `maxX: 25` (valley) → `maxX: 2` (passage) → `maxX: 15` (sunset), `minZ: -100`, `maxZ: 400`

**Camera**: Position `[0, 8, 25]`, FOV 50, OrbitControls constrained (minDist 15, maxDist 40, polar 0.2π–0.8π)

---

## 2. Skills Valley — Visual Target (from `skills-valley.png`)

| Element | Specification |
|---------|---------------|
| **Sky** | Warm sunset gradient: top `#FFF5E0` → center `#FFB340` → horizon `#FF8C00`. No solid color. |
| **Clouds** | Custom layered geometry: 12–15 lobes per cloud, cream `#FFFDF0` / white `#FFFFFF` with soft self-shadow. 3–4 distinct cloud formations at varying depths (z: -80 to 80, y: 12–25). Instanced for performance. |
| **Terrain** | Rolling hills via displaced plane (40×40 segments) or layered cones. Foreground `#2D6B2E` → midground `#4AA84A` → background `#A3C47D` (atmospheric perspective). Height variation 2–6 units. |
| **Path** | Winding bezier curve (3–4 control points), width 6–8 units, beige `#D4C4A8` material with subtle normal map. Scattered rock meshes along edges. |
| **Lighting** | Hemisphere: sky `#FFE4B5`, ground `#8B7355`, intensity 0.6. Directional: position `[20, 40, -15]`, color `#FFF8E0`, intensity 1.4, warm golden-hour cast. Shadows enabled. |
| **Pines** | 12–16 silhouettes: trunk `#3D2B2A`, canopy `#1A3D2E` / `#152F22` layered cones. Placed on hill slopes, not flat plane. |
| **Rocks** | 6–8 dodecahedrons `#2A2A3A` / `#1A1A2A`, deterministic placement along valley sides. |
| **Skill Markers** | 7 markers at exact `SKILL_STOPS` positions. Left: blue `#4A90E2`; Right: red `#E94A4A`. Scale 1.2, bobbing + rotation. Labels via `Html` component. |

---

## 3. Mountain Passage — Visual Target (from flying-through-valley video frames 61–120)

| Element | Specification |
|---------|---------------|
| **Entry** | Valley hills converge at z≈100. Path narrows from 8→4 units. Fog density increases. |
| **Walls** | Left/right cliff faces: displaced planes or extruded curves, 60 units tall. Dark teal `#05051A` base with warm emissive accents `#FF4500` at base (intensity 0.2–0.4). Subtle normal map for rock texture. |
| **Floor** | Continuation of valley path, darker `#8B7A6B`. Emissive edge strips `#FF4500` (0.15 intensity) guide forward. |
| **Ceiling** | Partial arched ceiling at y≈30, same material as walls, creates tunnel feeling. Opens at exit. |
| **Floating Rocks** | 6–8 dodecahedrons `#08081F` instanced, slow rotation, subtle scale pulse. Positioned in tunnel volume. |
| **Pine Silhouettes** | On cliff ledges, backlit by accent glow. Dark `#0A1A15`. |
| **Fog** | `FogExp2` color `#0A0A1A`, density 0.008→0.02 (increasing toward sunset). |
| **Lighting** | Directional shifts: cooler `#E0E0FF` → warmer `#FFB340`. Accent point lights `#FF4500` along floor edges. |
| **Exit** | Walls recede at z≈250. Ceiling opens. Teal sky visible ahead. |

---

## 4. Projects Sunset — Visual Target (from `projects-sunset.png`)

| Element | Specification |
|---------|---------------|
| **Sky** | Deep teal `#004D4D` → `#006666` gradient. No horizon line — infinite void feel. |
| **Central Mountain** | Layered cone/pyramid at `[0, 0, 320]`: peak `#FF4400` (4 units) → mid `#FFAA44` → base `#44AA88` → water `#0088AA`. Height 35 units, base radius 25. |
| **Sunburst** | 16 instanced planes (ringGeometry segments), radiating from mountain center. Colors alternate: `#FFCC00` (warm) / `#CC00CC` (cool). Triggered reveal on zone entry: scale 0→1 over 1.5s, stagger 0.05s, ease `back.out(1.7)`. Subtle continuous rotation (0.02 rad/s) after reveal. |
| **Landing Platform** | Circle at `[0, 0, 300]`, radius 20. Dark `#0A1A0F` with subtle hexagonal grid pattern (shader). |
| **Project Markers** | **3 markers** (per `worlds.data.ts` cloud projectOrder: `rxverify`, `medigen`, `go-microservices`). Distinct from skill markers: glowing spheres `#FF8C00` → `#FFD700`, scale 1.5, pulse on hover. Positions: `[-8, 3, 300]`, `[0, 3, 308]`, `[8, 3, 300]`. |
| **Lighting** | Hemisphere: sky `#006666`, ground `#001A1A`, intensity 0.4. Directional from mountain: `#FF8800`, intensity 1.8. No shadows needed (baked). |
| **Fog** | `FogExp2` `#002222`, density 0.003 (lighter than passage). |

---

## 5. Shared Art Direction

| Aspect | Rule |
|--------|------|
| **Palette** | Valley: warm gold/green. Passage: cool teal/warm accent. Sunset: teal/orange/magenta triad. |
| **Geometry Style** | Low-poly with purposeful displacement. No noise-for-noise's-sake. Silhouettes readable at 1440×900. |
| **Material Style** | `MeshStandardMaterial` with roughness 0.8–0.95 for terrain, 0.2–0.4 for markers. Emissive only for accents. |
| **Depth Hierarchy** | Sky → distant mountains → midground hills/rocks → foreground path → character → markers → overlay. |
| **Camera/Character Scale** | Character ~4.5 units tall. Camera 15–40 units back. FOV 50 (valley) → 40 (passage) → 55 (sunset). |
| **Animation Timing** | Transitions: 2.5–3.5s. Easing: `power2.inOut` (camera), `power3.inOut` (character). Marker bob: 0.002 Hz. |
| **Marker Distinction** | Skills: cubes, blue/red, labels above. Projects: spheres, gold/orange, labels above. |
| **Reduced Motion** | `prefers-reduced-motion`: disable camera timelines, instant zone switches, static clouds/sunburst. |
| **Mobile** | Touch drag for orbit, virtual joystick for movement. Overlay stacks bottom. Canvas 100vw/100vh. |

---

## 6. Performance & Instancing Targets

| Element | Instances | Draw Calls | Geometry |
|---------|-----------|------------|----------|
| Valley Clouds | 12 lobes × 2 layers = 24 | 2 | SphereGeometry(1, 12, 8) / SphereGeometry(0.8, 10, 6) |
| Passage Rocks | 8 | 1 | DodecahedronGeometry(1, 0) |
| Passage Pines | 12 | 12 (merged) | ConeGeometry merged via BufferGeometryUtils |
| Sunset Sunburst | 16 | 1 | RingGeometry segments |
| Project Markers | 3 | 3 | SphereGeometry(1, 16, 12) |

Total added draw calls: **≤6** (within budget).

---

## 7. Verified Findings vs Inferences

| Finding | Status | Evidence |
|---------|--------|----------|
| FrameDriver/Composer mount race | **Verified** | Console logs: "Composer not ready yet" → cleanup with 0 frames |
| MountainPassageZone at z=-30 | **Verified** | Source line 636: `position={[0, 0, -30]}` |
| ProjectsSunsetZone at z=60 | **Verified** | Source line 700: `position={[0, 0, 60]}` |
| Character maxZ=80 | **Verified** | Source line 919: `const maxZ = 80;` |
| PROJECT_DATA uses data-world projects | **Verified** | CloudWorld3D.tsx lines 93–118 vs worlds.data.ts lines 45–57 |
| Cloud World should use `rxverify`, `medigen`, `go-microservices` | **Verified** | `worlds.data.ts` line 57: `projectOrder: ['rxverify', 'medigen', 'go-microservices']` |
| 3 project markers (not 4) | **Verified** | `projectOrder` length = 3 |
| Sunburst = arrival-triggered pulse | **Approved** | User decision |
| Camera = dampened during transitions | **Approved** | User decision |
| Backtracking = free | **Approved** | User decision |
| Custom layered cloud geometry | **Approved** | User decision |

---

## 8. Unresolved Questions (None Remaining)

All essential questions answered by inspection or user decisions. Ready for implementation plan.