# CAPABILITIES MAP
## Discovery of available skills, plugins, MCP servers, agents, and CLI tools for the portfolio website project.

---

### A. PROJECT MANAGEMENT / PLANNING
- **GSD (Get Shit Done)**
  - Type: Skill / Framework
  - Purpose: Requirements tracking, roadmap, state management, phase-based planning.
  - When to use: All phases – initialize .gsd/ with PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, and phase plans.
  - Phase: 1, 2, 3

- **Project Management (Agency Agents)**
  - Type: Agent division
  - Purpose: Experiment tracking, JIRA workflow, meeting notes, project shepherding, studio operations.
  - When to use: Coordinating multi-agent work, tracking progress, managing timelines.
  - Phase: All

- **Spec Kit (GitHub Spec Kit)**
  - Type: Skill
  - Purpose: Spec‑Driven Development – write specs before implementation.
  - When to use: Clarifying requirements, defining acceptance criteria.
  - Phase: 1

---

### B. UI / UX / VISUAL DESIGN
- **Impeccable Design**
  - Type: Skill
  - Purpose: 60+ frontend rules for pixel‑perfect, accessible, maintainable UI.
  - When to use: Implementing Hero, PathSelection, ensuring visual fidelity to reference frames.
  - Phase: 1

- **UI/UX Pro Max**
  - Type: Skill
  - Purpose: Searchable design intelligence – patterns, components, best practices.
  - When to use: Designing cinematic transitions, path selection cards, game HUD.
  - Phase: 1, 2

- **Frontend Design**
  - Type: Skill
  - Purpose: Guidance for distinctive, intentional visual design – typography, layout, visual hierarchy.
  - When to use: Choosing IBM Plex Mono, distressed stencil effect, accent colors.
  - Phase: 1

- **Apple Design**
  - Type: Skill
  - Purpose: WWDC design principles translated to web – fluid interactions, clarity, deference.
  - When to use: Refining scroll‑driven GSAP transitions, interaction feedback.
  - Phase: 1

- **Design‑Image‑Prompt‑Engineer (Agency Agents)**
  - Type: Agent
  - Purpose: Crafting prompts for image generation (e.g., MidJourney) to produce assets.
  - When to use: Generating placeholder or concept art for game worlds.
  - Phase: 2, 3

- **Design‑UI‑Designer / UI‑Finish‑Gate‑Reviewer / UX‑Architect / UX‑Researcher (Agency Agents)**
  - Type: Agents
  - Purpose: UI layout, visual polish, usability research, accessibility review.
  - When to use: Validating Hero transition, PathSelection usability, game controls clarity.
  - Phase: 1, 2

---

### C. VISUAL ANALYSIS / FRAME PROCESSING
- **vision_analyze (Hermes tool)**
  - Type: Built‑in tool
  - Purpose: Load images, ask questions about content, regions, OCR, frame‑by‑frame inspection.
  - When to use: Comparing rendered output to reference frames, detecting visual discrepancies.
  - Phase: 1 (verification)

- **image‑to‑code**
  - Type: Skill
  - Purpose: Convert design images to faithful frontend code (HTML/CSS/JS).
  - When to use: Translating key frames into CSS/GSAP animations.
  - Phase: 1

- **image‑prompter / vibevideo‑generate**
  - Type: Skill
  - Purpose: Writing MidJourney prompts; generating images/videos via VibeVideo API.
  - When to use: Creating concept art for game backgrounds, characters, UI.
  - Phase: 2, 3

- **ascii‑video / ascii‑art**
  - Type: Skill (Creative)
  - Purpose: Convert video/audio to colored ASCII; generate ASCII art from images.
  - When to use: Debugging frame sequences, quick visual checks.
  - Phase: 1

- **Frame‑Driven Implementation**
  - Type: Skill (software‑development)
  - Purpose: Build UI from frame‑sequence references with exact fidelity.
  - When to use: Pixel‑perfect recreation of Hero transition from left/right side frames.
  - Phase: 1

---

### D. FRONTEND DEVELOPMENT
- **ai‑coder**
  - Type: Skill
  - Purpose: Multi‑language coding assistant with debugging, automated testing.
  - When to use: Writing/debugging React, TypeScript, GSAP, Phaser code.
  - Phase: All

