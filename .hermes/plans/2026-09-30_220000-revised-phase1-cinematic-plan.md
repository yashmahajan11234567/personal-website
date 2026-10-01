# Pixel Portfolio Game Portfolio Website - Revised Phase 1 Plan
## Cinematic Hero + Integrated World Selection Experience

## Goal
Build a cinematic, frame-accurate hero experience where a central character holding a portfolio board/sign transforms through scroll-driven animation, revealing world selection (Data / Cloud-DevOps) as an integral part of the cinematic scene — not as a separate card-based UI — with selection transitioning directly into Phaser gameplay.

---

## Current Context / Assumptions

### What EXISTS and WORKS (keep this infrastructure):
- **Tech stack**: React 19 + TypeScript + Vite + GSAP 3.15 + Zustand 5
- **Frame sequences extracted & timed**: 
  - Left (Data): 232 frames, 800×450, 11.04s total, frames in `/frames/left side/`
  - Right (Cloud): 223 frames, 800×450, 11.96s total, frames in `/frames/right side/`
- **Reference videos** (motion/timing authority):
  - `start-to-left.mp4` (11.02s) → Data path cinematic
  - `start-to-right.mp4` (11.95s) → Cloud path cinematic
- **FrameSequenceCanvas**: Hybrid loading (preload first 10, sliding window ±15, LRU cache ~40 frames)
- **GSAP ScrollTrigger**: Pin + scrub architecture in Hero component
- **Zustand store**: World state management (`hero` | `path-selection` | `data-world` | `cloud-world` | `experience`)
- **QA infrastructure**: Playwright tests at 7 scroll points (0, 10, 25, 50, 75, 90, 100%)
- **Reduced motion**: Hook + CSS media query support
- **Build system**: Clean `npm run build`, dev server on localhost:5173

### What MUST BE REPLACED (failed implementation):
- **PathSelection.tsx** — Generic card grid with "Choose Your Path" header, SVG icons, tech lists, CTA buttons — this is NOT the cinematic world selection
- **App.tsx conditional rendering** — Hard switch `hero` → `path-selection` → `data-world` breaks cinematic continuity
- **Hero.tsx onLeave → setCurrentWorld('path-selection')** — Abrupt state change instead of cinematic reveal

### Frame sequence narrative analysis (from video inspection):
| Progress | Left (Data) | Right (Cloud) |
|----------|-------------|---------------|
| 0% | "PERSONAL" text, character centered | "PORTFOLIO" text, character centered |
| ~10-25% | Character moves, board/sign appears | Character moves, board/sign appears |
| ~25-50% | Text transforms: PERSONAL → DATA ANALYST / DATA ENGINEER | Text transforms: PORTFOLIO → CLOUD / DEVOPS |
| ~50-75% | Board reveals portfolio info (skills hint) | Board reveals portfolio info (skills hint) |
| ~75-90% | World selection elements emerge from board | World selection elements emerge from board |
| 100% | Character gestures toward paths / board splits | Character gestures toward paths / board splits |

**Key insight**: The frame sequence IS the cinematic. World selection is NOT a separate screen — it's the final frames of each sequence where the board/character composition reveals the two paths.

---

## Architecture / Proposed Approach

**Single continuous cinematic canvas**: One full-screen canvas (not split left/right) that plays the appropriate frame sequence based on a "pending selection" state. The hero starts in a "neutral" state showing both PERSONAL and PORTFOLIO intro frames, then as user scrolls, the sequence diverges toward the selected path. The world selection IS the final ~15% of frames where the board/sign visually splits or presents two directions.

**State flow**:
```
hero (neutral intro) 
  → user scrolls → 
  hero diverging (path hint emerges from board) 
  → user commits (click/keyboard on path) 
  → cinematic transition (final frames play) 
  → Phaser game mount (seamless handoff)
```

**No separate `path-selection` world state**. Instead:
- `hero.phase`: 'intro' | 'diverging' | 'selection' | 'transitioning'
- `hero.pendingPath`: 'data' | 'cloud' | null
- Selection happens WITHIN the hero canvas via interaction on the final frames

---

## Step-by-Step Tasks

### Task 1: Analyze Frame Sequences for Cinematic Beats
**Files**: Reference frames in `left side/` and `right side/`, videos `start-to-left.mp4`, `start-to-right.mp4`

Extract keyframe timestamps for cinematic beats:
```bash
# Run frame analysis to identify:
# - Intro end (both paths identical/similar)
# - Divergence start (paths become distinct)  
# - Selection reveal (board shows two paths)
# - Selection commit point (character gestures)
# - Transition complete (ready for Phaser)

python scripts/analyze_cinematic_beats.py
```
**Output**: `src/data/cinematic-beats.json` with timestamps for each beat per path

