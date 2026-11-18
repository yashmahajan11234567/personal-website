# VIDEO_BACKGROUND_QA_PLAN.md — test and acceptance plan

Phase A plan. No code changed. Harness: the existing Node Playwright scripts in
`qa/` against `npx vite preview --port 4173` (`BASE=http://[::1]:4173/`), plus
headed runs for visual checks (screenshots are the only visual record — the
WebGL buffer is not preserved, VERIFIED note in `WorldScene.ts`). New scripts:
`qa/accept-dataworld-video.mjs` (playback/loop/switch), `qa/accept-dataworld-video-regression.mjs`
(full gameplay regression with videos on), extending `qa/accept-responsive.mjs`
viewports. Hooks: `window.__worldProbe()`, `window.__worldScene`,
`[data-testid=...]`, `.world-canvas`, `video.world-bg-video`.

## 1. Visual tests (headed, screenshots into `qa-screenshots-video-*`)

| # | Scenario | Acceptance criterion |
|---|---|---|
| V1 | Enter `#/data-world` | surface video visible behind canvas, fills viewport, no letterbox, no distortion (`videoWidth/videoHeight` aspect ≈ rendered box aspect under `object-fit:cover`) |
| V2 | Pipe to skills | infrastructure video shows; V1 criteria |
| V3 | Pipe to projects | core video shows; no skill logos visible in core; central core is focal |
| V4 | Robot visible | robot sprite clearly readable against video in all three chapters (screenshot review + `__worldProbe().playerSpriteHeight > 0`) |
| V5 | Platforms/stations/pipes/label visible over video | screenshot review in each chapter |
| V6 | No UI interference | entry plate, exit button, contents drawer, InfoPanel all above video and canvas (z-order assertions via `getComputedStyle`) |
| V7 | Viewports 1440x900, 1280x800, 768x1024, 390x844 | video covers viewport at each; no distortion; portrait crops sides only; key environment content inside central safe area |

## 2. Playback tests (headed + headless)

| # | Scenario | Acceptance criterion |
|---|---|---|
| P1 | Autoplay | active chapter's video `paused === false` after entry-plate dismissal without extra gesture (muted+playsinline) |
| P2 | Loop | `loop` attribute set; **seam check**: in-page, draw the video to a canvas at `t≈0` and at `t≈duration−0.05` (via `requestVideoFrameCallback` or seek), mean abs pixel diff < threshold (set from a known-good seamless clip; start 5/255), no object-position jump; plus ffmpeg-side check comparing frame 0 and last frame |
| P3 | Only one plays | after each chapter swap, exactly one `video` element has `paused === false`; others `paused === true` |
| P4 | Chapter switch | `__worldProbe().chapter` matches the visible video's `data-chapter`/`src`; swap happens during transport blackout (`travelling === true` or `isBlackedOut` via `__worldScene`) — no white/black flash frames in screenshots |
| P5 | No simultaneous decode of inactive videos | inactive videos have `preload="metadata"` (or are paused with `readyState < 3`) until visited |
| P6 | Tab hidden | `document.visibilitychange` → active video pauses; returns → resumes (unless reduced motion) |
| P7 | Reduced motion | emulate `prefers-reduced-motion: reduce` → video stays paused, poster visible |
| P8 | Missing asset | temporarily rename one video → poster shows, no console errors (only the designed warn), procedural fallback or `#070b14` backdrop, game still playable |
| P10 | Procedural fallback intact (approved clarification) | with video assets absent/unconfigured, the current procedural sky+parallax background renders exactly as on HEAD `c7184c8`; this fallback must remain enabled and passing at EVERY phase of integration — it is only retired after all three videos pass this whole plan |
| P9 | No leaks | after enter → 3 chapter swaps → exit → re-enter: `canvasCount === 1`, video element count stable, `interactionListenerCount()` unchanged, no `pageerror`/console errors |

## 3. Gameplay regression (must stay green — re-run existing suites)

- `qa/accept-dataworld-gameplay.mjs` (WASD motion, jump, boundary clamp, panel open/close, stuck-check)
- `qa/accept-dataworld-traversal.mjs` (pipe transport both directions, phase log)
- `qa/accept-dataworld-robot.mjs` (sprite/animations via `__worldScene`)
- `qa/accept-dataworld-fullscreen.mjs` (`__worldProbe` fields, camScroll bounds)
- `qa/accept-dataworld-exit.mjs`, `qa/accept-responsive.mjs` (hero + data + cloud at 1920/1280/768/390)
- Phase 1 contract fields on `__worldProbe` unchanged: `ok, x, y, grounded, camScrollX/Y, canvasCount, worldWidth/Height, velocityX/Y, facingRight`; `foundation-probe` gem at x=480 still emits.
- Specific: robot movement, jump apex, pipe transport (12-phase log), station proximity/activate via Enter and pointer, InfoPanel open/close, keyboard across chapter swap (held-key case), fullscreen at all four viewports.

## 4. Performance checks

- rAF fps sampling over 10s per chapter (via `page.evaluate` loop): no major drop vs the procedural baseline (measure baseline first on current HEAD build; target: median fps within ~10%).
- Memory: `performance.memory.usedJSHeapSize` (Chrome) before/after 3 chapter swaps — no monotonic growth; video decode is off-heap, watch for element/listener leaks instead (P9).
- No console errors/pageerrors in any run.

## 5. Acceptance gate for Phase B

All of V1–V7, P1–P10, the full regression list, and the performance budget pass
in BOTH headed and headless Chromium at all four viewports, with the seam check
(P2) either passing on native `loop` or the crossfade enabled and documented.
Only after ALL THREE videos pass this entire gate may the procedural
sky/parallax generators be retired — and that removal is a separate, explicitly
approved change, never bundled into the video integration.
