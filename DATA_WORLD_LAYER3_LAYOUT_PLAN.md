# DATA_WORLD_LAYER3_LAYOUT_PLAN.md — Core / Projects chapter, exact coordinate layout

All coordinates are world pixels, y-down, origin top-left of the chapter's own world.
Ground surface is y=560 in every chapter. This plan changes NO code; it is the approved
target for the implementation phase.

## 1. Recommended world dimensions

| Item | Current | Recommended | Why |
|---|---|---|---|
| `PROJECTS_WIDTH` | 1000 | **1500** | Four data servers at a comfortable pitch plus TWO portals need the skills-width run. At width 1000 the auto-fit squeezes servers to pitch 210 (200/410/620/830) and leaves no room for a separate return portal on the right — server 4 (half-width ≥88) would overlap any right-side portal art. 1500 also matches `SKILLS_WIDTH`, so camera scroll ranges and the fitting function behave identically across chapters. |
| World height | 900 | **900** (unchanged, shared) | Facility proportions identical across chapters; `CONTENT_BAND`/`zoomForViewport` coupling depends on it. |
| `groundY` | 560 | **560** (unchanged, shared) | Every portal, station and the player share this line; Phase 1/2 assertions depend on it. |
| Palette | data palette | **unchanged** (`#04060e/#0d1526/#141c30/#22d3ee/#1d2a47`) | Visual continuity with Layer 2; Layer 3 identity comes from the objects, not a new palette. |
| Background video | `backgrounds/core/bg.mp4` | **unchanged** | Already mapped to chapter `projects`. |

## 2. Platforms / ground

- **One continuous ground run**, no floating ledges. Recommend setting `PROJECTS_PLATFORMS = []`
  (the Stage K precedent in Skills: the two current ledges at (320,430,128,16) and
  (520,360,96,16,oneWay) serve nothing — all portals and servers sit on groundY — and today they
  render as bare debug rectangles because `artCoveredLedges` is false for this chapter).
- Walkable area: the full ground slab, x ∈ [8, 1492] (player clamp = `PLAYER.size/2` = 8).
- Ground artwork: 4 tiles (`left / mid / mid-alt / right`), top edge at y=560, assembled from x=0
  at ONE uniform scale `1500 / totalSrcW`. Recommend source tiles 423/508/506/426 × 236 px
  (total 1863) so scale = 0.8051 and display height ≈ 190 — identical math to Skills.
- The 2 existing ledge entries must be removed from `PROJECTS_PLATFORMS` (with their artwork) in
  the same change that adds the tileset, exactly as Stage K did for Skills.

## 3. Portals (Audit B continuation)

Trigger rules (unchanged): near zone = pipe x ± 52; **arm/fire zone = pipe x ± 22**.

### 3.1 Entry portal (Skills → Core) — keep existing pipe
- Pipe: `projects-entry`, **x = 60**, y = 560 (unchanged). Arm zone **38..82**, near zone 8..112.
- Spawn: **x = 144** (60 + `EMERGE_OFFSET` 84), y = 560 — unchanged, right of the arm zone so
  arrival never re-triggers.
- Art: 8-frame portal, origin **(0, 1)** at (0, groundY+pad), display width **180** → art spans
  **0..180**. The visible glowing opening must contain x 38..82 (Layer 2 rule: art follows the
  trigger, not vice versa). Grounded by opaque bounds: `y = 560 + bottomPad·dispH + 3`.
- Depth 3 (above ground tiles at 2, below stations at 6); procedural pipe container for
  `projects-entry` hidden, same guard pattern as skills (`mouth.setVisible(false)` in
  `buildPipes` and in the `onArrive` loop).

### 3.2 Return portal (Core → Skills) — NEW pipe (the "separate portal" the brief requires)
- Config addition: `exitPipe: pipe('projects-to-skills', 1350, 'skills', 'BACK: SKILLS', 'RETURN')`
  in the projects chapter (`1350 = PROJECTS_WIDTH(1500) − 150`, same convention as the other exit
  pipes).
- Trigger: x = **1350**, arm zone **1328..1372**, near zone 1298..1402.
- Art: 8-frame portal, origin **(0.5, 1)** at (1350, groundY+pad), display width **180** → art
  spans **1260..1440**, opening centred on 1350 and containing 1328..1372. Fully inside the
  world (1500) with 60 px right margin — no clipping (the cliff's old 70 px margin clipped the
  sign; 150 keeps plate + sign + tube clear).