**Verification**: 
```bash
# Visual confirm at each beat timestamp
ffmpeg -ss <beat_time> -i start-to-left.mp4 -frames:v 1 beat-<name>.png
```

---

### Task 2: Create Cinematic Beat Data
**File**: `src/data/cinematic-beats.json`
```json
{
  "left": {
    "introEnd": 2.5,
    "divergenceStart": 3.0,
    "selectionReveal": 8.0,
    "selectionCommit": 9.5,
    "transitionComplete": 11.04
  },
  "right": {
    "introEnd": 2.5,
    "divergenceStart": 3.0,
    "selectionReveal": 8.5,
    "selectionCommit": 10.0,
    "transitionComplete": 11.96
  },
  "shared": {
    "introEnd": 2.5,
    "divergenceStart": 3.0
  }
}
```
*Values are PLACEHOLDERS — actual values from Task 1 analysis*

**Verification**: `cat src/data/cinematic-beats.json` shows valid JSON with all keys

---

### Task 3: Redesign Hero Component — Single Cinematic Canvas
**File**: `src/components/Hero/CinematicHero.tsx` (NEW — replaces Hero.tsx)

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FrameSequenceCanvas } from './FrameSequenceCanvas';
import { cinematicBeats } from '../../data/cinematic-beats';
import './CinematicHero.css';

gsap.registerPlugin(ScrollTrigger);

interface CinematicHeroProps {
  onTransitionComplete: (path: 'data' | 'cloud') => void;
}

type HeroPhase = 'intro' | 'diverging' | 'selection' | 'transitioning';

export const CinematicHero = ({ onTransitionComplete }: CinematicHeroProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [phase, setPhase] = useState<HeroPhase>('intro');
  const [pendingPath, setPendingPath] = useState<'data' | 'cloud' | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const transitionFired = useRef(false);

  const handleScroll = useCallback((self: ScrollTrigger) => {
    const prog = self.progress;
    setScrollProgress(prog);
    
    // Determine phase from progress (using shared beats for intro/divergence)
    if (prog < cinematicBeats.shared.introEnd / cinematicBeats.left.transitionComplete) {
      setPhase('intro');
    } else if (prog < cinematicBeats.shared.divergenceStart / cinematicBeats.left.transitionComplete) {
      setPhase('diverging');
    } else if (!pendingPath) {
      setPhase('selection');
    }
  }, [pendingPath]);

  useEffect(() => {
    if (reducedMotion) {
      onTransitionComplete('data'); // Default for reduced motion
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: canvas,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        onUpdate: handleScroll,
        onLeave: () => {
          // Don't auto-complete — wait for user selection
        },
      }
    });

    scrollTriggerRef.current = tl.scrollTrigger ?? null;

    return () => {
      tl.kill();
      if (scrollTriggerRef.current) scrollTriggerRef.current.kill();
    };
  }, [onTransitionComplete, reducedMotion, handleScroll]);

  // Handle path selection FROM WITHIN the cinematic (click on final frames)
  const handlePathSelect = useCallback((path: 'data' | 'cloud') => {
    if (phase !== 'selection' || pendingPath) return;
    
    setPendingPath(path);
    setPhase('transitioning');
    transitionFired.current = true;
    
    // Let the remaining frames play out, then transition
    const remainingDuration = pendingPath === 'data' 
      ? cinematicBeats.left.transitionComplete - cinematicBeats.left.selectionCommit
      : cinematicBeats.right.transitionComplete - cinematicBeats.right.selectionCommit;
    
    setTimeout(() => {
      onTransitionComplete(path);
    }, remainingDuration * 1000);
  }, [phase, pendingPath, onTransitionComplete]);

  // Render appropriate frame sequence based on phase + pendingPath
  const currentSide = pendingPath || (phase === 'intro' ? 'left' : 'left'); // Default left for intro

  return (
    <div ref={canvasRef} className="cinematic-hero">
      <FrameSequenceCanvas 
        side={currentSide} 
        progress={scrollProgress} 
        phase={phase}
        pendingPath={pendingPath}
      />
      
      {/* Selection hotspots — invisible overlays on final frames */}
      {phase === 'selection' && (
        <div className="cinematic-hero__selection-overlay" aria-hidden="true">
          <button
            className="cinematic-hero__path-hotspot cinematic-hero__path-hotspot--data"
            onClick={() => handlePathSelect('data')}
            aria-label="Enter Data Analyst / Data Engineer world"
          />
          <button
            className="cinematic-hero__path-hotspot cinematic-hero__path-hotspot--cloud"
            onClick={() => handlePathSelect('cloud')}
            aria-label="Enter Cloud / DevOps world"
          />
        </div>
      )}
      
      {/* Accessibility */}
      <div className="cinematic-hero__a11y" aria-live="polite" aria-atomic="true">
        {phase === 'intro' && 'Cinematic introduction: Personal Portfolio'}
        {phase === 'diverging' && 'Paths diverging: Data and Cloud'}
        {phase === 'selection' && 'Choose your path: Data Analyst/Engineer or Cloud/DevOps'}
        {phase === 'transitioning' && `Entering ${pendingPath} world`}
      </div>
    </div>
  );
};

