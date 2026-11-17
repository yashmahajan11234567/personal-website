# Data World — Final Issues Audit (Phase 1, audit only)

- Repo: `/Users/yashsiphone/personal-website-river`
- Branch: `restore/data-world-386991f`, HEAD `befcbb898d4e92be5a2c2ae89ff8cfd278cd058e` (matches the known completed Surface commit)
- Working tree at audit time: 16 modified files (QA screenshots + `qa/accept-*.mjs`, `src/components/InfoPanel.{tsx,css}`, `WorldShell.{tsx,css}`, `src/content/{skills.data,types}.ts`, `src/game/art/worldObjects.ts`, `src/game/config/worldConfig.ts`, `engine.ts`, `WorldScene.ts`, `dataPipeSkin.ts`) and many untracked planning `.md` files. **All preserved; nothing was changed, committed, or pushed.**
- Method note: the vision-analysis backend returned HTTP 410 during this session, so the supplied screen recording (`~/Desktop/Screen Recording 2026-11-17 at 12.08.39 PM.mov`, 9.05 s, 2940x1912) could not be eyeballed. Evidence below is from source code plus programmatic pixel measurement of the committed PNG assets and QA screenshots instead. Claims are labeled VERIFIED (measured/derived from code output) or INFERRED.

---

## ISSUE 1 — Surface return portal artwork vs actual transport trigger (Skills chapter)

### Responsible code

| Role | File : line | What |
|---|---|---|
| Visible return portal artwork | `src/game/scenes/WorldScene.ts:1086-1118` — `portal()` helper, called at **line 1117**: `portal('skills-portal-return', 60, 0, 165)` | Phaser sprite, origin `(0, 1)`, display width 165, depth 3, 8-frame anim @10 fps, bottom grounded via `textureBottomPad` + `GROUND_OVERLAP_PX` (line 1095) |
| Transport trigger | `src/game/scenes/WorldScene.ts:2240-2305` `updatePipes()` + `src/game/config/worldConfig.ts:963-965` `pipeNearX()` | Fire when `pipeNearX(world, player.x)` finds a pipe (|p.x − x| ≤ `PIPE_TRIGGER_RANGE` 30 + `PIPE_HALF_WIDTH` 22 = 52) **and** the arm gate `|player.x − pipe.x| ≤ PIPE_HALF_WIDTH` (22) passes (WorldScene:2279) → effective fire zone **[38, 82]** around `skills-entry` pipe x=60 (`worldConfig.ts:777`) |
| Pipe trigger config | `src/game/config/worldConfig.ts:352,565-568,777` | `PIPE_TRIGGER_RANGE=30`, `PIPE_HALF_WIDTH=22`, `PIPE_HEIGHT=60`, skills `entryPipe` at x=60, spawn x=90 |
| Pipe mouth visuals on skills | `WorldScene.ts:1359-1362` | Both skills pipe mouths are hidden; the portal art replaces them. Triggers stay armed regardless of visibility |
| Camera | `WorldScene.ts:1947-2029` `updateCamera()` | scrollX = clamp(player.x + lookAhead − viewW/2, 0, worldW − viewW) |

### Measured coordinates (VERIFIED from assets + config)

- Portal sprite source frames: `skills-portal-return-f*.png` are **220x288**, opaque bounds x 11..218 (center 114.5, i.e. 52.05% of width), bright energy core x 42..188 (center 115), 5 px transparent bottom pad.
- Display scale = 165/220 = **0.75**. With origin (0,1) at x=60 the sprite spans **world x 60..225**; opaque art spans **68.25..223.5**; glowing opening spans **world 91.5..201 (center ≈146)**.
- Trigger fire zone: **world x 38..82**, centered on pipe x=60 (`worldConfig.ts:777`), y at ground 560.
- **Discrepancy: the fire zone [38,82] does not overlap the glowing opening [91.5,201] at all.** The player teleports while standing left of the portal's left rim (only 14 px of the opaque rim, 68..82, overlaps the zone). Opening center 146 vs trigger center 60 → **~86 world px offset (≈172 screen px at zoom 2)**. This matches the reported "trigger significantly displaced from the visible portal."
- Player position at transition (VERIFIED from code): `transport.start(near, destination, this.player.x, this.player.y)` at WorldScene:2302 — player.x anywhere in **[38,82]**, y=560 (feet).
- Camera at transition (VERIFIED from clamp math): for every QA viewport (1440x900 → viewW 720; 390x844 → viewW 195 at zoom 2) `wantedX = player.x − viewW/2 ≤ 82 − 97.5 < 0`, so **scrollX = 0** when the return transition fires. On screen at 1440: trigger at px 76..164, glowing opening at px 183..402.
- Forward direction (Surface→Skills) check (VERIFIED): cliff exit pipe at x = 900−150 = **750** (`worldConfig.ts:764`); surface portal image placed at `portalLeftX=662.35`, origin (0,1), display 176.9 wide (`WorldScene.ts:997-1008`). PNG `surface-skills-portal.png` is 427x621, opaque center at 49.88% → visible center = 662.35 + 0.4988×176.9 = **750.6 ≈ 750** (0.6 px off). **Aligned — no issue in this direction.**
- Skills→Projects forward portal (VERIFIED): `portal('skills-portal-forward', 1350, 0.5, 180)` (WorldScene:1118); trigger x = 1500−150 = 1350; sprite spans 1260..1440, visible center = 1260 + 107/220×180 = **1347.5 ≈ 1350** (2.5 px off). **Aligned.**

