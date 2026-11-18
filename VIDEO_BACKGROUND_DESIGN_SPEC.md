# VIDEO_BACKGROUND_DESIGN_SPEC.md — visual direction and presentation rules

Phase A design document. No code changed. Everything here describes the target
state; current-state facts are in `VIDEO_BACKGROUND_AUDIT.md`.

## 1. Principle

The video is the **environment**; Phaser remains the **game**. The robot, the
ground, platforms, stations, pipes, chapter plates, travel overlay and all UI
are rendered by Phaser/DOM on top of the video. The video is never interactive
(`pointer-events: none`) and never contains the robot.

## 2. The three environments (unchanged from the brief)

| Chapter (config id) | Environment | Video file key | Palette |
|---|---|---|---|
| `cliff` | Level 1 — The Surface: neon megacity, skyscrapers, flying vehicles, night sky, rain, fog, animated ads | `surface` | cyan / violet / magenta / deep navy |
| `skills` | Level 2 — The Infrastructure: underground data pipes, cables, machinery, walkways, glowing data in transparent pipes, steam vents, small animated screens subtly referencing Python, SQL, Power BI, Tableau, Streamlit, AWS, Docker, Kubernetes, GitHub | `infrastructure` | industrial + signal glow |
| `projects` | Level 3 — The Core: server racks, central illuminated server core as focal point, cooling systems, consoles, reflective floor. **No skill logos here.** | `core` | cyan / blue / violet / magenta, energetic |

Mapping note: the bus and config speak chapter ids (`cliff`/`skills`/`projects`);
the asset files are named by environment (`surface`/`infrastructure`/`core`).
The mapping lives in ONE place (a `background` field on `WorldChapter` in
`worldConfig.ts`, or a small `backgroundVideos.ts` map) — never scattered.

## 3. Presentation requirements

- **Fill, never stretch**: `object-fit: cover` on a full-viewport `<video>`.
  No letterboxing; cropping is acceptable, distortion is not.
- **Layer order** (bottom → top): DOM video → Phaser canvas (transparent clear)
  → in-canvas gameplay (ground at depth 1, shadow 2, pipes 4, label 5,
  stations 6, glow 9, robot 10, travel overlay 900/901) → DOM overlays
  (drawer 15, toggle 16, panel 20, entry 40, exit 41). The video sits below the
  canvas, never above it.
- **Readability**: the videos are dark cyberpunk scenes by design; a subtle
  darkening overlay (CSS gradient, ≤ ~25% black at the ground band) is allowed
  ONLY if QA shows the robot/stations unreadable. No blur, no heavy filters —
  they would destroy the pixel-art look. Default: no overlay.
- **Responsive**: at 1440x900, 1280x800, 768x1024 and 390x844 the video must
  cover the viewport. On portrait, `cover` crops left/right — all
  environment-critical content must sit inside the central safe area (see
  `VIDEO_ASSET_REQUIREMENTS.md`).
- **Reduced motion** (`prefers-reduced-motion`): show the poster image and do
  not autoplay — consistent with the scene already freezing parallax under
  reduced motion.
- **One video at a time**: only the active chapter's video plays; inactive
  videos are paused. The game already guarantees the screen is blacked out
  during the pipe-transport `build` phase, which is when the source swaps.

## 4. What stays Phaser-rendered (separation of concerns)

Retained in-canvas: ground slab + sub-floor art, platform slabs and their
physics, stations (lit/unlit), pipe skins + chapter plates, chapter label,
robot + glow + shadow, interaction gem, travel conduit overlay/blackout,
camera and input. These are gameplay or foreground elements and must remain
independent of the video.

Replaced by video: the sky image and the four parallax strips (far skyline,
mid skyline, midground buildings, foreground rooftop/street) — i.e. everything
`buildEnvironment()` draws today. Rain/fog/vehicle animation currently baked
into those layers is expected to come from the video itself; the unused
`makeRain`/`makeFog`/`makeVehicle`/`makeHolo`/`makeSign`/`makeSteam` generators
stay parked (not deleted this phase) and may later serve as a light foreground
overlay in front of the video if QA asks for it.

Fallback: if a video file is missing or fails to load, the poster image shows;
if no poster either, the existing procedural background (`neonCity` sky +
parallax) renders as today. The procedural path is gated behind "no video
asset configured/loaded", not deleted.
