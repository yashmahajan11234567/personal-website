# DATA WORLD — REDESIGN PLAN (Phase A)

Companion to `DATA_WORLD_REDESIGN_AUDIT.md`. This plan prepares the redesign of all three Data World levels (Surface/Start, Skills, Projects) against reference images to be supplied later (one per level). Nothing here is implemented yet; section 8 gives the order for the implementation phase.

Naming used below: **L1 Surface/Start = `cliff` chapter**, **L2 Skills = `skills` chapter**, **L3 Projects = `projects` chapter** (the config ids in `src/game/config/worldConfig.ts`).

---

## 1. Design direction per level (to be finalized against the reference images)

### L1 — Surface / Start (`cliff`, width 900, spawn x=120)
- Cyberpunk surface environment: the existing per-chapter video (`public/assets/backgrounds/surface/bg.mp4`) remains the backdrop unless the reference replaces it.
- A dedicated entry/starting structure at spawn (currently: open ground + floating "DATA WORLD" label plate + entry pipe at x=60 marked START/ORIGIN).
- One clearly visible portal to Skills: the exit pipe at x=750 (`cliff-to-skills`, plate "NEXT: SKILLS").
- RETURN TO PORTFOLIO button: exists shell-level top-left; restyle/rename per reference.

### L2 — Skills (`skills`, width 1500, spawn x=144)
- Six skill stations in content order: SQL / T-SQL, Python / pandas, Excel, Power BI, Tableau, Streamlit (`worlds.data.ts` `skillOrder`). Each gets its own recognizable sign/station visual derived from the reference.
- Portals: entry pipe x=60 → back to Surface; exit pipe x=1350 → Projects.
- Station names/tags already come from the content model; the reference only changes the art, not the words.

### L3 — Projects (`projects`, width 1000, spawn x=144)
- Four project stations, names/descriptions from the real content model — verified: **Nifty-100 Financial Analysis**, **SQL Data Warehouse & ETL**, **PRIMETradeAI**, **Data Analytics Dashboards** (`projects.data.ts`, `projectOrder`). No invented or placeholder projects.
- Portal: entry pipe x=60 → back to Skills. Terminal chapter (no exit pipe) — matches the required graph.

---

## 2. How the reference images will be integrated

Decide per image when it arrives, but the default architecture:

1. **Full-background images** (if a reference covers the whole screen): replace or supplement `BackgroundVideoLayer` for that chapter with an `<img>`/poster layer (keep the video if the reference is only foreground/midground). Keep the Phaser camera background transparent so the React layer shows through — do not move backgrounds into Phaser.
2. **Transparent PNG elements** (stations, signs, portals, platforms): bundle under `src/game/assets/data-world/` (or `public/assets/`) with a manifest like `src/game/assets/robot/manifest.ts`, loaded in `WorldScene.preload()` as `player-robot`-style named textures. Sizes must be integer pixel art compatible with `pixelArt: true` and the 2x-zoom grid.
3. **Procedural redraws** (if an element is simple geometry + text): extend the existing canvas-texture painters (`worldObjects.ts`, `dataPipeSkin.ts`, `facilityArt.ts`) instead of adding bitmaps — keeps bundle small and deterministic for screenshot QA.
4. **Hybrid**: background image + transparent PNG props is the expected case. The separation rule: **art is never interactive by itself** — see §5.

Scaling: reference art will be normalized to world-pixel size at 1x (camera zoom handles display size). Record each sprite's authored size in the manifest next to the robot's 56x62 so hitboxes and placement are computed, not eyeballed.

---

## 3. New platform / floor architecture

Problem being fixed: 10 bare `add.rectangle` ledges floating over the video background (§3 of the audit).

