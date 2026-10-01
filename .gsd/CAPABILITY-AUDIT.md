# Capability Audit for Pixel Portfolio Game - Phase 1

## Overview
Complete inventory of every relevant skill, plugin, MCP tool, agent capability, and workflow available in the current Hermes environment, classified by relevance to Phase 1 of the Pixel Portfolio Game portfolio website.

---

## 1. VISUAL / UI DESIGN

### frontend-design (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\frontend-design`
- **Capabilities**: Design brief creation, color/type/layout token systems, aesthetic direction, distinctive visual identity, anti-template defaults
- **Relevance**: HIGH — Phase 1 requires cinematic visual fidelity, not generic card UIs
- **Phase 1 Tasks**: Task 1 (visual analysis), Task 2 (compositing strategy), Task 7 (CSS), Task 8 (App.tsx visual consistency)
- **Loading**: Load when design decisions needed (Task 1, 2, 7)

### impeccable (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\design\impeccable`
- **Capabilities**: 60+ deterministic frontend rules, CLI commands (`audit`, `critique`, `animate`, `quieter`, `typeset`), design token spec (DESIGN.md)
- **Relevance**: HIGH — Enforces non-generic design, quality gates
- **Phase 1 Tasks**: Task 7 (CSS audit), Task 15 (code review/quality gates)
- **Loading**: Install globally (`npx impeccable install`), invoke for audits

### apple-design (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\apple-design`
- **Capabilities**: 17 interaction design principles from WWDC, fluid motion, Web-translated patterns
- **Relevance**: MEDIUM — Cinematic hero motion quality, reduced motion handling
- **Phase 1 Tasks**: Task 6 (CinematicHero motion), Task 14 (accessibility/reduced motion)
- **Loading**: Reference when motion/interaction decisions needed

### popular-web-designs (Skill via creative)
- **Location**: `creative\popular-web-designs` (from skills_list)
- **Capabilities**: 54 real design systems (Stripe, Linear, Vercel) as HTML/CSS references
- **Relevance**: LOW — For inspiration only, Phase 1 is frame-driven not design-system-driven
- **Loading**: Only if design direction unclear

---

## 2. IMAGE / VIDEO / FRAME ANALYSIS

### frame-driven-implementation (Skill) ⭐ CRITICAL
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\frame-driven-implementation`
- **Capabilities**: 
  - Exhaustive frame analysis workflow (load ALL frames, vision analysis on initial/mid/final)
  - Animation spec creation (colors, positions, timing, easing, locked constraints)
  - Implementation strategy decision (Canvas vs CSS/GSAP)
  - FrameSequenceCanvas pattern (hybrid loading, LRU cache, progress→frame mapping)
  - Iterative visual verification checklist
  - Pitfalls: frames as inspiration vs contract, typography approximation, character redesign, split-frame layouts
- **Relevance**: CRITICAL — This IS the methodology for Phase 1
- **Phase 1 Tasks**: Task 1 (visual analysis), Task 4 (FrameSequenceCanvas), Task 6 (CinematicHero), Task 11 (visual QA), Task 12 (pixel-diff)
- **Loading**: MUST LOAD FIRST — primary methodology

### vision_analyze (Built-in Tool) ⭐ CRITICAL
- **Location**: Built-in Hermes tool
- **Capabilities**: Load local/remote images, analyze visual content, answer questions about frames, extract coordinates, colors, composition
- **Relevance**: CRITICAL — Primary tool for Task 1 frame inspection
- **Phase 1 Tasks**: Task 1 (extract/inspect 17+ frames, determine compositing strategy, measure hotspot coordinates)
- **Loading**: Always available, invoke directly

### video_analyze (Plugin Tool) ⭐ CRITICAL
- **Location**: Built-in plugin `video`
- **Capabilities**: Analyze MP4/WebM/MOV/AVI/MKV/MPEG via multimodal model (Gemini), up to ~50MB
- **Relevance**: CRITICAL — Analyze reference videos for motion/timing reference
- **Phase 1 Tasks**: Task 1 (analyze start-to-left.mp4, start-to-right.mp4 at selection timestamps)
- **Loading**: Always available, invoke with `video_url` + `question`

### video_analyze (MCP) - Not available
- **Status**: No MCP video analysis tool found

### ffmpeg (System Command) ⭐ CRITICAL
- **Location**: `/c/Users/hitoy/AppData/Local/hermes/tools/ffmpeg-9.0.1-win32-x64/bin/ffmpeg`
- **Capabilities**: Frame extraction from video at exact timestamps, video analysis, format conversion
- **Relevance**: CRITICAL — Extract reference frames at cinematic beats
- **Phase 1 Tasks**: Task 1 (extract frames at 8.0s, 8.5s, 9.0s...), Task 12 (extract all cinematic reference frames)
- **Loading**: Always available via terminal

### image-to-code (Skill via design)
- **Location**: `design\image-to-code`
- **Capabilities**: Convert design images to faithful frontend code
- **Relevance**: LOW — Phase 1 uses frame sequences, not design images
- **Loading**: Do NOT use — frames are source of truth, not images to convert

### canvas-design (Skill)
- **Location**: `canvas-design`
- **Capabilities**: Create visual art in PNG/PDF using design philosophy
- **Relevance**: LOW — Not for frame analysis
- **Loading**: Do NOT use

---

## 3. FRONTEND / REACT / TYPESCRIPT

### ai-coder (Skill)
- **Location**: Global skill
- **Capabilities**: Multi-language coding assistant, debugging, automated testing
- **Relevance**: HIGH — General implementation support
- **Phase 1 Tasks**: All implementation tasks (3-10, 14-15)
- **Loading**: Available as general coding capability

### test-driven-development (Skill) ⭐ CRITICAL
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\test-driven-development`
- **Capabilities**: Strict RED-GREEN-REFACTOR enforcement, vertical tracer bullets, anti-patterns, Hermes integration
- **Relevance**: CRITICAL — Mandatory for all implementation tasks
- **Phase 1 Tasks**: Tasks 3-10 (all implementation), Task 11 (visual QA tests), Task 15 (verification)
- **Loading**: MUST FOLLOW — every implementation task

