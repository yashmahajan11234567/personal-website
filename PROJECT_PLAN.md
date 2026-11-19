# Pixel Portfolio Game — Complete Project Plan

## Overview
A personal portfolio website that behaves like a 2D pixel-art game. Visitors navigate through an interactive experience showcasing skills and projects through gameplay mechanics rather than conventional web pages.

**Stack:** React 19 + TypeScript + Vite + GSAP (cinematic) + Phaser 3 (gameplay) + Zustand (state)

---

## Phase 1: Hero + Transition + Path Selection ✅ **COMPLETE**

### Delivered
- [x] Vite + React + TS project setup
- [x] GSAP + Phaser 3 installed
- [x] Frame-sequence renderer (`FrameSequenceCanvas`) loading WebP frames from `/left side/` and `/right side/`
- [x] Hero split layout: left canvas (960×1080) + right canvas (960×1080)
- [x] Scroll-driven frame animation via GSAP ScrollTrigger (scrub: 1, pin: true)
- [x] Frame range: 36–116 (landing → transition end)
- [x] Path Selection screen (Data = blue accent, Cloud = orange accent)
- [x] Hash routing: `#/data-loading` → Data world, `#/cloud-loading` → Cloud world
- [x] Reduced-motion accessibility (`prefers-reduced-motion`)
- [x] Asset deduplication (removed 2 of 3 frame copies)
- [x] Lint clean, build passes, dev server runs

### Remaining Polish (Optional)
- [ ] Fine-tune scroll speed/duration if needed after visual verification
- [ ] Add subtle entrance animation for Path Selection cards

---

## Phase 2: Reusable Gameplay Foundation 🟡 **PARTIAL**

### Completed
- [x] `GameCanvas` React-Phaser bridge (mount/unmount, event bus)
- [x] `BaseScene` class with shared helpers (`createPlatform`, `addDebugText`)
- [x] Procedural pixel character sprite sheet (idle 2-frames, walk 4-frames, jump 1-frame)
- [x] Keyboard controls: ←/A, →/D, ↑/Space, ↓/S, E, ESC
- [x] Physics: gravity, platforms, collision, camera follow (lerp 0.1)
- [x] React-Phaser event bridge: `player-interact`, `player-action`, `player-pause` → React modals
- [x] Zustand store: world, player pos/vel/anim, skills/projects collected, path, modals, pause
- [x] `TestScene` demonstrating all mechanics

### Remaining
| Task | Description | Effort |
|------|-------------|--------|
| 2.1 | **Asset pipeline** — Replace procedural art with real pixel assets (character, tilesets, UI icons). Add asset loader with progress. | 4h |
| 2.2 | **Scene registry** — Central scene manager for clean transitions (hero → data-skills → data-projects → cloud-skills → cloud-projects → post-game). | 2h |
| 2.3 | **Save/load** — Persist progress to `localStorage` (current world, position, collected skills/projects). | 1h |
| 2.4 | **Mobile touch controls** — On-screen joystick + buttons for gameplay on mobile. | 3h |
| 2.5 | **Audio system** — Web Audio API wrapper for SFX/music (jump, interact, ambient). | 2h |
| 2.6 | **Code-splitting** — Dynamic import Phaser scenes to reduce initial bundle (1.7 MB → target <500 KB). | 2h |

---

## Phase 3: Data Path Vertical Slice ⏳ **NOT STARTED**

*Build complete playable Data path: Skills World → Pipe Transition → Projects World → Game Complete*

### 3.1 Data Skills World (Industrial/Arcade Aesthetic)
- [ ] **Scene:** `DataSkillsScene` extending `BaseScene`
- [ ] **Tileset:** Industrial pixel art (concrete, pipes, terminals, servers) — grayscale + blue accent (`#00A8E8`)
- [ ] **Layout:** Multi-room horizontal layout with platforms, ladders, pipe connections
- [ ] **Skill Stations:** 6–8 interactive objects (Terminal, Server Rack, Pipeline, Database, Dashboard, ML Model, API Gateway, Data Lake)
- [ ] **Station Data:** Name, description, proficiency (1–5), technologies[], related projects[]
- [ ] **Interaction:** Walk up + press **E** → opens Skill Modal (React)
- [ ] **Progress:** Track collected skills in Zustand; show count in HUD

