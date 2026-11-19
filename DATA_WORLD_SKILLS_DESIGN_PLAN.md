# DATA_WORLD_SKILLS_DESIGN_PLAN.md — Stage K refinement: implementation-ready Skills ("Infrastructure") spec

Design only. Nothing implemented. Gameplay geometry is **preserved**; this plan changes visuals only.
World px are in the Skills chapter's own coordinate space: **world 1500×900, groundY 560, spawn (144,560)**.
Reference mockups: `docs/skills-concept/` — `DATA_WORLD_SKILLS_CONCEPT_BOARD.html` (live board), `skills-layout.svg` (world-coordinate diagram), 9 transparent SVG art references (strip + 2 portals + 6 stations, idle/lit pairs).

## 1. Environment concept

**INFRASTRUCTURE — an underground industrial data-network hall**, a distinct destination in the same cyberpunk pixel-art universe as Surface (not a recolour).

- One continuous environment strip: hall back wall in deep violet (`#211735` family), horizontal data conduits with collars and cyan flow segments across world y≈300–430, cable trays, gantry posts, server racks at both ends, machinery blocks, steam vents (world x≈250, 760, 1240), two small environmental screens carrying short tech glyphs integrated into machines — **not** a row of logos/advertisements.
- Walkway slabs are **baked into the strip at the exact ledge physics rects** — (300,420,120×16) and (520,350,96×16, oneWay) — so artwork and collision align by construction.
- Floor face + sub-floor face down to y=620 with a magenta ground rim at y=560; chapter name "SKILLS" baked into the strip above the return arch (world x≈20..180, y≈300..330).
- The React video layer (`infrastructure/bg.mp4` + crossfade loop) stays untouched and shows through the strip's transparent top (above world y≈300).
- Palette: Surface family only — violet `#211735/#1A0D23/#0A0410`, magenta `#CF31AD/#8B2270`, cyan `#17D3F4/#8CEAFF`, portal blues `#0066CC/#66CCFF/#88E0FF`, metal greys `#2b3646/#48566b/#6e7f96`. Hard-edged rects, 2–4px outlines, 1px lit crown + dark underside on every horizontal member, light from above-left.

## 2. The nine placed artwork objects

Nine PNG objects total: **1 environment layer + 2 portals + 6 skill interactables** (layout diagram: `docs/skills-concept/skills-layout.svg`).

| # | Object | Source (2×) | Display | Origin | World pos | Depth |
|---|--------|-------------|---------|--------|-----------|-------|
| 1 | `skills-infrastructure-strip.png` | 3000×680 | 1500×340 | (0.5,1) | (750, 620) | 2 |
| 2 | `skills-portal-return-f0..f3.png` (4 frames) | 400×500 each | 200×250 | (0,1) | (0, 560) | 3 |
| 3 | `skills-portal-forward-f0..f3.png` (4 frames) | 360×520 each | 180×260 | (0.5,1) | (1350, 560) | 3 |
| 4–9 | `skills-station-<id>[-lit].png`, id ∈ sql, python, excel, power-bi, tableau, streamlit | 192×208 each | 96×104 | (0.5,1) | (x, 560), x = 440, 570, 700, 830, 960, 1090 | 6 |

- Strip covers world y 280..620, x 0..1500; **fully transparent above source y=40** (world y<300). Effective scale 0.5 at zoom 2 = 1 screen px per source px (integer, no dropped pixels).
- **Return portal** (→ Surface) spans x 0..200, y 310..560: the arch mouth is centred on the entry trigger **x=60** (arm zone 38..82), and an asymmetric sign wing reaches x≈200 carrying the baked destination name "SURFACE". This one object fixes both audit findings: the clipped signboard (was world x −110..22) and mobile-arrival visibility (arrival scrollX≈90 → view starts at x=90; wing at 90..200 is on screen). The base step is opaque, so the robot's climb-sink (player depth 2 < portal depth 3) hides behind the rim — exactly the Surface portal mechanism.
- **Forward portal** (→ Projects) spans x 1260..1440, y 300..560, mouth centred on exit trigger **x=1350** (arm 1328..1372), sign plate carries "PROJECTS". Magenta arch vs cyan/blue arch = the two portals are visually distinct.
- No "previous world"/"next world" text anywhere — only destination names as baked signage. Procedural pipe plate/sign children are hidden on the skills chapter.
- Portal animation: 4-frame energy-field strips, 0.8 s loop (200 ms/frame); under reduced motion, frozen on frame 0. Portal art is independent of the pipe triggers, which are untouched.

## 3. Six skill interactables — distinct identities, one family

All 96×104 display, bottom-anchored at y=560, idle + lit PNG pair (lit = the existing proximity texture swap), depth 6. **Click hitbox = the sprite rect**, independent of transparent padding in the art: world rect x±48, y 456..560. Proximity and InfoPanel wiring are unchanged (`station.id` → `kind:'skill'` → InfoPanel).

| x | id | Concept | Identity cue | Idle → lit |
|---|----|---------|--------------|------------|
| 440 | sql | Data-vault drum: 3 stacked cylinder drums + antenna | cyan data band per drum | band dim → bright cyan + glow |
| 570 | python | Code console: dark screen with `>>>` lines + cable coil | `>>>` prompt glyphs | screen brightens, cursor blinks |
| 700 | excel | Grid cabinet: spreadsheet grid, header row, one highlighted column | cell grid | header + column glow |
| 830 | power-bi | Metrics board: 5 ascending bars cyan→magenta | bar chart | bars brighten, top bar magenta |
| 960 | tableau | Marks easel: scatter of plus-marks on screen | plus marks | marks brighten, one magenta |
| 1090 | streamlit | Live-app kiosk: play triangle + running line chart | play + chart | chart line brightens |

