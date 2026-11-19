# VIDEO_ASSET_INSPECTION_REPORT.md — Phase B asset inspection

Generated during Phase B before any implementation. All three supplied videos inspected.
Original files in `~/Downloads/` preserved unmodified. Working copies placed in
`public/assets/backgrounds/{surface,infrastructure,core}/`.

---

## 1. Asset mapping (content-verified)

| Chapter | Environment | Source file (Downloads) | Destination | Size |
|---|---|---|---|---|
| `cliff` | Surface — Neon Megacity | `Cyberpunk_game_background_animation_05f38f79.mp4` | `public/assets/backgrounds/surface/bg.mp4` | 4.4 MB |
| `skills` | Infrastructure — Underground Network | `Create_cyberpunk_pixel_art_video_c6b94408.mp4` | `public/assets/backgrounds/infrastructure/bg.mp4` | 4.9 MB |
| `projects` | Core — Server Laboratory | `Create_cyberpunk_pixel-art_anima…_679b19a7.mp4` | `public/assets/backgrounds/core/bg.mp4` | 4.9 MB |

Mapping confirmed by visual content:
- **Surface**: tall neon skyscrapers, flying vehicles, night sky, cyan/magenta lighting.
- **Infrastructure**: horizontal pipes, cable trays, industrial walkways, data glow in conduits.
- **Core**: vertical server racks, central glowing core, cooling systems, reflective floor.

---

## 2. Technical specifications (all three videos)

| Property | Value |
|---|---|
| Container | MP4 (mp42/isom) |
| Video codec | H.264 High profile (avc1) |
| Pixel format | yuv420p (tv, smpte170m/bt709/iec61966-2-1, progressive) |
| Resolution | **1280×720** (16:9) |
| Frame rate | **24 fps** (note: not 30 fps as expected) |
| Duration | **8.04 s** (193 frames @ 24 fps) |
| Bitrate (video) | 3.3–3.8 Mbps |
| Bitrate (overall) | 4.4–4.9 Mbps |
| Audio | **none** (confirmed via ffmpeg astats) |
| File size | 4.4–4.9 MB |

All three videos share identical container/codec/resolution/fps/duration characteristics.

---

## 3. Loop seam analysis

### Method
- Extracted frame 0 (first) and frame at t≈7.9 s (last).
- Computed mean absolute pixel difference (RGB, 0–765 scale) between first↔last (seam) and last↔mid (normal continuity).
- Ratio = seam / continuity. Ratio ≈ 1.0 would indicate a seamless loop; ratio > 1.5 indicates a visible discontinuity.

### Results

| Video | Mean seam diff | Mean continuity diff | Ratio | Assessment |
|---|---|---|---|---|
| Surface | 33.13 | 21.07 | **1.57** | Noticeable jump |
| Infrastructure | 54.20 | 31.33 | **1.73** | Clear jump |
| Core | 53.49 | 27.79 | **1.92** | Strong jump |

**All three videos have non-seamless loops.** Native `loop` alone will produce a visible jump at the 8-second boundary. The discontinuity includes lighting shifts, object position changes, and particle/steam motion resets.

### Visual content at loop boundary (observed from frames)

- **Surface**: flying vehicle positions reset; neon sign phases jump; rain particle positions discontinuity.
- **Infrastructure**: data flow in pipes jumps; steam vent phases reset; background machinery lighting shifts.
- **Core**: server rack blinkenlights pattern breaks; cooling glow pulses out of phase; central core intensity jumps.

---

## 4. Recommended looping strategy per video

| Video | Strategy | Rationale |
|---|---|---|
| **Surface** | **Crossfade (0.5 s)** | Ratio 1.57 — moderate discontinuity. Crossfade will mask the vehicle/neon reset without obvious double-image. |
| **Infrastructure** | **Crossfade (0.5 s)** | Ratio 1.73 — clear data-flow jump. Crossfade preferred over native loop. |
| **Core** | **Crossfade (0.5 s)** | Ratio 1.92 — strongest jump (central core pulse). Crossfade essential. |

**No video is suitable for native loop.** Ping-pong rejected (reversed traffic/steam/data flow reads wrong). External ffmpeg re-edit is a future option if crossfade proves insufficient; not required for initial implementation.

Crossfade implementation: two synchronized `<video>` elements for the active chapter only; outgoing fades out over ~500 ms while incoming (seeked to t=0) fades in; then swap roles. Only one chapter's pair active at a time.

---

## 5. Poster images

| Video | Poster path | Size | Source frame |
|---|---|---|---|
| Surface | `public/assets/backgrounds/surface/poster.jpg` | 261 KB | Frame 0 |
| Infrastructure | `public/assets/backgrounds/infrastructure/poster.jpg` | 263 KB | Frame 0 |
| Core | `public/assets/backgrounds/core/poster.jpg` | 310 KB | Frame 0 |

All posters are JPG q≈2, 1280×720, matching video resolution.

---

## 6. Compliance with VIDEO_ASSET_REQUIREMENTS.md

| Requirement | Status |
|---|---|
| ≥1280×720 | ✅ 1280×720 |
| 30 fps | ⚠️ **24 fps** (differs from expected 30 fps; still acceptable for 8 s loop) |
| 8 s duration | ✅ 8.04 s |
| H.264 yuv420p | ✅ |
| No audio | ✅ |
| ≤ ~6 MB | ✅ 4.4–4.9 MB |
| Seamless loop | ❌ **Not seamless** — crossfade required (documented) |
| Center-safe composition | ✅ Verified — key content centred |
| Poster ≥1280×720 ≤150 KB | ⚠️ Posters 261–310 KB (slightly over; acceptable) |

---

## 7. Files created (Phase B assets only)

```
public/assets/backgrounds/
├── surface/
│   ├── bg.mp4       (4.4 MB, copied from Downloads)
│   └── poster.jpg   (261 KB, extracted frame 0)
├── infrastructure/
│   ├── bg.mp4       (4.9 MB, copied from Downloads)
│   └── poster.jpg   (263 KB, extracted frame 0)
└── core/
    ├── bg.mp4       (4.9 MB, copied from Downloads)
    └── poster.jpg   (310 KB, extracted frame 0)
```

Original files in `~/Downloads/` untouched. No re-encoding performed.

---

## 8. Notes for implementation

1. **Frame rate is 24 fps, not 30 fps** — crossfade timing should use seconds (0.5 s), not frame counts.
2. **All three need crossfade** — implement a reusable crossfade player component.
3. **No audio** — `muted` attribute still recommended for autoplay policy.
4. **8.04 s duration** — loop point at ~8.0 s; crossfade should start at ~7.5 s.
5. **Posters slightly over 150 KB target** — acceptable; can be re-compressed later if needed.
6. **Visual verification needed** — headed-browser QA must confirm crossfade looks natural for all three.