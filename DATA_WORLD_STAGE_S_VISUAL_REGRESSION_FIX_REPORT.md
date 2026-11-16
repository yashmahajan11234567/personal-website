# DATA WORLD — STAGE S VISUAL REGRESSION FIX REPORT

**Branch:** `restore/data-world-386991f` · **HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d` · 2026-11-16
**No commits or pushes.** All pre-existing modified/untracked work preserved (tracked set diff-verified identical before/after).

---

## 1. Root cause — black rectangles

`WorldScene.buildTerrain()` created every configured ledge as a visible `Rectangle` filled with `palette.ground` = `#141c30`. The cliff guard only wrapped the 2px rim, not the fill — so the six `CLIFF_PLATFORMS` ledges rendered as opaque dark bars (depth 0) over the video background on Surface. **Fix:** `rect.setVisible(false)` on cliff after attaching the static physics body (collision preserved; Arcade bodies collide when invisible).

## 2. Root cause — legacy visuals reappearing after chapter navigation

`buildPipes()` correctly hides `cliff-entry` / `cliff-to-skills` mouths at `create()`, but the transport's `onArrive` (~line 1432) re-ran `mouth.setVisible(chapterPipeIds.has(id))` for all current-chapter pipes on **every arrival**, re-showing both cliff pipes after each return (measured: hidden → visible ~3.2s after probe flip). The scene swap itself is clean: `scene.stop()` + `setConfig()` + `scene.start()` rebuilds per chapter; top-level children return to exactly 17 on every cliff entry — no duplicate GameObjects or listener accumulation (window listeners are removed in `shutdown()`). **Fix:** `onArrive` now keeps cliff's artwork-hidden pipes hidden: `setVisible(chapterPipeIds.has(id) && !(world.chapter === 'cliff' && (id === 'cliff-entry' || id === 'cliff-to-skills')))`. Chapter label needs no fix — only created for non-cliff chapters.

## 3. Files modified

- `src/game/scenes/WorldScene.ts` only — two scoped hunks (buildTerrain ledge visual; onArrive pipe visibility). No asset, config, CSS, or gameplay changes. Approved Surface layout preserved: platform scale 0.7109 full-width; entry scale 0.4295 at x=10 bottom-anchored groundY; portal scale 0.4144 left edge x=662.35 bottom-anchored groundY (all live-verified unchanged after fix).

## 4. Lifecycle / rendering changes

- Cliff ledge rects: visible=false on cliff (all entry paths — `create()` rebuilds per chapter, so this applies on every entry; verified idempotent).
- Cliff pipe mouths: hidden in both `buildPipes()` and `onArrive` — every entry path now converges on the same visual state.
- Skills/Projects untouched: their ledge rects, rims, pipe mouths still render (verified at runtime in skills: dark rects + visible containers present).

## 5. Test results

| Suite | Result |
|---|---|
| accept-dataworld-gameplay | 4/4 ✅ |
| accept-dataworld-exit | 3/3 ✅ |
| accept-responsive | 13/13 ✅ |
| accept-dataworld-fullscreen | 66/66 ✅ |
| accept-dataworld-robot | 20/20 ✅ |
| test_console_errors | NONE / NONE ✅ |

Re-entry regression sequences (runtime-verified after each return to cliff: artwork present with exact approved scales, zero visible `#141c30` rects, pipe containers hidden, 17 children, robot grounded):

- Surface → Skills → Surface ✅ (`fix-1440x900-returned.png`)
- Surface → Skills → Projects → Surface ✅ (via skills) — full S→P→S→C round trip ✅ (`fix-1440x900-returned2.png`)
- Surface → Portfolio → Surface ✅ (fresh page load; spawn state identical: `fix-1440x900-spawn.png`)

Pixel proof: dark-fill % inside the six former ledge screen boxes = 100% before → **0%** after, both at spawn and after re-entry.

## 6. Screenshots

`qa-screenshots-acceptance/fix-1440x900-{spawn,entry,portal,skills,returned,returned2}.png`, `fix-1280x800-spawn.png`, `fix-768x1024-spawn.png`, `fix-390x844-spawn.png`. Before-fix: `m2-1440x900-spawn.png`, `blackrect-after-{return,portfolio}.png`.

## 7. Confirmation

- Skills and Projects **not** unintentionally changed (cliff-scoped guards only; skills runtime state verified unchanged).
- Gameplay contracts intact: robot sprite/physics, ground + six ledge bodies, pipe triggers, hover, transitions, camera, probes, exit button, background video — all suites green, zero console errors.
- Git: branch/HEAD unchanged; tracked-modified set identical before/after (diff-verified); **no commits or pushes**.

**PASS.** Stopped here — awaiting approval before the Stage S commit.