### systematic-debugging (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\systematic-debugging`
- **Capabilities**: 4-phase root cause debugging, tight feedback loops, hypothesis testing, 3-fix rule
- **Relevance**: HIGH — For any bugs during implementation
- **Phase 1 Tasks**: All tasks (debugging when things break)
- **Loading**: Invoke when issues arise

### codebase-inspection (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\codebase-inspection`
- **Capabilities**: pygount LOC analysis, language ratios
- **Relevance**: LOW — Not needed for Phase 1
- **Loading**: Do NOT use

### phaser-react-game-bridge (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\phaser-react-game-bridge`
- **Capabilities**: Phaser-React integration pattern, GameCanvas, BaseScene, TestScene, Zustand store, lazy-loading, scroll-synced camera
- **Relevance**: MEDIUM — Phase 2 foundation, but architecture informs Phase 1 handoff
- **Phase 1 Tasks**: Task 6 (CinematicHero → Phaser handoff design), Task 15 (documentation)
- **Loading**: Reference for Phase 2 transition design

---

## 4. GSAP / ANIMATION / SCROLL

### frame-driven-implementation (Skill) — covers GSAP
- **Already listed in Section 2**
- **Capabilities**: GSAP ScrollTrigger with scrub, timeline for coordinated animation, pin during scroll, reduced-motion media query
- **Phase 1 Tasks**: Task 5 (compositor), Task 6 (CinematicHero ScrollTrigger), Task 7 (CSS animation)

### No dedicated GSAP skill found
- **Status**: GSAP knowledge embedded in frame-driven-implementation and general knowledge
- **Action**: Use frame-driven-implementation as GSAP reference

---

## 5. CANVAS / GRAPHICS

### frame-driven-implementation (Skill) — covers Canvas
- **Already listed in Section 2**
- **Capabilities**: FrameSequenceCanvas pattern, OffscreenCanvas, hybrid loading, LRU eviction, aspect-ratio-preserving draw, compositor architecture
- **Phase 1 Tasks**: Task 4 (FrameSequenceCanvas offscreen), Task 5 (compositor hook), Task 6 (CinematicHero canvas)

### No dedicated Canvas/WebGL skill found
- **Status**: General knowledge + frame-driven-implementation patterns

---

## 6. GAME / PHASER

### phaser-react-game-bridge (Skill)
- **Already listed in Section 3**
- **Relevance**: MEDIUM — Phase 2, informs Phase 1 handoff architecture

---

## 7. QA / PLAYWRIGHT / VISUAL REGRESSION

### playwright-skill (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\ai-agents\playwright-skill`
- **Capabilities**: General-purpose Playwright automation, write/execute tests on demand, screenshots, console output, session management
- **Relevance**: HIGH — Primary QA test runner
- **Phase 1 Tasks**: Task 11 (visual QA test runner), Task 13 (accessibility tests), Task 14 (pixel-diff automation)
- **Loading**: Already installed in project (`npx playwright test` works)