- **frontend‑developer (Agency Agents)**
  - Type: Agent
  - Purpose: Implementing React/Vue/Svelte, state management, performance optimization.
  - When to use: Building Hero component, PathSelection, GameCanvas bridge.
  - Phase: 1, 2

- **software‑architect / developer‑tooling‑engineer (Agency Agents)**
  - Type: Agents
  - Purpose: High‑level architecture, dev‑tooling setup, CI/CD pipelines.
  - When to use: Structuring Phaser‑React integration, setting up Zustand store.
  - Phase: 2

- **context‑engineering**
  - Type: Skill
  - Purpose: Optimize agent context for quality – token management, retrieval augmentation.
  - When to use: Managing large prompts for agent‑based code generation.
  - Phase: All

- **bmad‑method**
  - Type: Skill
  - Purpose: Structured AI‑native development framework – specs, stories, tasks.
  - When to use: Breaking down features into implementable units.
  - Phase: All

- **superpowers**
  - Type: Skill
  - Purpose: Agentic skills framework for development methodology.
  - When to use: Standardizing agent workflows, skill creation.
  - Phase: All

---

### E. ANIMATION / MOTION
- **GSAP (via npm)**
  - Type: Library (already installed)
  - Purpose: High‑performance scroll‑driven animations, timelines, easing.
  - When to use: Hero typography transition, path selection entrance animations.
  - Phase: 1

- **GSAP Skill (implied via usage)**
  - Type: Practical capability
  - Purpose: Creating smooth, artifact‑free transitions matching reference frame timing.
  - When to use: Fine‑tuning scroll‑scrubbed Hero transition.
  - Phase: 1

---

### F. GAME DEVELOPMENT
- **phaser‑react‑game‑bridge**
  - Type: Skill
  - Purpose: Integrating Phaser 3 scenes with React components.
  - When to use: Building `<GameCanvas />`, handling scene‑ready events.
  - Phase: 2

- **game‑designer / technical‑artist / level‑designer / narrative‑designer (Agency Agents)**
  - Type: Agents
  - Purpose: Designing game mechanics, pixel art assets, level layout, story.
  - When to use: Creating pixel‑art character sprite sheet, platforms, game worlds.
  - Phase: 2, 3

- **game‑audio‑engineer / economy‑designer (Agency Agents)**
  - Type: Agents
  - Purpose: Audio design, in‑game economy systems.
  - When to use: Adding sound effects, scoring systems.
  - Phase: 3

- **blender / godot / roblox‑studio / unity / unreal‑engine (Agency Agents)**
  - Type: Agent divisions
  - Purpose: 3D modeling, engine‑specific development.
  - When to use: If 3D assets become needed (currently not).
  - Phase: N/A

---

### G. ASSET / IMAGE / VIDEO PROCESSING
- **image‑tools (general)**
  - Type: Various (vision_analyze, web_extract, etc.)
  - Purpose: Inspect, optimize, convert assets.
  - When to use: Compressing character sprite sheets, generating platform textures.
  - Phase: 2, 3

- **video‑frame extraction**
  - Type: Manual (using ffmpeg or similar via terminal)
  - Purpose: Extract frames from reference videos for inspection.
  - When to use: Verifying timing of Hero transition against supplied MP4s.
  - Phase: 1

- **asset‑inspection**
  - Type: Skill / tool
  - Purpose: Locate languages, line counts, ratios in codebases.
  - When to use: Auditing bundle size, checking for unused assets.
  - Phase: All

---

### H. BROWSER AUTOMATION / TESTING
- **Playwright**
  - Type: Skill (playwright‑skill)
  - Purpose: Browser automation for coding agents – navigation, interaction, screenshots.
  - When to use: Running visual QA, automated regression tests.
  - Phase: 1 (verification)

- **browser‑agent / computer‑use (Agency Agents)**
  - Type: Agent
  - Purpose: Drive desktop background‑first, escalate on signal – useful for complex UI interactions.
  - When to use: Automating hero scroll‑transition verification.
  - Phase: 1

- **dogfood**
  - Type: Skill
  - Purpose: Exploratory QA of web apps – find bugs, evidence, reports.
  - When to use: Manual exploratory testing of Hero, PathSelection, game controls.
  - Phase: All

