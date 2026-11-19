# DATA_WORLD_LAYER3_QA_PLAN.md — acceptance plan for Core / Projects

Runs against `npx vite preview --port 4173` (`BASE = http://[::1]:4173/`, matching the existing
suites). New script: `qa/accept-dataworld-layer3.mjs`; screenshots to `qa-screenshots-layer3/`.
Probe surface (unchanged, must not regress): `window.__worldProbe()` → x, y, grounded, camScrollX/Y,
canvasCount, worldWidth/Height, velocityX/Y, facingRight, playerSpriteHeight, chapter,
focusedStationId, focusedStationKind, stationLit, travelling, armedPipeId, stationCount, pipeCount,
panelOpen, locked, camZoom, camViewWidth/Height, lookAheadX. Plus `window.__worldScene`.

## 1. Boot and entry (portal alignment, arrival)

1. Load BASE at 1440×900, zero console errors; dismiss the entry plate.
2. `__worldProbe().chapter === 'cliff'`, worldWidth 900, pipeCount 2.
3. Walk right to x≈750 → `armedPipeId === 'cliff-to-skills'`; await transport → chapter `skills`,
  worldWidth 1500, pipeCount 2 (entry + exit), stationCount 6.
4. In skills, walk to x≈1350 → `armedPipeId === 'skills-to-projects'`; transport phase log equals
  the 12-phase order; chapter `projects`, **worldWidth 1500 (new)**, **pipeCount 2 (new: entry +
  return)**, **stationCount 4**.
5. Arrival: x === 144, y === 560, grounded, camScrollX ≈ 0 at desktop (window 0..720 contains
  entry portal art 0..180). Screenshot `layer3-01-arrival.png`.
6. **Portal/art alignment assertion:** entry pipe trigger x=60; arm zone 38..82 must lie inside
  the drawn portal art rect (0..180). Verify visually in the screenshot AND by probing
  `__worldScene.pipeSkins` — both projects pipe containers must be hidden (`visible === false`)
  once artwork exists. Same for the return portal at 1350 (art 1260..1440 contains 1328..1372).

## 2. Platform grounding and movement

- Sweep x from 8 to 1492 (step 20): `y === 560` and `grounded === true` at every step — no ledge
  gaps (ledges removed), no falls, no wall stops. worldWidth clamp: x never exceeds 1492/never
  below 8.
- Jump onto nothing: with no platforms, a jump must always land back at y=560 (assert after a
  jump arc: returns to 560, grounded).
- Collision with server hitboxes: walking into a server sprite must NOT block movement (hitboxes
  are interactive, not solid) — assert x passes through 390/640/890/1140.
- Spawn re-check after transport: `create()` snap → x=144 exactly.

## 3. Server hover transitions (all four)

For each station x in [390, 640, 890, 1140]:
1. Walk to within 132 px → `focusedStationId === <id>`, `focusedStationKind === 'project'`,
   `stationLit === true`.
2. Sprite texture swapped idle→lit (assert via `__worldScene` station view texture key contains
   `-lit`).
3. Walk away >132 px → focus clears, `stationLit === false`, texture back to idle.
4. Pitch check: at the midpoint between two servers (e.g. x=515) at most one is focused.
5. Screenshot `layer3-02-hover-<id>.png` for each (glow visible).

## 4. Server click → project panel

1. Walk to station, `page.mouse` click on the sprite centre → `panelOpen === true`,
   `locked === true`, DOM `#info-panel` visible.
2. Panel content assertions per project: `#project-title-link` href equals the repo URL from
   PROJECT_PROFILES; limitations `<ul>` has ≥1 `<li>`; for `data-analytics-dashboards` the
   gallery renders 5 `<img>` with `object-fit: contain`.
3. Escape closes (`panelOpen === false`, `locked === false`); Enter on a focused station reopens.
4. DOM index: click `data-testid="index-project-primetradeai"` → panel opens for PRIME without
   walking. Screenshot `layer3-03-panel.png`.

## 5. Return portal and repeated transitions

1. Walk to x≈1350 → `armedPipeId === 'projects-to-skills'` → transport → chapter `skills`,
   pipeCount 2, stationCount 6. Screenshot `layer3-04-returned.png`.
2. Re-enter projects via skills x=1350 (second round trip) — assert same probe values as §1.
   Do the full loop **2×** to cover re-entry/repeated transitions.
3. Entry-pipe return path still works: in projects, walk back to x=60 → transport returns to
   `skills` (previousChapter) — confirms both exits are live.

## 6. Responsive viewports

For each viewport [390×844, 768×1024, 1440×900, 1920×1080]:
- Boot → travel cliff→skills→projects via pipes (or drive `__worldScene` if a shortcut is added;
  otherwise walk programmatically with key events as existing suites do).
- Assert: chapter projects, camZoom within [1,2] and a 0.25 multiple, camViewWidth/Height match
  zoom, arrival window shows the arm zone 38..82 reachable (player can walk to x=60),
  all four server x positions reachable within world clamp, return pipe 1350 reachable,
  no console errors. Screenshots per viewport.

## 7. Reduced motion

- `page.emulateMedia({ reducedMotion: 'reduce' })` → portal animations show static frame 0;
  transport still completes end-to-end (12 phases, chapter changes). Assert `travelling` true
  mid-flight and final chapter correct.

## 8. Regression gate (existing suites must still pass)

`qa/accept-dataworld-gameplay.mjs`, `accept-dataworld-traversal.mjs`, `accept-dataworld-exit.mjs`,
`accept-dataworld-fullscreen.mjs`, `accept-dataworld-robot.mjs`,
`accept-dataworld-skills-stagek.mjs`, `accept-dataworld-cards-portal.mjs`,
`accept-responsive.mjs`, `accept-content-parity.mjs`, `dw-verify.mjs` — all green before and
after Layer 3 changes. Surface and Skills chapters must be byte-identical in behaviour.

## 9. Pass criteria summary

All of: zero console errors on every run; §1–§7 assertions green; §8 regression green;
screenshots archived under `qa-screenshots-layer3/`; working tree contains only the approved
code/asset changes plus docs (no unrelated modifications).