Plan:
- Keep every `WorldPlatform` entry and the static physics body **unchanged** (Phase 1 collision/jump contract). Only the visual changes.
- Replace the bare-rect rendering in `buildTerrain()` with a drawn slab per platform: reuse/extend `drawPlatformSlab` (`facilityArt.ts`) — body, lit top rim, ribs, and **supports/struts down to the floor** (or clamps to background structures) so nothing floats. Render slabs as canvas textures generated once per platform rect (keyed by rect) or one reusable bay texture stretched — prefer per-rect textures for crisp pixel edges at integer zoom.
- Alternatively, if the references show no ledges at all: hide the visual (`setVisible(false)` on the rectangle) while keeping `physics.add.existing(rect, true)` — collision preserved, bars gone. Decide per level from the reference; default is "redesign with supports", removal only where the reference has no ledge.
- Floor: keep `drawSubFloor` tiled bay + 2px cyan rim at `groundY`; redesign its palette/detail to match the reference floor. If a reference includes the floor in its background image, the sub-floor can shrink to just the rim line.

---

## 4. Sign and station architecture

- **Skill stations** (6, 96x104 sprites at ground, pitch fitted from x=200): redraw `drawSkillStation` (or replace with reference PNG) so each skill has a distinct recognizable sign — e.g. per-skill glyph/icon + name plate + screen face with the short tag (`SQL`, `PYTHON`, `EXCEL`, `POWER`, `TABLEA`, `STREAM` — tags currently derive from names via `tagForSkill`; adjust if the reference shows different short labels).
- **Project stations** (4, 176x132 sprites): redraw `drawProjectStation` — banner sign with the real project title (wrapped, max 2 lines), console with screen panels; optionally show the dashboard preview PNGs from `public/assets/dashboards/` on the "Data Analytics Dashboards" station screen if the reference implies it.
- Keep stations content-driven: positions from `buildStations`, labels/tags from `src/content` — the reference changes art and possibly sizes, never the words.
- Chapter label plate near spawn: keep, restyle, or remove per reference.

---

## 5. Interaction zones — art separated from clickability

Current mechanism is already the right shape and stays:

