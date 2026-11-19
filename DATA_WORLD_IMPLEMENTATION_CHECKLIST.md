# DATA WORLD — IMPLEMENTATION CHECKLIST (Phase B final, post-reference)

Ordered checklist for the implementation phase (starts only after owner approval). Each item has a measurable acceptance criterion. Branch context: `restore/data-world-386991f`, HEAD `c7184c8`, with the existing uncommitted modifications preserved — never reset/clean/stash/switch. Commit small, frequently, per stage; push only on explicit approval.

Legend: **[code]** source change · **[asset]** art · **[qa]** verification · **[cfg]** config change
References: Ref1 Surface = `image_223767.png`, Ref2 Skills = `image_ef5754.png`, Ref3 Projects = `image_1d871f.png` (copy to `docs/redesign-refs/` at Stage 0). Analysis: `DATA_WORLD_REFERENCE_ANALYSIS.md`; plan: `DATA_WORLD_FINAL_IMPLEMENTATION_PLAN.md`.

---

## Stage 0 — Intake & git safety
- [x] 0.1 Record branch/HEAD/tags; list modified+untracked files (done in Phase B: branch `restore/data-world-386991f`, HEAD `c7184c8`, 5 tags, modified set = WorldShell.tsx/.css, worldConfig.ts, engine.ts, WorldScene.ts, qa/accept-dataworld-gameplay.mjs + 18 screenshots). **[qa]**
- [x] 0.2 Reference analysis complete and written to `DATA_WORLD_REFERENCE_ANALYSIS.md` (OCR + color/region analysis; vision backend was down — method documented). **[qa]**
- [x] 0.3 Copy the three references into `docs/redesign-refs/{surface,skills,projects}.png` (2048×682 each). **[asset]**
- [x] 0.4 Decision recorded in plan §1: keep per-chapter videos as background; game art = transparent PNG slices + procedural painters on the canvas. **[qa]**
- [x] 0.5 Acceptance: `git status --porcelain` shows only planning docs + `docs/redesign-refs/` added; no tracked file modified.

## Stage S — SURFACE / cliff (Ref 1) — **COMPLETE** — review gate before Stage K
- [x] S.1 Asset slices: magenta entry gate with plates "DATA WORLD"/"ENTRY" (left, x≈60–150), tall blue portal shell (right, x=750) with plate "NEXT: SKILLS", floor/strip tiles, 6 ledge slab textures. Implemented as **procedural canvas textures** generated at runtime (no manifest.ts needed; zero console errors). **[asset][code]**
- [x] S.2 Ledge redraw: all 6 cliff ledge bodies unchanged (rects in config untouched); visual = slab texture (body + neon rim + ribs + supports) at same x/y/w/h. No body removed. **[code][cfg]**
- [x] S.3 Floor redraw: keep `groundY=560` + 2px rim + bodies; sub-floor = dark violet bay `#211735` with magenta `#CF31AD` / cyan `#17D3F4` neon trim + panel seams. **[code]**
- [x] S.4 Entry gate is a separate recognizable structure from the exit portal (distinct color/label); exit portal sign reads "NEXT: SKILLS"; portal hover lights the mouth (`pointerover/out` → lit variant). **[code]**
- [x] S.5 RETURN TO PORTFOLIO: `.world-exit` renamed, cyan border per Ref 3, top-left, ≥44px, hover/focus-visible, `data-testid="world-exit"` unchanged. **[code]**
- [x] S.6 **ACCEPTANCE VERIFIED**: `qa/accept-dataworld-gameplay.mjs` (4/4 pass) + `qa/accept-dataworld-exit.mjs` (3/3 pass) + `qa/accept-responsive.mjs` (13/13 pass) all pass; screenshots at 1440×900 + 390×844 captured (surface-1440x900-initial/portal/gate, surface-390x844); robot walk+jump on every ledge identical to baseline; probe fields intact; portal transition Surface→Skills verified (`chapter: 'cliff' → 'skills'`, `travelling: false`).