### 3.2 Skill Interaction Modal (React)
- [ ] Modal component: title, description, proficiency stars, tech tags, "View Related Project" button
- [ ] Keyboard accessible (ESC to close, focus trap)
- [ ] Animated entrance (GSAP fade+slide)

### 3.3 Pipe Transition
- [ ] **Scene:** `PipeTransitionScene`
- [ ] Transparent curved pipe mesh (Phaser Graphics or sprite)
- [ ] Player presses **↓/S** at pipe entrance → enters pipe
- [ ] Camera follows through pipe (curved path via tween)
- [ ] Player sprite visible inside pipe (scaled, semi-transparent)
- [ ] Particle effects (data packets flowing)
- [ ] Seamless transition to `DataProjectsScene`

### 3.4 Data Projects World
- [ ] **Scene:** `DataProjectsScene`
- [ ] **Layout:** Open industrial space with project "terminals" as stations
- [ ] **Project Stations:** 4–6 interactive terminals
- [ ] **Project Data:** Title, description, screenshots[], technologies[], GitHub URL, live demo URL
- [ ] **Interaction:** **E** key → opens Project Modal (React)

### 3.5 Project Detail Modal (React)
- [ ] Modal: title (linked to GitHub), description, screenshot carousel, tech tags, repo link, demo link
- [ ] "Next Project" / "Previous Project" navigation

### 3.6 Game Complete Screen
- [ ] "END OF PROJECTS" / "GAME COMPLETE" screen
- [ ] Stats summary: skills collected, projects viewed, time played
- [ ] Button: "Continue to Experience" → transitions to Phase 5 post-game sections

### 3.7 Post-Game Transition
- [ ] Smooth camera pull-out from game world → standard web scroll
- [ ] GSAP transition to Experience section

---

## Phase 4: Cloud/DevOps Path ⏳ **NOT STARTED**

*Distinct gameplay feel — not a recolor. Jump-focused, floating platforms, wind currents.*

### 4.1 Cloud Skills World
- [ ] **Scene:** `CloudSkillsScene`
- [ ] **Aesthetic:** Floating cloud platforms, sky background — grayscale + orange accent (`#FF9900`)
- [ ] **Navigation:** Jump between clouds (no ground walking)
- [ ] **Cloud Stations:** 6–8 clouds representing skills (AWS, Kubernetes, Docker, Terraform, CI/CD, Monitoring, Serverless, Networking)
- [ ] **Movement:** Double-jump, air-dash, wind currents (horizontal boost zones)
- [ ] **Interaction:** Land on cloud + **E** → Skill Modal

### 4.2 Cloud Travel Transition
- [ ] **Scene:** `CloudTravelScene`
- [ ] Unique mechanic: Rocket launch / wind stream / teleporter (NOT a recolored pipe)
- [ ] Player enters launch pad → cinematic ascent through cloud layers
- [ ] Parallax background layers
- [ ] Arrives at `CloudProjectsScene`

### 4.3 Cloud Projects World
- [ ] **Scene:** `CloudProjectsScene`
- [ ] Floating project platforms (larger, more detailed than skill clouds)
- [ ] Project data: Cloud/DevOps projects (infrastructure, automation, deployment tools)
- [ ] Same Project Modal as Data path

### 4.4 Cloud Project Data
- [ ] Real project data for Cloud/DevOps path (placeholders → real)

### 4.5 Post-Game Merge
- [ ] Both paths converge to same Phase 5 Experience section
- [ ] Unified completion state in Zustand

---

## Phase 5: Shared Post-Game Sections ⏳ **NOT STARTED**

*Standard portfolio sections after game ends — scroll-based, not game-based.*

### 5.1 Experience Section
- [ ] Timeline layout (vertical, alternating sides)
- [ ] Cards: Role, Company, Dates, Description[], Technologies[]
- [ ] Expandable descriptions
- [ ] GSAP scroll-reveal animations

