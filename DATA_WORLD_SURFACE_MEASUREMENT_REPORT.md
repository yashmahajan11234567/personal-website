# DATA WORLD — SURFACE STAGE M: MEASUREMENT REPORT

**Branch:** `restore/data-world-386991f`  
**HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d`  
**Date:** 2026-11-16  
**Type:** Measurement-only audit. No source, asset, or config modifications were made. No commits/pushes.
**Git snapshot before:** 132 porcelain lines (36 modified tracked, 94 untracked + 2 staged-style entries), saved to `/tmp/git-status-stageM-before.txt`. Identical after this stage (only the three new report docs were added).

---

## 1. Game world (measured live via `window.__worldScene` / `window.__worldProbe()`, Playwright Chromium, DPR=1)

| Property | Value |
|---|---|
| World size (cliff chapter) | **900 × 900 world px** (`worldWidth=900`, `worldHeight=900`) |
| `groundY` | **560** |
| Robot spawn | **(120, 560)**, grounded=true at spawn |
| Robot sprite | display **56 × 62**, physics body **10 × 14**, depth 10 |
| Camera zoom | **2.0 at every viewport** (constant, set via `setZoom`, not CSS) |
| Canvas | attribute size = CSS size = viewport size (Scale.RESIZE, 1:1 at DPR 1) |

### Visible world rectangle per viewport (zoom 2 → visible = viewport/2)

| Viewport | Canvas (attr=CSS) | view (world) | scrollX at spawn | scrollY at spawn | maxScrollX | ground on screen |
|---|---|---|---|---|---|---|
| 1440×900 | 1440×900 | **720×450** | 0 | **155.0** | 180 | (560−155)×2 = **810/900 = 90.0%** |
| 1280×800 | 1280×800 | **640×400** | 0 | **200.0** | 260 | 720/800 = 90.0% |
| 768×1024 | 768×1024 | **384×512** | 0 | **99.2** | 516 | 922/1024 = 90.0% |
| 390×844 | 390×844 | **195×422** | 22.5 | **180.2** | 705 | 760/844 = 90.0% |

- Camera scrollY at spawn = `560 − 0.9×viewH` (follow centre at 40% vertical bias), clamped to `[0, 900−viewH]`. It changes per viewport; it does **not** change during idle gameplay. scrollX follows the player, clamped `[0, 900−viewW]`; it **does** change while walking.
- **Key discrepancy:** configured world width 900 ≠ visible width on screen. Visible width = viewportWidth / 2 (720 at 1440×900). Portal at world x≈750 is only fully on screen once scrollX ≥ 750+portalW/2−viewW.

## 2. Assets (PIL alpha measurement, threshold α>8)

| Asset | Canvas | Visible bbox (x0,y0,x1,y1) | Visible size | Transparent padding L/T/R/B | floor (bottom) med/min/max | top min |
|---|---|---|---|---|---|---|
| `surface-entry.png` | 428×589 | [11,68,428,585) | **417×517** | 11 / 68 / 0 / 4 | 576 / 230 / 584 | 68 |
| `surface-platform.png` | 1266×617 | [0,115,1235,612) | **1235×497** | 0 / 115 / 31 / 5 | 585 / 215 / 611 | 115 |
| `surface-skills-portal.png` | 427×621 | [2,232,425,617) | **423×385** | 2 / 232 / 2 / 4 | 611 / 607 / 616 | 232 |

- **Image dimensions ≠ visible artwork dimensions.** Entry has 68px transparent top padding; portal has 232px top padding (37% of its canvas height). The platform's walkable line is at source y = 617−124 = **493** (code constant `walkableToBottom=124`), not at the visible bottom (611).
- Visible aspect ratios: entry 417:517 = 0.807, platform 1235:497 = 2.485, portal 423:385 = 1.099.

## 3. Reference composition (approved image, 2172×724, PIL)

| Zone | x-range | width | % of strip | top (min/med) | bottom (med) |
|---|---|---|---|---|---|
| Entry structure | [39, 470] | **432** | **19.9%** | 123 / 139 | 631 |
| Platform | [25, 1676] | **1652** | **76.1%** | 310 / 433 | 654 |
| Skills portal | [1719, 2141] | **423** | **19.5%** | 255 / 256 | 634 |

- Walkable floor line ≈ **y=652** (global bottom-mode; entry/portal bases sit at 631–634, ~18px above the floor's front edge).
- Gap platform→portal: 1677–1718 = **42px (1.9%)**.
- Background above elements: entry top 123 (17% of strip height), portal top 255 (35%), platform top 310–433.
- Reference zone aspect ratios: entry 432:508 = 0.850, platform 1652:~344 above floor ≈ 4.8, portal 423:379 = 1.116.

## 4. Current implementation (live scene readout)

| Art | origin | position | scale | display (world) | world rect (display) | depth | visible |
|---|---|---|---|---|---|---|---|
| platform | (0.5, 1) | (450, 648.15) | **0.7109** | 900×438.6 | (0,209.5)–(900,648.2) | 2 | yes |
| entry | (0, 1) | (10, 560) | **0.5410** | 231.5×318.6 | (10,241.4)–(241.5,560) | 3 | yes |
| portal | (0, 1) | (634.78, 560) | **0.5397** | 230.4×335.1 | (634.8,224.9)–(865.2,560) | 3 | yes |

Hidden legacy visuals (verified): pipes `cliff-entry` (60,560) and `cliff-to-skills` (750,560) containers `visible=false` (triggers intact, probe `pipeCount=2`); chapter label list empty; ledge rim rect (450,561,900×2, depth 1) still visible but covered by platform art.

### Screen-space rects at 1440×900 (zoom 2, scroll 0/155) — current

| Art | screen rect | size | % of 1440×900 | note |
|---|---|---|---|---|
| entry (display) | (20,173)–(483,810) | **463×637** | 32%×71% | visible-art ≈ (32,177)–(483,806) |
| platform (display) | (0,109)–(1800,986) | 1800×877 | wider than viewport (expected, world 900>720 view) | bottom clipped at 900 |
| portal (display) | (1270,140)–(1730,810) | 460×670 | **clipped right**: only 1270–1440 visible at spawn | fully visible only at scrollX=180 → (1090,140)–(1550,810), still clipped! |

**Discrepancy found:** even at max scrollX=180, the current portal's right edge (world 865.2 → screen (865.2−180)×2 = **1370.4**) fits, left edge (634.8−180)×2 = **909.6** — so at full right scroll the portal IS fully visible (909–1370). At spawn it shows only a 170px sliver. Entry/portal are ~24% wider than the reference proportion (current entry 231.5/900 = 25.7% of world vs reference 19.9% of strip).

### Screen rects at other viewports (current, spawn scroll)

| Viewport | entry screen | portal screen |
|---|---|---|
| 1280×800 | (20,83)–(483,720) = 463×637 (36%×80%) | (1270,50)–(1730,720), sliver 170px |
| 768×1024 | (20,284)–(483,922) = 463×637 (60%×62%) | (1270,251)–(1730,922), off-screen |
| 390×844 | (−25,122)–(438,760) = 463×637 (119%×75%, clipped both sides) | (1225,89)–(1685,760), off-screen |

## 5. Formulas used

- `screen = (world − scroll) × zoom`; `view = viewport / zoom`; `ground_screen = (560 − scrollY) × 2`.
- Reference→world scale: `s = 900 / 2172 = 0.41436`. Vertical anchor: ref y=634 (structure bases) → world 560; `worldY(ref) = 560 − (634 − ref) × s`.
- Asset scale from target visible width: `scale = targetVisibleW / assetVisibleW`.

## 6. Evidence screenshots

- `qa-screenshots-acceptance/measure-1440x900-spawn.png` — Surface at spawn, 1440×900
- `qa-screenshots-acceptance/measure-1440x900-right.png` — after walking right (scrollX max), 1440×900
- Probe script (temporary, removed after use): `qa/_measure-surface.mjs`; screenshot script: `qa/_shot1440.mjs`.

## 7. Discrepancy summary

1. World width (900) ≠ visible width (720 at desktop). Any element near x>720 is clipped at spawn by design.
2. All three assets carry transparent padding (entry top 68, portal top 232, platform top 115/right 31); display rects overstate visible art.
3. Current entry/portal scales (0.541/0.540) are ~24% larger than the reference proportion (0.429/0.414) when the 2172px strip is mapped onto the 900px world.
4. Platform asset aspect (2.485) cannot match the reference platform aspect (~4.8) at full 900px width without stretching; full-width coverage forces height 438.6 (current). See LAYOUT_OPTIONS.
5. Portal at pipe x=750 is inherently a right-edge element: at spawn only a ~170px sliver is visible at 1440×900; fully visible at scrollX=180. At 390×844 even at max scroll (705) its left edge (663) is 42 world px off-screen — narrow-viewport trade-off, unchanged by scaling.