## Stage K — SKILLS (Ref 2) — review gate before Stage P
- [ ] K.1 **[cfg]** `skillOrder` → `['python','sql','power-bi','tableau','excel','streamlit']` (reference order, confirmed by OCR); verify no other consumer depends on old order. **[cfg]**
- [ ] K.2 Six kiosk stations (≈140×260 world px) at x≈345/505/665/825/985/1145 with per-skill icon tile (Python `#4A9491`, SQL `#0FAAD2`, Power BI `#8FA658`, Tableau `#3E86A5`, Excel `#0A9263`, Streamlit `#8C516F`) + big name sign (PYTHON/SQL/POWER BI/TABLEAU/EXCEL/STREAMLIT). Content from `skills.data.ts` unchanged. **[asset][code]**
- [ ] K.3 Hover merge: `lit = hovered || nearest` in station update; `pointerover/out` on each station; idle/lit texture swap idempotent; pointer cursor; glow = cyan/magenta additive frame + lit texture + brightened sign, tween ≤120ms, no physics/movement interference. **[code]**
- [ ] K.4 Click/Enter on each of the 6 stations opens InfoPanel with the correct skill record (name, evidence, links). **[qa]**
- [ ] K.5 Portals: left (x=60) sign "SURFACE"/"START" → back to cliff; right (x=1350) sign "NEXT: PROJECTS" → projects; both hover-lit, walk-in transport unchanged (12 phases). **[code][qa]**
- [ ] K.6 Floor: lit ground band + cyan strips `#0DCAF8` + lower magenta/purple strips; bodies untouched. **[code]**
- [ ] K.7 Acceptance: probe `stationCount===6`, `chapter==='skills'`; each station: hover → `stationLit` true + glow screenshot; mouse-out with robot nearby stays lit and vice versa; click → correct panel; all 4 pipe routes complete (`travelling=false`, correct chapter); viewports 1440×900/1280×800/768×1024/390×844 all show usable stations + portals + exit button. **[qa]**

## Stage P — PROJECTS (Ref 3)
- [ ] P.1 Four stations (176×132 dais+console+banner kept) with real titles only: Nifty-100 Financial Analysis / SQL Data Warehouse & ETL / PRIMETradeAI / Data Analytics Dashboards — rendered from `projectsForWorld('data')`, not hardcoded. **[asset][code]**
- [ ] P.2 Same hover glow (`lit = hovered || nearest`) + click/Enter → correct project InfoPanel (authorship, limitations, GitHub link). **[code][qa]**
- [ ] P.3 Left portal (x=60) sign "SKILLS" → back to skills; no forward portal. **[code]**
- [ ] P.4 Floor: bright band + one blue strip per project (x≈123/324/537/733) + magenta strips; bodies untouched. **[code]**
- [ ] P.5 Acceptance: `stationCount===4`, `chapter==='projects'`; every on-screen title string matches `projects.data.ts` exactly (no placeholders); hover/click per station verified; RETURN TO PORTFOLIO visible top-left; screenshots vs Ref 3. **[qa]**

## Stage F — Full journey, responsive, robot regression
- [ ] F.1 Full route probe: boot → cliff → skills → surface → skills → projects → skills → exit via RETURN TO PORTFOLIO (`location.hash===''`, hero h1), zero console/page errors. **[qa]**
- [ ] F.2 `qa/accept-responsive.mjs` extended to exactly 1440×900, 1280×800, 768×1024, 390×844: canvas present, no horizontal overflow, exit button visible, stations/portals reachable, text readable. **[qa]**
- [ ] F.3 Reduced-motion: static background poster, game playable. **[qa]**
- [ ] F.4 Robot regression: `git diff` on `src/game/assets/robot/` empty; idle/walk/jump/pipe frames play; hitbox 10×14; camera tracks; probe fields (`x,y,grounded,velocityX,facingRight,playerSpriteHeight`) intact. **[qa]**
- [ ] F.5 Screenshot-diff each level vs its reference; deltas justified in the stage report. **[qa]**
- [ ] F.6 Commit per stage (assets → art code → cfg → qa evidence). Push only on explicit approval. **[qa]**

---

## Per-level acceptance summary

| Level | Must show | Portals (sign) | Stations | Exit |
|---|---|---|---|---|
| L1 Surface (cliff) | magenta "DATA WORLD / ENTRY" gate left; neon-trimmed floor; slab ledges | → Skills ("NEXT: SKILLS", right) | none | RETURN TO PORTFOLIO top-left, click → hero |
| L2 Skills | 6 kiosks, icon+sign each, cyan/magenta glow on hover, neon-striped floor | ← Surface ("SURFACE"/"START", left); → Projects ("NEXT: PROJECTS", right) | Python, SQL, Power BI, Tableau, Excel, Streamlit in reference order, real content | same button |
| L3 Projects | 4 stations with real titles, glow on hover, blue per-project + magenta floor strips | ← Skills ("SKILLS", left) | the 4 real projects only | same button |

Any item that cannot be met without changing a Phase 1-pinned contract (PLAYER config, platform rects, gem x=480, probe fields, `data-testid`s incl. `world-exit`) must be flagged in the stage report **before** the change is made.