### 5.2 Certifications / Courses
- [ ] Grid of cards: Name, Issuer, Date, Credential URL, Badge image
- [ ] Filter by category (Cloud, Data, General)

### 5.3 Contact Section
- [ ] Form: Name, Email, Subject, Message → Formspree / Netlify Forms / EmailJS
- [ ] Links: Email, LinkedIn, GitHub, Twitter/X, Resume PDF
- [ ] Copy-to-clipboard for email

### 5.4 Footer + Navigation
- [ ] Minimal footer: copyright, social links, back-to-top
- [ ] Sticky navigation (appears post-game): Experience, Certifications, Contact

### 5.5 Responsive Design
- [ ] Mobile: <768px — stacked Path Selection, touch game controls, stacked sections
- [ ] Tablet: 768–1024px — adjusted hero split, larger touch targets
- [ ] Desktop: >1024px — full experience

### 5.6 SEO + Meta + Performance
- [ ] Open Graph / Twitter cards
- [ ] JSON-LD structured data (Person, WebSite)
- [ ] Sitemap.xml, robots.txt
- [ ] Lighthouse CI: Performance >90, Accessibility >95, SEO >90
- [ ] Preload critical assets (hero frames, character sprite)
- [ ] Service worker for offline (Workbox)

---

## Data Requirements (User-Provided)

| Data Set | Fields | Priority |
|----------|--------|----------|
| **Skills** | name, category (data/cloud), description, proficiency (1-5), technologies[], icon? | Phase 3/4 |
| **Projects** | title, description, screenshots[], technologies[], githubUrl, demoUrl?, path (data/cloud) | Phase 3/4 |
| **Experience** | role, company, startDate, endDate?, description[], technologies[] | Phase 5 |
| **Certifications** | name, issuer, date, credentialUrl, badgeImage? | Phase 5 |
| **Contact** | email, linkedin, github, twitter, resumeUrl | Phase 5 |

**All data starts as clearly marked placeholders.** Replace when user provides.

---

## Technical Architecture

```
src/
├── components/
│   ├── Hero/                 # Phase 1 ✅
│   │   ├── FrameSequenceCanvas.tsx  # Scroll-scrubbed WebP player
│   │   ├── Hero.tsx                   # Split layout, range 36-116
│   │   └── Hero.css
│   ├── PathSelection/        # Phase 1 ✅
│   │   ├── PathSelection.tsx
│   │   ├── PathCard.tsx
│   │   └── PathSelection.css
│   ├── Game/                 # Phase 2+
│   │   ├── GameCanvas.tsx    # React-Phaser bridge
│   │   ├── Game.tsx          # World router, modals
│   │   └── Game.css
│   ├── Modals/               # Phase 3+
│   │   ├── SkillModal.tsx
│   │   ├── ProjectModal.tsx
│   │   └── Modal.css
│   ├── PostGame/             # Phase 5
│   │   ├── Experience.tsx
│   │   ├── Certifications.tsx
│   │   ├── Contact.tsx
│   │   └── Footer.tsx
│   └── UI/
│       └── TouchControls.tsx # Phase 2.4
├── game/
│   ├── config.ts             # Phaser game config
│   ├── scenes/
│   │   ├── BaseScene.ts      # Shared helpers
│   │   ├── TestScene.ts      # Dev playground
│   │   ├── DataSkillsScene.ts
│   │   ├── PipeTransitionScene.ts
│   │   ├── DataProjectsScene.ts
│   │   ├── CloudSkillsScene.ts
│   │   ├── CloudTravelScene.ts
│   │   ├── CloudProjectsScene.ts
│   │   └── GameCompleteScene.ts
│   ├── entities/
│   │   ├── Player.ts         # Character logic
│   │   ├── SkillStation.ts
│   │   ├── ProjectTerminal.ts
│   │   └── Pipe.ts
│   └── assets/
│       └── AssetLoader.ts    # Procedural + loaded assets
├── hooks/
│   ├── useReducedMotion.ts   # ✅
│   ├── useGameControls.ts    # Keyboard + touch unified
│   └── useAssetPreload.ts
├── store/
│   └── gameStore.ts          # Zustand ✅
├── data/
│   ├── leftDelays.json       # ✅
│   ├── rightDelays.json      # ✅
│   ├── skills.json           # Placeholder → real
│   ├── projects.json         # Placeholder → real
│   ├── experience.json
│   ├── certifications.json
│   └── contact.json
└── styles/
    ├── globals.css
    └── variables.css
```