- Each station sprite: `setInteractive({ useHandCursor: true })` with a rectangular hit area covering the sprite bounds → `pointerdown` emits `activate` → React `InfoPanel`. Art and hit zone are independent: if art becomes a PNG, the hit rect stays a plain rect over the sprite (documented in `buildStations`).
- **New: mouse hover glow.** Add `pointerover`/`pointerout` on each station sprite; merge into `updateStations()`: `lit = hovered || nearestInRange`. Keep the two-texture (idle/lit) swap — it is deterministic, pixel-exact, test-friendly (`stationLit` probe), and avoids tints that smear the pixel palette. If the reference wants an additive glow instead, generate an additional glow texture and toggle visibility — do not use `setTint` (multiplies, cannot brighten).
- Pipes: `pointerover`/`pointerout` on the pipe container → `skin.setActive(true/false)` (lit mouth texture already exists).
- Exit button: existing CSS hover/focus-visible; rename label to "RETURN TO PORTFOLIO" (keep `data-testid="world-exit"` and the 44px target; QA depends on them).
- Hover effects must not affect the robot: stations/pipes are non-physics images; pointer handlers only swap textures/emit events. Verify movement keys still work while the pointer rests on a station (keyboard path is unaffected; pointer handlers don't capture keys).

---

## 6. Portal design and navigation

- Portal graph already correct: L1 exit→L2; L2 entry→L1, L2 exit→L3; L3 entry→L2. Keep config; only the pipe art/plate/sign change to match the references (one consistent portal design across all three levels).
- Redraw `drawPipeMouth` + `drawChapterPlate` + `drawSignBoard` per reference; keep 44x60 mouth geometry and `pipeRect` (trigger range depends on it: `PIPE_TRIGGER_RANGE + PIPE_HALF_WIDTH`).
- Portals remain **walk-into trigger + hover lit state**, not click-only; optionally also clickable (`pointerdown` on container → same `transport.start`) for accessibility — the DOM drawer already provides a non-canvas route.
- The 12-phase transport (blackout → scene swap → reveal → emerge) is retained untouched; new pipe art must work with `placePlayerForClimb` (robot depth 2 behind pipe rim depth 4) — keep the mouth taller than the robot's sink frames expect, or adjust `PIPE_HEIGHT` and re-verify the climb frames.
- RETURN TO PORTFOLIO: one shell-level button, top area of every level, distinct from portals (DOM chrome, not world art). Present in all chapters automatically.

---

## 7. Robot compatibility

- Do not touch: `src/game/assets/robot/*` frames (56x62, bottom-anchored), the 10x14 foot hitbox + offset, `updateAnimation()` frame mapping, tube strips, depth rules (10 normal / 2 in pipe), camera tracking.
- All new art is placed around a 56x62 sprite standing on `groundY=560` (or on ledge y values). Station bases, portal mouths, and signs must leave the 10x14 foot box clear and keep the robot visible (depth 10 above stations 6 / pipes 4).
- If the references imply a larger/smaller character, that is out of scope — the brief forbids stretching/replacing the robot.

---

## 8. Recommended implementation order (for the later implementation phase)

1. **Asset intake**: drop the three reference images in, decide per level background-vs-overlay, produce/slice transparent PNGs (or procedural painters), add manifest + `preload()` entries. Verify each loads (texture exists, integer size).
2. **Floor & platforms**: new slab painter / hidden-rect fallback; verify Phase 1 jump/collision assertions still pass unchanged.
3. **Portals & signs**: new pipe skin art + plates + consistent across levels; verify all four routes still travel and the hover lit state works.
4. **Stations**: new skill/project art with idle+lit variants; wire hover glow (pointerover/out merged with proximity); verify click + Enter both open the correct panel and content matches `src/content`.
5. **Shell chrome**: rename exit to RETURN TO PORTFOLIO, position per reference (top area), keep testid + 44px + hover/focus.
6. **Per-level background integration** (video vs image) + reduced-motion poster path.
7. **QA**: run `qa/accept-dataworld-gameplay.mjs`, `qa/accept-dataworld-exit.mjs`, `qa/accept-responsive.mjs` plus navigation probes at 1440x900/1920/390; screenshot-diff against the references; verify zero console errors; verify `__worldProbe` fields.
8. **Commit** as small commits on the current branch (or a new branch from it) — never reset the existing uncommitted work.

---

## 9. Responsive and performance considerations

- `Scale.RESIZE` full-screen canvas already adapts; keep `zoomForViewport` (min 2x, 0.25 steps) so the authored band (y 280..560) always fits; `verticalBiasRatio 0.4` keeps ground at ~90% of viewport.
- Regenerate/tile any full-world-width art per chapter width via `chapterSeed` (deterministic) — never one giant texture; the sub-floor's 64px bay is the model.
- New PNGs: keep small (pixel art), load once in `preload`, reuse textures across chapters (key by element id, not chapter, where art is shared — note `chapterLabelTexture`/station keys are per-chapter today; shared keys are safe because `textures.exists` guards prevent re-draw).
- Videos (~4.5MB each) stay as-is unless replaced by references; keep poster + reduced-motion fallback; `preload="metadata"` for inactive chapters.
- 390px: verify no horizontal overflow and stations remain reachable (existing responsive acceptance test); station pitch fitting (`MIN_STATION_SPACING=96`) already prevents overlap.

---

## 10. Testing and acceptance criteria (summary — details in the checklist doc)

- All four portal routes work by walking in and by hover feedback; portals visually match across levels.
- Each of the 6 skill stations and 4 project stations: hover → visible cyan/magenta glow (lit texture swap), click/Enter → correct `InfoPanel` with content-model data (real names, no placeholders).
- RETURN TO PORTFOLIO visible near the top on all three levels, click → hero (hash cleared), hover/focus states present.
- Robot unchanged: same frames, animations, physics; walks on floor and ledges; climbs pipes.
- No floating bare rectangles; floor/platforms match references; coherent cyberpunk look.
- Existing Playwright suites pass (gameplay, exit, responsive) with zero console errors; probe fields intact.
- Works at 1920/1440/768/390 and under `prefers-reduced-motion`.
