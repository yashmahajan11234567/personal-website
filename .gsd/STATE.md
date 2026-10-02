# State: Pixel Portfolio Game

## Current Status
**Phase**: 1 — COMPLETE (Tasks 0–8), through the typography refinement passes
**Status**: Cinematic hero rebuilt as a continuous code-driven scene, the Q6 world handoff
built and verified, world plates given printed technical interiors, and the opening state
plus all six major typographic roles corrected against measured reference geometry.
**100 Playwright tests pass, 0 failed.**
**Last Updated**: 2026-10-02

**Execution report**: `.gsd/REPORT-PHASE-1.md`
**Rebuild plan**: `.gsd/plans/phase-1-cinematic-rebuild.md`
**Questions**: `.gsd/QUESTIONS-PHASE-1.md` (D1–D5 locked; Q6 resolved and implemented)

### Phase 1 commit trail

| Commit | Change |
|---|---|
| `8f483bf` | Scroll choreography retimed to the reference's measured motion |
| `1124542` | World plates given a printed technical interior |
| `55f4539` | Opening state restored (reduced-motion track, measured type boxes) |
| `f1d9a18` | Scroll-sampling tests made to wait on movement, then stillness |
| `c413696` | Headline undistorted (`scaleX` 1.20–1.29 → 1.000) and tracking opened |
| `3e5ab0f` | Typography composed inward around the figure |
| `0f7377e` | Headline enlarged; Cloud wordmark centred on its plate |

---

## Phase 1 — typography and opening-state refinements (2026-10-02)

All values below are **measured in Chrome**, not estimated. Reference authority is the
`f0003` opening frame and the frame-96 selection hold, as before.

### Opening state (defect found by human QA)

`prefers-reduced-motion: reduce` rendered the **final** composition at load with zero scroll
range: `CinematicHero.css` collapsed the hero to `100vh` while `settled={reducedMotion}` forced
every layer to its end state. Fixed with a `.cinematic-track` wrapper carrying
`trackHeightVh(viewportWidth)`, so reduced motion keeps a real ~4320px track and the
scroll-driven timeline, only without scrub smoothing. Normal motion was always correct
(~5040px track, hidden plates at load, continuous and reversible).

The headline was also clipped: it used an **invented lateral entrance** of ±14vw that the
reference does not contain (frames 1–14 show identical word extents), and its boxes were the
wrong size and position. Measured reference ink: `PERSONAL` x 0.0367–0.3789,
`PORTFOLIO` x 0.6117–0.9719, both at y 0.354–0.510.

### Typography — three sequential corrections

| Pass | Problem | Fix |
|---|---|---|
| Undistort | `scaleX` was **1.20–1.29** because Impact's advance-per-cap-height (0.406) is far narrower than the reference's 0.489 | Fitter rewritten to solve **cap height**, then distribute leftover width as **positive tracking**; `scaleX` now **1.000** |
| Compose inward | Words were edge-anchored: margins 3.7% / 2.8% | Both boxes moved inward 0.012 → margins ~5.0% / 5.0% |
| Restore size | Read slightly undersized | Rects +8% height, +4% width → cap height +2.9% to +9.5% depending on viewport |

**Why the headline cannot simply be 10–15% larger.** The horizontal budget between the frame
edge and the figure is fully consumed:

```
left budget  524px = 424 ink + 64 margin + 36 figure clearance
right budget 551px = 446 ink + 64 margin + 41 figure clearance     spare: 0px
```

A 10–15% width increase overlaps the figure by 6–26px. The figure's silhouette at the
headline band is x 0.4094–0.5695 (measured across rows y 0.354–0.510 of `f0003`, because
`HEAD_BLOCK` only covers head height). So growth was split: **+8% cap height, +4% width**,
with the width taken evenly from both outer margins since the figure is a shared obstacle.

**The narrow viewports cannot take the full height gain.** `probe-fit-constraints.mjs`
shows `WIDTH` binds the fit at every viewport except 1280×720, because the box aspect
collapses (3.96 at 1280×720 → 1.59 at 768×1024 → 0.98 at 390 mobile). The 14–16% headroom
above the solved size is **exactly the cost of `MIN_TRACK_EM = 0.02`** — recovering it would
mean zero tracking, i.e. re-introducing the cramping that was deliberately removed.

### Plate wordmarks

Measured, not assumed: the Cloud block was **not** lower-left. Its centre sat at x **0.4875**,
which is exactly `0.5` less this file's own 2.5% inward inset. The defect was entirely
**vertical** — centre y **0.653** against a plate centre of 0.500, caused by
`justify-content: flex-end`.