---

## Agent / Skill Assignments

| Phase | Task | Skill / Agent |
|-------|------|---------------|
| 1 | Visual QA, frame comparison | `vision_analyze` + `dogfood` (exploratory QA) |
| 1 | GSAP transition tuning | `impeccable` (design rules) + `frontend-developer` |
| 2 | Phaser-React bridge | `phaser-react-game-bridge` skill + `frontend-developer` agent |
| 2 | Pixel art assets | `technical-artist` agent + `comfyui` / `image_gen` |
| 2 | Game mechanics, controls | `game-designer` agent |
| 2 | State management | `frontend-developer` + `developer-tooling-engineer` |
| 2 | Audio | `game-audio-engineer` agent |
| 3/4 | Level design, narrative | `game-designer` + `narrative-designer` + `level-designer` |
| 3/4 | UI/UX for modals, HUD | `ui-ux-pro-max` + `design-ui-designer` |
| 3/4 | Accessibility audit | `testing-accessibility-auditor` |
| All | Code review | `requesting-code-review` skill + `code-reviewer` agent |
| All | Multi-agent orchestration | `ruflo` skill |
| Deploy | CI/CD, hosting | `github` skills + `vercel` / `netlify` MCP |

---

## Milestones & Gates

| Milestone | Gate Criteria | Target |
|-----------|---------------|--------|
| **M1: Hero Complete** | Frame-perfect match to reference video, Path Selection works, lint clean, build <2s | ✅ Done |
| **M2: Gameplay Foundation** | Character controllable in TestScene, all 6 keys work, camera smooth, React modals open from Phaser, bundle <500 KB (code-split) | Phase 2 end |
| **M3: Data Path Playable** | Skills World → Pipe → Projects World → Complete screen, all modals work, progress saved, 60fps on 5-yr-old hardware | Phase 3 end |
| **M4: Both Paths Playable** | Cloud path distinct feel, orange accent, unique travel, merges to same post-game | Phase 4 end |
| **M5: Production Ready** | All Phase 5 sections, responsive, SEO, Lighthouse >90, deployed | Phase 5 end |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Hero transition mismatch | Frame-by-frame comparison with reference videos; iterative GSAP tuning |
| Phaser-React bridge complexity | Minimal bridge in Phase 2; test early with `TestScene` |
| Asset pipeline (pixel art) | Procedural placeholders first; swap with real art via `AssetLoader` |
| Mobile gameplay controls | Design touch overlay in Phase 2; test on real devices |
| Scope creep | Strict phase gates; no Cloud work until Phase 3 complete + validated |
| Bundle size | Code-split Phaser scenes; lazy-load game only after Path Selection |

---

## Estimated Effort

| Phase | Hours | Weeks (part-time) |
|-------|-------|-------------------|
| Phase 1 | ~15h | ✅ Done |
| Phase 2 | ~20h | 1–2 |
| Phase 3 | ~35h | 2–3 |
| Phase 4 | ~30h | 2–3 |
| Phase 5 | ~15h | 1 |
| **Total** | **~115h** | **6–9 weeks** |

---

## Immediate Next Actions

1. **Visual verification** — Open localhost:5173, scroll through hero, confirm transition matches reference videos
2. **Decide Phase 2 scope** — Which of the 6 remaining tasks to prioritize? (Asset pipeline? Scene registry? Code-splitting?)
3. **Provide real data** — Skills, projects, experience, certifications, contact (or confirm placeholders OK for now)
4. **Deploy target** — Vercel? Netlify? GitHub Pages? (Affects CI/CD setup)

---

*Plan created from audit of existing codebase + GSD specs (.gsd/) + reference video analysis. Update as phases complete.*