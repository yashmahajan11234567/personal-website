# Phase 1 Plan: Hero + Transition + Path Selection

## Objective
Recreate the exact hero transition from reference video, implement path selection, and provide placeholder transitions to future game worlds.

## Scope
**IN SCOPE:**
- Vite + React + TypeScript project initialization
- GSAP + Phaser 3 installation
- Hero component with fixed character + background
- Scroll-driven typography transition (PERSONAL→DATA, PORTFOLIO→CLOUD)
- Path Selection screen (Data=blue, Cloud=orange)
- Placeholder "World Loading" screens
- Reduced-motion accessibility

**OUT OF SCOPE:**
- Any Phaser game scenes
- Skill/project data or modals
- Pipe transitions
- Cloud path gameplay
- Post-game sections

---

## Technical Approach

### Project Structure
```
portfolio_website/
├── src/
│   ├── components/
│   │   ├── Hero/
│   │   │   ├── Hero.tsx
│   │   │   ├── HeroTypography.tsx
│   │   │   ├── Character.tsx
│   │   │   └── index.ts
│   │   ├── PathSelection/
│   │   │   ├── PathSelection.tsx
│   │   │   ├── PathCard.tsx
│   │   │   └── index.ts
│   │   ├── Placeholder/
│   │   │   ├── LoadingScreen.tsx
│   │   │   └── index.ts
│   │   └── UI/
│   │       ├── ReducedMotionToggle.tsx
│   │       └── index.ts
│   ├── hooks/
│   │   ├── useScrollTransition.ts
│   │   ├── useReducedMotion.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── gsap-helpers.ts
│   │   └── index.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── hero.css
│   │   └── selection.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
│   ├── assets/
│   │   ├── hero/
│   │   │   ├── character.png
│   │   │   └── background.png
│   │   └── paths/
│   │       ├── data-icon.png
│   │       └── cloud-icon.png
│   └── favicon.ico
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

### Hero Transition Implementation

**Reference Analysis:**
- Left frames (232): PERSONAL → DATA ANALYST / DATA ENGINEER
- Right frames (223): PORTFOLIO → CLOUD / DEVOPS
- Frame delays ~0.041-0.042s (≈24fps), some longer pauses
- Total duration: ~9-10 seconds

**GSAP ScrollTrigger Strategy:**
```typescript
// Single timeline controlled by scroll
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: 1, // smooth scrub
    pin: true,
  }
});

// Left side: PERSONAL moves up, DATA titles move up from below
tl.to(".personal", { yPercent: -100, opacity: 0, ease: "none" }, 0)
  .from(".data-titles", { yPercent: 100, opacity: 0, ease: "none" }, 0)

// Right side: PORTFOLIO moves up, CLOUD titles move up from below
tl.to(".portfolio", { yPercent: -100, opacity: 0, ease: "none" }, 0)
  .from(".cloud-titles", { yPercent: 100, opacity: 0, ease: "none" }, 0)
```

**Key Constraints:**
- Character: `position: fixed`, center, no movement
- Background: `position: fixed`, full viewport, no movement
- Typography: Absolute positioned, only vertical transform
- No scale, rotate, skew, or opacity crossfade artifacts

### Path Selection
- Appears after hero transition completes (scroll past hero)
- Two cards side-by-side
- Data: light blue accent (`#00A8E8` or similar restrained)
- Cloud: orange accent (`#FF9900` AWS-like)
- Click → navigate to placeholder loading screen

---

## Task Breakdown

### Task 1.1: Project Setup
- [ ] `npm create vite@latest . -- --template react-ts`
- [ ] `npm install`
- [ ] `npm install gsap phaser`
- [ ] `npm install -D @types/gsap` (if needed)
- [ ] Configure TypeScript strict mode
- [ ] Configure ESLint + Prettier

### Task 1.2: Reference Frame Analysis
- [ ] Extract key frames from left/right folders
- [ ] Identify timing: start, middle, end positions
- [ ] Measure typography positions, spacing, font metrics
- [ ] Document exact values for implementation

### Task 1.3: Hero Component
- [ ] Create Hero.tsx with fixed layout
- [ ] Character component (placeholder image)
- [ ] Background component (placeholder)
- [ ] Typography elements: PERSONAL, PORTFOLIO, DATA ANALYST, DATA ENGINEER, CLOUD, DEVOPS
- [ ] CSS: fixed positioning, z-index layering

### Task 1.4: Scroll Transition (GSAP)
- [ ] Register ScrollTrigger plugin
- [ ] Create transition timeline in `useScrollTransition` hook
- [ ] Implement left side: PERSONAL ↑, DATA titles ↑
- [ ] Implement right side: PORTFOLIO ↑, CLOUD titles ↑
- [ ] Pin hero during transition
- [ ] Match easing: "none" (linear) per reference
- [ ] Test frame-by-frame against reference

### Task 1.5: Path Selection
- [ ] PathSelection component
- [ ] PathCard component (icon, title, description, accent color)
- [ ] Layout: centered, side-by-side, responsive
- [ ] Hover/focus states
- [ ] Click handlers → navigate to placeholder

### Task 1.6: Placeholder Loading Screens
- [ ] LoadingScreen component
- [ ] "Data World Loading..." / "Cloud World Loading..."
- [ ] Back button to return to selection
- [ ] Minimal styling

### Task 1.7: Accessibility
- [ ] `useReducedMotion` hook (prefers-reduced-motion)
- [ ] Toggle in UI to disable scroll transition
- [ ] Instant jump to path selection when reduced motion

### Task 1.8: Verification
- [ ] Compare implemented transition to reference frames
- [ ] Check: no ghost text, no clipping, no white bands
- [ ] Check: character fixed, background fixed
- [ ] Check: timing matches (~9-10s scroll)
- [ ] Test Chrome, Firefox, Safari
- [ ] Test mobile viewport

---

## Acceptance Criteria

| Criterion | Verification |
|-----------|--------------|
| Hero loads with PERSONAL / PORTFOLIO + character | Visual inspection |
| Scroll triggers typography swap | Manual scroll test |
| PERSONAL → DATA ANALYST / DATA ENGINEER (left) | Frame comparison |
| PORTFOLIO → CLOUD / DEVOPS (right) | Frame comparison |
| Character stays fixed | DevTools position check |
| Background stays fixed | DevTools position check |
| No visual artifacts | Visual inspection |
| Path selection appears after transition | Scroll past hero |
| Data card = blue accent, Cloud card = orange accent | Visual inspection |
| Click Data → "Data World Loading..." | Click test |
| Click Cloud → "Cloud World Loading..." | Click test |
| Reduced motion disables transition | Toggle test |
| 60fps during transition | DevTools performance |
| TypeScript compiles, no ESLint errors | `npm run build` + `npm run lint` |

---

## Dependencies
- Reference frames analyzed (Task 1.2) before Hero/Transition implementation
- GSAP ScrollTrigger registered before timeline creation
- Hero complete before Path Selection (sequential UI)

---

## Estimated Effort
- Task 1.1: 30 min
- Task 1.2: 1 hour (frame analysis)
- Task 1.3: 1 hour
- Task 1.4: 2-3 hours (iterative tuning)
- Task 1.5: 1 hour
- Task 1.6: 30 min
- Task 1.7: 30 min
- Task 1.8: 1 hour

**Total: ~7-8 hours**

---

## Next Phase Trigger
Phase 2 begins when:
- All Phase 1 acceptance criteria pass
- Code reviewed and committed
- STATE.md updated with Phase 1 complete