- **web‑extraction / web‑search**
  - Type: Built‑in tools
  - Purpose: Extract page content, search the web for documentation.
  - When to use: Looking up GSAP/Phaser APIs, fetching CDN links.
  - Phase: All

---

### I. FUNCTIONAL QA
- **test‑automation‑engineer / reality‑checker / results‑analyzer (Agency Agents)**
  - Type: Agents
  - Purpose: Writing automated tests, validating behavior, analyzing outcomes.
  - When to use: Unit tests for game mechanics, integration tests for React‑Phaser bridge.
  - Phase: 2, 3

- **performance‑benchmarker**
  - Type: Agent
  - Purpose: Measuring FPS, memory usage, load times.
  - When to use: Ensuring 60 fps on target hardware.
  - Phase: 2, 3

- **qa‑skills**
  - Type: Skill
  - Purpose: 50 QA and test‑automation skills for AI coding agents.
  - When to use: Applying systematic testing strategies.
  - Phase: All

---

### J. VISUAL QA
- **visual‑analysis agents (via vision_analyze + agent prompting)**
  - Type: Combination
  - Purpose: Comparing screenshots to reference frames, detecting pixel‑level differences.
  - When to use: Verifying Hero transition matches left/right side frame sequences.
  - Phase: 1

- **visual‑verification workflow**
  - Type: Process
  - Purpose: Render → Capture → Compare → Iterate.
  - When to use: After each Hero/PathSelection change.
  - Phase: 1

---

### K. CODE REVIEW
- **requesting‑code‑review**
  - Type: Skill
  - Purpose: Pre‑commit review – security scan, quality gates, auto‑fix.
  - When to use: Before merging any feature branch.
  - Phase: All

- **code‑reviewer (Agency Agents)**
  - Type: Agent
  - Purpose: Engineering‑focused code review – readability, correctness, best practices.
  - When to use: Reviewing Phaser scene logic, GSAP usage.
  - Phase: All

- **simplify‑code**
  - Type: Skill
  - Purpose: Parallel 4‑agent cleanup of recent code changes.
  - When to use: Reducing technical debt after major implementations.
  - Phase: All

- **systematic‑debugging**
  - Type: Skill
  - Purpose: 4‑phase root‑cause debugging – understand bugs before fixing.
  - When to use: Diagnosing TypeScript errors, hydration mismatches.
  - Phase: All

---

### L. ACCESSIBILITY
- **testing‑accessibility‑auditor (Agency Agents)**
  - Type: Agent
  - Purpose: Auditing WCAG compliance, keyboard navigation, screen‑reader support.
  - When to use: Verifying reduced‑motion support, focus order, ARIA labels.
  - Phase: 1, 2

- **useReducedMotion hook (custom)**
  - Type: Implementation
  - Purpose: Respecting prefers‑reduced‑media query.
  - When to use: Disabling GSAP animations when user requests less motion.
  - Phase: 1

- **inclusive‑visuals‑specialist (Agency Agents)**
  - Type: Agent
  - Purpose: Ensuring designs are perceivable by users with visual impairments.
  - When to use: Checking color contrast, text legibility in Hero.
  - Phase: 1

---

### M. MULTI‑AGENT DEVELOPMENT
- **Agency Agents (230+ specialized agents)**
  - Type: Framework
  - Purpose: Providing domain‑specific agents for design, engineering, testing, etc.
  - When to use: Assigning appropriate agents to each task (see tables below).
  - Phase: All

- **ruflo**
  - Type: Skill
  - Purpose: Multi‑agent orchestration harness for AI agents.
  - When to use: Managing parallel agent workstreams, aggregating results.
  - Phase: All

- **merge‑reconciler / agent‑merge‑conflict‑arbiter**
  - Type: Skill
  - Purpose: Neutral resolution of merge conflicts between agents.
  - When to use: When agents edit overlapping files.
  - Phase: All

---

### N. MCP / EXTERNAL SERVICES
- **MCP Builder**
  - Type: Skill
  - Purpose: Guide for creating high‑quality MCP (Model Context Protocol) servers.
  - When to use: If external tooling (e.g., custom game asset pipeline) needs MCP integration.
  - Phase: N/A

- **Various MCP‑enabled skills (e.g., bgpt‑paper‑search, youtube‑content, etc.)**
  - Type: Skills
  - Purpose: Access external resources via MCP servers.
  - When to use: Researching game design patterns, fetching asset metadata.
  - Phase: All