- Routing already works with zero transport changes: `chapterViaPipe` sends an exit pipe to its
  `destination` ('skills') and the entry pipe to `previousChapter` ('skills'). Both routes exist.
- `world.pipes` for projects becomes `[projects-entry, projects-to-skills]`; `onArrive` shows
  both (it shows all chapter pipes); the chapter label stays suppressed-or-art as in skills —
  decide at implementation; current procedural label sits at (40, 452).

## 4. The four project data servers (exact positions)

Stations are content-driven (`projectsForWorld('data')`, order = `projectOrder`):
`nifty100-financial-analysis`, `sql-data-warehouse`, `primetradeai`, `data-analytics-dashboards`.

With `PROJECTS_WIDTH = 1500` the existing `buildStations` fitting produces (arithmetic shown so
it can be reproduced): lastAllowed = min(1500−130, 1500−40)−40 = 1330; available = 1130;
fitSpacing = min(250, 1130/3) = 250; pitch = 250; runWidth = 750;
startX = max(200, round(200 + (1130−750)/2)) = **390**.

| # | Station id | Centre x | y (ground) | Display rect (server 220×150) | Hitbox (sprite rect) |
|---|---|---|---|---|---|
| 1 | nifty100-financial-analysis | **390** | 560 | 280..500 × 410..560 | x 280..500, y 410..560 |
| 2 | sql-data-warehouse | **640** | 560 | 530..750 × 410..560 | x 530..750, y 410..560 |
| 3 | primetradeai | **890** | 560 | 780..1000 × 410..560 | x 780..1000, y 410..560 |
| 4 | data-analytics-dashboards | **1140** | 560 | 1030..1250 × 410..560 | x 1030..1250, y 410..560 |

Clearance checks:
- Entry portal art ends at 180; server 1 starts at 280 → 100 px walkway. Arm zone 38..82 never
  overlaps a server. ✔
- Server 4 ends at 1250; return portal art starts at 1260 → 10 px gap. ✔ (keep server display
  width ≤ 220; the pipe sign board sits ≈1180..1312 at ground level behind the server —
  depth 4 vs station depth 6, so the server correctly occludes it; acceptable, verify in QA.)
- Pitch 250 > `INTERACT_RANGE` 132 + body half-width 5 → at most one server is in range at a
  time; nearest-wins logic unchanged. Approach corridor per server ≈ ±132 px of free floor. ✔
- Server sprite: origin (0.5, 1), depth 6, `setInteractive` rect hitbox, idle/lit PNG pair,
  grounded by opaque bounds (`y = 560 + bottomPad·150 + 3`). Source cell recommended 440×300,
  displayed 220×150 (2× integer, pixel-crisp).

## 5. Rendering / depth order in Layer 3

video bg (React, behind canvas) → subfloor+physics ground (0/1) → ground rim (1) →
ground tiles (2) → optional utils (2) → **portals (3)** → pipe containers hidden (4) →
chapter label (5, or baked into art) → **servers (6)** → player glow (9) → player (10) →
travel band (900) → blackout (901).

## 6. Camera and responsive behaviour

- `zoomForViewport`: 1440×900 → zoom 2, view 720×450; 390×844 → zoom 2, view 195×422;
  1920×1080 → zoom 2, view 960×540. Arrival camera snaps to spawn 144 → desktop window
  x 0..720 (entry portal 0..180 fully visible); mobile scrollX ≈ 46, window 46..241 — entry
  portal partially visible on arrival at 390 px (same behaviour as Skills today; QA screenshots
  will confirm the arm zone 38..82 is on screen and reachable).
- `maxScrollX` = 1500 − viewW (780 desktop @1440, 1305 mobile). Exit pipe at 1350 is reached by
  walking; it is NOT visible on arrival (window ends at 720) — the reveal property is preserved.
- Resize: `handleResize` re-derives zoom and re-tiles; servers/portals are world-space objects
  and need no resize logic. `pixelArt` + 0.25-step zoom keeps the pixel grid intact.

## 7. What this plan deliberately does NOT do

No raised platforms for servers (all four on the main ground run — approach room is horizontal,
not vertical); no new palette; no new engine code — the transport, fitting function, interaction
bus, InfoPanel and DOM index already support everything above; only config values (width, one
exit pipe, platform list), one artwork builder (`buildProjectsArtwork`), preload entries, and the
pipe-container hide guards change.
