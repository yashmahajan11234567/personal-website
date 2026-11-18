# DATA WORLD — REFERENCE IMAGE ANALYSIS (Phase B)

Source images (attached by owner, 2048×682 PNG each):

- **Reference 1 — Surface / Start** = `image_223767.png`
- **Reference 2 — Skills** = `image_ef5754.png`
- **Reference 3 — Projects** = `image_1d871f.png`

**Method note (honesty):** the vision-analysis backend timed out on every call during this phase (including a 64×64 control image), so the images were analyzed programmatically instead: Tesseract OCR (2–4× upscale, Otsu) for all text, OpenCV k-means palettes, saturated-region connected components, Canny contour boxes, row brightness profiles for floor lines, and template matching of the 26 bundled robot frames against each reference. Text, colors, and geometry below are CONFIRMED from pixels; semantic labels ("this is the portal") are INFERRED from position + text and are marked as such.

---

## Reference 1 — Surface / Start (`image_223767.png`) → chapter `cliff` (width 900, spawn x=120)

**Palette (dominant):** near-black 45%, deep violet `#211735` 13.7%, `#3F2E5B` 13.4%, `#6E3A7A` 7.0%, lavender `#81629F`/`#DFC8E4`, hot magenta `#CF31AD` 3.4%, cyan `#17D3F4` 2.0%, blue `#1671AC` 1.9%, amber `#C87148` 1.7%. Direction: dark violet cyberpunk city, magenta + cyan neon.

**Elements (positions as % of image W×H):**

- **Entry structure, left** — magenta neon-framed gate/building, box x≈8.6–23.2%, y≈11–38.4% (mean `#B93AA9`/`#C43692`). OCR, CONFIRMED: big sign **"DATA WORLD"** at (11%,26%) and **"ENTRY"** at (14%,31%), with a small arrow `>` glyph. → maps to the cliff's left edge: entry pipe at x=60 + the floating chapter label. INFERRED: this is the dedicated start structure the brief asks for; it should become a distinct portal-like gate (not the current bare pipe + floating label).
- **Portal to Skills, right** — large blue structure, x≈78.4–98.3%, y≈23.8–79.4% (mean `#438DD0`, the biggest saturated region in the image, 57k px). OCR, CONFIRMED: sign **"NEXT: SKILLS >"** at (88%,31%). → maps to exit pipe `cliff-to-skills` at x=750 (83% of 900) — position agrees. Portal must be blue/cyan, tall, with a destination plate "NEXT: SKILLS".
- **Mid decorations** — boxes at x≈26.5–46.9%, y≈46.8–58.1% and amber/orange vertical elements at x≈46–50.5% (y 47–61.5%), x≈51.7–56.1% (y 62.8–79.2%, mean `#BA7D64`, 78% saturated), x≈70.6–74.8% (y 47.4–60.9%). INFERRED: pillars/props; the x≈52% amber element sits right where template matching placed the robot (`run.png` match at x≈45.8%, y≈44%, score 0.46 — weak), so a robot-like figure stands mid-level around x≈50%, feet at the floor band y≈79%. Robot placement to preserve: mid-chapter, on the floor.
- **Floor** — strong saturated horizontal bands at y≈53.4–59.5% (cov 0.41), y≈72.4–79.0% (cov 0.48), thin line y≈90.2%; dark bands at 86.5–100%. INFERRED: neon-trimmed ground surface around y≈72–79% with a dark sub-floor below; the current world puts groundY=560 at 62% of 900 — close enough; keep groundY, redesign the floor art (lit rim + neon strips + panel seams).
- **No RETURN TO PORTFOLIO button visible** in the top strip of Ref 1 (OCR noise only). The brief requires it on every level regardless → keep the shell-level DOM button, rename to "RETURN TO PORTFOLIO".

**Comparison vs current cliff:** current cliff has entry pipe + floating "DATA WORLD" label left, blue pipe + "NEXT: SKILLS" plate right (positions already match), but the entry side is a bare 44×60 tube, not a gate structure; floor is the tiled sub-floor bay; 6 bare ledge rects float mid-level (the reference shows mid structures that are attached/decorative, not bare bars).

---

## Reference 2 — Skills (`image_ef5754.png`) → chapter `skills` (width 1500, spawn x=144)