export default CinematicHero;
```

**Verification**: `npm run build` passes, component exports correctly

---

### Task 4: Update FrameSequenceCanvas for Phase-Aware Rendering
**File**: `src/components/Hero/FrameSequenceCanvas.tsx` (MODIFY)

Key changes:
- Accept `phase` and `pendingPath` props
- During `intro` phase: blend/alternate between left/right intro frames
- During `diverging` phase: show path-specific frames
- During `selection` phase: show final frames with selection hotspots visible
- During `transitioning`: play remaining frames to completion

```typescript
// Add to props interface:
interface FrameSequenceCanvasProps {
  side: 'left' | 'right';
  progress: number;
  phase: 'intro' | 'diverging' | 'selection' | 'transitioning';
  pendingPath: 'data' | 'cloud' | null;
}

// In getFrameIndex: map progress to frame index using correct sequence
// For intro phase: use blended progress across shared intro duration
// For diverging+selection: use path-specific progress mapping
```

**Verification**: FrameSequenceCanvas renders correct frames at each phase

---

### Task 5: Create Cinematic Hero CSS
**File**: `src/components/Hero/CinematicHero.css` (NEW)

```css
@import '../../styles/variables.css';

.cinematic-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
}

.cinematic-hero canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Invisible selection hotspots positioned over final frames */
.cinematic-hero__selection-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.cinematic-hero__path-hotspot {
  position: absolute;
  pointer-events: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  /* Positions determined by frame analysis — placeholder values: */
}

.cinematic-hero__path-hotspot--data {
  /* Left side of board/sign in final frames */
  left: 15%;
  top: 45%;
  width: 30%;
  height: 40%;
}

.cinematic-hero__path-hotspot--cloud {
  /* Right side of board/sign in final frames */
  right: 15%;
  top: 45%;
  width: 30%;
  height: 40%;
}

/* Focus styles for keyboard navigation */
.cinematic-hero__path-hotspot:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Reduced motion: skip to selection */
@media (prefers-reduced-motion: reduce) {
  .cinematic-hero {
    height: auto;
    min-height: 100vh;
  }
  .cinematic-hero__selection-overlay {
    display: none;
  }
}

