# DATA WORLD — FINAL IMPLEMENTATION PLAN (Phase B output)

Inputs: `DATA_WORLD_REDESIGN_AUDIT.md` (Phase A architecture audit), `DATA_WORLD_REFERENCE_ANALYSIS.md` (Phase B pixel/OCR analysis of the three reference images), existing code under `src/game/`. Branch `restore/data-world-386991f`, HEAD `c7184c8`. **No code changes in this phase.**

Method note: the vision-analysis backend timed out on every attempt (incl. a 64×64 control), so references were analyzed with Tesseract OCR + OpenCV region/color analysis + robot-frame template matching. Text/geometry = confirmed from pixels; semantics inferred and labeled in the analysis doc.

---

## 1. Final shared architecture (unchanged spine)

- **One shared `WorldScene`** driven by `worldConfig.ts`, one chapter built at a time: `cliff` (900 wide, spawn x=120), `skills` (1500, spawn x=144), `projects` (1000, spawn x=144). Chapter swap stays the 12-phase pipe transport with blackout — untouched.
- **Art separation:** reference artwork is sliced into **transparent PNGs** loaded in `WorldScene.preload()` under `dw-*` texture keys (manifest module mirroring `src/game/assets/robot/manifest.ts`), **plus procedural painters** in `src/game/art/` for sign plates, neon strips, floor panels, and glow variants (cheaper than bitmaps, resolution-independent, matches existing `worldObjects.ts`/`dataPipeSkin.ts` style). Background **videos stay** (`BackgroundVideoLayer`, per-chapter mp4) — the references are ~40–49% black sky, which the videos already supply; game art layers on the transparent canvas over them.
- **Layering (depth order):** video background (DOM) → canvas skyline/parallax (skipped for data world) → sub-floor bay → ground slab + neon strips → ledges/slabs → pipes/portals → stations → signs/plates → robot (top-most actor) → HUD chrome is DOM (WorldShell). Robot never occluded.
- **Interaction zones stay separate from artwork:** stations and pipes keep their own invisible/visible hit containers with `pointerover/out/down`; no whole-image click zones. InfoPanel DOM drawer via `interactionBus` unchanged.
- **Robot untouched:** 26 frames, 56×62 cell, 10×14 foot hitbox, speeds, camera follow, transport animations. All new art is placed around x/y dimensions already in config.

## 2. Per-level plans

### L1 Surface — chapter `cliff` (Ref 1 = `image_223767.png`)
- **Entry structure (left, x≈60–150):** replace bare entry pipe + floating label with a distinct magenta neon gate/building (PNG slice or procedural frame) carrying the plate **"DATA WORLD / ENTRY"**. Keep the pipe mouth + `pipeRect` walk-in trigger for the (unused-by-route but configured) entry pipe; the gate is its visual shell.
- **Portal → Skills (right, x=750):** tall blue portal (x≈78–98% of a 900-wide view ≈ 700–880) with destination plate **"NEXT: SKILLS"** (text confirmed in Ref 1). Same pipe trigger, restyled skin, hover lights the mouth.
- **Floor:** keep `groundY=560` and physics; redraw sub-floor as dark violet bay with neon-trimmed ground rim (magenta/cyan, per Ref 1 palette `#CF31AD`/`#17D3F4` on `#211735` base) + panel seams. Reference floor band ≈ y 72–79% of a 682px-tall render ≈ ground area — consistent with groundY=560/900.
- **Floating bars (6 ledges in cliff):** keep all 6 physics bodies; redraw each as a proper slab (body + lit rim + ribs + supports down to the floor) OR remove the visible rect only where the reference shows no ledge — decision recorded per-ledge in config (`ledgeArt: 'slab' | 'hidden'`). Never delete the body.
- **Mid props:** the reference shows attached mid structures (x≈26–70%, y≈47–59%) — draw as decorative background props with **no** physics.
- **RETURN TO PORTFOLIO:** shell button top-left, renamed (see §5).

