# Cloud World — Phase 2: Mountain Passage and Projects Sunset
## Detailed Transition Implementation Plan

Based on analysis of reference assets (`skills-valley.png`, `projects-sunset.png`, `Flying_through_valley_and_mountain_20261006115423.mp4`), current implementation in `src/cloud-world-3d/CloudWorld3D.tsx`, and loaded skills (Three.js fundamentals/geometry, GSAP timeline, frontend-cinematic-qa, systematic-debugging, visual-implementation-planning).

---

## Current State Verification (Prerequisite Confirmed)

| Aspect | Status | Evidence |
|--------|--------|----------|
| Skills Valley visual polish | ✅ Complete | `DistantMountains`, `ValleyFloor` with sandy path, `ValleyHill` (10), `ValleyRock` (6), `InstancedClouds` (2 draw calls), `SKILL_STOPS` at x=±4, z=-20→70, enhanced `CloudCharacter` |
| Build | ✅ Pass | `npm run build` → 1.07s |
| Post-processing | ✅ Visible | 99.9860% pixel diff (Vignette + Noise) |
| Character movement | ✅ Functional | WASD/Arrows, bounds X:±25 Z:-5→80, auto-progress <3 |
| Mouse look | ✅ Functional | OrbitControls constrained |
| Marker clicks | ✅ Functional | Updates overlay with skill details |
| Escape key | ✅ Functional | Returns to main portfolio |
| Reduced motion | ✅ Respected | `prefers-reduced-motion` handled |
| WebGL fallback | ✅ Present | Fallback UI when WebGL unavailable |

Screenshots captured: `qa-screenshots/angle-1-default.png` through `angle-4-right.png`

---

## Reference Analysis Summary

### Three Zones from Video (8 seconds @ 24fps, ~192 frames)

| Zone | Frames (approx) | Duration | Key Visuals |
|------|-----------------|----------|-------------|
| **Skills Valley** | 1-60 (0-2.5s) | 2.5s | Open valley, rolling green hills, pine trees, warm sunset sky with white clouds, winding beige path |
| **Mountain Passage** | 61-120 (2.5-5s) | 2.5s | Darker confined tunnel, mountain walls closing in, orange/magenta accent lighting, floating rocks |
| **Projects Sunset** | 121-192 (5-8s) | 3s | Dark circular tunnel, radiating sunburst beams (orange/yellow/magenta), central mountain silhouette, teal sky |

### Key Transition Moments
1. **Valley → Passage**: Hills close in, path narrows, lighting shifts from warm ambient to dramatic accent
2. **Passage → Sunset**: Tunnel opens to dark void, sunburst rays erupt, central mountain peak appears
3. **Color palette shift**: Warm gold/orange → deep orange/magenta → teal + orange/magenta burst

### Current Implementation Gaps
- `MountainPassageZone` at z=-30 (behind valley!), minimal geometry
- `ProjectsSunsetZone` at z=60 (too close), basic sunset rings only
- No transition logic between zones
- Character can't reach Passage/Sunset (movement bounds z: -5→80)
- No camera transition choreography

---

## Stage 1: Transition Architecture & Trigger Design

### 1.1 Zone Positioning (World Space)
```
Skills Valley:      z = -100 to 100    (existing, character starts at z=-22)
Mountain Passage:   z = 100 to 250     (NEW: extend forward)
Projects Sunset:    z = 250 to 400     (NEW: extend further)
```

### 1.2 Transition Triggers
| Transition | Trigger | Mechanism |
|------------|---------|-----------|
| Valley → Passage | Character reaches CI/CD skill (z≈70) + continues forward | Auto-advance targetSkillIndex to "passage-entry" sentinel |
| Passage → Sunset | Character reaches passage exit (z≈250) | Auto-advance to "sunset-entry" sentinel |
| Reverse (backtrack) | Character moves backward past zone boundaries | Clamp position, allow free movement within bounds |

### 1.3 Camera Choreography (GSAP Timeline)
```javascript
// Valley → Passage: Camera narrows FOV, lowers, follows tunnel
// Passage → Sunset: Camera pulls back, FOV widens, tracks sunburst center
// Use gsap.timeline() with position parameter for precise sequencing
```

### 1.4 State Management
Add to `CloudCharacter` state:
```typescript
type Zone = 'valley' | 'passage' | 'sunset';
const [currentZone, setCurrentZone] = useState<Zone>('valley');
const [zoneProgress, setZoneProgress] = useState(0); // 0-1 within zone
```

---

## Stage 2: Mountain Passage Implementation