**Palette:** black 48.9%, navy `#11153B` 13.9%, purple `#422E7B` 11.7%, lavender `#E5D0EF` 5.9%, cyan `#0DCAF8` 3.9%, blue `#0865BF` 3.9%, violet `#876BC3`, magenta `#A11FBC` 3.5%, orange `#EB8714` 2.4%.

**Six skill stations in one row** — six monolith/kiosk boxes, each ≈9–10% wide × 28.7% tall, tops y≈30.8%, bottoms y≈59.5%, x-centers ≈ **23.0 / 33.7 / 44.4 / 54.7 / 65.3 / 76.2%**. Each has: a colored icon area (y≈33–44%) and a name sign at y≈46%. OCR, CONFIRMED, left→right:

1. x≈23% — icon teal `#4A9491` — sign **"PYTHON"**
2. x≈33.7% — icon cyan `#0FAAD2` — sign **"SQL"** (OCR "saQL")
3. x≈44.4% — icon olive-yellow `#8FA658` — sign **"POWER BI"**
4. x≈54.7% — icon blue `#3E86A5` — sign **"TABLEAU"**
5. x≈65.3% — icon green `#0A9263` — sign **"EXCEL"**
6. x≈76.2% — icon mauve `#8C516F` — sign **"STREAMLIT"**

⚠ **Order discrepancy:** the reference order is **Python, SQL, Power BI, Tableau, Excel, Streamlit**, but the content model `skillOrder` is `sql, python, excel, power-bi, tableau, streamlit`. The brief's own list matches the reference. → Plan: reorder the data-world skill stations to the reference order (config-only change in `worlds.data.ts` `skillOrder`, or an explicit per-chapter order in `worldConfig`); the skill records themselves are untouched.

**Portals:** left edge structure x≈0–5.2% (tall, y≈24.6–69.2%) = portal back to Surface (OCR of the sign failed — label likely "SURFACE"/"START"; INFERRED from position mirroring Ref 1/Ref 3); right edge structure x≈83.8–98% with sign OCR CONFIRMED **"PROJECTS"** ("prosecrs 2A" / "NEXT: PROJECTS" at (88%,31%) in full-image OCR). → maps to entry pipe x=60 and exit pipe x=1350 (90% of 1500). Signage rule CONFIRMED from refs: **portals carry destination identity** ("NEXT: SKILLS", "PROJECTS", "SKILLS") — no generic labels.

**Floor:** bright full-width band y≈63–71% (cov 0.98 — a lit floor edge), cyan strips y≈71.8–74.2% at x≈7.8/15.9/38.8/56.5/83.3%, darker strips y≈75.7–77.9%, magenta/purple neon strips y≈82.6–85.6%. INFERRED: neon-striped walkway with cyan light strips; matches "metallic floor panels + neon strips".

**Robot:** template match placed a robot-like frame (`tubeenter5`, score 0.78) at x≈29.3%, bottom y≈69% — standing on the floor near the left portal. Consistent with emerging from the entry pipe.

**Comparison vs current skills:** current layout has the same six stations fitted from x=200 at 130px pitch (world x≈200–1370 = 13–91% of 1500 — matches the reference span), but art is pedestal+monitor with a tiny tag, no per-skill icon color, and wrong order; portals are bare tubes. Reference wants: tall kiosk/monolith per skill, distinct icon color per skill, big readable name sign, neon-striped floor, both portals at the edges.

---

## Reference 3 — Projects (`image_1d871f.png`) → chapter `projects` (width 1000, spawn x=144)

**Palette:** black 37.3%, navy `#111134` 16.7%, purple `#3E2874` 14.8%/`#794CB5` 6.9%, orange `#A43D0D` 4.8%, magenta `#D84DE9` 4.6%, amber `#F0A00E` 3.9%, lavender `#EBDAF0`, cyan `#09B8E7` 3.7%, light blue `#87D3F1` 3.4%.

**RETURN TO PORTFOLIO button, top-left — CONFIRMED:** cyan-bordered dark button box x≈2.1–20.9%, y≈1.9–14.2% (mean `#0BBBCD`), OCR: **"RETURN TO PORTFOLIO"** (twice). → the reference puts the exit chrome top-left exactly where the current `.world-exit` button sits (top:10px; left:10px). Keep DOM button there; rename label to "RETURN TO PORTFOLIO"; style to match (cyan border, dark fill).