Fixed with `justify-content: center`, **not** a padding value. CSS percentage padding
resolves against plate **width** while the target is a fraction of plate **height**;
measured best `padding-bottom` missed by 0.5% at 1280×720 and **9.1% at 1024×768**, where no
value could reach the target. Flex centring holds at 0.480 / 0.475 / 0.472 / 0.475 / 0.456
across five aspects including portrait — mean 0.4533, already just above true centre, which is
the optical centre for a two-line title. Clear space around the wordmark is 116px above,
104px below.

An attempted optical bias via `transform` was **silently ignored** because the plate's
transform is owned by the reveal animation — only measurement caught it.

### A recurring measurement trap

The figure's **element box is far wider than its silhouette** (measured 372px vs 556px at
1280×720, because the anchor art carries a transparent margin). Comparing typography against
`getBoundingClientRect()` of the figure reports an **overlap that does not exist** — this
produced two false "collision" readings before it was identified. Clearance is therefore
asserted from **pixels**: column-profile the rendered frame, split at 0.42/0.58 of the
viewport, and the gap between those ink runs *is* the clearance.

Similarly, rendered cap height is **not** a constant fraction of viewport height (the fitter
caps by width), so size assertions use **measured per-viewport baselines** captured from the
pre-change render.

---

## Locked Decisions — 2026-10-01

| # | Decision |
|---|---|
| **D1** | The 8 s clip `Video_transition_with_text_and_20261001151641.mp4` is the **authoritative reference** for motion, choreography, typography movement, board entrance/exit, composition, and timing. Frame sequences and older videos/images are **secondary visual asset references only** and must not override it. Motion is recreated in code; the video is never embedded as the hero. |
| **D2** | **Hybrid rendering.** Existing cinematic figure/artwork is preserved and reused. All typography is recreated as **live DOM/SVG**. |
| **D3** | The blank-white sequence tails (left final 19.2 %, right final 34.4 %) are **not** meaningful content. Use meaningful content, then transition into the coded scene. |
| **D4** | **Monochrome by default.** World identity via restrained light-blue (Data) / light-orange (Cloud) atmospheric glow on hover/focus only; returns to monochrome on unhover; may intensify during transition. |
| **D5** | The **central figure stays fixed** for the entire cinematic. The sequence tails' figure exits are discarded. |

---

## Phase 1 — reference-fidelity retiming (2026-10-01)

The reference video was re-measured frame-by-frame (all 192 frames) and the
scroll choreography was corrected. Documents: `.gsd/VIDEO-TRANSITION-ANALYSIS.md`,
`.gsd/CURRENT-VS-REFERENCE.md`, `.gsd/PHASE-1-SCROLL-TRANSITION-PLAN.md`.

**The finding**: the beat boundaries never actually matched the video. An earlier
report claimed they did, but that check compared only the *final* composition —
the transit itself was unverified. The board reveal was arriving ~40% of the
scroll track too late, entering from the wrong edge (fade-in at head height
rather than rising through the frame bottom).

### Corrections applied

| Element | Before | After | Source |
|---|---|---|---|
| `boards` beat | 0.28 – 0.46 | **0.23 – 0.50** | video frames 44–96 |
| `lock` beat | 0.46 – 0.52 | **removed** | video has no settle beat |
| `SELECTION_START` | 0.52 | **0.50** | motion ends at t 3.96s |
| Plate start offset | +52vh, opacity ramp | **+63.1vh, visibility gate** | measured travel distance |
| Plate stagger | 4% | **0 (lockstep)** | identical y to 4dp at every sample |
| Rise easing | `easeOutBack` (overshoot) | **`easeOutSine`** | least-squares fit, RMSE 0.021 |
| Headline exit | over `lift` only, −42vh | **anchor mid → `lift` end, −120vh** | clears frame by t 1.42s |

`easeOutSine` was chosen by fitting candidates against the video's ten measured
plate positions: sine RMSE 0.021, quad 0.023, cubic 0.117, linear 0.154,
expo 0.271.

### Result

Plate-top deviation across the rise window, video vs implementation:

| Scroll | 25% | 29% | 33.3% | 41.7% | 50% |
|---|---|---|---|---|---|
| Δ | −0.018 | +0.000 | +0.004 | +0.001 | −0.024 |

Previously 29% and 33% had **no plate at all**. Figure remains stationary and
within 0.007 of the reference at every scroll position.

### Method caveat

`vision_analyze` was rate-limited (503) for this pass, so all findings are
numeric. Element identities are inferred from geometry, not read visually. One
vision pass over the contact sheet should confirm the wordmark choreography when
the limit resets.

### New regression tests

Five tests added to `qa/phase1/cinematic.spec.ts` asserting beat boundaries,
rise-from-below, lockstep, no overshoot, and static hold. These exist because
every functional test passed while the transit was ~40% wrong.

---

## Phase 1 Rebuild — Discovery Findings (2026-10-01)

