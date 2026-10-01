# Master Plan: Pixel Portfolio Game

## Goal
Build a pixel-art game portfolio website where visitors scroll through a cinematic hero transition, choose between Data (left) or Cloud/DevOps (right) paths, navigate gamified skill/project worlds (pipe-travel for Data, cloud-jumping for Cloud), and finish at a shared Experience section.

## Current Context / Assumptions
- **Project location**: `C:/Users/hitoy/Downloads/portfolio_website/` (clean slate — no existing `src/` to preserve)
- **Reference assets**: 
  - `left side/` — 232 WebP frames (PERSONAL → DATA ANALYST/DATA ENGINEER) + `start-to-left.mp4` (11s) reference
  - `right side/` — 223 WebP frames (PORTFOLIO → CLOUD/DEVOPS) + `start-to-right.mp4` (12s) reference
- **Stack**: React 19 + TypeScript + Vite + GSAP 3.15 + Phaser 3 (v4.2.1) + Zustand 5
- **Data source**: User will provide real skills/projects/experience/certifications/contact; use placeholders until then
- **Deployment**: Vercel (recommended for Vite SPA)
- **Phase 1 status**: Project setup, dependencies installed, frame timing extracted, frames copied to public, design tokens, globals, reduced motion hook, FrameSequenceCanvas, Hero, PathSelection, App router, game store, Vite config, index.html updated — all implemented and ready for visual QA.

## Architecture / Proposed Approach
**Phase 1 (Hero + Selection)**: React/GSAP only. Pinned hero with `FrameSequenceCanvas` rendering actual WebP frame sequences via scroll progress. Path Selection cards route via hash to `#/data-world` or `#/cloud-world`.

**Phases 2-4 (Gameplay)**: Phaser 3 handles all game worlds. `<GameCanvas>` React bridge mounts Phaser, syncs scroll via GSAP ScrollTrigger (horizontal for Data, vertical for Cloud). Shared `BaseScene`, `Player` entity, `AssetLoader`. Zustand store persists world/position/collected data.

**Phase 5 (Post-Game)**: Standard React sections (Experience, Certifications, Contact) with GSAP scroll-reveal.

**Data flow**: JSON files in `src/data/` → loaded by scenes → React modals for skill/project details.

## Step-by-Step Tasks

### Phase 1: Hero + Transition + Path Selection (In Progress)
*Follow the existing Phase 1 plan: `.hermes/plans/2026-09-30_170000-phase1-revised-plan.md`*
- Tasks 1.1–1.15: Project setup, frame timing extraction, design tokens, FrameSequenceCanvas, Hero, PathSelection, App router, game store, Vite config, index.html, visual QA, code review, accessibility audit, final acceptance.
- **Current status**: Build passes, lint clean, dev server running. Visual QA pending.

### Phase 2: Reusable Gameplay Foundation
*Tasks to be detailed in a subsequent plan*
- 2.1: Create `src/game/config.ts` (Phaser game config)
- 2.2: Create `src/components/Game/GameCanvas.tsx` (React-Phaser bridge)
- 2.3: Create `src/game/scenes/BaseScene.ts` (shared helpers)
- 2.4: Create `src/game/entities/Player.ts` (procedural sprite sheet: idle/walk/jump)
- 2.5: Create `src/game/systems/Controls.ts` (keyboard + touch controls)
- 2.6: Create `src/game/entities/Platform.ts` (static physics bodies)
- 2.7: Create `src/components/Game/GameBridge.ts` (React-Phaser event bridge)
- 2.8: Extend `src/store/gameStore.ts` (player position, collected skills/projects, paused state)
- 2.9: Create `src/game/assets/AssetLoader.ts` (procedural → real asset pipeline)
- 2.10: Create `src/game/scenes/TestScene.ts` (validation scene)
- 2.11: Update `src/components/Game/Game.tsx` to use `<GameCanvas>` and render React modals
- 2.12: Create `src/components/UI/TouchControls.tsx` (on-screen joystick/buttons)

### Phase 3: Data Path Vertical Slice
*Tasks to be detailed in a subsequent plan*
- 3.1: Create `src/game/scenes/DataSkillsScene.ts` (industrial grayscale + blue accent, skill stations)
- 3.2: Create `src/game/entities/SkillStation.ts` (interactive objects with skill data)
- 3.3: Create `src/components/Modals/SkillModal.tsx` (React modal for skill details)
- 3.4: Create `src/game/scenes/PipeTransitionScene.ts` (transparent curved pipe with camera tween)
- 3.5: Create `src/game/scenes/DataProjectsScene.ts` (open industrial space, project terminals)
- 3.6: Create `src/components/Modals/ProjectModal.tsx` (React modal for project details)
- 3.7: Create `src/game/scenes/GameCompleteScene.ts` ("END OF PROJECTS" screen with stats)
- 3.8: Implement post-game transition (camera pull-out → Experience section)

