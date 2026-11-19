# DATA WORLD — SURFACE BLACK RECTANGLE AUDIT

**Branch:** `restore/data-world-386991f` · **HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d` · 2026-11-16
**Method:** runtime inspection of `window.__worldScene` (Playwright Chromium, 1440×900, zoom 2) + pixel analysis of screenshots with PIL. Vision model was unavailable (provider 410), so all findings below are from object-level runtime data and pixel measurement, not eyeballing.

---

## 1. Screenshot-based inventory of visible dark rectangles

Pixel scan of `qa-screenshots-acceptance/m2-1440x900-spawn.png` (before fix): **23,928 px** matching the ledge fill `#141c30` (tolerance <12) above the ground line. They cluster in exactly six boxes, each ~100% dark fill:

| # | screen box (px) | world center | size (world) |
|---|---|---|---|
| 1 | ~(640,630) | (368, 478) | 96×16 |
| 2 | ~(1040,490) | (560, 408) | 80×16 |
| 3 | ~(1400,370) | (740, 348) | 80×16 |
| 4 | ~(940,550) | (530, 438) | 120×16 |
| 5 | ~(1240,410) | (660, 368) | 80×16 |
| 6 | ~(1520,270) | (808, 298) | 96×16 |

These map 1:1 onto `CLIFF_PLATFORMS` in `src/game/config/worldConfig.ts` (ledges re-spaced inside the cliff).

## 2. Runtime object inventory (spawn, cliff)

Top-level scene objects of interest:

| Object | Type | Fill | Depth | Visible | Owner |
|---|---|---|---|---|---|
| 6× ledge rects | `Rectangle` | `#141c30` (`world.palette.ground`) | **0** | **true** | `WorldScene.buildTerrain()` lines ~787-805 — **the black rectangles** |
| ground rim | `Rectangle` 900×2 @ (450,561) | `#CF31AD` | 1 | true | `buildTerrain()` — intentional ground line, hidden under platform art |
| pipe containers @ (60,560), (750,560) | `Container` | — | 4 | false | `buildPipes()` cliff hiding — correct |
| full-screen rect 1440×900 | `Rectangle` | `#04060a` | 901 | false | travel overlay — intentional, only visible during chapter transport |
| entry/platform/portal images | `Image` | — | 2/3 | true | `buildSurfaceArtwork()` — approved artwork |

No other dark-filled GameObjects, no debug overlays, no stale duplicates at initial spawn (17 top-level children). DOM/React overlays: none with opaque dark fills (exit/contents buttons are intentional UI).

## 3. Classification

| Rectangle group | Classification | Recommended correction |
|---|---|---|
| 6 ledge fills `#141c30` on cliff | **Unintended placeholder visual** — superseded by `surface-platform.png` artwork, but never hidden | Hide visual (`setVisible(false)`), keep the static physics body (collision contract) |
| ground rim `#CF31AD` | Intentional, fully covered by platform art | Leave |
| travel overlay `#04060a` depth 901 | Intentional transport fade | Leave |
| pipe containers on cliff | Already hidden (correct) | Leave |

## 4. Root causes (details in ROOT_CAUSE doc)

- **A (black rectangles):** `buildTerrain()` guarded only the 2px rim with `if (!isCliff)`; the ledge `Rectangle` itself was always visible. Comment claimed suppression, code didn't do it.
- **B (legacy visuals after re-entry):** `onArrive` (pipeTransport settle) re-shows every chapter pipe via `mouth.setVisible(chapterPipeIds.has(id))`, overriding the cliff hiding done in `buildPipes()`. Measured: containers flipped to `visible=true` ~3.2s after arriving back on cliff. The scene swap itself is clean (children count returns to 17, no accumulation; mid-travel dumps show the outgoing chapter until the restart lands ~2s later).

## 5. Uncertainties

- Residual dark pixels after the fix (4,146 px above ground at spawn) are background-video and artwork tones within color tolerance, not scene rectangles — confirmed by the runtime object list showing zero visible `#141c30` rects and 0% dark fill inside all six former ledge boxes.