/* Accessibility announcements */
.cinematic-hero__a11y {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Verification**: Visual QA confirms hotspots align with frame content at selection phase

---

### Task 6: Update App.tsx — Remove PathSelection World State
**File**: `src/App.tsx` (MODIFY)

```typescript
import { useEffect, useState } from 'react';
import { CinematicHero } from './components/Hero/CinematicHero';
import { useGameStore } from './store/gameStore';
import './App.css';

function App() {
  const { 
    currentWorld, 
    setCurrentWorld,
  } = useGameStore();
  const [hasError, setHasError] = useState(false);

  // Hash routing for direct world access (Phase 2+)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/data-world') {
      setCurrentWorld('data-world');
    } else if (hash === '#/cloud-world') {
      setCurrentWorld('cloud-world');
    }
  }, [setCurrentWorld]);

  const handleHeroTransitionComplete = (path: 'data' | 'cloud') => {
    console.log('[App] Hero transition complete, entering:', path);
    setCurrentWorld(`${path}-world`);
    window.location.hash = `#/${path}-world`;
  };

  const handleError = () => setHasError(true);

  if (hasError) {
    return <div style={{ padding: '2rem', color: 'red' }}>An error occurred. Check console.</div>;
  }

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to main content</a>
      <main id="main" onError={handleError}>
        {currentWorld === 'hero' && (
          <CinematicHero onTransitionComplete={handleHeroTransitionComplete} />
        )}
        
        {currentWorld === 'data-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Data World — Phase 2</h1>
            <button onClick={() => { setCurrentWorld('hero'); window.location.hash = ''; }}>Back to Hero</button>
          </div>
        )}

        {currentWorld === 'cloud-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Cloud World — Phase 2</h1>
            <button onClick={() => { setCurrentWorld('hero'); window.location.hash = ''; }}>Back to Hero</button>
          </div>
        )}

        {currentWorld === 'experience' && (
          <div className="placeholder-world">
            <h1>Experience Section — Phase 5</h1>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

**Key changes**:
- Removed `path-selection` world state entirely
- Hero now transitions directly to `data-world` or `cloud-world`
- `PathSelection` component DELETED (or archived)

**Verification**: `npm run build` passes, no reference to PathSelection

---

### Task 7: Update GameStore — Remove path-selection State
**File**: `src/store/gameStore.ts` (MODIFY)

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type World = 'hero' | 'data-world' | 'cloud-world' | 'experience';

export interface GameState {
  currentWorld: World;
  setCurrentWorld: (world: World) => void;
  reset: () => void;
}

const initialState = {
  currentWorld: 'hero' as World,
};

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    setCurrentWorld: (world) => set({ currentWorld: world }),
    reset: () => set(initialState),
  }))
);
```

**Verification**: TypeScript compiles, store works with new World type

---

### Task 8: Delete PathSelection Component
**Files**: 
- `DELETE src/components/PathSelection/PathSelection.tsx`
- `DELETE src/components/PathSelection/PathSelection.css`
- `DELETE src/components/PathSelection/index.ts`

**Verification**: `npm run build` passes with no PathSelection imports

---

### Task 9: Fix 100% Scroll Bug (Technical Subtask)
**File**: `src/components/Hero/CinematicHero.tsx`

The `onLeave` handler should NOT auto-complete. Instead, completion is triggered by `handlePathSelect` after user interaction. Remove the auto-complete logic entirely.

**Verification**: Scroll to 100% without selecting → stays in selection phase, doesn't crash

---

### Task 10: Update Visual QA Tests for Cinematic Hero
**File**: `qa/visual-qa.spec.ts` (MODIFY)

Test at cinematic beats, not just percentage scroll:
```typescript
const CINEMATIC_BEATS = [
  { name: 'intro-start', progress: 0 },
  { name: 'intro-end', progress: 0.23 },      // ~2.5s / 11s
  { name: 'divergence-start', progress: 0.27 }, // ~3.0s / 11s
  { name: 'selection-reveal', progress: 0.72 }, // ~8.0s / 11s
  { name: 'selection-commit', progress: 0.86 }, // ~9.5s / 11s
  { name: 'transition-complete', progress: 1.0 },
];

test.describe('Phase 1 Visual QA - Cinematic Hero', () => {
  for (const beat of CINEMATIC_BEATS) {
    test(`Left (Data) at ${beat.name} (${beat.progress * 100}%)`, async ({ page }) => {
      await scrollToBeat(page, beat.progress);
      await captureCanvasScreenshot(page, 'left', beat.name);
    });
    
    test(`Right (Cloud) at ${beat.name} (${beat.progress * 100}%)`, async ({ page }) => {
      await scrollToBeat(page, beat.progress);
      await captureCanvasScreenshot(page, 'right', beat.name);
    });
  }
  
  test('Selection hotspots visible at selection-reveal', async ({ page }) => {
    await scrollToBeat(page, 0.72);
    const dataHotspot = page.locator('.cinematic-hero__path-hotspot--data');
    const cloudHotspot = page.locator('.cinematic-hero__path-hotspot--cloud');
    await expect(dataHotspot).toBeVisible();
    await expect(cloudHotspot).toBeVisible();
  });
  
  test('Hotspot click triggers transition', async ({ page }) => {
    await scrollToBeat(page, 0.72);
    await page.click('.cinematic-hero__path-hotspot--data');
    // Wait for transition
    await page.waitForTimeout(2000);
    // Should be in data-world
    await expect(page.locator('.data-world')).toBeVisible();
  });
});
```

**Verification**: `npx playwright test qa/visual-qa.spec.ts --headed` — all tests pass

---

### Task 11: Update Reference Frame Extraction for Cinematic Beats
**File**: `qa/extract-cinematic-references.py` (NEW)

```python
# Extract reference frames at cinematic beats (not just percentages)
# From BOTH videos AND frame sequences
# Save to qa-reference-cinematic/<side>/<beat_name>.png
```

**Verification**: Reference images exist for all cinematic beats

---

### Task 12: Run Complete Visual QA & Compare
**Commands**:
```bash
# 1. Build
npm run build

# 2. Start dev server
npm run dev -- --host 0.0.0.0 --port 5173 &
sleep 5

# 3. Extract cinematic reference frames
python qa/extract-cinematic-references.py