### L2 Skills — chapter `skills` (Ref 2 = `image_ef5754.png`)
- **Exactly six stations**, reference order **Python → SQL → Power BI → Tableau → Excel → Streamlit** (x-centers ≈ 23/33.7/44.4/54.7/65.3/76.2% of 1500 ≈ 345–1145, pitch ≈ 160 world px — matches the current fitted run from x=200 at 130px pitch; only the **order** changes). Config change: `skillOrder` in `src/content/worlds.data.ts` → `['python','sql','power-bi','tableau','excel','streamlit']` (content records untouched).
- **Station design:** tall kiosk/monolith ≈ 9–10% of chapter width × 29% of height (≈ 140×260 world px), each with: per-skill icon tile (reference icon colors: Python teal `#4A9491`, SQL cyan `#0FAAD2`, Power BI olive-yellow `#8FA658`, Tableau blue `#3E86A5`, Excel green `#0A9263`, Streamlit mauve `#8C516F` — per-skill accent configurable in worldConfig `skills[]`), name sign plate below the icon (big readable text, confirmed OCR strings), idle + lit texture variants (existing mechanism).
- **Portals:** left edge (x=60) back to Surface, right edge (x=1350) to Projects; signs carry **destination identity** — "SURFACE"/"START" (left) and **"NEXT: PROJECTS"** (right, "PROJECTS" confirmed in Ref 2). Same shared portal skin as L1/L3.
- **Floor:** lit ground band + **cyan strips** (Ref 2 cyan `#0DCAF8` strips at y≈72–74%) + magenta/purple strips lower (y≈83–86%). Keep groundY and bodies; art only.
- Robot spawns near the left portal (Ref 2 shows it at x≈29% ≈ 440 — spawn x=144 + walk right is fine; no change).

### L3 Projects — chapter `projects` (Ref 3 = `image_1d871f.png`)
- **Exactly four stations**, real content only: **Nifty-100 Financial Analysis, SQL Data Warehouse & ETL, PRIMETradeAI, Data Analytics Dashboards** (sign strings confirmed in Ref 3; sourced from `projectsForWorld('data')` / `projects.data.ts`, never hardcoded). Banner signs at y≈24–40% of render, x-spans ≈ 14–32/30–48/48–68/66–92% of 1000 ≈ 140–920 world px — matches the current fitted run from x=200.
- **Station design:** dais + console + banner (current 176×132 form factor kept) restyled to reference: banner with real title, supporting screen behind, per-station accent.
- **Portal → Skills (left, x=60):** sign **"SKILLS"** (confirmed in Ref 3, destination identity). No forward portal (terminal level) — matches route graph.
- **Floor:** bright ground band + **one blue strip per project** (Ref 3 blue strips at x≈12.3/32.4/53.7/73.3%) + magenta strips (x≈9.7–81.3%). Art only; physics untouched.
- **RETURN TO PORTFOLIO top-left:** Ref 3 confirms a cyan-bordered button at x≈2–21%, y≈2–14% — this is exactly the existing `.world-exit` DOM slot (top:10px left:10px). Rename label, restyle to cyan border/dark fill, keep `data-testid="world-exit"` and behavior.

## 3. Platform & collision strategy (bars without breaking physics)

- All 10 ledges = `add.rectangle` visual + physics body at the same rect (`WorldScene.ts` buildTerrain, lines ≈769–780). **Physics config is frozen** (Phase 1-pinned: platform rects, gem x=480, probe fields, testids).
- Visual-only redesign: generate a per-ledge canvas texture (slab: dark body, neon rim matching the level palette, ribs, support struts to the floor, drop shadow) and swap `setFillStyle` rect for `add.image(texture)` at the same x/y/w/h, or set the rect invisible and add the image. Hit containers and `INTERACT_RANGE` logic untouched.
- `ledgeArt` flag per ledge in worldConfig lets a ledge be visually hidden where the reference has no platform, **without** removing its body (body stays, invisible visual). Documented per ledge in the checklist.
- Acceptance: `qa/accept-dataworld-gameplay.mjs` platform/jump assertions still pass; robot walks/jumps onto every ledge identically to baseline `386991f`.

## 4. Stations, signs, hover glow, click

- Stations keep their container + two-variant (idle/lit) texture swap. **Hover merge:** add `pointerover`/`pointerout` on each station container tracking a `hovered` set; in the existing per-frame station update compute `lit = hovered || nearestInRange` (nearest = current proximity logic, `INTERACT_RANGE=132`). Idempotent `setActive` swap — no flicker when both true. Pointer cursor via `setInteractive({cursor:'pointer'})`. Click/Enter still routes through the unchanged interaction bus → InfoPanel DOM drawer with the real skill/project record.
- Glow look: cyan `#0DCAF8`/magenta `#CF31AD` (level palette) additive glow frame behind/around the station + lit texture + sign plate brightens; smooth via the existing texture swap + a short `alpha`/scale tween (≤120 ms) that never touches physics or movement.
- Portal hover: same `pointerover/out` → lit pipe mouth (no transport until walk-in, unchanged).