No per-station animation beyond the lit swap (minimal code; the portals carry the motion). Reduced motion: the lit swap is a state change, not motion, and stays; portal animation freezes.

## 4. World-coordinate layout (all nine objects)

See `docs/skills-concept/skills-layout.svg` (side view, world 1500×900): video region 0..280 · strip 280..620 · ground line 560 · ledges (300,420) and (520,350) · return portal 0..200 · stations at 440/570/700/830/960/1090 (rects x±48, y 456..560) · spawn 144 · forward portal 1260..1440 · trigger zones 38..82 and 1328..1372 · desktop arrival view 720×450 @ scroll(0,155) · mobile arrival view 195×422 @ scroll(90,179).

## 5. Phaser integration (how the art plugs in — no gameplay change)

Mirror the proven Surface pattern with a `buildSkillsArtwork()` branch in `buildTerrain` when `chapter === 'skills'`:

1. `preload()` registers texture keys: `skills-strip`, `skills-portal-return-f0..f3`, `skills-portal-forward-f0..f3`, `skills-station-<id>`, `skills-station-<id>-lit`.
2. Strip image at (750,620), origin (0.5,1), depth 2. Ground-rim rect (depth 1) and physics bodies (depth 0) stay — art overlays them, exactly like Surface platform over subfloor.
3. Portals at (0,560) origin (0,1) and (1350,560) origin (0.5,1), depth 3; play `skills-portal-*-anim` (4 frames × 200 ms, repeat) via `this.anims`; `prefersReducedMotion()` → stop on frame 0.
4. Extend the existing cliff guard: on `chapter === 'skills'`, hide both pipe containers in `buildPipes` and in the `onArrive` visibility loop (same pattern as `hiddenBySurfaceArtwork`). Pipe triggers (`pipeNearX`) are independent of container visibility and keep arming; the 12-phase transport is untouched — during the climb the player sits at depth 2 behind portal depth 3, occluded by the opaque base rim.
5. `buildStations`: for skills, use `skills-station-<id>` / `-lit` as the station textures at the existing 96×104 StationViews; fall back to the procedural canvas if a key is missing, so a missing asset can never soft-lock the chapter.
6. Ledge rect fills hidden (walkway slabs baked into the strip at the same rects); physics bodies unchanged.
7. Chapter label suppressed as a procedural sprite on skills (baked into the strip); gem probe gated to cliff only (see §6).
8. Camera, zoom, scroll clamps, viewport behavior, interaction bus, InfoPanel, video layer: **unchanged**.

Depth stack on skills: 0 physics · 1 rim · 2 strip · 3 portals · 4 pipe containers (hidden) · 5 label/gem · 6 stations · 9 glow · 10 player · 900/901 travel overlay.

## 6. Audit findings — classification and proposed resolution

| Finding | Class | Proposed fix |
|---------|-------|--------------|
| Entry-pipe signboard clipped beyond world x<0 | **Required for Stage K** | Drop the separate sign on skills; "SURFACE" destination signage baked into the return-portal wing spanning x 0..200 |
| Entry portal off-screen on mobile arrival (scrollX≈90) | **Required for Stage K** | Asymmetric return-portal art (wing to x≈200) puts visible pixels at x 90..200 on arrival; no camera change |
| `foundation-probe` gem visible in Skills (belongs to cliff) | Safe cleanup | Gate `buildInteractionProbe` to `chapter === 'cliff'`; re-run gameplay suite (it asserts the gem on cliff) |
| Stale hidden `pipeSkins` containers accumulate across swaps | Safe cleanup — defer to cleanup stage | On chapter switch, `setVisible(false)` + drop other chapters' map entries; never `setTexture` on a destroyed skin |
| Unused `facilityArt` draw fns + `neonCity` | Defer until later | Dead-code removal in a dedicated cleanup stage after Stage K ships |
| Unused `PIPE_TRAVEL_MS` constant | Defer until later | Delete in cleanup stage (measured real travel = 3048 ms) |
| Unused `skills-valley.png` | Defer until later | Delete in cleanup stage after a final reference sweep |
| Wrong `y=687` asset-height comment (PNG is 617 tall) | Safe cleanup | One-line comment fix; may ride along with Stage K |

## 7. Responsive behavior (contracts unchanged, measured numbers)

| Viewport | Zoom | World view | Arrival scrollX | Ground line | Notes |
|----------|------|------------|-----------------|-------------|-------|
| 1440×900 | 2 | 720×450 | 0 | 90% | exit trigger 1350 off-screen on arrival ✓ |
| 1280×800 | 2 | 640×400 | 0 | 90% | ✓ |
| 768×1024 | 2 | 384×512 | 11 | 90% | worst-case camera bottom = 611; strip reaches 620 ✓ |
| 390×844 | 2 | 195×422 | ≈90 | 90% | return-portal wing (x 90..200) visible on arrival ✓ |

- Zoom rule unchanged (`min(2, camHeight/264)` floored to 0.25; short landscape windows auto-zoom out and still show the 264 px content band).
- Strip is a single full-width image → resize-safe by construction, no re-tiling.
- Station pitch 130 world = 260 screen px at zoom 2; mobile view is 195 wide, so at most ~1.5 stations visible — proximity (±132) still picks the nearest; unchanged.
- Video layer `object-fit: cover` full-viewport; unchanged.

## 8. Decisions requested from you

1. Return-portal signage wording: "SURFACE" (destination name) — OK?
2. Portals as 4 separate PNG frames each (8 files) vs one sprite-sheet per portal — separate frames recommended (preload-simple, matches existing asset style).
3. Stations: lit-swap only, no per-station animation — acceptable per minimal-code preference?
4. Fold the gem-gating fix into Stage K, or leave it for the cleanup stage?
