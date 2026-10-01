# Roadmap: Pixel Portfolio Game

## Phase Overview

| Phase | Focus | Duration | Deliverable |
|-------|-------|----------|-------------|
| **Phase 1** | Hero + Transition + Path Selection | 1-2 weeks | Complete opening experience |
| **Phase 2** | Reusable Gameplay Foundation | 1-2 weeks | Phaser-React-GSAP bridge, character, controls, scene system |
| **Phase 3** | Data Path Vertical Slice | 2-3 weeks | Skills world → Pipe → Projects world → Game Complete |
| **Phase 4** | Cloud/DevOps Path | 2-3 weeks | Cloud skills → Cloud travel → Cloud projects |
| **Phase 5** | Shared Post-Game Sections | 1 week | Experience, Certifications, Contact |

---

## Phase 1: Hero + Transition + Path Selection

### Goals
- Recreate exact hero transition from reference video
- Implement path selection UI
- Placeholder transition to future game

### Tasks
- [ ] **1.1** Set up Vite + React + TypeScript project structure
- [ ] **1.2** Install GSAP, Phaser 3 dependencies
- [ ] **1.3** Extract/organize reference frames from `left side/` and `right side/` folders
- [ ] **1.4** Build Hero component with fixed character + background
- [ ] **1.5** Implement scroll-driven typography transition (GSAP ScrollTrigger)
  - PERSONAL → DATA ANALYST / DATA ENGINEER (left)
  - PORTFOLIO → CLOUD / DEVOPS (right)
  - Character fixed, background fixed
  - Match reference timing/easing exactly
- [ ] **1.6** Create Path Selection screen (Data = blue, Cloud = orange)
- [ ] **1.7** Implement selection → placeholder game transition
- [ ] **1.8** Add reduced-motion accessibility toggle
- [ ] **1.9** Verify against reference video — no visual differences

### Acceptance Criteria
- Hero loads with PERSONAL / PORTFOLIO + character
- Scroll triggers clean typography swap
- No artifacts, ghost text, clipping, or timing drift
- Path selection appears after transition
- Clicking Data shows placeholder "Data World Loading..."
- Clicking Cloud shows placeholder "Cloud World Loading..."
- Works at 60fps on target browsers

---

## Phase 2: Reusable Gameplay Foundation

### Goals
- Build shared Phaser-React-GSAP architecture
- Create pixel character with animations
- Implement control scheme
- Scene management system

### Tasks
- [ ] **2.1** Create Phaser game config and React integration (`<GameCanvas />`)
- [ ] **2.2** Build `BaseScene` class for shared functionality
- [ ] **2.3** Implement pixel character sprite sheet (idle, walk, jump)
- [ ] **2.4** Keyboard control system: ←/A, →/D, ↑/Space, ↓/S, E, ESC
- [ ] **2.5** Physics: gravity, platforms, collision, camera follow
- [ ] **2.6** React-Phaser event bridge (game → React modals, React → game commands)
- [ ] **2.7** Game state store (Zustand/Context): current world, player position, progress
- [ ] **2.8** Asset loading pipeline for pixel art
- [ ] **2.9** Debug overlay (FPS, position, state)

### Acceptance Criteria
- Character moves smoothly with all 6 controls
- Jump works with both ↑ and Space
- Camera follows without jitter
- React modals open/close from Phaser interactions
- State persists across scene transitions
- TypeScript compiles with no errors

---

## Phase 3: Data Path Vertical Slice

### Goals
- Complete playable Data path from Skills → Pipe → Projects → End

### Tasks
- [ ] **3.1** Data Skills World scene
  - Industrial pixel environment (tileset)
  - Skill stations as interactive objects
  - Placeholder skill data (5-8 skills)
- [ ] **3.2** Skill interaction modal (React)
  - Name, description, proficiency, technologies
  - Dismissible, keyboard accessible
- [ ] **3.3** Pipe Transition scene
  - Transparent curved pipe mesh
  - Player enters with ↓/S
  - Avatar visible inside during travel
  - Camera follows through pipe
- [ ] **3.4** Data Projects World scene
  - Project stations in environment
  - Placeholder project data (3-5 projects)
- [ ] **3.5** Project detail modal (React)
  - Title (GitHub link), description, screenshots, tech stack, repo link
- [ ] **3.6** "END OF PROJECTS" / "GAME COMPLETE" screen
- [ ] **3.7** Transition to Post-Game sections

### Acceptance Criteria
- Player can walk/jump through Skills world
- All skills interactive, modals work
- Pipe entry works with ↓/S, travel visible
- Projects world loads after pipe
- All projects interactive, modals show data
- Game Complete screen appears
- "Continue to Experience" navigates to Phase 5 sections

---

## Phase 4: Cloud/DevOps Path

### Goals
- Distinct gameplay feel from Data path
- Cloud aesthetic with orange accent

### Tasks
- [ ] **4.1** Cloud Skills World scene
  - Floating cloud platforms
  - Jump-based navigation (no walking on ground)
  - Clouds as skill stations
- [ ] **4.2** Cloud Travel transition
  - Unique mechanic (e.g., wind current, rocket, teleporter)
  - Not a recolored pipe
- [ ] **4.3** Cloud Projects World scene
  - Cloud/DevOps themed environment
  - Project stations
- [ ] **4.4** Cloud project data (placeholders → real)
- [ ] **4.5** Game Complete → Post-Game merge

### Acceptance Criteria
- Feels like different game, not reskin
- Orange accent throughout
- Jump-focused controls work naturally
- Travel transition is distinct
- Merges into same Post-Game as Data path

---

## Phase 5: Shared Post-Game Sections

### Goals
- Standard portfolio sections after game ends

### Tasks
- [ ] **5.1** Experience section (timeline layout)
- [ ] **5.2** Certifications/Courses section
- [ ] **5.3** Contact section (form + links)
- [ ] **5.4** Footer + navigation
- [ ] **5.5** Responsive design for all sections
- [ ] **5.6** SEO meta, Open Graph, sitemap

### Acceptance Criteria
- All sections accessible via scroll
- Mobile responsive
- Contact form functional (or mailto)
- Performance budgets met

---

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Hero transition mismatch | Frame-by-frame comparison with reference; iterative GSAP tuning |
| Phaser-React bridge complexity | Build minimal bridge in Phase 2; test early |
| Asset pipeline (pixel art) | Use placeholder sprites first; swap later |
| Mobile gameplay controls | Design touch overlay in Phase 2 |
| Scope creep | Strict phase gates; no Cloud work until Phase 3 complete |

---

## Milestones

- **M1** (End of Phase 1): Hero + Transition + Selection working
- **M2** (End of Phase 2): Character controllable in blank world
- **M3** (End of Phase 3): Full Data path playable
- **M4** (End of Phase 4): Both paths playable
- **M5** (End of Phase 5): Production-ready portfolio