# 4. Run visual QA
npx playwright test qa/visual-qa.spec.ts --headed

# 5. Pixel-diff comparison
python qa/compare_cinematic.py

# 6. Stop server
pkill -f "vite"
```

**Expected**: All cinematic beats pass pixel-diff (<0.5% mismatch), composition verified

---

### Task 13: Accessibility & Reduced Motion Audit
**Verification**:
- [ ] `prefers-reduced-motion: reduce` shows final state immediately
- [ ] Keyboard navigation works (Tab → Enter on hotspots)
- [ ] Screen reader announces phase changes via aria-live
- [ ] Focus visible on hotspots
- [ ] Color contrast meets WCAG AA for any UI text
- [ ] Skip link functional

---

### Task 14: Code Review & Documentation
**Run**:
- `npx oxlint src/**/*.tsx` — linting
- `npx tsc --noEmit` — type checking
- Review: Canvas lifecycle, image loading, cache behavior, GSAP cleanup, React lifecycle, memory usage

**Update**: `.gsd/LESSONS.md` with:
- Cinematic beat timestamps discovered
- Frame sequence narrative structure
- Hotspot positioning methodology
- Phase 1 visual QA results

---

## Tests / Validation

### For Task 1-2 (Beat Analysis):
- **Test**: Manual frame-by-frame video inspection at suspected beats
- **Verification**: Beat timestamps documented in `cinematic-beats.json`

### For Task 3-5 (CinematicHero):
- **TDD**: Write failing test for phase transitions first
  ```typescript
  test('phase transitions at correct scroll progress', () => {
    render(<CinematicHero onTransitionComplete={jest.fn()} />);
    // Simulate scroll progress
    // Verify phase state changes at beat thresholds
  });
  ```
- **Implementation**: Build component
- **Verification**: Test passes, visual QA matches reference frames

### For Task 6-8 (App/Store/PathSelection removal):
- **Test**: Existing visual QA tests adapted for new flow
- **Verification**: Build passes, no PathSelection code remains

### For Task 9 (100% bug fix):
- **Test**: Scroll to 100% without selection → no crash, no auto-transition
- **Verification**: Manual test + Playwright test

### For Task 10-12 (Visual QA):
- **Test**: Run full visual QA suite against cinematic beats
- **Verification**: All 14 beat comparisons pass (<0.5% pixel diff)

### For Task 13 (Accessibility):
- **Test**: axe-core audit + manual keyboard/screen reader test
- **Verification**: No violations, all criteria met

### For Task 14 (Code review):
- **Test**: Lint, typecheck, manual review
- **Verification**: Clean report

---

## Risks, Tradeoffs, and Open Questions

### Risks:
1. **Frame sequence blending**: Intro phase may need to show BOTH left/right intro frames simultaneously or blended — technical complexity in FrameSequenceCanvas
2. **Hotspot positioning**: Invisible buttons must align perfectly with visual elements in final frames — requires precise frame analysis
3. **Phaser handoff**: Seamless transition from canvas to Phaser canvas needs careful coordination (Phase 2)
4. **Performance**: Single canvas with dual-sequence logic may increase memory/CPU during divergence phase

### Tradeoffs:
- **Cinematic purity vs. technical simplicity**: Keeping single canvas with phase logic is more complex than split canvases but preserves visual continuity
- **Selection timing**: User must select during `selection` phase (final ~15% of scroll) — if they scroll past without selecting, need fallback behavior
- **Reduced motion**: Must show meaningful final state without animation — likely jump to selection-reveal frame

### Open Questions:
1. **Exact hotspot coordinates**: Need frame analysis to determine pixel positions of path indicators in final frames
2. **Intro blending**: Do left/right intro frames differ? If so, how to present both before divergence?
3. **Keyboard selection**: Should arrow keys navigate between hotspots? (Yes, for accessibility)
4. **Mobile interaction**: Touch targets for hotspots — need adequate size (min 44×44px)
5. **Phaser mount point**: Exact frame where Phaser canvas should take over (transition-complete beat)
6. **Analytics**: Track which path users select, scroll depth, completion rate

---

## Next Steps After Phase 1 Completion

Once revised Phase 1 passes all QA gates:
1. **Phase 2**: Phaser 3 gameplay foundation — character controller, camera, asset pipeline, state sync with React
2. **Phase 3**: Data world vertical slice — pipe navigation, skill stations (mini-pipes), project boxes
3. **Phase 4**: Cloud world vertical slice — cloud jumping, skill clouds, project clouds  
4. **Phase 5**: Experience section — internship timeline, coursework, certifications

Each phase follows same TDD + visual QA methodology.