Measured from the authoritative reference video (1280×720, 24 fps, 192 frames, 8.000 s):

- **Selection becomes interactive at t = 4.0 s = 50 %.** The final 4 s are a static hold
  (< 1.5 % frame diff). The video **ends at the selection state** — no world-entry transition.
- **The central figure never moves.** Centroid x 0.491–0.492, y 0.832–0.872 across 32 samples.
- **Measured selection composition** (fractions of frame): Data board x 0.066–0.342, y 0.247–0.554;
  Cloud board x 0.634–0.935, y 0.303–0.544; figure x 0.291–0.698, y 0.104–0.912.
  ~~**Boards are asymmetric** — the Data board is taller (two lines) and sits higher.~~
  **CORRECTED 2026-10-01:** that was a measurement error — thresholding at `luma<110`
  clipped the plates at their printed-content gaps. Re-measured three independent ways
  (column scans, plate-band scans, vision): the plates are **symmetric** in size and
  vertical placement (top delta 0.0028, height delta 0.0042, width delta 0.0060). The
  visible asymmetry is **content** — line counts, icon rows, type scale. Geometry and
  tests are corrected in `selectionGeometry.ts` and `BoardLayer.tsx`.
- **Defect: hit regions do not match the artwork.** Config says Data `0.15–0.45`, Cloud
  `0.55–0.85`. Measured values are wrong on both; the Cloud target overhangs the right edge.
- **Defect: black-frame offsets are asymmetric.** Code hardcodes left 8 / right 2; measured is
  **8 on both** (content from t 0.375 s / 0.360 s). Not structurally significant.
- **Defect: `cinematic-beats.json` figure-divergence claim** (t 3.0–3.46 s) is unsupported by the
  reference. Dropped.
- **Defect: reduced motion auto-advances** to selection after 1000 ms, contradicting the brief's
  requirement that nothing be auto-selected.
- **Reference video is byte-identical** to `public/videos/selection-transition.mp4`
  (MD5 `709764b10f58229265a029d54bcca3b8`).
- **No git repository** in the project.

### Frame sequences (secondary reference only, per D1–D3)

| | Left (Data) | Right (Cloud) |
|---|---|---|
| Frames / size | 232 / 800×450 | 223 / 800×450 |
| Total | 11.041 s | 11.960 s |
| Black head | idx 0–7, content from t 0.375 s | idx 0–7, content from t 0.360 s |
| Last content frame | idx 202, t 8.916 s (80.8 %) | idx 184, t 7.840 s (65.6 %) |
| End state | DATA board dominant, figure cropped right | CLOUD/DEVOPS board dominant, figure gone left |
| Shared intro | identical to t ≈ 2.5 s, diverges after | |

Left folder = **Data**, right folder = **Cloud** (verified visually at t = 3.2/4.5/6.2/7.5 s).

---

## Phase Progress

### Phase 1: Hero + Transition + Path Selection — SUPERSEDED BY REBUILD
> The 2026-09-30 attempt below is **superseded** by the rebuild plan. It swaps rendering medium
> mid-cinematic (frames → `<video>`), which violates the brief's continuity requirement, and its
> timing, hit regions, and reduced-motion behaviour are all incorrect against the reference.
> Retained for history only. Do not treat these checkmarks as current-state claims.
- [x] 1.1 Project setup (Vite + React + TS)
- [x] 1.2 Dependencies (GSAP, Phaser 3)
- [x] 1.3 Reference frame analysis (both frame directories analyzed)
- [x] 1.4 Frame-sequence renderer (FrameSequenceCanvas) — **to be removed**
- [x] 1.5 Hero visual reconstruction using actual frames — **to be replaced (D2)**
- [x] 1.6 Scroll-driven frame animation — **superseded by §4/§5 beats**
- [ ] 1.7 Path selection — **superseded by §10–§12**
- [x] 1.8 Placeholder game transition
- [x] 1.9 Reduced-motion accessibility — **incorrect; auto-selects. Rebuilt in Task 7**
- [x] 1.10 Visual verification — **against the wrong reference. Redone in Task 9**

### Phase 1 Rebuild (current) — 11 tasks, 7 STOP gates
See `.gsd/plans/phase-1-cinematic-rebuild.md` §25–§26. **Task 0 not yet started.**

---

### Phase 2: Reusable Gameplay Foundation
- [x] 2.1 Phaser-React integration (`<GameCanvas />`)
- [x] 2.2 BaseScene class for shared functionality
- [x] 2.3 Pixel character sprite sheet (idle, walk, jump) - procedural generation
- [x] 2.4 Keyboard controls: ←/A, →/D, ↑/Space, ↓/S, E, ESC
- [x] 2.5 Physics: gravity, platforms, collision, camera follow
- [x] 2.6 React-Phaser event bridge (game → React modals, React → game commands)
- [x] 2.7 Game state store (Zustand): current world, player position, progress
- [x] 2.8 Asset loading pipeline for pixel art (procedural generation)
- [x] 2.9 Debug overlay (FPS, position, state)