**Portal back to Skills, left** — big structure x≈0–31.1%, y≈9.1–96.8%; OCR CONFIRMED sign **"SKILLS"** at (8%,32%) above **"WORLD"** at (8%,35%). INFERRED: destination-labeled portal ("SKILLS") at the left edge → maps to entry pipe x=60 (`projects-entry` → skills). Consistent with destination-identity signage.

**Four project stations** — banner signs at y≈24–40%, OCR CONFIRMED left→right:

1. x≈14–32% — **"NIFTY-100 FINANCIAL ANALYSIS"**
2. x≈30–48% — **"SQL DATA WAREHOUSE"** + **"ETL"**
3. x≈48–68% — **"PRIMETRADEAI"**
4. x≈66–92% — **"DATA ANALYTICS DASHBOARDS"**

These match the four real content-model projects exactly (no placeholders). Station bodies below signs; bases around y≈59–76.7% (big structure x≈48.3–100%, y≈59.1–96.8% and x≈0.5–77.9%, y≈80.2–96.2%).

**Floor:** bright band y≈52.6–75.5% (cov 0.96); **blue strips** y≈77.1–82.2% at x≈12.3/32.4/53.7/73.3% (four — one per project station); **magenta strips** y≈85–88.4% at x≈9.7/22.6/37.5/52.3/66.3/81.3% (six). INFERRED: per-project blue light strip + magenta floor striping.

**Robot:** template match (`tubeenter5`, score 0.72) at x≈11%, y≈43–58% — near the left portal, INFERRED standing by the entry pipe.

**Comparison vs current projects:** current four stations are 176×132 dais+console+banner at fitted pitch from x=200 (world 20–90% — matches reference span); but banner art is generic, floor is bare sub-floor, portal is a bare tube with "START/ARRIVAL" signage instead of destination label "SKILLS".

---

## Cross-reference summary

| Element | Ref 1 Surface | Ref 2 Skills | Ref 3 Projects | Current impl | Mapping |
|---|---|---|---|---|---|
| Entry/start structure | magenta gate "DATA WORLD / ENTRY" left (x≈8–23%) | — | — | bare entry pipe x=60 + floating label | make left gate a distinct structure + label plate |
| Portal → next | blue tall portal right, "NEXT: SKILLS >" (x≈78–98%) | "PROJECTS" right (x≈84–98%) | — (terminal) | blue 44×60 pipe + plate | keep pipe trigger; restyle to tall blue portal + destination plate |
| Portal → back | — | left edge structure (x≈0–5%) | "SKILLS" left (x≈0–31%) | entry pipe reused as back-portal | keep; destination-labeled sign |
| Stations | none | 6 kiosks, icon+sign, x 23–76% | 4 stations, banner signs, x 14–92% | pedestal/dais sprites at fitted pitch | keep positions/content; restyle art; fix skill order |
| Skill order | — | PYTHON, SQL, POWER BI, TABLEAU, EXCEL, STREAMLIT | — | sql, python, excel, power-bi, tableau, streamlit | change `skillOrder` to reference order |
| Floor | neon-trimmed ground y≈72–79% | lit band + cyan strips y≈63–74% | bright band + blue per-project strips + magenta strips y≈77–88% | tiled sub-floor bay + 2px rim | redesign sub-floor art; add neon strips; keep groundY=560 |
| Floating bars | mid props attached, not bare | — | — | 10 bare ledge rects | keep physics, redraw/hide visuals |
| RETURN TO PORTFOLIO | not shown (required anyway) | not shown (required anyway) | top-left cyan button (confirmed) | `.world-exit` top-left "Back to portfolio" | rename + restyle; keep testid/position |
| Robot | mid-level x≈50% on floor | x≈29% near left portal | x≈11% near left portal | 56×62 frames, 10×14 hitbox | unchanged; art placed around it |

**Unresolved / to confirm with owner:** exact portal sign strings on the back-portals of Ref 2/3 (OCR unreadable there — likely "SURFACE"/"SKILLS" destination labels); whether reference backgrounds replace the per-chapter videos or layer over them (recommend: keep videos, since the refs are mostly black sky which the videos already provide); exact pixel sizes for sliced PNG assets (to be measured from the 2048px sources at implementation).
