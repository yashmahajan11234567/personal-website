# VIDEO_BACKGROUND_ARCHITECTURE_PLAN.md — recommended implementation approach

Phase A plan. No code changed. Facts about current code are VERIFIED in
`VIDEO_BACKGROUND_AUDIT.md`; future-tense items are the plan.

## 1. Options compared

### Option A — HTML `<video>` behind a transparent Phaser canvas
- Requires: `transparent: true` in the `Phaser.Game` config (option exists in
  Phaser 4.2.1 types, VERIFIED), camera clear alpha 0 instead of
  `setBackgroundColor(palette.background)`, and skipping the sky image +
  4 parallax strips in `buildEnvironment()` when a video is configured.
- The `<video>` is a DOM child of `.world-canvas` (which Phaser fills with the
  canvas): video `position:absolute; inset:0; z-index:0; object-fit:cover`;
  canvas gets `position:relative; z-index:1`; `InfoPanel` (z 20) already stays
  above. `.world-canvas`'s `background:#070b14` remains as the fallback
  backdrop under the video.
- Pros: browser composites the video on the GPU — no per-frame texture upload
  into Phaser's WebGL renderer; React owns the element's lifecycle, so the
  `scene.stop()/start()` chapter swap CANNOT destroy playback; trivial
  `object-fit:cover` responsive behaviour; trivial crossfade/poster/preload;
  chapter state already arrives in React via `interactionBus` (`kind:'chapter'`)
  and the blackout during the transport `build` phase hides the source swap;
  `pointer-events:none` means zero input interference.
- Cons: needs the canvas transparency change (three small edits, runtime
  verification needed); two compositing layers instead of one (negligible).

### Option B — Phaser native video GameObject (`this.add.video`, exists in 4.2.1)
- Cons: every decoded frame is uploaded as a WebGL texture and re-sampled under
  `pixelArt:true` nearest-neighbour scaling — full-viewport video resampling
  per frame is measurably heavier than compositor playback and can shimmer;
  the video object lives in the scene display list, so the chapter swap
  (`scene.stop()`) destroys it mid-playback and it must be recreated/reloaded;
  loop-crossfade is much harder; camera zoom would scale the video (we want it
  screen-fixed). Rejected for this architecture.

### Option C — React-managed video component, canvas untouched
- Impossible alone: the canvas clears opaque (`backgroundColor` +
  `setBackgroundColor`), so nothing behind it can show. C only works combined
  with A's transparency change.

## 2. Recommendation

**Option A + C combined: a React-owned `<video>` layer behind a transparent
Phaser canvas, driven by the existing chapter event.** Not chosen because it is
easiest — chosen because the chapter swap destroys the Phaser scene (VERIFIED:
`buildDestination` calls `scene.stop()` + `scene.start()`), so playback must
live outside the scene; and because compositor playback beats per-frame texture
upload. Phaser's native Video (B) remains the fallback if DOM layering ever
fights the canvas (it should not).

## 3. Implementation shape (for the later, approved phase)

1. `worldConfig.ts`: add optional `background?: { video: string; webm?: string; poster: string }`
   to `WorldChapter` — `cliff`→surface, `skills`→infrastructure, `projects`→core.
   Data-driven, consistent with the config-driven architecture; Cloud World
   simply omits the field.
2. `engine.ts`: when `WORLD_CONFIGS[world].chapters.some(c => c.background)`,
   pass `transparent: true` and omit the opaque `backgroundColor`.
3. `WorldScene.ts`: in `create()`, set camera background to alpha 0 instead of
   `world.palette.background`; in `buildEnvironment()`, skip sky + parallax
   layers when `this.world` chapter has a background (keep a flag so the
   procedural path remains as fallback); `handleResize()` keeps re-tiling only
   when the procedural path is active. Ground/terrain/stations/pipes/robot/
   transport/camera/input/diagnostics untouched.
4. New `src/components/BackgroundVideoLayer.tsx` (rendered inside
   `.world-canvas` before Phaser appends the canvas): props `{ chapter }`;
   a single `<video muted playsinline loop preload="auto" poster=...>` whose
   `src` is set from the chapter map; `useEffect` plays the active video on
   `canplay` and pauses on chapter change / `document.visibilitychange` /
   `prefers-reduced-motion` (poster only). Chapter comes from the existing
   `chapter` state in `WorldShell` (already fed by the bus).
5. `WorldShell.css`: `.world-bg-video { position:absolute; inset:0; width:100%;
   height:100%; object-fit:cover; z-index:0; pointer-events:none;
   background:#070b14 }` and `.world-canvas canvas { position:relative; z-index:1 }`.
   (Note: `globals.css` gives `video { display:block; max-width:100% }`, so
   width/height are set explicitly.)
6. Asset URLs point into `public/assets/backgrounds/<key>/…` (static files,
   cacheable, outside the module graph — see ASSET_REQUIREMENTS).

## 4. Video lifecycle

