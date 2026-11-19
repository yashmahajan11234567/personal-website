# Data World — Final Issues Implementation Plan (Phase 1 deliverable)

- Branch: `restore/data-world-386991f` @ `befcbb89`. Two independent workstreams. No source/asset/config changes were made in this phase; no commits or pushes.
- Evidence base: `DATA_WORLD_FINAL_ISSUES_AUDIT.md` (same directory).
- Global rules for both workstreams: preserve transport logic, layer transitions, trigger semantics, portal animation, player movement/collision, camera behavior, and all QA hooks unless a listed QA assertion explicitly needs updating; do not change world geometry unnecessarily; commit after each workstream (only when the user approves implementation).

---

## Workstream A — Portal artwork / transport trigger alignment (Skills return portal)

### Files expected to change

1. `src/game/scenes/WorldScene.ts` — line 1117 only: `portal('skills-portal-return', 60, 0, 165)` → `portal('skills-portal-return', 0, 0, 165)`, plus the explanatory comment on that line.
2. `qa/accept-dataworld-skills-stagek.mjs` — line 147 assertion: return portal span `60..225` → `0..165` (check title text updated accordingly).

No other file. Trigger (`worldConfig.ts:777`), spawn (90), `pipeNearX`, `PIPE_*` constants, transport (`pipeTransport.ts`), camera, player, animation frames, and grounding logic are untouched.

### Steps

1. Edit the `portal(...)` call as above; rewrite the line comment to state: art spans 0..165, glowing opening ≈31.5..141, fire zone 38..82 sits inside the opening.
2. Update `stagek.mjs:147` expected span to 0..165.
3. Run `node qa/accept-dataworld-skills-stagek.mjs` and `node qa/accept-dataworld-cards-portal.mjs` (Node Playwright CLI per project convention).

### Current vs expected behavior

- Current (VERIFIED): fire zone [38,82] lies entirely left of the glowing opening [91.5,201]; player transition fires ~86 world px left of the portal's visible center, at camera scrollX=0, player.x ∈ [38,82], y=560.
- Expected: player standing in zone [38,82] is inside the visible portal opening (art 0..165, opening ≈31.5..141); transition fires naturally as the player walks into the portal.

### Acceptance criteria

- `stagek.mjs` full pass with updated line 147, including: no visible object left of x=0 (149), portal fully inside arrival window at 1440/1280/768/390 (273), anim playing (150-155), reduced-motion freeze (256), all four chapter transitions still 12-phase (`cards-portal.mjs` t1-t4).
- `cards-portal.mjs` full pass — its alignment check (line 102: `art.left >= 0 && art.left <= pipe.x+22 && art.right >= pipe.x+22 && width >= 100`) passes unchanged with the new span 0..165; trigger still x=60, spawn 90, no re-trigger on arrival.
- New screenshots: `portal-return-1440.png` / `portal-return-390.png` show the portal opening around the player's fire position.

### Regression risks

- Left-edge clipping: none — art.left = 0 exactly satisfies the x≥0 assertion.
- Arrival re-trigger: none — spawn 90 remains outside [38,82].
- Mobile arrival window: at 390px, scrollX=0, viewW=195, art 0..165 fully visible.
- Forward direction unaffected (surface portal center 750.6 vs trigger 750; forward skills portal 1347.5 vs 1350 — both already aligned; no changes).

### Runtime QA procedures

- `node qa/accept-dataworld-skills-stagek.mjs` (desktop, reduced-motion, responsive arrivals).
- `node qa/accept-dataworld-cards-portal.mjs` (both directions + six cards + BACK button).
- Manual: `npx vite preview --port 4173`, walk left into the return portal at 1440x900 and 390x844; confirm the transition fires while the sprite is visually inside the portal opening.

---

## Workstream B — Skills InfoPanel visual redesign (cyberpunk card)

### Files expected to change

1. `src/components/InfoPanel.css` — major restyle of the `.info-panel--skill` block (lines 528-633) and skill-scoped sub-rules; base `.info-panel` layout (absolute centering, flex header/body, scroll) is kept.
2. `src/components/InfoPanel.tsx` — one small addition in `SkillPanel`: a decorative `<img>` skill icon inside the `<h3 class="info-panel__title">` row (so `.info-panel__body` keeps exactly 3 children). Icon src: `/assets/data-world/skills-station-${skill.id}.png`, `aria-hidden="true"`, `alt=""`.
3. `qa/accept-dataworld-cards-portal.mjs` — line 169 visual-spec assertions updated to the new values (background, border/glow, width); all content/behavior assertions unchanged.

Project panels (`info-panel` without `--skill`) are intentionally out of scope and keep their current style.

### Implementation steps