**Blockers**: None

**Agent Assignments for Phase 2:**
| Task | Agent | Purpose |
|------|-------|---------|
| 2.1-2.2 | frontend-developer + software-architect | Phaser-React bridge, scene system |
| 2.3 | technical-artist | Pixel character sprite sheet |
| 2.4-2.5 | game-designer | Controls, physics, camera |
| 2.6 | frontend-developer | React-Phaser event bridge |
| 2.7 | frontend-developer | Game state store |
| 2.8 | technical-artist | Asset pipeline |
| 2.9 | game-designer + frontend-developer | Debug overlay |

**Verification:**
- Visual: Character moves correctly in test scene
- Functional: All 6 controls work, camera follows
- Integration: React modals open from Phaser interactions
- Performance: 60fps on target hardware

---

### Phase 2: Reusable Gameplay Foundation
- [x] 2.1 Phaser-React integration (`<GameCanvas />`)
- [x] 2.2 BaseScene class for shared functionality
- [x] 2.3 Pixel character sprite sheet (idle, walk, jump) - procedural generation
- [x] 2.4 Keyboard controls: ←/A, →/D, ↑/Space, ↓/S, E, ESC
- [x] 2.5 Physics: gravity, platforms, collision, camera follow
- [x] 2.6 React-Phaser event bridge (game → React modals, React → game commands)
- [x] 2.7 Game state store (Zustand): current world, player position, progress
- [x] 2.8 Asset loading pipeline for pixel art (procedural generation)
- [x] 2.9 Debug overlay (FPS, position, state)

**Dependencies**: Phase 1 complete

---

### Phase 3: Data Path Vertical Slice
- [ ] 3.1 Data Skills World
- [ ] 3.2 Skill interaction modal
- [ ] 3.3 Pipe Transition
- [ ] 3.4 Data Projects World
- [ ] 3.5 Project detail modal
- [ ] 3.6 Game Complete screen
- [ ] 3.7 Post-Game transition

**Dependencies**: Phase 2 complete

---

### Phase 4: Cloud/DevOps Path
- [ ] 4.1 Cloud Skills World
- [ ] 4.2 Cloud Travel
- [ ] 4.3 Cloud Projects World
- [ ] 4.4 Cloud project data
- [ ] 4.5 Post-Game merge

**Dependencies**: Phase 3 complete + validated

---

### Phase 5: Shared Post-Game Sections
- [ ] 5.1 Experience section
- [ ] 5.2 Certifications section
- [ ] 5.3 Contact section
- [ ] 5.4 Footer + nav
- [ ] 5.5 Responsive design
- [ ] 5.6 SEO + meta

**Dependencies**: Phase 4 complete

---

## Asset Inventory

### Reference Frames (from portfolio_website/)
- **Left side**: 232 frames (frame_000 to frame_231) — hero transition reference
- **Right side**: 223 frames (frame_000 to frame_222) — hero transition reference
- Both sides: ~17.5MB and ~14.8MB zip archives

### To Be Created
- Pixel character sprite sheet (idle, walk, jump)
- Data world tileset (industrial)
- Cloud world tileset (floating platforms)
- Pipe sprites (transparent curved)
- Skill/project station sprites
- UI icons

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-29 | Use get-shit-done GSD templates for planning | Established spec-driven workflow |
| 2026-09-29 | React + Phaser 3 + GSAP stack | Matches requirements; clean separation |
| 2026-09-29 | Data path first, Cloud path later | Vertical slice validation before parallel work |
| 2026-09-29 | Placeholder data for skills/projects | User will provide real data later |

---

## Next Actions

Phase 1 is complete and verified. Phase 2 is **blocked pending explicit user approval** —
the brief is explicit: *"Do NOT start Phase 2. Do NOT modify the world gameplay."*

1. **Await Phase 2 approval.** No gameplay work until the user lifts that constraint.
2. When approved: reusable gameplay foundation (Phase 2), then the Data vertical slice.
3. Optional polish, only if requested: the world gameplay is still unimplemented by design,
   so `#/data-world` and `#/cloud-world` currently resolve to real routes that mount a
   placeholder world rather than a playable one.

Previously listed and now done: Vite + React + TypeScript init, GSAP/Phaser install, project
structure, and the hero implementation.

---

## Notes
- Reference video frames are in `left side/` and `right side/` — need to analyze for exact timing
- No existing codebase in portfolio_website — greenfield
- GSD templates available in `C:/Users/hitoy/get-shit-done/get-shit-done/templates/`