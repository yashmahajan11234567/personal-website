# State: Pixel Portfolio Game

## Current Status
**Phase**: 1 — COMPLETE (Tasks 0–8)
**Status**: Cinematic hero rebuilt as a continuous code-driven scene, the Q6 world handoff
built and verified. **58 Playwright tests pass**, 116/116 under `--repeat-each=2`.
**Last Updated**: 2026-10-01

**Execution report**: `.gsd/REPORT-PHASE-1.md`
**Rebuild plan**: `.gsd/plans/phase-1-cinematic-rebuild.md`
**Questions**: `.gsd/QUESTIONS-PHASE-1.md` (D1–D5 locked; Q6 resolved and implemented)

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
1. Initialize Vite + React + TypeScript project in `C:/Users/hitoy/Downloads/portfolio_website/`
2. Install GSAP, Phaser 3, and dev dependencies
3. Create project structure per architecture
4. Begin Hero component implementation

---

## Notes
- Reference video frames are in `left side/` and `right side/` — need to analyze for exact timing
- No existing codebase in portfolio_website — greenfield
- GSD templates available in `C:/Users/hitoy/get-shit-done/get-shit-done/templates/`