### qa-skills (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\testing\qa-skills`
- **Capabilities**: 50 QA skills including `visual-testing`, `accessibility-testing`, `performance-testing`, `playwright-automation`, `test-strategy`
- **Relevance**: HIGH — Comprehensive QA toolkit
- **Phase 1 Tasks**: Task 11 (visual QA), Task 13 (accessibility), Task 14 (visual regression)
- **Loading**: Available at `~/qa-skills`, can add specific sub-skills

### dogfood (Skill) ⭐ CRITICAL
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\dogfood`
- **Capabilities**: Systematic exploratory QA workflow (5 phases: Plan→Explore→Collect→Categorize→Report), browser toolset integration, annotated screenshots, console error checking, issue taxonomy
- **Relevance**: CRITICAL — Independent visual QA methodology
- **Phase 1 Tasks**: Task 11 (visual QA), Task 12 (pixel-diff comparison), Task 13 (accessibility audit)
- **Loading**: MUST LOAD — primary QA methodology

### video_analyze (Plugin) — already in Section 2
- **Capabilities**: Video analysis for reference comparison

### vision_analyze (Built-in) — already in Section 2
- **Capabilities**: Frame/image analysis for QA comparison

### No dedicated pixel-diff skill found
- **Status**: Custom Python script (`qa/compare_cinematic.py`) + OpenCV
- **Action**: Implement per plan Task 12

---

## 8. ACCESSIBILITY

### dogfood (Skill) — covers accessibility
- **Already listed in Section 7**
- **Capabilities**: WCAG compliance checking, keyboard navigation testing, screen reader announcements, focus visible, touch targets

### No dedicated accessibility-auditor skill found
- **Status**: dogfood + axe-core (via Playwright) + manual testing
- **Action**: Use Playwright + @axe-core/playwright for automated, manual for rest

### axe-core (NPM Package)
- **Location**: Available via npm
- **Capabilities**: Automated accessibility testing (WCAG 2.1 AA)
- **Relevance**: HIGH — Task 13 automated audit
- **Phase 1 Tasks**: Task 13 (accessibility audit)
- **Loading**: `npm i -D @axe-core/playwright`

---

## 9. PERFORMANCE / OPTIMIZATION

### No dedicated performance skill found
- **Status**: General knowledge + frame-driven-implementation (hybrid loading, LRU cache, memory management)
- **Phase 1 Tasks**: Task 4 (FrameSequenceCanvas optimization), Task 15 (build verification)
- **Action**: Use frame-driven-implementation patterns

---

## 10. CODE REVIEW / DEBUGGING

### requesting-code-review (Skill) ⭐ CRITICAL
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\requesting-code-review`
- **Capabilities**: Pre-commit verification pipeline (static security scan, baseline tests, linting, independent reviewer subagent, auto-fix loop up to 2 cycles)
- **Relevance**: CRITICAL — Mandatory quality gate for all implementation
- **Phase 1 Tasks**: Task 15 (code review), all implementation tasks (continuous verification)
- **Loading**: MUST FOLLOW — after every implementation task

### systematic-debugging (Skill) — already in Section 3
- **Capabilities**: 4-phase debugging for when issues arise

### node-inspect-debugger (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\node-inspect-debugger`
- **Capabilities**: Debug Node.js via --inspect + Chrome DevTools Protocol CLI
- **Relevance**: LOW — Only if Node debugging needed
- **Phase 1 Tasks**: Only if build/dev server issues
- **Loading**: Only when needed

### simplify-code (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\simplify-code`
- **Capabilities**: Parallel 4-agent cleanup of recent code changes
- **Relevance**: LOW — Phase 1 is fresh implementation, not cleanup
- **Loading**: Do NOT use

---

## 11. GIT / GITHUB

### github (Skill via software-development)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\github`
- **Capabilities**: gh CLI for PRs, issues, reviews, repos, auth
- **Relevance**: MEDIUM — Version control during Phase 1
- **Phase 1 Tasks**: Task 15 (commit verified changes), all tasks (frequent commits)
- **Loading**: gh CLI already installed

### github-auth (Skill)
- **Location**: `github\github-auth`
- **Capabilities**: HTTPS tokens, SSH keys, gh CLI login
- **Relevance**: LOW — Already configured
- **Loading**: Do NOT use

