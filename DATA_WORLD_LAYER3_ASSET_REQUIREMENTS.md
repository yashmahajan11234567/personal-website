# DATA_WORLD_LAYER3_ASSET_REQUIREMENTS.md — asset specs for Core / Projects

No assets are generated in this phase. These are the specs the asset-generation step must hit.
All PNGs: transparent background, pixel-art style, 2× source for crisp display at zoom 2.
Naming uses the `projects-` prefix; every file gets a matching `PRELOAD_ENTRIES` entry in the
same block pattern as the skills assets in `WorldScene.ts`.

## 1. Entry portal (Skills → Core) — at pipe x=60

- Files: `public/assets/data-world/projects-portal-entry-f0.png … f7.png` (8 frames)
- Source size: **220 × 288** (identical to `skills-portal-return-f*.png` so the animation code
  path — 10 fps, 0.8 s loop, reduced-motion static frame 0 — is reusable as-is)
- Displayed: **180 × ~236** (scale = 180/220), origin **(0, 1)**, positioned at x=0,
  grounded to groundY 560 via `textureBottomPad` + 3 px overlap, depth 3
- Art spans world x **0..180**; the visible glowing opening MUST contain the trigger arm zone
  **x 38..82** (the Layer 2 alignment rule: trigger authoritative, art contains it)
- Content: same portal language as Skills but with a "core" accent — a deeper/violet-lit mouth
  inside the same neon-cyan ring so Layers 2 and 3 read as the same universe
- ~5 px transparent bottom padding in each frame is expected (grounding uses the opaque bounds)

## 2. Return portal (Core → Skills) — NEW pipe x=1350

- Files: `public/assets/data-world/projects-portal-return-f0.png … f7.png` (8 frames)
- Source size: **220 × 288**; displayed **180 × ~236**, origin **(0.5, 1)** at x=1350 → art spans
  **1260..1440**; opening centred on 1350 must contain arm zone **1328..1372**; depth 3
- Visually the reverse-direction twin of the entry portal (cooler/return tint vs the warmer
  entry); 60 px right margin, no clipping

## 3. Platform tileset / ground chunks (continuous run, width 1500)

- Files: `projects-ground-left.png`, `projects-ground-mid.png`, `projects-ground-mid-alt.png`,
  `projects-ground-right.png`
- Source sizes: **423 / 508 / 506 / 426 wide × 236 tall** (total 1863 → uniform scale
  1500/1863 = 0.8051, display height ≈ 190, top edge at y=560, depth 2) — same proportions as
  the skills tiles so seams and scale feel identical
- Top edge must read as the walkable surface (bright rim line like skills), body below dark
  with data-world palette (`#0d1526/#141c30/#22d3ee`); left/right caps close the run cleanly;
  opaque (tiles sit over the procedural subfloor, which stays as the physics body only)
- Optional decor, non-colliding, depth 2 (mirror the skills `util-*` pattern):
  `projects-util-vent.png` (~216×147), `projects-util-support.png` (~320×141),
  `projects-util-pipe-h.png` (~324×85) at roughly x=430 / 660 / 1150 — keep clear of the four
  server rects (280..1250 × 410..560) and both portals

## 4. Four project data servers — idle + lit, one pair each

- Files: `projects-server-<id>.png` + `projects-server-<id>-lit.png` for
  `nifty100-financial-analysis`, `sql-data-warehouse`, `primetradeai`, `data-analytics-dashboards`
- Source size: **440 × 300**; displayed **220 × 150** (2×), origin (0.5, 1), depth 6, grounded to
  y=560 with the same opaque-bounds + 3 px rule; hitbox = full 220×150 sprite rect
- Must read as **server racks / infrastructure towers**, NOT terminal rectangles: tall rack body
  with stacked unit slats, LED strips, a glowing screen face, cables to the floor; ~5 px
  transparent bottom pad allowed
- Per-server identity (same pixel language + palette, distinct screen glyph):
  - NIFTY100 — finance rack: screen shows a rising line chart + candles
  - DWH-ETL — three stacked layers (bronze/silver/gold blocks) under a db cylinder
  - PRIME — market rack: sentiment gauge / fear-greed dial, small order-book lines
  - DASH — gallery rack: 2×2 mini dashboard tiles on the screen
- Hover (`-lit`) = pre-drawn brighter variant: screens on, LED/glow stronger, outer rim highlight.
  The code only swaps textures — no tint/scale — so bake the glow into the lit frame
- Idle state must stay readable at 220×150 from 132 px away

## 5. Chapter label (optional)

- Current procedural label renders at (40, 452), depth 5. Either keep it, or bake a
  `projects-chapter-label.png` (~360×44) at the same spot. If baked, add to preload and draw in
  `buildProjectsArtwork`.

## 6. Registration / plumbing checklist (for the implementation phase)

- Add all files to `PRELOAD_ENTRIES` in `WorldScene.ts` (data-world block)
- New `buildProjectsArtwork(world)`: ground tiles loop (top at groundY), utils, both portals
  (AnimationManager, `ANIM` 10 fps, `play(...)`; `setPipeline('Light2d')` if the rest use it —
  match skills), chapter label
- Extend `artCoveredLedges` to include `projects` and set `PROJECTS_PLATFORMS = []`
- Extend the pipe-container hide guards (in `buildPipes` and in the `onArrive` loop) to hide
  BOTH projects pipes once their portal art exists
- Server sprites: replace the procedural fallback with the PNG pairs at display 220×150 when
  `loadProjectStationArt` textures exist (keep the procedural canvas as the pre-load fallback,
  same as skills does)
- QA screenshots land in `qa-screenshots-layer3/`
