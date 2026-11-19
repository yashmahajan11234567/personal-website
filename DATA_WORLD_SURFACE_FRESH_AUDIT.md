# DATA WORLD SURFACE — FRESH VISUAL AUDIT

**Branch:** `restore/data-world-386991f`  
**HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d`  
**Date:** 2026-11-16  
**Scope:** Surface (cliff) chapter only — entry structure, platform, skills portal.

---

## 1. Verified Repository State

| Item | Value |
|------|-------|
| Current branch | `restore/data-world-386991f` |
| HEAD commit | `c7184c859d5da67a77ded67a9178faea5e1e290d` |
| Modified tracked files (git status M) | 22 files (qa screenshots, WorldScene.ts, worldConfig.ts, dataPipeSkin.ts, worldObjects.ts, WorldShell.tsx/css, engine.ts) |
| Untracked files | 40+ planning docs, screenshot dirs, asset dirs, debug scripts |
| Asset files in `public/assets/data-world/` | `surface-entry.png` (428×589), `surface-platform.png` (1266×617), `surface-skills-portal.png` (427×621) — all RGBA |
| Pre-existing uncommitted work | Substantial: modified qa screenshots, modified source, many untracked docs & screenshots |

**No destructive git operations were performed.** All existing work preserved exactly.

---

## 2. Reference Image Analysis (Source of Truth)

Attached image: `image_8864a4.png` (2172×724 RGBA). Visible alpha bounds: x 25–2141, y 123–680.

### 2.1 Overall Composition
- **Aspect ratio:** 3:1 (2172 / 724 ≈ 3.0) — a wide level strip, not a single viewport.
- **Three zones:** left entry structure, continuous middle platform, right portal.
- **Horizontal column runs (visible pixels):**
  - Run 1: x 25–1676 (1652 px) — entry + platform
  - Gap: x 1677–1718 (42 px transparent)
  - Run 2: x 1719–2141 (423 px) — portal
- **Vertical floor line:** dominant bottom-y clusters at 652, 680, 639 (≈ 87–94% of image height).

### 2.2 Entry Structure (Left)
- **Bounding box (crop-local):** x≈30–455, y≈130–640 → **425×510 px** (19.6% of full width, 70% of height).
- **Visuals:** Tall industrial portal/tower; wide mechanical header; centered teal sign panel reading **“DATA WORLD / ENTRY”** (cyan pixel caps); double doors at lower center flanked by vertical magenta neon strips; magenta neon bar above sign; orange/amber indicator lights; dark purple/gray metal panels.
- **Base:** feet/threshold at y≈620–640; black space below to y=724.
- **Asset match:** `surface-entry.png` 428×589; visible 417×517. Reference width 425 ≈ asset visible width 417 (natural scale ~1.0).

### 2.3 Platform (Middle)
- **Span:** x≈25–1676 in reference (1652 px = 76% of strip).
- **Walkable surface:** top edge y≈555–575 (planters/railings sit on it).
- **Front face:** drops to y≈640, then darker base/legs with under-pipes to y≈700.
- **Details:** magenta neon strip on front face (~y 600–620); vent grille; rectangular planter (x≈480–610) with green shrubs, brown trunk, **pink blossom canopy** (x≈480–640, y≈300–450), tiny red glow, orange light on planter front.
- **Railing:** dark metal at rear/right (x≈560–700, y≈450–520), 2–3 horizontal bars.
- **Asset match:** `surface-platform.png` 1266×617; visible 1235×497. Reference platform span 1652 vs asset natural 1266 → reference shows platform ~1.3× natural width.

### 2.4 Skills Portal (Right)
- **Bounding box:** x 1719–2141 (423 px = 19.5% of strip), y 255–639 (385 px = 53% height).
- **Visuals:** Arch with circular opening; blue spiral interior; dark blue frame with pink accents.
- **Label:** **“NEXT: SKILLS”** in white on blue above the arch.
- **Base:** sits at y≈639 (slightly above platform's 652–680).
- **Asset match:** `surface-skills-portal.png` 427×621; visible 423×385. Reference width 423 ≈ asset visible 423 (natural scale ~1.0); reference height 385 = 62% of asset visible 617 (top of asset is transparent).

### 2.5 Background
- Solid black (#000000) with subtle gradient toward top; no video/parallax in reference — the reference is the *composed artwork strip*.

### 2.6 Robot/Character
- **Not present** in the reference image.

---

## 3. Current Implementation Measurements

### 3.1 Asset Properties
| Asset | Source W×H | Visible bbox (x,y,w,h) | Visible W×H | Floor bottom (median) |
|-------|------------|------------------------|-------------|----------------------|
| surface-entry.png | 428×589 | (11, 68, 428, 585) | 417×517 | 576 / 589 (97.8%) |
| surface-platform.png | 1266×617 | (0, 115, 1235, 612) | 1235×497 | 585 / 617 (94.8%) |
| surface-skills-portal.png | 427×621 | (2, 232, 425, 617) | 423×385 | 611 / 621 (98.4%) |

### 3.2 Current Rendering (WorldScene.buildSurfaceArtwork, cliff chapter)
- `platformScale = world.width / 1266 = 900 / 1266 ≈ 0.711`
- Platform: display **900×439**, origin(0.5,1), bottom at `groundY + 124×scale = 560 + 88 = 648`, depth 2
- Entry: same scale, display **304×419**, origin(0,1), bottom at `groundY = 560`, x=0, depth 3
- Portal: same scale, display **304×442**, origin(0,1), bottom at `groundY = 560`, centered on exitPipe x=750 → leftX=598, depth 3

### 3.3 On-Screen at 1440×900 (zoom=2, view 720×450 world px)
| Element | World rect (px) | Screen rect (px) @ zoom 2 | % of viewport |
|---------|-----------------|---------------------------|---------------|
| Entry | x 0–304, y 141–560 | x 0–608, y -28–810 | 42% W, 93% H (top clipped) |
| Platform | x 0–900, y 209–648 | x 0–1800, y 108–986 | 100% W, covers full view |
| Portal | x 598–902, y 118–560 | x 1196–1804, y -74–810 | 42% W (off right at spawn), 93% H (top clipped) |
| Ground line | y=560 | y=810 (90% of 900) | — |

**Result:** Both entry and portal are **massively oversized** (each ~42% of viewport width), their tops are clipped above the view, and the portal sits mostly off-screen until the player walks right. The platform artwork covers the entire world width but its walkable line sits correctly at 90% viewport.

---

## 4. Duplicate & Legacy Visual Elements on Cliff Chapter

| # | Element | Source | World Position | Depth | Problem |
|---|---------|--------|----------------|-------|---------|
| 1 | Procedural subfloor texture (`surface-subfloor-56`) | `buildTerrain` → `drawSurfaceSubFloor` | Full width, y 560–616 | 0 (physics body image) | Covered by platform art (depth 2) — harmless but wasteful |
| 2 | Magenta ground rim (2px) | `buildTerrain` L779–782 | Full width, y=561 | 1 | Mostly covered by platform art |
| 3 | **6 ledge rectangles** (palette.ground #141c30) + magenta rims | `buildTerrain` L787–806 | Per `CLIFF_PLATFORMS` (x 320/470/520/620/700/760, y 290–470) | 1 | **Float in air** above platform artwork — visible as grey bars |
| 4 | Chapter label “DATA WORLD” | `buildStations` L1114–1118 | x=40, y=452 | 5 | **Floats left of entry**, duplicates “DATA WORLD ENTRY” sign |
| 5 | **Entry pipe skin** (procedural 44×60 mouth + “START” plate + “ORIGIN” sign) | `buildPipes` → `createDataPipeSkin` (pipe `cliff-entry` x=60) | Container at (60, 560) | 4 | **Overlaps entry artwork door** — two doors side by side |
| 6 | **Exit pipe skin** (drawSurfacePortal 120×140 + “NEXT: SKILLS” plate + “JUMP TO START” sign) | `buildPipes` → `createDataPipeSkin` (pipe `cliff-to-skills` x=750) | Container at (750, 560) | 4 | **Duplicates portal artwork** — two “NEXT: SKILLS” portals, two signs |
| 7 | Gem probe (foundation-probe) | `buildInteractionProbe` | x=480, y=554 | 5 | Gameplay — **keep** |
| 8 | Travel overlay / band | `buildTravelOverlay` | Full viewport | 900+ | Hidden when not travelling — OK |

**Visual vs Gameplay separation:**
- Items 3, 4, 5, 6 are **visual duplicates** — their physics/interaction counterparts (ledge bodies, pipe triggers) must remain.
- Item 7 is pure gameplay (interaction trigger).
- Items 1, 2 are subfloor physics visuals, mostly obscured.

---

## 5. Why the Current Result Looks Wrong

1. **Uniform scale (0.711) applied to all three assets** — but the reference composes them at **different effective scales**: platform ~1.3×, entry ~1.0×, portal ~1.0×. Forcing the same scale makes entry/portal huge relative to the platform.
2. **Platform anchored by world width** (900/1266) — correct for a continuous floor, but entry/portal should scale **relative to the platform’s displayed size**, not to their own source widths.
3. **Entry bottom anchored at groundY (560)** — but its visible floor in the asset is at y≈576 (97.8% down). Anchoring at image bottom puts the walkable surface 16px **below** groundY. The comment claims “walkable surface at y≈563, offset 124” — measured offset is actually ~119px from visible bottom.
4. **Portal bottom anchored at groundY** — its visible floor is at y≈611 (98.4% down). Same misalignment.
5. **No cleanup of procedural duplicates** — ledge rects, chapter label, pipe skins remain rendered on top of the new artwork.
6. **Camera vertical bias 0.40** puts ground at 90% viewport — correct — but entry/portal tops at world y≈118–141 are above the view top (scrollY≈155), so they are clipped.

---

## 6. Robot & Camera Context (for Proportions)

- **Robot frame:** 56×62 px (ROBOT_FRAME_WIDTH/HEIGHT), hitbox 10×14, spawn at (120, 560) grounded.
- **Camera:** `zoom=2` (integer, pixelArt), `verticalBiasRatio=0.4`, `floorMargin=10`.
- **Viewport 1440×900** → view 720×450 world px. Ground line at screen y = (560 - scrollY)×2. At spawn scrollY≈155 → ground at 810px (90%).
- **Visible world band:** y ∈ [scrollY, scrollY+450] ≈ [155, 605] at spawn.
- **Entry top at world y=141** → 14px **above view** (clipped).
- **Portal top at world y=118** → 37px above view (clipped).

---

## 7. Summary of Findings

| Finding | Evidence |
|---------|----------|
| Entry/portal oversized by ~2.2× vs reference proportions | Reference entry 19.6% strip width; current 33.8% world width = 42% viewport at zoom 2 |
| Platform scale correct for full-width walkway | Platform spans 900 world px = full chapter width |
| Entry/portal tops clipped at default camera | View top y≈155; entry top 141, portal top 118 |
| 6 floating ledge rectangles visible | `CLIFF_PLATFORMS` drawn as grey rects + magenta rims at depth 1 |
| Chapter label “DATA WORLD” floats at x=40 | `buildStations` draws label texture at (40, groundY-108) |
| Two “START” doors: artwork + procedural pipe | Entry pipe at x=60 draws 44×60 mouth + “START” plate |
| Two “NEXT: SKILLS” portals: artwork + procedural | Exit pipe at x=750 draws 120×140 portal + “NEXT: SKILLS” plate |
| Background video layer (React) sits at z-index 0 | `WorldShell.tsx` renders `BackgroundVideoLayer` behind `.world-canvas` (z-index 1) |
| Robot spawns inside entry artwork footprint | Spawn x=120; entry spans x=0–304 → robot appears in front of doorway (depth 10 > 3) |

---

## 8. Assets & Code References

| File | Key Lines |
|------|-----------|
| `src/game/scenes/WorldScene.ts` | preload 345–347, buildTerrain 714–813, buildSurfaceArtwork 877–929, buildPipes 1122–1127, buildStations 1114–1118 |
| `src/game/config/worldConfig.ts` | CLIFF_WIDTH 525, GROUND_Y 367, CAMERA 414–485, SPAWN 508, CLIFF_PLATFORMS 690–700 |
| `src/game/scenes/dataPipeSkin.ts` | createDataPipeSkin 64–327, cliff exit special case 70–74, 90–94, 113–114, 192–230 |
| `src/game/art/worldObjects.ts` | drawSurfacePortal 406–503 |
| `src/components/WorldShell.tsx` | BackgroundVideoLayer 429–434, world-exit button 462–470, world-index-toggle 595–604 |
| `src/components/BackgroundVideoLayer.tsx` | surface chapter config 29–30 (bg.mp4, poster.jpg) |
| `public/assets/data-world/` | Three PNG assets (measured above) |

---

*End of Audit. No implementation performed.*