---

### O. GIT / DEVELOPMENT OPERATIONS
- **github (via gh CLI)**
  - Type: Skill
  - Purpose: PR lifecycle, issue management, repo‑management via gh CLI.
  - When to use: Branching, committing, opening PRs, CI/CD integration.
  - Phase: All

- **github‑code‑review / github‑issue‑to‑pr / github‑pr‑workflow**
  - Type: Skills
  - Purpose: Reviewing diffs, linking issues to PRs, managing PR lifecycle.
  - When to use: Ensuring code quality before merge.
  - Phase: All

- **git‑workflow‑master (Agency Agents)**
  - Type: Agent
  - Purpose: Mastering Git workflows – branching, rebasing, conflict resolution.
  - When to use: Coordinating multi‑agent commits, maintaining clean history.
  - Phase: All

---

## AGENT ASSIGNMENT TABLES (CONCEPTUAL)

### Phase 1 – Hero + Transition + Path Selection
| Task | Agent(s) | Purpose |
|------|----------|---------|
| Visual reference analysis | vision_analyze + designer‑agents | Compare output to left/right side frames |
| Hero UI implementation | frontend‑developer + impec­p­able‑design | Build React Hero with exact typography/layout |
| Scroll‑driven GSAP transition | frontend‑developer + animation‑specialist (GSAP) | Match reference timing, easing, no artifacts |
| PathSelection cinematic overlay | ui‑ux‑pro‑max + design‑ui‑designer | Create distressed cards with blue/orange accents |
| Reduced‑motion accessibility | testing‑accessibility‑auditor + frontend‑developer | Implement prefers‑reduced‑motion media query |
| Visual QA / verification | visual‑analysis workflow + dogfood | Iterate until frame‑accurate |
| Code review | requesting‑code‑review + code‑reviewer (agents) | Pre‑commit quality gate |

### Phase 2 – Reusable Gameplay Foundation
| Task | Agent(s) | Purpose |
|------|----------|---------|
| Phaser‑React integration | phaser‑react‑game‑bridge skill + frontend‑developer | `<GameCanvas />` bridge, lifecycle |
| BaseScene & shared systems | software‑architect + game‑designer | Registry events, debug helpers, platform creation |
| Pixel‑art character sprite | technical‑artist + game‑designer | Procedural idle/walk/jump frames |
| Keyboard controls (←/A, →/D, ↑/Space, ↓/S, E, ESC) | game‑designer + frontend‑developer | Input handling, animation state |
| Physics, collision, camera follow | game‑designer + engine‑physics (implicit) | Gravity, platforms, smooth follow |
| React‑Phaser event bridge | frontend‑developer + game‑designer | Emit modals from game actions |
| Game state (Zustand) | frontend‑developer + developer‑tooling‑engineer | Store world, player, progress, modals |
| Asset pipeline (procedural pixel art) | technical‑artist + frontend‑developer | Generate assets at runtime |
| Debug overlay (FPS, position, controls) | game‑designer + testing‑performance‑benchmarker | Real‑time feedback |

### Phase 3 – Data Path Vertical Slice (Future)
| Task | Agent(s) | Purpose |
|------|----------|---------|
| Skills world (pipe transition, projects) | game‑designer + narrative‑designer | Design level layout, storytelling |
| Pipe transition animation | frontend‑developer + GSAP skill | Cinematic entry to gameplay |
| Project showcase UI | frontend‑developer + ui‑ux‑pro‑max | Interactive project cards |
| Cloud world (AWS‑like) | game‑designer + technical‑artist | Platforms, enemies, collectibles |
| Persistent progress (localStorage) | frontend‑developer + developer‑tooling‑engineer | Save completed projects |
| Final polish & performance | testing‑performance‑benchmarker + qa‑skills | Optimize bundle, ensure 60 fps |
| Accessibility audit | testing‑accessibility‑auditor | Full WCAG AA check |
| Production build & deploy | github + devops‑skills (awesome‑copilot‑skills, microsoft‑skills) | CI/CD, static hosting |

---
*This capabilities map reflects the actual installed skills, Agency Agent divisions, and built‑in tools available in the current Hermes environment. Only existing capabilities are documented; no invented capabilities are included.*