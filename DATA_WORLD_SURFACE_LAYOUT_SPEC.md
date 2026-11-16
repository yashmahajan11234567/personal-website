# DATA WORLD — SURFACE LAYOUT SPEC (derived from STAGE M measurements)

Basis: `DATA_WORLD_SURFACE_MEASUREMENT_REPORT.md`. World 900×900, groundY=560, zoom=2 (all viewports), reference strip 2172×724 mapped to world width 900 → **s = 900/2172 = 0.41436**, vertical anchor ref y=634 (structure bases) → world 560.

---

## 1. Recommended composition (Approach A — three independent PNGs, existing assets, aspect preserved)

| Element | World position (origin) | Scale | Display (world px) | World rect | Visible-art rect | Anchor | Depth |
|---|---|---|---|---|---|---|---|
| Platform `surface-platform.png` | (450, 648.15) | **0.7109** (unchanged) | 900×438.6 | (0,209.5)–(900,648.2) | (0,291.3)–(878.8,643.5); walkable line at y=560 | (0.5, 1) | 2 |
| Entry `surface-entry.png` | (10, 560) | **0.4295** (was 0.5410) | 183.8×253.0 | (10,307.0)–(193.8,560) | (14.7,336.3)–(193.8,558.3) = 179×222 | (0, 1) | 3 |
| Portal `surface-skills-portal.png` | (662.35, 560) | **0.4144** (was 0.5397) | 176.9×257.3 | (662.4,302.7)–(838.4,560) | (663.2,398.8)–(837.7,558.3) = 174×160 | (0, 1) | 3 |

Derivations:
- Entry target visible width = 432×s = **179.1** → scale = 179.1/417 = 0.4295. Left margin 10 (approved); reference left = 39×s = 16.2 — same within tolerance. Bottom exactly at groundY (ref base 631 → 561.2; snapped to 560 to sit on the walkable line).
- Portal target visible width = 423×s = **175.3** → scale = 175.3/423 = 0.4144. Centered on exit pipe trigger x=750 (gameplay contract): left = 750 − 176.9/2 = **662.35**. (Reference portal center maps to 800; we deliberately keep the pipe-aligned 750.)
- Platform unchanged: full chapter width is required for a continuous walkable environment; its height is locked to width by the asset's 2.485 aspect. Walkable line (source y=493) lands exactly on groundY=560 with bottom at 648.15: `648.15 − (617−493)×0.7109 = 560` ✓.

## 2. Expected screen rects (zoom 2)

| Viewport | scroll at spawn | Entry visible screen | Portal visible screen (at max scroll) | Ground |
|---|---|---|---|---|
| 1440×900 | (0, 155) | (29,363)–(388,807) = **358×444 (25%×49%)** | scrollX=180: (966,488)–(1315,807) = **349×319 (24%×35%)**; at spawn sliver 1326–1440 | 810 (90%) |
| 1280×800 | (0, 200) | (29,273)–(388,717) = 358×444 (28%×56%) | scrollX=260: (806,398)–(1155,717) = 349×319 | 720 (90%) |
| 768×1024 | (0, 99.2) | (29,474)–(388,918) = 358×444 (47%×43%) | scrollX=516: (294,599)–(643,918) = 349×319 | 922 (90%) |
| 390×844 | (22.5, 180.2) | (−16,312)–(343,756) ≈ full width (entry wider than 195-px view — inherent) | scrollX=705: left edge −84 (clipped), center 750 visible at screen 90 | 760 (90%) |

Background visible above entry at 1440×900: entry display top = (307−155)×2 = **304px (34% of viewport)** — up from 173px (19%) currently, matching the reference's generous sky band.

## 3. Coordinate diagram (world space, y down; view at 1440×900 spawn = x 0–720, y 155–605)

```
y=155 ┌─────────────────────────────────────────────┐  ← camera top (screen y=0)
      │              background video               │
y=291 ├─ platform visible top (screen 272)         │
y=307 │  ┌────────┐                                 │  ← entry display top (screen 304)
y=336 │  │ ENTRY  │  179 wide                       │  ← entry visible top (screen 363)
      │  │ 232→   │                                 │
y=560 ├┬─┴────────┴───┬───────────────┬───┴───────┬─┴─ groundY = walkable = screen 810 (90%)
      ││ entry base   │   platform    │ portal    │ │   bases at 560
      ││  (x=10..194) │   art continues│(662..838) │ │   to 900 (ground collision)
y=648 │└ platform display bottom (walkable line src y=493 → 560)          │
y=900 └─────────────────────────────────────────────┘  world bottom
      x=0   120(spawn)  450   662  750(pipe)  838    900
      [←────── 720 visible at 1440×900 ──────→]
```

Gameplay objects unchanged: pipes at (60,560) & (750,560) — triggers only, visuals hidden on cliff; gem probe x=480; robot spawn (120,560) — inside entry's footprint but robot depth 10 renders in front; six ledge physics bodies + ground collision untouched; ledge rim rect (450,561,900×2) stays as the visual floor line under the platform art.

## 4. If a single combined composition is ever required (Approach B sizing)

- Canvas: **2172×724** (reference space) displayed at 900×300, origin (0,1) at (0, 589.8) so ref floor 652 → world 560: `589.8 − (724−652)×0.4144 = 560` ✓.
- Author portal centered at ref x = 750/0.4144 = **1810** (not the reference's 1930) to stay pipe-aligned; entry at ref x 39; platform 25–1676.
- Transparent margins in that canvas: left 0–25, top 0–123, right 2142–2172, bottom 681–724.
- At 2× authoring resolution: **1800×600**, displayed 900×300 (scale 0.5).

## 5. Contracts preserved (unchanged by this spec)

Robot sprite/physics (56×62 display, 10×14 body, spawn 120,560), ground collision at 560 across 0–900, six ledge bodies, pipe triggers (60/750) and hover, chapter transitions, camera (zoom 2, 40% vertical bias, clamps), `__worldProbe`/`__worldScene`, shell UI/exit button, background video layer, all QA testids. Visual artwork remains separate from collision geometry.
