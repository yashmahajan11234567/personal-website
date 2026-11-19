# DATA WORLD — SURFACE LAYOUT OPTIONS (A/B/C comparison)

Context: STAGE M measurement report + layout spec. World 900×900, groundY 560, zoom 2 at all viewports (visible width = viewport/2: 720/640/384/195). Reference strip 2172×724 → world scale s=0.41436. Existing assets: entry 428×589 (visible 417×517), platform 1266×617 (visible 1235×497), portal 427×621 (visible 423×385).

---

## Option A — Three independent transparent PNGs, positioned in world space (current architecture, rescaled)

- Platform: scale 0.7109, display 900×438.6, origin(0.5,1) at (450,648.15) — unchanged.
- Entry: scale **0.4295**, origin(0,1) at (10,560) → visible 179×222.
- Portal: scale **0.4144**, origin(0,1) at (662.35,560) → visible 174×160, centered on pipe x=750.

| Criterion | Assessment |
|---|---|
| Reference fidelity | Entry/portal widths match reference (19.9%/19.5% of world). Platform wider ratio than reference (asset aspect lock) — accepted, see below |
| Gameplay alignment | Portal center exactly on exit pipe trigger (750); entry at left margin; spawn (120,560) in front of entry |
| Responsiveness | World-fixed layout + camera zoom handles all 4 viewports; entry fills narrow views (inherent to any fixed world scale) |
| Chapter reuse | Each chapter keeps its own three assets — pattern already used by cliff |
| Cost | 2 scale constants + 2 positions changed in `buildSurfaceArtwork()`; **no new assets** |
| Risk | Low; no asset regeneration, no new code paths |

## Option B — One combined composition PNG (entry + platform + portal in a single canvas)

- Required canvas: 2172×724 (or 1800×600 at 2×), displayed 900×300, origin(0,1) at (0,589.8), floor line → 560.
- Portal must be authored at ref x≈1810 to stay pipe-aligned (reference has it at 1930).

| Criterion | Assessment |
|---|---|
| Reference fidelity | Perfect — composition is baked exactly as drawn |
| Gameplay alignment | Fragile: pipe trigger at 750 must be manually kept inside the baked portal; any pipe move requires re-authoring the image |
| Responsiveness | Bad on narrow viewports: at 390×844 the visible view is 195 world px wide, so the 900-wide composition shows as a 195×64 px strip — structures become tiny; per-element scaling (A) keeps structures readable |
| Chapter reuse | One composition per chapter — works, but each needs full authoring |
| Cost | New authored asset (2172×724), new loader path, artwork regeneration — explicitly discouraged |
| Risk | Medium-high: bakes pixels, breaks the "artwork ≠ gameplay" separation |

## Option C — Full-width platform background + two independent structures (variant of A)

- Same as A, but platform treated explicitly as the repeating/background layer. If platform height must shrink toward the reference (above-floor ≈ 91 world px), the asset at that height is only 457 px wide → would need 2× tiling (visible seam) or a bare floor strip on the right. Rejected: tiling seams + extra code vs. keeping the single full-width platform.

| Criterion | Assessment |
|---|---|
| Reference fidelity | Platform height still locked by aspect at full width; tiling alternative worse |
| Gameplay alignment | Same as A |
| Cost | Extra tiling/edge code for no visual gain |
| Risk | Medium (seams, edge cases) |

---

## Recommendation: **Option A**

1. Matches the reference proportions for the two structures (the actual complaint: oversized entry/portal) using existing approved artwork — no stretching, no regeneration.
2. Keeps the portal visually centered on its pipe trigger and the entry at the left margin; gameplay contracts untouched.
3. Camera-driven responsiveness already proven at 4 viewports by the existing QA suites; world-fixed art behaves identically at any scale.
4. Smallest change: two scale factors and one x-position in `buildSurfaceArtwork()`.

**Exact next-step targets (from LAYOUT_SPEC):**
- entry: scale **0.4295** (display 183.8×253.0), origin (0,1) at **(10, 560)**, depth 3
- portal: scale **0.4144** (display 176.9×257.3), origin (0,1) at **(662.35, 560)** (= 750 − width/2), depth 3
- platform: **unchanged** (scale 0.7109, (450, 648.15), depth 2)
- keep hidden: cliff pipe mouths, chapter label, ledge rims; keep ledge rim rect, all physics, triggers, probe.
