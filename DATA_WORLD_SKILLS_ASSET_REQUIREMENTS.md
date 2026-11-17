# DATA_WORLD_SKILLS_ASSET_REQUIREMENTS.md — Stage K refinement: Skills chapter artwork spec

Design only — no game assets generated yet. Concept/reference mockups (transparent SVGs, not game assets) live in `docs/skills-concept/`. Final game assets are PNG under `public/assets/data-world/`.
World px are 1:1 in Skills (1500×900, groundY 560); camera zoom is 2 at all four required viewports, so author sources at **2× display** for an effective 1 screen px per source px (integer scaling, no dropped pixels).

## 1. Palette & pixel-art consistency (bind to the approved Surface universe)

- Hall base/structure: `#211735` (deep violet), walls `#160d29`→`#241640` range, seams `#1A0D23`, rib cores `#0A0410`.
- Neon magenta `#CF31AD`, dim `#8B2270`. Neon cyan `#17D3F4`, bright `#8CEAFF`.
- Portal blues: cap `#66CCFF`, body `#0066CC`, highlight `#88E0FF`, field darks `#0a2a55` / `#2a1650`, void `#04060A`.
- Metal greys: `#2b3646 / #48566b / #6e7f96`; screens `#04060a`; signal `#38b6d9`.
- Rules: hard-edged rectangles only (no anti-aliasing, no gradients except pre-baked glow fields inside portal energy), 1px lit crown + dark underside on every horizontal member, collars/flanges at conduit joints, light from above-left, chunky 2–4px outlines, sparse lit windows/indicators. No photorealism, no brand logos; tech references only as small baked text on environmental screens (≤6 glyphs, 5×7 pixel-font style).

## 2. Asset list (9 placed objects = 16 files)

| # | File (under `public/assets/data-world/`) | Source px (2×) | Display (world px) | World pos / origin | Transparency | Animated? |
|---|-------------------------------------------|----------------|--------------------|--------------------|--------------|-----------|
| 1 | `skills-infrastructure-strip.png` | 3000×680 | 1500×340 | (750, 620), origin (0.5,1); covers world y 280..620, x 0..1500 | RGBA; **fully transparent above source y=40** (world y<300) | No |
| 2 | `skills-portal-return-f0.png` … `-f3.png` | 400×500 each | 200×250 | (0, 560), origin (0,1); spans x 0..200, mouth centred on trigger x=60 | RGBA around frame; energy field opaque inside frame; **base step opaque** (occludes climb-sink) | Yes — 4 frames, 0.8 s loop; frame 0 under reduced motion |
| 3 | `skills-portal-forward-f0.png` … `-f3.png` | 360×520 each | 180×260 | (1350, 560), origin (0.5,1); spans x 1260..1440, mouth on trigger x=1350 | RGBA; base step opaque | Yes — 4 frames, 0.8 s loop |
| 4 | `skills-station-sql.png` + `-lit.png` | 192×208 | 96×104 | (440, 560), origin (0.5,1) | RGBA | No (lit = texture swap) |
| 5 | `skills-station-python.png` + `-lit.png` | 192×208 | 96×104 | (570, 560) | RGBA | No |
| 6 | `skills-station-excel.png` + `-lit.png` | 192×208 | 96×104 | (700, 560) | RGBA | No |
| 7 | `skills-station-power-bi.png` + `-lit.png` | 192×208 | 96×104 | (830, 560) | RGBA | No |
| 8 | `skills-station-tableau.png` + `-lit.png` | 192×208 | 96×104 | (960, 560) | RGBA | No |
| 9 | `skills-station-streamlit.png` + `-lit.png` | 192×208 | 96×104 | (1090, 560) | RGBA | No |

Aspect ratios: strip 3000:680 ≈ 4.41:1; return portal 400:500 = 0.80 (asymmetric: arch + sign wing); forward portal 360:520 ≈ 0.69 (matches Surface portal 427:621 ≈ 0.687); stations 192:208 ≈ 0.923 = current texture 96:104, so **hitboxes are unchanged**.

## 3. What is composited vs separate

- **Composited into the strip (#1)**: hall walls, all conduit runs + collars + flow segments, cable trays, gantry posts, server racks (both ends), machinery blocks, steam-vent bases, the two walkway slabs at exactly (300,420,120×16) and (520,350,96×16), the two environmental screens + their tech text, floor face + sub-floor to y=620, magenta ground rim at world y=560, baked "SKILLS" chapter name above the return arch (world x≈20..180, y≈300..330).
- **Separate PNGs**: return portal (#2), forward portal (#3), six stations idle+lit (#4–9). Portals and stations stay separate because they are the interactive/hero objects: independent depth (3 vs 6), independent hitboxes/triggers, lit-state swapping, and portal animation — the same split Surface proved.
- **Kept as-is (not artwork)**: pipe trigger containers (hidden on skills, like cliff), ground physics body, rim rect, robot frames, travel overlay, video background.
- Do **not** combine environment + portals + stations into one composite; each foreground asset ships on its own transparent background.

## 4. Animation policy

- Only the two portals animate (4-frame energy fields, 200 ms/frame, 0.8 s loop). Under `prefers-reduced-motion` they freeze on frame 0.
- Stations: static idle/lit pair only. No steam or screen-glow overlays in this stage (they were optional in the initial plan; dropped to keep the asset count at 16 and the code minimal). Can be added later as tiny overlay sprites without layout changes.
- The background video keeps its existing dual-`<video>` crossfade loop — untouched.

## 5. Station identities (each recognisable, one family — see `docs/skills-concept/skills-station-*.svg`)

sql = stacked data-vault drums with cyan band · python = code console with `>>>` · excel = spreadsheet grid cabinet · power-bi = ascending bar chart · tableau = scatter of plus-marks · streamlit = live-app kiosk with play triangle + line chart. All share the violet housing / dark screen / cyan+magenta accent system.

## 6. Naming & registration conventions

- Location: `public/assets/data-world/` (Surface assets already live there).
- Station file names key off `skills.data.ts` ids exactly (`sql`, `python`, `excel`, `power-bi`, `tableau`, `streamlit`) so `buildStations` can resolve `skills-station-${station.id}[-lit]`.
- Texture keys in `WorldScene.preload()`: `skills-strip`, `skills-portal-return-f0..f3`, `skills-portal-forward-f0..f3`, `skills-station-<id>`, `skills-station-<id>-lit` — mirroring the existing `surface-*` keys.
- Deterministic, committed PNGs; no runtime network fetches; no secrets.

## 7. Acceptance notes for artists/generators

- Strip edges (source x=0 and x=3000) must be dark wall, so camera clamping at scrollX 0 / 780 never reveals a seam.
- Keep the walk corridor world y 460..560 free of opaque art except the bases of return portal / stations / forward portal (robot is 56×62, feet at y=560).
- Return-portal art: arch mouth centred on x=60 (in the 200-wide frame: arch inner ≈ x 36..84), sign wing x 100..192 with text "SURFACE", opaque base step across the full 200 width at the bottom 12 px.
- Forward-portal art: mouth centred on its own centreline (display origin 0.5 → world x=1350), sign plate "PROJECTS" above the arch, opaque base step full width.
- Each station: screen face ≈ 40×36 world px centred, leaving room for a small tag; lit variant differs only in screen brightness / accent intensity (same silhouette).
- Verify after placement with the runtime probe (`__worldScene` display list): source bbox ≠ visible bbox; record tight alpha>128 bboxes like the Surface entries in the audit doc.