### mcp__github__* (MCP Tools)
- **Location**: Available via MCP
- **Capabilities**: GitHub API operations (PRs, issues, reviews, repos)
- **Relevance**: LOW — Local development, not PR workflow
- **Loading**: Do NOT use

---

## 12. PLANNING / GSD / PROJECT MANAGEMENT

### plan (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\plan`
- **Capabilities**: Write markdown plans to `.hermes/plans/`, no execution
- **Relevance**: HIGH — Current mode is plan mode
- **Phase 1 Tasks**: Creating this audit and updated plan
- **Loading**: Already active (current mode)

### bmad-method (Skill)
- **Location**: `ai-agents\bmad-method`
- **Capabilities**: Structured AI-native development framework
- **Relevance**: LOW — Phase 1 is linear execution, not BMAD
- **Loading**: Do NOT use

### ruflo (Skill)
- **Location**: `ai-agents\ruflo`
- **Capabilities**: Multi-agent orchestration harness
- **Relevance**: LOW — Phase 1 is single-agent execution
- **Loading**: Do NOT use

### spec-kit (Skill)
- **Location**: `ai-agents\spec-kit`
- **Capabilities**: Spec-Driven Development for AI agents
- **Relevance**: LOW — Phase 1 has detailed plan already
- **Loading**: Do NOT use

### superpowers (Skill)
- **Location**: `ai-agents\superpowers`
- **Capabilities**: Agentic skills framework for dev methodology
- **Relevance**: LOW — Overlaps with existing skills
- **Loading**: Do NOT use

---

## 13. HERMES / AGENT-SPECIFIC

### hermes-agent (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\autonomous-ai-agents\hermes-agent`
- **Capabilities**: Use, configure, theme, extend, orchestrate Hermes Agent
- **Relevance**: MEDIUM — Environment awareness
- **Phase 1 Tasks**: All (environment knowledge)
- **Loading**: Already active

### hermes-agent-skill-authoring (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\hermes-agent-skill-authoring`
- **Capabilities**: Author in-repo SKILL.md files
- **Relevance**: LOW — Not creating new skills
- **Loading**: Do NOT use

### inspecting-hermes-desktop-dom (Skill)
- **Location**: `C:\Users\hitoy\AppData\Local\hermes\skills\software-development\inspecting-hermes-desktop-dom`
- **Capabilities**: Read live Hermes desktop DOM/CSS over CDP
- **Relevance**: LOW — Not debugging Hermes itself
- **Loading**: Do NOT use

### agent-merge-conflict-arbiter (Skill)
- **Location**: `autonomous-ai-agents\agent-merge-conflict-arbiter`
- **Capabilities**: Neutral arbiter for merge conflicts
- **Relevance**: NONE — No merge conflicts expected
- **Loading**: Do NOT use

### merge-reconciler (Skill)
- **Location**: `autonomous-ai-agents\merge-reconciler`
- **Capabilities**: Neutral third-party resolution of agent merge conflicts
- **Relevance**: NONE
- **Loading**: Do NOT use

---

## 14. OTHER RELEVANT CAPABILITIES

### browser_exec (Built-in Tool) ⭐ CRITICAL
- **Location**: Built-in Hermes tool
- **Capabilities**: Drive real browser via Browser Use CLI, navigate, wait, extract DOM, fill inputs, click, CDP access, screenshots
- **Relevance**: CRITICAL — Primary tool for Task 1 visual inspection, Task 11 QA
- **Phase 1 Tasks**: Task 1 (navigate to dev server, inspect frames), Task 11 (run visual QA)

### terminal (Built-in Tool) ⭐ CRITICAL
- **Location**: Built-in Hermes tool
- **Capabilities**: Execute shell commands (bash on Windows), builds, installs, git, processes
- **Relevance**: CRITICAL — All tasks
- **Phase 1 Tasks**: All tasks

### execute_code (Built-in Tool) ⭐ CRITICAL
- **Location**: Built-in Hermes tool
- **Capabilities**: Run Python with Hermes tools programmatically (web_search, web_extract, read_file, write_file, search_files, patch, terminal)
- **Relevance**: CRITICAL — Batch operations, frame analysis scripts
- **Phase 1 Tasks**: Task 1 (frame analysis script), Task 12 (pixel-diff script)

### web_extract (Built-in Tool)
- **Location**: Built-in Hermes tool
- **Capabilities**: Extract content from web pages/PDFs as markdown
- **Relevance**: LOW — No web research needed
- **Loading**: Do NOT use

