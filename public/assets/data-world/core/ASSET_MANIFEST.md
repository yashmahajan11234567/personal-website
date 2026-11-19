# Layer 3 (Core / Projects) — asset manifest

Sources (supplied artwork, in `~/Library/Application Support/Hermes/composer-images/`):

| Asset | File | Structure |
|---|---|---|
| A — Skills return portal | `Animated_SKILLS_Portal_Vortex_bef201.gif` | 443×443, 8 frames @ 100 ms (10 fps), RGBA, transparent bg; opaque art bbox (44,4)–(424,419); dark vortex opening x 88..353 / y 88..353 |
| B — Platform kit | `image_a03bbb.png` | 1774×887 RGBA, 25.2% transparent, 144 connected components |
| C — Hologram sheet | `image_85fb82.png` | 1159×1358 RGBA, 21.5% transparent, 4 rows × 2 cols (idle left, hover right) |

Machine-readable version: `ASSET_MANIFEST.json` (same folder).

## Extracted assets (all under `public/assets/data-world/core/`)

### Portal — `portals/skills-return/f0..f7.png`
- 443×443 RGBA each, full canvas preserved (no crop, no stretch), aspect 1:1
- Display **180×180**, origin (0,1) at x=0, depth 3 → spans world x 0..180
- Grounded by opaque bounds: visible bottom at y=563 (3 px overlap into the platform, `GROUND_OVERLAP_PX`)
- Visible opening at display scale: x ≈ 35.7..143.4 → contains the trigger arm zone 38..82 (pipe `projects-entry` x=60)

### Project holograms — `projects/<slug>/{idle,hover}.png`
Each row's idle+hover pair is cropped to the SAME union rect, so both states have identical
canvas size and the texture swap never moves the sprite (no vertical jump on hover).

| Row | Slug | Station id | Extracted | Display (w=220) | World x |
|---|---|---|---|---|---|
| 1 | nifty100 | nifty100-financial-analysis | 461×309 | 220×147 | 390 |
| 2 | sql-warehouse | sql-data-warehouse | 461×308 | 220×147 | 640 |
| 3 | primetradeai | primetradeai | 467×310 | 220×146 | 890 |
| 4 | dashboards | data-analytics-dashboards | 530×307 | 220×127 | 1140 |

Origin (0.5,1), depth 6, grounded by opaque bounds + 3 px overlap; hitbox = full sprite rect.

### Platform kit pieces — `platform/`
| File | Source bbox | Extracted | Role | Placement |
|---|---|---|---|---|
| floor/slab-1..4.png | (32,21,564,183), (580,36,965,183), (982,35,1339,183), (1363,35,1742,182) | 532×162, 385×147, 357×148, 379×147 | continuous floor, assembled edge-to-edge at uniform scale 1500/1653 = 0.90746 | top edge at y=560, depth 2, x = 0, 482.8, 832.1, 1156.1 |
| floor/grate-1.png | (30,211,391,283) | 361×72 | floor panel | x=250, scale 0.5, origin (0,0) at (250,560), depth 2 |
| floor/grate-2.png | (1066,210,1430,282) | 364×72 | floor panel | x=760, scale 0.5, origin (0,0) at (760,560), depth 2 |
| structures/pillar-1..3.png | (40,410,112,585), (135,412,207,585), (235,410,332,586) | 72×175, 72×173, 97×176 | supports under the floor | x=300/750/1200, scale 0.8, origin (0.5,0) at (x,660), depth 1 |
| decorations/rack-1.png | (566,602,778,741) | 212×139 | server rack beside portal | x=210, scale 0.55, grounded, depth 2 |
| decorations/rack-2.png | (1437,596,1723,736) | 286×140 | server rack at right boundary | x=1370, scale 0.55, grounded, depth 2 |
| decorations/accent-1.png | (28,758,133,865) | 105×107 | floor accent | x=560, scale 0.4, grounded, depth 2 |
| decorations/accent-2.png | (530,758,638,865) | 108×107 | floor accent | x=1060, scale 0.4, grounded, depth 2 |

## World layout (final)
- World 1500×900, groundY 560 (unchanged shared constants)
- Single pipe `projects-entry` at x=60 → routes to `skills` via `previousChapter` (the return portal)
- Spawn (144, 560) — 84 px right of the trigger; near zone is 8..112, so arrival never re-triggers
- Portal art spans 0..180; station 1 hitbox starts at 280 → 100 px clear walkway
- Stations at 390 / 640 / 890 / 1140 (pitch 250 from the existing fit function at width 1500)