## 5. Navigation

- Route graph frozen: Surface→Skills, Skills→Surface, Skills→Projects, Projects→Skills (already in config; verify by probe in QA).
- Portal signage = destination identity on all four portals ("NEXT: SKILLS", "SURFACE"/"START", "NEXT: PROJECTS", "SKILLS") — no generic labels; never styled like the exit button.
- **RETURN TO PORTFOLIO:** the existing shell-level `world-exit` button (present in all chapters automatically) renamed to "RETURN TO PORTFOLIO", cyan-bordered per Ref 3, top-left, ≥44px target, hover/focus-visible styles kept, click → `onExit` → hero (`qa/accept-dataworld-exit.mjs` must still pass — it keys off `data-testid`, not label).

## 6. Asset preparation

- Copy the three 2048×682 references into `docs/redesign-refs/` (untracked until implementation commits).
- Slice per element at implementation: entry gate (L1), portal shell (shared), 6 skill kiosk bodies + 6 icon tiles (L2), 4 project dais+banner art (L3), floor/strip tiles per level, sign plates (procedural text preferred — pixel font already exists in `pixelFont.ts`).
- Manifest module `src/game/assets/data-world/manifest.ts` with authored pixel sizes; load in `preload()`; textures keyed `dw-*`. Memory: keep slices ≤ 512px wide each, PNG-8/24, total new art target < 1.5 MB; videos unchanged.

## 7. Responsive & performance

- Viewports to verify: **1440×900, 1280×800, 768×1024, 390×844** (existing `qa/accept-responsive.mjs` covers 1920/1440/768/390 — extend to the brief's exact set incl. 1280×800 and 768×1024; data-world canvas is full-viewport fixed, camera zoom 2 with `maxScrollY` — unchanged).
- All six stations reachable by camera pan at 768/390 (chapter 1500 wide); portal hit areas ≥ 44×60 world px; exit button always visible (DOM, above canvas).
- Perf: ≤ 12 new textures, no per-frame allocations in station update, glow via pre-rendered texture variants (not runtime filters), videos muted+loop as today. Watch: canvas texture generation at chapter build is already the pattern — reuse.

## 8. Implementation sequence & dependencies (post-approval)

1. **Stage S — Surface/cliff only:** assets (gate, portal, floor, ledge slabs) → floor/ledge redraw → portal skin + hover → entry gate → RETURN TO PORTFOLIO rename → QA (gameplay suite, exit suite, responsive, screenshots vs Ref 1) → **review gate**.
2. **Stage K — Skills:** skill order config change → 6 kiosks + icons + signs → hover merge `lit = hovered || nearest` (shared code, benefits L3 too) → portals both sides → floor strips → QA vs Ref 2 → **review gate**.
3. **Stage P — Projects:** 4 stations with real titles → portal sign "SKILLS" → per-project blue strips + magenta floor → QA vs Ref 3 → full-journey QA (boot→L1→L2→L3→back→exit, zero console errors) → **final review**.
4. Small commits per stage (assets → art code → config → qa evidence); push only on explicit approval. Never touch robot files, `pipeTransport.ts` phases, interaction bus, or pinned test contracts without flagging first.

## 9. Risks / open questions

- Vision backend was down during analysis — semantic reading of refs is OCR/geometry-based; owner should eyeball `DATA_WORLD_REFERENCE_ANALYSIS.md` before approving Stage S. (Mitigation: refs also stored on disk for re-inspection.)
- Back-portal sign strings on Ref 2/3 left edges were not OCR-readable — plan assumes destination labels ("SURFACE"/"SKILLS"); confirm at Stage K/P review.
- Reference shows the whole chapter in one frame (overview), while gameplay camera shows ~53% of skills at 1440 — stations must remain reachable/usable at all four viewports; layout math in §7.
- Skill order change touches `worlds.data.ts` — confirm nothing else depends on the old order (audit says only world building reads it).
- Ledge "hidden" visual mode is new config surface — must not affect bodies; covered by gameplay suite.
- Asset slicing from 2048px refs: exact world-px sizes chosen at Stage S; keep integer scaling to avoid blur at zoom 2.