### Phase 4: Cloud/DevOps Path
*Tasks to be detailed in a subsequent plan*
- 4.1: Create `src/game/scenes/CloudSkillsScene.ts` (floating cloud platforms, jump/air-dash/wind currents)
- 4.2: Create `src/game/scenes/CloudTravelScene.ts` (unique mechanic: rocket/wind stream/teleporter)
- 4.3: Create `src/game/scenes/CloudProjectsScene.ts` (floating project platforms)
- 4.4: Populate `src/data/cloudProjects.json` with real data from user's GitHub
- 4.5: Update game logic to merge both paths to same Experience section

### Phase 5: Shared Post-Game Sections
*Tasks to be detailed in a subsequent plan*
- 5.1: Create `src/components/PostGame/Experience.tsx` (vertical timeline with expandable descriptions)
- 5.2: Create `src/components/PostGame/Certifications.tsx` (filterable grid: Data/Cloud/General)
- 5.3: Create `src/components/PostGame/Contact.tsx` (form + links, Formspree/EmailJS)
- 5.4: Create `src/components/PostGame/Footer.tsx` and update `App.tsx` for sticky nav
- 5.5: Implement responsive design (breakpoints: <768px mobile, 768-1024px tablet, >1024px desktop)
- 5.6: Add SEO/Open Graph/Twitter cards, JSON-LD, sitemap.xml, robots.txt, Lighthouse CI, service worker (Workbox)

## Tests / Validation

### Phase 1 Validation
- **Visual QA**: Compare browser output to reference videos at 7 scroll points (0%,10%,25%,50%,75%,90%,100%) for both Data and Cloud paths using `vision_analyze` + `dogfood` (QA skill). Target: <0.5% pixel mismatch. Also verify character position, scale, typography, composition, spacing, background, animation timing, final state, clipping, whitespace.
- **Code review**: `requesting-code-review` + `impeccable` (TypeScript strict, oxlint, no console.log)
- **Accessibility audit**: `testing-accessibility-auditor` (WCAG AA, keyboard nav, ARIA labels, color contrast, reduced motion)
- **Performance**: `npm run build` + `npm run lint` pass; 60fps scrub (DevTools Performance tab)

### Phase 2-5 Validation (Per Phase)
- **Unit/Integration**: Vitest + React Testing Library for components, hooks, store
- **E2E**: Playwright for full path flows (hero → selection → skills → pipe/project → experience)
- **Visual Regression**: Pixel-diff hero frames vs reference; game scenes vs mockups
- **Performance Budgets**: Lighthouse CI — Initial load <3s (3G), Hero transition 60fps, Game worlds 60fps on 5yr hardware, Bundle <500KB (code-split Phaser scenes)
- **Accessibility**: WCAG AA for all sections
- **Data Validation**: JSON schema validation for `src/data/*` files

## Risks, Tradeoffs, and Open Questions

| Risk | Mitigation |
|------|------------|
| Hero frame mismatch | Frame-by-frame diff tool; iterative GSAP tuning |
| Phaser-React bridge complexity | Minimal bridge first; TestScene validates early |
| Asset pipeline (455 hero frames + game art) | Procedural placeholders first; lazy-load game |
| Mobile gameplay | TouchControls in Phase 2; test on real devices |
| Scope creep | Strict phase gates; no Cloud until Data validated |
| Bundle size (Phaser ~1.7MB) | Dynamic import scenes; lazy-load after Path Selection |

### Open Questions
1. **Real data timeline** — When will you provide skills/projects/experience/certifications/contact?
2. **GitHub integration** — Auto-fetch project data from repos, or manual JSON?
3. **Character art** — Procedural only, or commission pixel artist for final sprites?
4. **Audio** — Web Audio API for SFX/music — include in Phase 2 or defer?
5. **Analytics** — Plausible / GA / none?

## Next Steps
1. Complete Phase 1 visual QA, code review, accessibility audit, and final acceptance.
2. Upon Phase 1 completion, create detailed plan for Phase 2.
3. Execute Phase 2 via subagent-driven TDD.
4. Repeat for Phases 3, 4, 5.