1. Card frame: angular outer shape via `clip-path: polygon(...)` on `.info-panel--skill`; illuminated cyan + magenta edges with layered `border`/`outline` plus `filter: drop-shadow(...)` (NOT `box-shadow`, which clip-path cuts); pixel-art corner accents via `::before`/`::after` small squares or `conic-gradient` ticks at the four corners. Keep the open/close animations and `prefers-reduced-motion` block working with the clipped shape.
2. Interior: dark navy/black content panels for the two sections (`.info-panel__section--skill` get their own darker inset background + thin border), neon section labels (cyan for HOW I USED IT, magenta for PROJECT APPLICATION, uppercase, letter-spaced, mono).
3. Project rows: each `.info-panel__apps li` becomes an individually bordered row (1px border, dark fill), name/link in cyan, contribution muted — keep the existing `.info-panel__app-name` / `.info-panel__app-contrib` DOM exactly.
4. Title row: flex row with the station PNG icon (fixed ~40-48 px, `image-rendering: pixelated`) beside the skill name; keep `.info-panel__title` text content exactly the skill name (QA reads `textContent` — an aria-hidden img with empty alt contributes nothing).
5. Back button: restyle `.info-panel__back` to sit visually integrated into the card frame (corner-mounted, angular border, neon on hover/focus); keep `data-testid="panel-back"`, the scoped `.placeholder-world[data-theme='dark']` selector, label text, and focus ring.
6. Typography: keep `var(--font-mono)` / IBM Plex Mono stack; no new font files. Set explicit `line-height` on every new text element (the `.world-canvas` `line-height: 0` trap, InfoPanel.css:39-58).
7. Responsive: keep the 640px breakpoint behavior (width `calc(100% - 20px)`, `max-height: 84dvh`, scrollable body, pinned header so BACK stays reachable); verify at 390x844.
8. Update `cards-portal.mjs:169` to assert the new spec (e.g. new bg/border tokens and the deliberate card width) instead of the old `rgba(4,8,18,0.88)` / `34,211,238` / `<=560` values.

### Current vs expected behavior

- Current: correct content in a conventional rectangular modal — translucent navy card, 1px cyan border, gradient top bar, magenta labels, compact centered ≤560px.
- Expected: same content and interactions inside the reference's angular cyberpunk card (dark navy/black, illuminated cyan+magenta frame, pixel corners, mono type, dark inner panels, neon labels, bordered project rows, icon beside title, integrated Back). Content remains EXACTLY: skill name, HOW I USED IT, PROJECT APPLICATION — no Experience / Drawn As / Evidence / Repositories / Contributions sections, nothing extra at the bottom.

### Acceptance criteria

- `cards-portal.mjs` six-card loop passes: h4s exactly `['HOW I USED IT','PROJECT APPLICATION']`, `bodyChildren===3`, last child is PROJECT APPLICATION, no banned labels, apps rows intact with name+contribution+repo links, no progress bars/percentages, panel opens via Enter and closes via Escape and via `[data-testid="panel-back"]`, movement works after closing, zero page errors — at 1440 and 390.
- `stagek.mjs` InfoPanel checks pass (Enter opens panel, interaction text mentions skill, Escape closes).
- `accept-responsive.mjs` passes (no panel assertions found in it, but full suite green).
- Updated visual assertions pass; new screenshots `card-*-1440.png` / `card-*-390.png` match the reference direction.
- Skill panel only: project panels visually unchanged.

### Regression risks

- Breaking `bodyChildren===3` by adding a sibling in the body — keep the icon inside the title `<h3>`.
- Banned-label regex tripping on new decorative text — keep all added visible text to the allowed labels/button text.
- clip-path cutting box-shadow; line-height:0 inheritance; App.css button overrides — see audit §Issue 2 risks.
- Focus trap queries `a[href], button, [tabindex]` inside the panel — new elements must not introduce untrapped focusables.
- Reduced-motion: open/close must still work with animations disabled.

### Runtime QA procedures

- `node qa/accept-dataworld-cards-portal.mjs` (1440 + 390 passes, screenshots into `qa-screenshots-cards/`).
- `node qa/accept-dataworld-skills-stagek.mjs`, `node qa/accept-dataworld-gameplay.mjs`, `node qa/accept-dataworld-exit.mjs`, `node qa/accept-responsive.mjs`.
- Manual on `npx vite preview --port 4173`: open each of the six skill cards at 1440x900 and 390x844, compare against the reference image, check BACK button, Escape, scroll behavior, and that the canvas behind stays locked.

---

## Sequencing

Workstreams are independent (different files except both touch QA suites — coordinate the two QA file edits). Suggested order: A first (one-line change + one QA assertion), verify, commit; then B, verify, commit.
