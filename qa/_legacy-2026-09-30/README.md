# Legacy QA — superseded 2026-09-30 attempt

Archived 2026-10-01 as part of **Task 0** of the Phase 1 rebuild
(`.gsd/plans/phase-1-cinematic-rebuild.md`).

These specs target the architecture that the rebuild removes. They are kept for history
only and are **expected to fail** against the new build. They are not run by the Phase 1
test suite.

| File | Why it is dead |
|---|---|
| `path-selection-test.spec.ts` | asserts a `PathSelection` component exists — the rebuild has no selection page (brief §12) |
| `path-selection-direct.test.ts` | same, plus `currentWorld === 'path-selection'` state that no longer exists |
| `path-selection-isolated.test.ts` | same |
| `state-transition.test.ts` | sets store state to `path-selection` — removed from the `World` union |
| `task2-architecture.test.ts` | asserts a single cinematic canvas and "no PathSelection component" — canvas leaves the cinematic (§15, D2) |
| `visual-qa.spec.ts` | scrolls `.hero` and compares against the **frame sequences**, which are now secondary reference only (D1) |
| `debug-100-scroll.spec.ts` | debug scratch spec for the old scroll range |
| `store-test.spec.ts` | tests the old store shape; the store gains `selectedPath` etc. in Task 2 |
| `compare_visual.py` | pixel-diffs against frame-sequence stills — superseded by the reference-video comparison in Task 9 |

**Do not restore these.** If a behaviour here looks worth keeping, re-express it against the
new architecture — the assertions encode assumptions the approved plan explicitly rejects.
