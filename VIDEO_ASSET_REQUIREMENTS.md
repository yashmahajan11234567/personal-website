# VIDEO_ASSET_REQUIREMENTS.md — exact specs for the three background videos

Phase A spec for the externally generated (Google Flow) videos. No asset files
are created in this phase. Paths below are the agreed locations; the mapping
chapter → key is `cliff`→`surface`, `skills`→`infrastructure`,
`projects`→`core`.

## 1. File locations and naming

```
public/assets/backgrounds/
  surface/         cliff chapter   (Level 1 — neon megacity)
    bg.mp4         H.264, primary
    bg.webm        VP9, optional smaller alternative for Chrome/Firefox
    poster.jpg     first frame, for pre-load paint + reduced-motion + fallback
  infrastructure/  skills chapter  (Level 2 — underground data network)
    bg.mp4 / bg.webm / poster.jpg
  core/            projects chapter (Level 3 — server laboratory)
    bg.mp4 / bg.webm / poster.jpg
```

Why `public/` and not `src/`: videos are large (MBs); `public/` keeps them out
of the Vite module graph entirely, served as cacheable static files, and
matches the existing `public/assets/…` convention. `vite.config.ts` has
`assetsInlineLimit: 0`, so even imported assets are emitted as files — but
public/ is still the right home for multi-MB media. Never import videos with
`?url` into the JS bundle path.

Naming: fixed names (`bg.mp4`, `bg.webm`, `poster.jpg`) inside a per-environment
folder, so the code maps chapter → folder → fixed filenames. 720p is the base
tier (Flow output); an optional `bg-1080p.mp4` upscale may be added later only if
QA shows 720p too soft on large desktop viewports — not required.

## 2. Video specs (per file)

| Property | Requirement |
|---|---|
| Duration | exactly 8.0 s (at 30 fps: exactly 240 frames) |
| Resolution | **1280x720 (16:9) minimum — accepted as-is** (Google Flow 720p output); 1920x1080 optional only if QA shows 720p too soft at 1440x900+ |
| Frame rate | 30 fps (constant) |
| Codec/container | MP4 = H.264 Main, yuv420p, ~4–6 Mbps target (≤ ~6 MB per 720p file); WebM = VP9, CRF ~33–35, no audio |
| Audio | none (playback is muted anyway) — strip the track |
| Loop | **seamless**: last frame must flow into first frame — frame 239 ≈ frame 0; no hard cut, no fade-to-black at the ends, moving objects (vehicles, rain, steam, data flow) must not pop. Generate with loop continuity in the prompt and verify (QA_PLAN P2) |
| Style | cyberpunk pixel-art, matching the robot's 2D pixel aesthetic; crisp edges, limited palette, no photoreal blur |
| Composition | center-safe: everything important inside the central ~60% width and full height, because portrait viewports crop the sides under `object-fit: cover` |
| Brightness | dark night scenes overall; keep the lower third (where the robot/ground sit, ~bottom 25% of frame) relatively dark/low-detail so the 56px-tall robot at 2x zoom stays readable; no overlay filters planned |
| Content per environment | see `VIDEO_BACKGROUND_DESIGN_SPEC.md` §2 — megacity+rain+ads / underground pipes with glowing data + small subtle tech screens (skills chapter only) / server racks with central illuminated core (NO skill logos) |

## 3. Poster specs

- `poster.jpg`: 1280x720 minimum (match the video), JPEG q~80, taken from
  frame 0 (or the most representative frame), ≤ ~150 KB. Used for instant
  paint before decode, for `prefers-reduced-motion`, and as the error fallback.

## 4. Delivery checklist (when the files arrive)

- [ ] 3 folders × (bg.mp4 + poster.jpg) present at the paths above (+ bg.webm optional)
- [ ] ffprobe: duration 8.00s, ≥1280x720, 30fps, h264/yuv420p, no audio stream
- [ ] Seam check: ffmpeg extract frame 0 and last frame → pixel diff below threshold (QA_PLAN P2); if it fails, request a re-render with loop continuity or plan the crossfade
- [ ] File sizes recorded (target ≤ ~6 MB per 720p MP4)
- [ ] Visual review in headed browser at all four QA viewports
- [ ] No secrets or personal data embedded in metadata (ffmpeg `-map_metadata -1` recommended)