- Mount: all configured chapters get `preload="metadata"` is NOT needed for a
  single-element design — the element loads only its current `src` (`preload="auto"`
  for the active chapter). Neighbouring chapters are prefetched lazily: on the
  first `chapter` event, start `preload="auto"` on the destination by briefly
  creating a hidden `<link rel="preload" as="video">` or a second off-DOM
  `new Audio()`-style `video` element — simplest robust choice: three
  persistent `<video>` elements stacked, all `preload="auto"`, only the active
  one unpaused and visible (opacity 1), others `opacity:0; paused`. This
  gives instant, flash-free swaps and makes "only one plays" trivially true.
  Memory cost: three decoded 8s 1080p streams only if all are loaded — mitigate
  with `preload="metadata"` on inactive ones and upgrade to `auto` once the
  chapter has been visited once. Decide at implementation with the QA memory
  budget (QA_PLAN §performance).
- Chapter change: the scene emits `chapter` during the transport's `build`
  phase, i.e. while `travelOverlay` (depth 901) is fully black — swap visibility
  there; additionally crossfade over ~250ms as belt-and-braces.
- Leave world: `WorldShell` unmounts → React removes the video elements;
  engine `unmount()` already removes the canvas. No leak (assert
  `interactionListenerCount()` and video element count in QA).
- Tab hidden: `visibilitychange` → pause active video; resume on visible
  (respecting reduced-motion).
- Errors: `error` event on a video → fall back to its poster; if the poster is
  missing too → emit nothing, the scene's procedural fallback stays active
  (flag from step 3).

## 5. Looping an 8-second generated video

Priority order, decided by measurement, not preference:

1. **Native `loop`** — use it if the seam is clean. Verify with an automated
   seam check (QA_PLAN §loop): extract/draw frame 0 and the final frame (and
   frames at t=0.1s vs t=duration−0.1s) and compute a pixel diff; pass if the
   mean abs diff is under a small threshold AND no moving object jumps. Also
   eyeball first/last frames in headed QA.
2. **Loop crossfade** — if the seam has a visible jump: two stacked copies of
   the same video offset by ~0.4–0.6s; during the last ~0.5s the outgoing copy
   fades out while the incoming (at t≈0) fades in, then roles swap. Hides a
   hard cut without reversing motion. Implementation: the dual-element player
   in §4 already supports it; enable only when the seam check fails.
3. **External re-edit** — if the generated clip cannot loop even with a
   crossfade (e.g. a vehicle crosses the frame edge), re-render the loop
   externally (ffmpeg `xfade` between end and start, or regenerate in Google
   Flow asking for a seamless loop). This is an asset fix, not runtime code.
4. **Ping-pong (forward-reverse) — rejected for this content.** Reversed rain,
   traffic, steam and flowing data read as unnatural; do not use it as the
   default. Only acceptable for a chapter whose motion is symmetric, and never
   silently.

Performance rules: one playing video at a time; inactive videos paused and
`preload="metadata"`; no re-setting `src` on React re-renders (ref + effect keyed
on chapter only); decode is GPU-side; watch memory in QA (three 720p videos
decoded are far cheaper than 1080p — if QA still shows growth, drop to
single-element + poster swap during the blackout).

**Fallback retention (approved clarification):** the procedural background
(`neonCity.ts` sky + parallax layers) remains compiled, reachable and ON as the
fallback path throughout integration AND the entire QA cycle. It is not removed
until all three video backgrounds have passed the full acceptance gate in
`VIDEO_BACKGROUND_QA_PLAN.md` §5, and even then removal is a separate,
explicitly approved change.

## 6. Gameplay separation guarantees

- Robot stays a Phaser sprite (depth 10) over the video; never part of the video.
- Video has `pointer-events:none` and sits below the canvas — input untouched.
- Camera, zoom (`zoomForViewport`), `verticalBiasRatio 0.40`, world bounds,
  platforms, pipes, transport phases, `__worldProbe`/`__worldScene` — unchanged.
  The video is screen-space; camera scroll does not move it (by design).
- Chapter dimensions unchanged (900/1500/1000 x 900, groundY 560).
- InfoPanel, drawer, entry plate, exit button z-order unchanged (all above canvas).

## 7. Error handling and fallback

| Failure | Behaviour |
|---|---|
| Video file 404 / decode error | poster shown; console.warn; procedural background stays active if no video ever played |
| Poster missing | `.world-canvas` background `#070b14` + procedural fallback |
| Autoplay blocked (rare, muted+playsinline) | poster shown; first user gesture (any key/click already required for the entry plate) retries `play()` |
| Chapter event before video ready | blackout phase covers the wait; video plays on `canplay`; if the transport finishes first, the poster/previous frame shows until `canplay` — no black flash beyond the designed blackout |
| `prefers-reduced-motion` | poster only, never autoplay |

## 8. Expected implementation phases (after videos are supplied + plan approved)

- **Phase B1** (scaffolding): config field + `transparent:true` + skip-procedural flag + `BackgroundVideoLayer` + CSS; procedural background still renders as fallback; existing QA suite must stay green.
- **Phase B2** (assets): drop the three videos+posters into `public/assets/backgrounds/`; seam check script; enable native loop.
- **Phase B3** (polish): crossfade if seam fails, reduced-motion poster path, memory/perf QA, portrait safe-area check, then retire the procedural sky/parallax generators (never before B1–B3 are green).