### 2.1 Visual Design (Per Reference Video Frames 61-120)
| Element | Specification | Three.js Approach |
|---------|---------------|-------------------|
| **Left/Right Walls** | Jagged mountain cliffs, 80 units tall, dark teal (#05051a) | `ConeGeometry` or `ExtrudeGeometry` with `MeshStandardMaterial` |
| **Floor** | Narrow path (4→2 units wide), dark with orange accent strip | `PlaneGeometry` + emissive line |
| **Ceiling** | Partial, creates tunnel feel, same material as walls | `PlaneGeometry` arched |
| **Floating Rocks** | 6-8 dodecahedrons, slow rotation, dark with subtle glow | `DodecahedronGeometry` instanced |
| **Pine Silhouettes** | On ledges, backlit by accent lighting | `ConeGeometry` layered, dark material |
| **Atmospheric Fog** | Volumetric, increases density toward sunset | `FogExp2` color #0a0a1a, density increases with z |
| **Accent Lighting** | Orange emissive strips (#ff4500) along floor edges | `MeshStandardMaterial` with `emissive` + `emissiveIntensity` |

### 2.2 Geometry Efficiency
- Use `InstancedMesh` for rocks (6 instances → 1 draw call)
- Merge static wall geometries with `BufferGeometryUtils.mergeGeometries`
- Reuse existing `DodecahedronGeometry` and `ConeGeometry`
- Limit segments: cones 8-12 radial, dodecahedrons detail 0

### 2.3 Implementation Tasks

| Task | Files | Visual Verification |
|------|-------|---------------------|
| 2.1 Reposition `MountainPassageZone` to z=100-250 | `CloudWorld3D.tsx` | Screenshot at z=150 shows tunnel walls |
| 2.2 Replace wall geometry with layered cliffs | `CloudWorld3D.tsx` | Matches frame_0008-0011 dark cliffs |
| 2.3 Add narrow path with emissive edges | `CloudWorld3D.tsx` | Path visible, guides forward |
| 2.4 Add instanced floating rocks | `CloudWorld3D.tsx` | 6 rocks, 1 draw call |
| 2.5 Add pine silhouettes on ledges | `CloudWorld3D.tsx` | Dark trees against accent light |
| 2.6 Add volumetric fog gradient | `CloudWorld3D.tsx` | Fog density increases toward sunset |
| 2.7 Update character bounds to z=250 | `CloudWorld3D.tsx` | Character reaches passage exit |
| 2.8 Add zone transition trigger at CI/CD | `CloudWorld3D.tsx` | Auto-advances zone state |

---

## Stage 3: Projects Sunset Implementation

### 3.1 Visual Design (Per Reference Video Frames 121-192 + projects-sunset.png)
| Element | Specification | Three.js Approach |
|---------|---------------|-------------------|
| **Central Tunnel** | Dark circular void, 30 units diameter | `RingGeometry` or `CylinderGeometry` (inverted) |
| **Sunburst Rays** | 12-16 radiating beams, animated rotation | `PlaneGeometry` instanced, `MeshBasicMaterial` with gradient texture or vertex colors |
| **Central Mountain** | Stylized peak with sunset layers (orange→peach→green→teal) | `ConeGeometry` + multiple scaled rings with sunset colors |
| **Teal Sky** | Deep teal background (#008080-ish) | `Color` on scene background or large sky sphere |
| **Project Markers** | 3 glowing orbs on landing platform | `SphereGeometry` + `MeshStandardMaterial` emissive |
| **Landing Platform** | Flat circular area at tunnel exit | `CircleGeometry` with subtle grid pattern |

### 3.2 Color Palette (Exact from projects-sunset.png)
```javascript
const sunsetColors = {
  sky: 0x006666,           // Deep teal
  sun: 0xff8800,           // Bright orange
  mountainPeak: 0xff4400,  // Red-orange
  mountainMid: 0xffaa44,   // Peach
  mountainBase: 0x44aa88,  // Green
  mountainWater: 0x0088aa, // Teal
  rayWarm: 0xffcc00,       // Yellow-orange
  rayCool: 0xcc00cc,       // Magenta
  rayHot: 0xff4400,        // Red-orange
};
```

### 3.3 Implementation Tasks

| Task | Files | Visual Verification |
|------|-------|---------------------|
| 3.1 Reposition `ProjectsSunsetZone` to z=250-400 | `CloudWorld3D.tsx` | Screenshot at z=300 shows sunset |
| 3.2 Build central dark tunnel void | `CloudWorld3D.tsx` | Circular opening visible |
| 3.3 Create animated sunburst rays (instanced) | `CloudWorld3D.tsx` | 12 rays rotating, 1 draw call |
| 3.4 Build layered central mountain peak | `CloudWorld3D.tsx` | Matches projects-sunset.png |
| 3.5 Set teal sky background | `CloudWorld3D.tsx` | Scene.background = teal |
| 3.6 Add landing platform with project markers | `CloudWorld3D.tsx` | 3 markers visible, clickable |
| 3.7 Implement `ProjectMarker` click → overlay | `CloudWorld3D.tsx` | Overlay shows project data |
| 3.8 Add zone transition trigger at passage exit | `CloudWorld3D.tsx` | Auto-advances to sunset zone |

---

## Stage 4: Camera & Character Transition Choreography

### 4.1 GSAP Timelines (Per gsap-timeline skill)
```javascript
// Valley → Passage (triggered at CI/CD skill)
const valleyToPassage = gsap.timeline({ paused: true });
valleyToPassage
  .to(camera, { fov: 40, duration: 2, ease: "power2.inOut" }, 0)
  .to(camera.position, { y: 5, z: 20, duration: 2, ease: "power2.inOut" }, 0)
  .to(controls.target, { z: 150, duration: 2, ease: "power2.inOut" }, 0)
  .to(fog, { density: 0.02, color: 0x0a0a1a, duration: 3 }, 0.5);

// Passage → Sunset (triggered at passage exit)
const passageToSunset = gsap.timeline({ paused: true });
passageToSunset
  .to(camera, { fov: 55, duration: 3, ease: "power3.inOut" }, 0)
  .to(camera.position, { y: 8, z: 25, duration: 3, ease: "power3.inOut" }, 0)
  .to(controls.target, { z: 300, duration: 3, ease: "power3.inOut" }, 0)
  .to(scene.background, { color: 0x006666, duration: 2 }, 1)
  .to(fog, { density: 0.005, duration: 2 }, 1);
```

### 4.2 Character Movement Adaptation
- In passage: constrain X more tightly (±2), auto-forward assist
- In sunset: free movement on platform, no auto-forward
- Transition: brief camera control lock during timeline playback

---

## Stage 5: Visual QA Protocol (Per frontend-cinematic-qa)

### 5.1 Static Prototypes (Before Full Implementation)
Build 4 static HTML prototypes in `qa/_scratch-e/cloud-prototypes/`:
1. `valley-arrival.png` — Character at CI/CD skill, looking toward passage
2. `passage-mid.png` — Character mid-passage, walls visible
3. `sunset-arrival.png` — Character at sunset platform, sunburst visible
4. `expanded-project.png` — Project marker clicked, overlay open

### 5.2 Verification Checkpoints
| Stage | Command | Expected |
|-------|---------|----------|
| Build | `npm run build` | ✅ Pass, no TypeScript errors |
| Valley → Passage | `node qa/test-transition-valley-passage.mjs` | Character enters passage, camera narrows |
| Passage → Sunset | `node qa/test-transition-passage-sunset.mjs` | Sunburst appears, teal sky |
| Project markers | `node qa/test-project-markers.mjs` | 3 markers clickable, overlays work |
| Full regression | `node qa/test-full-regression.mjs` | All Skills Valley behavior preserved |
| Visual comparison | `vision_analyze` on screenshots vs reference | Pixel positions match within tolerance |

### 5.3 Resolution Tests
- 1920×1080 (desktop)
- 1440×900 (laptop) 
- 390×844 (mobile)

---

## Stage 6: Systematic Debugging Checkpoints (Per systematic-debugging)

### 6.1 Red-Green Loop for Each Stage
1. **Write failing visual test** (e.g., "passage walls not visible at z=150")
2. **Run visual check** → confirm failure
3. **Implement minimal fix** (add wall geometry)
3. **Run visual check** → confirm pass
4. **Commit** with descriptive message

### 6.2 Root Cause Investigation Triggers
- If camera timeline doesn't play → check GSAP registration, timeline paused state
- If character can't enter passage → check movement bounds, zone state logic
- If sunburst rays not rendering → check InstancedMesh count, material transparency
- If project overlay not opening → check raycasting layers, Html overlay z-index

---

## Protected Files (DO NOT MODIFY)
- `src/App.tsx`
- `src/game/**`
- `src/content/worlds.data.ts`
- `src/content/index.ts`
- `vite.config.ts`
- `package.json` / `package-lock.json` (unless new deps justified)

---

## No New Dependencies Required
All implementation uses existing:
- `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- `three`, `postprocessing`
- `gsap` (already in project for cinematic hero)
- `playwright` (for QA)

---

## Deliverables
1. **Updated `CloudWorld3D.tsx`** with all three zones connected
2. **Fresh screenshots** at each transition point (1440×900)
3. **Build passing** with no console errors
4. **Interaction tests** passing (movement, camera, markers, overlays, Escape, reduced-motion)
5. **Visual comparison** against reference images/video frames

---

## Ambiguity Checkpoints (Stop and Ask)
1. **Camera control during transition**: Should player retain mouse look during GSAP timeline, or full lock?
2. **Backtracking**: Can player return from Passage → Valley? From Sunset → Passage?
3. **Project data source**: Use existing `PROJECT_DATA` array or new content file?
4. **Sunburst animation**: Continuous rotation or triggered pulse on arrival?
5. **Audio**: Any ambient sound transitions? (Currently none in codebase)

---

## Next Step
Upon approval, begin **Stage 2.1**: Reposition `MountainPassageZone` to z=100-250 and extend character movement bounds. First visual checkpoint: character reaches CI/CD skill (z=70) and continues forward into visible passage entrance.