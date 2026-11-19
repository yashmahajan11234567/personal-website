# DATA WORLD — SURFACE BLACK RECTANGLE FIX REPORT

**Branch:** `restore/data-world-386991f` · **HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d` · 2026-11-16
**Assessment: PASS** (all acceptance criteria met, verified at runtime + pixel level). **No commits or pushes.**

---

## 1. Files changed

Only `src/game/scenes/WorldScene.ts` (two hunks):

1. `buildTerrain()` (~line 798): on cliff, ledge `rect.setVisible(false)` — physics body kept, dark fill hidden. Non-cliff chapters unchanged (rect + rim still drawn).
2. `onArrive` (~line 1438): `mouth.setVisible(chapterPipeIds.has(id) && !hiddenBySurfaceArtwork)` where `hiddenBySurfaceArtwork = world.chapter === 'cliff' && (id === 'cliff-entry' || id === 'cliff-to-skills')`.

No assets, configs, CSS, or other source files touched. Approved artwork scales/positions unchanged (verified live below).

## 2. Before → after evidence

### Runtime object state (1440×900)

| State | dark `#141c30` rects visible | pipe containers | artwork |
|---|---|---|---|
| before, spawn | **6** (world 368,478 / 560,408 / 740,348 / 530,438 / 660,368 / 808,298) | hidden | entry 0.4295@(10,560), platform 0.7109, portal 0.4144@(662.35,560) |
| after, spawn | **0** | hidden | identical (0.4295 / 0.7109 / 0.4144, same coords) |
| after, Surface→Skills→Surface | **0** | **hidden** (previously re-shown) | identical |
| after, Surface→Skills→Projects→Surface→Skills→Surface | **0** | hidden | identical |

Children count: 17 at every cliff visit (no GameObject accumulation). Skills chapter still shows its own ledges/pipes (360,428 / 568,358; containers 60 & 1350 visible) — Skills/Projects intentionally unchanged.

### Pixel evidence (PIL, exact fill `#141c30` ±12)

| Screenshot | dark px above ground | dark % inside the six former ledge screen boxes |
|---|---|---|
| `m2-1440x900-spawn.png` (before) | 23,928 | [12, 100, 100, 98, 100] |
| `fix-1440x900-spawn.png` (after) | 4,146 (background video/artwork tones) | **[0, 0, 0, 0, 0]** |
| `fix-1440x900-returned.png` (after re-entry) | video tones only | **[0, 0, 0, 0, 0]** |

## 3. QA results (after fix)

| Suite | Result |
|---|---|
| `accept-dataworld-gameplay` | 4/4 pass (exit 0) — movement, jump, collision, panel |
| `accept-dataworld-exit` | 3/3 pass (exit 0) |
| `accept-responsive` | 13/13 pass (exit 0) — 4 viewports, no h-overflow |
| `accept-dataworld-fullscreen` | 66/66 (exit 0) |
| `accept-dataworld-robot` | 20/20 (exit 0) |
| `test_console_errors` | Console errors: NONE / Page errors: NONE |
| Transitions (manual) | cliff→skills ✓, skills→cliff ✓, cliff→skills→projects→skills→cliff ✓; robot grounded at spawn/return ✓ |
| Horizontal overflow @1440×900 | 0 px |

Ledge collision preserved: ledge rects remain in `this.platforms` as static bodies with `visible=false` (Arcade collides regardless of visibility); gameplay suite's jump/collision assertions pass.

## 4. Screenshots (after fix)

- `qa-screenshots-acceptance/fix-1440x900-spawn.png`, `-entry.png`, `-portal.png`, `-skills.png`, `-returned.png`, `-returned2.png`
- `qa-screenshots-acceptance/fix-1280x800-spawn.png`, `fix-768x1024-spawn.png`, `fix-390x844-spawn.png`
- Before-fix evidence: `m2-1440x900-spawn.png`, `blackrect-after-return.png`, `blackrect-after-portfolio.png`

## 5. Git state

- Before: 144 porcelain lines (saved `/tmp/git-blackrect-before.txt`). After: identical tracked set; only new untracked files are the four report docs + `fix-*`/`blackrect-*` screenshots.
- `git diff --stat src/game/scenes/WorldScene.ts`: 332 insertions / 177 deletions **cumulative vs HEAD** (includes pre-existing uncommitted Stage S/M2 work; this fix's hunks are the two listed above).
- **No commits, no pushes, no reset/clean/stash/checkout.** All pre-existing modified and untracked files preserved.

## 6. Acceptance criteria

- ✅ No unexplained opaque black rectangles (0 visible dark rects at runtime; 0% fill in former ledge boxes, initial and after re-entry)
- ✅ Approved entry/platform/portal artwork unchanged (scales 0.4295 / 0.7109 / 0.4144 at (10,560) / (450,648.15) / (662.35,560) — live-verified identical)
- ✅ Background video visible through transparent regions
- ✅ Robot movement/physics unchanged (suites pass; ledge bodies kept)
- ✅ Portal interaction + chapter transitions work (manual + suites)
- ✅ No new console errors; no horizontal overflow; functional UI (RETURN TO PORTFOLIO / CONTENTS) intact

**PASS.** Awaiting visual approval before any commit or Skills chapter work.