### Root cause (VERIFIED)

The return portal is the only portal anchored with **origin x=0 exactly at the trigger x** (line 1117), so the artwork extends 165 px to the *right* of the trigger. The convention everywhere else (forward skills portal origin 0.5 at 1350; surface portal left edge chosen so its center lands on 750) is **artwork centered on the trigger**. The left-anchor was chosen in a previous pass to keep `art.left ≥ 0` (QA constraint, see below), which is exactly what produces the misalignment. It is an **artwork anchoring error**, not a trigger error, not a camera/coordinate conversion error, and not a player hitbox issue (player body is 10x14 centered on player.x; the arm gate uses player.x directly).

### Constraints that any fix must satisfy (VERIFIED from QA suite)

- `qa/accept-dataworld-skills-stagek.mjs:149` — no visible object may extend left of world x=0 → rules out `origin 0.5 at x=60` (would give left = −22.5, clipped at scrollX=0).
- `qa/accept-dataworld-cards-portal.mjs:101-103` — trigger stays at x=60 (recording-verified), spawn 90 outside zone → rules out moving the trigger right (walking right from spawn 90 would re-fire into the zone; that regression is documented at WorldScene:1614).
- `cards-portal.mjs:102,107` — art.left ≥ 0, art inside 0..1500, art must cover the fire zone, width ≥ 100.
- `stagek.mjs:147` — currently asserts return portal spans 60..225; **must be updated** if the art moves.
- `stagek.mjs:273` — portal fully inside the arrival camera window at 1440/1280/768/390.

### Recommended minimal correction (for the plan; NOT applied)

Change **one argument** at `WorldScene.ts:1117`: `portal('skills-portal-return', 60, 0, 165)` → `portal('skills-portal-return', 0, 0, 165)` (plus its comment). Art then spans world **0..165**; glowing opening spans **31.5..141**, so the fire zone [38,82] sits **inside the visible opening** (residual center offset ≈26 px, vs 86 px now). All containment QA passes unchanged (`left=0`, right=165 ≤ 1500, covers zone, width 165 ≥ 100, inside arrival window at every viewport since scrollX=0 and viewW ≥ 195). Trigger, spawn, transport, animation, grounding, and camera are untouched. Update `stagek.mjs:147` to expect span 0..165.

---

## ISSUE 2 — Skills InfoPanel visual redesign

### Locations (VERIFIED)