### web_search (Built-in Tool)
- **Location**: Built-in Hermes tool
- **Capabilities**: Search web for information
- **Relevance**: LOW — No web research needed
- **Loading**: Do NOT use

### session_search (Plugin)
- **Location**: Built-in plugin
- **Capabilities**: Search/recall past Hermes sessions
- **Relevance**: LOW — Current session has all context
- **Loading**: Do NOT use

### process_manage (Plugin)
- **Location**: Built-in plugin `terminal`
- **Capabilities**: Poll/wait/kill background terminal processes
- **Relevance**: MEDIUM — Dev server management
- **Phase 1 Tasks**: All tasks (start/stop dev server)
- **Loading**: Use `process(action="poll"/"wait"/"kill")`

### cronjob_manage (Plugin)
- **Location**: Built-in plugin
- **Capabilities**: Manage cron jobs
- **Relevance**: NONE
- **Loading**: Do NOT use

### desktop_ui (Plugin)
- **Location**: Built-in plugin
- **Capabilities**: annotate_preview, apply_layout, close_terminal, desktop_preview, drive_preview, focus_pane, gui_tour, read_terminal, read_window_below, show_tip
- **Relevance**: LOW — UI management only
- **Loading**: Do NOT use

### memory (Built-in Tool)
- **Location**: Built-in Hermes tool
- **Capabilities**: Persistent memory across sessions
- **Relevance**: MEDIUM — Store decisions/preferences
- **Loading**: Use for locking decisions

---

## CONFLICTS & REDUNDANCIES

| Capability A | Capability B | Conflict/Redundancy | Resolution |
|--------------|--------------|---------------------|------------|
| frame-driven-implementation | frontend-design | Both cover design decisions | frame-driven-implementation is PRIMARY (frames = contract), frontend-design for gaps |
| frame-driven-implementation | impeccable | Both cover quality | frame-driven-implementation for frame fidelity, impeccable for general frontend rules |
| dogfood | qa-skills | Both cover QA | dogfood is PRIMARY methodology, qa-skills for specific sub-skills (visual-testing, accessibility-testing) |
| dogfood | playwright-skill | Both browser automation | dogfood = methodology, playwright-skill = test runner implementation |
| vision_analyze | video_analyze | Both visual analysis | vision_analyze for frames/images, video_analyze for video files |
| requesting-code-review | systematic-debugging | Both find issues | requesting-code-review = pre-commit gate, systematic-debugging = when bugs occur |
| test-driven-development | requesting-code-review | Both test-first | test-driven-development = implementation methodology, requesting-code-review = verification gate |

---

## MISSING CAPABILITIES

| Missing | Needed For | Workaround |
|---------|------------|------------|
| Dedicated visual regression skill | Task 12 pixel-diff | Custom Python + OpenCV (planned) |
| Dedicated accessibility auditor skill | Task 13 | dogfood + axe-core + manual |
| Phaser 3 specific skill (have Phaser-React bridge) | Phase 2 | Bridge skill covers patterns |
| Frame timing analysis tool | Task 1 beat extraction | Custom Python script (planned) |

---

## CAPABILITY LOADING ORDER (Recommended)

### Stage 0: Capability Discovery (CURRENT)
1. ✅ Skills list retrieved
2. ✅ Critical skills loaded: frame-driven-implementation, dogfood, test-driven-development, requesting-code-review, systematic-debugging, phaser-react-game-bridge, frontend-design, impeccable, playwright-skill, qa-skills

### Stage 1: Task 1 Visual Analysis (UPON APPROVAL)
1. **vision_analyze** — inspect 17+ extracted frames
2. **video_analyze** — inspect reference videos at selection timestamps
3. **ffmpeg** (terminal) — extract frames at exact timestamps
4. **execute_code** (Python) — run frame analysis script
5. **frame-driven-implementation** — methodology for analysis
5. **human review** — approve compositing strategy

### Stage 2: Implementation (Tasks 2-15)
- Per-task: **test-driven-development** (RED-GREEN-REFACTOR)
- Per-task: **requesting-code-review** (verification gate)
- Task 4,5,6: **frame-driven-implementation** (Canvas/GSAP patterns)
- Task 7: **frontend-design** + **impeccable** (CSS quality)
- Task 11,12,13: **dogfood** + **playwright-skill** + **axe-core** (QA)
- Task 15: **requesting-code-review** (final gate), **systematic-debugging** (if needed)