- Component: `src/components/InfoPanel.tsx` (516 lines). Skill content renderer: `SkillPanel` (lines 146-192) — renders `<h3 class="info-panel__title">` + section "How I used it" (`experience.usage`) + section "Project application" (`experience.applications[]`, each row = project name as repo link when `app.repository` exists + `contribution`). Root `InfoPanel` (353-514): `<aside class="info-panel info-panel--skill">` with `data-testid="info-panel"`, `data-panel-kind`, `data-panel-id`, `role="dialog" aria-modal`, pinned header with the labelled BACK button (`data-testid="panel-back"`, lines 482-492), scrolling `.info-panel__body`, focus trap + focus restore (399-434).
- Styles: `src/components/InfoPanel.css` (633 lines). Base panel lines 20-74 (absolute, centered, `width: min(560px, calc(100% - 32px))`, `max-height: min(78vh, 640px)`, flex column, near-black `#07090f`, 1px `#2b3646` border, cyan top bar). Skill-specific block lines 528-633: `.info-panel--skill` translucent navy `rgb(4 8 18 / 88%)`, 1px cyan border `rgb(34 211 238 / 45%)`, magenta→cyan gradient `::before`, `var(--font-mono)`/IBM Plex Mono, title `clamp(24px, 3.2vw, 32px)`, magenta `h4` labels, `.info-panel__apps li` rows with magenta left rule on translucent cyan, `@media (max-width: 640px)` width `calc(100% - 20px)` / `max-height: 84dvh`. Open/close animations under `prefers-reduced-motion` (492-526).
- Render host / scroll handling: `src/components/WorldShell.tsx:454-468` — panel rendered inside `.world-canvas` (full-screen fixed container, `overflow: hidden`), `onClose={closePanel}`, `closing` flag drives the 170 ms exit animation. `updatePipes` is suppressed while `panelOpen` (WorldScene:2241), input locked behind the modal.
- Content data: `src/content/skills.data.ts` (`DATA_SKILLS`, 6 records: sql, python, excel, power-bi, tableau, streamlit), types in `src/content/types.ts:156-206` (`SkillApplication{project, contribution, repository?}`, `SkillExperience{usage?, applications?, …}`). The current content cleanup is correct and must be preserved: exactly title + HOW I USED IT + PROJECT APPLICATION, nothing else.
- Skill icon assets already committed: `public/assets/data-world/skills-station-<id>.png` and `-lit` for all six ids — usable as the per-skill icon beside the title without new art.

### What can be reused (VERIFIED)

- All content plumbing: `SkillPanel` JSX, `PORTFOLIO.skills[id]` lookup, repo-link anchors, `data-testid`s, dialog semantics, focus trap/restore, BACK button + Escape paths, `closing` animation hook, body scroll, responsive `max-height`/`dvh` pattern.
- The `.info-panel--skill` scoping approach (skill restyle isolated from project panels).

### What must change

- `InfoPanel.css` skill block: replace the rectangular bordered card with the reference's angular cyberpunk frame (clip-path polygon outer shape; cyan + magenta illuminated edges via layered borders/`box-shadow`, using `filter: drop-shadow` so the glow follows the clipped shape), pixel-art corner accents, dark inner content panels for the two sections, neon section labels, bordered individual project rows, integrated Back button styling, monospaced/pixel-inspired typography (keep `var(--font-mono)` — no new font dependency).
- `InfoPanel.tsx`: small JSX addition only — a decorative skill icon inside the title row (keeps `bodyChildren === 3`); map `skill.id` → `/assets/data-world/skills-station-<id>.png`, `aria-hidden`.
- QA updates: `qa/accept-dataworld-cards-portal.mjs:169` asserts the *current* visual spec (`bg rgba(4,8,18,0.88)`, border `34,211,238`, width ≤ 560) — these assertions must be updated to the new spec values. Content assertions (h4s exactly `['HOW I USED IT','PROJECT APPLICATION']`, `bodyChildren===3`, `lastIsApps`, banned-label regex, no progress bars, Escape/BACK close) must keep passing **unchanged**.

### Reference image status (UNVERIFIED location)

The generated reference image was supplied out-of-band (chat attachment); no copy exists in the repo (`reference/` holds only Cloud World assets; recent Desktop recordings `2026-11-17 8.30.03 AM` / `12.08.39 PM.mov` may show it but the vision backend was down). The written spec in the task brief is therefore the operative visual spec. If the image is available at implementation time, it overrides the written description.

### Regression risks

- Breaking `bodyChildren===3` / banned-label / h4-text QA by adding wrapper elements — keep any new decoration inside existing elements (title row or pseudo-elements).
- `clip-path` clipping `box-shadow` — use `drop-shadow` filter instead.
- `line-height: 0` inheritance from `.world-canvas` (documented at InfoPanel.css:39-58) — any new text element must set its own line-height.
- App.css `.placeholder-world button` overrides — new buttons must stay scoped under `.placeholder-world[data-theme='dark']` like `.info-panel__back`.
- Small-viewport fit at 390x844 (card must stay within `calc(100% - 20px)`, body scrollable, BACK reachable) — covered by `accept-responsive.mjs` / cards-portal 390 pass.
- Reduced-motion: keep the no-transition behavior for open/close.
